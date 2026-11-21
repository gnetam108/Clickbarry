import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  ReferralRecord,
  ReferralCommissionRecord,
  ReferralFraudLogRecord,
  ReferralBonusStatus,
  MembershipStatus,
  UserRole
} from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { buildReferralUrl, isValidReferralCodeFormat } from '../lib/fees';

export const REFERRER_CODE_STORAGE_KEY = 'cb_referrer_code_v1';
const REFERRER_COOKIE_NAME = 'cb_ref_code';

interface ReferralContextType {
  myReferralCode: string;
  myReferralLink: string;
  capturedReferrerCode: string | null;
  myReferrals: ReferralRecord[];
  referredAffiliates: ReferralRecord[];
  referredSellers: ReferralRecord[];
  totalReferredAffiliates: number;
  totalReferredSellers: number;
  myReferralCommissions: ReferralCommissionRecord[];
  allReferrals: ReferralRecord[];
  allReferralCommissions: ReferralCommissionRecord[];
  fraudLogs: ReferralFraudLogRecord[];
  totalReferralEarnings: number;
  pendingReferralEarnings: number;
  approvedReferralEarnings: number;
  paidReferralEarnings: number;
  reversedReferralEarnings: number;
  sellerBonusEarnedCount: number;
  sellerBonusPendingCount: number;
  isLoading: boolean;
  captureReferralCodeFromUrl: () => void;
  refreshReferrals: () => Promise<void>;
  adminUpdateReferralCommissionStatus: (
    commissionId: string,
    status: 'pending' | 'approved' | 'paid' | 'reversed',
    reason?: string
  ) => Promise<{ success: boolean; error?: string }>;
  adminToggleReferralStatus: (
    referralId: string,
    status: 'active' | 'blocked',
    reason?: string
  ) => Promise<{ success: boolean; error?: string }>;
  adminResolveFraudLog: (fraudLogId: string) => Promise<{ success: boolean; error?: string }>;
}

const ReferralContext = createContext<ReferralContextType | undefined>(undefined);

const deriveFallbackCode = (userId?: string): string => {
  if (!userId) return '';
  return `CB${userId.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
};

const readStoredReferralCode = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const ls = localStorage.getItem(REFERRER_CODE_STORAGE_KEY);
    if (isValidReferralCodeFormat(ls)) return ls!.trim().toUpperCase();
  } catch {}
  try {
    const ss = sessionStorage.getItem(REFERRER_CODE_STORAGE_KEY);
    if (isValidReferralCodeFormat(ss)) return ss!.trim().toUpperCase();
  } catch {}
  try {
    const match = document.cookie.match(new RegExp(`(?:^|; )${REFERRER_COOKIE_NAME}=([^;]*)`));
    if (match?.[1]) {
      const decoded = decodeURIComponent(match[1]).trim().toUpperCase();
      if (isValidReferralCodeFormat(decoded)) return decoded;
    }
  } catch {}
  return null;
};

const persistReferralCode = (code: string) => {
  if (typeof window === 'undefined') return;
  const clean = code.trim().toUpperCase();
  try {
    localStorage.setItem(REFERRER_CODE_STORAGE_KEY, clean);
  } catch {}
  try {
    sessionStorage.setItem(REFERRER_CODE_STORAGE_KEY, clean);
  } catch {}
  try {
    const maxAge = 60 * 60 * 24 * 30; // 30 days across OAuth & route redirects
    document.cookie = `${REFERRER_COOKIE_NAME}=${encodeURIComponent(clean)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  } catch {}
};

