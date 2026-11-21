-- ==============================================================================
-- CLICKBARRY: COMPLETE REFERRAL SYSTEM MIGRATION (ADDITIVE, IDEMPOTENT & RAZORPAY-READY)
-- File: clickbarry_referral_system_migration.sql
-- Target Supabase Project: xhkverrkjhfqrvqraafb
--
-- Security & Architecture Guarantees:
-- 1. Zero PayU assumptions; Seller ₹999 Lifetime Pass prepared strictly for Razorpay
--    (razorpay_order_id, razorpay_payment_id, razorpay_signature, signature_verified,
--    'captured' payment status, and razorpay_transactions audit records).
-- 2. ₹100 Seller referral bonus is awarded ONLY after a verified Razorpay ₹999
--    'captured' payment (signature_verified = true) AND active membership confirmed
--    by a secure server-side function (verify_razorpay_seller_membership /
--    process_seller_referral_reward restricted to service_role).
-- 3. No trigger on profiles.subscription_status can award the ₹100 bonus.
-- 4. Hardened Admin authorization: public.is_admin() strictly verifies the explicitly
--    configured Admin account (gnetam108@gmail.com) in auth.users with confirmed email.
-- 5. Strictly additive & idempotent across all referenced tables (zero DROP/TRUNCATE,
--    zero overwrites of existing user, seller, affiliate, product, or payment data).
-- 6. Wallet-safe & deduplicated ledger accounting (positive wallet_ledger.amount,
--    synchronized affiliate_wallets balances, unique reference constraints).
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. HARDENED SUPER ADMIN AUTHORIZATION (gnetam108@gmail.com ONLY)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'super_admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'super_admin',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Only the explicitly configured Admin account (verified in auth.users) is Admin.
-- Never trusts mutable profiles.role, arbitrary admin_users rows, or unverified JWT claims.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid UUID;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = v_uid
      AND LOWER(TRIM(COALESCE(u.email, ''))) = 'gnetam108@gmail.com'
      AND u.email_confirmed_at IS NOT NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Only configured super admin reads admin_users" ON public.admin_users;
CREATE POLICY "Only configured super admin reads admin_users"
  ON public.admin_users
  FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Block client mutations on admin_users" ON public.admin_users;
CREATE POLICY "Block client mutations on admin_users"
  ON public.admin_users
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Ensure configured Super Admin is recorded in admin_users if already registered
DO $$
BEGIN
  INSERT INTO public.admin_users (id, email, role)
  SELECT u.id, LOWER(TRIM(u.email)), 'super_admin'
  FROM auth.users u
  WHERE LOWER(TRIM(COALESCE(u.email, ''))) = 'gnetam108@gmail.com'
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        role = 'super_admin';
EXCEPTION
  WHEN unique_violation THEN
    UPDATE public.admin_users
    SET role = 'super_admin'
    WHERE LOWER(TRIM(email)) = 'gnetam108@gmail.com';
END $$;

-- ------------------------------------------------------------------------------
-- 2. REMOVE LEGACY MANUAL-BONUS / PAYU TRIGGERS IF PRESENT
-- ------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_referral_on_profile_sub_change ON public.profiles;
DROP FUNCTION IF EXISTS public.trg_fn_profile_sub_referral();

-- Drop legacy PayU activation trigger if an older migration created it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'seller_membership_payments'
  ) THEN
    DROP TRIGGER IF EXISTS trg_activate_seller_membership ON public.seller_membership_payments;
  END IF;
END $$;
DROP FUNCTION IF EXISTS public.handle_successful_seller_payment();

-- ------------------------------------------------------------------------------
-- 3. ADDITIVE SCHEMA PROVISIONING FOR ALL REFERENCED TABLES (ZERO ASSUMPTIONS)
-- ------------------------------------------------------------------------------

-- A. PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'affiliate',
  status TEXT NOT NULL DEFAULT 'active',
  seller_verified BOOLEAN NOT NULL DEFAULT false,
  subscription_status TEXT NOT NULL DEFAULT 'none',
  subscription_price NUMERIC DEFAULT 999,
  membership_activated_at TIMESTAMPTZ,
  referral_code TEXT,
  referred_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'affiliate',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS seller_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS subscription_price NUMERIC DEFAULT 999,
  ADD COLUMN IF NOT EXISTS membership_activated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS referral_code TEXT,
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_referral_code_unique
  ON public.profiles (UPPER(referral_code))
  WHERE referral_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_referred_by
  ON public.profiles (referred_by)
  WHERE referred_by IS NOT NULL;

DO $$
BEGIN
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_no_self_referral_check;
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_no_self_referral_check
    CHECK (referred_by IS NULL OR referred_by <> id) NOT VALID;

  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_subscription_status_check;
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_subscription_status_check
    CHECK (subscription_status IN ('none', 'active', 'pending', 'failed', 'refunded', 'expired')) NOT VALID;

  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS chk_profiles_role_valid;
  ALTER TABLE public.profiles
    ADD CONSTRAINT chk_profiles_role_valid
    CHECK (role IN ('affiliate', 'seller', 'admin')) NOT VALID;

  BEGIN
    ALTER TABLE public.profiles VALIDATE CONSTRAINT profiles_no_self_referral_check;
    ALTER TABLE public.profiles VALIDATE CONSTRAINT profiles_subscription_status_check;
    ALTER TABLE public.profiles VALIDATE CONSTRAINT chk_profiles_role_valid;
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'Legacy profile rows exist outside strict check; constraints remain enforced for all new/updated rows.';
  END;
END $$;

-- Backfill unique referral_code ONLY for existing users missing one (never overwrites existing codes)
UPDATE public.profiles
SET referral_code = 'CB' || UPPER(SUBSTRING(REPLACE(id::text, '-', ''), 1, 8))
WHERE referral_code IS NULL OR TRIM(referral_code) = '';

