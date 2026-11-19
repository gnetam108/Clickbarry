import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Product, ToastMessage } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import defaultProductCover from '../assets/images/seller_dashboard_laptop_1794019709659.jpg';

export interface AddProductInput {
  title: string;
  category: 'templates' | 'courses' | 'software' | 'ebooks' | 'graphics';
  categoryLabel?: string;
  price: number;
  originalPrice?: number;
  commissionRate?: number;
  description: string;
  originalUrl: string;
  affiliateUrl?: string;
  merchantName?: string;
  merchantWebsite?: string;
  approvalStatus?: 'approved' | 'pending' | 'rejected';
  image: string;
  fileFormat?: string;
  status?: 'draft' | 'published';
}

export interface SellerAnalytics {
  totalProducts: number;
  publishedProducts: number;
  draftProducts: number;
  pendingProducts: number;
  approvedProducts: number;
  rejectedProducts: number;
  totalViews: number;
  totalClicks: number;
  ctr: string;
  perProduct: Record<string, { views: number; clicks: number; ctr: string }>;
}

interface ProductContextType {
  products: Product[]; // Public Marketplace ONLY: status === 'published' && approvalStatus === 'approved'
  realProducts: Product[];
  allProducts: Product[]; // Admin catalog: all products across pending/approved/rejected/draft
  sellerProducts: Product[];
  isLoading: boolean;
  toast: ToastMessage | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  hideToast: () => void;
  refreshProducts: () => Promise<void>;
  fetchAllProductsAdmin: () => Promise<Product[]>;
  fetchSellerProducts: (sellerId: string) => Promise<Product[]>;
  addProduct: (productData: AddProductInput) => Promise<{ success: boolean; product?: Product; error?: string }>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<{ success: boolean; error?: string }>;
  deleteProduct: (id: string) => Promise<{ success: boolean; error?: string }>;
  recordView: (id: string) => Promise<void>;
  recordClick: (id: string) => Promise<void>;
  fetchSellerAnalytics: (sellerId: string) => Promise<SellerAnalytics>;
  uploadProductImage: (file: File, sellerId: string) => Promise<{ success: boolean; url?: string; error?: string }>;
}