const clearStoredReferralCode = () => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(REFERRER_CODE_STORAGE_KEY);
  } catch {}
  try {
    sessionStorage.removeItem(REFERRER_CODE_STORAGE_KEY);
  } catch {}
  try {
    document.cookie = `${REFERRER_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
  } catch {}
};

const computeBonusStatus = (
  referralType: 'affiliate' | 'seller',
  referredSubStatus?: MembershipStatus,
  commissions: ReferralCommissionRecord[] = []
): ReferralBonusStatus => {
  if (referralType !== 'seller') return 'not_applicable';
  const bonusRec = commissions.find((c) => c.rewardType === 'one_time_bonus');
  if (bonusRec) {
    if (bonusRec.status === 'approved' || bonusRec.status === 'paid') return 'credited';
    if (bonusRec.status === 'reversed') return 'reversed';
  }
  if (referredSubStatus === 'failed') return 'failed_pass';
  if (referredSubStatus === 'refunded') return 'reversed';
  if (referredSubStatus === 'active') return 'credited';
  return 'pending_pass';
};

const mapReferralRow = (r: any): ReferralRecord => ({
  id: r.id,
  referrerId: r.referrer_id,
  referrerName: r.referrer_name || undefined,
  referrerEmail: r.referrer_email || undefined,
  referrerCode: r.referrer_code || undefined,
  referredUserId: r.referred_user_id,
  referredEmail: r.referred_email || r.referred_masked_email || undefined,
  referredName: r.referred_name || r.referred_display_name || undefined,
  referredRole: (r.referred_role as UserRole) || undefined,
  referredSubscriptionStatus: (r.referred_subscription_status as MembershipStatus) || undefined,
  referralCodeUsed: r.referral_code_used,
  referralType: r.referral_type === 'seller' ? 'seller' : 'affiliate',
  status: r.status || 'active',
  bonusStatus: (r.bonus_status as ReferralBonusStatus) || undefined,
  bonusAmount: r.bonus_amount !== undefined ? Number(r.bonus_amount) : undefined,
  lifetimeCommissionTotal:
    r.lifetime_commission_total !== undefined ? Number(r.lifetime_commission_total) : undefined,
  blockReason: r.block_reason || undefined,
  createdAt: r.created_at
});

const mapReferralCommissionRow = (r: any): ReferralCommissionRecord => ({
  id: r.id,
  referrerId: r.referrer_id,
  referrerName: r.referrer_name || undefined,
  referrerEmail: r.referrer_email || undefined,
  referredUserId: r.referred_user_id,
  referredName: r.referred_name || undefined,
  referredEmail: r.referred_email || undefined,
  referralId: r.referral_id || undefined,
  rewardType: r.reward_type,
  sourceType: r.source_type || undefined,
  sourceTransactionId: r.source_transaction_id || undefined,
  grossReferenceAmount:
    r.gross_reference_amount !== undefined ? Number(r.gross_reference_amount) : undefined,
  deductionsAmount: r.deductions_amount !== undefined ? Number(r.deductions_amount) : undefined,
  baseAmount: Number(r.base_amount || 0),
  commissionRate: Number(r.commission_rate || 0),
  rewardAmount: Number(r.reward_amount || 0),
  status: r.status || 'pending',
  reversalReason: r.reversal_reason || undefined,
  reversedAt: r.reversed_at || undefined,
  notes: r.notes || undefined,
  createdAt: r.created_at
});

const mapFraudLogRow = (f: any): ReferralFraudLogRecord => ({
  id: f.id,
  userId: f.user_id || undefined,
  userEmail: f.user_email || undefined,
  referrerId: f.referrer_id || undefined,
  referrerEmail: f.referrer_email || undefined,
  attemptedCode: f.attempted_code || undefined,
  eventType: f.event_type,
  severity: f.severity || 'medium',
  details: f.details || '',
  resolved: Boolean(f.resolved),
  createdAt: f.created_at
});

export const ReferralProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, isAdmin, refreshProfile } = useAuth();

  const [capturedReferrerCode, setCapturedReferrerCode] = useState<string | null>(() =>
    readStoredReferralCode()
  );

  const [myReferrals, setMyReferrals] = useState<ReferralRecord[]>([]);
  const [myReferralCommissions, setMyReferralCommissions] = useState<ReferralCommissionRecord[]>([]);
  const [allReferrals, setAllReferrals] = useState<ReferralRecord[]>([]);
  const [allReferralCommissions, setAllReferralCommissions] = useState<ReferralCommissionRecord[]>([]);
  const [fraudLogs, setFraudLogs] = useState<ReferralFraudLogRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const captureReferralCodeFromUrl = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      const refParam = params.get('ref') || params.get('referral');
      const refCode = refParam?.trim().toUpperCase();
      if (refCode && isValidReferralCodeFormat(refCode)) {
        persistReferralCode(refCode);
        setCapturedReferrerCode(refCode);
      } else {
        const stored = readStoredReferralCode();
        if (stored && !capturedReferrerCode) {
          setCapturedReferrerCode(stored);
        }
      }
    } catch {}
  }, [capturedReferrerCode]);

  useEffect(() => {
    captureReferralCodeFromUrl();
    if (typeof window === 'undefined') return;
    const onPopState = () => captureReferralCodeFromUrl();
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [captureReferralCodeFromUrl]);

  const myReferralCode = useMemo(() => {
    if (!user) return '';
    return profile?.referral_code || deriveFallbackCode(user.id);
  }, [user, profile?.referral_code]);

  const myReferralLink = useMemo(() => {
    if (!myReferralCode) return '';
    return buildReferralUrl(myReferralCode);
  }, [myReferralCode]);

  // Log client-intercepted fraud attempt safely when table is present
  const logClientFraudAttempt = useCallback(
    async (
      eventType: 'self_referral_blocked' | 'duplicate_referral_blocked',
      attemptedCode: string,
      details: string
    ) => {
      if (!supabase || !user) return;
      try {
        await supabase.from('referral_fraud_logs').insert({
          user_id: user.id,
          referrer_id: profile?.referred_by || null,
          attempted_code: attemptedCode,
          event_type: eventType,
          severity: eventType === 'self_referral_blocked' ? 'high' : 'medium',
          details
        });
      } catch {}
    },
    [user, profile?.referred_by]
  );

  // Bind stored referral code permanently once user authenticates (Email/Password or Google OAuth)
  useEffect(() => {
    if (!supabase || !user || !profile) return;

    const pendingCode = capturedReferrerCode?.trim().toUpperCase();
    if (!pendingCode) return;

    const ownCode = (profile.referral_code || deriveFallbackCode(user.id)).toUpperCase();

    // Prevent changing referrer after registration / duplicate referral
    if (profile.referred_by) {
      if (pendingCode !== ownCode) {
        logClientFraudAttempt(
          'duplicate_referral_blocked',
          pendingCode,
          `Blocked attempt by ${profile.email} to apply referral code ${pendingCode} after already being bound.`
        );
      }
      clearStoredReferralCode();
      setCapturedReferrerCode(null);
      return;
    }

    // Prevent self-referral before server RPC call
    if (pendingCode === ownCode) {
      logClientFraudAttempt(
        'self_referral_blocked',
        pendingCode,
        `Blocked self-referral attempt by ${profile.email} using own referral code ${pendingCode}.`
      );
      clearStoredReferralCode();
      setCapturedReferrerCode(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.rpc('bind_user_referral', {
          p_referral_code: pendingCode
        });
        if (!cancelled) {
          // If RPC isn't migrated yet on remote DB, silently clear pending state only when RPC ran cleanly
          if (!error) {
            clearStoredReferralCode();
            setCapturedReferrerCode(null);
            if (data?.success) {
              await refreshProfile();
            }
          } else {
            // Avoid infinite retry loops on HTTP 404 / PGRST202 missing RPC
            const errCode = (error as any)?.code;
            if (errCode === 'PGRST202' || errCode === '42883') {
              clearStoredReferralCode();
              setCapturedReferrerCode(null);
            }
          }
        }
      } catch {}
    })();

    return () => {
      cancelled = true;
    };
  }, [user, profile, capturedReferrerCode, refreshProfile, logClientFraudAttempt]);

  const refreshReferrals = useCallback(async () => {
    if (!supabase || !user) {
      setMyReferrals([]);
      setMyReferralCommissions([]);
      setAllReferrals([]);
      setAllReferralCommissions([]);
      setFraudLogs([]);
      return;
    }

    setIsLoading(true);
    try {
      const [summaryRpcRes, myCommRes] = await Promise.all([
        supabase.rpc('get_my_referrals_summary'),
        supabase
          .from('referral_commissions')
          .select('*')
          .eq('referrer_id', user.id)
          .order('created_at', { ascending: false })
      ]);

      const commissionsList: ReferralCommissionRecord[] =
        myCommRes.data && !myCommRes.error ? myCommRes.data.map(mapReferralCommissionRow) : [];
      setMyReferralCommissions(commissionsList);

      if (summaryRpcRes.data && !summaryRpcRes.error && Array.isArray(summaryRpcRes.data)) {
        setMyReferrals(summaryRpcRes.data.map(mapReferralRow));
      } else {
        // Fallback to direct referrals query if RPC isn't deployed yet
        const myRefRes = await supabase
          .from('referrals')
          .select('*')
          .eq('referrer_id', user.id)
          .order('created_at', { ascending: false });

        if (myRefRes.data && !myRefRes.error) {
          setMyReferrals(
            myRefRes.data.map((row: any) => {
              const mapped = mapReferralRow(row);
              const userComms = commissionsList.filter((c) => c.referredUserId === mapped.referredUserId);
              return {
                ...mapped,
                bonusStatus: computeBonusStatus(mapped.referralType, mapped.referredSubscriptionStatus, userComms),
                bonusAmount: userComms
                  .filter((c) => c.rewardType === 'one_time_bonus' && c.status !== 'reversed')
                  .reduce((s, c) => s + c.rewardAmount, 0),
                lifetimeCommissionTotal: userComms
                  .filter((c) => c.rewardType === 'lifetime_commission' && c.status !== 'reversed')
                  .reduce((s, c) => s + c.rewardAmount, 0)
              };
            })
          );
        } else {
          setMyReferrals([]);
        }
      }

      if (isAdmin) {
        const [allRefRes, allCommRes, profilesRes, fraudRes] = await Promise.all([
          supabase.from('referrals').select('*').order('created_at', { ascending: false }),
          supabase.from('referral_commissions').select('*').order('created_at', { ascending: false }),
          supabase
            .from('profiles')
            .select('id, email, full_name, role, subscription_status, referral_code'),
          supabase.from('referral_fraud_logs').select('*').order('created_at', { ascending: false }).limit(200)
        ]);

        const profileById = new Map<string, any>();
        if (profilesRes.data && !profilesRes.error) {
          profilesRes.data.forEach((p: any) => profileById.set(p.id, p));
        }

        const mappedAdminComms: ReferralCommissionRecord[] =
          allCommRes.data && !allCommRes.error
            ? allCommRes.data.map((rc: any) => {
                const referrerP = profileById.get(rc.referrer_id);
                const referredP = profileById.get(rc.referred_user_id);
                return mapReferralCommissionRow({
                  ...rc,
                  referrer_name: referrerP?.full_name || referrerP?.email?.split('@')[0],
                  referrer_email: referrerP?.email,
                  referred_name: referredP?.full_name || referredP?.email?.split('@')[0],
                  referred_email: referredP?.email
                });
              })
            : [];
        setAllReferralCommissions(mappedAdminComms);

        if (allRefRes.data && !allRefRes.error) {
          setAllReferrals(
            allRefRes.data.map((row: any) => {
              const referrerP = profileById.get(row.referrer_id);
              const referredP = profileById.get(row.referred_user_id);
              const relatedComms = mappedAdminComms.filter(
                (c) => c.referredUserId === row.referred_user_id && c.referrerId === row.referrer_id
              );
              const refType: 'affiliate' | 'seller' = row.referral_type === 'seller' ? 'seller' : 'affiliate';
              const subStatus = (referredP?.subscription_status as MembershipStatus) || undefined;
              return mapReferralRow({
                ...row,
                referrer_name: referrerP?.full_name || referrerP?.email?.split('@')[0],
                referrer_email: referrerP?.email,
                referrer_code: referrerP?.referral_code,
                referred_name: referredP?.full_name || referredP?.email?.split('@')[0],
                referred_email: referredP?.email,
                referred_role: referredP?.role,
                referred_subscription_status: subStatus,
                bonus_status: computeBonusStatus(refType, subStatus, relatedComms),
                bonus_amount: relatedComms
                  .filter((c) => c.rewardType === 'one_time_bonus' && c.status !== 'reversed')
                  .reduce((s, c) => s + c.rewardAmount, 0),
                lifetime_commission_total: relatedComms
                  .filter((c) => c.rewardType === 'lifetime_commission' && c.status !== 'reversed')
                  .reduce((s, c) => s + c.rewardAmount, 0)
              });
            })
          );
        } else {
          setAllReferrals([]);
        }

        if (fraudRes.data && !fraudRes.error) {
          setFraudLogs(
            fraudRes.data.map((f: any) => {
              const uP = f.user_id ? profileById.get(f.user_id) : null;
              const rP = f.referrer_id ? profileById.get(f.referrer_id) : null;
              return mapFraudLogRow({
                ...f,
                user_email: uP?.email,
                referrer_email: rP?.email
              });
            })
          );
        } else {
          setFraudLogs([]);
        }
      } else {
        setAllReferrals([]);
        setAllReferralCommissions([]);
        setFraudLogs([]);
      }
    } catch {
      // Fail gracefully with empty state if schema isn't migrated yet
    } finally {
      setIsLoading(false);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    if (user) {
      refreshReferrals();
    } else {
      setMyReferrals([]);
      setMyReferralCommissions([]);
      setAllReferrals([]);
      setAllReferralCommissions([]);
      setFraudLogs([]);
    }
  }, [user, refreshReferrals]);

  const adminUpdateReferralCommissionStatus = useCallback(
    async (
      commissionId: string,
      status: 'pending' | 'approved' | 'paid' | 'reversed',
      reason?: string
    ): Promise<{ success: boolean; error?: string }> => {
      if (!supabase || !isAdmin) return { success: false, error: 'Super Admin access required' };
      try {
        const { data, error } = await supabase.rpc('admin_manage_referral_commission', {
          p_commission_id: commissionId,
          p_new_status: status,
          p_reason: reason || null
        });
        if (error) {
          return { success: false, error: error.message };
        }
        if (data && data.success === false) {
          return { success: false, error: data.error || 'Failed to update referral commission' };
        }
        await refreshReferrals();
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to update referral commission' };
      }
    },
    [isAdmin, refreshReferrals]
  );

  const adminToggleReferralStatus = useCallback(
    async (
      referralId: string,
      status: 'active' | 'blocked',
      reason?: string
    ): Promise<{ success: boolean; error?: string }> => {
      if (!supabase || !isAdmin) return { success: false, error: 'Super Admin access required' };
      try {
        const { data, error } = await supabase.rpc('admin_toggle_referral_block', {
          p_referral_id: referralId,
          p_status: status,
          p_reason: reason || null
        });
        if (error) return { success: false, error: error.message };
        if (data && data.success === false) {
          return { success: false, error: data.error || 'Failed to update referral status' };
        }
        await refreshReferrals();
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to update referral status' };
      }
    },
    [isAdmin, refreshReferrals]
  );

  const adminResolveFraudLog = useCallback(
    async (fraudLogId: string): Promise<{ success: boolean; error?: string }> => {
      if (!supabase || !isAdmin || !user) return { success: false, error: 'Super Admin access required' };
      try {
        const { error } = await supabase
          .from('referral_fraud_logs')
          .update({ resolved: true, resolved_by: user.id })
          .eq('id', fraudLogId);
        if (error) return { success: false, error: error.message };
        setFraudLogs((prev) => prev.map((f) => (f.id === fraudLogId ? { ...f, resolved: true } : f)));
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to resolve fraud log' };
      }
    },
    [isAdmin, user]
  );

  const referredAffiliates = useMemo(
    () => myReferrals.filter((r) => r.referralType === 'affiliate'),
    [myReferrals]
  );

  const referredSellers = useMemo(
    () => myReferrals.filter((r) => r.referralType === 'seller'),
    [myReferrals]
  );

  const totalReferredAffiliates = referredAffiliates.length;
  const totalReferredSellers = referredSellers.length;

  const totalReferralEarnings = useMemo(
    () =>
      myReferralCommissions
        .filter((c) => c.status === 'approved' || c.status === 'paid')
        .reduce((sum, c) => sum + c.rewardAmount, 0),
    [myReferralCommissions]
  );

  const pendingReferralEarnings = useMemo(
    () =>
      myReferralCommissions
        .filter((c) => c.status === 'pending')
        .reduce((sum, c) => sum + c.rewardAmount, 0),
    [myReferralCommissions]
  );

  const approvedReferralEarnings = useMemo(
    () =>
      myReferralCommissions
        .filter((c) => c.status === 'approved')
        .reduce((sum, c) => sum + c.rewardAmount, 0),
    [myReferralCommissions]
  );

  const paidReferralEarnings = useMemo(
    () =>
      myReferralCommissions
        .filter((c) => c.status === 'paid')
        .reduce((s, c) => s + c.rewardAmount, 0),
    [myReferralCommissions]
  );

  const reversedReferralEarnings = useMemo(
    () =>
      myReferralCommissions
        .filter((c) => c.status === 'reversed')
        .reduce((s, c) => s + c.rewardAmount, 0),
    [myReferralCommissions]
  );

  const sellerBonusEarnedCount = useMemo(
    () =>
      myReferralCommissions.filter(
        (c) => c.rewardType === 'one_time_bonus' && (c.status === 'approved' || c.status === 'paid')
      ).length,
    [myReferralCommissions]
  );

  const sellerBonusPendingCount = useMemo(
    () =>
      referredSellers.filter(
        (s) => s.bonusStatus === 'pending_pass' || s.referredSubscriptionStatus !== 'active'
      ).length,
    [referredSellers]
  );

  return (
    <ReferralContext.Provider
      value={{
        myReferralCode,
        myReferralLink,
        capturedReferrerCode,
        myReferrals,
        referredAffiliates,
        referredSellers,
        totalReferredAffiliates,
        totalReferredSellers,
        myReferralCommissions,
        allReferrals,
        allReferralCommissions,
        fraudLogs,
        totalReferralEarnings,
        pendingReferralEarnings,
        approvedReferralEarnings,
        paidReferralEarnings,
        reversedReferralEarnings,
        sellerBonusEarnedCount,
        sellerBonusPendingCount,
        isLoading,
        captureReferralCodeFromUrl,
        refreshReferrals,
        adminUpdateReferralCommissionStatus,
        adminToggleReferralStatus,
        adminResolveFraudLog
      }}
    >
      {children}
    </ReferralContext.Provider>
  );
};

export const useReferrals = () => {
  const context = useContext(ReferralContext);
  if (!context) {
    throw new Error('useReferrals must be used within a ReferralProvider');
  }
  return context;
};
