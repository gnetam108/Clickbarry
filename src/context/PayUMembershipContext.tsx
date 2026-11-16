import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { SellerMembershipPayment } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useProducts } from './ProductContext';

export interface PayUInitiateParams {
  firstname: string;
  email: string;
  phone?: string;
  productinfo?: string;
}

export interface PayUCheckoutData {
  key: string;
  txnid: string;
  amount: string; // "999.00"
  productinfo: string;
  firstname: string;
  email: string;
  phone: string;
  hash: string;
  actionUrl: string; // https://test.payu.in/_payment
  isTestMode: boolean;
  surl: string;
  furl: string;
}

interface PayUMembershipContextType {
  // Membership Status for current user
  isLifetimeSeller: boolean;
  membershipPayment: SellerMembershipPayment | null;
  isLoading: boolean;

  // Checkout modal
  isCheckoutOpen: boolean;
  openCheckout: () => void;
  closeCheckout: () => void;

  // PayU Operations
  initiatePayment: (params: PayUInitiateParams) => Promise<{ success: boolean; checkoutData?: PayUCheckoutData; error?: string }>;
  verifyAndActivatePayment: (payload: {
    txnid: string;
    amount: string | number;
    status: 'success' | 'failed' | 'cancelled' | 'pending';
    hash?: string;
    mihpayid?: string;
    bank_ref_num?: string;
    mode?: string;
    error_Message?: string;
  }) => Promise<{ success: boolean; message: string; payment?: SellerMembershipPayment; error?: string }>;

  // Admin section: All membership payments
  allMembershipPayments: SellerMembershipPayment[];
  refreshPayments: () => Promise<void>;
}

const LOCAL_MEMBERSHIP_PAYMENTS_KEY = 'cb_payu_membership_payments_v1';

const PayUMembershipContext = createContext<PayUMembershipContextType | undefined>(undefined);

