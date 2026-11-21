import React, { useState, useEffect } from 'react';
import { StrawberryLogo } from './StrawberryLogo';
import { useAuth } from '../context/AuthContext';
import { useReferrals } from '../context/ReferralContext';
import { GoogleAuthButton } from './GoogleAuthButton';
import { UserRole } from '../types';
import {
  X,
  User,
  Lock,
  Mail,
  Rocket,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  KeyRound,
  Eye,
  EyeOff,
  TrendingUp,
  Gift
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  initialMode: 'login' | 'signup' | 'forgot' | 'reset';
  defaultRole?: 'affiliate' | 'seller';
  onClose: () => void;
  onSuccess: (email: string, role?: UserRole) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode,
  defaultRole = 'affiliate',
  onClose,
  onSuccess
}) => {
  const {
    signUp,
    signIn,
    signInWithGoogle,
    oauthError,
    clearOAuthError,
    resetPasswordForEmail,
    updatePassword,
    resendVerificationEmail,
    isPasswordRecovery,
    clearPasswordRecovery
  } = useAuth();
  const { capturedReferrerCode } = useReferrals();

  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'reset'>(
    isPasswordRecovery ? 'reset' : initialMode
  );
  const [selectedRole, setSelectedRole] = useState<'affiliate' | 'seller'>(defaultRole);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);

  useEffect(() => {
    if (isPasswordRecovery) {
      setMode('reset');
    } else {
      setMode(initialMode);
    }
    setSelectedRole(defaultRole);
    setErrorMessage('');
    setSuccessMessage('');
    setNeedsVerification(false);
    setGoogleLoading(false);
  }, [initialMode, defaultRole, isPasswordRecovery, isOpen]);

  useEffect(() => {
    if (oauthError && isOpen) {
      setErrorMessage(oauthError);
      clearOAuthError();
    }
  }, [oauthError, isOpen, clearOAuthError]);

  const handleGoogleAuth = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    setNeedsVerification(false);
    setGoogleLoading(true);
    const res = await signInWithGoogle(mode === 'signup' ? selectedRole : 'affiliate');
    if (!res.success) {
      setGoogleLoading(false);
      setErrorMessage(res.message);
    }
  };

  if (!isOpen) return null;

  const isValidEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());

  const handleModeChange = (newMode: 'login' | 'signup' | 'forgot' | 'reset') => {
    setMode(newMode);
    setErrorMessage('');
    setSuccessMessage('');
    setNeedsVerification(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (mode === 'signup') {
      if (!fullName.trim()) {
        setErrorMessage('Please enter your full name.');
        return;
      }
      if (!isValidEmail(email)) {
        setErrorMessage('Please enter a valid email address.');
        return;
      }
      if (password.length < 6) {
        setErrorMessage('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match. Please re-check.');
        return;
      }

      setLoading(true);
      const res = await signUp(email, password, fullName, selectedRole);
      setLoading(false);

      if (!res.success) {
        setErrorMessage(res.message || 'Registration failed.');
        return;
      }

      if (res.needsEmailVerification) {
        setNeedsVerification(true);
        setSuccessMessage(res.message);
      } else {
        setSuccessMessage(res.message);
        setTimeout(() => {
          onSuccess(email, res.role || selectedRole);
          onClose();
        }, 1200);
      }
      return;
    }

    if (mode === 'login') {
      if (!isValidEmail(email)) {
        setErrorMessage('Please enter a valid email address.');
        return;
      }
      if (!password) {
        setErrorMessage('Please enter your password.');
        return;
      }

      setLoading(true);
      const res = await signIn(email, password);
      setLoading(false);

      if (!res.success) {
        if (res.code === 'email_not_confirmed' || res.message.toLowerCase().includes('not confirmed')) {
          setNeedsVerification(true);
          setErrorMessage('Email address has not been confirmed yet. Please verify via your inbox or resend the link.');
        } else {
          setErrorMessage(res.message || 'Invalid email or password.');
        }
        return;
      }

      setSuccessMessage('Logged in successfully! Redirecting...');
      setTimeout(() => {
        onSuccess(email, res.role);
        onClose();
      }, 800);
      return;
    }

    if (mode === 'forgot') {
      if (!isValidEmail(email)) {
        setErrorMessage('Please enter a valid email address.');
        return;
      }
      setLoading(true);
      const res = await resetPasswordForEmail(email);
      setLoading(false);
      if (!res.success) {
        setErrorMessage(res.message || 'Failed to send password reset email.');
        return;
      }
      setSuccessMessage(res.message);
      return;
    }

    if (mode === 'reset') {
      if (password.length < 6) {
        setErrorMessage('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match.');
        return;
      }
      setLoading(true);
      const res = await updatePassword(password);
      setLoading(false);
      if (!res.success) {
        setErrorMessage(res.message || 'Failed to update password.');
        return;
      }
      setSuccessMessage(res.message);
      clearPasswordRecovery();
      setTimeout(() => {
        setMode('login');
        setSuccessMessage('Password changed! You can now log in with your new password.');
      }, 1500);
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      setErrorMessage('Please enter your email address above.');
      return;
    }
    setResendingEmail(true);
    const res = await resendVerificationEmail(email);
    setResendingEmail(false);
    if (res.success) {
      setSuccessMessage(res.message);
      setErrorMessage('');
    } else {
      setErrorMessage(res.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md max-h-[92vh] overflow-y-auto bg-[#130b30] border border-purple-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-100">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-pink-600/30 rounded-full blur-2xl pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-2 mb-5">
          <div className="inline-block">
            <StrawberryLogo size="sm" showTagline={false} />
          </div>
          <h2 className="text-2xl font-black text-white">
            {mode === 'signup' && `Create ${selectedRole === 'seller' ? 'Seller' : 'Affiliate'} Account`}
            {mode === 'login' && 'Sign In to ClickBarry'}
            {mode === 'forgot' && 'Reset Your Password'}
            {mode === 'reset' && 'Set New Password'}
          </h2>
          <p className="text-xs text-slate-400">
            {mode === 'signup' &&
              (selectedRole === 'affiliate'
                ? '100% Free Affiliate Registration • Promote & Earn Commissions'
                : 'Seller Account • List Your Digital Products')}
            {mode === 'login' && 'Log in to access your Affiliate or Seller Dashboard'}
            {mode === 'forgot' && 'We will send a secure password reset link to your email'}
            {mode === 'reset' && 'Enter your new password below'}
          </p>

          {(mode === 'login' || mode === 'signup') && (
            <div className="flex p-1 rounded-xl bg-[#1b1044] border border-purple-800 mt-3">
              <button
                type="button"
                onClick={() => handleModeChange('login')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  mode === 'login' ? 'bg-pink-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('signup')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  mode === 'signup' ? 'bg-pink-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign Up
              </button>
            </div>
          )}
        </div>

        {/* Role Selector on Sign Up */}
        {mode === 'signup' && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              type="button"
              onClick={() => setSelectedRole('affiliate')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                selectedRole === 'affiliate'
                  ? 'bg-indigo-600/25 border-indigo-400 text-white shadow-md'
                  : 'bg-[#1b1045] border-purple-900 text-slate-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
                <span>Affiliate</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-semibold block mt-0.5">
                100% Free Forever
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedRole('seller')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                selectedRole === 'seller'
                  ? 'bg-pink-600/25 border-pink-400 text-white shadow-md'
                  : 'bg-[#1b1045] border-purple-900 text-slate-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <Rocket className="w-3.5 h-3.5 text-pink-400" />
                <span>Seller</span>
              </div>
              <span className="text-[10px] text-pink-300 font-semibold block mt-0.5">
                Product Creators
              </span>
            </button>
          </div>
        )}

        {capturedReferrerCode && (mode === 'signup' || mode === 'login') && (
          <div className="mb-3.5 px-3 py-2 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
            <Gift className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Referral Code <strong className="font-mono text-white">{capturedReferrerCode}</strong> applied — linked permanently upon registration.
            </span>
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 p-3.5 rounded-2xl bg-red-950/80 border border-red-500/70 text-red-200 text-xs font-medium flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <span>{errorMessage}</span>
              {needsVerification && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendingEmail}
                    className="text-pink-400 hover:text-pink-300 underline font-bold text-[11px] cursor-pointer"
                  >
                    {resendingEmail ? 'Sending...' : 'Resend Verification Email'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/70 text-emerald-200 text-xs font-medium flex items-start gap-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {(mode === 'login' || mode === 'signup') && (
          <div className="mb-3.5">
            <GoogleAuthButton
              onClick={handleGoogleAuth}
              loading={googleLoading}
              disabled={loading}
              label={
                mode === 'signup'
                  ? `Continue with Google (${selectedRole === 'seller' ? 'Seller' : 'Affiliate'})`
                  : 'Continue with Google'
              }
            />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Full Name <span className="text-pink-400">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajesh Kumar"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#1c1145] border border-purple-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>
          )}

          {mode !== 'reset' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Email Address <span className="text-pink-400">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#1c1145] border border-purple-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>
          )}

          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-300">
                  {mode === 'reset' ? 'New Password' : 'Password'} <span className="text-pink-400">*</span>
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => handleModeChange('forgot')}
                    className="text-[11px] text-pink-400 hover:text-pink-300 underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder={mode === 'reset' ? 'Enter at least 6 characters' : '••••••••'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#1c1145] border border-purple-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {(mode === 'signup' || mode === 'reset') && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Confirm Password <span className="text-pink-400">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#1c1145] border border-purple-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold text-sm shadow-lg shadow-pink-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 mt-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : mode === 'signup' ? (
              <>
                {selectedRole === 'seller' ? <Rocket className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                <span>
                  {selectedRole === 'seller' ? 'Create Seller Account' : 'Create Free Affiliate Account'}
                </span>
              </>
            ) : mode === 'login' ? (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : mode === 'forgot' ? (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Send Reset Link</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Update Password</span>
              </>
            )}
          </button>

          {mode === 'forgot' && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => handleModeChange('login')}
                className="text-xs text-pink-400 hover:text-pink-300 underline font-semibold cursor-pointer"
              >
                ← Back to Login
              </button>
            </div>
          )}
        </form>

        <div className="mt-5 pt-4 border-t border-purple-900/60 text-center">
          <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Protected by Supabase Role-Based Security</span>
          </p>
        </div>
      </div>
    </div>
  );
};
