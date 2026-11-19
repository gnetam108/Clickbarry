import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  AffiliateLink,
  ExternalAffiliateProduct,
  AffiliateClick,
  CommissionRecord,
  ExternalNetwork
} from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { buildAffiliateUrl, generateTrackingSlug, validateSafeUrl } from '../lib/tracking';

export interface CreateAffiliateLinkInput {
  productId?: string;
  externalProductId?: string;
  targetUrl: string;
  productTitle: string;
  productPrice: number;
  commissionRate: number;
  networkName: string;
  networkId?: string;
  customSubid?: string;
}

export interface AddExternalProductInput {
  title: string;
  imageUrl: string;
  description: string;
  price: number;
  networkName: string;
  networkId: string;
  affiliateProductUrl: string;
  commissionRate?: number;
  category: 'templates' | 'courses' | 'software' | 'ebooks' | 'graphics';
  isAdminProduct?: boolean;
  status?: 'published' | 'draft';
}

export interface SellerActivitySummary {
  links: AffiliateLink[];
  clicks: AffiliateClick[];
  commissions: CommissionRecord[];
}

interface HybridAffiliateContextType {
  // User-scoped affiliate data
  affiliateLinks: AffiliateLink[];
  isLoadingLinks: boolean;
  generateOrGetLink: (input: CreateAffiliateLinkInput) => Promise<{ success: boolean; link?: AffiliateLink; error?: string }>;
  copyLinkToClipboard: (link: AffiliateLink) => Promise<boolean>;

  externalProducts: ExternalAffiliateProduct[];
  adminProducts: ExternalAffiliateProduct[];
  isLoadingExternal: boolean;
  addExternalProduct: (input: AddExternalProductInput) => Promise<{ success: boolean; product?: ExternalAffiliateProduct; error?: string }>;
  updateExternalProduct: (id: string, updates: Partial<ExternalAffiliateProduct>) => Promise<{ success: boolean; error?: string }>;
  deleteExternalProduct: (id: string) => Promise<{ success: boolean; error?: string }>;

  recordOutboundClick: (
    trackingSlugOrId: string,
    destinationUrl: string,
    networkName: string,
    productId?: string,
    externalProductId?: string
  ) => Promise<string>;
  resolveAndTrackClick: (trackingSlug: string) => Promise<{ success: boolean; targetUrl?: string }>;

  totalOutboundClicks: number;
  recentClicks: AffiliateClick[];
  commissionRecords: CommissionRecord[];
  verifiedSalesCount: number;
  totalConfirmedCommission: number;
  pendingCommissionAmount: number;
  approvedCommissionAmount: number;

  // Platform-wide data (Admin) & Seller product activity
  allAffiliateLinks: AffiliateLink[];
  allRecentClicks: AffiliateClick[];
  allCommissionRecords: CommissionRecord[];
  fetchSellerActivity: (sellerId: string) => Promise<SellerActivitySummary>;

  addManualSaleRecord: (record: Omit<CommissionRecord, 'id' | 'createdAt'>) => Promise<{ success: boolean; error?: string }>;

  networks: ExternalNetwork[];
  refreshAffiliateData: () => Promise<void>;
}

const DEFAULT_NETWORKS: ExternalNetwork[] = [
  {
    id: 'clickbarry',
    name: 'ClickBarry Marketplace',
    subidParam: 'ref',
    requiresExternalReporting: false,
    description: 'Direct ClickBarry seller products with verified tracking links.'
  },
  {
    id: 'amazon',
    name: 'Amazon Associates',
    subidParam: 'tag',
    requiresExternalReporting: true,
    description: 'Amazon Associates Program. Sales tracked in Amazon Associates Central.'
  },
  {
    id: 'clickbank',
    name: 'ClickBank',
    subidParam: 'tid',
    requiresExternalReporting: true,
    description: 'ClickBank Affiliate Marketplace. Tracking SubID passed via tid parameter.'
  },
  {
    id: 'digistore24',
    name: 'Digistore24',
    subidParam: 'subid',
    requiresExternalReporting: true,
    description: 'Digistore24 International Affiliate Network.'
  },
  {
    id: 'other',
    name: 'Other Networks / Direct Creator',
    subidParam: 'ref',
    requiresExternalReporting: true,
    description: 'Direct creator partner program or custom affiliate network link.'
  }
];

