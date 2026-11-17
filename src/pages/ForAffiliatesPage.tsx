import React, { useState } from 'react';
import { PageId } from '../types';
import affiliateCoinsImage from '../assets/images/affiliate_coins_chart_1794019709558.jpg';
import {
  TrendingUp,
  DollarSign,
  Share2,
  Zap,
  CheckCircle,
  Copy,
  Check,
  Award,
  Wallet
} from 'lucide-react';

interface ForAffiliatesPageProps {
  onNavigate: (page: PageId) => void;
  onOpenSignup: () => void;
}

export const ForAffiliatesPage: React.FC<ForAffiliatesPageProps> = ({
  onNavigate,
  onOpenSignup
}) => {
  const [copied, setCopied] = useState(false);
  const [dailyClicks, setDailyClicks] = useState(100);
  const [conversionRate, setConversionRate] = useState(3); // 3%
  const [avgProductPrice, setAvgProductPrice] = useState(799);
  const [commissionRate, setCommissionRate] = useState(50); // 50%

  // Math
  const monthlyClicks = dailyClicks * 30;
  const monthlyBuyers = Math.floor(monthlyClicks * (conversionRate / 100));
  const estimatedMonthlyCommission = Math.floor(monthlyBuyers * avgProductPrice * (commissionRate / 100));

  const handleCopyLink = () => {
    navigator.clipboard?.writeText('https://clickbarry.com/go?ref=demo_affiliate');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0d0724] text-slate-100 py-12 px-4 sm:px-6 lg:px-8 space-y-16">
      <div className="max-w-6xl mx-auto space-y-14">
        {/* Hero */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-[#140b33] rounded-3xl p-8 sm:p-12 border border-purple-800/60 shadow-2xl">
          <div className="lg:col-span-7 space-y-5">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider">
              🍓 100% Free to Join
            </span>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
              Promote Digital Products. Earn Up to 70% Commission.
            </h1>
            <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
              No inventory, no customer support hassle, no upfront fees. Choose verified high-converting templates, courses, and codekits on ClickBarry and get paid weekly.
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <button
                onClick={onOpenSignup}
                className="px-8 py-3.5 rounded-full bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold text-base shadow-xl shadow-pink-600/40 flex items-center gap-2 cursor-pointer"
              >
                <TrendingUp className="w-5 h-5" />
                <span>Join ClickBarry Affiliates (Free)</span>
              </button>
              <button
                onClick={() => onNavigate('marketplace')}
                className="px-6 py-3.5 rounded-full bg-[#1e1346] hover:bg-[#2b1b63] text-slate-200 font-semibold text-sm border border-purple-800 cursor-pointer"
              >
                Browse High-Commission Products
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl border border-indigo-500/20 bg-slate-900/40 p-3">
              <img
                src={affiliateCoinsImage}
                alt="Affiliate Commission Growth"
                className="w-full h-auto object-cover rounded-xl"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>

        {/* 4 Pillars of ClickBarry Affiliates */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#140b33] p-6 rounded-2xl border border-purple-900/60 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg text-white">Digital Margins (30% to 70%)</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Unlike physical e-commerce where affiliate cuts are 2%–5%, digital software and templates yield huge commissions on every sale.
            </p>
          </div>

          <div className="bg-[#140b33] p-6 rounded-2xl border border-purple-900/60 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg text-white">Direct Weekly UPI / Bank Payouts</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Earnings get transferred directly to your Google Pay, PhonePe, Paytm, or Indian bank account every Tuesday without delayed holding.
            </p>
          </div>

          <div className="bg-[#140b33] p-6 rounded-2xl border border-purple-900/60 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg text-white">60-Day Cookie Attribution</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              When a user clicks your link and buys within 60 days, you earn full credit for the referral even if they purchase later.
            </p>
          </div>
        </div>

        {/* Affiliate Commission Calculator */}
        <div className="bg-gradient-to-br from-[#160d3a] to-[#11082d] rounded-3xl p-8 sm:p-10 border border-purple-800 shadow-xl space-y-8">
          <div className="space-y-2">
            <span className="text-pink-400 text-xs font-bold uppercase tracking-wider">
              📈 Interactive Earnings Estimator
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
              How much can you earn each month?
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
                  <span>Affiliate Commission Split:</span>
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

            {/* Income Card */}
            <div className="bg-[#1b1046] rounded-2xl p-6 border border-pink-500/40 text-center space-y-3">
              <span className="text-xs uppercase font-bold text-slate-400">Estimated Monthly Commission</span>
              <p className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-pink-400 via-rose-400 to-amber-300 bg-clip-text text-transparent">
                ₹{estimatedMonthlyCommission.toLocaleString()}
              </p>
              <p className="text-xs text-slate-300">
                Based on ~{monthlyBuyers} monthly purchases from your referral links
              </p>

              <button
                onClick={onOpenSignup}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold text-sm shadow-lg shadow-pink-600/30 cursor-pointer mt-4"
              >
                Create Free Affiliate Account
              </button>
            </div>
          </div>
        </div>

        {/* Demo Link Copy Box */}
        <div className="bg-[#140b33] rounded-2xl p-6 border border-purple-900/60 space-y-3">
          <h4 className="text-base font-bold text-white flex items-center gap-2">
            <Share2 className="w-4 h-4 text-pink-400" />
            <span>Sample ClickBarry Affiliate Link Format</span>
          </h4>
          <div className="flex items-center gap-2 bg-[#1b1044] p-2.5 rounded-xl border border-purple-800">
            <code className="text-xs text-pink-300 flex-1 truncate font-mono">
              https://clickbarry.com/go?ref=demo_affiliate
            </code>
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