const CATEGORY_LABELS: Record<string, string> = {
  templates: 'Notion & Template',
  courses: 'Video Course',
  software: 'Software & Code',
  ebooks: 'E-Book & Guide',
  graphics: 'Graphics & Canva'
};

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin } = useAuth();
  const [realProducts, setRealProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [sellerProducts, setSellerProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString();
    setToast({ id, message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const mapDbRowToProduct = (
    row: any,
    profileMap?: Record<string, { fullName: string; verified: boolean }>,
    metricsMap?: Record<string, { views: number; clicks: number; sales: number }>
  ): Product => {
    const sellerProfile = profileMap?.[row.seller_id];
    const sellerName =
      sellerProfile?.fullName ||
      (row.profiles ? row.profiles.full_name : null) ||
      row.merchant_name ||
      'Verified Creator';
    const finalUrl = row.affiliate_url || row.original_url || '';
    const finalMerchant = row.merchant_name || sellerName;
    const stats = metricsMap?.[row.id] || { views: 0, clicks: 0, sales: 0 };

    return {
      id: row.id,
      title: row.title,
      price: Number(row.price) || 0,
      originalPrice: Number(row.price) || 0,
      commissionRate: Number(row.commission_rate) || 0,
      category: row.category || 'templates',
      categoryLabel: CATEGORY_LABELS[row.category] || 'Digital Product',
      description: row.description || '',
      originalUrl: finalUrl,
      affiliateUrl: finalUrl,
      merchantName: finalMerchant,
      merchantWebsite: row.merchant_website || '',
      approvalStatus: (row.approval_status as Product['approvalStatus']) || 'pending',
      isFeatured: Boolean(row.is_featured),
      rejectionReason: row.rejection_reason || undefined,
      image: row.image_url || defaultProductCover,
      fileFormat: 'Digital Product',
      features: [
        `Listed by ${finalMerchant}`,
        `${Number(row.commission_rate) || 0}% Affiliate Commission`,
        'Instant tracking link ready for Affiliates'
      ],
      sellerName,
      sellerVerified: sellerProfile?.verified ?? false,
      sellerId: row.seller_id,
      affiliateId: row.seller_id,
      status: row.status || 'published',
      rating: 5.0,
      reviewsCount: 0,
      salesCount: stats.sales,
      views: stats.views,
      clicks: stats.clicks,
      isDemo: false,
      isRealDb: true,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  };

  // Hydrate seller profiles & real event/click/sale counts for a batch of DB rows
  const hydrateProducts = async (rows: any[]): Promise<Product[]> => {
    if (!supabase || rows.length === 0) return [];

    const sellerIds = Array.from(new Set(rows.map((r) => r.seller_id).filter(Boolean)));
    const productIds = rows.map((r) => r.id);
    const profileMap: Record<string, { fullName: string; verified: boolean }> = {};
    const metricsMap: Record<string, { views: number; clicks: number; sales: number }> = {};

    if (sellerIds.length > 0) {
      try {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name, seller_verified')
          .in('id', sellerIds);
        if (profs) {
          profs.forEach((p: any) => {
            if (p.id) {
              profileMap[p.id] = {
                fullName: p.full_name || 'Creator',
                verified: Boolean(p.seller_verified)
              };
            }
          });
        }
      } catch {}
    }

    try {
      const [eventsRes, clicksRes, salesRes] = await Promise.all([
        supabase.from('product_events').select('product_id, event_type').in('product_id', productIds),
        supabase.from('affiliate_clicks').select('product_id').in('product_id', productIds),
        supabase
          .from('commission_records')
          .select('product_id, status')
          .in('product_id', productIds)
          .in('status', ['verified', 'paid'])
      ]);

      const ensure = (pid: string) => {
        if (!metricsMap[pid]) metricsMap[pid] = { views: 0, clicks: 0, sales: 0 };
        return metricsMap[pid];
      };

      eventsRes.data?.forEach((ev: any) => {
        const m = ensure(ev.product_id);
        if (ev.event_type === 'view') m.views++;
        if (ev.event_type === 'shop_click') m.clicks++;
      });

      clicksRes.data?.forEach((clk: any) => {
        if (clk.product_id) ensure(clk.product_id).clicks++;
      });

      salesRes.data?.forEach((sale: any) => {
        if (sale.product_id) ensure(sale.product_id).sales++;
      });
    } catch {}

    return rows.map((r) => mapDbRowToProduct(r, profileMap, metricsMap));
  };

  // Public Marketplace: strictly published + approved products from Supabase
  const refreshProducts = useCallback(async () => {
    if (!supabase) {
      setRealProducts([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      let queryRes = await supabase
        .from('products')
        .select('*')
        .eq('status', 'published')
        .eq('approval_status', 'approved')
        .order('created_at', { ascending: false });

      if (queryRes.error && queryRes.error.message?.includes('approval_status')) {
        // Fallback if migration hasn't added approval_status column yet
        queryRes = await supabase
          .from('products')
          .select('*')
          .eq('status', 'published')
          .order('created_at', { ascending: false });
      }

      if (queryRes.error) {
        console.warn('Could not fetch products from Supabase:', queryRes.error.message);
        setRealProducts([]);
      } else if (queryRes.data) {
        const hydrated = await hydrateProducts(queryRes.data);
        setRealProducts(hydrated.filter((p) => p.status === 'published' && p.approvalStatus === 'approved'));
      }
    } catch (err) {
      console.warn('Error refreshing products:', err);
      setRealProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Admin catalog: all products across pending, approved, rejected, draft
  const fetchAllProductsAdmin = useCallback(async (): Promise<Product[]> => {
    if (!supabase || !isAdmin) return [];
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data) return [];
      const hydrated = await hydrateProducts(data);
      setAllProducts(hydrated);
      return hydrated;
    } catch {
      return [];
    }
  }, [isAdmin]);

  // Fetch products for a specific authenticated seller
  const fetchSellerProducts = useCallback(async (sellerId: string): Promise<Product[]> => {
    if (!supabase || !sellerId) {
      setSellerProducts([]);
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });

      if (error || !data) {
        setSellerProducts([]);
        return [];
      }

      const hydrated = await hydrateProducts(data);
      setSellerProducts(hydrated);
      return hydrated;
    } catch {
      setSellerProducts([]);
      return [];
    }
  }, []);

  useEffect(() => {
    refreshProducts();
  }, [refreshProducts]);

  useEffect(() => {
    if (isAdmin) {
      fetchAllProductsAdmin();
    } else {
      setAllProducts([]);
    }
  }, [isAdmin, fetchAllProductsAdmin]);

  useEffect(() => {
    if (!user) {
      setSellerProducts([]);
    }
  }, [user]);

  // Public Marketplace contains ONLY real approved & published DB products (zero demo products)
  const products: Product[] = realProducts;

  // ADD PRODUCT (Defaults Seller submissions to approvalStatus: 'pending')
  const addProduct = async (
    productData: AddProductInput
  ): Promise<{ success: boolean; product?: Product; error?: string }> => {
    if (!supabase) {
      showToast('Database client not ready', 'error');
      return { success: false, error: 'Supabase client not initialized' };
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        showToast('You must be logged in as a Seller to submit products', 'error');
        return { success: false, error: 'Unauthorized: Seller login required' };
      }

      const sellerId = authData.user.id;
      const targetUrl = productData.affiliateUrl || productData.originalUrl;
      let cleanUrl = targetUrl.trim();
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = 'https://' + cleanUrl;
      }

      const desiredApproval: 'approved' | 'pending' | 'rejected' =
        isAdmin && productData.approvalStatus ? productData.approvalStatus : 'pending';

      const baseRow: any = {
        seller_id: sellerId,
        title: productData.title.trim(),
        image_url: productData.image.trim(),
        price: Number(productData.price),
        description: productData.description.trim(),
        category: productData.category,
        original_url: cleanUrl,
        status: productData.status || 'published'
      };

      const fullRow = {
        ...baseRow,
        merchant_name: (productData.merchantName || 'Independent Creator').trim(),
        affiliate_url: cleanUrl,
        commission_rate: Number(productData.commissionRate ?? 40),
        merchant_website: productData.merchantWebsite ? productData.merchantWebsite.trim() : null,
        approval_status: desiredApproval
      };

      let insertedData: any = null;
      const { data, error } = await supabase
        .from('products')
        .insert(fullRow)
        .select()
        .single();

      if (error) {
        console.warn('Full product insert warning, retrying with base schema:', error.message);
        const retryRes = await supabase.from('products').insert(baseRow).select().single();
        if (retryRes.error) {
          showToast(`Failed to add product: ${retryRes.error.message}`, 'error');
          return { success: false, error: retryRes.error.message };
        }
        insertedData = retryRes.data;
      } else {
        insertedData = data;
      }

      const newProd = mapDbRowToProduct(insertedData);
      setSellerProducts((prev) => [newProd, ...prev]);

      if (newProd.approvalStatus === 'approved' && newProd.status === 'published') {
        setRealProducts((prev) => [newProd, ...prev]);
        showToast(`Product "${newProd.title}" published!`, 'success');
      } else {
        showToast(`Product "${newProd.title}" submitted for Admin approval!`, 'success');
      }

      await refreshProducts();
      if (isAdmin) await fetchAllProductsAdmin();
      return { success: true, product: newProd };
    } catch (err: any) {
      const msg = err?.message || 'Unexpected error creating product';
      showToast(msg, 'error');
      return { success: false, error: msg };
    }
  };

  // UPDATE PRODUCT
  const updateProduct = async (
    id: string,
    updates: Partial<Product>
  ): Promise<{ success: boolean; error?: string }> => {
    if (!supabase) {
      showToast('Supabase client not ready', 'error');
      return { success: false, error: 'Supabase client not initialized' };
    }

    try {
      const dbUpdates: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.title !== undefined) dbUpdates.title = updates.title.trim();
      if (updates.price !== undefined) dbUpdates.price = Number(updates.price);
      if (updates.description !== undefined) dbUpdates.description = updates.description.trim();
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.originalUrl !== undefined || updates.affiliateUrl !== undefined) {
        let clean = (updates.affiliateUrl || updates.originalUrl || '').trim();
        if (clean && !clean.startsWith('http://') && !clean.startsWith('https://')) clean = 'https://' + clean;
        dbUpdates.original_url = clean;
        dbUpdates.affiliate_url = clean;
      }
      if (updates.merchantName !== undefined) dbUpdates.merchant_name = updates.merchantName.trim();
      if (updates.commissionRate !== undefined) dbUpdates.commission_rate = Number(updates.commissionRate);
      if (updates.merchantWebsite !== undefined) dbUpdates.merchant_website = updates.merchantWebsite.trim();
      if (updates.image !== undefined) dbUpdates.image_url = updates.image.trim();
      if (updates.status !== undefined) dbUpdates.status = updates.status;

      // Only Admin can approve/reject/feature products from client
      if (isAdmin) {
        if (updates.approvalStatus !== undefined) dbUpdates.approval_status = updates.approvalStatus;
        if (updates.rejectionReason !== undefined) dbUpdates.rejection_reason = updates.rejectionReason;
        if (updates.isFeatured !== undefined) dbUpdates.is_featured = updates.isFeatured;
      }

      const { error } = await supabase.from('products').update(dbUpdates).eq('id', id);

      if (error) {
        const baseUpdates: any = { updated_at: new Date().toISOString() };
        if (updates.title !== undefined) baseUpdates.title = updates.title.trim();
        if (updates.price !== undefined) baseUpdates.price = Number(updates.price);
        if (updates.description !== undefined) baseUpdates.description = updates.description.trim();
        if (updates.category !== undefined) baseUpdates.category = updates.category;
        if (updates.image !== undefined) baseUpdates.image_url = updates.image.trim();
        if (updates.status !== undefined) baseUpdates.status = updates.status;

        const retry = await supabase.from('products').update(baseUpdates).eq('id', id);
        if (retry.error) {
          showToast(`Failed to update product: ${retry.error.message}`, 'error');
          return { success: false, error: retry.error.message };
        }
      }

      setSellerProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
      setAllProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
      await refreshProducts();
      if (isAdmin) await fetchAllProductsAdmin();

      showToast('Product updated successfully!', 'success');
      return { success: true };
    } catch (err: any) {
      const msg = err?.message || 'Error updating product';
      showToast(msg, 'error');
      return { success: false, error: msg };
    }
  };

  // DELETE PRODUCT
  const deleteProduct = async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (!supabase) {
      showToast('Supabase client not ready', 'error');
      return { success: false, error: 'Supabase client not initialized' };
    }

    try {
      const { error } = await supabase.from('products').delete().eq('id', id);

      if (error) {
        showToast(`Failed to delete product: ${error.message}`, 'error');
        return { success: false, error: error.message };
      }

      setSellerProducts((prev) => prev.filter((p) => p.id !== id));
      setRealProducts((prev) => prev.filter((p) => p.id !== id));
      setAllProducts((prev) => prev.filter((p) => p.id !== id));
      showToast('Product deleted from database', 'info');
      await refreshProducts();
      return { success: true };
    } catch (err: any) {
      const msg = err?.message || 'Error deleting product';
      showToast(msg, 'error');
      return { success: false, error: msg };
    }
  };

  // Track real view event
  const recordView = async (id: string): Promise<void> => {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid || !supabase) return;

    const sessionKey = `cb_view_${id}`;
    if (typeof window !== 'undefined' && sessionStorage.getItem(sessionKey)) {
      return;
    }
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(sessionKey, '1');
    }

    try {
      await supabase.from('product_events').insert({
        product_id: id,
        event_type: 'view'
      });
    } catch {}
  };

  // Track outbound product click event
  const recordClick = async (id: string): Promise<void> => {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid || !supabase) return;

    try {
      await supabase.from('product_events').insert({
        product_id: id,
        event_type: 'shop_click'
      });
    } catch {}
  };

  // Fetch seller's real event counts
  const fetchSellerAnalytics = async (sellerId: string): Promise<SellerAnalytics> => {
    if (!supabase || !sellerId) {
      return {
        totalProducts: 0,
        publishedProducts: 0,
        draftProducts: 0,
        pendingProducts: 0,
        approvedProducts: 0,
        rejectedProducts: 0,
        totalViews: 0,
        totalClicks: 0,
        ctr: '0.0%',
        perProduct: {}
      };
    }

    try {
      const { data: prods } = await supabase
        .from('products')
        .select('id, status, approval_status')
        .eq('seller_id', sellerId);

      const prodIds = (prods || []).map((p: any) => p.id);
      const totalProducts = prods ? prods.length : 0;
      const publishedProducts = prods ? prods.filter((p) => p.status === 'published').length : 0;
      const draftProducts = prods ? prods.filter((p) => p.status === 'draft').length : 0;
      const pendingProducts = prods ? prods.filter((p) => p.approval_status === 'pending').length : 0;
      const approvedProducts = prods ? prods.filter((p) => p.approval_status === 'approved').length : 0;
      const rejectedProducts = prods ? prods.filter((p) => p.approval_status === 'rejected').length : 0;

      if (prodIds.length === 0) {
        return {
          totalProducts,
          publishedProducts,
          draftProducts,
          pendingProducts,
          approvedProducts,
          rejectedProducts,
          totalViews: 0,
          totalClicks: 0,
          ctr: '0.0%',
          perProduct: {}
        };
      }

      const [eventsRes, affClicksRes] = await Promise.all([
        supabase.from('product_events').select('id, product_id, event_type').in('product_id', prodIds),
        supabase.from('affiliate_clicks').select('id, product_id').in('product_id', prodIds)
      ]);

      let totalViews = 0;
      let totalClicks = 0;
      const perProduct: Record<string, { views: number; clicks: number; ctr: string }> = {};

      eventsRes.data?.forEach((ev: any) => {
        if (!perProduct[ev.product_id]) {
          perProduct[ev.product_id] = { views: 0, clicks: 0, ctr: '0.0%' };
        }
        if (ev.event_type === 'view') {
          totalViews++;
          perProduct[ev.product_id].views++;
        } else if (ev.event_type === 'shop_click') {
          totalClicks++;
          perProduct[ev.product_id].clicks++;
        }
      });

      affClicksRes.data?.forEach((clk: any) => {
        if (!clk.product_id) return;
        if (!perProduct[clk.product_id]) {
          perProduct[clk.product_id] = { views: 0, clicks: 0, ctr: '0.0%' };
        }
        totalClicks++;
        perProduct[clk.product_id].clicks++;
      });

      Object.keys(perProduct).forEach((pid) => {
        const item = perProduct[pid];
        item.ctr = item.views > 0 ? ((item.clicks / item.views) * 100).toFixed(1) + '%' : '0.0%';
      });

      const ctr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) + '%' : '0.0%';

      return {
        totalProducts,
        publishedProducts,
        draftProducts,
        pendingProducts,
        approvedProducts,
        rejectedProducts,
        totalViews,
        totalClicks,
        ctr,
        perProduct
      };
    } catch {
      return {
        totalProducts: 0,
        publishedProducts: 0,
        draftProducts: 0,
        pendingProducts: 0,
        approvedProducts: 0,
        rejectedProducts: 0,
        totalViews: 0,
        totalClicks: 0,
        ctr: '0.0%',
        perProduct: {}
      };
    }
  };

  // Upload product image to 'product-images' bucket
  const uploadProductImage = async (
    file: File,
    sellerId: string
  ): Promise<{ success: boolean; url?: string; error?: string }> => {
    if (!supabase) {
      return { success: false, error: 'Supabase client not initialized' };
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: 'Invalid file format. Allowed types: JPG, PNG, WEBP, GIF.'
      };
    }

    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return {
        success: false,
        error: 'File size exceeds 5MB limit. Please choose a smaller image.'
      };
    }

    try {
      const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${sellerId}/${Date.now()}-${cleanName}`;

      const { error } = await supabase.storage
        .from('product-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        return { success: false, error: error.message };
      }

      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(filePath);
      return { success: true, url: urlData.publicUrl };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Failed to upload image to storage'
      };
    }
  };

  return (
    <ProductContext.Provider
      value={{
        products,
        realProducts,
        allProducts,
        sellerProducts,
        isLoading,
        toast,
        showToast,
        hideToast,
        refreshProducts,
        fetchAllProductsAdmin,
        fetchSellerProducts,
        addProduct,
        updateProduct,
        deleteProduct,
        recordView,
        recordClick,
        fetchSellerAnalytics,
        uploadProductImage
      }}
    >
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
};
