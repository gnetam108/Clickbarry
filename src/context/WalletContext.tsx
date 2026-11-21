import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  AffiliateWallet,
  WithdrawalRequest,
  WalletLedgerEntry,
  PayoutSettings,
  WalletNotification
} from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { calculateWithdrawalBreakdown } from '../lib/fees';

export interface SubmitWithdrawalInput {
  amount: number;
  paymentMethod: 'upi' | 'bank_transfer';
  upiId?: string;
  accountHolderName?: string;
  bankAccountNumber?: string;
  ifscCode?: string;
  bankName?: string;
}

export interface AdminUpdatePayoutInput {
  requestId: string;
  status: 'approved' | 'processing' | 'paid' | 'rejected';
  adminRemarks?: string;
  rejectionReason?: string;
  transactionReference?: string;
  paymentProofUrl?: string;
}

interface WalletContextType {
  wallet: AffiliateWallet;
  myWithdrawals: WithdrawalRequest[];
  ledgerEntries: WalletLedgerEntry[];
  notifications: WalletNotification[];
  unreadNotificationCount: number;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  submitWithdrawalRequest: (input: SubmitWithdrawalInput) => Promise<{ success: boolean; request?: WithdrawalRequest; error?: string }>;
  settings: PayoutSettings;
  updateSettings: (newSettings: Partial<PayoutSettings>) => Promise<{ success: boolean; error?: string }>;
  allWithdrawals: WithdrawalRequest[];
  adminUpdatePayout: (input: AdminUpdatePayoutInput) => Promise<{ success: boolean; error?: string }>;
  creditApprovedCommission: (affiliateId: string, amount: number, orderRef: string) => Promise<{ success: boolean; error?: string }>;
  isLoading: boolean;
  refreshWalletData: () => Promise<void>;
}