-- B. WEBSITE SETTINGS
CREATE TABLE IF NOT EXISTS public.website_settings (
  id TEXT PRIMARY KEY DEFAULT 'clickbarry_main',
  site_name TEXT NOT NULL DEFAULT 'ClickBarry',
  tagline TEXT NOT NULL DEFAULT 'Multi-Affiliate & Creator Product Discovery Marketplace',
  logo_url TEXT DEFAULT '',
  favicon_url TEXT DEFAULT '',
  description TEXT NOT NULL DEFAULT 'Discover high-converting digital products, verified creator tools, and top-tier affiliate programs.',
  support_email TEXT NOT NULL DEFAULT 'support@clickbarry.com',
  contact_phone TEXT NOT NULL DEFAULT '+91 98765 43210',
  contact_address TEXT NOT NULL DEFAULT 'ClickBarry HQ, Bengaluru, Karnataka, India',
  currency TEXT NOT NULL DEFAULT 'INR',
  currency_symbol TEXT NOT NULL DEFAULT '₹',
  min_withdrawal_amount NUMERIC NOT NULL DEFAULT 500,
  max_withdrawal_amount NUMERIC NOT NULL DEFAULT 100000,
  withdrawal_fee_percentage NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  seller_subscription_price NUMERIC NOT NULL DEFAULT 999,
  platform_fee_percentage NUMERIC(5,2) NOT NULL DEFAULT 15.00,
  affiliate_commission_min NUMERIC(5,2) NOT NULL DEFAULT 30.00,
  affiliate_commission_max NUMERIC(5,2) NOT NULL DEFAULT 100.00,
  referral_commission_percentage NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  seller_referral_bonus NUMERIC(12,2) NOT NULL DEFAULT 100.00,
  referral_revenue_basis TEXT NOT NULL DEFAULT 'net_earnings',
  featured_product_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  banner_announcement TEXT DEFAULT 'Earn commissions promoting verified creator products or list once as a Seller!',
  is_registration_open BOOLEAN NOT NULL DEFAULT true,
  is_maintenance_mode BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.website_settings
  ADD COLUMN IF NOT EXISTS withdrawal_fee_percentage NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  ADD COLUMN IF NOT EXISTS seller_subscription_price NUMERIC NOT NULL DEFAULT 999,
  ADD COLUMN IF NOT EXISTS platform_fee_percentage NUMERIC(5,2) NOT NULL DEFAULT 15.00,
  ADD COLUMN IF NOT EXISTS affiliate_commission_min NUMERIC(5,2) NOT NULL DEFAULT 30.00,
  ADD COLUMN IF NOT EXISTS affiliate_commission_max NUMERIC(5,2) NOT NULL DEFAULT 100.00,
  ADD COLUMN IF NOT EXISTS referral_commission_percentage NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  ADD COLUMN IF NOT EXISTS seller_referral_bonus NUMERIC(12,2) NOT NULL DEFAULT 100.00,
  ADD COLUMN IF NOT EXISTS referral_revenue_basis TEXT NOT NULL DEFAULT 'net_earnings',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

INSERT INTO public.website_settings (
  id, referral_commission_percentage, seller_referral_bonus, referral_revenue_basis,
  platform_fee_percentage, withdrawal_fee_percentage
)
VALUES ('clickbarry_main', 10.00, 100.00, 'net_earnings', 15.00, 5.00)
ON CONFLICT (id) DO UPDATE SET
  referral_commission_percentage = COALESCE(public.website_settings.referral_commission_percentage, 10.00),
  seller_referral_bonus = COALESCE(public.website_settings.seller_referral_bonus, 100.00),
  withdrawal_fee_percentage = COALESCE(public.website_settings.withdrawal_fee_percentage, 5.00),
  referral_revenue_basis = 'net_earnings';

-- C. ADMIN AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  details TEXT NOT NULL,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.admin_audit_logs
  ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS admin_email TEXT,
  ADD COLUMN IF NOT EXISTS action TEXT,
  ADD COLUMN IF NOT EXISTS target_type TEXT,
  ADD COLUMN IF NOT EXISTS target_id TEXT,
  ADD COLUMN IF NOT EXISTS details TEXT,
  ADD COLUMN IF NOT EXISTS ip_address TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can view audit logs"
  ON public.admin_audit_logs
  FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can insert audit logs"
  ON public.admin_audit_logs
  FOR INSERT
  WITH CHECK (public.is_admin());

-- D. PRODUCTS (ensure exists for FK compatibility without altering existing data)
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  image_url TEXT,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  description TEXT,
  category TEXT NOT NULL DEFAULT 'templates',
  original_url TEXT,
  commission_rate NUMERIC DEFAULT 40,
  status TEXT NOT NULL DEFAULT 'published',
  approval_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- E. AFFILIATE WALLETS & WALLET LEDGER
CREATE TABLE IF NOT EXISTS public.affiliate_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_approved_earnings NUMERIC NOT NULL DEFAULT 0,
  pending_commission NUMERIC NOT NULL DEFAULT 0,
  reserved_balance NUMERIC NOT NULL DEFAULT 0,
  available_balance NUMERIC GENERATED ALWAYS AS (GREATEST(0, total_approved_earnings - reserved_balance)) STORED,
  total_paid NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.affiliate_wallets
  ADD COLUMN IF NOT EXISTS total_approved_earnings NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pending_commission NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reserved_balance NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_paid NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.affiliate_wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Affiliates view own wallet" ON public.affiliate_wallets;
CREATE POLICY "Affiliates view own wallet"
  ON public.affiliate_wallets
  FOR SELECT
  USING (auth.uid() = affiliate_id OR public.is_admin());

CREATE TABLE IF NOT EXISTS public.wallet_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES public.affiliate_wallets(id) ON DELETE CASCADE,
  affiliate_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  balance_after NUMERIC NOT NULL DEFAULT 0,
  reference_type TEXT,
  reference_id TEXT,
  description TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.wallet_ledger
  ADD COLUMN IF NOT EXISTS wallet_id UUID REFERENCES public.affiliate_wallets(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS affiliate_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS entry_type TEXT,
  ADD COLUMN IF NOT EXISTS amount NUMERIC,
  ADD COLUMN IF NOT EXISTS balance_after NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reference_type TEXT,
  ADD COLUMN IF NOT EXISTS reference_id TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Safely update entry_type CHECK constraint to support 'commission_reversed' with positive amount
DO $$
DECLARE
  v_con RECORD;
BEGIN
  FOR v_con IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.wallet_ledger'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%entry_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.wallet_ledger DROP CONSTRAINT IF EXISTS %I', v_con.conname);
  END LOOP;

  ALTER TABLE public.wallet_ledger
    ADD CONSTRAINT wallet_ledger_entry_type_check
    CHECK (entry_type IN (
      'commission_approved',
      'commission_pending',
      'commission_reversed',
      'withdrawal_reserved',
      'withdrawal_released',
      'withdrawal_paid',
      'admin_adjustment'
    )) NOT VALID;

  BEGIN
    ALTER TABLE public.wallet_ledger VALIDATE CONSTRAINT wallet_ledger_entry_type_check;
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'Legacy wallet_ledger rows exist; new entry_type check enforced for all future inserts.';
  END;
END $$;

CREATE INDEX IF NOT EXISTS idx_wallet_ledger_affiliate ON public.wallet_ledger(affiliate_id, created_at DESC);

-- Prevent duplicate wallet_ledger credits/reversals for the same reference_type + reference_id + entry_type
DO $$
BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_ledger_unique_ref
    ON public.wallet_ledger (reference_type, reference_id, entry_type)
    WHERE reference_type IS NOT NULL AND reference_id IS NOT NULL;
EXCEPTION WHEN unique_violation THEN
  RAISE NOTICE 'Existing duplicate reference entries detected in wallet_ledger; deduplication index skipped to preserve existing data. Functions still enforce idempotent checks.';
END $$;

ALTER TABLE public.wallet_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Affiliates view own ledger" ON public.wallet_ledger;
CREATE POLICY "Affiliates view own ledger"
  ON public.wallet_ledger
  FOR SELECT
  USING (auth.uid() = affiliate_id OR public.is_admin());

DROP POLICY IF EXISTS "Users insert own withdrawal reservations" ON public.wallet_ledger;
CREATE POLICY "Users insert own withdrawal reservations"
  ON public.wallet_ledger
  FOR INSERT
  WITH CHECK (
    public.is_admin()
    OR (auth.uid() = affiliate_id AND entry_type = 'withdrawal_reserved')
  );

-- F. SELLER MEMBERSHIP PAYMENTS & RAZORPAY TRANSACTIONS (NO PAYU ASSUMPTIONS)
CREATE TABLE IF NOT EXISTS public.seller_membership_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_email TEXT NOT NULL,
  seller_name TEXT,
  payment_gateway TEXT NOT NULL DEFAULT 'razorpay',
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  signature_verified BOOLEAN NOT NULL DEFAULT false,
  amount NUMERIC(10,2) NOT NULL DEFAULT 999.00 CHECK (amount = 999.00),
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'created',
  gateway_method TEXT,
  bank_rrn TEXT,
  raw_gateway_response JSONB,
  verified_at TIMESTAMPTZ,
  verified_by TEXT,
  failure_reason TEXT,
  refund_id TEXT,
  membership_activated_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.seller_membership_payments
  ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS seller_email TEXT,
  ADD COLUMN IF NOT EXISTS seller_name TEXT,
  ADD COLUMN IF NOT EXISTS payment_gateway TEXT NOT NULL DEFAULT 'razorpay',
  ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_signature TEXT,
  ADD COLUMN IF NOT EXISTS signature_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS amount NUMERIC(10,2) NOT NULL DEFAULT 999.00,
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'created',
  ADD COLUMN IF NOT EXISTS gateway_method TEXT,
  ADD COLUMN IF NOT EXISTS bank_rrn TEXT,
  ADD COLUMN IF NOT EXISTS raw_gateway_response JSONB,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by TEXT,
  ADD COLUMN IF NOT EXISTS failure_reason TEXT,
  ADD COLUMN IF NOT EXISTS refund_id TEXT,
  ADD COLUMN IF NOT EXISTS membership_activated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- If an existing legacy table had a NOT NULL txnid column, relax NOT NULL without touching existing rows
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'seller_membership_payments'
      AND column_name = 'txnid'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.seller_membership_payments ALTER COLUMN txnid DROP NOT NULL;
  END IF;
END $$;

-- Enforce Razorpay status lifecycle on all new/updated rows without breaking any existing rows
DO $$
DECLARE
  v_con RECORD;
BEGIN
  FOR v_con IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.seller_membership_payments'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.seller_membership_payments DROP CONSTRAINT IF EXISTS %I', v_con.conname);
  END LOOP;

  ALTER TABLE public.seller_membership_payments
    ADD CONSTRAINT seller_membership_payments_status_check
    CHECK (status IN ('created', 'pending', 'authorized', 'captured', 'failed', 'cancelled', 'refunded')) NOT VALID;

  BEGIN
    ALTER TABLE public.seller_membership_payments VALIDATE CONSTRAINT seller_membership_payments_status_check;
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'Historical seller_membership_payments rows preserved; Razorpay status constraint enforced on all new/updated rows.';
  END;
END $$;

CREATE INDEX IF NOT EXISTS idx_seller_payments_seller ON public.seller_membership_payments(seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_seller_payments_status ON public.seller_membership_payments(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_seller_payments_rzp_order_unique
  ON public.seller_membership_payments (razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_seller_payments_rzp_payment_unique
  ON public.seller_membership_payments (razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.razorpay_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_payment_id UUID REFERENCES public.seller_membership_payments(id) ON DELETE SET NULL,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  razorpay_order_id TEXT NOT NULL,
  razorpay_payment_id TEXT,
  razorpay_refund_id TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'order_created',
    'payment_authorized',
    'payment_captured',
    'payment_failed',
    'payment_refunded',
    'webhook_verified'
  )),
  status TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  signature_verified BOOLEAN NOT NULL DEFAULT false,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rzp_tx_seller ON public.razorpay_transactions(seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rzp_tx_order ON public.razorpay_transactions(razorpay_order_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rzp_tx_unique_payment_event
  ON public.razorpay_transactions (razorpay_payment_id, event_type)
  WHERE razorpay_payment_id IS NOT NULL;

-- G. COMMISSION RECORDS & SALES (additive column checks)
CREATE TABLE IF NOT EXISTS public.commission_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  external_product_id UUID,
  order_reference TEXT,
  sale_amount NUMERIC NOT NULL DEFAULT 0,
  commission_amount NUMERIC NOT NULL DEFAULT 0,
  network_name TEXT NOT NULL DEFAULT 'ClickBarry Marketplace',
  verification_source TEXT NOT NULL DEFAULT 'seller_confirmed',
  status TEXT NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.commission_records
  ADD COLUMN IF NOT EXISTS affiliate_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS external_product_id UUID,
  ADD COLUMN IF NOT EXISTS order_reference TEXT,
  ADD COLUMN IF NOT EXISTS sale_amount NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_amount NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS network_name TEXT NOT NULL DEFAULT 'ClickBarry Marketplace',
  ADD COLUMN IF NOT EXISTS verification_source TEXT NOT NULL DEFAULT 'seller_confirmed',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  ALTER TABLE public.commission_records DROP CONSTRAINT IF EXISTS commission_records_status_check;
  ALTER TABLE public.commission_records
    ADD CONSTRAINT commission_records_status_check
    CHECK (status IN ('pending', 'verified', 'paid', 'disputed', 'rejected')) NOT VALID;
  BEGIN
    ALTER TABLE public.commission_records VALIDATE CONSTRAINT commission_records_status_check;
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'Historical commission_records rows preserved; status constraint enforced on new/updated rows.';
  END;
END $$;

ALTER TABLE public.commission_records ENABLE ROW LEVEL SECURITY;

-- Replace overly-permissive Phase 3 insert policy if present: non-admins can only insert 'pending' for own products
DROP POLICY IF EXISTS "Sellers insert commission records" ON public.commission_records;
DROP POLICY IF EXISTS "Admins or sellers insert commission records" ON public.commission_records;
CREATE POLICY "Admins or sellers insert pending commission records"
  ON public.commission_records
  FOR INSERT
  WITH CHECK (
    public.is_admin()
    OR (
      status = 'pending'
      AND EXISTS (
        SELECT 1 FROM public.products p
        WHERE p.id = commission_records.product_id
          AND p.seller_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Admins update commission records" ON public.commission_records;
CREATE POLICY "Admins update commission records"
  ON public.commission_records
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

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
  status TEXT NOT NULL DEFAULT 'pending',
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS affiliate_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tracking_slug TEXT,
  ADD COLUMN IF NOT EXISTS order_reference TEXT,
  ADD COLUMN IF NOT EXISTS buyer_email TEXT,
  ADD COLUMN IF NOT EXISTS sale_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS affiliate_commission_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS affiliate_commission_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS platform_fee_pct NUMERIC(5,2) NOT NULL DEFAULT 15.00,
  ADD COLUMN IF NOT EXISTS platform_fee_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seller_net_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_status_check;
  ALTER TABLE public.sales
    ADD CONSTRAINT sales_status_check
    CHECK (status IN ('pending', 'verified', 'refunded', 'disputed')) NOT VALID;
  BEGIN
    ALTER TABLE public.sales VALIDATE CONSTRAINT sales_status_check;
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'Historical sales rows preserved; status constraint enforced on new/updated rows.';
  END;
END $$;

-- ------------------------------------------------------------------------------
-- 4. REFERRALS, REFERRAL COMMISSIONS & REFERRAL FRAUD LOGS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_code_used TEXT NOT NULL,
  referral_type TEXT NOT NULL CHECK (referral_type IN ('affiliate', 'seller')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'blocked')),
  block_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (referrer_id <> referred_user_id)
);

ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS block_reason TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.referral_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_id UUID REFERENCES public.referrals(id) ON DELETE SET NULL,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('one_time_bonus', 'lifetime_commission')),
  source_type TEXT NOT NULL DEFAULT 'affiliate_net_earning'
    CHECK (source_type IN ('seller_pass', 'affiliate_net_earning', 'seller_net_earning', 'manual_adjustment')),
  source_transaction_id TEXT,
  gross_reference_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  deductions_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  base_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (base_amount >= 0),
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 10.00 CHECK (commission_rate >= 0 AND commission_rate <= 100),
  reward_amount NUMERIC(12,2) NOT NULL CHECK (reward_amount >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'reversed')),
  reversal_reason TEXT,
  reversed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (referrer_id <> referred_user_id)
);

ALTER TABLE public.referral_commissions
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'affiliate_net_earning',
  ADD COLUMN IF NOT EXISTS gross_reference_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deductions_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reversal_reason TEXT,
  ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Strict deduplication indexes on referral_commissions
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_seller_one_time_bonus
  ON public.referral_commissions (referred_user_id, reward_type)
  WHERE reward_type = 'one_time_bonus';

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_referral_source_tx
  ON public.referral_commissions (referred_user_id, reward_type, source_transaction_id)
  WHERE source_transaction_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.referral_fraud_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  referrer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  attempted_code TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'self_referral_blocked',
    'duplicate_referral_blocked',
    'immutable_referrer_tamper',
    'invalid_referral_code',
    'suspended_referrer_blocked',
    'commission_reversed',
    'referral_blocked_by_admin',
    'rapid_referral_anomaly',
    'unverified_payment_blocked'
  )),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  details TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Update fraud log event_type CHECK if table existed before 'unverified_payment_blocked'
