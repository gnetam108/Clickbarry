import React, { useState, useEffect } from 'react';
import { PageId } from '../types';
import { useAuth } from '../context/AuthContext';
import { useReferrals } from '../context/ReferralContext';
import { GoogleAuthButton } from '../components/GoogleAuthButton';
import sellerLaptopImage from '../assets/images/seller_dashboard_laptop_1794019709659.jpg';
import {
  Rocket,
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
  ShieldCheck,
  Gift
} from 'lucide-react';

interface ForSellersPageProps {
  onNavigate: (page: PageId) => void;
  onOpenSignup?: () => void;
}

export const ForSellersPage: React.FC<ForSellersPageProps> = ({ onNavigate }) => {
  const { user, role, signIn, signUp, signInWithGoogle, oauthError, clearOAuthError } = useAuth();
  const { capturedReferrerCode } = useReferrals();

  const [authTab, setAuthTab] = useState<'register' | 'login'>('register');
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

  const handleGoogleSellerAuth = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    setGoogleLoading(true);
    const res = await signInWithGoogle('seller');
    if (!res.success) {
      setGoogleLoading(false);
      setErrorMessage(res.message);
    }
  };

  // Savings Calculator state
  const [productPrice, setProductPrice] = useState(499);
  const [estimatedMonthlySales, setEstimatedMonthlySales] = useState(50);

  const grossRevenue = productPrice * estimatedMonthlySales;
  const clickBarryCost = 999;
  const competitorsCut10Percent = grossRevenue * 0.1 * 12;

  const handleSellerAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (authTab === 'register') {
      if (!fullName.trim()) {
        setErrorMessage('Please enter your name or store brand.');
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
      const res = await signUp(email, password, fullName, 'seller');
      setLoading(false);

      if (!res.success) {
        setErrorMessage(res.message);
        return;
      }

      setSuccessMessage(res.message);
      if (!res.needsEmailVerification) {
        setTimeout(() => onNavigate('seller-dashboard'), 700);
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

    if (res.role === 'affiliate') {
      setSuccessMessage('Signed in! Redirecting to your Affiliate Dashboard...');
      setTimeout(() => onNavigate('affiliate-dashboard'), 700);
    } else if (res.role === 'admin') {
      onNavigate('admincore');
    } else {
      setSuccessMessage('Welcome back! Redirecting to Seller Dashboard...');
      setTimeout(() => onNavigate('seller-dashboard'), 700);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0724] text-slate-100 py-10 px-4 sm:px-6 lg:px-8 space-y-14">
      <div className="max-w-6xl mx-auto space-y-14">
        {/* Hero + Dedicated Seller Registration & Login Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-[#140b33] rounded-3xl p-7 sm:p-10 border border-purple-800/60 shadow-2xl">
          <div className="lg:col-span-6 space-y-5">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/20 text-pink-300 text-xs font-bold uppercase tracking-wider">
              For Creators &amp; Digital Sellers
            </span>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
              Sell Digital Products Without Monthly Rent
            </h1>
            <p className="text-slate-300 text-base leading-relaxed">
              List your digital products, set your own affiliate commission rate, and connect with motivated marketers across ClickBarry. One-time ₹999 lifetime seller pass — zero recurring subscriptions.
            </p>

            <div className="flex flex-wrap gap-3 pt-1">
              <button
                onClick={() => onNavigate('guarantee')}
                className="px-6 py-3 rounded-full bg-[#1e1346] hover:bg-[#2b1b63] text-slate-200 font-semibold text-sm border border-purple-700 cursor-pointer"
              >
                View 30-Day Refund Guarantee
              </button>
              {user && role === 'seller' && (
                <button
                  onClick={() => onNavigate('seller-dashboard')}
                  className="px-6 py-3 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold text-sm shadow-lg shadow-pink-600/30 cursor-pointer flex items-center gap-2"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Open Seller Dashboard</span>
                </button>
              )}
            </div>

            <div className="hidden sm:block pt-2">
              <div className="w-full max-w-xs rounded-2xl overflow-hidden shadow-xl border border-pink-500/20 bg-slate-900/40 p-2">
                <img
                  src={sellerLaptopImage}
                  alt="ClickBarry Seller Dashboard"
                  className="w-full h-36 object-cover rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Dedicated Seller Register / Login Card */}
          <div className="lg:col-span-6 bg-[#18103d] border border-pink-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4">
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
                      {authTab === 'register' ? 'Register as a Seller' : 'Seller Login'}
                    </h2>
                    <p className="text-xs text-slate-400">
                      Create your Seller Dashboard &amp; submit products
                    </p>
                  </div>
                  <span className="text-[10px] font-extrabold bg-pink-500/20 text-pink-300 border border-pink-500/40 px-2.5 py-1 rounded-full">
                    ₹999 PASS READY
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
                      authTab === 'register' ? 'bg-pink-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Register Seller
                  </button>
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
                    Seller Login
                  </button>
                </div>

                {capturedReferrerCode && (
                  <div className="px-3 py-2 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
                    <Gift className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      Invited with Referral Code <strong className="font-mono text-white">{capturedReferrerCode}</strong> — permanent attribution on signup.
                    </span>
                  </div>
                )}

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

                <GoogleAuthButton
                  onClick={handleGoogleSellerAuth}
                  loading={googleLoading}
                  disabled={loading}
                  label="Continue with Google"
                />

                <form onSubmit={handleSellerAuth} className="space-y-3">
                  {authTab === 'register' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name / Creator Brand</label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          required
                          placeholder="Your name or studio"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#110a2d] border border-purple-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Seller Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        placeholder="seller@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#110a2d] border border-purple-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
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
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#110a2d] border border-purple-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
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
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#110a2d] border border-purple-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold text-sm shadow-lg shadow-pink-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Authenticating...</span>
                      </>
                    ) : authTab === 'register' ? (
                      <>
                        <Rocket className="w-4 h-4" />
                        <span>Create Seller Account</span>
                      </>
                    ) : (
                      <>
                        <span>Login to Seller Dashboard</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                <div className="pt-2 border-t border-purple-900/50 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Products undergo quick Admin review before public Marketplace listing</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Comparison Table */}
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Why Creators Choose ClickBarry</h2>
            <p className="text-sm text-slate-400">
              One-time ₹999 lifetime seller pass — zero recurring monthly platform fees.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse bg-[#140b33] rounded-2xl overflow-hidden border border-purple-900/60">
              <thead>
                <tr className="border-b border-purple-900/60 bg-[#1c1145] text-xs font-bold uppercase tracking-wider text-slate-300">
                  <th className="py-4 px-6">Feature</th>
                  <th className="py-4 px-6 text-pink-400 font-black text-sm">ClickBarry (₹999 Lifetime)</th>
                  <th className="py-4 px-6 text-slate-400">Traditional Marketplaces</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-900/40 text-sm">
                <tr>
                  <td className="py-4 px-6 font-semibold text-white">Monthly Subscription</td>
                  <td className="py-4 px-6 text-emerald-400 font-bold">₹0 Forever (Zero monthly fees)</td>
                  <td className="py-4 px-6 text-slate-400">₹2,000 – ₹5,000 / month</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-semibold text-white">Product Listings Limit</td>
                  <td className="py-4 px-6 text-emerald-400 font-bold">Unlimited digital items</td>
                  <td className="py-4 px-6 text-slate-400">Restricted tiers or fees per item</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-semibold text-white">Built-in Affiliate Promotion</td>
                  <td className="py-4 px-6 text-emerald-400 font-bold">Included at no extra charge</td>
                  <td className="py-4 px-6 text-slate-400">Paid add-on / separate tools</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-semibold text-white">Sales Guarantee</td>
                  <td className="py-4 px-6 text-emerald-400 font-bold">5 Sales or 100% Refund</td>
                  <td className="py-4 px-6 text-slate-400">No refunds whatsoever</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Savings Calculator */}
        <div className="bg-gradient-to-br from-[#160d3a] to-[#11082d] rounded-3xl p-8 sm:p-10 border border-purple-800 shadow-xl space-y-8">
          <div className="space-y-2">
            <span className="text-pink-400 text-xs font-bold uppercase tracking-wider">Savings Estimator</span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
              Compare ClickBarry&apos;s One-Time ₹999 Model
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm font-semibold text-slate-300 mb-2">
                  <span>Average Product Price:</span>
                  <span className="text-pink-400 font-bold">₹{productPrice}</span>
                </div>
                <input
                  type="range"
                  min="99"
                  max="4999"
                  step="50"
                  value={productPrice}
                  onChange={(e) => setProductPrice(Number(e.target.value))}
                  className="w-full accent-pink-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-sm font-semibold text-slate-300 mb-2">
                  <span>Estimated Monthly Sales:</span>
                  <span className="text-pink-400 font-bold">{estimatedMonthlySales} copies/month</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="300"
                  step="5"
                  value={estimatedMonthlySales}
                  onChange={(e) => setEstimatedMonthlySales(Number(e.target.value))}
                  className="w-full accent-pink-500 cursor-pointer"
                />
              </div>
            </div>

            <div className="bg-[#1b1046] rounded-2xl p-6 border border-pink-500/40 space-y-4 text-center">
              <div>
                <span className="text-xs uppercase font-bold text-slate-400">Monthly Gross Revenue</span>
                <p className="text-3xl font-black text-white mt-1">₹{grossRevenue.toLocaleString()}</p>
              </div>
              <div className="pt-4 border-t border-purple-800">
                <span className="text-xs uppercase font-bold text-emerald-400">Estimated 1-Year Platform Savings</span>
                <p className="text-4xl font-black bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent mt-1">
                  ₹{Math.max(0, competitorsCut10Percent - clickBarryCost).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
