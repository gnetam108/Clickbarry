import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Product, ToastMessage } from '../types';
import { SAMPLE_PRODUCTS } from '../data/mockData';
import { supabase } from '../lib/supabase';

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
  totalViews: number;
  totalClicks: number;
  ctr: string;
  perProduct: Record<string, { views: number; clicks: number; ctr: string }>;
}

interface ProductContextType {
  products: Product[];
  realProducts: Product[];
  sellerProducts: Product[];
  isLoading: boolean;
  toast: ToastMessage | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  hideToast: () => void;
  refreshProducts: () => Promise<void>;
  fetchSellerProducts: (sellerId: string) => Promise<Product[]>;
  addProduct: (productData: AddProductInput) => Promise<{ success: boolean; product?: Product; error?: string }>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<{ success: boolean; error?: string }>;
  deleteProduct: (id: string) => Promise<{ success: boolean; error?: string }>;
  recordView: (id: string) => Promise<void>;
  recordClick: (id: string) => Promise<void>;
  fetchSellerAnalytics: (sellerId: string) => Promise<SellerAnalytics>;
  uploadProductImage: (file: File, sellerId: string) => Promise<{ success: boolean; url?: string; error?: string }>;
  resetDemoData: () => void;
}

const STORAGE_KEY = 'clickbarry_demo_products_v3';

