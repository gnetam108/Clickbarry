import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface SellerProfile {
  id: string;
  email: string;
  full_name?: string;
  role?: string;
  seller_verified?: boolean;
  subscription_status?: 'active' | 'none' | 'pending';
  subscription_price?: number;
  created_at?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: SellerProfile | null;
  isLoading: boolean;
  isPasswordRecovery: boolean;
  signUp: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<{ success: boolean; needsEmailVerification: boolean; message: string; error?: string }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; message: string; error?: string; code?: string }>;
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState<boolean>(false);

  // Fetch or construct profile safely
  const fetchProfile = useCallback(async (currentUser: User) => {
    if (!supabase) {
      setProfile({
        id: currentUser.id,
        email: currentUser.email || '',
        full_name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Seller'
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (data && !error) {
        setProfile({
          id: data.id,
          email: data.email || currentUser.email || '',
          full_name: data.full_name || currentUser.user_metadata?.full_name,
          created_at: data.created_at || currentUser.created_at
        });
      } else {
        // Fallback to metadata if profiles table not created or row not populated yet
        setProfile({
          id: currentUser.id,
          email: currentUser.email || '',
          full_name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Seller',
          created_at: currentUser.created_at
        });
      }
    } catch (e) {
      setProfile({
        id: currentUser.id,
        email: currentUser.email || '',
        full_name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Seller',
        created_at: currentUser.created_at
      });
    }
  }, []);

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
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        fetchProfile(currentSession.user);
      }
      setIsLoading(false);
    }).catch(() => {
      setIsLoading(false);
    });

    // 2. Real-time subscription to auth state changes (login, logout, token refresh, password recovery)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
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
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // Real Supabase signUp
  const signUp = async (
    email: string,
    password: string,
    fullName: string
  ): Promise<{ success: boolean; needsEmailVerification: boolean; message: string; error?: string }> => {
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

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: cleanName
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

      // Supabase anti-enumeration: If email is already registered and unconfirmed, identities array is empty
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        return {
          success: false,
          needsEmailVerification: false,
          message: 'An account with this email address already exists. Please log in or use Forgot Password.',
          error: 'User already registered'
        };
      }

      // Check if user was created and if session is active or requires email confirmation
      const registeredUser = data.user;
      const hasActiveSession = Boolean(data.session);

      // Also ensure profile in profiles table exists if user was created and table is ready
      if (registeredUser && hasActiveSession) {
        try {
          await supabase.from('profiles').upsert({
            id: registeredUser.id,
            email: cleanEmail,
            full_name: cleanName
          });
        } catch {
          // Trigger may have handled it or table pending
        }
      }

      if (!hasActiveSession && registeredUser) {
        return {
          success: true,
          needsEmailVerification: true,
          message: `Verification link sent to ${cleanEmail}. Please check your inbox or spam folder to activate your Seller account!`
        };
      }

      return {
        success: true,
        needsEmailVerification: false,
        message: `Welcome to ClickBarry, ${cleanName}! Your Seller account is ready.`
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

  // Real Supabase signInWithPassword
  const signIn = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; message: string; error?: string; code?: string }> => {
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
        await fetchProfile(data.user);
      }

      return {
        success: true,
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

  // Real Supabase signOut
  const signOut = async (): Promise<void> => {
    if (!supabase) return;
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setProfile(null);
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
      // Clean hash from window
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

  // Resend verification email
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

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        isPasswordRecovery,
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
