import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserRole } from '../types';

export const PRIMARY_SUPER_ADMIN_EMAIL = 'gnetam108@gmail.com';

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role: UserRole;
  status: 'active' | 'suspended';
  seller_verified?: boolean;
  subscription_status?: 'active' | 'none' | 'pending';
  subscription_price?: number;
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

const normalizeRole = (email: string | undefined, dbRole?: string | null, metaRole?: string | null): UserRole => {
  if (email && email.toLowerCase().trim() === PRIMARY_SUPER_ADMIN_EMAIL.toLowerCase()) {
    return 'admin';
  }
  const candidate = (dbRole || metaRole || 'affiliate').toLowerCase().trim();
  if (candidate === 'admin' || candidate === 'super_admin') {
    // Only trust dbRole === 'admin' if DB says admin; never escalate from mutable client metadata
    return dbRole === 'admin' || dbRole === 'super_admin' ? 'admin' : 'affiliate';
  }
  if (candidate === 'seller' || candidate === 'both') return 'seller';
  return 'affiliate';
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
    'cb_admin_users_v2'
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

  // Fetch or construct profile safely
  const fetchProfile = useCallback(async (currentUser: User): Promise<UserProfile | null> => {
    const email = currentUser.email?.toLowerCase().trim() || '';
    const fallbackRole = normalizeRole(email, null, currentUser.user_metadata?.role);

    if (!supabase) {
      const built: UserProfile = {
        id: currentUser.id,
        email,
        full_name: currentUser.user_metadata?.full_name || email.split('@')[0] || 'Member',
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
        .select('id, email, full_name, role, status, seller_verified, subscription_status, subscription_price, created_at')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (data && !error) {
        const resolvedRole = normalizeRole(data.email || email, data.role, currentUser.user_metadata?.role);
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
          full_name: data.full_name || currentUser.user_metadata?.full_name || email.split('@')[0],
          role: resolvedRole,
          status: resolvedStatus,
          seller_verified: Boolean(data.seller_verified),
          subscription_status: (data.subscription_status as UserProfile['subscription_status']) || 'none',
          subscription_price: data.subscription_price ? Number(data.subscription_price) : 999,
          created_at: data.created_at || currentUser.created_at
        };
        setProfile(built);
        return built;
      } else {
        // Profile row might not exist yet if trigger wasn't installed; safely create for affiliate/seller
        const safeRole: 'affiliate' | 'seller' | 'admin' =
          email === PRIMARY_SUPER_ADMIN_EMAIL.toLowerCase()
            ? 'admin'
            : currentUser.user_metadata?.role === 'seller'
            ? 'seller'
            : 'affiliate';

        try {
          await supabase.from('profiles').upsert({
            id: currentUser.id,
            email,
            full_name: currentUser.user_metadata?.full_name || email.split('@')[0] || 'Member',
            role: safeRole
          });
        } catch {}

        const built: UserProfile = {
          id: currentUser.id,
          email,
          full_name: currentUser.user_metadata?.full_name || email.split('@')[0] || 'Member',
          role: safeRole,
          status: 'active',
          seller_verified: false,
          subscription_status: 'none',
          created_at: currentUser.created_at
        };
        setProfile(built);
        return built;
      }
    } catch {
      const built: UserProfile = {
        id: currentUser.id,
        email,
        full_name: currentUser.user_metadata?.full_name || email.split('@')[0] || 'Member',
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

  // Listen to Supabase Auth state changes
  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    // Check for password recovery hash tokens in URL
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash && (hash.includes('type=recovery') || hash.includes('access_token='))) {
        setIsPasswordRecovery(true);
      }
    }

    // 1. Initial active session check
    supabase.auth
      .getSession()
      .then(async ({ data: { session: currentSession } }) => {
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

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: cleanName,
            role: safeRole
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
          await supabase.from('profiles').upsert({
            id: registeredUser.id,
            email: cleanEmail,
            full_name: cleanName,
            role: cleanEmail === PRIMARY_SUPER_ADMIN_EMAIL.toLowerCase() ? 'admin' : safeRole
          });
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

  // Real Supabase signOut + cache cleanup
  const signOut = async (): Promise<void> => {
    clearUserSessionCaches();
    setUser(null);
    setSession(null);
    setProfile(null);
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
    ? profile?.role || normalizeRole(user.email, null, user.user_metadata?.role)
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
        refreshProfile,
        signUp,
        signIn,
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
