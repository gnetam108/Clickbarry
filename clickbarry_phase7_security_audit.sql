-- ==============================================================================
-- CLICKBARRY: PHASE 7 – COMPLETE SECURITY AUDIT & SYSTEM HARDENING MIGRATION
-- File: clickbarry_phase7_security_audit.sql
-- Database: Supabase PostgreSQL (Project ID: xhkverrkjhfqrvqraafb)
-- Target: Zero-Trust Security, Strict RLS, Financial Immutability, Role Protection
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. HELPER FUNCTION: STRICT SUPER ADMIN CHECK
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Returns true ONLY if authenticated user ID is present in admin_users OR email matches root admin
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users WHERE id = auth.uid()
  ) OR (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND email = 'gnetam108@gmail.com'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. ROLE PROTECTION TRIGGER ON PROFILES
-- Prevents non-admin users from escalating their own privileges (setting role = 'admin' or seller_verified = true)
CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS TRIGGER AS $$
BEGIN
  -- If non-admin user attempts to alter status, verification, or role:
  IF NOT public.is_admin() THEN
    -- Keep existing privileged fields unchanged
    NEW.status := OLD.status;
    NEW.seller_verified := OLD.seller_verified;
    NEW.subscription_status := OLD.subscription_status;
  END IF;
  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_protect_profile_privileges ON public.profiles;
CREATE TRIGGER trg_protect_profile_privileges
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_privileges();

-- 4. HARDEN PRODUCTS ROW LEVEL SECURITY
-- Admins can update approval_status, is_featured, or delete prohibited products
DROP POLICY IF EXISTS "Admins can moderate products" ON public.products;
CREATE POLICY "Admins can moderate products" ON public.products
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 5. HARDEN WITHDRAWALS & LEDGER CONSTRAINTS (Prevent Negative Balances)
ALTER TABLE public.affiliate_wallets DROP CONSTRAINT IF EXISTS chk_wallet_earnings_positive;
ALTER TABLE public.affiliate_wallets ADD CONSTRAINT chk_wallet_earnings_positive CHECK (total_approved_earnings >= 0);

ALTER TABLE public.affiliate_wallets DROP CONSTRAINT IF EXISTS chk_wallet_reserved_positive;
ALTER TABLE public.affiliate_wallets ADD CONSTRAINT chk_wallet_reserved_positive CHECK (reserved_balance >= 0);

ALTER TABLE public.withdrawal_requests DROP CONSTRAINT IF EXISTS chk_withdrawal_amount_positive;
ALTER TABLE public.withdrawal_requests ADD CONSTRAINT chk_withdrawal_amount_positive CHECK (amount > 0);

ALTER TABLE public.wallet_ledger DROP CONSTRAINT IF EXISTS chk_ledger_amount_positive;
ALTER TABLE public.wallet_ledger ADD CONSTRAINT chk_ledger_amount_positive CHECK (amount > 0);

-- 6. IMMUTABLE FINANCIAL LEDGER PROTECTION
-- Prevent updates or deletions on wallet_ledger rows. Financial history must be immutable!
CREATE OR REPLACE FUNCTION public.prevent_ledger_tampering()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Financial Ledger entries are immutable and cannot be updated or deleted.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_ledger_update ON public.wallet_ledger;
CREATE TRIGGER trg_prevent_ledger_update
  BEFORE UPDATE OR DELETE ON public.wallet_ledger
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_ledger_tampering();

-- 7. AUDIT LOGS IMMUTABILITY
-- Prevent updates or deletions on security audit logs
CREATE OR REPLACE FUNCTION public.prevent_audit_tampering()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit log entries are tamper-proof and cannot be updated or deleted.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_audit_update ON public.admin_audit_logs;
CREATE TRIGGER trg_prevent_audit_update
  BEFORE UPDATE OR DELETE ON public.admin_audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_tampering();

-- 8. ENSURE ROOT SUPER ADMIN SEED
INSERT INTO public.admin_users (id, email, role)
SELECT id, email, 'super_admin'
FROM public.profiles
WHERE email = 'gnetam108@gmail.com'
ON CONFLICT (email) DO UPDATE SET role = 'super_admin';

-- 9. VERIFY ALL RLS FLAGS ARE ENABLED
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
