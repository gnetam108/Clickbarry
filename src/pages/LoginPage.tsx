import React, { useState, useEffect } from 'react';
import { PageId, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { useReferrals } from '../context/ReferralContext';
import { StrawberryLogo } from '../components/StrawberryLogo';
import { GoogleAuthButton } from '../components/GoogleAuthButton';
import {
  User,
  Lock,
  Mail,
  TrendingUp,
  Rocket,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  Gift
} from 'lucide-react';

interface LoginPageProps {
  onNavigate: (page: PageId) => void;
  initialRole?: 'affiliate' | 'seller';
  initialAuthTab?: 'login' | 'signup';
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onNavigate,
  initialRole = 'affiliate',
  initialAuthTab = 'login'
}) => {
  const { user, role, signIn, signUp, signInWithGoogle, oauthError, clearOAuthError, resetPasswordForEmail } = useAuth();
  const { capturedReferrerCode } = useReferrals();

  const [authTab, setAuthTab] = useState<'login' | 'signup' | 'forgot'>(initialAuthTab);
  const [selectedRole, setSelectedRole] = useState<'affiliate' | 'seller'>(initialRole);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (oauthError) {
      setErrorMessage(oauthError);
      clearOAuthError();
    }
  }, [oauthError, clearOAuthError]);

  const handleGoogleAuth = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    setGoogleLoading(true);
    const res = await signInWithGoogle(authTab === 'signup' ? selectedRole : 'affiliate');
    if (!res.success) {
      setGoogleLoading(false);
      setErrorMessage(res.message);
    }
  };

  // Redirect already authenticated users to their appropriate dashboard
  useEffect(() => {
    if (user && role) {
      if (role === 'admin') onNavigate('admincore');
      else if (role === 'seller') onNavigate('seller-dashboard');
      else onNavigate('affiliate-dashboard');
    }
  }, [user, role, onNavigate]);

  const routeAfterLogin = (resolvedRole?: UserRole) => {
    if (resolvedRole === 'admin') onNavigate('admincore');
    else if (resolvedRole === 'seller') onNavigate('seller-dashboard');
    else onNavigate('affiliate-dashboard');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (authTab === 'forgot') {
      if (!email.trim()) {
        setErrorMessage('Please enter your email address.');
        return;
      }
      setLoading(true);
      const res = await resetPasswordForEmail(email);
      setLoading(false);
      if (res.success) setSuccessMessage(res.message);
      else setErrorMessage(res.message);
      return;
    }

    if (authTab === 'signup') {
      if (!fullName.trim()) {
        setErrorMessage('Please enter your full name.');
        return;
      }
      if (password.length < 6) {
        setErrorMessage('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match.');
        return;
      }

      setLoading(true);
      const res = await signUp(email, password, fullName, selectedRole);
      setLoading(false);

      if (!res.success) {
        setErrorMessage(res.message);
        return;
      }
      setSuccessMessage(res.message);
      if (!res.needsEmailVerification) {
        setTimeout(() => routeAfterLogin(res.role || selectedRole), 800);
      }
      return;
    }

    // Login
    setLoading(true);
    const res = await signIn(email, password);
    setLoading(false);
    if (!res.success) {
      setErrorMessage(res.message);
      return;
    }
    setSuccessMessage('Signed in successfully! Opening your dashboard...');
    setTimeout(() => routeAfterLogin(res.role), 600);
  };

  return (
    <div className="min-h-screen bg-[#0c0722] text-slate-100 py-14 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left Role Overview Column */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#180f3d] via-[#130b30] to-[#0f0826] border border-purple-800/70 rounded-3xl p-7 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <StrawberryLogo size="md" showTagline={true} onClick={() => onNavigate('home')} />
            <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight pt-2">
              Access Your ClickBarry Account
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Sign in or register as an <strong>Affiliate Marketer (100% Free)</strong> to promote marketplace products, or as a <strong>Seller</strong> to list and manage digital products.
            </p>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => onNavigate('affiliate')}
              className="w-full p-4 rounded-2xl bg-[#1f134f]/80 hover:bg-[#271863] border border-indigo-500/40 text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-400" />
                  <span>Affiliate Portal</span>
                </span>
                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full">
                  FREE
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Promote approved creator products and track clicks, commissions &amp; payouts.
              </p>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('seller')}
              className="w-full p-4 rounded-2xl bg-[#1f134f]/80 hover:bg-[#271863] border border-pink-500/40 text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-white flex items-center gap-2">
                  <Rocket className="w-4 h-4 text-pink-400" />
                  <span>Seller Portal</span>
                </span>
                <span className="text-[11px] font-bold text-pink-300 bg-pink-500/15 px-2 py-0.5 rounded-full">
                  CREATORS
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Upload digital products, set affiliate commissions, and monitor product analytics.
              </p>
            </button>
          </div>
        </div>

        {/* Right Form Column */}
        <div className="lg:col-span-7 bg-[#140b33] border border-purple-800/80 rounded-3xl p-7 sm:p-9 shadow-2xl space-y-5">
          <div className="flex p-1 rounded-xl bg-[#1b1044] border border-purple-800">
            <button
              type="button"
              onClick={() => {
                setAuthTab('login');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                authTab === 'login' ? 'bg-pink-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthTab('signup');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                authTab === 'signup' ? 'bg-pink-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          {authTab === 'signup' && (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedRole('affiliate')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  selectedRole === 'affiliate'
                    ? 'bg-indigo-600/25 border-indigo-400 text-white shadow'
                    : 'bg-[#1a0f44] border-purple-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs">
                  <TrendingUp className="w-4 h-4 text-indigo-400" />
                  <span>Affiliate</span>
                </div>
                <span className="text-[11px] text-emerald-400 block mt-0.5 font-semibold">
                  100% Free Forever
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRole('seller')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  selectedRole === 'seller'
                    ? 'bg-pink-600/25 border-pink-400 text-white shadow'
                    : 'bg-[#1a0f44] border-purple-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs">
                  <Rocket className="w-4 h-4 text-pink-400" />
                  <span>Seller</span>
                </div>
                <span className="text-[11px] text-pink-300 block mt-0.5 font-semibold">
                  Sell Digital Products
                </span>
              </button>
            </div>
          )}

          {capturedReferrerCode && authTab !== 'forgot' && (
            <div className="px-3.5 py-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
              <Gift className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Referral Code <strong className="font-mono text-white">{capturedReferrerCode}</strong> captured — preserved across signup &amp; Google OAuth.
              </span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-950/80 border border-red-500/70 text-red-200 text-xs font-medium flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/70 text-emerald-200 text-xs font-medium flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {authTab !== 'forgot' && (
            <GoogleAuthButton
              onClick={handleGoogleAuth}
              loading={googleLoading}
              disabled={loading}
              label={
                authTab === 'signup'
                  ? `Continue with Google (${selectedRole === 'seller' ? 'Seller' : 'Affiliate'})`
                  : 'Continue with Google'
              }
            />
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {authTab === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#1c1145] border border-purple-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
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

            {authTab !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-300">Password</label>
                  {authTab === 'login' && (
                    <button
                      type="button"
                      onClick={() => setAuthTab('forgot')}
                      className="text-[11px] text-pink-400 hover:underline cursor-pointer"
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
                    placeholder="••••••••"
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

            {authTab === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Confirm Password</label>
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
              className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold text-sm shadow-lg shadow-pink-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : authTab === 'signup' ? (
                <>
                  <span>
                    {selectedRole === 'seller' ? 'Register as Seller' : 'Register Free as Affiliate'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : authTab === 'forgot' ? (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Send Reset Link</span>
                </>
              ) : (
                <>
                  <span>Log In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {authTab === 'forgot' && (
              <button
                type="button"
                onClick={() => setAuthTab('login')}
                className="w-full text-center text-xs text-pink-400 hover:underline cursor-pointer pt-1"
              >
                ← Back to Login
              </button>
            )}
          </form>

          <div className="pt-3 border-t border-purple-900/50 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Authenticated via Supabase Security Rules</span>
          </div>
        </div>
      </div>
    </div>
  );
};
