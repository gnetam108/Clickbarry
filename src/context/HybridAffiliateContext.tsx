import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  AffiliateLink,
  ExternalAffiliateProduct,
  AffiliateClick,
  CommissionRecord,
  ExternalNetwork,
  Product
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

interface HybridAffiliateContextType {
  // Method A: Links
  affiliateLinks: AffiliateLink[];
  isLoadingLinks: boolean;
  generateOrGetLink: (input: CreateAffiliateLinkInput) => Promise<{ success: boolean; link?: AffiliateLink; error?: string }>;
  copyLinkToClipboard: (link: AffiliateLink) => Promise<boolean>;

  // Method B: My External Affiliate Products
  externalProducts: ExternalAffiliateProduct[];
  adminProducts: ExternalAffiliateProduct[];
  isLoadingExternal: boolean;
  addExternalProduct: (input: AddExternalProductInput) => Promise<{ success: boolean; product?: ExternalAffiliateProduct; error?: string }>;
  updateExternalProduct: (id: string, updates: Partial<ExternalAffiliateProduct>) => Promise<{ success: boolean; error?: string }>;
  deleteExternalProduct: (id: string) => Promise<{ success: boolean; error?: string }>;

  // Outbound Click Tracking & Redirect
  recordOutboundClick: (trackingSlugOrId: string, destinationUrl: string, networkName: string, productId?: string, externalProductId?: string) => Promise<string>;
  totalOutboundClicks: number;
  recentClicks: AffiliateClick[];

  // Sales & Commission Rules
  commissionRecords: CommissionRecord[];
  verifiedSalesCount: number;
  totalConfirmedCommission: number;
  addManualSaleRecord: (record: Omit<CommissionRecord, 'id' | 'createdAt'>) => Promise<{ success: boolean; error?: string }>;

  // Supported Networks
  networks: ExternalNetwork[];

  // Refresh helper
  refreshAffiliateData: () => Promise<void>;
}