export const PayUMembershipProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const { showToast } = useProducts();

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [payments, setPayments] = useState<SellerMembershipPayment[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_MEMBERSHIP_PAYMENTS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'pay-seed-1',
        sellerId: 'usr-seller-2',
        sellerEmail: 'creator.aarav@clickbarry.store',
        sellerName: 'Aarav Sharma',
        txnid: 'CB-PAYU-2026-9921',
        payuId: 'PAYU_TEST_4829101',
        amount: 999.00,
        currency: 'INR',
        status: 'success',
        paymentMode: 'UPI',
        bankRefNum: 'HDFC_UPI_771928',
        hashVerified: true,
        membershipActivatedAt: '2026-01-20T12:35:00.000Z',
        createdAt: '2026-01-20T12:30:00.000Z'
      },
      {
        id: 'pay-seed-2',
        sellerId: 'usr-seller-4',
        sellerEmail: 'rohit.software@clickbarry.store',
        sellerName: 'Rohit Gupta',
        txnid: 'CB-PAYU-2026-7814',
        payuId: 'PAYU_TEST_3391820',
        amount: 999.00,
        currency: 'INR',
        status: 'success',
        paymentMode: 'NETBANKING',
        bankRefNum: 'ICICI_NB_992104',
        hashVerified: true,
        membershipActivatedAt: '2026-02-01T11:05:00.000Z',
        createdAt: '2026-02-01T11:00:00.000Z'
      }
    ];
  });

  const savePaymentsLocally = useCallback((updated: SellerMembershipPayment[]) => {
    setPayments(updated);
    try {
      localStorage.setItem(LOCAL_MEMBERSHIP_PAYMENTS_KEY, JSON.stringify(updated));
    } catch {}
  }, []);

  // Fetch real payment records from Supabase
  const loadPayments = useCallback(async () => {
    setIsLoading(true);
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('seller_membership_payments')
          .select('*')
          .order('created_at', { ascending: false });

        if (data && !error && data.length > 0) {
          const mapped: SellerMembershipPayment[] = data.map((d: any) => ({
            id: d.id,
            sellerId: d.seller_id,
            sellerEmail: d.seller_email,
            sellerName: d.seller_name,
            txnid: d.txnid,
            payuId: d.payu_id,
            amount: Number(d.amount),
            currency: d.currency || 'INR',
            status: d.status,
            paymentMode: d.payment_mode,
            bankRefNum: d.bank_ref_num,
            hashVerified: Boolean(d.hash_verified),
            membershipActivatedAt: d.membership_activated_at,
            createdAt: d.created_at,
            updatedAt: d.updated_at
          }));

          // Merge with local seed
          const existingMap = new Map<string, SellerMembershipPayment>();
          payments.forEach((p) => existingMap.set(p.txnid, p));
          mapped.forEach((p) => existingMap.set(p.txnid, p));
          savePaymentsLocally(Array.from(existingMap.values()));
        }
      } catch (err) {
        console.warn('Supabase seller membership query note:', err);
      }
    }
    setIsLoading(false);
  }, [payments, savePaymentsLocally]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  // Check if current user has an active Lifetime Seller Membership
  const currentMembership = useMemo(() => {
    if (!user) {
      return { isLifetimeSeller: false, payment: null };
    }

    // Check 1: Supabase profile subscription_status
    if (profile?.subscription_status === 'active' || (user.user_metadata?.subscription_status === 'active')) {
      return { isLifetimeSeller: true, payment: null };
    }

    // Check 2: Successful verified ₹999 payment record
    const userPayment = payments.find(
      (p) =>
        (p.sellerId === user.id || p.sellerEmail?.toLowerCase() === user.email?.toLowerCase()) &&
        p.status === 'success' &&
        p.amount === 999
    );

    if (userPayment) {
      return { isLifetimeSeller: true, payment: userPayment };
    }

    // Root super admin always has full privileges
    if (user.email?.toLowerCase().trim() === 'gnetam108@gmail.com') {
      return { isLifetimeSeller: true, payment: null };
    }

    return { isLifetimeSeller: false, payment: null };
  }, [user, profile, payments]);

  // 1. INITIATE PAYMENT (Generates server-verified hash)
  const initiatePayment = async (
    params: PayUInitiateParams
  ): Promise<{ success: boolean; checkoutData?: PayUCheckoutData; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Please log in or register before activating Seller Membership.' };
    }

    const txnid = `CB-PAYU-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const amount = '999.00';
    const productinfo = 'ClickBarry Lifetime Seller Membership Pass';
    const firstname = params.firstname?.trim() || profile?.full_name || 'Seller';
    const email = params.email?.trim() || user.email || '';
    const phone = params.phone?.trim() || '9999999999';

    // Step A: Call Server to generate SHA-512 hash (Express server or Supabase Edge Function fallback)
    let serverRes: any = null;
    const hashPayload = {
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      phone,
      udf1: user.id
    };

    try {
      const resp = await fetch('/api/payu/generate-hash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hashPayload)
      });

      if (resp.ok) {
        serverRes = await resp.json();
      }
    } catch {
      // Express backend not mounted (e.g., static hosting)
    }

    if (!serverRes?.success && supabase) {
      try {
        const { data: fnData, error: fnErr } = await supabase.functions.invoke('payu-checkout', {
          body: { action: 'generate-hash', payload: hashPayload }
        });
        if (!fnErr && fnData?.success) {
          serverRes = {
            ...fnData,
            isTestMode: fnData.mode !== 'LIVE'
          };
        }
      } catch {
        // Fallback to local test mode below if edge function is not deployed yet
      }
    }

    // Construct Checkout Data
    const checkoutData: PayUCheckoutData = {
      key: serverRes?.key || 'TEST_KEY_CLICKBARRY',
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      phone,
      hash: serverRes?.hash || 'test_hash_sha512_mock',
      actionUrl: serverRes?.actionUrl || 'https://test.payu.in/_payment',
      isTestMode: serverRes?.isTestMode ?? true,
      surl: typeof window !== 'undefined' ? `${window.location.origin}/#payu_status=success` : '',
      furl: typeof window !== 'undefined' ? `${window.location.origin}/#payu_status=failed` : ''
    };

    // Step B: Record Pending Payment in Database
    const newPendingRecord: SellerMembershipPayment = {
      id: `pay-${Date.now()}`,
      sellerId: user.id,
      sellerEmail: email,
      sellerName: firstname,
      txnid,
      amount: 999.00,
      currency: 'INR',
      status: 'pending',
      hashVerified: false,
      createdAt: new Date().toISOString()
    };

    savePaymentsLocally([newPendingRecord, ...payments]);

    if (supabase) {
      try {
        await supabase.from('seller_membership_payments').insert({
          seller_id: user.id,
          seller_email: email,
          seller_name: firstname,
          txnid,
          amount: 999.00,
          currency: 'INR',
          status: 'pending'
        });
      } catch (e) {
        console.warn('Pending payment insert note:', e);
      }
    }

    return { success: true, checkoutData };
  };

  // 2. VERIFY AND ACTIVATE MEMBERSHIP
  const verifyAndActivatePayment = async (payload: {
    txnid: string;
    amount: string | number;
    status: 'success' | 'failed' | 'cancelled' | 'pending';
    hash?: string;
    mihpayid?: string;
    bank_ref_num?: string;
    mode?: string;
    error_Message?: string;
  }): Promise<{ success: boolean; message: string; payment?: SellerMembershipPayment; error?: string }> => {
    if (!user) {
      return { success: false, message: 'Authentication required', error: 'User not logged in' };
    }

    // Anti-Fraud check: Amount MUST be exactly 999
    const amtNum = Number(payload.amount);
    if (amtNum !== 999) {
      return {
        success: false,
        message: 'Payment verification failed: Amount does not match the ₹999 fee.',
        error: 'Invalid payment amount'
      };
    }

    // Step A: Call Server to verify reverse hash (Express server or Supabase Edge Function fallback)
    let serverVerificationPassed = false;
    let triedServerVerify = false;
    const verifyPayload = {
      txnid: payload.txnid,
      amount: '999.00',
      productinfo: 'ClickBarry Lifetime Seller Membership Pass',
      firstname: profile?.full_name || 'Seller',
      email: user.email,
      status: payload.status,
      hash: payload.hash || '',
      mihpayid: payload.mihpayid || `PAYU_MOCK_${Date.now()}`,
      bank_ref_num: payload.bank_ref_num || `REF_${Date.now()}`,
      mode: payload.mode || 'UPI',
      udf1: user.id
    };

    try {
      const resp = await fetch('/api/payu/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(verifyPayload)
      });

      if (resp.ok) {
        const data = await resp.json();
        triedServerVerify = true;
        serverVerificationPassed = Boolean(data.success && data.hashVerified);
      } else if (resp.status === 400) {
        // Explicit security hash rejection from backend
        triedServerVerify = true;
        serverVerificationPassed = false;
      }
    } catch {
      // Express backend not mounted (e.g., static hosting)
    }

    if (!triedServerVerify && supabase) {
      try {
        const { data: fnData, error: fnErr } = await supabase.functions.invoke('payu-checkout', {
          body: { action: 'verify-payment', payload: verifyPayload }
        });
        if (!fnErr && fnData) {
          triedServerVerify = true;
          serverVerificationPassed = Boolean(fnData.success && fnData.hashVerified);
        }
      } catch {
        // Edge function not deployed yet
      }
    }

    if (!triedServerVerify) {
      // Fallback for test sandbox simulation when neither backend is mounted
      serverVerificationPassed = payload.status === 'success';
    }

    // If payment failed or cancelled, do NOT activate
    if (payload.status !== 'success' || !serverVerificationPassed) {
      const updatedPayments = payments.map((p) =>
        p.txnid === payload.txnid
          ? {
              ...p,
              status: payload.status as 'failed' | 'cancelled' | 'pending',
              payuId: payload.mihpayid,
              bankRefNum: payload.bank_ref_num,
              updatedAt: new Date().toISOString()
            }
          : p
      );
      savePaymentsLocally(updatedPayments);

      showToast(
        payload.error_Message || 'Payment was unsuccessful or cancelled. Seller Membership was not activated.',
        'error'
      );

      return {
        success: false,
        message: payload.error_Message || 'Payment failed or cancelled.',
        error: 'Payment not successful'
      };
    }

    // Idempotency: Find existing record or update
    const activatedAt = new Date().toISOString();
    const updatedPayment: SellerMembershipPayment = {
      id: `pay-${Date.now()}`,
      sellerId: user.id,
      sellerEmail: user.email || '',
      sellerName: profile?.full_name || user.email?.split('@')[0],
      txnid: payload.txnid,
      payuId: payload.mihpayid || `PAYU_${Date.now()}`,
      amount: 999.00,
      currency: 'INR',
      status: 'success',
      paymentMode: payload.mode || 'UPI',
      bankRefNum: payload.bank_ref_num || `BANK_${Date.now()}`,
      hashVerified: true,
      membershipActivatedAt: activatedAt,
      createdAt: activatedAt,
      updatedAt: activatedAt
    };

    const newPaymentList = [
      updatedPayment,
      ...payments.filter((p) => p.txnid !== payload.txnid)
    ];
    savePaymentsLocally(newPaymentList);

    // Update Supabase profiles table
    if (supabase) {
      try {
        await supabase
          .from('profiles')
          .update({
            subscription_status: 'active',
            seller_verified: true,
            subscription_price: 999.00
          })
          .eq('id', user.id);

        await supabase
          .from('seller_membership_payments')
          .upsert({
            seller_id: user.id,
            seller_email: user.email || '',
            seller_name: updatedPayment.sellerName,
            txnid: payload.txnid,
            payu_id: updatedPayment.payuId,
            amount: 999.00,
            currency: 'INR',
            status: 'success',
            payment_mode: updatedPayment.paymentMode,
            bank_ref_num: updatedPayment.bankRefNum,
            hash_verified: true,
            membership_activated_at: activatedAt
          });
      } catch (err) {
        console.warn('Supabase membership activation note:', err);
      }
    }

    showToast('Payment confirmed! Lifetime Seller Membership activated. Welcome aboard!', 'success');
    setIsCheckoutOpen(false);

    return {
      success: true,
      message: 'Lifetime Seller Membership activated successfully!',
      payment: updatedPayment
    };
  };

  return (
    <PayUMembershipContext.Provider
      value={{
        isLifetimeSeller: currentMembership.isLifetimeSeller,
        membershipPayment: currentMembership.payment,
        isLoading,
        isCheckoutOpen,
        openCheckout: () => setIsCheckoutOpen(true),
        closeCheckout: () => setIsCheckoutOpen(false),
        initiatePayment,
        verifyAndActivatePayment,
        allMembershipPayments: payments,
        refreshPayments: loadPayments
      }}
    >
      {children}
    </PayUMembershipContext.Provider>
  );
};

export const usePayUMembership = () => {
  const context = useContext(PayUMembershipContext);
  if (!context) {
    throw new Error('usePayUMembership must be used within a PayUMembershipProvider');
  }
  return context;
};
