import React, { useState } from 'react';
import { PageId } from '../types';
import {
  Rocket,
  Check,
  Star,
  Shield,
  Layers,
  BarChart3,
  DollarSign,
  ArrowRight,
  Sparkles,
  Zap,
  CheckCircle2
} from 'lucide-react';

interface ForSellersPageProps {
  onNavigate: (page: PageId) => void;
  onOpenSignup: () => void;
}

export const ForSellersPage: React.FC<ForSellersPageProps> = ({
  onNavigate,
  onOpenSignup
}) => {
  const [productPrice, setProductPrice] = useState(499);
  const [estimatedMonthlySales, setEstimatedMonthlySales] = useState(50);

  const sellerLaptopImage = '/src/assets/images/seller_dashboard_laptop_1794019709659.jpg';

  // Calculator logic
  const grossRevenue = productPrice * estimatedMonthlySales;
  const clickBarryCost = 999; // One-time!
  const competitorsCut10Percent = grossRevenue * 0.10 * 12; // Yearly cost on typical 10% platform

  return (
    <div className="min-h-screen bg-[#0d0724] text-slate-100 py-12 px-4 sm:px-6 lg:px-8 space-y-16">
      <div className="max-w-6xl mx-auto space-y-14">
        {/* Hero */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-[#140b33] rounded-3xl p-8 sm:p-12 border border-purple-800/60 shadow-2xl">
          <div className="lg:col-span-7 space-y-5">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/20 text-pink-300 text-xs font-bold uppercase tracking-wider">
              🍓 For Creators & Software Developers
            </span>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
              Sell Digital Products Without Monthly Rent
            </h1>
            <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
              Pay ₹999 once and unlock lifetime seller access. List unlimited digital products, keep your hard-earned profits, and harness our affiliate network to multiply your sales.
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <button
                onClick={onOpenSignup}
                className="px-8 py-3.5 rounded-full bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold text-base shadow-xl shadow-pink-600/40 flex items-center gap-2 cursor-pointer"
              >
                <Rocket className="w-5 h-5" />
                <span>Get Lifetime Access for ₹999</span>
              </button>
              <button
                onClick={() => onNavigate('guarantee')}
                className="px-6 py-3.5 rounded-full bg-[#1e1346] hover:bg-[#2b1b63] text-slate-200 font-semibold text-sm border border-purple-800 cursor-pointer"
              >
                View 30-Day Refund Guarantee
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl border border-pink-500/20 bg-slate-900/40 p-3">
              <img
                src={sellerLaptopImage}
                alt="ClickBarry Seller Dashboard"
                className="w-full h-auto object-cover rounded-xl"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>

        {/* Comparison Table: ClickBarry vs Other Platforms */}
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Why Creators Choose ClickBarry
            </h2>
            <p className="text-sm text-slate-400">
              Stop paying recurring subscriptions for features you should own forever.
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
                  <td className="py-4 px-6 font-semibold text-white">Built-in Affiliate Army</td>
                  <td className="py-4 px-6 text-emerald-400 font-bold">Included at no extra charge</td>
                  <td className="py-4 px-6 text-slate-400">Paid add-on / separate tools</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-semibold text-white">Sales Guarantee</td>
                  <td className="py-4 px-6 text-emerald-400 font-bold">5 Sales or 100% Refund</td>
                  <td className="py-4 px-6 text-slate-400">No refunds whatsoever</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-semibold text-white">Customer Data Ownership</td>
                  <td className="py-4 px-6 text-emerald-400 font-bold">100% direct customer access</td>
                  <td className="py-4 px-6 text-slate-400">Platform locks user emails</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Interactive Earnings & Savings Calculator */}
        <div className="bg-gradient-to-br from-[#160d3a] to-[#11082d] rounded-3xl p-8 sm:p-10 border border-purple-800 shadow-xl space-y-8">
          <div className="space-y-2">
            <span className="text-pink-400 text-xs font-bold uppercase tracking-wider">
              💰 Calculate Your Annual Savings
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
              See how much you save with ClickBarry's ₹999 One-Time Model
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

              <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-800 text-xs text-slate-300 leading-relaxed">
                💡 Other platforms typically cut 10% to 15% on every transaction plus ₹2,000/mo platform maintenance. On ClickBarry you pay ₹999 once and keep what you earn.
              </div>
            </div>

            {/* Results Panel */}
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
                <span className="text-xs text-slate-400 mt-1 block">Saved vs typical 10% commission platforms</span>
              </div>

              <button
                onClick={onOpenSignup}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold text-sm shadow-lg shadow-pink-600/30 cursor-pointer"
              >
                Claim ₹999 Lifetime Seller Deal
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
