import React, { useState, useEffect } from 'react';
import { usePayUMembership } from '../context/PayUMembershipContext';
import { useAuth } from '../context/AuthContext';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Sparkles,
  Info,
  Clock
} from 'lucide-react';

interface PayUCheckoutModalProps {
  onSuccessRedirect?: () => void;
}

export const PayUCheckoutModal: React.FC<PayUCheckoutModalProps> = () => {
  const { isCheckoutOpen, closeCheckout, isLifetimeSeller } = usePayUMembership();
  const { user, profile } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (isCheckoutOpen) {
      setName(profile?.full_name || user?.user_metadata?.full_name || '');
      setEmail(user?.email || '');
    }
  }, [isCheckoutOpen, profile, user]);

  if (!isCheckoutOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-3xl bg-[#120a2e] border border-purple-800/80 shadow-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-pink-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-pink-400 bg-pink-500/20 border border-pink-500/40 px-3 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Lifetime Seller Pass
              </span>
              <span className="text-[11px] font-bold text-amber-300 bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded-full">
                PayU Gateway Pending
              </span>
            </div>
            <h3 className="text-2xl font-black text-white tracking-tight">
              Seller Lifetime Membership (₹999)
            </h3>
            <p className="text-xs text-slate-300">
              One-time payment of ₹999 INR. Lifetime access with zero monthly or renewal fees.
            </p>
          </div>
          <button
            onClick={closeCheckout}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/5 cursor-pointer transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Plan Value Breakdown */}
        <div className="p-4 rounded-2xl bg-[#1a0f44] border border-purple-700/60 space-y-3 relative z-10">
          <div className="flex items-baseline justify-between border-b border-purple-800/60 pb-3">
            <div>
              <span className="font-extrabold text-sm text-white block">One-Time Lifetime Membership</span>
              <span className="text-[11px] text-pink-300">No monthly subscription • No recurring billing</span>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black text-emerald-400">₹999</span>
              <span className="text-[10px] text-slate-400 block font-mono">INR (One-Time)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 text-slate-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Unlimited Digital Product Listings</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Real-time Product &amp; Sales Analytics</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Verified Creator Profile Status</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Marketplace Affiliate Promotion Access</span>
            </div>
          </div>
        </div>

        {/* Gateway Disabled Notice */}
        <div className="p-4 rounded-2xl bg-amber-950/50 border border-amber-500/50 flex items-start gap-3 text-xs text-amber-100 relative z-10">
          <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-amber-300 block">
              {isLifetimeSeller
                ? 'Your Seller Lifetime Membership is Active'
                : 'PayU Checkout Temporarily Disabled'}
            </span>
            <p className="text-slate-300 leading-relaxed">
              {isLifetimeSeller
                ? 'Verified payment record found on your account. No additional fee is required.'
                : 'Live PayU payment gateway verification is pending activation. Simulated/bypass payments are disabled so membership is only granted after verified server payment confirmation.'}
            </p>
          </div>
        </div>

        {/* Affiliate Free Notice */}
        <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-800/60 flex items-center gap-2 text-xs text-slate-300 relative z-10">
          <Info className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>
            <strong>Note for Affiliates:</strong> Affiliate registration and promotion are <strong>100% FREE</strong> forever.
          </span>
        </div>

        {/* Billing Summary (Read-only Preview) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs relative z-10">
          <div>
            <label className="font-bold text-slate-300 block mb-1">Seller Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#160d3d] border border-purple-800 text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
            />
          </div>
          <div>
            <label className="font-bold text-slate-300 block mb-1">Billing Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seller@example.com"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#160d3d] border border-purple-800 text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
            />
          </div>
        </div>

        {/* Disabled Checkout Action */}
        <div className="space-y-3 relative z-10 pt-1">
          <button
            type="button"
            disabled
            className="w-full py-3.5 rounded-2xl bg-slate-800/80 border border-purple-800/60 text-slate-400 font-extrabold text-sm flex items-center justify-center gap-2 cursor-not-allowed"
          >
            <Lock className="w-4 h-4" />
            <span>Pay ₹999 with PayU (Gateway Activation Pending)</span>
          </button>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-purple-900/60 text-[11px] text-slate-400 relative z-10">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>PayU Hosted Checkout Architecture Ready</span>
          </div>
          <span>One-Time ₹999 INR</span>
        </div>
      </div>
    </div>
  );
};
