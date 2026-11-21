import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { MembershipStatus, SellerMembershipPayment } from '../types';
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
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  phone: string;
  hash: string;
  actionUrl: string;
  isTestMode: boolean;
  surl: string;
  furl: string;
}

interface PayUMembershipContextType {
  isLifetimeSeller: boolean;
  membershipStatus: MembershipStatus;
  membershipStatusLabel: 'Payment Pending' | 'Active' | 'Failed' | 'Refunded';
  isPaymentGatewayEnabled: boolean;
  membershipPayment: SellerMembershipPayment | null;
  isLoading: boolean;

  isCheckoutOpen: boolean;
  openCheckout: () => void;
  closeCheckout: () => void;

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

  allMembershipPayments: SellerMembershipPayment[];
  refreshPayments: () => Promise<void>;
}

// Keep payment execution strictly disabled until live server-side PayU verification is active
const PAYMENT_GATEWAY_ENABLED = false;

const PayUMembershipContext = createContext<PayUMembershipContextType | undefined>(undefined);

export const PayUMembershipProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, role } = useAuth();
  const { showToast } = useProducts();

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [payments, setPayments] = useState<SellerMembershipPayment[]>([]);

  // Fetch only real payment records from Supabase (zero seed/fake records)
  const loadPayments = useCallback(async () => {
    setIsLoading(true);
    if (!supabase || !user) {
      setPayments([]);
      setIsLoading(false);
      return;
    }

    try {
      const query =
        role === 'admin'
          ? supabase.from('seller_membership_payments').select('*').order('created_at', { ascending: false })
          : supabase
              .from('seller_membership_payments')
              .select('*')
              .eq('seller_id', user.id)
              .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (data && !error) {
        const mapped: SellerMembershipPayment[] = data.map((d: any) => ({
          id: d.id,
          sellerId: d.seller_id,
          sellerEmail: d.seller_email,
          sellerName: d.seller_name,
          txnid: d.txnid,
          payuId: d.payu_id,
          gatewayOrderId: d.gateway_order_id,
          gatewayPaymentId: d.gateway_payment_id,
          amount: Number(d.amount),
          currency: d.currency || 'INR',
          status: d.status,
          paymentMode: d.payment_mode,
          bankRefNum: d.bank_ref_num,
          hashVerified: Boolean(d.hash_verified),
          membershipActivatedAt: d.membership_activated_at,
          refundedAt: d.refunded_at,
          createdAt: d.created_at,
          updatedAt: d.updated_at
        }));
        setPayments(mapped);
      } else {
        setPayments([]);
      }
    } catch {
      setPayments([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, role]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  // Check if current user has a genuinely verified Lifetime Seller Membership & compute exact status
  const currentMembership = useMemo(() => {
    if (!user) {
      return {
        isLifetimeSeller: false,
        membershipStatus: 'none' as MembershipStatus,
        membershipStatusLabel: 'Payment Pending' as const,
        payment: null as SellerMembershipPayment | null
      };
    }

    const userPayments = payments.filter(
      (p) => p.sellerId === user.id || p.sellerEmail?.toLowerCase() === user.email?.toLowerCase()
    );
    const latestPayment = userPayments[0] || null;

    if (profile?.subscription_status === 'active') {
      const activePayment =
        userPayments.find((p) => p.status === 'success' && p.hashVerified && p.amount === 999) || latestPayment;
      return {
        isLifetimeSeller: true,
        membershipStatus: 'active' as MembershipStatus,
        membershipStatusLabel: 'Active' as const,
        payment: activePayment
      };
    }

    if (profile?.subscription_status === 'refunded' || latestPayment?.status === 'refunded') {
      return {
        isLifetimeSeller: false,
        membershipStatus: 'refunded' as MembershipStatus,
        membershipStatusLabel: 'Refunded' as const,
        payment: latestPayment
      };
    }

    if (profile?.subscription_status === 'failed' || latestPayment?.status === 'failed' || latestPayment?.status === 'cancelled') {
      return {
        isLifetimeSeller: false,
        membershipStatus: 'failed' as MembershipStatus,
        membershipStatusLabel: 'Failed' as const,
        payment: latestPayment
      };
    }

    const verifiedPayment = userPayments.find(
      (p) => p.status === 'success' && p.hashVerified && p.amount === 999
    );

    if (verifiedPayment) {
      return {
        isLifetimeSeller: true,
        membershipStatus: 'active' as MembershipStatus,
        membershipStatusLabel: 'Active' as const,
        payment: verifiedPayment
      };
    }

    const pendingStatus: MembershipStatus = profile?.subscription_status === 'pending' ? 'pending' : 'none';
    return {
      isLifetimeSeller: false,
      membershipStatus: pendingStatus,
      membershipStatusLabel: 'Payment Pending' as const,
      payment: latestPayment
    };
  }, [user, profile, payments]);

  // Disabled payment initiation until PayU server integration is enabled
  const initiatePayment = async (): Promise<{ success: boolean; checkoutData?: PayUCheckoutData; error?: string }> => {
    if (!PAYMENT_GATEWAY_ENABLED) {
      const msg = 'Payment integration is currently disabled. PayU gateway activation is pending.';
      showToast(msg, 'info');
      return { success: false, error: msg };
    }
    return { success: false, error: 'Payment integration disabled.' };
  };

  // Disabled client-side activation — never falsely activate membership without verified server confirmation
  const verifyAndActivatePayment = async (): Promise<{
    success: boolean;
    message: string;
    payment?: SellerMembershipPayment;
    error?: string;
  }> => {
    const msg = 'Payment verification is disabled until PayU server webhook integration is activated.';
    showToast(msg, 'error');
    return {
      success: false,
      message: msg,
      error: 'Payment gateway disabled'
    };
  };

  return (
    <PayUMembershipContext.Provider
      value={{
        isLifetimeSeller: currentMembership.isLifetimeSeller,
        membershipStatus: currentMembership.membershipStatus,
        membershipStatusLabel: currentMembership.membershipStatusLabel,
        isPaymentGatewayEnabled: PAYMENT_GATEWAY_ENABLED,
        membershipPayment: currentMembership.payment,
        isLoading,
        isCheckoutOpen,
        openCheckout: () => {
          if (role === 'affiliate') {
            showToast('Affiliate accounts are 100% FREE — Seller Membership is never required for Affiliates.', 'info');
            return;
          }
          setIsCheckoutOpen(true);
        },
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
