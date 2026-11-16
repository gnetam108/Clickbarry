import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  AffiliateWallet,
  WithdrawalRequest,
  WalletLedgerEntry,
  PayoutSettings,
  WalletNotification,
  WithdrawalStatus
} from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

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
  // Wallet info for authenticated affiliate
  wallet: AffiliateWallet;
  myWithdrawals: WithdrawalRequest[];
  ledgerEntries: WalletLedgerEntry[];
  notifications: WalletNotification[];
  unreadNotificationCount: number;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  // Withdrawal action
  submitWithdrawalRequest: (input: SubmitWithdrawalInput) => Promise<{ success: boolean; request?: WithdrawalRequest; error?: string }>;

  // Payout Settings
  settings: PayoutSettings;
  updateSettings: (newSettings: Partial<PayoutSettings>) => Promise<{ success: boolean; error?: string }>;

  // Admin Payout Management
  allWithdrawals: WithdrawalRequest[];
  adminUpdatePayout: (input: AdminUpdatePayoutInput) => Promise<{ success: boolean; error?: string }>;

  // Manual Ledger Credit (e.g. when a sale commission is approved)
  creditApprovedCommission: (affiliateId: string, amount: number, orderRef: string) => Promise<{ success: boolean; error?: string }>;

  // Loading & refresh
  isLoading: boolean;
  refreshWalletData: () => Promise<void>;
}

const DEFAULT_SETTINGS: PayoutSettings = {
  minWithdrawalAmount: 500,
  maxWithdrawalAmount: 100000,
  allowedPaymentMethods: ['upi', 'bank_transfer'],
  processingInfo: 'Withdrawals are processed manually by Admin via UPI or NEFT/IMPS every Tuesday within 24-48 business hours.',
  isWithdrawalsEnabled: true
};