const DEFAULT_SETTINGS: PayoutSettings = {
  minWithdrawalAmount: 500,
  maxWithdrawalAmount: 100000,
  withdrawalFeePercentage: 5,
  allowedPaymentMethods: ['upi', 'bank_transfer'],
  processingInfo: 'Withdrawals carry a 5% ClickBarry platform fee and are processed manually by Admin via UPI or NEFT/IMPS within 24-48 business hours.',
  isWithdrawalsEnabled: true
};

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin } = useAuth();

  const [settings, setSettings] = useState<PayoutSettings>(DEFAULT_SETTINGS);
  const [allWithdrawals, setAllWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<WalletLedgerEntry[]>([]);
  const [notifications, setNotifications] = useState<WalletNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Reset wallet state when user signs out
  useEffect(() => {
    if (!user) {
      setAllWithdrawals([]);
      setLedgerEntries([]);
      setNotifications([]);
    }
  }, [user]);

  const wallet: AffiliateWallet = useMemo(() => {
    if (!user) {
      return {
        affiliateId: '',
        totalApprovedEarnings: 0,
        pendingCommission: 0,
        reservedBalance: 0,
        availableBalance: 0,
        totalWithdrawn: 0,
        totalPaid: 0,
        lastUpdatedAt: new Date().toISOString()
      };
    }

    const userLedger = ledgerEntries.filter((e) => e.affiliateId === user.id);

    const approvedCredits = userLedger
      .filter((e) => e.entryType === 'commission_approved' || (e.entryType === 'admin_adjustment' && e.amount > 0))
      .reduce((sum, e) => sum + e.amount, 0);

    const pendingCredits = userLedger
      .filter((e) => e.entryType === 'commission_pending')
      .reduce((sum, e) => sum + e.amount, 0);

    const userWithdrawals = allWithdrawals.filter((w) => w.affiliateId === user.id);
    const reserved = userWithdrawals
      .filter((w) => w.status === 'pending' || w.status === 'approved' || w.status === 'processing')
      .reduce((sum, w) => sum + w.amount, 0);

    const totalPaid = userWithdrawals
      .filter((w) => w.status === 'paid')
      .reduce((sum, w) => sum + w.amount, 0);

    const available = Math.max(0, approvedCredits - reserved - totalPaid);

    return {
      affiliateId: user.id,
      totalApprovedEarnings: approvedCredits,
      pendingCommission: pendingCredits,
      reservedBalance: reserved,
      availableBalance: available,
      totalWithdrawn: totalPaid,
      totalPaid,
      lastUpdatedAt: new Date().toISOString()
    };
  }, [user, ledgerEntries, allWithdrawals]);

  const myWithdrawals = useMemo(() => {
    if (!user) return [];
    return allWithdrawals.filter((w) => w.affiliateId === user.id);
  }, [user, allWithdrawals]);

  const refreshWalletData = useCallback(async () => {
    if (!supabase || !user) return;
    setIsLoading(true);

    try {
      const [{ data: setRes }, { data: webSetRes }] = await Promise.all([
        supabase.from('payout_settings').select('*').limit(1).maybeSingle(),
        supabase.from('website_settings').select('withdrawal_fee_percentage').eq('id', 'clickbarry_main').maybeSingle()
      ]);

      const resolvedFeePct = Number(
        (webSetRes as any)?.withdrawal_fee_percentage ?? (setRes as any)?.withdrawal_fee_percentage ?? 5
      );

      if (setRes) {
        setSettings({
          minWithdrawalAmount: Number(setRes.min_withdrawal_amount) || 500,
          maxWithdrawalAmount: Number(setRes.max_withdrawal_amount) || 100000,
          withdrawalFeePercentage: resolvedFeePct,
          allowedPaymentMethods: setRes.allowed_payment_methods || ['upi', 'bank_transfer'],
          processingInfo: setRes.processing_info || DEFAULT_SETTINGS.processingInfo,
          isWithdrawalsEnabled: Boolean(setRes.is_withdrawals_enabled)
        });
      }

      const wdrQuery = isAdmin
        ? supabase.from('withdrawal_requests').select('*').order('created_at', { ascending: false })
        : supabase
            .from('withdrawal_requests')
            .select('*')
            .eq('affiliate_id', user.id)
            .order('created_at', { ascending: false });

      const ledQuery = isAdmin
        ? supabase.from('wallet_ledger').select('*').order('created_at', { ascending: false })
        : supabase
            .from('wallet_ledger')
            .select('*')
            .eq('affiliate_id', user.id)
            .order('created_at', { ascending: false });

      const [wdrRes, ledRes] = await Promise.all([wdrQuery, ledQuery]);

      if (wdrRes.data && !wdrRes.error) {
        setAllWithdrawals(
          wdrRes.data.map((r: any) => {
            const amt = Number(r.amount);
            const feePct = Number(r.platform_fee_pct ?? resolvedFeePct ?? 5);
            const calc = calculateWithdrawalBreakdown(amt, feePct);
            return {
              id: r.id,
              requestNumber: r.request_number,
              affiliateId: r.affiliate_id,
              amount: amt,
              platformFeePct: feePct,
              platformFeeAmount: r.platform_fee_amount !== undefined && r.platform_fee_amount !== null ? Number(r.platform_fee_amount) : calc.feeAmount,
              netPayableAmount: r.net_payable_amount !== undefined && r.net_payable_amount !== null && Number(r.net_payable_amount) > 0 ? Number(r.net_payable_amount) : calc.netPayable,
              paymentMethod: r.payment_method,
              upiId: r.upi_id,
              accountHolderName: r.account_holder_name,
              bankAccountNumber: r.bank_account_number,
              ifscCode: r.ifsc_code,
              bankName: r.bank_name,
              status: r.status,
              adminRemarks: r.admin_remarks,
              rejectionReason: r.rejection_reason,
              transactionReference: r.transaction_reference,
              paymentProofUrl: r.payment_proof_url,
              processedBy: r.processed_by,
              processedAt: r.processed_at,
              createdAt: r.created_at,
              updatedAt: r.updated_at
            };
          })
        );
      }

      if (ledRes.data && !ledRes.error) {
        setLedgerEntries(
          ledRes.data.map((r: any) => ({
            id: r.id,
            affiliateId: r.affiliate_id,
            entryType: r.entry_type,
            amount: Number(r.amount),
            balanceAfter: Number(r.balance_after),
            referenceType: r.reference_type,
            referenceId: r.reference_id,
            description: r.description,
            createdAt: r.created_at
          }))
        );
      }
    } catch (err) {
      console.warn('Wallet data sync note:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    if (user) {
      refreshWalletData();
    }
  }, [user, refreshWalletData]);

  const creditApprovedCommission = async (
    affiliateId: string,
    amount: number,
    orderRef: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!isAdmin) return { success: false, error: 'Only Admin can credit approved commissions.' };
    if (amount <= 0) return { success: false, error: 'Amount must be positive' };
    if (!supabase) return { success: false, error: 'Database unavailable' };

    const newLedgerEntry: WalletLedgerEntry = {
      id: `led-${Date.now()}`,
      affiliateId,
      entryType: 'commission_approved',
      amount,
      balanceAfter: wallet.availableBalance + amount,
      referenceType: 'commission_record',
      referenceId: orderRef,
      description: `Affiliate Commission approved for Order #${orderRef}`,
      createdAt: new Date().toISOString()
    };

    try {
      const { error } = await supabase.from('wallet_ledger').insert({
        affiliate_id: affiliateId,
        entry_type: 'commission_approved',
        amount,
        balance_after: newLedgerEntry.balanceAfter,
        reference_type: 'commission_record',
        reference_id: orderRef,
        description: newLedgerEntry.description
      });
      if (error) return { success: false, error: error.message };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to credit commission' };
    }

    setLedgerEntries((prev) => [newLedgerEntry, ...prev]);
    return { success: true };
  };

  const submitWithdrawalRequest = async (
    input: SubmitWithdrawalInput
  ): Promise<{ success: boolean; request?: WithdrawalRequest; error?: string }> => {
    if (!user) {
      return { success: false, error: 'User must be authenticated to request withdrawal' };
    }

    if (!settings.isWithdrawalsEnabled) {
      return { success: false, error: 'Withdrawals are currently paused by Admin.' };
    }

    const amt = Number(input.amount);
    if (isNaN(amt) || amt <= 0) {
      return { success: false, error: 'Please enter a valid withdrawal amount.' };
    }

    if (amt < settings.minWithdrawalAmount) {
      return { success: false, error: `Minimum withdrawal amount is ₹${settings.minWithdrawalAmount}.` };
    }

    if (amt > settings.maxWithdrawalAmount) {
      return { success: false, error: `Maximum withdrawal limit is ₹${settings.maxWithdrawalAmount} per transaction.` };
    }

    if (amt > wallet.availableBalance) {
      return {
        success: false,
        error: `Insufficient available balance. You have ₹${wallet.availableBalance} available.`
      };
    }

    if (input.paymentMethod === 'upi') {
      const upi = input.upiId?.trim();
      if (!upi || !upi.includes('@')) {
        return { success: false, error: 'Please enter a valid UPI ID (e.g., name@okhdfcbank).' };
      }
    } else if (input.paymentMethod === 'bank_transfer') {
      if (!input.accountHolderName?.trim()) return { success: false, error: 'Please enter Account Holder Name.' };
      if (!input.bankAccountNumber?.trim() || input.bankAccountNumber.trim().length < 8) {
        return { success: false, error: 'Please enter a valid Bank Account Number.' };
      }
      if (!input.ifscCode?.trim() || input.ifscCode.trim().length < 9) {
        return { success: false, error: 'Please enter a valid IFSC Code.' };
      }
    }

    if (!supabase) return { success: false, error: 'Database unavailable' };

    const reqNumber = `WDR-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const nowIso = new Date().toISOString();
    const feeBreakdown = calculateWithdrawalBreakdown(amt, settings.withdrawalFeePercentage ?? 5);

    const newRequest: WithdrawalRequest = {
      id: `wdr-${Date.now()}`,
      requestNumber: reqNumber,
      affiliateId: user.id,
      affiliateEmail: user.email,
      affiliateName: user.user_metadata?.full_name || user.email?.split('@')[0],
      amount: feeBreakdown.grossAmount,
      platformFeePct: feeBreakdown.feePct,
      platformFeeAmount: feeBreakdown.feeAmount,
      netPayableAmount: feeBreakdown.netPayable,
      paymentMethod: input.paymentMethod,
      upiId: input.paymentMethod === 'upi' ? input.upiId?.trim() : undefined,
      accountHolderName: input.paymentMethod === 'bank_transfer' ? input.accountHolderName?.trim() : undefined,
      bankAccountNumber: input.paymentMethod === 'bank_transfer' ? input.bankAccountNumber?.trim() : undefined,
      ifscCode: input.paymentMethod === 'bank_transfer' ? input.ifscCode?.trim().toUpperCase() : undefined,
      bankName: input.bankName?.trim() || undefined,
      status: 'pending',
      createdAt: nowIso,
      updatedAt: nowIso
    };

    const ledgerEntry: WalletLedgerEntry = {
      id: `led-${Date.now()}`,
      affiliateId: user.id,
      entryType: 'withdrawal_reserved',
      amount: feeBreakdown.grossAmount,
      balanceAfter: Math.max(0, wallet.availableBalance - feeBreakdown.grossAmount),
      referenceType: 'withdrawal_request',
      referenceId: reqNumber,
      description: `Reserved ₹${feeBreakdown.grossAmount} for Payout #${reqNumber} (${feeBreakdown.feePct}% fee: ₹${feeBreakdown.feeAmount}, Net Payable: ₹${feeBreakdown.netPayable})`,
      createdAt: nowIso
    };

    try {
      const insertPayload: any = {
        request_number: reqNumber,
        affiliate_id: user.id,
        amount: feeBreakdown.grossAmount,
        platform_fee_pct: feeBreakdown.feePct,
        platform_fee_amount: feeBreakdown.feeAmount,
        net_payable_amount: feeBreakdown.netPayable,
        payment_method: input.paymentMethod,
        upi_id: newRequest.upiId,
        account_holder_name: newRequest.accountHolderName,
        bank_account_number: newRequest.bankAccountNumber,
        ifsc_code: newRequest.ifscCode,
        bank_name: newRequest.bankName,
        status: 'pending'
      };

      let { data: insertedReq, error: wdrErr } = await supabase
        .from('withdrawal_requests')
        .insert(insertPayload)
        .select()
        .single();

      if (wdrErr && wdrErr.message?.includes('platform_fee')) {
        // Fallback if phase 9 columns aren't migrated yet
        delete insertPayload.platform_fee_pct;
        delete insertPayload.platform_fee_amount;
        delete insertPayload.net_payable_amount;
        const retry = await supabase.from('withdrawal_requests').insert(insertPayload).select().single();
        insertedReq = retry.data;
        wdrErr = retry.error;
      }

      if (wdrErr) return { success: false, error: wdrErr.message };
      if (insertedReq) newRequest.id = insertedReq.id;

      await supabase.from('wallet_ledger').insert({
        affiliate_id: user.id,
        entry_type: 'withdrawal_reserved',
        amount: feeBreakdown.grossAmount,
        balance_after: ledgerEntry.balanceAfter,
        reference_type: 'withdrawal_request',
        reference_id: reqNumber,
        description: ledgerEntry.description
      });
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to submit withdrawal request' };
    }

    setAllWithdrawals((prev) => [newRequest, ...prev]);
    setLedgerEntries((prev) => [ledgerEntry, ...prev]);
    return { success: true, request: newRequest };
  };

  const adminUpdatePayout = async (
    input: AdminUpdatePayoutInput
  ): Promise<{ success: boolean; error?: string }> => {
    if (!isAdmin) return { success: false, error: 'Unauthorized: Admin privileges required.' };

    const target = allWithdrawals.find((w) => w.id === input.requestId);
    if (!target) return { success: false, error: 'Withdrawal request not found.' };

    if (target.status === 'paid') {
      return { success: false, error: 'This request has already been marked as Paid.' };
    }

    if (input.status === 'paid' && !input.transactionReference?.trim()) {
      return { success: false, error: 'Transaction Reference (UPI Ref ID or Bank UTR) is required.' };
    }

    const oldStatus = target.status;
    const nowIso = new Date().toISOString();

    const updatedRequest: WithdrawalRequest = {
      ...target,
      status: input.status,
      adminRemarks: input.adminRemarks?.trim() || target.adminRemarks,
      rejectionReason: input.status === 'rejected' ? input.rejectionReason?.trim() : target.rejectionReason,
      transactionReference: input.transactionReference?.trim() || target.transactionReference,
      paymentProofUrl: input.paymentProofUrl?.trim() || target.paymentProofUrl,
      processedBy: user?.id,
      processedAt: nowIso,
      updatedAt: nowIso
    };

    let ledgerDelta: WalletLedgerEntry | null = null;
    if (input.status === 'paid') {
      ledgerDelta = {
        id: `led-${Date.now()}`,
        affiliateId: target.affiliateId,
        entryType: 'withdrawal_paid',
        amount: target.amount,
        balanceAfter: wallet.availableBalance,
        referenceType: 'withdrawal_request',
        referenceId: target.requestNumber,
        description: `Withdrawal Paid: Ref ${input.transactionReference || 'N/A'}.`,
        createdAt: nowIso
      };
    } else if (input.status === 'rejected' && oldStatus !== 'rejected') {
      ledgerDelta = {
        id: `led-${Date.now()}`,
        affiliateId: target.affiliateId,
        entryType: 'withdrawal_released',
        amount: target.amount,
        balanceAfter: wallet.availableBalance + target.amount,
        referenceType: 'withdrawal_request',
        referenceId: target.requestNumber,
        description: `Withdrawal Rejected: Funds released. Reason: ${input.rejectionReason || 'Declined by Admin'}`,
        createdAt: nowIso
      };
    }

    if (supabase) {
      try {
        const { error } = await supabase
          .from('withdrawal_requests')
          .update({
            status: input.status,
            admin_remarks: updatedRequest.adminRemarks,
            rejection_reason: updatedRequest.rejectionReason,
            transaction_reference: updatedRequest.transactionReference,
            payment_proof_url: updatedRequest.paymentProofUrl,
            processed_by: user?.id,
            processed_at: nowIso,
            updated_at: nowIso
          })
          .eq('id', target.id);

        if (error) return { success: false, error: error.message };

        if (ledgerDelta) {
          await supabase.from('wallet_ledger').insert({
            affiliate_id: target.affiliateId,
            entry_type: ledgerDelta.entryType,
            amount: ledgerDelta.amount,
            balance_after: ledgerDelta.balanceAfter,
            reference_type: 'withdrawal_request',
            reference_id: target.requestNumber,
            description: ledgerDelta.description
          });
        }

        // Record ClickBarry 5% platform fee entry when payout is completed
        if (input.status === 'paid' && target.platformFeeAmount > 0) {
          try {
            await supabase.from('platform_fees').insert({
              source_type: 'affiliate_withdrawal_fee',
              reference_id: target.requestNumber,
              user_id: target.affiliateId,
              gross_amount: target.amount,
              fee_percentage: target.platformFeePct || 5,
              fee_amount: target.platformFeeAmount,
              net_amount: target.netPayableAmount,
              notes: `5% Withdrawal fee on Payout #${target.requestNumber} (UTR: ${input.transactionReference})`
            });
          } catch {}
        }
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to update payout' };
      }
    }

    setAllWithdrawals((prev) => prev.map((w) => (w.id === target.id ? updatedRequest : w)));
    if (ledgerDelta) setLedgerEntries((prev) => [ledgerDelta!, ...prev]);
    return { success: true };
  };

  const updateSettings = async (
    newSettings: Partial<PayoutSettings>
  ): Promise<{ success: boolean; error?: string }> => {
    if (!isAdmin) return { success: false, error: 'Unauthorized: Admin only.' };
    const merged: PayoutSettings = { ...settings, ...newSettings };
    setSettings(merged);

    if (supabase) {
      try {
        await supabase.from('payout_settings').upsert({
          id: 'default',
          min_withdrawal_amount: merged.minWithdrawalAmount,
          max_withdrawal_amount: merged.maxWithdrawalAmount,
          withdrawal_fee_percentage: merged.withdrawalFeePercentage ?? 5,
          allowed_payment_methods: merged.allowedPaymentMethods,
          processing_info: merged.processingInfo,
          is_withdrawals_enabled: merged.isWithdrawalsEnabled,
          updated_at: new Date().toISOString()
        });
      } catch {}
    }

    return { success: true };
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadNotificationCount = useMemo(() => {
    if (!user) return 0;
    return notifications.filter((n) => n.affiliateId === user.id && !n.read).length;
  }, [user, notifications]);

  return (
    <WalletContext.Provider
      value={{
        wallet,
        myWithdrawals,
        ledgerEntries,
        notifications,
        unreadNotificationCount,
        markNotificationRead,
        markAllNotificationsRead,
        submitWithdrawalRequest,
        settings,
        updateSettings,
        allWithdrawals,
        adminUpdatePayout,
        creditApprovedCommission,
        isLoading,
        refreshWalletData
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
