import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { MembershipStatus, UserRole } from '../types';

export const PRIMARY_SUPER_ADMIN_EMAIL = 'gnetam108@gmail.com';
export const PENDING_OAUTH_ROLE_KEY = 'cb_pending_oauth_role';
export const OAUTH_REDIRECT_PENDING_KEY = 'cb_oauth_redirect_pending';
const REF_STORAGE_KEY = 'cb_referrer_code_v1';
const REF_COOKIE_NAME = 'cb_ref_code';

const getStoredReferralCode = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const ls = localStorage.getItem(REF_STORAGE_KEY);
    if (ls && /^[A-Z0-9_-]{4,32}$/.test(ls.trim().toUpperCase())) return ls.trim().toUpperCase();
  } catch {}
  try {
    const ss = sessionStorage.getItem(REF_STORAGE_KEY);
    if (ss && /^[A-Z0-9_-]{4,32}$/.test(ss.trim().toUpperCase())) return ss.trim().toUpperCase();
  } catch {}
  try {
    const match = document.cookie.match(new RegExp(`(?:^|; )${REF_COOKIE_NAME}=([^;]*)`));
    if (match?.[1]) {
      const val = decodeURIComponent(match[1]).trim().toUpperCase();
      if (/^[A-Z0-9_-]{4,32}$/.test(val)) return val;
    }
  } catch {}
  return null;
};

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role: UserRole;
  status: 'active' | 'suspended';
  seller_verified?: boolean;
  subscription_status?: MembershipStatus;
  subscription_price?: number;
  referral_code?: string;
  referred_by?: string | null;
  membership_activated_at?: string | null;
  created_at?: string;
}

export type SellerProfile = UserProfile;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  role: UserRole | null;
  isAdmin: boolean;
  isAffiliate: boolean;
  isSeller: boolean;
  isLoading: boolean;
  isPasswordRecovery: boolean;
  oauthError: string | null;
  clearOAuthError: () => void;
  refreshProfile: () => Promise<UserProfile | null>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role?: 'affiliate' | 'seller'
  ) => Promise<{ success: boolean; needsEmailVerification: boolean; message: string; role?: UserRole; error?: string }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; message: string; role?: UserRole; error?: string; code?: string }>;
  signInWithGoogle: (
    intendedRole?: 'affiliate' | 'seller'
  ) => Promise<{ success: boolean; message: string; error?: string }>;
  signOut: () => Promise<void>;
  resetPasswordForEmail: (
    email: string
  ) => Promise<{ success: boolean; message: string; error?: string }>;
  updatePassword: (
    newPassword: string
  ) => Promise<{ success: boolean; message: string; error?: string }>;
  resendVerificationEmail: (
    email: string
  ) => Promise<{ success: boolean; message: string; error?: string }>;
  clearPasswordRecovery: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const isGoogleSessionUser = (currentUser: User | null | undefined): boolean => {
  if (!currentUser) return false;
  const provider = currentUser.app_metadata?.provider;
  const providers = currentUser.app_metadata?.providers;
  if (provider === 'google') return true;
  if (Array.isArray(providers) && providers.includes('google') && provider !== 'email') return true;
  return false;
};

const normalizeRole = (
  email: string | undefined,
  dbRole?: string | null,
  metaRole?: string | null,
  isGoogleUser = false
): UserRole => {
  // Never automatically assign Admin privileges to Google OAuth users.
  // Only honor 'admin' if the database explicitly records role === 'admin',
  // or if it's the root email/password Super Admin account.
  if (!isGoogleUser && email && email.toLowerCase().trim() === PRIMARY_SUPER_ADMIN_EMAIL.toLowerCase()) {
    return 'admin';
  }
  const candidate = (dbRole || metaRole || 'affiliate').toLowerCase().trim();
  if (candidate === 'admin' || candidate === 'super_admin') {
    return dbRole === 'admin' || dbRole === 'super_admin' ? 'admin' : 'affiliate';
  }
  if (candidate === 'seller' || candidate === 'both') return 'seller';
  return 'affiliate';
};