const HybridAffiliateContext = createContext<HybridAffiliateContextType | undefined>(undefined);

const mapLinkRow = (r: any): AffiliateLink => ({
  id: r.id,
  affiliateId: r.affiliate_id,
  productId: r.product_id,
  externalProductId: r.external_product_id,
  uniqueTrackingSlug: r.unique_tracking_slug,
  customSubid: r.custom_subid,
  targetUrl: r.target_url,
  productTitle: r.product_title,
  productPrice: Number(r.product_price || 0),
  commissionRate: Number(r.commission_rate || 0),
  networkName: r.network_name || 'ClickBarry Marketplace',
  clicksCount: Number(r.clicks_count || 0),
  createdAt: r.created_at,
  updatedAt: r.updated_at
});

const mapClickRow = (r: any): AffiliateClick => ({
  id: r.id,
  trackingId: r.tracking_id,
  affiliateId: r.affiliate_id,
  productId: r.product_id,
  externalProductId: r.external_product_id,
  networkName: r.network_name,
  destinationUrl: r.destination_url,
  referrer: r.referrer,
  createdAt: r.created_at
});

const mapCommRow = (r: any): CommissionRecord => ({
  id: r.id,
  affiliateId: r.affiliate_id,
  productId: r.product_id,
  externalProductId: r.external_product_id,
  orderReference: r.order_reference,
  saleAmount: Number(r.sale_amount || 0),
  commissionAmount: Number(r.commission_amount || 0),
  networkName: r.network_name,
  verificationSource: r.verification_source,
  status: r.status,
  paidAt: r.paid_at,
  notes: r.notes,
  createdAt: r.created_at
});

