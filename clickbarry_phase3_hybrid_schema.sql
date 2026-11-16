-- ==============================================================================
-- CLICKBARRY: PHASE 3 – HYBRID AFFILIATE LINK MANAGEMENT SYSTEM MIGRATION
-- File: clickbarry_phase3_hybrid_schema.sql
-- Description: Creates affiliate_products, affiliate_links, affiliate_clicks,
--              external_networks, and commission_records with RLS policies & indexes.
-- ==============================================================================

-- 1. EXTERNAL NETWORKS TABLE (Catalog of supported affiliate networks)
CREATE TABLE IF NOT EXISTS public.external_networks (
  id TEXT PRIMARY KEY, -- e.g. 'amazon', 'clickbank', 'digistore24', 'other'
  name TEXT NOT NULL,
  logo_url TEXT,
  subid_param TEXT, -- e.g. 'tag' for Amazon, 'tid' for ClickBank
  requires_external_reporting BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed predefined networks
INSERT INTO public.external_networks (id, name, subid_param, requires_external_reporting, description)
VALUES 
  ('amazon', 'Amazon Associates', 'tag', true, 'Amazon Associates Affiliate Network. Sales tracked in Amazon Associates Central.'),
  ('clickbank', 'ClickBank', 'tid', true, 'ClickBank Marketplace. SubID tracking enabled via TID parameter.'),
  ('digistore24', 'Digistore24', 'aff', true, 'Digistore24 Affiliate Network. Real-time affiliate cookie tracking.'),
  ('other', 'Other Networks / Direct Merchant', 'ref', true, 'Custom affiliate networks, SaaS partner programs, and direct creator referral links.')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  subid_param = EXCLUDED.subid_param;

-- 2. MY EXTERNAL AFFILIATE PRODUCTS (METHOD B & ADMIN PRODUCTS)
-- Managed directly by affiliates or admin
CREATE TABLE IF NOT EXISTS public.affiliate_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  network_name TEXT NOT NULL DEFAULT 'Other Networks',
  network_id TEXT REFERENCES public.external_networks(id) DEFAULT 'other',
  affiliate_product_url TEXT NOT NULL,
  commission_rate NUMERIC DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'templates',
  is_admin_product BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'published', -- 'published' | 'draft' | 'archived'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. AFFILIATE LINKS (METHOD A: MARKETPLACE PRODUCT TRACKING LINKS)
-- Links generated when an affiliate clicks "Promote Product" on any Marketplace item
CREATE TABLE IF NOT EXISTS public.affiliate_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  external_product_id UUID REFERENCES public.affiliate_products(id) ON DELETE CASCADE,
  unique_tracking_slug TEXT UNIQUE NOT NULL, -- e.g. cb_aff_66ffdf_prod_123
  custom_subid TEXT, -- affiliate custom sub-id e.g. yt_video_1
  target_url TEXT NOT NULL, -- final outbound URL with affiliate tracking parameters
  product_title TEXT NOT NULL,
  product_price NUMERIC DEFAULT 0,
  commission_rate NUMERIC DEFAULT 40,
  network_name TEXT DEFAULT 'ClickBarry Marketplace',
  clicks_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_one_product_reference CHECK (
    (product_id IS NOT NULL AND external_product_id IS NULL) OR
    (product_id IS NULL AND external_product_id IS NOT NULL) OR
    (product_id IS NULL AND external_product_id IS NULL)
  )
);

-- 4. AFFILIATE CLICKS (DETAILED AUDIT LOG OF OUTBOUND CLICKS)
CREATE TABLE IF NOT EXISTS public.affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id TEXT NOT NULL, -- tracking slug or link ID
  affiliate_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  external_product_id UUID REFERENCES public.affiliate_products(id) ON DELETE SET NULL,
  network_name TEXT NOT NULL DEFAULT 'ClickBarry Marketplace',
  destination_url TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. COMMISSION & VERIFIED SALES RECORDS