const getPendingOAuthRole = (): 'affiliate' | 'seller' | null => {
  if (typeof window === 'undefined') return null;
  try {
    const val = localStorage.getItem(PENDING_OAUTH_ROLE_KEY);
    if (val === 'seller') return 'seller';
    if (val === 'affiliate') return 'affiliate';
  } catch {}
  return null;
};

const clearPendingOAuthRole = () => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(PENDING_OAUTH_ROLE_KEY);
  } catch {}
};

const clearUserSessionCaches = () => {
  if (typeof window === 'undefined') return;
  const keysToClear = [
    'cb_hybrid_affiliate_links_v1',
    'cb_hybrid_external_products_v1',
    'cb_hybrid_affiliate_clicks_v1',
    'cb_hybrid_commissions_v1',
    'cb_withdrawals_all_v1',
    'cb_ledger_all_v1',
    'cb_wallet_notifications_v1',
    'cb_payu_membership_payments_v1',
    'cb_admin_users_v2',
    PENDING_OAUTH_ROLE_KEY,
    OAUTH_REDIRECT_PENDING_KEY
  ];
  keysToClear.forEach((k) => {
    try {
      localStorage.removeItem(k);
    } catch {}
  });
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState<boolean>(false);
  const [oauthError, setOauthError] = useState<string | null>(null);

  const clearOAuthError = useCallback(() => {
    setOauthError(null);
  }, []);

  // Fetch or construct profile safely without ever creating duplicate rows or escalating Google users to Admin
  const fetchProfile = useCallback(async (currentUser: User): Promise<UserProfile | null> => {
    const email = currentUser.email?.toLowerCase().trim() || '';
    const googleUser = isGoogleSessionUser(currentUser);
    const pendingRole = getPendingOAuthRole();
    const googleDisplayName =
      currentUser.user_metadata?.full_name ||
      currentUser.user_metadata?.name ||
      email.split('@')[0] ||
      'Member';

    const fallbackRole = normalizeRole(
      email,
      null,
      currentUser.user_metadata?.role || pendingRole,
      googleUser
    );

    if (!supabase) {
      clearPendingOAuthRole();
      const built: UserProfile = {
        id: currentUser.id,
        email,
        full_name: googleDisplayName,
        role: fallbackRole,
        status: 'active',
        seller_verified: false,
        subscription_status: 'none',
        created_at: currentUser.created_at
      };
      setProfile(built);
      return built;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, status, seller_verified, subscription_status, subscription_price, referral_code, referred_by, membership_activated_at, created_at')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (data && !error) {
        let effectiveDbRole = data.role;
        let effectiveName = data.full_name;

        // If a brand-new Google signup just triggered DB handle_new_user() defaulting to 'affiliate'
        // within the last 90 seconds, and the user initiated Google Signup from the Seller flow,
        // attempt to sync 'seller' (DB privilege trigger still guards against 'admin' or stale changes).
        const createdMs = data.created_at ? new Date(data.created_at).getTime() : 0;
        const isJustCreated = createdMs > 0 && Date.now() - createdMs < 90_000;

        if (googleUser && isJustCreated && pendingRole === 'seller' && data.role === 'affiliate') {
          try {
            const { data: updatedRow } = await supabase
              .from('profiles')
              .update({ role: 'seller' })
              .eq('id', currentUser.id)
              .select('role')
              .maybeSingle();
            if (updatedRow?.role === 'seller') {
              effectiveDbRole = 'seller';
            }
          } catch {}
        }

        // Backfill Google display name if profile has an empty/placeholder name
        if (googleUser && (!effectiveName || !effectiveName.trim()) && googleDisplayName) {
          try {
            await supabase
              .from('profiles')
              .update({ full_name: googleDisplayName })
              .eq('id', currentUser.id);
            effectiveName = googleDisplayName;
          } catch {}
        }

        clearPendingOAuthRole();

        const resolvedRole = normalizeRole(
          data.email || email,
          effectiveDbRole,
          currentUser.user_metadata?.role,
          googleUser
        );
        const resolvedStatus: 'active' | 'suspended' = data.status === 'suspended' ? 'suspended' : 'active';

        // Block suspended accounts immediately
        if (resolvedStatus === 'suspended' && resolvedRole !== 'admin') {
          await supabase.auth.signOut();
          setUser(null);
          setSession(null);
          setProfile(null);
          clearUserSessionCaches();
          return null;
        }

        const built: UserProfile = {
          id: data.id,
          email: data.email || email,
          full_name: effectiveName || googleDisplayName,
          role: resolvedRole,
          status: resolvedStatus,
          seller_verified: Boolean(data.seller_verified),
          subscription_status: (data.subscription_status as MembershipStatus) || 'none',
          subscription_price: data.subscription_price ? Number(data.subscription_price) : 999,
          referral_code: data.referral_code || `CB${data.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`,
          referred_by: data.referred_by || null,
          membership_activated_at: data.membership_activated_at || null,
          created_at: data.created_at || currentUser.created_at
        };
        setProfile(built);
        return built;
      } else {
        // Profile row does not exist yet -> upsert safely on primary key 'id' (no duplicates).
        // Google users can only be created as 'affiliate' or 'seller', never 'admin'.
        const safeRole: UserRole =
          !googleUser && email === PRIMARY_SUPER_ADMIN_EMAIL.toLowerCase()
            ? 'admin'
            : pendingRole === 'seller' || currentUser.user_metadata?.role === 'seller'
            ? 'seller'
            : 'affiliate';

        clearPendingOAuthRole();

        const generatedRefCode = `CB${currentUser.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;

        try {
          await supabase.from('profiles').upsert(
            {
              id: currentUser.id,
              email,
              full_name: googleDisplayName,
              role: safeRole,
              referral_code: generatedRefCode
            },
            { onConflict: 'id' }
          );
        } catch {}

        const built: UserProfile = {
          id: currentUser.id,
          email,
          full_name: googleDisplayName,
          role: safeRole,
          status: 'active',
          seller_verified: false,
          subscription_status: 'none',
          referral_code: generatedRefCode,
          referred_by: null,
          created_at: currentUser.created_at
        };
        setProfile(built);
        return built;
      }
    } catch {
      clearPendingOAuthRole();
      const built: UserProfile = {
        id: currentUser.id,
        email,
        full_name: googleDisplayName,
        role: fallbackRole,
        status: 'active',
        seller_verified: false,
        subscription_status: 'none',
        created_at: currentUser.created_at
      };
      setProfile(built);
      return built;
    }
  }, []);

  const refreshProfile = useCallback(async (): Promise<UserProfile | null> => {
    if (!user) return null;
    return await fetchProfile(user);
  }, [user, fetchProfile]);

  // Listen to Supabase Auth state changes & handle OAuth return callbacks / errors
  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const hashStr = window.location.hash || '';
      const hashParams = new URLSearchParams(hashStr.startsWith('#') ? hashStr.slice(1) : hashStr);

      // Only enter password recovery on explicit recovery links (never on Google OAuth access_token)
      if (hashStr.includes('type=recovery') || searchParams.get('type') === 'recovery') {
        setIsPasswordRecovery(true);
      }

      // Surface any Google/Supabase OAuth error returned in query string or hash fragment
      const urlErr =
        searchParams.get('error_description') ||
        searchParams.get('error') ||
        hashParams.get('error_description') ||
        hashParams.get('error');

      if (urlErr) {
        const cleanMsg = decodeURIComponent(urlErr).replace(/\+/g, ' ');
        setOauthError(`Google authentication failed: ${cleanMsg}`);
        try {
          localStorage.removeItem(OAUTH_REDIRECT_PENDING_KEY);
          clearPendingOAuthRole();
        } catch {}
        window.history.replaceState(null, '', window.location.pathname);
      }
    }

    // 1. Initial active session check
    supabase.auth
      .getSession()
      .then(async ({ data: { session: currentSession }, error }) => {
        if (error) {
          setOauthError(error.message || 'Unable to verify authentication session.');
        }
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        if (currentSession?.user) {
          await fetchProfile(currentSession.user);
        }
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });

    // 2. Real-time subscription to auth state changes
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      }

      if (newSession?.user) {
        setOauthError(null);
        await fetchProfile(newSession.user);
      } else {
        setProfile(null);
      }

      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // Role-aware Supabase signUp (strictly affiliate or seller; admin cannot be self-assigned)
  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    requestedRole: 'affiliate' | 'seller' = 'affiliate'
  ): Promise<{ success: boolean; needsEmailVerification: boolean; message: string; role?: UserRole; error?: string }> => {
    if (!supabase) {
      return {
        success: false,
        needsEmailVerification: false,
        message: 'Supabase client is not configured.',
        error: 'Supabase URL or Key missing'
      };
    }

    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanName = fullName.trim();
      const safeRole: 'affiliate' | 'seller' = requestedRole === 'seller' ? 'seller' : 'affiliate';
      const roleLabel = safeRole === 'seller' ? 'Seller' : 'Affiliate';

      const pendingReferralCode = getStoredReferralCode();
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: cleanName,
            role: safeRole,
            ...(pendingReferralCode ? { referral_code: pendingReferralCode } : {})
          },
          emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined
        }
      });

      if (error) {
        let msg = error.message;
        if ((error as any).code === 'over_email_send_rate_limit' || error.message.includes('rate limit')) {
          msg = 'Email rate limit reached. Please wait a minute before trying again.';
        }
        return {
          success: false,
          needsEmailVerification: false,
          message: msg,
          error: error.message
        };
      }

      if (data.user && data.user.identities && data.user.identities.length === 0) {
        return {
          success: false,
          needsEmailVerification: false,
          message: 'An account with this email address already exists. Please log in or use Forgot Password.',
          error: 'User already registered'
        };
      }

      const registeredUser = data.user;
      const hasActiveSession = Boolean(data.session);

      if (registeredUser && hasActiveSession) {
        try {
          await supabase.from('profiles').upsert(
            {
              id: registeredUser.id,
              email: cleanEmail,
              full_name: cleanName,
              role: cleanEmail === PRIMARY_SUPER_ADMIN_EMAIL.toLowerCase() ? 'admin' : safeRole
            },
            { onConflict: 'id' }
          );
        } catch {}
        await fetchProfile(registeredUser);
      }

      if (!hasActiveSession && registeredUser) {
        return {
          success: true,
          needsEmailVerification: true,
          role: safeRole,
          message: `Verification link sent to ${cleanEmail}. Please check your inbox or spam folder to activate your free ${roleLabel} account!`
        };
      }

      return {
        success: true,
        needsEmailVerification: false,
        role: cleanEmail === PRIMARY_SUPER_ADMIN_EMAIL.toLowerCase() ? 'admin' : safeRole,
        message: `Welcome to ClickBarry, ${cleanName}! Your ${roleLabel} account is ready.`
      };
    } catch (err: any) {
      return {
        success: false,
        needsEmailVerification: false,
        message: err?.message || 'Registration failed unexpectedly.',
        error: err?.message
      };
    }
  };

  // Real Supabase signInWithPassword with suspended account blocking & role return
  const signIn = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; message: string; role?: UserRole; error?: string; code?: string }> => {
    if (!supabase) {
      return {
        success: false,
        message: 'Supabase client is not configured.',
        error: 'Supabase URL or Key missing'
      };
    }

    try {
      const cleanEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password
      });

      if (error) {
        return {
          success: false,
          message: error.message,
          error: error.message,
          code: (error as any).code
        };
      }

      if (data.user) {
        const loadedProfile = await fetchProfile(data.user);
        if (!loadedProfile) {
          return {
            success: false,
            message: 'Your account has been suspended by an administrator. Please contact ClickBarry support.',
            error: 'Account suspended',
            code: 'account_suspended'
          };
        }

        return {
          success: true,
          role: loadedProfile.role,
          message: 'Logged in successfully!'
        };
      }

      return {
        success: true,
        role: 'affiliate',
        message: 'Logged in successfully!'
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Sign in failed.',
        error: err?.message
      };
    }
  };

  // Real Supabase Google OAuth Sign-In / Sign-Up (never assigns Admin privileges)
  const signInWithGoogle = async (
    intendedRole: 'affiliate' | 'seller' = 'affiliate'
  ): Promise<{ success: boolean; message: string; error?: string }> => {
    if (!supabase) {
      return {
        success: false,
        message: 'Supabase client is not configured.',
        error: 'Supabase URL or Key missing'
      };
    }

    const safeRole: 'affiliate' | 'seller' = intendedRole === 'seller' ? 'seller' : 'affiliate';
    setOauthError(null);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(PENDING_OAUTH_ROLE_KEY, safeRole);
        localStorage.setItem(OAUTH_REDIRECT_PENDING_KEY, '1');
      } catch {}
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });

      if (error) {
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem(OAUTH_REDIRECT_PENDING_KEY);
            clearPendingOAuthRole();
          } catch {}
        }
        const errMsg = error.message || 'Failed to initiate Google OAuth.';
        setOauthError(errMsg);
        return {
          success: false,
          message: errMsg,
          error: error.message
        };
      }

      return {
        success: true,
        message: 'Redirecting to Google...'
      };
    } catch (err: any) {
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem(OAUTH_REDIRECT_PENDING_KEY);
          clearPendingOAuthRole();
        } catch {}
      }
      const errMsg = err?.message || 'Unable to connect to Google authentication.';
      setOauthError(errMsg);
      return {
        success: false,
        message: errMsg,
        error: errMsg
      };
    }
  };

  // Real Supabase signOut + cache cleanup
  const signOut = async (): Promise<void> => {
    clearUserSessionCaches();
    setUser(null);
    setSession(null);
    setProfile(null);
    setOauthError(null);
    if (!supabase) return;
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Sign out error:', e);
    }
  };

  // Real Supabase resetPasswordForEmail
  const resetPasswordForEmail = async (
    email: string
  ): Promise<{ success: boolean; message: string; error?: string }> => {
    if (!supabase) {
      return {
        success: false,
        message: 'Supabase client is not configured.',
        error: 'Missing client'
      };
    }

    try {
      const cleanEmail = email.trim().toLowerCase();
      const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/#type=recovery` : undefined;

      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo
      });

      if (error) {
        return {
          success: false,
          message: error.message,
          error: error.message
        };
      }

      return {
        success: true,
        message: `Password reset link sent to ${cleanEmail}. Please check your inbox and click the link to reset your password.`
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Failed to send reset email.',
        error: err?.message
      };
    }
  };

  // Real Supabase updateUser with new password
  const updatePassword = async (
    newPassword: string
  ): Promise<{ success: boolean; message: string; error?: string }> => {
    if (!supabase) {
      return {
        success: false,
        message: 'Supabase client is not configured.',
        error: 'Missing client'
      };
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        return {
          success: false,
          message: error.message,
          error: error.message
        };
      }

      setIsPasswordRecovery(false);
      if (typeof window !== 'undefined' && window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname);
      }

      return {
        success: true,
        message: 'Your password has been updated successfully! You can now log in.'
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Password update failed.',
        error: err?.message
      };
    }
  };

  const resendVerificationEmail = async (
    email: string
  ): Promise<{ success: boolean; message: string; error?: string }> => {
    if (!supabase) {
      return { success: false, message: 'Supabase not configured' };
    }

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim().toLowerCase()
      });

      if (error) {
        return { success: false, message: error.message, error: error.message };
      }

      return {
        success: true,
        message: `Verification email resent to ${email.trim()}. Please check your spam / inbox folder.`
      };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to resend email' };
    }
  };

  const clearPasswordRecovery = () => {
    setIsPasswordRecovery(false);
    if (typeof window !== 'undefined' && window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  const resolvedRole: UserRole | null = user
    ? profile?.role || normalizeRole(user.email, null, user.user_metadata?.role, isGoogleSessionUser(user))
    : null;

  const isAdmin = resolvedRole === 'admin';
  const isSeller = resolvedRole === 'seller';
  const isAffiliate = resolvedRole === 'affiliate';

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role: resolvedRole,
        isAdmin,
        isAffiliate,
        isSeller,
        isLoading,
        isPasswordRecovery,
        oauthError,
        clearOAuthError,
        refreshProfile,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        resetPasswordForEmail,
        updatePassword,
        resendVerificationEmail,
        clearPasswordRecovery
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
