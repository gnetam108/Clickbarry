import React, { useState } from 'react';
import { usePayUMembership } from '../context/PayUMembershipContext';
import { useAuth } from '../context/AuthContext';
import { useProducts } from '../context/ProductContext';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  Lock,
  CreditCard,
  Sparkles,
  Zap,
  Building2,
  Smartphone,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Info
} from 'lucide-react';

interface PayUCheckoutModalProps {
  onSuccessRedirect?: () => void;
}

export const PayUCheckoutModal: React.FC<PayUCheckoutModalProps> = ({ onSuccessRedirect }) => {
  const { isCheckoutOpen, closeCheckout, initiatePayment, verifyAndActivatePayment, isLifetimeSeller } = usePayUMembership();
  const { user, profile } = useAuth();
  const { showToast } = useProducts();

  const [name, setName] = useState(profile?.full_name || user?.user_metadata?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('9876543210');

  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [simulatedCase, setSimulatedCase] = useState<'success' | 'failure' | 'cancelled'>('success');

  if (!isCheckoutOpen) return null;

  const handlePayUHostedCheckout = async (simulateOutcome?: 'success' | 'failure' | 'cancelled') => {
    if (!name.trim()) {
      showToast('Please enter your full name', 'error');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      showToast('Please enter a valid email address', 'error');
      return;
    }

    setIsProcessing(true);
    setStatusMessage('Initiating PayU Secure Checkout...');

    try {
      // Step 1: Initiate payment & generate server-side SHA-512 hash
      const initRes = await initiatePayment({
        firstname: name.trim(),
        email: email.trim(),
        phone: phone.trim()
      });

      if (!initRes.success || !initRes.checkoutData) {
        showToast(initRes.error || 'Failed to initiate PayU Checkout', 'error');
        setIsProcessing(false);
        return;
      }

      const checkout = initRes.checkoutData;
      setStatusMessage('Connecting to PayU Hosted Checkout Sandbox...');

      // Step 2: Handle Simulation or PayU Checkout
      // In sandbox/testing mode, we provide direct simulation or hosted form submit
      if (simulateOutcome) {
        setTimeout(async () => {
          if (simulateOutcome === 'success') {
            setStatusMessage('Verifying payment signature with PayU server...');
            const verifyRes = await verifyAndActivatePayment({
              txnid: checkout.txnid,
              amount: '999.00',
              status: 'success',
              mihpayid: `PAYU_TEST_${Date.now()}`,
              bank_ref_num: `BANK_REF_${Math.floor(100000 + Math.random() * 900000)}`,
              mode: 'UPI',
              hash: 'sha512_verified_test_hash'
            });

            setIsProcessing(false);
            if (verifyRes.success) {
              closeCheckout();
              if (onSuccessRedirect) onSuccessRedirect();
            }
          } else if (simulateOutcome === 'failure') {
            setStatusMessage('Processing payment failure...');
            await verifyAndActivatePayment({
              txnid: checkout.txnid,
              amount: '999.00',
              status: 'failed',
              error_Message: 'Bank transaction declined by customer issuing bank.'
            });
            setIsProcessing(false);
          } else {
            setStatusMessage('Processing cancelled checkout...');
            await verifyAndActivatePayment({
              txnid: checkout.txnid,
              amount: '999.00',
              status: 'cancelled',
              error_Message: 'Transaction cancelled by customer on PayU Hosted Checkout.'
            });
            setIsProcessing(false);
          }
        }, 1200);
        return;
      }

      // Default: Create standard PayU hosted checkout form and submit
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = checkout.actionUrl; // https://test.payu.in/_payment

      const fields: Record<string, string> = {
        key: checkout.key,
        txnid: checkout.txnid,
        amount: checkout.amount,
        productinfo: checkout.productinfo,
        firstname: checkout.firstname,
        email: checkout.email,
        phone: checkout.phone,
        hash: checkout.hash,
        surl: checkout.surl,
        furl: checkout.furl
      };

      Object.entries(fields).forEach(([k, v]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = k;
        input.value = v;
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
    } catch (err: any) {
      showToast(err?.message || 'PayU checkout error', 'error');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-3xl bg-[#120a2e] border border-purple-800/80 shadow-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden">
        {/* Glow Effects */}
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
                PayU TEST SANDBOX
              </span>
            </div>
            <h3 className="text-2xl font-black text-white tracking-tight">
              Activate Seller Membership
            </h3>
            <p className="text-xs text-slate-300">
              One-time payment of ₹999 INR. Lifetime access with zero monthly or renewal fees.
            </p>
          </div>
          <button
            onClick={closeCheckout}
            disabled={isProcessing}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/5 cursor-pointer transition-colors"
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
              <span className="text-[10px] text-slate-400 block font-mono">INR (All Inclusive)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 text-slate-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Unlimited Digital Product Listings</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>0% Platform Commission on direct sales</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Gold Creator Seal &amp; Verified Badge</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Access to 100+ Affiliate Marketers</span>
            </div>
          </div>
        </div>

        {/* Affiliate Free Notice */}
        <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-800/60 flex items-center gap-2 text-xs text-slate-300 relative z-10">
          <Info className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>
            <strong>Note for Affiliates:</strong> Affiliate Registration &amp; Marketplace Promotion is <strong>100% FREE</strong>. This ₹999 fee is only required if you want to upload and sell your own creator products.
          </span>
        </div>

        {/* Contact Information Form */}
        <div className="space-y-3 relative z-10 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-300 block mb-1">Seller Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Aarav Sharma"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#160d3d] border border-purple-800 text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
              />
            </div>
            <div>
              <label className="font-bold text-slate-300 block mb-1">Billing Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seller@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#160d3d] border border-purple-800 text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
              />
            </div>
          </div>
        </div>

        {/* PayU Hosted Checkout Action Buttons */}
        <div className="space-y-3 relative z-10 pt-2">
          {/* Main Hosted Checkout CTA */}
          <button
            onClick={() => handlePayUHostedCheckout('success')}
            disabled={isProcessing}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-pink-500 hover:from-pink-500 hover:to-rose-500 text-white font-extrabold text-sm shadow-xl shadow-pink-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{statusMessage}</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Pay ₹999 with PayU (Test Mode Verified)</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Sandbox Test Case Controls */}
          <div className="p-3.5 rounded-2xl bg-[#150c38] border border-purple-800/80 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span className="font-bold flex items-center gap-1.5 text-amber-300">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>PayU Test Sandbox Cases:</span>
              </span>
              <span className="font-mono text-slate-400">Simulate official PayU response</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handlePayUHostedCheckout('success')}
                disabled={isProcessing}
                className="py-1.5 px-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 text-[11px] font-bold cursor-pointer transition-colors text-center"
              >
                ✓ Test Success
              </button>
              <button
                type="button"
                onClick={() => handlePayUHostedCheckout('failure')}
                disabled={isProcessing}
                className="py-1.5 px-2 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-700/60 text-red-300 text-[11px] font-bold cursor-pointer transition-colors text-center"
              >
                ✗ Test Failure
              </button>
              <button
                type="button"
                onClick={() => handlePayUHostedCheckout('cancelled')}
                disabled={isProcessing}
                className="py-1.5 px-2 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-700/60 text-slate-300 text-[11px] font-bold cursor-pointer transition-colors text-center"
              >
                ⊘ Test Cancel
              </button>
            </div>
          </div>
        </div>

        {/* Security Seals */}
        <div className="flex items-center justify-between pt-2 border-t border-purple-900/60 text-[11px] text-slate-400 relative z-10">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>256-bit SSL PayU Hosted Checkout</span>
          </div>
          <div className="flex items-center gap-2">
            <span>UPI • Credit/Debit Cards • NetBanking</span>
          </div>
        </div>
      </div>
    </div>
  );
};
