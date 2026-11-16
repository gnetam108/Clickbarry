-- ==============================================================================
-- CLICKBARRY: PAYU LIFETIME SELLER MEMBERSHIP INTEGRATION SCHEMA
-- File: clickbarry_payu_membership_schema.sql
-- Database: Supabase PostgreSQL (Project ID: xhkverrkjhfqrvqraafb)
-- ==============================================================================
-- Rules Enforced:
-- 1. Seller Membership Fee: Exactly ₹999 INR (one-time payment, Lifetime access).
-- 2. Affiliates: Completely FREE (No payment required).
-- 3. Idempotent: Prevents duplicate activations.
-- 4. Server-verified hash confirmation before membership is activated.
-- ==============================================================================

-- 1. SELLER MEMBERSHIP PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.seller_membership_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_email TEXT NOT NULL,
  seller_name TEXT,
  txnid TEXT UNIQUE NOT NULL,
  payu_id TEXT, -- mihpayid returned by PayU
  amount NUMERIC(10, 2) NOT NULL DEFAULT 999.00 CHECK (amount = 999.00),
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'cancelled')),
  payment_mode TEXT, -- UPI, CC, DC, NB
  bank_ref_num TEXT,
  hash_verified BOOLEAN NOT NULL DEFAULT false,
  raw_payu_response JSONB,
  membership_activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. INDEXES FOR SPEED AND INTEGRITY
CREATE INDEX IF NOT EXISTS idx_seller_payments_seller ON public.seller_membership_payments(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_payments_txnid ON public.seller_membership_payments(txnid);
CREATE INDEX IF NOT EXISTS idx_seller_payments_status ON public.seller_membership_payments(status);

-- 3. AUTOMATIC MEMBERSHIP ACTIVATION TRIGGER
-- Activates profiles.subscription_status = 'active' and seller_verified = true ONLY on confirmed ₹999 payment
CREATE OR REPLACE FUNCTION public.handle_successful_seller_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- Verify conditions: status = 'success', hash_verified = true, amount = 999.00
  IF NEW.status = 'success' AND NEW.hash_verified = true AND NEW.amount = 999.00 THEN
    -- Update Seller Profile to Active Lifetime Membership
    UPDATE public.profiles
    SET 
      subscription_status = 'active',
      seller_verified = true,
      subscription_price = 999.00,
      updated_at = timezone('utc'::text, now())
    WHERE id = NEW.seller_id;

    -- Record timestamp on payment record
    NEW.membership_activated_at := COALESCE(NEW.membership_activated_at, timezone('utc'::text, now()));

    -- Also record in admin audit logs if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_audit_logs') THEN
      INSERT INTO public.admin_audit_logs (admin_email, action, target_type, target_id, details)
      VALUES (
        'system@clickbarry.store',
        'SELLER_MEMBERSHIP_ACTIVATED',
        'seller',
        NEW.seller_id::TEXT,
        '₹999 Lifetime Seller Membership activated via verified PayU payment. TXNID: ' || NEW.txnid
      );
    END IF;
  END IF;

  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_activate_seller_membership ON public.seller_membership_payments;
CREATE TRIGGER trg_activate_seller_membership
  BEFORE INSERT OR UPDATE ON public.seller_membership_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_successful_seller_payment();

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.seller_membership_payments ENABLE ROW LEVEL SECURITY;

-- Policy 1: Sellers can view only their own payment records
DROP POLICY IF EXISTS "Sellers can view own membership payments" ON public.seller_membership_payments;
CREATE POLICY "Sellers can view own membership payments" ON public.seller_membership_payments
  FOR SELECT
  USING (
    auth.uid() = seller_id 
    OR public.is_admin()
  );

-- Policy 2: Authenticated sellers can initiate pending payment intent
DROP POLICY IF EXISTS "Sellers can create payment intent" ON public.seller_membership_payments;
CREATE POLICY "Sellers can create payment intent" ON public.seller_membership_payments
  FOR INSERT
  WITH CHECK (
    auth.uid() = seller_id
    AND amount = 999.00
  );

-- Policy 3: Only Admins or Service Role can update status to success/failed
DROP POLICY IF EXISTS "Admins manage membership payments" ON public.seller_membership_payments;
CREATE POLICY "Admins manage membership payments" ON public.seller_membership_payments
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
