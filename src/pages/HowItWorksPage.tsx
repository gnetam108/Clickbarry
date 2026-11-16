import React, { useState } from 'react';
import { PageId } from '../types';
import { FAQS } from '../data/mockData';
import {
  UserPlus,
  CreditCard,
  Package,
  TrendingUp,
  Share2,
  DollarSign,
  ShieldCheck,
  ChevronDown,
  ArrowRight,
  Check,
  Zap
} from 'lucide-react';

interface HowItWorksPageProps {
  onNavigate: (page: PageId) => void;
  onOpenSignup: () => void;
}

export const HowItWorksPage: React.FC<HowItWorksPageProps> = ({
  onNavigate,
  onOpenSignup
}) => {
  const [activeTab, setActiveTab] = useState<'sellers' | 'affiliates'>('sellers');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-[#0d0724] text-slate-100 py-12 px-4 sm:px-6 lg:px-8 space-y-16">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Page Hero */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-pink-500/20 text-pink-300 text-xs font-bold uppercase tracking-wider">
            🍓 Complete Platform Walkthrough
          </span>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white">
            How ClickBarry Works
          </h1>
          <p className="text-slate-300 text-base sm:text-lg">
            Whether you are a digital creator selling your work or an affiliate marketer looking to earn high commissions, ClickBarry makes it dead simple.
          </p>

          {/* Persona Switcher Tabs */}
          <div className="inline-flex p-1.5 rounded-full bg-[#180f3d] border border-purple-800 shadow-lg mt-4">
            <button
              onClick={() => setActiveTab('sellers')}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'sellers'
                  ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              For Product Sellers
            </button>
            <button
              onClick={() => setActiveTab('affiliates')}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'affiliates'
                  ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              For Affiliates & Marketers
            </button>
          </div>
        </div>

        {/* Dynamic Content based on Active Tab */}
        {activeTab === 'sellers' ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Step 1 */}
              <div className="bg-[#140b33] rounded-2xl p-6 border border-purple-800/60 shadow-lg relative flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-full bg-pink-500 text-white font-extrabold flex items-center justify-center text-sm mb-4">
                    01
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Create Seller Account</h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Sign up with your email and basic store details. Set up your brand identity in under 2 minutes.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-purple-900/60 flex items-center gap-2 text-xs text-pink-400 font-semibold">
                  <Check className="w-4 h-4 text-emerald-400" /> Free Registration
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-[#140b33] rounded-2xl p-6 border border-purple-800/60 shadow-lg relative flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-full bg-pink-500 text-white font-extrabold flex items-center justify-center text-sm mb-4">
                    02
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Pay Once – ₹999</h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Unlock lifetime seller privileges. No monthly subscriptions, no hosting charges, no surprise fees.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-purple-900/60 flex items-center gap-2 text-xs text-pink-400 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> 100% Refund Guarantee
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-[#140b33] rounded-2xl p-6 border border-purple-800/60 shadow-lg relative flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-full bg-pink-500 text-white font-extrabold flex items-center justify-center text-sm mb-4">
                    03
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Upload Products</h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Add Notion templates, codes, e-books, or courses. Set your own pricing and commission rates for affiliates.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-purple-900/60 flex items-center gap-2 text-xs text-pink-400 font-semibold">
                  <Package className="w-4 h-4 text-emerald-400" /> Unlimited Listings
                </div>
              </div>

              {/* Step 4 */}
              <div className="bg-[#140b33] rounded-2xl p-6 border border-purple-800/60 shadow-lg relative flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-full bg-pink-500 text-white font-extrabold flex items-center justify-center text-sm mb-4">
                    04
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Scale Sales & Profit</h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Watch affiliates drive traffic to your store while you keep the majority of revenue on auto-pilot.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-purple-900/60 flex items-center gap-2 text-xs text-pink-400 font-semibold">
                  <TrendingUp className="w-4 h-4 text-emerald-400" /> Instant Bank Settlement
                </div>
              </div>
            </div>

            {/* Seller Guarantee Callout */}
            <div className="rounded-2xl bg-gradient-to-r from-emerald-950/60 to-purple-950/60 border border-emerald-500/40 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-1">
                <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">
                  Verified Creator Protection
                </span>
                <h4 className="text-xl font-bold text-white">
                  Get at least 5 sales in your first month or get a full refund
                </h4>
                <p className="text-sm text-slate-300 max-w-xl">
                  We are so confident in ClickBarry that if your products generate fewer than 5 sales within 30 days, simply apply for an instant refund of your ₹999 fee.
                </p>
              </div>
              <button
                onClick={onOpenSignup}
                className="px-6 py-3 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold text-sm shrink-0 cursor-pointer"
              >
                Start Selling Now
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Affiliate Step 1 */}
              <div className="bg-[#140b33] rounded-2xl p-6 border border-purple-800/60 shadow-lg relative flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-extrabold flex items-center justify-center text-sm mb-4">
                    01
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Join Free</h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Create a free affiliate account in 60 seconds. No application fees, no waiting for manual approval.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-purple-900/60 text-xs text-emerald-400 font-semibold">
                  ✓ Instant Access
                </div>
              </div>

              {/* Affiliate Step 2 */}
              <div className="bg-[#140b33] rounded-2xl p-6 border border-purple-800/60 shadow-lg relative flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-extrabold flex items-center justify-center text-sm mb-4">
                    02
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Pick Top Products</h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Browse verified digital products offering 30% to 70% commission rates with proven conversion rates.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-purple-900/60 text-xs text-pink-400 font-semibold">
                  ✓ High-Converting Offers
                </div>
              </div>

              {/* Affiliate Step 3 */}
              <div className="bg-[#140b33] rounded-2xl p-6 border border-purple-800/60 shadow-lg relative flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-extrabold flex items-center justify-center text-sm mb-4">
                    03
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Share Custom Link</h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Post your referral link on Instagram bio, YouTube descriptions, Telegram channels, or WhatsApp groups.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-purple-900/60 text-xs text-amber-400 font-semibold">
                  ✓ 60-Day Cookie Tracking
                </div>
              </div>

              {/* Affiliate Step 4 */}
              <div className="bg-[#140b33] rounded-2xl p-6 border border-purple-800/60 shadow-lg relative flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-extrabold flex items-center justify-center text-sm mb-4">
                    04
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Weekly Payouts</h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Earn commissions credited directly to your UPI ID or Indian bank account every single Tuesday.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-purple-900/60 text-xs text-emerald-400 font-semibold">
                  ✓ Direct UPI / Bank Transfer
                </div>
              </div>
            </div>

            <div className="text-center pt-4">
              <button
                onClick={() => onNavigate('affiliates')}
                className="px-8 py-3.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold text-base shadow-lg cursor-pointer"
              >
                Join ClickBarry Affiliate Network
              </button>
            </div>
          </div>
        )}

        {/* Frequently Asked Questions */}
        <div className="pt-8 border-t border-purple-900/40 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-extrabold text-white">
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-slate-400">
              Everything you need to know about ClickBarry features and policies.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-3">
            {FAQS.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-xl bg-[#140b33] border border-purple-900/60 overflow-hidden"
              >
                <button
                  onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                  className="w-full px-5 py-4 text-left flex items-center justify-between text-base font-bold text-white hover:text-pink-400 transition-colors cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 shrink-0 transition-transform ${expandedFaq === idx ? 'rotate-180 text-pink-400' : 'text-slate-400'}`} />
                </button>
                {expandedFaq === idx && (
                  <div className="px-5 pb-5 text-sm text-slate-300 leading-relaxed border-t border-purple-900/40 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
