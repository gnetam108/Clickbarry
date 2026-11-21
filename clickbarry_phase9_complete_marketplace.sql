-- ==============================================================================
-- CLICKBARRY PHASE 9: COMPLETE CLICKBANK-STYLE AFFILIATE MARKETPLACE MIGRATION
-- Safe, idempotent additive SQL migration for Supabase Project: xhkverrkjhfqrvqraafb
-- Run in Supabase SQL Editor. Preserves all Phases 5, 6, 8 data & columns.
-- ==============================================================================

-- 1. PROFILES: Support full Seller Membership statuses & Referral attribution
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS membership_activated_at TIMESTAMPTZ;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_subscription_status_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_subscription_status_check
  CHECK (subscription_status IN ('none', 'active', 'pending', 'failed', 'refunded', 'expired'));

-- Backfill unique referral codes for existing users
UPDATE public.profiles
SET referral_code = 'CB' || UPPER(SUBSTRING(REPLACE(id::text, '-', ''), 1, 8))
WHERE referral_code IS NULL OR referral_code = '';

-- Protect against self-referral at DB constraint level
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_no_self_referral_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_no_self_referral_check CHECK (referred_by IS NULL OR referred_by <> id);

-- Update handle_new_user() to assign deterministic referral_code and NEVER auto-escalate admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  req_role TEXT;
  safe_role TEXT;
  gen_ref_code TEXT;
