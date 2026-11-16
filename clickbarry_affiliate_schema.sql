-- ==============================================================================
-- CLICKBARRY: MULTI-AFFILIATE PRODUCT DISCOVERY MARKETPLACE MIGRATION
-- File: clickbarry_affiliate_schema.sql
-- Description: Non-destructive migration to add affiliate fields, tracking, and RLS
-- ==============================================================================

-- 1. ADD AFFILIATE MARKETER FIELDS TO PRODUCTS TABLE
-- Safely add new columns if they do not exist already
ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS merchant_name TEXT,
  ADD COLUMN IF NOT EXISTS affiliate_url TEXT,
  ADD COLUMN IF NOT EXISTS commission_rate NUMERIC DEFAULT 40,
  ADD COLUMN IF NOT EXISTS merchant_website TEXT,
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'approved';

-- Ensure original_url remains populated for backwards compatibility
COMMENT ON COLUMN public.products.affiliate_url IS 'Affiliate tracking link provided by the affiliate marketer';
COMMENT ON COLUMN public.products.merchant_name IS 'Brand or marketplace name (e.g., Notion, Gumroad, Amazon, Coursera, Webflow)';
COMMENT ON COLUMN public.products.commission_rate IS 'Estimated affiliate commission percentage';

-- 2. ENHANCE PRODUCT EVENTS FOR AFFILIATE TRACKING
ALTER TABLE public.product_events
  ADD COLUMN IF NOT EXISTS affiliate_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS destination_url TEXT;

-- 3. REFRESH INDEXES FOR SPEED
CREATE INDEX IF NOT EXISTS idx_products_merchant_name ON public.products(merchant_name);
CREATE INDEX IF NOT EXISTS idx_products_approval_status ON public.products(approval_status);
CREATE INDEX IF NOT EXISTS idx_product_events_affiliate_id ON public.product_events(affiliate_id);

-- 4. VERIFY / UPDATE RLS POLICIES FOR PUBLIC DISCOVERY & AFFILIATES
-- Public can read all published & approved affiliate products
DROP POLICY IF EXISTS "Public can view published products" ON public.products;
CREATE POLICY "Public can view published products"
ON public.products
FOR SELECT
USING (
  status = 'published' 
  AND (approval_status IS NULL OR approval_status = 'approved')
);

-- Affiliate marketers can view, create, edit, and delete their own submitted products
DROP POLICY IF EXISTS "Sellers can manage their own products" ON public.products;
CREATE POLICY "Sellers can manage their own products"
ON public.products
FOR ALL
USING (auth.uid() = seller_id)
WITH CHECK (auth.uid() = seller_id);

-- Anyone can insert view and affiliate click events
DROP POLICY IF EXISTS "Public can insert product events" ON public.product_events;
CREATE POLICY "Public can insert product events"
ON public.product_events
FOR INSERT
WITH CHECK (true);

-- Affiliate marketers can read click and view events for their submitted products
DROP POLICY IF EXISTS "Sellers can read events for their products" ON public.product_events;
CREATE POLICY "Sellers can read events for their products"
ON public.product_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_events.product_id
    AND p.seller_id = auth.uid()
  )
);

-- Completed: clickbarry_affiliate_schema.sql
