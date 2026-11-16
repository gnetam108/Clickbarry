-- ==============================================================================
-- CLICKBARRY: PHASE 5 – MANUAL UPI AND BANK WITHDRAWAL SYSTEM MIGRATION
-- File: clickbarry_phase5_withdrawal_schema.sql
-- Description: Financial ledger, affiliate wallets, withdrawal requests,
--              admin payout settings, and row level security policies.
-- ==============================================================================

-- 1. ADMIN USERS TABLE (Explicit table defining authorized administrators)
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PAYOUT SETTINGS TABLE (Configurable Admin Payout Rules)
CREATE TABLE IF NOT EXISTS public.payout_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  min_withdrawal_amount NUMERIC NOT NULL DEFAULT 500,
  max_withdrawal_amount NUMERIC NOT NULL DEFAULT 100000,
  allowed_payment_methods TEXT[] NOT NULL DEFAULT ARRAY['upi', 'bank_transfer'],
  processing_info TEXT NOT NULL DEFAULT 'Withdrawals are processed manually by Admin via UPI or NEFT/IMPS every Tuesday within 24-48 business hours.',
  is_withdrawals_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default payout settings
INSERT INTO public.payout_settings (id, min_withdrawal_amount, max_withdrawal_amount, allowed_payment_methods, processing_info, is_withdrawals_enabled)
VALUES (
  'default',
  500,
  100000,
  ARRAY['upi', 'bank_transfer'],
  'Withdrawals are processed manually by Admin via UPI or NEFT/IMPS every Tuesday within 24-48 business hours.',
  true
)
ON CONFLICT (id) DO UPDATE SET
  min_withdrawal_amount = EXCLUDED.min_withdrawal_amount,
  max_withdrawal_amount = EXCLUDED.max_withdrawal_amount;

-- 3. AFFILIATE WALLETS TABLE
-- Master balance table with ledger integrity
CREATE TABLE IF NOT EXISTS public.affiliate_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_approved_earnings NUMERIC NOT NULL DEFAULT 0,
  pending_commission NUMERIC NOT NULL DEFAULT 0,
  reserved_balance NUMERIC NOT NULL DEFAULT 0, -- Funds locked while withdrawal request is in pending/processing
  available_balance NUMERIC GENERATED ALWAYS AS (GREATEST(0, total_approved_earnings - reserved_balance)) STORED,
  total_paid NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. WITHDRAWAL REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number TEXT UNIQUE NOT NULL, -- e.g. WDR-2026-88192
  affiliate_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('upi', 'bank_transfer')),
  -- UPI Details
  upi_id TEXT,
  -- Bank Details
  account_holder_name TEXT,
  bank_account_number TEXT,
  ifsc_code TEXT,
  bank_name TEXT,
  -- Status Lifecycle: pending -> approved -> processing -> paid (or rejected)
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processing', 'paid', 'rejected', 'cancelled')),
  admin_remarks TEXT,
  rejection_reason TEXT,
  transaction_reference TEXT, -- UPI Reference ID / Bank UTR number
  payment_proof_url TEXT,
  processed_by UUID REFERENCES public.profiles(id),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. FINANCIAL WALLET LEDGER TABLE
-- Double-entry immutable accounting record of every balance change
CREATE TABLE IF NOT EXISTS public.wallet_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES public.affiliate_wallets(id) ON DELETE CASCADE,
  affiliate_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL CHECK (entry_type IN (
    'commission_approved',   -- Credit: Increases total_approved_earnings & available_balance
    'commission_pending',    -- Informational: Increases pending_commission
    'withdrawal_reserved',   -- Lock: Moves funds to reserved_balance
    'withdrawal_released',   -- Release: Returns reserved_balance back on rejection/cancellation
    'withdrawal_paid',       -- Settlement: Deducts total_approved_earnings & reserved_balance, increases total_paid
    'admin_adjustment'       -- Manual adjustment with documented reason
  )),
  amount NUMERIC NOT NULL,
  balance_after NUMERIC NOT NULL,
  reference_type TEXT, -- 'withdrawal_request' | 'commission_record' | 'manual'
  reference_id TEXT,
  description TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. INDEXES FOR HIGH-SPEED QUERYING
CREATE INDEX IF NOT EXISTS idx_wallets_affiliate ON public.affiliate_wallets(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_affiliate ON public.withdrawal_requests(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON public.withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_req_number ON public.withdrawal_requests(request_number);
CREATE INDEX IF NOT EXISTS idx_ledger_affiliate ON public.wallet_ledger(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entry_type ON public.wallet_ledger(entry_type);

-- 7. ROW LEVEL SECURITY (RLS) POLICIES

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_ledger ENABLE ROW LEVEL SECURITY;

-- Helper function to verify admin status
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- admin_users: Only Admins can view/edit admin list
DROP POLICY IF EXISTS "Admins can view admin_users" ON public.admin_users;
CREATE POLICY "Admins can view admin_users" ON public.admin_users
FOR SELECT USING (auth.uid() = id OR public.is_admin());

-- payout_settings: Everyone can read settings, only Admins can update
DROP POLICY IF EXISTS "Public read payout_settings" ON public.payout_settings;
CREATE POLICY "Public read payout_settings" ON public.payout_settings
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins update payout_settings" ON public.payout_settings;
CREATE POLICY "Admins update payout_settings" ON public.payout_settings
FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- affiliate_wallets:
-- Affiliates can only view their own wallet
DROP POLICY IF EXISTS "Affiliates view own wallet" ON public.affiliate_wallets;
CREATE POLICY "Affiliates view own wallet" ON public.affiliate_wallets
FOR SELECT USING (auth.uid() = affiliate_id OR public.is_admin());

-- withdrawal_requests:
-- Affiliates can view their own withdrawal requests
DROP POLICY IF EXISTS "Affiliates view own withdrawal requests" ON public.withdrawal_requests;
CREATE POLICY "Affiliates view own withdrawal requests" ON public.withdrawal_requests
FOR SELECT USING (auth.uid() = affiliate_id OR public.is_admin());

-- Affiliates can insert their own withdrawal requests
DROP POLICY IF EXISTS "Affiliates create withdrawal requests" ON public.withdrawal_requests;
CREATE POLICY "Affiliates create withdrawal requests" ON public.withdrawal_requests
FOR INSERT WITH CHECK (auth.uid() = affiliate_id);

-- Admins can update withdrawal requests (approve, reject, processing, paid)
DROP POLICY IF EXISTS "Admins manage withdrawal requests" ON public.withdrawal_requests;
CREATE POLICY "Admins manage withdrawal requests" ON public.withdrawal_requests
FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- wallet_ledger:
-- Affiliates can view only their own ledger entries
DROP POLICY IF EXISTS "Affiliates view own ledger" ON public.wallet_ledger;
CREATE POLICY "Affiliates view own ledger" ON public.wallet_ledger
FOR SELECT USING (auth.uid() = affiliate_id OR public.is_admin());