const DEFAULT_NETWORKS: ExternalNetwork[] = [
  {
    id: 'amazon',
    name: 'Amazon Associates',
    subidParam: 'tag',
    requiresExternalReporting: true,
    description: 'Amazon Associates Program. Sales and earnings tracked in Amazon Associates Central.'
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

const LOCAL_LINKS_KEY = 'cb_hybrid_affiliate_links_v1';
const LOCAL_EXT_PRODS_KEY = 'cb_hybrid_external_products_v1';
const LOCAL_CLICKS_KEY = 'cb_hybrid_affiliate_clicks_v1';
const LOCAL_COMMISSIONS_KEY = 'cb_hybrid_commissions_v1';

const HybridAffiliateContext = createContext<HybridAffiliateContextType | undefined>(undefined);

export const HybridAffiliateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  // State
  const [affiliateLinks, setAffiliateLinks] = useState<AffiliateLink[]>([]);
  const [externalProducts, setExternalProducts] = useState<ExternalAffiliateProduct[]>([]);
  const [recentClicks, setRecentClicks] = useState<AffiliateClick[]>([]);
  const [commissionRecords, setCommissionRecords] = useState<CommissionRecord[]>([]);
  const [networks] = useState<ExternalNetwork[]>(DEFAULT_NETWORKS);

  const [isLoadingLinks, setIsLoadingLinks] = useState(false);
  const [isLoadingExternal, setIsLoadingExternal] = useState(false);

  // Initialize from LocalStorage for seamless fallback
  useEffect(() => {
    try {
      const storedLinks = localStorage.getItem(LOCAL_LINKS_KEY);
      if (storedLinks) setAffiliateLinks(JSON.parse(storedLinks));

      const storedExt = localStorage.getItem(LOCAL_EXT_PRODS_KEY);
      if (storedExt) setExternalProducts(JSON.parse(storedExt));

      const storedClicks = localStorage.getItem(LOCAL_CLICKS_KEY);
      if (storedClicks) setRecentClicks(JSON.parse(storedClicks));

      const storedComms = localStorage.getItem(LOCAL_COMMISSIONS_KEY);
      if (storedComms) setCommissionRecords(JSON.parse(storedComms));
    } catch {
      // ignore
    }
  }, []);

  // Sync to LocalStorage
  const saveLinksLocally = (links: AffiliateLink[]) => {
    setAffiliateLinks(links);
    try {
      localStorage.setItem(LOCAL_LINKS_KEY, JSON.stringify(links));
    } catch {}
  };

  const saveExtProductsLocally = (products: ExternalAffiliateProduct[]) => {
    setExternalProducts(products);
    try {
      localStorage.setItem(LOCAL_EXT_PRODS_KEY, JSON.stringify(products));
    } catch {}
  };

  const saveClicksLocally = (clicks: AffiliateClick[]) => {
    setRecentClicks(clicks);
    try {
      localStorage.setItem(LOCAL_CLICKS_KEY, JSON.stringify(clicks));
    } catch {}
  };

  const saveCommissionsLocally = (comms: CommissionRecord[]) => {
    setCommissionRecords(comms);
    try {
      localStorage.setItem(LOCAL_COMMISSIONS_KEY, JSON.stringify(comms));
    } catch {}
  };

  // Refresh from Supabase (if tables exist)
  const refreshAffiliateData = useCallback(async () => {
    if (!supabase || !user) return;

    try {
      // 1. Fetch affiliate links
      const { data: linksData, error: linksErr } = await supabase
        .from('affiliate_links')
        .select('*')
        .eq('affiliate_id', user.id)
        .order('created_at', { ascending: false });

      if (!linksErr && linksData) {
        const mappedLinks: AffiliateLink[] = linksData.map((r: any) => ({
          id: r.id,
          affiliateId: r.affiliate_id,
          productId: r.product_id,
          externalProductId: r.external_product_id,
          uniqueTrackingSlug: r.unique_tracking_slug,
          customSubid: r.custom_subid,
          targetUrl: r.target_url,
          productTitle: r.product_title,
          productPrice: Number(r.product_price),
          commissionRate: Number(r.commission_rate),
          networkName: r.network_name || 'ClickBarry Marketplace',
          clicksCount: Number(r.clicks_count || 0),
          createdAt: r.created_at,
          updatedAt: r.updated_at
        }));
        saveLinksLocally(mappedLinks);
      }

      // 2. Fetch external products (both affiliate's own and admin published)
      const { data: extData, error: extErr } = await supabase
        .from('affiliate_products')
        .select('*')
        .or(`affiliate_id.eq.${user.id},is_admin_product.eq.true`)
        .order('created_at', { ascending: false });

      if (!extErr && extData) {
        const mappedExt: ExternalAffiliateProduct[] = extData.map((r: any) => ({
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
        }));
        saveExtProductsLocally(mappedExt);
      }

      // 3. Fetch clicks
      const { data: clicksData, error: clicksErr } = await supabase
        .from('affiliate_clicks')
        .select('*')
        .eq('affiliate_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!clicksErr && clicksData) {
        const mappedClicks: AffiliateClick[] = clicksData.map((r: any) => ({
          id: r.id,
          trackingId: r.tracking_id,
          affiliateId: r.affiliate_id,
          productId: r.product_id,
          externalProductId: r.external_product_id,
          networkName: r.network_name,
          destinationUrl: r.destination_url,
          referrer: r.referrer,
          createdAt: r.created_at
        }));
        saveClicksLocally(mappedClicks);
      }

      // 4. Fetch commission records
      const { data: commsData, error: commsErr } = await supabase
        .from('commission_records')
        .select('*')
        .eq('affiliate_id', user.id)
        .order('created_at', { ascending: false });

      if (!commsErr && commsData) {
        const mappedComms: CommissionRecord[] = commsData.map((r: any) => ({
          id: r.id,
          affiliateId: r.affiliate_id,
          productId: r.product_id,
          externalProductId: r.external_product_id,
          orderReference: r.order_reference,
          saleAmount: Number(r.sale_amount),
          commissionAmount: Number(r.commission_amount),
          networkName: r.network_name,
          verificationSource: r.verification_source,
          status: r.status,
          paidAt: r.paid_at,
          notes: r.notes,
          createdAt: r.created_at
        }));
        saveCommissionsLocally(mappedComms);
      }
    } catch (err) {
      console.warn('Could not query Supabase hybrid tables (using local cache):', err);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      refreshAffiliateData();
    }
  }, [user, refreshAffiliateData]);

  // METHOD A: Generate or Retrieve Unique Affiliate Link for a Product
  const generateOrGetLink = async (
    input: CreateAffiliateLinkInput
  ): Promise<{ success: boolean; link?: AffiliateLink; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Please log in to generate an affiliate tracking link' };
    }

    const { isValid, sanitizedUrl, error: urlErr } = validateSafeUrl(input.targetUrl);
    if (!isValid || !sanitizedUrl) {
      return { success: false, error: urlErr || 'Invalid destination URL' };
    }

    // Check if affiliate already has a link for this product
    const existing = affiliateLinks.find(
      (l) =>
        (input.productId && l.productId === input.productId) ||
        (input.externalProductId && l.externalProductId === input.externalProductId)
    );
    if (existing) {
      return { success: true, link: existing };
    }

    // Build the tagged outbound URL
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

    // Attempt Supabase insert if table exists
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('affiliate_links')
          .insert({
            affiliate_id: user.id,
            product_id: input.productId?.includes('-') && input.productId.length === 36 ? input.productId : null,
            external_product_id: input.externalProductId?.includes('-') && input.externalProductId.length === 36 ? input.externalProductId : null,
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

        if (!error && data) {
          newLink.id = data.id;
        }
      } catch {
        // Fall back to local state
      }
    }

    const updated = [newLink, ...affiliateLinks];
    saveLinksLocally(updated);
    return { success: true, link: newLink };
  };

  // Copy link with full tracking URL
  const copyLinkToClipboard = async (link: AffiliateLink): Promise<boolean> => {
    // Generate clean link e.g. https://domain.com/?cb_trk=... or targetUrl
    const shareableUrl = `${window.location.origin}/?cb_trk=${encodeURIComponent(link.uniqueTrackingSlug)}`;
    try {
      await navigator.clipboard.writeText(shareableUrl);
      return true;
    } catch {
      // Fallback
      return false;
    }
  };

  // METHOD B: Add My Own External Affiliate Product
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
      isAdminProduct: Boolean(input.isAdminProduct),
      status: input.status || 'published',
      clicksCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Try Supabase insert
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

        if (!error && data) {
          newProd.id = data.id;
        }
      } catch (err) {
        console.warn('Supabase insert note:', err);
      }
    }

    const updated = [newProd, ...externalProducts];
    saveExtProductsLocally(updated);
    return { success: true, product: newProd };
  };

  // Edit external product (with ownership validation)
  const updateExternalProduct = async (
    id: string,
    updates: Partial<ExternalAffiliateProduct>
  ): Promise<{ success: boolean; error?: string }> => {
    const target = externalProducts.find((p) => p.id === id);
    if (!target) return { success: false, error: 'Product not found' };

    const isOwner = user && target.affiliateId === user.id;
    const isSuperAdminUser = user && user.email?.toLowerCase().trim() === 'gnetam108@gmail.com';
    if (!isOwner && !isSuperAdminUser) {
      return { success: false, error: 'Unauthorized: You can only edit your own external affiliate products.' };
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

        await supabase.from('affiliate_products').update(dbUpdates).eq('id', id);
      } catch {}
    }

    const updated = externalProducts.map((p) =>
      p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
    );
    saveExtProductsLocally(updated);
    return { success: true };
  };

  // Delete external product (with ownership validation)
  const deleteExternalProduct = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const target = externalProducts.find((p) => p.id === id);
    if (!target) return { success: false, error: 'Product not found' };

    const isOwner = user && target.affiliateId === user.id;
    const isSuperAdminUser = user && user.email?.toLowerCase().trim() === 'gnetam108@gmail.com';
    if (!isOwner && !isSuperAdminUser) {
      return { success: false, error: 'Unauthorized: You can only delete your own external affiliate products.' };
    }

    if (supabase) {
      try {
        await supabase.from('affiliate_products').delete().eq('id', id);
      } catch {}
    }

    const updated = externalProducts.filter((p) => p.id !== id);
    saveExtProductsLocally(updated);
    return { success: true };
  };

  // SECURE OUTBOUND CLICK TRACKING & REDIRECT
  const recordOutboundClick = async (
    trackingSlugOrId: string,
    destinationUrl: string,
    networkName: string,
    productId?: string,
    externalProductId?: string
  ): Promise<string> => {
    const { isValid, sanitizedUrl } = validateSafeUrl(destinationUrl);
    const finalUrl = isValid && sanitizedUrl ? sanitizedUrl : destinationUrl;

    const clickRecord: AffiliateClick = {
      id: `clk-${Date.now()}`,
      trackingId: trackingSlugOrId,
      affiliateId: user?.id,
      productId,
      externalProductId,
      networkName,
      destinationUrl: finalUrl,
      referrer: typeof document !== 'undefined' ? document.referrer : '',
      createdAt: new Date().toISOString()
    };

    // Update clicks in local state
    const updatedClicks = [clickRecord, ...recentClicks.slice(0, 99)];
    saveClicksLocally(updatedClicks);

    // Update link click counter if matched
    const updatedLinks = affiliateLinks.map((l) =>
      l.uniqueTrackingSlug === trackingSlugOrId || l.id === trackingSlugOrId
        ? { ...l, clicksCount: (l.clicksCount || 0) + 1 }
        : l
    );
    saveLinksLocally(updatedLinks);

    // Also update external product counter if matched
    if (externalProductId) {
      const updatedExt = externalProducts.map((p) =>
        p.id === externalProductId ? { ...p, clicksCount: (p.clicksCount || 0) + 1 } : p
      );
      saveExtProductsLocally(updatedExt);
    }

    // Attempt Supabase insert
    if (supabase) {
      try {
        await supabase.from('affiliate_clicks').insert({
          tracking_id: trackingSlugOrId,
          affiliate_id: user?.id || null,
          product_id: productId && productId.length === 36 ? productId : null,
          external_product_id: externalProductId && externalProductId.length === 36 ? externalProductId : null,
          network_name: networkName,
          destination_url: finalUrl,
          referrer: clickRecord.referrer
        });

        // Increment count on affiliate_links if table exists
        try {
          await supabase.rpc('increment_affiliate_click', { p_slug: trackingSlugOrId });
        } catch {
          // Ignore if RPC not installed
        }
      } catch {
        // Safe fallback
      }
    }

    return finalUrl;
  };

  // Manual sale confirmation (Seller confirms sale)
  const addManualSaleRecord = async (
    record: Omit<CommissionRecord, 'id' | 'createdAt'>
  ): Promise<{ success: boolean; error?: string }> => {
    const newRecord: CommissionRecord = {
      ...record,
      id: `comm-${Date.now()}`,
      createdAt: new Date().toISOString()
    };

    if (supabase) {
      try {
        await supabase.from('commission_records').insert({
          affiliate_id: record.affiliateId,
          product_id: record.productId,
          order_reference: record.orderReference,
          sale_amount: record.saleAmount,
          commission_amount: record.commissionAmount,
          network_name: record.networkName,
          verification_source: record.verificationSource,
          status: record.status,
          notes: record.notes
        });
      } catch {}
    }

    const updated = [newRecord, ...commissionRecords];
    saveCommissionsLocally(updated);
    return { success: true };
  };

  // Metrics
  const totalOutboundClicks = recentClicks.length;
  const verifiedSalesCount = commissionRecords.filter((c) => c.status === 'verified' || c.status === 'paid').length;
  const totalConfirmedCommission = commissionRecords
    .filter((c) => c.status === 'verified' || c.status === 'paid')
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
        totalOutboundClicks,
        recentClicks,
        commissionRecords,
        verifiedSalesCount,
        totalConfirmedCommission,
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