BEGIN
  req_role := COALESCE(LOWER(TRIM(NEW.raw_user_meta_data->>'role')), 'affiliate');
  IF LOWER(TRIM(NEW.email)) = 'gnetam108@gmail.com' THEN
    safe_role := 'admin';
  ELSIF req_role = 'seller' THEN
    safe_role := 'seller';
  ELSE
    safe_role := 'affiliate';
  END IF;

  gen_ref_code := 'CB' || UPPER(SUBSTRING(REPLACE(NEW.id::text, '-', ''), 1, 8));

  INSERT INTO public.profiles (id, email, full_name, role, status, subscription_status, referral_code)
  VALUES (
    NEW.id,
    LOWER(TRIM(NEW.email)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
    safe_role,
    'active',
    'none',
    gen_ref_code
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    referral_code = COALESCE(public.profiles.referral_code, EXCLUDED.referral_code);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Allow authenticated users to read basic referrer lookup by referral_code safely via RPC
CREATE OR REPLACE FUNCTION public.bind_user_referral(p_referral_code TEXT)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_existing_ref UUID;
  v_referrer_id UUID;
  v_user_role TEXT;
  v_ref_type TEXT;
  v_new_referral_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  SELECT referred_by, role INTO v_existing_ref, v_user_role
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_existing_ref IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Referral already linked');
  END IF;

  SELECT id INTO v_referrer_id
  FROM public.profiles
  WHERE UPPER(referral_code) = UPPER(TRIM(p_referral_code))
  LIMIT 1;

  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid referral code');
  END IF;

  IF v_referrer_id = v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Self-referral is not allowed');
  END IF;

  v_ref_type := CASE WHEN v_user_role = 'seller' THEN 'seller' ELSE 'affiliate' END;

  UPDATE public.profiles
  SET referred_by = v_referrer_id
  WHERE id = v_user_id AND referred_by IS NULL;

  INSERT INTO public.referrals (referrer_id, referred_user_id, referral_code_used, referral_type, status)
  VALUES (v_referrer_id, v_user_id, UPPER(TRIM(p_referral_code)), v_ref_type, 'active')
  ON CONFLICT (referred_user_id) DO NOTHING
  RETURNING id INTO v_new_referral_id;

  RETURN jsonb_build_object('success', true, 'referrer_id', v_referrer_id, 'referral_id', v_new_referral_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. WEBSITE SETTINGS & PAYOUT SETTINGS: Phase 9 Fee, Commission & Referral Parameters
ALTER TABLE public.website_settings
  ADD COLUMN IF NOT EXISTS withdrawal_fee_percentage NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  ADD COLUMN IF NOT EXISTS affiliate_commission_min NUMERIC(5,2) NOT NULL DEFAULT 30.00,
  ADD COLUMN IF NOT EXISTS affiliate_commission_max NUMERIC(5,2) NOT NULL DEFAULT 100.00,
  ADD COLUMN IF NOT EXISTS referral_commission_percentage NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  ADD COLUMN IF NOT EXISTS seller_referral_bonus NUMERIC(12,2) NOT NULL DEFAULT 100.00,
  ADD COLUMN IF NOT EXISTS referral_revenue_basis TEXT NOT NULL DEFAULT 'platform_revenue';

UPDATE public.website_settings
SET
  platform_fee_percentage = CASE WHEN COALESCE(platform_fee_percentage, 0) = 0 THEN 15.00 ELSE platform_fee_percentage END,
  withdrawal_fee_percentage = COALESCE(withdrawal_fee_percentage, 5.00),
  affiliate_commission_min = COALESCE(affiliate_commission_min, 30.00),
  affiliate_commission_max = COALESCE(affiliate_commission_max, 100.00),
  referral_commission_percentage = COALESCE(referral_commission_percentage, 10.00),
  seller_referral_bonus = COALESCE(seller_referral_bonus, 100.00),
  referral_revenue_basis = COALESCE(referral_revenue_basis, 'platform_revenue')
WHERE id = 'clickbarry_main';

ALTER TABLE public.payout_settings
  ADD COLUMN IF NOT EXISTS withdrawal_fee_percentage NUMERIC(5,2) NOT NULL DEFAULT 5.00;

UPDATE public.payout_settings
SET withdrawal_fee_percentage = 5.00
WHERE withdrawal_fee_percentage IS NULL OR withdrawal_fee_percentage = 0;

-- 3. PRODUCTS: Auth-Gated Marketplace, Active Seller Membership Lock, 30-100% Range & Fee Net Earnings Guard
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_commission_rate_range_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_commission_rate_range_check
  CHECK (commission_rate >= 30 AND commission_rate <= 100);

CREATE OR REPLACE FUNCTION public.validate_product_submission_rules()
RETURNS TRIGGER AS $$
DECLARE
  v_platform_fee_pct NUMERIC := 15.00;
  v_max_allowed NUMERIC;
BEGIN
  SELECT COALESCE(platform_fee_percentage, 15.00)
  INTO v_platform_fee_pct
  FROM public.website_settings
  WHERE id = 'clickbarry_main'
  LIMIT 1;

  v_max_allowed := 100.00 - COALESCE(v_platform_fee_pct, 15.00);

  IF NEW.commission_rate < 30 OR NEW.commission_rate > 100 THEN
    RAISE EXCEPTION 'Affiliate commission rate must be between 30%% and 100%%.';
  END IF;

  IF NEW.commission_rate > v_max_allowed THEN
    RAISE EXCEPTION 'Commission rate (% %%) exceeds Seller maximum allowed (% %%) after %% platform fee because it leaves negative Seller net earnings.',
      NEW.commission_rate, v_max_allowed, v_platform_fee_pct;
  END IF;

  IF NEW.price IS NULL OR NEW.price <= 0 THEN
    RAISE EXCEPTION 'Product price must be greater than zero.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_product_submission ON public.products;
CREATE TRIGGER trg_validate_product_submission
  BEFORE INSERT OR UPDATE OF commission_rate, price ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.validate_product_submission_rules();

-- Enforce Authenticated Marketplace SELECT & Active Lifetime Seller Membership INSERT
DROP POLICY IF EXISTS "Marketplace approved products only" ON public.products;
CREATE POLICY "Marketplace authenticated approved products only" ON public.products
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      (status = 'published' AND approval_status = 'approved')
      OR auth.uid() = seller_id
      OR public.is_admin()
    )
  );

DROP POLICY IF EXISTS "Sellers insert own pending products" ON public.products;
CREATE POLICY "Verified sellers insert pending products" ON public.products
  FOR INSERT WITH CHECK (
    public.is_admin() OR (
      auth.uid() = seller_id
      AND approval_status = 'pending'
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.status = 'active'
          AND p.role IN ('seller', 'admin')
          AND p.subscription_status = 'active'
      )
    )
  );

-- 4. SELLER MEMBERSHIP PAYMENTS: Support Refunded Status & Gateway Tracking
ALTER TABLE public.seller_membership_payments
  ADD COLUMN IF NOT EXISTS gateway_order_id TEXT,
  ADD COLUMN IF NOT EXISTS gateway_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

ALTER TABLE public.seller_membership_payments DROP CONSTRAINT IF EXISTS seller_membership_payments_status_check;
ALTER TABLE public.seller_membership_payments
  ADD CONSTRAINT seller_membership_payments_status_check
  CHECK (status IN ('pending', 'success', 'failed', 'cancelled', 'refunded'));