const CATEGORY_LABELS: Record<string, string> = {
  templates: 'Notion & Template',
  courses: 'Video Course',
  software: 'Software & Code',
  ebooks: 'E-Book & Guide',
  graphics: 'Graphics & Canva'
};

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [realProducts, setRealProducts] = useState<Product[]>([]);
  const [sellerProducts, setSellerProducts] = useState<Product[]>([]);
  const [demoProducts, setDemoProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return SAMPLE_PRODUCTS;
  });

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

  // Helper to map Supabase database row to Product interface
  const mapDbRowToProduct = (row: any, profileMap?: Record<string, string>): Product => {
    const sellerName = profileMap?.[row.seller_id] || (row.profiles ? row.profiles.full_name : null) || 'Verified Affiliate Partner';
    const finalAffiliateUrl = row.affiliate_url || row.original_url || '';
    const finalMerchant = row.merchant_name || 'Independent Creator / Brand';

    return {
      id: row.id,
      title: row.title,
      price: Number(row.price),
      originalPrice: Math.round(Number(row.price) * 1.5),
      commissionRate: Number(row.commission_rate) || 40,
      category: row.category,
      categoryLabel: CATEGORY_LABELS[row.category] || 'Digital Product',
      description: row.description || '',
      originalUrl: finalAffiliateUrl,
      affiliateUrl: finalAffiliateUrl,
      merchantName: finalMerchant,
      merchantWebsite: row.merchant_website || '',
      approvalStatus: row.approval_status || 'approved',
      image: row.image_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
      fileFormat: 'Affiliate Referral Link',
      features: [
        `Discover & purchase via verified merchant: ${finalMerchant}`,
        'Direct instant redirect to product destination',
        'Verified ClickBarry affiliate catalog'
      ],
      sellerName,
      sellerVerified: true,
      sellerId: row.seller_id,
      affiliateId: row.seller_id,
      status: row.status,
      rating: 5.0,
      reviewsCount: 1,
      salesCount: 0,
      views: 0,
      clicks: 0,
      isDemo: false,
      isRealDb: true,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  };

  // Fetch all published products from Supabase
  const refreshProducts = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Could not fetch products from Supabase:', error.message);
      } else if (data) {
        // Collect seller profiles for display names
        const sellerIds = Array.from(new Set(data.map((r) => r.seller_id).filter(Boolean)));
        let profileMap: Record<string, string> = {};

        if (sellerIds.length > 0) {
          try {
            const { data: profs } = await supabase
              .from('profiles')
              .select('id, full_name');
            if (profs) {
              profs.forEach((p) => {
                if (p.id && p.full_name) profileMap[p.id] = p.full_name;
              });
            }
          } catch {
            // Ignore if RLS restricts other profiles
          }
        }

        const mapped = data.map((r) => mapDbRowToProduct(r, profileMap));
        setRealProducts(mapped);
      }
    } catch (err) {
      console.warn('Error refreshing products:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch products for a specific authenticated seller
  const fetchSellerProducts = useCallback(async (sellerId: string): Promise<Product[]> => {
    if (!supabase || !sellerId) return [];

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error fetching seller products:', error);
        return [];
      }

      if (data) {
        const mapped = data.map((r) => mapDbRowToProduct(r));
        setSellerProducts(mapped);
        return mapped;
      }
      return [];
    } catch (e) {
      console.warn('Exception fetching seller products:', e);
      return [];
    }
  }, []);

  // Initial load on mount
  useEffect(() => {
    refreshProducts();
  }, [refreshProducts]);

  // Combined product list (Real published products first, then sample demo products clearly marked)
  const products: Product[] = [
    ...realProducts,
    ...demoProducts
  ];

  // REAL ADD PRODUCT (Affiliate Product Listing)
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
        showToast('You must be logged in as an affiliate to submit products', 'error');
        return { success: false, error: 'Unauthorized: Affiliate login required' };
      }

      const sellerId = authData.user.id;

      // Safe URL normalization for affiliate tracking link
      const targetUrl = productData.affiliateUrl || productData.originalUrl;
      let cleanUrl = targetUrl.trim();
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = 'https://' + cleanUrl;
      }

      const baseRow: any = {
        seller_id: sellerId,
        title: productData.title.trim(),
        image_url: productData.image.trim(),
        price: Number(productData.price),
        description: productData.description.trim(),
        category: productData.category,
        original_url: cleanUrl,
        status: productData.status || 'draft'
      };

      // Try inserting with affiliate fields first
      const fullRow = {
        ...baseRow,
        merchant_name: (productData.merchantName || 'Direct Merchant').trim(),
        affiliate_url: cleanUrl,
        commission_rate: Number(productData.commissionRate) || 40,
        merchant_website: productData.merchantWebsite ? productData.merchantWebsite.trim() : null,
        approval_status: productData.approvalStatus || 'approved'
      };

      let insertedData: any = null;
      const { data, error } = await supabase
        .from('products')
        .insert(fullRow)
        .select()
        .single();

      if (error) {
        // If column error occurs (migration not run yet in user Supabase), fallback to base columns
        console.warn('Full affiliate insert warning, retrying with standard schema:', error.message);
        const retryRes = await supabase
          .from('products')
          .insert(baseRow)
          .select()
          .single();

        if (retryRes.error) {
          showToast(`Failed to add product: ${retryRes.error.message}`, 'error');
          return { success: false, error: retryRes.error.message };
        }
        insertedData = retryRes.data;
      } else {
        insertedData = data;
      }

      const newProd = mapDbRowToProduct(insertedData);
      if (newProd.status === 'published') {
        setRealProducts((prev) => [newProd, ...prev]);
      }
      setSellerProducts((prev) => [newProd, ...prev]);

      showToast(`Affiliate product "${newProd.title}" submitted successfully!`, 'success');
      await refreshProducts();
      return { success: true, product: newProd };
    } catch (err: any) {
      const msg = err?.message || 'Unexpected error creating affiliate product';
      showToast(msg, 'error');
      return { success: false, error: msg };
    }
  };

  // REAL UPDATE PRODUCT
  const updateProduct = async (
    id: string,
    updates: Partial<Product>
  ): Promise<{ success: boolean; error?: string }> => {
    // If it's a demo product, update local state
    if (!id.includes('-') || id.startsWith('prod-demo') || id.startsWith('prod-custom')) {
      setDemoProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
      );
      showToast('Demo product updated successfully!', 'success');
      return { success: true };
    }

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
      if (updates.approvalStatus !== undefined) dbUpdates.approval_status = updates.approvalStatus;
      if (updates.image !== undefined) dbUpdates.image_url = updates.image.trim();
      if (updates.status !== undefined) dbUpdates.status = updates.status;

      // Attempt update with all fields
      const { error } = await supabase
        .from('products')
        .update(dbUpdates)
        .eq('id', id);

      if (error) {
        // Fallback without new columns if needed
        const baseUpdates: any = {
          updated_at: new Date().toISOString()
        };
        if (updates.title !== undefined) baseUpdates.title = updates.title.trim();
        if (updates.price !== undefined) baseUpdates.price = Number(updates.price);
        if (updates.description !== undefined) baseUpdates.description = updates.description.trim();
        if (updates.category !== undefined) baseUpdates.category = updates.category;
        if (updates.originalUrl !== undefined || updates.affiliateUrl !== undefined) {
          let clean = (updates.affiliateUrl || updates.originalUrl || '').trim();
          if (clean && !clean.startsWith('http://') && !clean.startsWith('https://')) clean = 'https://' + clean;
          baseUpdates.original_url = clean;
        }
        if (updates.image !== undefined) baseUpdates.image_url = updates.image.trim();
        if (updates.status !== undefined) baseUpdates.status = updates.status;

        const retry = await supabase.from('products').update(baseUpdates).eq('id', id);
        if (retry.error) {
          showToast(`Failed to update product: ${retry.error.message}`, 'error');
          return { success: false, error: retry.error.message };
        }
      }

      setSellerProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
      );
      setRealProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
      );

      showToast('Product updated successfully!', 'success');
      await refreshProducts();
      return { success: true };
    } catch (err: any) {
      const msg = err?.message || 'Error updating product';
      showToast(msg, 'error');
      return { success: false, error: msg };
    }
  };

  // REAL DELETE PRODUCT
  const deleteProduct = async (id: string): Promise<{ success: boolean; error?: string }> => {
    // If it's a demo product, remove from local demo state
    if (!id.includes('-') || id.startsWith('prod-demo') || id.startsWith('prod-custom')) {
      setDemoProducts((prev) => prev.filter((p) => p.id !== id));
      showToast('Demo product removed', 'info');
      return { success: true };
    }

    if (!supabase) {
      showToast('Supabase client not ready', 'error');
      return { success: false, error: 'Supabase client not initialized' };
    }

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) {
        showToast(`Failed to delete product: ${error.message}`, 'error');
        return { success: false, error: error.message };
      }

      setSellerProducts((prev) => prev.filter((p) => p.id !== id));
      setRealProducts((prev) => prev.filter((p) => p.id !== id));
      showToast('Product deleted from database', 'info');
      await refreshProducts();
      return { success: true };
    } catch (err: any) {
      const msg = err?.message || 'Error deleting product';
      showToast(msg, 'error');
      return { success: false, error: msg };
    }
  };

  // REAL ANALYTICS: Track view event
  const recordView = async (id: string): Promise<void> => {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid) {
      // Demo product local view count
      setDemoProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, views: (p.views || 0) + 1 } : p))
      );
      return;
    }

    // De-duplicate view count in current browser session
    const sessionKey = `cb_view_${id}`;
    if (typeof window !== 'undefined' && sessionStorage.getItem(sessionKey)) {
      return;
    }
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(sessionKey, '1');
    }

    if (!supabase) return;
    try {
      await supabase.from('product_events').insert({
        product_id: id,
        event_type: 'view'
      });
    } catch {
      // ignore
    }
  };

  // REAL ANALYTICS: Track Shop Now click event (Affiliate Outbound Click)
  const recordClick = async (id: string): Promise<void> => {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid) {
      setDemoProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, clicks: (p.clicks || 0) + 1 } : p))
      );
      return;
    }

    if (!supabase) return;
    try {
      await supabase.from('product_events').insert({
        product_id: id,
        event_type: 'shop_click'
      });
    } catch {
      // ignore
    }
  };

  // REAL ANALYTICS: Fetch seller's real event counts
  const fetchSellerAnalytics = async (sellerId: string): Promise<SellerAnalytics> => {
    if (!supabase || !sellerId) {
      return {
        totalProducts: 0,
        publishedProducts: 0,
        draftProducts: 0,
        totalViews: 0,
        totalClicks: 0,
        ctr: '0.0%',
        perProduct: {}
      };
    }

    try {
      // Fetch seller's products
      const { data: prods } = await supabase
        .from('products')
        .select('id, status')
        .eq('seller_id', sellerId);

      const totalProducts = prods ? prods.length : 0;
      const publishedProducts = prods ? prods.filter((p) => p.status === 'published').length : 0;
      const draftProducts = prods ? prods.filter((p) => p.status === 'draft').length : 0;

      // Fetch events (RLS automatically filters product_events for only this seller's products)
      const { data: events, error } = await supabase
        .from('product_events')
        .select('id, product_id, event_type, created_at');

      if (error || !events) {
        return {
          totalProducts,
          publishedProducts,
          draftProducts,
          totalViews: 0,
          totalClicks: 0,
          ctr: '0.0%',
          perProduct: {}
        };
      }

      let totalViews = 0;
      let totalClicks = 0;
      const perProduct: Record<string, { views: number; clicks: number; ctr: string }> = {};

      events.forEach((ev) => {
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

      // Calculate CTR for each product
      Object.keys(perProduct).forEach((pid) => {
        const item = perProduct[pid];
        item.ctr = item.views > 0 ? ((item.clicks / item.views) * 100).toFixed(1) + '%' : '0.0%';
      });

      const ctr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) + '%' : '0.0%';

      return {
        totalProducts,
        publishedProducts,
        draftProducts,
        totalViews,
        totalClicks,
        ctr,
        perProduct
      };
    } catch (e) {
      console.warn('Error fetching seller analytics:', e);
      return {
        totalProducts: 0,
        publishedProducts: 0,
        draftProducts: 0,
        totalViews: 0,
        totalClicks: 0,
        ctr: '0.0%',
        perProduct: {}
      };
    }
  };

  // REAL STORAGE: Upload product image to 'product-images' bucket
  const uploadProductImage = async (
    file: File,
    sellerId: string
  ): Promise<{ success: boolean; url?: string; error?: string }> => {
    if (!supabase) {
      return { success: false, error: 'Supabase client not initialized' };
    }

    // 1. File type validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: 'Invalid file format. Allowed types: JPG, PNG, WEBP, GIF.'
      };
    }

    // 2. File size validation (5 MB limit)
    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return {
        success: false,
        error: 'File size exceeds 5MB limit. Please choose a smaller image.'
      };
    }

    try {
      // Folder structure: ${sellerId}/${timestamp}-${sanitized_name}
      // Matches the RLS policy: (auth.uid())::text = (storage.foldername(name))[1]
      const fileExt = file.name.split('.').pop() || 'jpg';
      const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${sellerId}/${Date.now()}-${cleanName}`;

      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      // Retrieve public CDN URL
      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      return {
        success: true,
        url: urlData.publicUrl
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Failed to upload image to storage'
      };
    }
  };

  const resetDemoData = () => {
    setDemoProducts(SAMPLE_PRODUCTS);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_PRODUCTS));
    } catch {
      // ignore
    }
    showToast('Demo products restored to default state', 'info');
  };

  return (
    <ProductContext.Provider
      value={{
        products,
        realProducts,
        sellerProducts,
        isLoading,
        toast,
        showToast,
        hideToast,
        refreshProducts,
        fetchSellerProducts,
        addProduct,
        updateProduct,
        deleteProduct,
        recordView,
        recordClick,
        fetchSellerAnalytics,
        uploadProductImage,
        resetDemoData
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
