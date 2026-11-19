import React, { useState } from 'react';
import { PageId } from '../types';
import { useAuth } from '../context/AuthContext';
import affiliateCoinsImage from '../assets/images/affiliate_coins_chart_1794019709558.jpg';
import {
  TrendingUp,
  DollarSign,
  Zap,
  Wallet,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  LayoutDashboard,
  ShieldCheck
} from 'lucide-react';

interface ForAffiliatesPageProps {
  onNavigate: (page: PageId) => void;
  onOpenSignup?: () => void;
}

export const ForAffiliatesPage: React.FC<ForAffiliatesPageProps> = ({ onNavigate }) => {
  const { user, role, signIn, signUp } = useAuth();

  const [authTab, setAuthTab] = useState<'register' | 'login'>('register');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Earnings Calculator state
  const [dailyClicks, setDailyClicks] = useState(100);
  const [conversionRate] = useState(3);
  const [avgProductPrice, setAvgProductPrice] = useState(799);
  const [commissionRate, setCommissionRate] = useState(50);

  const monthlyClicks = dailyClicks * 30;
  const monthlyBuyers = Math.floor(monthlyClicks * (conversionRate / 100));
  const estimatedMonthlyCommission = Math.floor(monthlyBuyers * avgProductPrice * (commissionRate / 100));

  const handleAffiliateAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (authTab === 'register') {
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
      const res = await signUp(email, password, fullName, 'affiliate');
      setLoading(false);

      if (!res.success) {
        setErrorMessage(res.message);
        return;
      }

      setSuccessMessage(res.message);
      if (!res.needsEmailVerification) {
        setTimeout(() => onNavigate('affiliate-dashboard'), 700);
      }
      return;
    }

    setLoading(true);
    const res = await signIn(email, password);
    setLoading(false);

    if (!res.success) {
      setErrorMessage(res.message);
      return;
    }

    if (res.role === 'seller') {
      setSuccessMessage('Signed in! Redirecting to your Seller Dashboard...');
      setTimeout(() => onNavigate('seller-dashboard'), 700);
    } else if (res.role === 'admin') {
      onNavigate('admincore');
    } else {
      setSuccessMessage('Welcome back! Redirecting to Affiliate Dashboard...');
      setTimeout(() => onNavigate('affiliate-dashboard'), 700);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0724] text-slate-100 py-10 px-4 sm:px-6 lg:px-8 space-y-14">
      <div className="max-w-6xl mx-auto space-y-14">
        {/* Hero + Dedicated Free Affiliate Registration & Login Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-[#140b33] rounded-3xl p-7 sm:p-10 border border-purple-800/60 shadow-2xl">
          <div className="lg:col-span-6 space-y-5">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider">
              100% Free Affiliate Program
            </span>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
              Promote Digital Products. Earn High Commissions.
            </h1>
            <p className="text-slate-300 text-base leading-relaxed">
              Join ClickBarry completely free — no membership fee ever. Pick verified creator products in our Marketplace, generate instant tracking links, and monitor clicks, sales, and payouts in real time.
            </p>

            <div className="flex flex-wrap gap-3 pt-1">
              <button
                onClick={() => onNavigate('marketplace')}
                className="px-6 py-3 rounded-full bg-[#1e1346] hover:bg-[#2b1b63] text-slate-100 font-semibold text-sm border border-purple-700 cursor-pointer flex items-center gap-2"
              >
                <span>Browse Marketplace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              {user && role !== 'seller' && (
                <button
                  onClick={() => onNavigate('affiliate-dashboard')}
                  className="px-6 py-3 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold text-sm shadow-lg shadow-pink-600/30 cursor-pointer flex items-center gap-2"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Open Affiliate Dashboard</span>
                </button>
              )}
            </div>

            <div className="hidden sm:block pt-2">
              <div className="w-full max-w-xs rounded-2xl overflow-hidden shadow-xl border border-indigo-500/20 bg-slate-900/40 p-2">
                <img
                  src={affiliateCoinsImage}
                  alt="Affiliate Commission Growth"
                  className="w-full h-36 object-cover rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Dedicated Affiliate Register / Login Form */}
          <div className="lg:col-span-6 bg-[#18103d] border border-indigo-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4">
            {user ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl font-black text-white">You are Signed In</h2>
                  <p className="text-xs text-slate-300">
                    Logged in as <strong>{user.email}</strong> ({role === 'seller' ? 'Seller Account' : 'Affiliate Account'})
                  </p>
                </div>
                <button
                  onClick={() => onNavigate(role === 'seller' ? 'seller-dashboard' : 'affiliate-dashboard')}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Go to {role === 'seller' ? 'Seller' : 'Affiliate'} Dashboard</span>
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black text-white">
                      {authTab === 'register' ? 'Become an Affiliate (Free)' : 'Affiliate Login'}
                    </h2>
                    <p className="text-xs text-slate-400">
                      Zero fees • Instant tracking links &amp; commission dashboard
                    </p>
                  </div>
                  <span className="text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-full">
                    FREE
                  </span>
                </div>

                <div className="flex p-1 rounded-xl bg-[#110a2d] border border-purple-800">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthTab('register');
                      setErrorMessage('');
                      setSuccessMessage('');
                    }}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      authTab === 'register' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Register Free
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthTab('login');
                      setErrorMessage('');
                      setSuccessMessage('');
                    }}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      authTab === 'login' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Affiliate Login
                  </button>
                </div>

                {errorMessage && (
                  <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/70 text-red-200 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {successMessage && (
                  <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/70 text-emerald-200 text-xs flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{successMessage}</span>
                  </div>
                )}

                <form onSubmit={handleAffiliateAuth} className="space-y-3">
                  {authTab === 'register' && (
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
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#110a2d] border border-purple-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400"
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
                        placeholder="affiliate@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#110a2d] border border-purple-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#110a2d] border border-purple-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400"
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

                  {authTab === 'register' && (
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
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#110a2d] border border-purple-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-600 hover:from-indigo-600 hover:to-pink-700 text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Authenticating...</span>
                      </>
                    ) : authTab === 'register' ? (
                      <>
                        <TrendingUp className="w-4 h-4" />
                        <span>Create Free Affiliate Account</span>
                      </>
                    ) : (
                      <>
                        <span>Login to Affiliate Dashboard</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                <div className="pt-2 border-t border-purple-900/50 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Affiliates are never charged any membership fee</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 3 Affiliate Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#140b33] p-6 rounded-2xl border border-purple-900/60 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg text-white">High Digital Commissions</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Digital templates, software scripts, and courses offer 30% to 70% commissions on verified sales.
            </p>
          </div>

          <div className="bg-[#140b33] p-6 rounded-2xl border border-purple-900/60 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg text-white">UPI &amp; Bank Payout Requests</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Withdraw approved commission balances directly to your UPI ID or Indian Bank Account from your dashboard.
            </p>
          </div>

          <div className="bg-[#140b33] p-6 rounded-2xl border border-purple-900/60 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg text-white">Instant Unique Tracking Links</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Generate your unique tracking slug with optional SubIDs for YouTube, blogs, WhatsApp, or newsletters.
            </p>
          </div>
        </div>

        {/* Affiliate Commission Calculator */}
        <div className="bg-gradient-to-br from-[#160d3a] to-[#11082d] rounded-3xl p-8 sm:p-10 border border-purple-800 shadow-xl space-y-8">
          <div className="space-y-2">
            <span className="text-pink-400 text-xs font-bold uppercase tracking-wider">
              Interactive Earnings Estimator
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
              Estimate Your Monthly Commission Potential
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                  <span>Daily Link Clicks:</span>
                  <span className="text-pink-400 font-bold">{dailyClicks} clicks/day</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="1000"
                  step="20"
                  value={dailyClicks}
                  onChange={(e) => setDailyClicks(Number(e.target.value))}
                  className="w-full accent-pink-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                  <span>Average Product Price:</span>
                  <span className="text-pink-400 font-bold">₹{avgProductPrice}</span>
                </div>
                <input
                  type="range"
                  min="199"
                  max="2999"
                  step="100"
                  value={avgProductPrice}
                  onChange={(e) => setAvgProductPrice(Number(e.target.value))}
                  className="w-full accent-pink-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                  <span>Affiliate Commission Rate:</span>
                  <span className="text-pink-400 font-bold">{commissionRate}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="70"
                  step="5"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(Number(e.target.value))}
                  className="w-full accent-pink-500 cursor-pointer"
                />
              </div>
            </div>

            <div className="bg-[#1b1046] rounded-2xl p-6 border border-pink-500/40 text-center space-y-3">
              <span className="text-xs uppercase font-bold text-slate-400">Projected Monthly Commission</span>
              <p className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-pink-400 via-rose-400 to-amber-300 bg-clip-text text-transparent">
                ₹{estimatedMonthlyCommission.toLocaleString()}
              </p>
              <p className="text-xs text-slate-300">
                Illustrative projection based on ~{monthlyBuyers} monthly purchases (~3% conversion)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