CREATE TABLE IF NOT EXISTS public.commission_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  external_product_id UUID REFERENCES public.affiliate_products(id) ON DELETE SET NULL,
  order_reference TEXT,
  sale_amount NUMERIC NOT NULL DEFAULT 0,
  commission_amount NUMERIC NOT NULL DEFAULT 0,
  network_name TEXT NOT NULL DEFAULT 'ClickBarry Marketplace',
  verification_source TEXT NOT NULL DEFAULT 'seller_confirmed', -- 'seller_confirmed' | 'network_api' | 'manual_admin'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'verified' | 'paid' | 'disputed'
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_aff_prod_affiliate ON public.affiliate_products(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_aff_prod_status ON public.affiliate_products(status);
CREATE INDEX IF NOT EXISTS idx_aff_links_affiliate ON public.affiliate_links(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_aff_links_slug ON public.affiliate_links(unique_tracking_slug);
CREATE INDEX IF NOT EXISTS idx_aff_clicks_affiliate ON public.affiliate_clicks(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_aff_clicks_slug ON public.affiliate_clicks(tracking_id);
CREATE INDEX IF NOT EXISTS idx_commissions_affiliate ON public.commission_records(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON public.commission_records(status);

-- 7. ROW LEVEL SECURITY (RLS) POLICIES

-- Enable RLS on all tables
ALTER TABLE public.external_networks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_records ENABLE ROW LEVEL SECURITY;

-- external_networks: Public can read, authenticated can read
DROP POLICY IF EXISTS "Public read external networks" ON public.external_networks;
CREATE POLICY "Public read external networks" ON public.external_networks
FOR SELECT USING (true);

-- affiliate_products:
-- Anyone can view published products
DROP POLICY IF EXISTS "Public view published affiliate products" ON public.affiliate_products;
CREATE POLICY "Public view published affiliate products" ON public.affiliate_products
FOR SELECT USING (status = 'published');

-- Affiliates can manage (insert, update, delete) their own external affiliate products
DROP POLICY IF EXISTS "Affiliates manage own products" ON public.affiliate_products;
CREATE POLICY "Affiliates manage own products" ON public.affiliate_products
FOR ALL USING (auth.uid() = affiliate_id)
WITH CHECK (auth.uid() = affiliate_id);

-- affiliate_links:
-- Affiliates can view, create and manage their own generated tracking links
DROP POLICY IF EXISTS "Affiliates manage own tracking links" ON public.affiliate_links;
CREATE POLICY "Affiliates manage own tracking links" ON public.affiliate_links
FOR ALL USING (auth.uid() = affiliate_id)
WITH CHECK (auth.uid() = affiliate_id);

-- Anyone can look up a tracking link by slug to perform the redirect
DROP POLICY IF EXISTS "Public lookup tracking slug" ON public.affiliate_links;
CREATE POLICY "Public lookup tracking slug" ON public.affiliate_links
FOR SELECT USING (true);

-- affiliate_clicks:
-- Public can log click events via redirect service
DROP POLICY IF EXISTS "Public insert affiliate click" ON public.affiliate_clicks;
CREATE POLICY "Public insert affiliate click" ON public.affiliate_clicks
FOR INSERT WITH CHECK (true);

-- Affiliates can view clicks recorded for their links
DROP POLICY IF EXISTS "Affiliates view own link clicks" ON public.affiliate_clicks;
CREATE POLICY "Affiliates view own link clicks" ON public.affiliate_clicks
FOR SELECT USING (auth.uid() = affiliate_id);

-- commission_records:
-- Affiliates can view their own commission & verified sales records
DROP POLICY IF EXISTS "Affiliates view own commissions" ON public.commission_records;
CREATE POLICY "Affiliates view own commissions" ON public.commission_records
FOR SELECT USING (auth.uid() = affiliate_id);

-- Sellers can create manual sale confirmation records for their products
DROP POLICY IF EXISTS "Sellers insert commission records" ON public.commission_records;
CREATE POLICY "Sellers insert commission records" ON public.commission_records
FOR INSERT WITH CHECK (true);