export const HybridAffiliateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin } = useAuth();

  const [affiliateLinks, setAffiliateLinks] = useState<AffiliateLink[]>([]);
  const [externalProducts, setExternalProducts] = useState<ExternalAffiliateProduct[]>([]);
  const [recentClicks, setRecentClicks] = useState<AffiliateClick[]>([]);
  const [commissionRecords, setCommissionRecords] = useState<CommissionRecord[]>([]);

  const [allAffiliateLinks, setAllAffiliateLinks] = useState<AffiliateLink[]>([]);
  const [allRecentClicks, setAllRecentClicks] = useState<AffiliateClick[]>([]);
  const [allCommissionRecords, setAllCommissionRecords] = useState<CommissionRecord[]>([]);

  const [networks] = useState<ExternalNetwork[]>(DEFAULT_NETWORKS);
  const [isLoadingLinks, setIsLoadingLinks] = useState(false);
  const [isLoadingExternal, setIsLoadingExternal] = useState(false);

  // Clear state cleanly whenever user changes or logs out
  useEffect(() => {
    if (!user) {
      setAffiliateLinks([]);
      setExternalProducts([]);
      setRecentClicks([]);
      setCommissionRecords([]);
      setAllAffiliateLinks([]);
      setAllRecentClicks([]);
      setAllCommissionRecords([]);
    }
  }, [user]);

  const refreshAffiliateData = useCallback(async () => {
    if (!supabase || !user) return;
    setIsLoadingLinks(true);
    setIsLoadingExternal(true);

    try {
      const [linksRes, extRes, clicksRes, commsRes] = await Promise.all([
        supabase
          .from('affiliate_links')
          .select('*')
          .eq('affiliate_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('affiliate_products')
          .select('*')
          .or(`affiliate_id.eq.${user.id},is_admin_product.eq.true`)
          .order('created_at', { ascending: false }),
        supabase
          .from('affiliate_clicks')
          .select('*')
          .eq('affiliate_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('commission_records')
          .select('*')
          .eq('affiliate_id', user.id)
          .order('created_at', { ascending: false })
      ]);

      if (!linksRes.error && linksRes.data) {
        setAffiliateLinks(linksRes.data.map(mapLinkRow));
      }

      if (!extRes.error && extRes.data) {
        setExternalProducts(
          extRes.data.map((r: any) => ({
            id: r.id,
            affiliateId: r.affiliate_id,
            title: r.title,
            imageUrl: r.image_url,
            description: r.description,
            price: Number(r.price),
            networkName: r.network_name,
            networkId: r.network_id || 'other',
            affiliateProductUrl: r.affiliate_product_url,
            commissionRate: Number(r.commission_rate || 0),
            category: r.category,
            isAdminProduct: Boolean(r.is_admin_product),
            status: r.status,
            clicksCount: Number(r.clicks_count || 0),
            createdAt: r.created_at,
            updatedAt: r.updated_at
          }))
        );
      }

      if (!clicksRes.error && clicksRes.data) {
        setRecentClicks(clicksRes.data.map(mapClickRow));
      }

      if (!commsRes.error && commsRes.data) {
        setCommissionRecords(commsRes.data.map(mapCommRow));
      }

      if (isAdmin) {
        const [allLinksRes, allClicksRes, allCommsRes] = await Promise.all([
          supabase.from('affiliate_links').select('*').order('created_at', { ascending: false }),
          supabase.from('affiliate_clicks').select('*').order('created_at', { ascending: false }).limit(500),
          supabase.from('commission_records').select('*').order('created_at', { ascending: false })
        ]);
        if (!allLinksRes.error && allLinksRes.data) setAllAffiliateLinks(allLinksRes.data.map(mapLinkRow));
        if (!allClicksRes.error && allClicksRes.data) setAllRecentClicks(allClicksRes.data.map(mapClickRow));
        if (!allCommsRes.error && allCommsRes.data) setAllCommissionRecords(allCommsRes.data.map(mapCommRow));
      }
    } catch (err) {
      console.warn('Could not query Supabase affiliate tables:', err);
    } finally {
      setIsLoadingLinks(false);
      setIsLoadingExternal(false);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    if (user) {
      refreshAffiliateData();
    }
  }, [user, refreshAffiliateData]);

  // Fetch affiliate activity & commissions for a Seller's own products
  const fetchSellerActivity = useCallback(async (sellerId: string): Promise<SellerActivitySummary> => {
    if (!supabase || !sellerId) {
      return { links: [], clicks: [], commissions: [] };
    }
    try {
      const { data: sellerProds } = await supabase
        .from('products')
        .select('id')
        .eq('seller_id', sellerId);

      const prodIds = (sellerProds || []).map((p: any) => p.id);
      if (prodIds.length === 0) {
        return { links: [], clicks: [], commissions: [] };
      }

      const [linksRes, clicksRes, commsRes] = await Promise.all([
        supabase.from('affiliate_links').select('*').in('product_id', prodIds).order('created_at', { ascending: false }),
        supabase.from('affiliate_clicks').select('*').in('product_id', prodIds).order('created_at', { ascending: false }).limit(200),
        supabase.from('commission_records').select('*').in('product_id', prodIds).order('created_at', { ascending: false })
      ]);

      return {
        links: linksRes.data ? linksRes.data.map(mapLinkRow) : [],
        clicks: clicksRes.data ? clicksRes.data.map(mapClickRow) : [],
        commissions: commsRes.data ? commsRes.data.map(mapCommRow) : []
      };
    } catch {
      return { links: [], clicks: [], commissions: [] };
    }
  }, []);

  // Generate or Retrieve Unique Affiliate Tracking Link
  const generateOrGetLink = async (
    input: CreateAffiliateLinkInput
  ): Promise<{ success: boolean; link?: AffiliateLink; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Please log in as an Affiliate to generate your tracking link.' };
    }

    const { isValid, sanitizedUrl, error: urlErr } = validateSafeUrl(input.targetUrl);
    if (!isValid || !sanitizedUrl) {
      return { success: false, error: urlErr || 'Invalid product destination URL' };
    }

    // Return existing link if affiliate already created one for this product
    const existing = affiliateLinks.find(
      (l) =>
        (input.productId && l.productId === input.productId) ||
        (input.externalProductId && l.externalProductId === input.externalProductId)
    );
    if (existing) {
      return { success: true, link: existing };
    }

    const targetWithTracking = buildAffiliateUrl(
      sanitizedUrl,
      input.networkId || 'other',
      user.id,
      input.customSubid
    );

    const trackingSlug = generateTrackingSlug(user.id, input.productId || input.externalProductId || 'item');

    const newLink: AffiliateLink = {
      id: `link-${Date.now()}`,
      affiliateId: user.id,
      productId: input.productId,
      externalProductId: input.externalProductId,
      uniqueTrackingSlug: trackingSlug,
      customSubid: input.customSubid,
      targetUrl: targetWithTracking,
      productTitle: input.productTitle,
      productPrice: input.productPrice,
      commissionRate: input.commissionRate,
      networkName: input.networkName,
      clicksCount: 0,
      createdAt: new Date().toISOString()
    };

    if (supabase) {
      try {
        const isUuid = (val?: string) =>
          Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

        const { data, error } = await supabase
          .from('affiliate_links')
          .insert({
            affiliate_id: user.id,
            product_id: isUuid(input.productId) ? input.productId : null,
            external_product_id: isUuid(input.externalProductId) ? input.externalProductId : null,
            unique_tracking_slug: trackingSlug,
            custom_subid: input.customSubid || null,
            target_url: targetWithTracking,
            product_title: input.productTitle,
            product_price: input.productPrice,
            commission_rate: input.commissionRate,
            network_name: input.networkName
          })
          .select()
          .single();

        if (error) {
          return { success: false, error: error.message };
        }
        if (data) {
          newLink.id = data.id;
        }
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to save affiliate link' };
      }
    }

    setAffiliateLinks((prev) => [newLink, ...prev]);
    return { success: true, link: newLink };
  };

  const copyLinkToClipboard = async (link: AffiliateLink): Promise<boolean> => {
    const shareableUrl = `${window.location.origin}/?cb_trk=${encodeURIComponent(link.uniqueTrackingSlug)}`;
    try {
      await navigator.clipboard.writeText(shareableUrl);
      return true;
    } catch {
      return false;
    }
  };

  // Public visitor click resolver (?cb_trk=<slug>): works even when visitor is NOT logged in
  const resolveAndTrackClick = useCallback(async (trackingSlug: string): Promise<{ success: boolean; targetUrl?: string }> => {
    if (!supabase || !trackingSlug) return { success: false };

    try {
      const { data: linkRow, error } = await supabase
        .from('affiliate_links')
        .select('*')
        .eq('unique_tracking_slug', trackingSlug)
        .maybeSingle();

      if (error || !linkRow || !linkRow.target_url) {
        return { success: false };
      }

      const { isValid, sanitizedUrl } = validateSafeUrl(linkRow.target_url);
      if (!isValid || !sanitizedUrl) {
        return { success: false };
      }

      await supabase.from('affiliate_clicks').insert({
        tracking_id: trackingSlug,
        affiliate_id: linkRow.affiliate_id || null,
        product_id: linkRow.product_id || null,
        external_product_id: linkRow.external_product_id || null,
        network_name: linkRow.network_name || 'ClickBarry Marketplace',
        destination_url: sanitizedUrl,
        referrer: typeof document !== 'undefined' ? document.referrer : ''
      });

      try {
        await supabase.rpc('increment_affiliate_click', { p_slug: trackingSlug });
      } catch {}

      return { success: true, targetUrl: sanitizedUrl };
    } catch {
      return { success: false };
    }
  }, []);

  // Outbound click logging from logged-in UI
  const recordOutboundClick = async (
    trackingSlugOrId: string,
    destinationUrl: string,
    networkName: string,
    productId?: string,
    externalProductId?: string
  ): Promise<string> => {
    const { isValid, sanitizedUrl } = validateSafeUrl(destinationUrl);
    const finalUrl = isValid && sanitizedUrl ? sanitizedUrl : destinationUrl;

    if (supabase) {
      try {
        const isUuid = (val?: string) =>
          Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

        await supabase.from('affiliate_clicks').insert({
          tracking_id: trackingSlugOrId,
          affiliate_id: user?.id || null,
          product_id: isUuid(productId) ? productId : null,
          external_product_id: isUuid(externalProductId) ? externalProductId : null,
          network_name: networkName,
          destination_url: finalUrl,
          referrer: typeof document !== 'undefined' ? document.referrer : ''
        });

        try {
          await supabase.rpc('increment_affiliate_click', { p_slug: trackingSlugOrId });
        } catch {}

        await refreshAffiliateData();
      } catch {}
    }

    return finalUrl;
  };

  const addExternalProduct = async (
    input: AddExternalProductInput
  ): Promise<{ success: boolean; product?: ExternalAffiliateProduct; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Please log in to add external affiliate products' };
    }

    const { isValid, sanitizedUrl, error: urlErr } = validateSafeUrl(input.affiliateProductUrl);
    if (!isValid || !sanitizedUrl) {
      return { success: false, error: urlErr || 'Please provide a valid affiliate product URL' };
    }

    const newProd: ExternalAffiliateProduct = {
      id: `ext-${Date.now()}`,
      affiliateId: user.id,
      title: input.title.trim(),
      imageUrl: input.imageUrl.trim(),
      description: input.description.trim(),
      price: Number(input.price) || 0,
      networkName: input.networkName.trim() || 'Other Networks',
      networkId: input.networkId || 'other',
      affiliateProductUrl: sanitizedUrl,
      commissionRate: Number(input.commissionRate) || 0,
      category: input.category,
      isAdminProduct: isAdmin && Boolean(input.isAdminProduct),
      status: input.status || 'published',
      clicksCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('affiliate_products')
          .insert({
            affiliate_id: user.id,
            title: newProd.title,
            image_url: newProd.imageUrl,
            description: newProd.description,
            price: newProd.price,
            network_name: newProd.networkName,
            network_id: newProd.networkId,
            affiliate_product_url: newProd.affiliateProductUrl,
            commission_rate: newProd.commissionRate,
            category: newProd.category,
            is_admin_product: newProd.isAdminProduct,
            status: newProd.status
          })
          .select()
          .single();

        if (error) return { success: false, error: error.message };
        if (data) newProd.id = data.id;
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to save product' };
      }
    }

    setExternalProducts((prev) => [newProd, ...prev]);
    return { success: true, product: newProd };
  };

  const updateExternalProduct = async (
    id: string,
    updates: Partial<ExternalAffiliateProduct>
  ): Promise<{ success: boolean; error?: string }> => {
    const target = externalProducts.find((p) => p.id === id);
    if (!target) return { success: false, error: 'Product not found' };

    const isOwner = user && target.affiliateId === user.id;
    if (!isOwner && !isAdmin) {
      return { success: false, error: 'Unauthorized: You can only edit your own products.' };
    }

    if (supabase) {
      try {
        const dbUpdates: any = { updated_at: new Date().toISOString() };
        if (updates.title) dbUpdates.title = updates.title;
        if (updates.price !== undefined) dbUpdates.price = Number(updates.price);
        if (updates.description) dbUpdates.description = updates.description;
        if (updates.category) dbUpdates.category = updates.category;
        if (updates.networkName) dbUpdates.network_name = updates.networkName;
        if (updates.networkId) dbUpdates.network_id = updates.networkId;
        if (updates.affiliateProductUrl) {
          const { sanitizedUrl } = validateSafeUrl(updates.affiliateProductUrl);
          if (sanitizedUrl) dbUpdates.affiliate_product_url = sanitizedUrl;
        }
        if (updates.commissionRate !== undefined) dbUpdates.commission_rate = Number(updates.commissionRate);
        if (updates.status) dbUpdates.status = updates.status;

        const { error } = await supabase.from('affiliate_products').update(dbUpdates).eq('id', id);
        if (error) return { success: false, error: error.message };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Update failed' };
      }
    }

    setExternalProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p))
    );
    return { success: true };
  };

  const deleteExternalProduct = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const target = externalProducts.find((p) => p.id === id);
    if (!target) return { success: false, error: 'Product not found' };

    const isOwner = user && target.affiliateId === user.id;
    if (!isOwner && !isAdmin) {
      return { success: false, error: 'Unauthorized: You can only delete your own products.' };
    }

    if (supabase) {
      try {
        const { error } = await supabase.from('affiliate_products').delete().eq('id', id);
        if (error) return { success: false, error: error.message };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Delete failed' };
      }
    }

    setExternalProducts((prev) => prev.filter((p) => p.id !== id));
    return { success: true };
  };

  const addManualSaleRecord = async (
    record: Omit<CommissionRecord, 'id' | 'createdAt'>
  ): Promise<{ success: boolean; error?: string }> => {
    if (!supabase) return { success: false, error: 'Database unavailable' };

    try {
      const { data, error } = await supabase
        .from('commission_records')
        .insert({
          affiliate_id: record.affiliateId,
          product_id: record.productId || null,
          order_reference: record.orderReference,
          sale_amount: record.saleAmount,
          commission_amount: record.commissionAmount,
          network_name: record.networkName,
          verification_source: record.verificationSource,
          status: record.status,
          notes: record.notes
        })
        .select()
        .single();

      if (error) return { success: false, error: error.message };

      const newRecord: CommissionRecord = data
        ? mapCommRow(data)
        : { ...record, id: `comm-${Date.now()}`, createdAt: new Date().toISOString() };

      setCommissionRecords((prev) => [newRecord, ...prev]);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to record sale' };
    }
  };

  // Real DB metrics (0 when empty)
  const totalOutboundClicks = recentClicks.length;
  const verifiedSalesCount = commissionRecords.filter((c) => c.status === 'verified' || c.status === 'paid').length;
  const totalConfirmedCommission = commissionRecords
    .filter((c) => c.status === 'verified' || c.status === 'paid')
    .reduce((acc, curr) => acc + curr.commissionAmount, 0);
  const pendingCommissionAmount = commissionRecords
    .filter((c) => c.status === 'pending')
    .reduce((acc, curr) => acc + curr.commissionAmount, 0);
  const approvedCommissionAmount = commissionRecords
    .filter((c) => c.status === 'verified')
    .reduce((acc, curr) => acc + curr.commissionAmount, 0);

  const adminProducts = externalProducts.filter((p) => p.isAdminProduct);

  return (
    <HybridAffiliateContext.Provider
      value={{
        affiliateLinks,
        isLoadingLinks,
        generateOrGetLink,
        copyLinkToClipboard,
        externalProducts,
        adminProducts,
        isLoadingExternal,
        addExternalProduct,
        updateExternalProduct,
        deleteExternalProduct,
        recordOutboundClick,
        resolveAndTrackClick,
        totalOutboundClicks,
        recentClicks,
        commissionRecords,
        verifiedSalesCount,
        totalConfirmedCommission,
        pendingCommissionAmount,
        approvedCommissionAmount,
        allAffiliateLinks,
        allRecentClicks,
        allCommissionRecords,
        fetchSellerActivity,
        addManualSaleRecord,
        networks,
        refreshAffiliateData
      }}
    >
      {children}
    </HybridAffiliateContext.Provider>
  );
};

export const useHybridAffiliate = () => {
  const context = useContext(HybridAffiliateContext);
  if (!context) {
    throw new Error('useHybridAffiliate must be used within HybridAffiliateProvider');
  }
  return context;
};