-- 5. COMMISSION RECORDS & WITHDRAWAL REQUESTS: Align Statuses & 5% Platform Withdrawal Fee
ALTER TABLE public.commission_records DROP CONSTRAINT IF EXISTS commission_records_status_check;
ALTER TABLE public.commission_records
  ADD CONSTRAINT commission_records_status_check
  CHECK (status IN ('pending', 'verified', 'paid', 'disputed', 'rejected'));

ALTER TABLE public.withdrawal_requests
  ADD COLUMN IF NOT EXISTS platform_fee_pct NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  ADD COLUMN IF NOT EXISTS platform_fee_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS net_payable_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00;

-- Backfill fee breakdown for any existing withdrawal requests
UPDATE public.withdrawal_requests
SET
  platform_fee_pct = COALESCE(NULLIF(platform_fee_pct, 0), 5.00),
  platform_fee_amount = ROUND(amount * (COALESCE(NULLIF(platform_fee_pct, 0), 5.00) / 100.0), 2),
  net_payable_amount = ROUND(amount - (amount * (COALESCE(NULLIF(platform_fee_pct, 0), 5.00) / 100.0)), 2)
WHERE net_payable_amount = 0 AND amount > 0;

-- 6. NEW PHASE 9 CORE MARKETPLACE & MONETIZATION TABLES

-- A. VERIFIED SALES LEDGER
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  affiliate_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tracking_slug TEXT,
  order_reference TEXT NOT NULL UNIQUE,
  buyer_email TEXT,
  sale_amount NUMERIC(12,2) NOT NULL CHECK (sale_amount > 0),
  affiliate_commission_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  affiliate_commission_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  platform_fee_pct NUMERIC(5,2) NOT NULL DEFAULT 15.00,
  platform_fee_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  seller_net_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (seller_net_amount >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'refunded', 'disputed')),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- B. PLATFORM FEES LEDGER (15% Seller Sales + 5% Affiliate Withdrawal Fees)
CREATE TABLE IF NOT EXISTS public.platform_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL CHECK (source_type IN ('seller_sale_fee', 'affiliate_withdrawal_fee')),
  reference_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  gross_amount NUMERIC(12,2) NOT NULL,
  fee_percentage NUMERIC(5,2) NOT NULL,
  fee_amount NUMERIC(12,2) NOT NULL,
  net_amount NUMERIC(12,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- C. REFERRALS (User-to-User Attribution, Anti-Self & Anti-Duplicate)
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_code_used TEXT NOT NULL,
  referral_type TEXT NOT NULL CHECK (referral_type IN ('affiliate', 'seller')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (referrer_id <> referred_user_id)
);

-- D. REFERRAL COMMISSIONS (10% Lifetime Commission & ₹100 Active Seller Bonus)
CREATE TABLE IF NOT EXISTS public.referral_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_id UUID REFERENCES public.referrals(id) ON DELETE SET NULL,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('one_time_bonus', 'lifetime_commission')),
  source_transaction_id TEXT,
  base_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  reward_amount NUMERIC(12,2) NOT NULL CHECK (reward_amount >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'reversed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (referrer_id <> referred_user_id)
);

-- Guarantee one-time Seller referral bonus cannot be issued twice for same referred user
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_seller_one_time_bonus
  ON public.referral_commissions (referred_user_id, reward_type)
  WHERE reward_type = 'one_time_bonus';

-- E. PRODUCT REPORTS (Abuse / Broken Link / Fraud Moderation)
CREATE TABLE IF NOT EXISTS public.product_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')),
  admin_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- F. CLICK FRAUD DEDUP SUPPORT ON AFFILIATE CLICKS
ALTER TABLE public.affiliate_clicks
  ADD COLUMN IF NOT EXISTS fingerprint_hash TEXT;