const LOCAL_WALLET_PREFIX = 'cb_wallet_';
const LOCAL_WITHDRAWALS_KEY = 'cb_withdrawals_all_v1';
const LOCAL_LEDGER_KEY = 'cb_ledger_all_v1';
const LOCAL_SETTINGS_KEY = 'cb_payout_settings_v1';
const LOCAL_NOTIFS_KEY = 'cb_wallet_notifications_v1';

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [settings, setSettings] = useState<PayoutSettings>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_SETTINGS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_SETTINGS;
  });

  const [allWithdrawals, setAllWithdrawals] = useState<WithdrawalRequest[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_WITHDRAWALS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [ledgerEntries, setLedgerEntries] = useState<WalletLedgerEntry[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_LEDGER_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [notifications, setNotifications] = useState<WalletNotification[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_NOTIFS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [isLoading, setIsLoading] = useState(false);

  // Derive wallet balance from ledger & withdrawals for accuracy (Ledger authoritative)
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

    // Filter user's ledger entries
    const userLedger = ledgerEntries.filter((e) => e.affiliateId === user.id);

    // Sum approved earnings (credits)
    const approvedCredits = userLedger
      .filter((e) => e.entryType === 'commission_approved' || (e.entryType === 'admin_adjustment' && e.amount > 0))
      .reduce((sum, e) => sum + e.amount, 0);

    // Sum pending commissions
    const pendingCredits = userLedger
      .filter((e) => e.entryType === 'commission_pending')
      .reduce((sum, e) => sum + e.amount, 0);

    // Calculate active reserved balance from user's pending/approved/processing withdrawal requests
    const userWithdrawals = allWithdrawals.filter((w) => w.affiliateId === user.id);
    const reserved = userWithdrawals
      .filter((w) => w.status === 'pending' || w.status === 'approved' || w.status === 'processing')
      .reduce((sum, w) => sum + w.amount, 0);

    // Sum actually paid withdrawals
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
      totalPaid: totalPaid,
      lastUpdatedAt: new Date().toISOString()
    };
  }, [user, ledgerEntries, allWithdrawals]);

  // Affiliate's personal withdrawals
  const myWithdrawals = useMemo(() => {
    if (!user) return [];
    return allWithdrawals.filter((w) => w.affiliateId === user.id);
  }, [user, allWithdrawals]);

  // Sync to local storage
  const syncWithdrawals = (newList: WithdrawalRequest[]) => {
    setAllWithdrawals(newList);
    try {
      localStorage.setItem(LOCAL_WITHDRAWALS_KEY, JSON.stringify(newList));
    } catch {}
  };

  const syncLedger = (newList: WalletLedgerEntry[]) => {
    setLedgerEntries(newList);
    try {
      localStorage.setItem(LOCAL_LEDGER_KEY, JSON.stringify(newList));
    } catch {}
  };

  const syncNotifications = (newList: WalletNotification[]) => {
    setNotifications(newList);
    try {
      localStorage.setItem(LOCAL_NOTIFS_KEY, JSON.stringify(newList));
    } catch {}
  };

  // Fetch from Supabase if tables exist
  const refreshWalletData = useCallback(async () => {
    if (!supabase || !user) return;
    setIsLoading(true);

    try {
      // 1. Fetch settings
      const { data: setRes } = await supabase.from('payout_settings').select('*').limit(1).maybeSingle();
      if (setRes) {
        setSettings({
          minWithdrawalAmount: Number(setRes.min_withdrawal_amount) || 500,
          maxWithdrawalAmount: Number(setRes.max_withdrawal_amount) || 100000,
          allowedPaymentMethods: setRes.allowed_payment_methods || ['upi', 'bank_transfer'],
          processingInfo: setRes.processing_info,
          isWithdrawalsEnabled: Boolean(setRes.is_withdrawals_enabled)
        });
      }

      // 2. Fetch withdrawal requests
      const { data: wdrRes } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (wdrRes) {
        const mappedWdr: WithdrawalRequest[] = wdrRes.map((r: any) => ({
          id: r.id,
          requestNumber: r.request_number,
          affiliateId: r.affiliate_id,
          amount: Number(r.amount),
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
        }));
        syncWithdrawals(mappedWdr);
      }

      // 3. Fetch wallet ledger
      const { data: ledRes } = await supabase
        .from('wallet_ledger')
        .select('*')
        .order('created_at', { ascending: false });

      if (ledRes) {
        const mappedLed: WalletLedgerEntry[] = ledRes.map((r: any) => ({
          id: r.id,
          affiliateId: r.affiliate_id,
          entryType: r.entry_type,
          amount: Number(r.amount),
          balanceAfter: Number(r.balance_after),
          referenceType: r.reference_type,
          referenceId: r.reference_id,
          description: r.description,
          createdAt: r.created_at
        }));
        syncLedger(mappedLed);
      }
    } catch (err) {
      console.warn('Wallet data sync note (using local ledger):', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      refreshWalletData();
    }
  }, [user, refreshWalletData]);

  // Credit approved commission from confirmed sales
  const creditApprovedCommission = async (
    affiliateId: string,
    amount: number,
    orderRef: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (amount <= 0) return { success: false, error: 'Amount must be positive' };

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

    if (supabase) {
      try {
        await supabase.from('wallet_ledger').insert({
          affiliate_id: affiliateId,
          entry_type: 'commission_approved',
          amount,
          balance_after: newLedgerEntry.balanceAfter,
          reference_type: 'commission_record',
          reference_id: orderRef,
          description: newLedgerEntry.description
        });
      } catch {}
    }

    syncLedger([newLedgerEntry, ...ledgerEntries]);
    return { success: true };
  };

  // SUBMIT WITHDRAWAL REQUEST (Affiliate action)
  const submitWithdrawalRequest = async (
    input: SubmitWithdrawalInput
  ): Promise<{ success: boolean; request?: WithdrawalRequest; error?: string }> => {
    if (!user) {
      return { success: false, error: 'User must be authenticated to request withdrawal' };
    }

    if (!settings.isWithdrawalsEnabled) {
      return { success: false, error: 'Withdrawals are currently paused for maintenance by Admin.' };
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
        error: `Insufficient available balance! You have ₹${wallet.availableBalance} available. (Pending or reserved funds cannot be withdrawn).`
      };
    }

    // Validate payment method details
    if (input.paymentMethod === 'upi') {
      const upi = input.upiId?.trim();
      if (!upi || !upi.includes('@')) {
        return { success: false, error: 'Please enter a valid UPI ID (e.g., yourname@okhdfcbank or 9876543210@paytm).' };
      }
    } else if (input.paymentMethod === 'bank_transfer') {
      if (!input.accountHolderName?.trim()) {
        return { success: false, error: 'Please enter Account Holder Name.' };
      }
      if (!input.bankAccountNumber?.trim() || input.bankAccountNumber.trim().length < 8) {
        return { success: false, error: 'Please enter a valid Bank Account Number.' };
      }
      if (!input.ifscCode?.trim() || input.ifscCode.trim().length < 9) {
        return { success: false, error: 'Please enter a valid 11-digit IFSC Code.' };
      }
    }

    const reqNumber = `WDR-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    const newRequest: WithdrawalRequest = {
      id: `wdr-${Date.now()}`,
      requestNumber: reqNumber,
      affiliateId: user.id,
      affiliateEmail: user.email,
      affiliateName: user.user_metadata?.full_name || user.email?.split('@')[0],
      amount: amt,
      paymentMethod: input.paymentMethod,
      upiId: input.paymentMethod === 'upi' ? input.upiId?.trim() : undefined,
      accountHolderName: input.paymentMethod === 'bank_transfer' ? input.accountHolderName?.trim() : undefined,
      bankAccountNumber: input.paymentMethod === 'bank_transfer' ? input.bankAccountNumber?.trim() : undefined,
      ifscCode: input.paymentMethod === 'bank_transfer' ? input.ifscCode?.trim().toUpperCase() : undefined,
      bankName: input.bankName?.trim() || undefined,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Ledger accounting: Reserve the requested funds
    const ledgerEntry: WalletLedgerEntry = {
      id: `led-${Date.now()}`,
      affiliateId: user.id,
      entryType: 'withdrawal_reserved',
      amount: amt,
      balanceAfter: wallet.availableBalance - amt,
      referenceType: 'withdrawal_request',
      referenceId: reqNumber,
      description: `Funds reserved for Withdrawal Request #${reqNumber} (${input.paymentMethod.toUpperCase()})`,
      createdAt: new Date().toISOString()
    };

    // Notification for affiliate
    const notif: WalletNotification = {
      id: `notif-${Date.now()}`,
      affiliateId: user.id,
      requestId: newRequest.id,
      requestNumber: reqNumber,
      title: 'Withdrawal Request Submitted',
      message: `Your request for ₹${amt} via ${input.paymentMethod.toUpperCase()} has been submitted. Funds are reserved pending Admin review.`,
      status: 'pending',
      createdAt: new Date().toISOString(),
      read: false
    };

    // Supabase insert if available
    if (supabase) {
      try {
        await supabase.from('withdrawal_requests').insert({
          request_number: reqNumber,
          affiliate_id: user.id,
          amount: amt,
          payment_method: input.paymentMethod,
          upi_id: newRequest.upiId,
          account_holder_name: newRequest.accountHolderName,
          bank_account_number: newRequest.bankAccountNumber,
          ifsc_code: newRequest.ifscCode,
          bank_name: newRequest.bankName,
          status: 'pending'
        });

        await supabase.from('wallet_ledger').insert({
          affiliate_id: user.id,
          entry_type: 'withdrawal_reserved',
          amount: amt,
          balance_after: ledgerEntry.balanceAfter,
          reference_type: 'withdrawal_request',
          reference_id: reqNumber,
          description: ledgerEntry.description
        });
      } catch (err) {
        console.warn('Supabase withdrawal save note:', err);
      }
    }

    syncWithdrawals([newRequest, ...allWithdrawals]);
    syncLedger([ledgerEntry, ...ledgerEntries]);
    syncNotifications([notif, ...notifications]);

    return { success: true, request: newRequest };
  };

  // ADMIN UPDATE PAYOUT (Admin action)
  const adminUpdatePayout = async (
    input: AdminUpdatePayoutInput
  ): Promise<{ success: boolean; error?: string }> => {
    const target = allWithdrawals.find((w) => w.id === input.requestId);
    if (!target) {
      return { success: false, error: 'Withdrawal request not found.' };
    }

    // Prevent duplicate payouts
    if (target.status === 'paid') {
      return { success: false, error: 'This request has already been marked as Paid. Duplicate payouts are strictly prohibited.' };
    }

    if (input.status === 'paid' && !input.transactionReference?.trim()) {
      return { success: false, error: 'Transaction Reference (UPI Ref ID or Bank UTR number) is required to mark request as Paid.' };
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
    let notifTitle = '';
    let notifMsg = '';

    // Ledger accounting rules:
    if (input.status === 'paid') {
      // Final settlement: Fund deduction from wallet
      ledgerDelta = {
        id: `led-${Date.now()}`,
        affiliateId: target.affiliateId,
        entryType: 'withdrawal_paid',
        amount: target.amount,
        balanceAfter: wallet.availableBalance, // already reserved, so available balance remains accurate
        referenceType: 'withdrawal_request',
        referenceId: target.requestNumber,
        description: `Withdrawal Paid: Ref ${input.transactionReference || 'N/A'}. Deducted from reserved balance.`,
        createdAt: nowIso
      };

      notifTitle = 'Withdrawal Payment Completed! 🎉';
      notifMsg = `₹${target.amount} has been paid via ${target.paymentMethod.toUpperCase()}. UTR / Ref: ${input.transactionReference}.`;
    } else if (input.status === 'rejected' && oldStatus !== 'rejected') {
      // Release reserved funds back to available balance
      ledgerDelta = {
        id: `led-${Date.now()}`,
        affiliateId: target.affiliateId,
        entryType: 'withdrawal_released',
        amount: target.amount,
        balanceAfter: wallet.availableBalance + target.amount,
        referenceType: 'withdrawal_request',
        referenceId: target.requestNumber,
        description: `Withdrawal Rejected: Funds released back to available balance. Reason: ${input.rejectionReason || 'Declined by Admin'}`,
        createdAt: nowIso
      };

      notifTitle = 'Withdrawal Request Rejected';
      notifMsg = `Your request #${target.requestNumber} for ₹${target.amount} was rejected. Funds have been returned to your wallet. Reason: ${input.rejectionReason || 'Please contact support'}`;
    } else if (input.status === 'approved') {
      notifTitle = 'Withdrawal Request Approved';
      notifMsg = `Your request #${target.requestNumber} for ₹${target.amount} is approved and scheduled for payout.`;
    } else if (input.status === 'processing') {
      notifTitle = 'Payment In Processing';
      notifMsg = `Admin is actively processing payout #${target.requestNumber} via ${target.paymentMethod.toUpperCase()}. UTR will be updated shortly.`;
    }

    // Save to Supabase
    if (supabase) {
      try {
        await supabase
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
      } catch (err) {
        console.warn('Supabase admin payout update note:', err);
      }
    }

    // Update local state
    const nextWithdrawals = allWithdrawals.map((w) => (w.id === target.id ? updatedRequest : w));
    syncWithdrawals(nextWithdrawals);

    if (ledgerDelta) {
      syncLedger([ledgerDelta, ...ledgerEntries]);
    }

    if (notifTitle) {
      const newNotif: WalletNotification = {
        id: `notif-${Date.now()}`,
        affiliateId: target.affiliateId,
        requestId: target.id,
        requestNumber: target.requestNumber,
        title: notifTitle,
        message: notifMsg,
        status: input.status,
        adminRemarks: input.adminRemarks,
        transactionReference: input.transactionReference,
        createdAt: nowIso,
        read: false
      };
      syncNotifications([newNotif, ...notifications]);
    }

    return { success: true };
  };

  // UPDATE SETTINGS (Admin action)
  const updateSettings = async (
    newSettings: Partial<PayoutSettings>
  ): Promise<{ success: boolean; error?: string }> => {
    const merged: PayoutSettings = { ...settings, ...newSettings };
    setSettings(merged);
    try {
      localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(merged));
    } catch {}

    if (supabase) {
      try {
        await supabase.from('payout_settings').upsert({
          id: 'default',
          min_withdrawal_amount: merged.minWithdrawalAmount,
          max_withdrawal_amount: merged.maxWithdrawalAmount,
          allowed_payment_methods: merged.allowedPaymentMethods,
          processing_info: merged.processingInfo,
          is_withdrawals_enabled: merged.isWithdrawalsEnabled,
          updated_at: new Date().toISOString()
        });
      } catch {}
    }

    return { success: true };
  };

  // Notification helpers
  const markNotificationRead = (id: string) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    syncNotifications(updated);
  };

  const markAllNotificationsRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    syncNotifications(updated);
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
