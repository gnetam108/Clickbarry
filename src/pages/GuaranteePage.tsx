import React, { useState } from 'react';
import { PageId } from '../types';
import {
  ShieldCheck,
  RefreshCw,
  CheckCircle,
  Clock,
  Send,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Lock
} from 'lucide-react';

interface GuaranteePageProps {
  onNavigate: (page: PageId) => void;
  onOpenSignup: () => void;
}

export const GuaranteePage: React.FC<GuaranteePageProps> = ({
  onNavigate,
  onOpenSignup
}) => {
  const [claimEmail, setClaimEmail] = useState('');
  const [orderId, setOrderId] = useState('');
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const securityShieldImage = '/src/assets/images/gold_security_shield_1794019711572.jpg';

  const handleSubmitClaim = (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimEmail || !orderId) return;
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#0d0724] text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Hero Banner */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-[#140b33] rounded-3xl p-8 sm:p-12 border border-purple-800/60 shadow-2xl">
          <div className="md:col-span-8 space-y-4">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              100% Peace of Mind Guarantee
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
              Our Promise &amp; 30-Day Refund Policy
            </h1>
            <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
              We built ClickBarry to empower digital creators with zero financial anxiety. If you do not see real sales results, you do not pay.
            </p>
          </div>

          <div className="md:col-span-4 flex justify-center">
            <div className="w-44 h-44 rounded-2xl overflow-hidden p-2 bg-[#1b1042] border border-emerald-500/30 shadow-xl flex items-center justify-center">
              <img
                src={securityShieldImage}
                alt="ClickBarry Security Guarantee"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>

        {/* 4 Pillars of Our Promise (from Reference Design) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-[#150c37] p-6 rounded-2xl border border-purple-900/60 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base">Secure & Trusted Platform</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              All transactions are encrypted with bank-grade 256-bit SSL protocols.
            </p>
          </div>

          <div className="bg-[#150c37] p-6 rounded-2xl border border-purple-900/60 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base">Transparent Policies</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              No hidden platform deductions or unexpected renewal fees. Everything is clearly written.
            </p>
          </div>

          <div className="bg-[#150c37] p-6 rounded-2xl border border-purple-900/60 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base">Dedicated Support</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Our creator success team answers questions via email and priority community channels.
            </p>
          </div>

          <div className="bg-[#150c37] p-6 rounded-2xl border border-purple-900/60 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center">
              <CheckCircle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base">Your Success, Our Priority</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              We win only when creators and affiliates prosper together.
            </p>
          </div>
        </div>

        {/* Detailed Refund Terms Card */}
        <div className="bg-gradient-to-br from-[#170e3e] to-[#10082b] rounded-3xl p-8 sm:p-10 border border-purple-800/80 shadow-xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-pink-600/20 text-pink-400 flex items-center justify-center">
              <RefreshCw className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">
                The 5-Sales / 1-Month Refund Clause
              </h2>
              <p className="text-sm text-slate-300">
                Official terms from our ClickBarry Creator Covenant
              </p>
            </div>
          </div>

          <div className="bg-black/30 rounded-2xl p-6 border border-pink-500/20 space-y-4">
            <p className="text-slate-200 text-sm sm:text-base leading-relaxed">
              “If you get less than 5 sales in 1 month, you can apply for a refund after 1 month from your purchase date.”
            </p>

            <ul className="space-y-2 text-xs sm:text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Applies to the ₹999 one-time Lifetime Seller Access fee.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Eligibility starts after 30 days have elapsed from your payment date.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>You must have uploaded at least 1 genuine digital product with valid description and pricing.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Refund is processed back to the original payment source within 3–5 working days without questioning.</span>
              </li>
            </ul>
          </div>

          {/* Interactive Claim Form */}
          <div className="pt-4 border-t border-purple-900/60">
            <h3 className="text-lg font-bold text-white mb-4">
              Submit a Guarantee Refund Claim
            </h3>

            {submitted ? (
              <div className="bg-emerald-950/60 border border-emerald-600/60 rounded-2xl p-6 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-6 h-6 stroke-[3]" />
                </div>
                <h4 className="text-lg font-bold text-emerald-300">Claim Request Received!</h4>
                <p className="text-xs text-slate-300 max-w-md mx-auto">
                  Ticket #CB-REF-{Math.floor(100000 + Math.random() * 900000)} has been generated for {claimEmail}. Our accounting team verifies the 30-day timeline and issues the ₹999 refund directly.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-3 text-xs text-pink-400 underline font-semibold cursor-pointer"
                >
                  Submit another inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitClaim} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Your Registered Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="creator@example.com"
                    value={claimEmail}
                    onChange={(e) => setClaimEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#140b33] border border-purple-800 text-sm text-white focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Order / Transaction ID
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="CB-ORDER-999-XXXX"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#140b33] border border-purple-800 text-sm text-white focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Feedback or Reason (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Tell us about your experience..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#140b33] border border-purple-800 text-sm text-white focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Submit Refund Request</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