-- 7. INDEXES FOR FAST QUERIES
CREATE INDEX IF NOT EXISTS idx_sales_seller ON public.sales(seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_affiliate ON public.sales(affiliate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_fees_source ON public.platform_fees(source_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referral_comms_referrer ON public.referral_commissions(referrer_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_reports_status ON public.product_reports(status, created_at DESC);

-- 8. ROW LEVEL SECURITY POLICIES FOR NEW TABLES
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reports ENABLE ROW LEVEL SECURITY;

-- SALES RLS
DROP POLICY IF EXISTS "Sales read own or admin" ON public.sales;
CREATE POLICY "Sales read own or admin" ON public.sales
  FOR SELECT USING (
    auth.uid() = seller_id OR auth.uid() = affiliate_id OR public.is_admin()
  );

DROP POLICY IF EXISTS "Admin manages sales" ON public.sales;
CREATE POLICY "Admin manages sales" ON public.sales
  FOR ALL USING (public.is_admin());

-- PLATFORM FEES RLS
DROP POLICY IF EXISTS "Admin manages platform fees" ON public.platform_fees;
CREATE POLICY "Admin manages platform fees" ON public.platform_fees
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Users read own platform fee entries" ON public.platform_fees;
CREATE POLICY "Users read own platform fee entries" ON public.platform_fees
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert withdrawal fee record on own request" ON public.platform_fees;
CREATE POLICY "Users insert withdrawal fee record on own request" ON public.platform_fees
  FOR INSERT WITH CHECK (auth.uid() = user_id AND source_type = 'affiliate_withdrawal_fee');

-- REFERRALS RLS
DROP POLICY IF EXISTS "Referrer and referred read own referrals" ON public.referrals;
CREATE POLICY "Referrer and referred read own referrals" ON public.referrals
  FOR SELECT USING (
    auth.uid() = referrer_id OR auth.uid() = referred_user_id OR public.is_admin()
  );

DROP POLICY IF EXISTS "Admin manages referrals" ON public.referrals;
CREATE POLICY "Admin manages referrals" ON public.referrals
  FOR ALL USING (public.is_admin());

-- REFERRAL COMMISSIONS RLS
DROP POLICY IF EXISTS "Users read own referral commissions" ON public.referral_commissions;
CREATE POLICY "Users read own referral commissions" ON public.referral_commissions
  FOR SELECT USING (auth.uid() = referrer_id OR public.is_admin());

DROP POLICY IF EXISTS "Admin manages referral commissions" ON public.referral_commissions;
CREATE POLICY "Admin manages referral commissions" ON public.referral_commissions
  FOR ALL USING (public.is_admin());

-- PRODUCT REPORTS RLS
DROP POLICY IF EXISTS "Authenticated users submit product reports" ON public.product_reports;
CREATE POLICY "Authenticated users submit product reports" ON public.product_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Users read own reports or admin all" ON public.product_reports;
CREATE POLICY "Users read own reports or admin all" ON public.product_reports
  FOR SELECT USING (auth.uid() = reporter_id OR public.is_admin());

DROP POLICY IF EXISTS "Admin manages product reports" ON public.product_reports;
CREATE POLICY "Admin manages product reports" ON public.product_reports
  FOR UPDATE USING (public.is_admin());

-- 9. SERVER-SIDE SELLER REFERRAL ₹100 BONUS ACTIVATION HELPER (CALLED ON VERIFIED ACTIVE MEMBERSHIP)
CREATE OR REPLACE FUNCTION public.process_seller_referral_reward(p_seller_id UUID, p_payment_txnid TEXT)
RETURNS JSONB AS $$
DECLARE
  v_sub_status TEXT;
  v_ref RECORD;
  v_bonus NUMERIC := 100.00;
  v_reward_id UUID;
BEGIN
  SELECT subscription_status INTO v_sub_status FROM public.profiles WHERE id = p_seller_id;
  IF v_sub_status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Seller membership is not active');
  END IF;

  SELECT * INTO v_ref FROM public.referrals WHERE referred_user_id = p_seller_id AND status = 'active' LIMIT 1;
  IF v_ref.id IS NULL OR v_ref.referrer_id = p_seller_id THEN
    RETURN jsonb_build_object('success', false, 'reason', 'No eligible referrer found');
  END IF;

  SELECT COALESCE(seller_referral_bonus, 100.00) INTO v_bonus
  FROM public.website_settings WHERE id = 'clickbarry_main' LIMIT 1;

  INSERT INTO public.referral_commissions (
    referrer_id, referred_user_id, referral_id, reward_type,
    source_transaction_id, base_amount, commission_rate, reward_amount, status, notes
  )
  VALUES (
    v_ref.referrer_id, p_seller_id, v_ref.id, 'one_time_bonus',
    p_payment_txnid, 999.00, 0, v_bonus, 'approved',
    '₹' || v_bonus || ' Seller Lifetime Pass Referral Bonus (Verified Active Membership)'
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_reward_id;

  IF v_reward_id IS NOT NULL THEN
    INSERT INTO public.wallet_ledger (
      affiliate_id, entry_type, amount, balance_after, reference_type, reference_id, description
    ) VALUES (
      v_ref.referrer_id, 'commission_approved', v_bonus, v_bonus,
      'referral_bonus', p_payment_txnid,
      'Seller Referral Bonus credited for verified ₹999 Lifetime Pass activation'
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'reward_id', v_reward_id, 'bonus', v_bonus);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