DO $$
DECLARE
  v_con RECORD;
BEGIN
  FOR v_con IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.referral_fraud_logs'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%event_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.referral_fraud_logs DROP CONSTRAINT IF EXISTS %I', v_con.conname);
  END LOOP;

  ALTER TABLE public.referral_fraud_logs
    ADD CONSTRAINT referral_fraud_logs_event_type_check
    CHECK (event_type IN (
      'self_referral_blocked',
      'duplicate_referral_blocked',
      'immutable_referrer_tamper',
      'invalid_referral_code',
      'suspended_referrer_blocked',
      'commission_reversed',
      'referral_blocked_by_admin',
      'rapid_referral_anomaly',
      'unverified_payment_blocked'
    ));
END $$;

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON public.referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_comms_referrer ON public.referral_commissions(referrer_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referral_comms_source_tx ON public.referral_commissions(source_transaction_id);
CREATE INDEX IF NOT EXISTS idx_referral_fraud_created ON public.referral_fraud_logs(created_at DESC);

-- ------------------------------------------------------------------------------
-- 5. ATOMIC & IDEMPOTENT WALLET + LEDGER SYNC HELPER (INTERNAL ONLY)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_wallet_referral_entry(
  p_affiliate_id UUID,
  p_action TEXT, -- 'pending_credit' | 'pending_to_approved' | 'direct_approved' | 'reverse_pending' | 'reverse_approved'
  p_amount NUMERIC,
  p_reference_type TEXT,
  p_reference_id TEXT,
  p_description TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet RECORD;
  v_amt NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  v_amt := ROUND(GREATEST(0, COALESCE(p_amount, 0)), 2);
  IF p_affiliate_id IS NULL OR v_amt <= 0 THEN
    RETURN;
  END IF;

  INSERT INTO public.affiliate_wallets (affiliate_id)
  VALUES (p_affiliate_id)
  ON CONFLICT (affiliate_id) DO NOTHING;

  SELECT * INTO v_wallet
  FROM public.affiliate_wallets
  WHERE affiliate_id = p_affiliate_id
  FOR UPDATE;

  IF p_action = 'pending_credit' THEN
    UPDATE public.affiliate_wallets
    SET pending_commission = ROUND(COALESCE(pending_commission, 0) + v_amt, 2),
        updated_at = NOW()
    WHERE id = v_wallet.id;

  ELSIF p_action IN ('pending_to_approved', 'direct_approved') THEN
    -- Idempotent check: never double-credit the same ledger reference
    IF EXISTS (
      SELECT 1 FROM public.wallet_ledger
      WHERE reference_type = p_reference_type
        AND reference_id = p_reference_id
        AND entry_type = 'commission_approved'
    ) THEN
      RETURN;
    END IF;

    UPDATE public.affiliate_wallets
    SET pending_commission = CASE
          WHEN p_action = 'pending_to_approved'
            THEN ROUND(GREATEST(0, COALESCE(pending_commission, 0) - v_amt), 2)
          ELSE COALESCE(pending_commission, 0)
        END,
        total_approved_earnings = ROUND(COALESCE(total_approved_earnings, 0) + v_amt, 2),
        updated_at = NOW()
    WHERE id = v_wallet.id
    RETURNING GREATEST(0, total_approved_earnings - reserved_balance) INTO v_new_balance;

    INSERT INTO public.wallet_ledger (
      wallet_id, affiliate_id, entry_type, amount, balance_after,
      reference_type, reference_id, description
    ) VALUES (
      v_wallet.id, p_affiliate_id, 'commission_approved', v_amt, COALESCE(v_new_balance, v_amt),
      p_reference_type, p_reference_id, COALESCE(NULLIF(TRIM(p_description), ''), 'Referral commission credited')
    );

  ELSIF p_action = 'reverse_pending' THEN
    UPDATE public.affiliate_wallets
    SET pending_commission = ROUND(GREATEST(0, COALESCE(pending_commission, 0) - v_amt), 2),
        updated_at = NOW()
    WHERE id = v_wallet.id;

  ELSIF p_action = 'reverse_approved' THEN
    -- Idempotent check: never double-reverse the same ledger reference
    IF EXISTS (
      SELECT 1 FROM public.wallet_ledger
      WHERE reference_type = p_reference_type
        AND reference_id = p_reference_id
        AND entry_type = 'commission_reversed'
    ) THEN
      RETURN;
    END IF;

    UPDATE public.affiliate_wallets
    SET total_approved_earnings = ROUND(GREATEST(0, COALESCE(total_approved_earnings, 0) - v_amt), 2),
        updated_at = NOW()
    WHERE id = v_wallet.id
    RETURNING GREATEST(0, total_approved_earnings - reserved_balance) INTO v_new_balance;

    -- Always insert positive amount (> 0) using 'commission_reversed' entry_type so
    -- chk_ledger_amount_positive (amount > 0) and WalletContext math both remain valid.
    INSERT INTO public.wallet_ledger (
      wallet_id, affiliate_id, entry_type, amount, balance_after,
      reference_type, reference_id, description
    ) VALUES (
      v_wallet.id, p_affiliate_id, 'commission_reversed', v_amt, COALESCE(v_new_balance, 0),
      p_reference_type, p_reference_id, COALESCE(NULLIF(TRIM(p_description), ''), 'Referral commission reversed')
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_wallet_referral_entry(UUID, TEXT, NUMERIC, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_wallet_referral_entry(UUID, TEXT, NUMERIC, TEXT, TEXT, TEXT) TO service_role;

-- ------------------------------------------------------------------------------
-- 6. PROFILE PRIVILEGE GUARD & SIGNUP ATTRIBUTION (ZERO ESCALATION)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bypass TEXT;
  v_is_trusted BOOLEAN;
BEGIN
  v_bypass := current_setting('clickbarry.bypass_profile_guard', true);

  -- Trusted actors: direct DB superuser (SQL Editor), service_role, verified Super Admin, or internal SECURITY DEFINER bypass
  v_is_trusted := (
    session_user IN ('postgres', 'supabase_admin')
    OR COALESCE(auth.role(), '') = 'service_role'
    OR public.is_admin()
    OR v_bypass = 'on'
  );

  IF TG_OP = 'UPDATE' THEN
    -- Immutable referral_code once assigned
    IF OLD.referral_code IS NOT NULL AND TRIM(OLD.referral_code) <> '' THEN
      NEW.referral_code := OLD.referral_code;
    END IF;

    -- Immutable referred_by once linked (never overwritten unless trusted explicit repair)
    IF OLD.referred_by IS NOT NULL AND NEW.referred_by IS DISTINCT FROM OLD.referred_by THEN
      IF NOT v_is_trusted THEN
        INSERT INTO public.referral_fraud_logs (user_id, referrer_id, event_type, severity, details)
        VALUES (
          OLD.id,
          OLD.referred_by,
          'immutable_referrer_tamper',
          'high',
          'Blocked attempt to modify immutable referred_by on profile ' || OLD.id::text
        );
      END IF;
      NEW.referred_by := OLD.referred_by;
    END IF;

    -- Non-trusted client cannot assign referred_by directly (must use bind_user_referral RPC)
    IF OLD.referred_by IS NULL AND NEW.referred_by IS NOT NULL AND NOT v_is_trusted THEN
      NEW.referred_by := NULL;
    END IF;

    -- Prevent self-referral
    IF NEW.referred_by = NEW.id THEN
      NEW.referred_by := OLD.referred_by;
    END IF;

    IF NOT v_is_trusted THEN
      -- Allow initial Google OAuth onboarding role selection (affiliate -> seller) ONLY within 2 minutes of signup
      -- while unpaid/unverified; NEVER allow 'admin' assignment.
      IF OLD.role = 'affiliate'
         AND NEW.role = 'seller'
         AND OLD.subscription_status = 'none'
         AND COALESCE(OLD.seller_verified, false) = false
         AND OLD.created_at >= NOW() - INTERVAL '2 minutes' THEN
        NEW.role := 'seller';
        UPDATE public.referrals
        SET referral_type = 'seller',
            updated_at = NOW()
        WHERE referred_user_id = OLD.id;
      ELSE
        NEW.role := OLD.role;
      END IF;

      NEW.status := OLD.status;
      NEW.seller_verified := OLD.seller_verified;
      NEW.subscription_status := OLD.subscription_status;
      NEW.subscription_price := OLD.subscription_price;
      NEW.membership_activated_at := OLD.membership_activated_at;
    ELSE
      -- Even trusted updates cannot turn arbitrary emails into 'admin' unless matching configured admin email
      IF NEW.role = 'admin' AND LOWER(TRIM(COALESCE(NEW.email, ''))) <> 'gnetam108@gmail.com' THEN
        NEW.role := OLD.role;
      END IF;
    END IF;

  ELSIF TG_OP = 'INSERT' THEN
    IF NEW.referral_code IS NULL OR TRIM(NEW.referral_code) = '' THEN
      NEW.referral_code := 'CB' || UPPER(SUBSTRING(REPLACE(NEW.id::text, '-', ''), 1, 8));
    END IF;

    IF NEW.referred_by = NEW.id THEN
      NEW.referred_by := NULL;
    END IF;

    IF NOT v_is_trusted THEN
      IF NEW.role NOT IN ('affiliate', 'seller') THEN
        NEW.role := 'affiliate';
      END IF;
      NEW.status := 'active';
      NEW.seller_verified := false;
      NEW.subscription_status := 'none';
      NEW.membership_activated_at := NULL;
      NEW.referred_by := NULL;
    ELSE
      IF NEW.role = 'admin' AND LOWER(TRIM(COALESCE(NEW.email, ''))) <> 'gnetam108@gmail.com' THEN
        NEW.role := 'affiliate';
      END IF;
    END IF;
  END IF;

  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_profile_privileges() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_protect_profile_privileges ON public.profiles;
CREATE TRIGGER trg_protect_profile_privileges
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_privileges();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req_role TEXT;
  safe_role TEXT;
  gen_ref_code TEXT;
  meta_ref_code TEXT;
  v_referrer RECORD;
  v_ref_type TEXT;
  v_provider TEXT;
BEGIN
  req_role := COALESCE(LOWER(TRIM(NEW.raw_user_meta_data->>'role')), 'affiliate');
  v_provider := COALESCE(LOWER(TRIM(NEW.raw_app_meta_data->>'provider')), 'email');

  -- Never assign Admin role via Google OAuth or for any email other than gnetam108@gmail.com
  IF LOWER(TRIM(COALESCE(NEW.email, ''))) = 'gnetam108@gmail.com' AND v_provider <> 'google' THEN
    safe_role := 'admin';
  ELSIF req_role = 'seller' THEN
    safe_role := 'seller';
  ELSE
    safe_role := 'affiliate';
  END IF;

  gen_ref_code := 'CB' || UPPER(SUBSTRING(REPLACE(NEW.id::text, '-', ''), 1, 8));

  PERFORM set_config('clickbarry.bypass_profile_guard', 'on', true);

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
    referral_code = COALESCE(NULLIF(public.profiles.referral_code, ''), EXCLUDED.referral_code);

  IF safe_role = 'admin' THEN
    INSERT INTO public.admin_users (id, email, role)
    VALUES (NEW.id, LOWER(TRIM(NEW.email)), 'super_admin')
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, role = 'super_admin';
  END IF;

  meta_ref_code := UPPER(TRIM(COALESCE(NEW.raw_user_meta_data->>'referral_code', '')));
  IF meta_ref_code <> '' THEN
    SELECT id, status, email INTO v_referrer
    FROM public.profiles
    WHERE UPPER(referral_code) = meta_ref_code
    LIMIT 1;

    IF v_referrer.id IS NULL THEN
      INSERT INTO public.referral_fraud_logs (user_id, attempted_code, event_type, severity, details)
      VALUES (NEW.id, meta_ref_code, 'invalid_referral_code', 'low', 'Invalid referral code passed during registration.');
    ELSIF v_referrer.id = NEW.id THEN
      INSERT INTO public.referral_fraud_logs (user_id, referrer_id, attempted_code, event_type, severity, details)
      VALUES (NEW.id, v_referrer.id, meta_ref_code, 'self_referral_blocked', 'high', 'Self-referral attempt blocked at signup.');
    ELSIF v_referrer.status <> 'active' THEN
      INSERT INTO public.referral_fraud_logs (user_id, referrer_id, attempted_code, event_type, severity, details)
      VALUES (NEW.id, v_referrer.id, meta_ref_code, 'suspended_referrer_blocked', 'medium', 'Suspended referrer blocked at signup.');
    ELSE
      v_ref_type := CASE WHEN safe_role = 'seller' THEN 'seller' ELSE 'affiliate' END;
      UPDATE public.profiles
      SET referred_by = v_referrer.id
      WHERE id = NEW.id AND referred_by IS NULL;

      INSERT INTO public.referrals (referrer_id, referred_user_id, referral_code_used, referral_type, status)
      VALUES (v_referrer.id, NEW.id, meta_ref_code, v_ref_type, 'active')
      ON CONFLICT (referred_user_id) DO NOTHING;
    END IF;
  END IF;

  PERFORM set_config('clickbarry.bypass_profile_guard', 'off', true);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('clickbarry.bypass_profile_guard', 'off', true);
  RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.bind_user_referral(p_referral_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_clean_code TEXT;
  v_user RECORD;
  v_referrer RECORD;
  v_ref_type TEXT;
  v_new_referral_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  v_clean_code := UPPER(TRIM(COALESCE(p_referral_code, '')));
  IF v_clean_code = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Referral code is empty');
  END IF;

  SELECT id, email, role, referred_by, referral_code INTO v_user
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF v_user.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not initialized');
  END IF;

  IF v_user.referred_by IS NOT NULL OR EXISTS (SELECT 1 FROM public.referrals WHERE referred_user_id = v_user_id) THEN
    INSERT INTO public.referral_fraud_logs (user_id, referrer_id, attempted_code, event_type, severity, details)
    VALUES (
      v_user_id, v_user.referred_by, v_clean_code, 'duplicate_referral_blocked', 'medium',
      'User ' || COALESCE(v_user.email, v_user_id::text) || ' attempted to bind another referral code (' || v_clean_code || ') after already being attributed.'
    );
    RETURN jsonb_build_object('success', false, 'code', 'already_referred', 'error', 'Referrer already permanently bound');
  END IF;

  SELECT id, email, status INTO v_referrer
  FROM public.profiles
  WHERE UPPER(referral_code) = v_clean_code
  LIMIT 1;

  IF v_referrer.id IS NULL THEN
    INSERT INTO public.referral_fraud_logs (user_id, attempted_code, event_type, severity, details)
    VALUES (
      v_user_id, v_clean_code, 'invalid_referral_code', 'low',
      'User ' || COALESCE(v_user.email, v_user_id::text) || ' presented unknown referral code: ' || v_clean_code
    );
    RETURN jsonb_build_object('success', false, 'code', 'invalid_code', 'error', 'Invalid referral code');
  END IF;

  IF v_referrer.id = v_user_id THEN
    INSERT INTO public.referral_fraud_logs (user_id, referrer_id, attempted_code, event_type, severity, details)
    VALUES (
      v_user_id, v_referrer.id, v_clean_code, 'self_referral_blocked', 'high',
      'Blocked self-referral attempt by ' || COALESCE(v_user.email, v_user_id::text) || ' using own code ' || v_clean_code
    );
    RETURN jsonb_build_object('success', false, 'code', 'self_referral', 'error', 'Self-referral is not allowed');
  END IF;

  IF v_referrer.status <> 'active' THEN
    INSERT INTO public.referral_fraud_logs (user_id, referrer_id, attempted_code, event_type, severity, details)
    VALUES (
      v_user_id, v_referrer.id, v_clean_code, 'suspended_referrer_blocked', 'medium',
      'Referral blocked because referrer account is suspended.'
    );
    RETURN jsonb_build_object('success', false, 'code', 'referrer_suspended', 'error', 'Referrer account is inactive');
  END IF;

  v_ref_type := CASE WHEN v_user.role = 'seller' THEN 'seller' ELSE 'affiliate' END;

  PERFORM set_config('clickbarry.bypass_profile_guard', 'on', true);

  UPDATE public.profiles
  SET referred_by = v_referrer.id
  WHERE id = v_user_id AND referred_by IS NULL;

  INSERT INTO public.referrals (referrer_id, referred_user_id, referral_code_used, referral_type, status)
  VALUES (v_referrer.id, v_user_id, v_clean_code, v_ref_type, 'active')
  ON CONFLICT (referred_user_id) DO NOTHING
  RETURNING id INTO v_new_referral_id;

  PERFORM set_config('clickbarry.bypass_profile_guard', 'off', true);

  INSERT INTO public.admin_audit_logs (admin_email, action, target_type, target_id, details)
  VALUES (
    'system@clickbarry.com',
    'REFERRAL_BOUND',
    'referral',
    COALESCE(v_new_referral_id::text, v_user_id::text),
    'Bound ' || v_ref_type || ' ' || COALESCE(v_user.email, v_user_id::text) || ' to referrer ' || COALESCE(v_referrer.email, v_referrer.id::text) || ' via code ' || v_clean_code
  );

  RETURN jsonb_build_object(
    'success', true,
    'referrer_id', v_referrer.id,
    'referral_id', v_new_referral_id,
    'referral_type', v_ref_type
  );
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('clickbarry.bypass_profile_guard', 'off', true);
  RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.bind_user_referral(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bind_user_referral(TEXT) TO authenticated;

-- ------------------------------------------------------------------------------
-- 7. RAZORPAY SELLER ₹999 VERIFICATION & ₹100 BONUS (SERVER-SIDE ONLY)
-- ------------------------------------------------------------------------------

-- A. Guard seller_membership_payments against forged client captures
CREATE OR REPLACE FUNCTION public.protect_seller_membership_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bypass TEXT;
  v_is_trusted BOOLEAN;
BEGIN
  v_bypass := current_setting('clickbarry.bypass_payment_guard', true);
  v_is_trusted := (
    session_user IN ('postgres', 'supabase_admin')
    OR COALESCE(auth.role(), '') = 'service_role'
    OR public.is_admin()
    OR v_bypass = 'on'
  );

  IF NOT v_is_trusted THEN
    IF TG_OP = 'INSERT' THEN
      -- Clients may only create an unverified order/pending record, never a captured payment
      NEW.signature_verified := false;
      NEW.razorpay_payment_id := NULL;
      NEW.razorpay_signature := NULL;
      NEW.membership_activated_at := NULL;
      NEW.verified_at := NULL;
      NEW.verified_by := NULL;
      IF NEW.status NOT IN ('created', 'pending') THEN
        NEW.status := 'created';
      END IF;
    ELSIF TG_OP = 'UPDATE' THEN
      RAISE EXCEPTION 'Unauthorized modification of seller membership payment record.';
    END IF;
  ELSE
    -- Even for trusted/admin callers, enforce Razorpay proof invariants before allowing captured/verified state
    IF NEW.status = 'captured' OR NEW.signature_verified = true THEN
      IF NEW.payment_gateway <> 'razorpay'
         OR NULLIF(TRIM(COALESCE(NEW.razorpay_order_id, '')), '') IS NULL
         OR NULLIF(TRIM(COALESCE(NEW.razorpay_payment_id, '')), '') IS NULL
         OR NULLIF(TRIM(COALESCE(NEW.razorpay_signature, '')), '') IS NULL
         OR NEW.signature_verified IS DISTINCT FROM true
         OR NEW.amount IS DISTINCT FROM 999.00
         OR UPPER(TRIM(COALESCE(NEW.currency, ''))) <> 'INR' THEN
        RAISE EXCEPTION 'Razorpay captured membership payment requires verified signature, order_id, payment_id, ₹999.00 INR.';
      END IF;
    END IF;
  END IF;

  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_seller_membership_payment() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_protect_seller_membership_payment ON public.seller_membership_payments;
CREATE TRIGGER trg_protect_seller_membership_payment
  BEFORE INSERT OR UPDATE ON public.seller_membership_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_seller_membership_payment();

-- B. Internal ₹100 Seller referral bonus processor (requires BOTH active profile AND verified Razorpay captured payment)
-- Drop prior signature safely if an earlier migration used p_payment_txnid as parameter name (avoids Postgres 42P13)
DROP TRIGGER IF EXISTS trg_referral_on_seller_payment ON public.seller_membership_payments;
DROP FUNCTION IF EXISTS public.process_seller_referral_reward(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.process_seller_referral_reward(
  p_seller_id UUID,
  p_razorpay_payment_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seller RECORD;
  v_payment RECORD;
  v_ref RECORD;
  v_bonus NUMERIC := 100.00;
  v_reward_id UUID;
  v_clean_payment_id TEXT;
BEGIN
  v_clean_payment_id := NULLIF(TRIM(COALESCE(p_razorpay_payment_id, '')), '');
  IF p_seller_id IS NULL OR v_clean_payment_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Missing seller_id or razorpay_payment_id');
  END IF;

  -- 1) Verify Seller account & active membership state
  SELECT id, role, status, seller_verified, subscription_status
  INTO v_seller
  FROM public.profiles
  WHERE id = p_seller_id;

  IF v_seller.id IS NULL
     OR v_seller.role <> 'seller'
     OR v_seller.status <> 'active'
     OR v_seller.subscription_status <> 'active'
     OR COALESCE(v_seller.seller_verified, false) = false THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Seller membership is not verified active');
  END IF;

  -- 2) Verify genuine captured Razorpay ₹999 payment with verified signature
  SELECT *
  INTO v_payment
  FROM public.seller_membership_payments
  WHERE seller_id = p_seller_id
    AND razorpay_payment_id = v_clean_payment_id
    AND payment_gateway = 'razorpay'
    AND status = 'captured'
    AND signature_verified = true
    AND NULLIF(TRIM(COALESCE(razorpay_order_id, '')), '') IS NOT NULL
    AND amount = 999.00
    AND UPPER(TRIM(COALESCE(currency, ''))) = 'INR'
  LIMIT 1;

  IF v_payment.id IS NULL THEN
    INSERT INTO public.referral_fraud_logs (user_id, event_type, severity, details, metadata)
    VALUES (
      p_seller_id,
      'unverified_payment_blocked',
      'high',
      'Blocked ₹100 Seller referral bonus because no verified captured Razorpay ₹999 payment was found.',
      jsonb_build_object('razorpay_payment_id', v_clean_payment_id)
    );
    RETURN jsonb_build_object('success', false, 'reason', 'Verified captured Razorpay ₹999 payment not found');
  END IF;

  -- 3) Verify active referral attribution & active referrer
  SELECT * INTO v_ref
  FROM public.referrals
  WHERE referred_user_id = p_seller_id
    AND status = 'active'
  LIMIT 1;

  IF v_ref.id IS NULL OR v_ref.referrer_id = p_seller_id THEN
    RETURN jsonb_build_object('success', false, 'reason', 'No eligible active referral record found');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_ref.referrer_id AND status = 'active') THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Referrer account is suspended');
  END IF;

  SELECT COALESCE(seller_referral_bonus, 100.00) INTO v_bonus
  FROM public.website_settings
  WHERE id = 'clickbarry_main'
  LIMIT 1;

  INSERT INTO public.referral_commissions (
    referrer_id, referred_user_id, referral_id, reward_type, source_type,
    source_transaction_id, gross_reference_amount, deductions_amount, base_amount,
    commission_rate, reward_amount, status, notes
  )
  VALUES (
    v_ref.referrer_id, p_seller_id, v_ref.id, 'one_time_bonus', 'seller_pass',
    'rzp:' || v_clean_payment_id, 999.00, 0.00, 999.00,
    0.00, v_bonus, 'approved',
    '₹' || v_bonus || ' One-Time Seller Referral Bonus (Razorpay payment ' || v_clean_payment_id || ' captured & verified)'
  )
  ON CONFLICT (referred_user_id, reward_type) WHERE reward_type = 'one_time_bonus'
  DO NOTHING
  RETURNING id INTO v_reward_id;

  IF v_reward_id IS NOT NULL THEN
    PERFORM public.apply_wallet_referral_entry(
      v_ref.referrer_id,
      'direct_approved',
      v_bonus,
      'referral_bonus',
      'rzp:' || v_clean_payment_id,
      '₹' || v_bonus || ' Seller Referral Bonus credited for verified Razorpay ₹999 Pass (' || v_clean_payment_id || ')'
    );

    INSERT INTO public.admin_audit_logs (admin_email, action, target_type, target_id, details)
    VALUES (
      'system@clickbarry.com',
      'SELLER_REFERRAL_BONUS_CREDITED',
      'referral',
      v_reward_id::text,
      'Credited ₹' || v_bonus || ' one-time Seller referral bonus to ' || v_ref.referrer_id::text ||
      ' for seller ' || p_seller_id::text || ' (Razorpay payment: ' || v_clean_payment_id || ')'
    );
  ELSE
    SELECT id INTO v_reward_id
    FROM public.referral_commissions
    WHERE referred_user_id = p_seller_id
      AND reward_type = 'one_time_bonus'
    LIMIT 1;
  END IF;

  RETURN jsonb_build_object('success', true, 'reward_id', v_reward_id, 'bonus', v_bonus);
END;
$$;

REVOKE ALL ON FUNCTION public.process_seller_referral_reward(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_seller_referral_reward(UUID, TEXT) TO service_role;

-- C. Reversal helper for Seller ₹100 bonus when Razorpay payment fails or is refunded
CREATE OR REPLACE FUNCTION public.reverse_seller_referral_bonus(p_seller_id UUID, p_reason TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec RECORD;
BEGIN
  FOR v_rec IN
    SELECT * FROM public.referral_commissions
    WHERE referred_user_id = p_seller_id
      AND reward_type = 'one_time_bonus'
      AND status IN ('pending', 'approved')
    FOR UPDATE
  LOOP
    UPDATE public.referral_commissions
    SET status = 'reversed',
        reversal_reason = p_reason,
        reversed_at = NOW(),
        updated_at = NOW()
    WHERE id = v_rec.id;

    IF v_rec.status = 'approved' THEN
      PERFORM public.apply_wallet_referral_entry(
        v_rec.referrer_id,
        'reverse_approved',
        v_rec.reward_amount,
        'referral_reversal',
        'bonus:' || v_rec.id::text,
        'Reversed ₹' || v_rec.reward_amount || ' Seller Referral Bonus: ' || p_reason
      );
    END IF;

    INSERT INTO public.referral_fraud_logs (user_id, referrer_id, event_type, severity, details)
    VALUES (
      p_seller_id, v_rec.referrer_id, 'commission_reversed', 'medium',
      'Reversed Seller ₹' || v_rec.reward_amount || ' bonus: ' || p_reason
    );
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.reverse_seller_referral_bonus(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_seller_referral_bonus(UUID, TEXT) TO service_role;

-- D. Canonical Server-Side Razorpay Verification RPC (called ONLY by backend/Edge Function using service_role
--    AFTER HMAC-SHA256 verification of razorpay_order_id|razorpay_payment_id against RAZORPAY_KEY_SECRET)
CREATE OR REPLACE FUNCTION public.verify_razorpay_seller_membership(
  p_seller_id UUID,
  p_razorpay_order_id TEXT,
  p_razorpay_payment_id TEXT,
  p_razorpay_signature TEXT,
  p_signature_verified BOOLEAN,
  p_payment_status TEXT,
  p_amount NUMERIC,
  p_currency TEXT DEFAULT 'INR',
  p_gateway_method TEXT DEFAULT NULL,
  p_bank_rrn TEXT DEFAULT NULL,
  p_raw_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seller RECORD;
  v_order_id TEXT;
  v_payment_id TEXT;
  v_signature TEXT;
  v_payment_row_id UUID;
  v_reward_res JSONB;
BEGIN
  v_order_id := NULLIF(TRIM(COALESCE(p_razorpay_order_id, '')), '');
  v_payment_id := NULLIF(TRIM(COALESCE(p_razorpay_payment_id, '')), '');
  v_signature := NULLIF(TRIM(COALESCE(p_razorpay_signature, '')), '');

  IF p_seller_id IS NULL OR v_order_id IS NULL OR v_payment_id IS NULL OR v_signature IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Missing required Razorpay verification fields');
  END IF;

  IF p_signature_verified IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('success', false, 'error', 'Razorpay signature verification failed');
  END IF;

  IF LOWER(TRIM(COALESCE(p_payment_status, ''))) <> 'captured' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Razorpay payment status must be captured');
  END IF;

  IF p_amount IS DISTINCT FROM 999.00 OR UPPER(TRIM(COALESCE(p_currency, ''))) <> 'INR' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid membership amount or currency (expected ₹999.00 INR)');
  END IF;

  SELECT id, email, full_name, role, status
  INTO v_seller
  FROM public.profiles
  WHERE id = p_seller_id
  FOR UPDATE;

  IF v_seller.id IS NULL OR v_seller.role <> 'seller' OR v_seller.status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Active Seller account not found');
  END IF;

  PERFORM set_config('clickbarry.bypass_payment_guard', 'on', true);
  PERFORM set_config('clickbarry.bypass_profile_guard', 'on', true);

  -- 1) Activate Seller membership profile
  UPDATE public.profiles
  SET subscription_status = 'active',
      seller_verified = true,
      subscription_price = 999.00,
      membership_activated_at = COALESCE(membership_activated_at, NOW()),
      updated_at = NOW()
  WHERE id = p_seller_id;

  -- 2) Record or update verified Razorpay payment record (idempotent by razorpay_order_id / razorpay_payment_id)
  SELECT id INTO v_payment_row_id
  FROM public.seller_membership_payments
  WHERE razorpay_order_id = v_order_id OR razorpay_payment_id = v_payment_id
  LIMIT 1;

  IF v_payment_row_id IS NULL THEN
    INSERT INTO public.seller_membership_payments (
      seller_id, seller_email, seller_name, payment_gateway,
      razorpay_order_id, razorpay_payment_id, razorpay_signature, signature_verified,
      amount, currency, status, gateway_method, bank_rrn, raw_gateway_response,
      verified_at, verified_by, membership_activated_at
    ) VALUES (
      p_seller_id, COALESCE(v_seller.email, ''), v_seller.full_name, 'razorpay',
      v_order_id, v_payment_id, v_signature, true,
      999.00, 'INR', 'captured', p_gateway_method, p_bank_rrn, COALESCE(p_raw_payload, '{}'::jsonb),
      NOW(), 'razorpay_server_verify', NOW()
    )
    RETURNING id INTO v_payment_row_id;
  ELSE
    UPDATE public.seller_membership_payments
    SET seller_id = p_seller_id,
        payment_gateway = 'razorpay',
        razorpay_order_id = v_order_id,
        razorpay_payment_id = v_payment_id,
        razorpay_signature = v_signature,
        signature_verified = true,
        status = 'captured',
        gateway_method = COALESCE(p_gateway_method, gateway_method),
        bank_rrn = COALESCE(p_bank_rrn, bank_rrn),
        raw_gateway_response = COALESCE(p_raw_payload, raw_gateway_response),
        verified_at = COALESCE(verified_at, NOW()),
        verified_by = COALESCE(verified_by, 'razorpay_server_verify'),
        membership_activated_at = COALESCE(membership_activated_at, NOW()),
        updated_at = NOW()
    WHERE id = v_payment_row_id;
  END IF;

  -- 3) Append immutable Razorpay transaction audit record
  INSERT INTO public.razorpay_transactions (
    membership_payment_id, seller_id, razorpay_order_id, razorpay_payment_id,
    event_type, status, amount, currency, signature_verified, raw_payload
  ) VALUES (
    v_payment_row_id, p_seller_id, v_order_id, v_payment_id,
    'payment_captured', 'captured', 999.00, 'INR', true, COALESCE(p_raw_payload, '{}'::jsonb)
  )
  ON CONFLICT (razorpay_payment_id, event_type) WHERE razorpay_payment_id IS NOT NULL
  DO NOTHING;

  -- 4) Audit log
  INSERT INTO public.admin_audit_logs (admin_email, action, target_type, target_id, details)
  VALUES (
    'system@clickbarry.com',
    'RAZORPAY_SELLER_MEMBERSHIP_CAPTURED',
    'seller',
    p_seller_id::text,
    'Verified Razorpay ₹999 membership payment. Order: ' || v_order_id || ', Payment: ' || v_payment_id
  );

  -- 5) Process ₹100 one-time Seller referral bonus (now strictly gated on verified Razorpay + active membership)
  v_reward_res := public.process_seller_referral_reward(p_seller_id, v_payment_id);

  PERFORM set_config('clickbarry.bypass_payment_guard', 'off', true);
  PERFORM set_config('clickbarry.bypass_profile_guard', 'off', true);

  RETURN jsonb_build_object(
    'success', true,
    'membership_payment_id', v_payment_row_id,
    'seller_id', p_seller_id,
    'referral_reward', v_reward_res
  );
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('clickbarry.bypass_payment_guard', 'off', true);
  PERFORM set_config('clickbarry.bypass_profile_guard', 'off', true);
  RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_razorpay_seller_membership(
  UUID, TEXT, TEXT, TEXT, BOOLEAN, TEXT, NUMERIC, TEXT, TEXT, TEXT, JSONB
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_razorpay_seller_membership(
  UUID, TEXT, TEXT, TEXT, BOOLEAN, TEXT, NUMERIC, TEXT, TEXT, TEXT, JSONB
) TO service_role;

-- E. Trigger on seller_membership_payments for direct service_role / webhook updates (Razorpay ONLY)
CREATE OR REPLACE FUNCTION public.trg_fn_seller_payment_referral()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.payment_gateway = 'razorpay'
     AND NEW.status = 'captured'
     AND NEW.signature_verified = true
     AND NULLIF(TRIM(COALESCE(NEW.razorpay_order_id, '')), '') IS NOT NULL
     AND NULLIF(TRIM(COALESCE(NEW.razorpay_payment_id, '')), '') IS NOT NULL
     AND NEW.amount = 999.00
     AND UPPER(TRIM(COALESCE(NEW.currency, ''))) = 'INR' THEN

    PERFORM set_config('clickbarry.bypass_profile_guard', 'on', true);
    UPDATE public.profiles
    SET subscription_status = 'active',
        seller_verified = true,
        subscription_price = 999.00,
        membership_activated_at = COALESCE(membership_activated_at, NOW()),
        updated_at = NOW()
    WHERE id = NEW.seller_id
      AND role = 'seller'
      AND status = 'active'
      AND (subscription_status <> 'active' OR COALESCE(seller_verified, false) = false);
    PERFORM set_config('clickbarry.bypass_profile_guard', 'off', true);

    PERFORM public.process_seller_referral_reward(NEW.seller_id, NEW.razorpay_payment_id);

  ELSIF NEW.status IN ('failed', 'cancelled', 'refunded') THEN
    IF NEW.status = 'refunded' THEN
      PERFORM set_config('clickbarry.bypass_profile_guard', 'on', true);
      UPDATE public.profiles
      SET subscription_status = 'refunded',
          seller_verified = false,
          updated_at = NOW()
      WHERE id = NEW.seller_id;
      PERFORM set_config('clickbarry.bypass_profile_guard', 'off', true);

      IF NEW.razorpay_order_id IS NOT NULL AND NEW.razorpay_payment_id IS NOT NULL THEN
        INSERT INTO public.razorpay_transactions (
          membership_payment_id, seller_id, razorpay_order_id, razorpay_payment_id,
          razorpay_refund_id, event_type, status, amount, currency, signature_verified, raw_payload
        ) VALUES (
          NEW.id, NEW.seller_id, NEW.razorpay_order_id, NEW.razorpay_payment_id,
          NEW.refund_id, 'payment_refunded', 'refunded', NEW.amount, NEW.currency, NEW.signature_verified,
          COALESCE(NEW.raw_gateway_response, '{}'::jsonb)
        )
        ON CONFLICT (razorpay_payment_id, event_type) WHERE razorpay_payment_id IS NOT NULL
        DO NOTHING;
      END IF;
    END IF;

    PERFORM public.reverse_seller_referral_bonus(
      NEW.seller_id,
      'Razorpay ₹999 membership payment status: ' || NEW.status
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('clickbarry.bypass_profile_guard', 'off', true);
  RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_fn_seller_payment_referral() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_referral_on_seller_payment ON public.seller_membership_payments;
CREATE TRIGGER trg_referral_on_seller_payment
  AFTER INSERT OR UPDATE OF status, signature_verified ON public.seller_membership_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_seller_payment_referral();

-- ------------------------------------------------------------------------------
-- 8. LIFETIME 10% NET-EARNINGS REFERRAL TRIGGERS & AUTOMATIC REVERSALS
-- ------------------------------------------------------------------------------

-- A. Referred Affiliate Net Earnings (commission_records minus withdrawal platform deduction)
CREATE OR REPLACE FUNCTION public.trg_fn_affiliate_commission_referral()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref RECORD;
  v_ref_pct NUMERIC := 10.00;
  v_fee_pct NUMERIC := 5.00;
  v_gross_comm NUMERIC;
  v_deduction NUMERIC;
  v_net_earnings NUMERIC;
  v_reward_amt NUMERIC;
  v_tx_key TEXT;
  v_existing RECORD;
BEGIN
  v_tx_key := 'comm:' || NEW.id::text;

  IF NEW.status IN ('disputed', 'rejected') THEN
    FOR v_existing IN
      SELECT * FROM public.referral_commissions
      WHERE source_transaction_id = v_tx_key
        AND status IN ('pending', 'approved')
      FOR UPDATE
    LOOP
      UPDATE public.referral_commissions
      SET status = 'reversed',
          reversal_reason = 'Underlying affiliate commission ' || NEW.status,
          reversed_at = NOW(),
          updated_at = NOW()
      WHERE id = v_existing.id;

      IF v_existing.status = 'pending' THEN
        PERFORM public.apply_wallet_referral_entry(
          v_existing.referrer_id, 'reverse_pending', v_existing.reward_amount,
          'referral_reversal', v_tx_key,
          'Removed pending 10% referral commission due to ' || NEW.status || ' affiliate order'
        );
      ELSIF v_existing.status = 'approved' THEN
        PERFORM public.apply_wallet_referral_entry(
          v_existing.referrer_id, 'reverse_approved', v_existing.reward_amount,
          'referral_reversal', v_tx_key,
          'Reversed 10% referral commission due to ' || NEW.status || ' affiliate order'
        );
      END IF;

      INSERT INTO public.referral_fraud_logs (user_id, referrer_id, event_type, severity, details)
      VALUES (
        NEW.affiliate_id, v_existing.referrer_id, 'commission_reversed', 'low',
        'Reversed referral commission (' || v_tx_key || ') after commission marked ' || NEW.status
      );
    END LOOP;
    RETURN NEW;
  END IF;

  SELECT * INTO v_ref
  FROM public.referrals
  WHERE referred_user_id = NEW.affiliate_id
    AND status = 'active'
  LIMIT 1;

  IF v_ref.id IS NULL OR v_ref.referrer_id = NEW.affiliate_id THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_ref.referrer_id AND status = 'active') THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(referral_commission_percentage, 10.00), COALESCE(withdrawal_fee_percentage, 5.00)
  INTO v_ref_pct, v_fee_pct
  FROM public.website_settings
  WHERE id = 'clickbarry_main'
  LIMIT 1;

  v_gross_comm := GREATEST(0, COALESCE(NEW.commission_amount, 0));
  v_deduction := ROUND(v_gross_comm * (COALESCE(v_fee_pct, 5.00) / 100.0), 2);
  v_net_earnings := GREATEST(0, ROUND(v_gross_comm - v_deduction, 2));
  v_reward_amt := ROUND(v_net_earnings * (COALESCE(v_ref_pct, 10.00) / 100.0), 2);

  IF v_reward_amt <= 0 THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'pending' THEN
    INSERT INTO public.referral_commissions (
      referrer_id, referred_user_id, referral_id, reward_type, source_type,
      source_transaction_id, gross_reference_amount, deductions_amount, base_amount,
      commission_rate, reward_amount, status, notes
    )
    VALUES (
      v_ref.referrer_id, NEW.affiliate_id, v_ref.id, 'lifetime_commission', 'affiliate_net_earning',
      v_tx_key, v_gross_comm, v_deduction, v_net_earnings,
      v_ref_pct, v_reward_amt, 'pending',
      v_ref_pct || '% of referred Affiliate net earnings ₹' || v_net_earnings || ' (after ' || v_fee_pct || '% platform deduction)'
    )
    ON CONFLICT (referred_user_id, reward_type, source_transaction_id) WHERE source_transaction_id IS NOT NULL
    DO NOTHING
    RETURNING * INTO v_existing;

    IF v_existing.id IS NOT NULL THEN
      PERFORM public.apply_wallet_referral_entry(
        v_ref.referrer_id, 'pending_credit', v_reward_amt,
        'referral_commission_pending', v_tx_key,
        'Pending 10% Lifetime Affiliate Referral Reward (Net Base ₹' || v_net_earnings || ')'
      );
    END IF;

  ELSIF NEW.status IN ('verified', 'paid') THEN
    SELECT * INTO v_existing
    FROM public.referral_commissions
    WHERE referred_user_id = NEW.affiliate_id
      AND reward_type = 'lifetime_commission'
      AND source_transaction_id = v_tx_key
    FOR UPDATE;

    IF v_existing.id IS NULL THEN
      INSERT INTO public.referral_commissions (
        referrer_id, referred_user_id, referral_id, reward_type, source_type,
        source_transaction_id, gross_reference_amount, deductions_amount, base_amount,
        commission_rate, reward_amount, status, notes
      )
      VALUES (
        v_ref.referrer_id, NEW.affiliate_id, v_ref.id, 'lifetime_commission', 'affiliate_net_earning',
        v_tx_key, v_gross_comm, v_deduction, v_net_earnings,
        v_ref_pct, v_reward_amt, 'approved',
        v_ref_pct || '% lifetime commission on verified Affiliate net earnings ₹' || v_net_earnings
      )
      ON CONFLICT (referred_user_id, reward_type, source_transaction_id) WHERE source_transaction_id IS NOT NULL
      DO NOTHING
      RETURNING * INTO v_existing;

      IF v_existing.id IS NOT NULL THEN
        PERFORM public.apply_wallet_referral_entry(
          v_ref.referrer_id, 'direct_approved', v_reward_amt,
          'referral_commission', v_tx_key,
          '10% Lifetime Affiliate Referral Reward (Net Base ₹' || v_net_earnings || ')'
        );
      END IF;

    ELSIF v_existing.status = 'pending' THEN
      UPDATE public.referral_commissions
      SET status = 'approved',
          gross_reference_amount = v_gross_comm,
          deductions_amount = v_deduction,
          base_amount = v_net_earnings,
          reward_amount = v_reward_amt,
          updated_at = NOW()
      WHERE id = v_existing.id;

      PERFORM public.apply_wallet_referral_entry(
        v_ref.referrer_id, 'pending_to_approved', v_reward_amt,
        'referral_commission', v_tx_key,
        '10% Lifetime Affiliate Referral Reward approved (Net Base ₹' || v_net_earnings || ')'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_fn_affiliate_commission_referral() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_referral_on_commission_record ON public.commission_records;
CREATE TRIGGER trg_referral_on_commission_record
  AFTER INSERT OR UPDATE OF status, commission_amount ON public.commission_records
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_affiliate_commission_referral();

-- B. Referred Seller Net Earnings (sales.seller_net_amount after affiliate + platform fee)
CREATE OR REPLACE FUNCTION public.trg_fn_seller_sale_referral()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref RECORD;
  v_ref_pct NUMERIC := 10.00;
  v_seller_net NUMERIC;
  v_deductions NUMERIC;
  v_reward_amt NUMERIC;
  v_tx_key TEXT;
  v_existing RECORD;
BEGIN
  v_tx_key := 'sale:' || NEW.id::text;

  IF NEW.status IN ('refunded', 'disputed') THEN
    FOR v_existing IN
      SELECT * FROM public.referral_commissions
      WHERE source_transaction_id = v_tx_key
        AND status IN ('pending', 'approved')
      FOR UPDATE
    LOOP
      UPDATE public.referral_commissions
      SET status = 'reversed',
          reversal_reason = 'Seller sale ' || NEW.status || ' (' || NEW.order_reference || ')',
          reversed_at = NOW(),
          updated_at = NOW()
      WHERE id = v_existing.id;

      IF v_existing.status = 'pending' THEN
        PERFORM public.apply_wallet_referral_entry(
          v_existing.referrer_id, 'reverse_pending', v_existing.reward_amount,
          'referral_reversal', v_tx_key,
          'Removed pending 10% Seller referral reward due to ' || NEW.status || ' sale #' || NEW.order_reference
        );
      ELSIF v_existing.status = 'approved' THEN
        PERFORM public.apply_wallet_referral_entry(
          v_existing.referrer_id, 'reverse_approved', v_existing.reward_amount,
          'referral_reversal', v_tx_key,
          'Reversed 10% Seller referral reward due to ' || NEW.status || ' sale #' || NEW.order_reference
        );
      END IF;

      INSERT INTO public.referral_fraud_logs (user_id, referrer_id, event_type, severity, details)
      VALUES (
        NEW.seller_id, v_existing.referrer_id, 'commission_reversed', 'low',
        'Reversed Seller referral commission (' || v_tx_key || ') due to sale status ' || NEW.status
      );
    END LOOP;
    RETURN NEW;
  END IF;

  SELECT * INTO v_ref
  FROM public.referrals
  WHERE referred_user_id = NEW.seller_id
    AND status = 'active'
  LIMIT 1;

  IF v_ref.id IS NULL OR v_ref.referrer_id = NEW.seller_id THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_ref.referrer_id AND status = 'active') THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(referral_commission_percentage, 10.00)
  INTO v_ref_pct
  FROM public.website_settings
  WHERE id = 'clickbarry_main'
  LIMIT 1;

  v_seller_net := GREATEST(0, COALESCE(NEW.seller_net_amount, 0));
  v_deductions := GREATEST(0, COALESCE(NEW.affiliate_commission_amount, 0) + COALESCE(NEW.platform_fee_amount, 0));
  v_reward_amt := ROUND(v_seller_net * (COALESCE(v_ref_pct, 10.00) / 100.0), 2);

  IF v_reward_amt <= 0 THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'pending' THEN
    INSERT INTO public.referral_commissions (
      referrer_id, referred_user_id, referral_id, reward_type, source_type,
      source_transaction_id, gross_reference_amount, deductions_amount, base_amount,
      commission_rate, reward_amount, status, notes
    )
    VALUES (
      v_ref.referrer_id, NEW.seller_id, v_ref.id, 'lifetime_commission', 'seller_net_earning',
      v_tx_key, NEW.sale_amount, v_deductions, v_seller_net,
      v_ref_pct, v_reward_amt, 'pending',
      v_ref_pct || '% of referred Seller net earnings ₹' || v_seller_net || ' (Order ' || NEW.order_reference || ')'
    )
    ON CONFLICT (referred_user_id, reward_type, source_transaction_id) WHERE source_transaction_id IS NOT NULL
    DO NOTHING
    RETURNING * INTO v_existing;

    IF v_existing.id IS NOT NULL THEN
      PERFORM public.apply_wallet_referral_entry(
        v_ref.referrer_id, 'pending_credit', v_reward_amt,
        'referral_commission_pending', v_tx_key,
        'Pending 10% Lifetime Seller Referral Reward (Net Base ₹' || v_seller_net || ')'
      );
    END IF;

  ELSIF NEW.status = 'verified' THEN
    SELECT * INTO v_existing
    FROM public.referral_commissions
    WHERE referred_user_id = NEW.seller_id
      AND reward_type = 'lifetime_commission'
      AND source_transaction_id = v_tx_key
    FOR UPDATE;

    IF v_existing.id IS NULL THEN
      INSERT INTO public.referral_commissions (
        referrer_id, referred_user_id, referral_id, reward_type, source_type,
        source_transaction_id, gross_reference_amount, deductions_amount, base_amount,
        commission_rate, reward_amount, status, notes
      )
      VALUES (
        v_ref.referrer_id, NEW.seller_id, v_ref.id, 'lifetime_commission', 'seller_net_earning',
        v_tx_key, NEW.sale_amount, v_deductions, v_seller_net,
        v_ref_pct, v_reward_amt, 'approved',
        v_ref_pct || '% lifetime commission on verified Seller net earnings ₹' || v_seller_net
      )
      ON CONFLICT (referred_user_id, reward_type, source_transaction_id) WHERE source_transaction_id IS NOT NULL
      DO NOTHING
      RETURNING * INTO v_existing;

      IF v_existing.id IS NOT NULL THEN
        PERFORM public.apply_wallet_referral_entry(
          v_ref.referrer_id, 'direct_approved', v_reward_amt,
          'referral_commission', v_tx_key,
          '10% Lifetime Seller Referral Reward (Net Base ₹' || v_seller_net || ')'
        );
      END IF;

    ELSIF v_existing.status = 'pending' THEN
      UPDATE public.referral_commissions
      SET status = 'approved',
          gross_reference_amount = NEW.sale_amount,
          deductions_amount = v_deductions,
          base_amount = v_seller_net,
          reward_amount = v_reward_amt,
          updated_at = NOW()
      WHERE id = v_existing.id;

      PERFORM public.apply_wallet_referral_entry(
        v_ref.referrer_id, 'pending_to_approved', v_reward_amt,
        'referral_commission', v_tx_key,
        '10% Lifetime Seller Referral Reward approved (Net Base ₹' || v_seller_net || ')'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_fn_seller_sale_referral() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_referral_on_sale ON public.sales;
CREATE TRIGGER trg_referral_on_sale
  AFTER INSERT OR UPDATE OF status, seller_net_amount ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_seller_sale_referral();

-- ------------------------------------------------------------------------------
-- 9. PRIVACY-SAFE USER SUMMARY RPC & ADMIN MANAGEMENT RPCS
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_my_referrals_summary();
CREATE OR REPLACE FUNCTION public.get_my_referrals_summary()
RETURNS TABLE (
  id UUID,
  referrer_id UUID,
  referred_user_id UUID,
  referred_display_name TEXT,
  referred_masked_email TEXT,
  referral_code_used TEXT,
  referral_type TEXT,
  status TEXT,
  referred_subscription_status TEXT,
  bonus_status TEXT,
  bonus_amount NUMERIC,
  lifetime_commission_total NUMERIC,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    r.id,
    r.referrer_id,
    r.referred_user_id,
    COALESCE(NULLIF(TRIM(p.full_name), ''), SPLIT_PART(COALESCE(p.email, 'Member'), '@', 1)) AS referred_display_name,
    CASE
      WHEN p.email IS NOT NULL AND POSITION('@' IN p.email) > 1 THEN
        LEFT(p.email, 2) || '***@' || SPLIT_PART(p.email, '@', 2)
      ELSE 'member'
    END AS referred_masked_email,
    r.referral_code_used,
    r.referral_type,
    r.status,
    COALESCE(p.subscription_status, 'none') AS referred_subscription_status,
    CASE
      WHEN r.referral_type <> 'seller' THEN 'not_applicable'
      WHEN EXISTS (
        SELECT 1 FROM public.referral_commissions rc
        WHERE rc.referred_user_id = r.referred_user_id
          AND rc.reward_type = 'one_time_bonus'
          AND rc.status IN ('approved', 'paid')
      ) THEN 'credited'
      WHEN EXISTS (
        SELECT 1 FROM public.referral_commissions rc
        WHERE rc.referred_user_id = r.referred_user_id
          AND rc.reward_type = 'one_time_bonus'
          AND rc.status = 'reversed'
      ) THEN 'reversed'
      WHEN p.subscription_status = 'failed' THEN 'failed_pass'
      WHEN p.subscription_status = 'refunded' THEN 'reversed'
      ELSE 'pending_pass'
    END AS bonus_status,
    COALESCE((
      SELECT SUM(rc.reward_amount)
      FROM public.referral_commissions rc
      WHERE rc.referred_user_id = r.referred_user_id
        AND rc.reward_type = 'one_time_bonus'
        AND rc.status IN ('approved', 'paid')
    ), 0)::NUMERIC AS bonus_amount,
    COALESCE((
      SELECT SUM(rc.reward_amount)
      FROM public.referral_commissions rc
      WHERE rc.referred_user_id = r.referred_user_id
        AND rc.reward_type = 'lifetime_commission'
        AND rc.status IN ('approved', 'paid')
    ), 0)::NUMERIC AS lifetime_commission_total,
    r.created_at
  FROM public.referrals r
  JOIN public.profiles p ON p.id = r.referred_user_id
  WHERE r.referrer_id = auth.uid()
  ORDER BY r.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_referrals_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_referrals_summary() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_manage_referral_commission(
  p_commission_id UUID,
  p_new_status TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_rec RECORD;
  v_admin_email TEXT;
  v_ref_key TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Super Admin access required');
  END IF;

  IF p_new_status NOT IN ('pending', 'approved', 'paid', 'reversed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid referral commission status');
  END IF;

  SELECT email INTO v_admin_email FROM auth.users WHERE id = auth.uid();

  SELECT * INTO v_rec
  FROM public.referral_commissions
  WHERE id = p_commission_id
  FOR UPDATE;

  IF v_rec.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Referral commission not found');
  END IF;

  IF v_rec.status = p_new_status THEN
    RETURN jsonb_build_object('success', true, 'message', 'Status unchanged');
  END IF;

  UPDATE public.referral_commissions
  SET status = p_new_status,
      reversal_reason = CASE WHEN p_new_status = 'reversed' THEN COALESCE(p_reason, 'Reversed by Admin') ELSE reversal_reason END,
      reversed_at = CASE WHEN p_new_status = 'reversed' THEN NOW() ELSE reversed_at END,
      updated_at = NOW()
  WHERE id = p_commission_id;

  v_ref_key := COALESCE(v_rec.source_transaction_id, v_rec.id::text);

  IF p_new_status = 'approved' AND v_rec.status = 'pending' THEN
    PERFORM public.apply_wallet_referral_entry(
      v_rec.referrer_id, 'pending_to_approved', v_rec.reward_amount,
      CASE WHEN v_rec.reward_type = 'one_time_bonus' THEN 'referral_bonus' ELSE 'referral_commission' END,
      v_ref_key,
      'Admin approved referral reward of ₹' || v_rec.reward_amount
    );
  ELSIF p_new_status = 'reversed' AND v_rec.status = 'pending' THEN
    PERFORM public.apply_wallet_referral_entry(
      v_rec.referrer_id, 'reverse_pending', v_rec.reward_amount,
      'referral_reversal', v_ref_key,
      'Admin removed pending referral reward: ' || COALESCE(p_reason, 'Manual review')
    );
  ELSIF p_new_status = 'reversed' AND v_rec.status IN ('approved', 'paid') THEN
    PERFORM public.apply_wallet_referral_entry(
      v_rec.referrer_id, 'reverse_approved', v_rec.reward_amount,
      'referral_reversal', v_ref_key,
      'Admin reversed referral reward: ' || COALESCE(p_reason, 'Policy/fraud reversal')
    );

    INSERT INTO public.referral_fraud_logs (user_id, referrer_id, event_type, severity, details)
    VALUES (
      v_rec.referred_user_id, v_rec.referrer_id, 'commission_reversed', 'medium',
      'Admin reversed ₹' || v_rec.reward_amount || ': ' || COALESCE(p_reason, 'Manual review')
    );
  END IF;

  INSERT INTO public.admin_audit_logs (admin_id, admin_email, action, target_type, target_id, details)
  VALUES (
    auth.uid(),
    COALESCE(v_admin_email, 'gnetam108@gmail.com'),
    'REFERRAL_COMMISSION_' || UPPER(p_new_status),
    'referral',
    p_commission_id::text,
    'Referral reward updated from ' || v_rec.status || ' to ' || p_new_status || '. Reason: ' || COALESCE(p_reason, 'Admin action')
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_manage_referral_commission(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_manage_referral_commission(UUID, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_toggle_referral_block(
  p_referral_id UUID,
  p_status TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_ref RECORD;
  v_admin_email TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Super Admin access required');
  END IF;

  IF p_status NOT IN ('active', 'blocked') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid status');
  END IF;

  SELECT email INTO v_admin_email FROM auth.users WHERE id = auth.uid();

  SELECT * INTO v_ref FROM public.referrals WHERE id = p_referral_id FOR UPDATE;
  IF v_ref.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Referral record not found');
  END IF;

  UPDATE public.referrals
  SET status = p_status,
      block_reason = CASE WHEN p_status = 'blocked' THEN COALESCE(p_reason, 'Blocked by Admin') ELSE NULL END,
      updated_at = NOW()
  WHERE id = p_referral_id;

  IF p_status = 'blocked' THEN
    INSERT INTO public.referral_fraud_logs (user_id, referrer_id, attempted_code, event_type, severity, details)
    VALUES (
      v_ref.referred_user_id, v_ref.referrer_id, v_ref.referral_code_used,
      'referral_blocked_by_admin', 'high',
      'Referral blocked by Admin: ' || COALESCE(p_reason, 'Suspicious activity')
    );
  END IF;

  INSERT INTO public.admin_audit_logs (admin_id, admin_email, action, target_type, target_id, details)
  VALUES (
    auth.uid(),
    COALESCE(v_admin_email, 'gnetam108@gmail.com'),
    'REFERRAL_' || UPPER(p_status),
    'referral',
    p_referral_id::text,
    'Referral status set to ' || p_status || '. Reason: ' || COALESCE(p_reason, 'Admin action')
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_toggle_referral_block(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_toggle_referral_block(UUID, TEXT, TEXT) TO authenticated;

-- ------------------------------------------------------------------------------
-- 10. STRICT ZERO-TRUST ROW LEVEL SECURITY POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_fraud_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_membership_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.razorpay_transactions ENABLE ROW LEVEL SECURITY;

-- REFERRALS RLS
DROP POLICY IF EXISTS "Referrer and referred read own referrals" ON public.referrals;
CREATE POLICY "Referrer and referred read own referrals"
  ON public.referrals
  FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admin manages referrals" ON public.referrals;
CREATE POLICY "Admin manages referrals"
  ON public.referrals
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- REFERRAL COMMISSIONS RLS
DROP POLICY IF EXISTS "Users read own referral commissions" ON public.referral_commissions;
CREATE POLICY "Users read own referral commissions"
  ON public.referral_commissions
  FOR SELECT
  USING (auth.uid() = referrer_id OR public.is_admin());

DROP POLICY IF EXISTS "Admin manages referral commissions" ON public.referral_commissions;
CREATE POLICY "Admin manages referral commissions"
  ON public.referral_commissions
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- REFERRAL FRAUD LOGS RLS
DROP POLICY IF EXISTS "Admins manage referral fraud logs" ON public.referral_fraud_logs;
CREATE POLICY "Admins manage referral fraud logs"
  ON public.referral_fraud_logs
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Authenticated log own blocked referral attempt" ON public.referral_fraud_logs;
CREATE POLICY "Authenticated log own blocked referral attempt"
  ON public.referral_fraud_logs
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = user_id
    AND event_type IN ('self_referral_blocked', 'duplicate_referral_blocked', 'invalid_referral_code')
    AND severity IN ('low', 'medium', 'high')
  );

-- SELLER MEMBERSHIP PAYMENTS RLS (Razorpay-safe)
DROP POLICY IF EXISTS "Sellers can view own membership payments" ON public.seller_membership_payments;
CREATE POLICY "Sellers can view own membership payments"
  ON public.seller_membership_payments
  FOR SELECT
  USING (auth.uid() = seller_id OR public.is_admin());

DROP POLICY IF EXISTS "Sellers can create payment intent" ON public.seller_membership_payments;
DROP POLICY IF EXISTS "Sellers can create Razorpay payment order intent" ON public.seller_membership_payments;
CREATE POLICY "Sellers can create Razorpay payment order intent"
  ON public.seller_membership_payments
  FOR INSERT
  WITH CHECK (
    auth.uid() = seller_id
    AND payment_gateway = 'razorpay'
    AND amount = 999.00
    AND UPPER(currency) = 'INR'
    AND status IN ('created', 'pending')
    AND signature_verified = false
    AND razorpay_payment_id IS NULL
    AND razorpay_signature IS NULL
  );

DROP POLICY IF EXISTS "Admins manage membership payments" ON public.seller_membership_payments;
CREATE POLICY "Admins manage membership payments"
  ON public.seller_membership_payments
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- RAZORPAY TRANSACTIONS RLS (Read-only for owner/admin; written strictly via server/service_role)
DROP POLICY IF EXISTS "Sellers view own razorpay transactions" ON public.razorpay_transactions;
CREATE POLICY "Sellers view own razorpay transactions"
  ON public.razorpay_transactions
  FOR SELECT
  USING (auth.uid() = seller_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins view all razorpay transactions" ON public.razorpay_transactions;
CREATE POLICY "Admins view all razorpay transactions"
  ON public.razorpay_transactions
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
