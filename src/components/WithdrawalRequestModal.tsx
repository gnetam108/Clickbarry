import React, { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { useProducts } from '../context/ProductContext';
import {
  X,
  CreditCard,
  Building2,
  Smartphone,
  ShieldCheck,
  AlertCircle,
  Check,
  HelpCircle,
  ArrowRight,
  Info
} from 'lucide-react';

interface WithdrawalRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WithdrawalRequestModal: React.FC<WithdrawalRequestModalProps> = ({
  isOpen,
  onClose
}) => {
  const { wallet, settings, submitWithdrawalRequest } = useWallet();
  const { showToast } = useProducts();

  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'bank_transfer'>('upi');
  const [amount, setAmount] = useState<number | ''>(
    wallet.availableBalance >= settings.minWithdrawalAmount ? settings.minWithdrawalAmount : ''
  );

  // UPI fields
  const [upiId, setUpiId] = useState('');

  // Bank fields
  const [accountHolderName, setAccountHolderName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [bankName, setBankName] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid withdrawal amount.');
      return;
    }

    if (numAmount < settings.minWithdrawalAmount) {
      setError(`Minimum withdrawal amount is ₹${settings.minWithdrawalAmount}.`);
      return;
    }

    if (numAmount > settings.maxWithdrawalAmount) {
      setError(`Maximum withdrawal limit is ₹${settings.maxWithdrawalAmount}.`);
      return;
    }

    if (numAmount > wallet.availableBalance) {
      setError(`Insufficient available balance. You have ₹${wallet.availableBalance} available to withdraw.`);
      return;
    }

    if (paymentMethod === 'upi') {
      const cleanUpi = upiId.trim();
      if (!cleanUpi || !cleanUpi.includes('@')) {
        setError('Please enter a valid UPI ID (e.g. yourname@okhdfcbank or 9876543210@paytm).');
        return;
      }
    } else {
      if (!accountHolderName.trim()) {
        setError('Please enter Account Holder Name.');
        return;
      }
      if (!bankAccountNumber.trim() || bankAccountNumber.trim().length < 8) {
        setError('Please enter a valid Bank Account Number.');
        return;
      }
      if (bankAccountNumber.trim() !== confirmAccountNumber.trim()) {
        setError('Bank Account Numbers do not match.');
        return;
      }
      if (!ifscCode.trim() || ifscCode.trim().length < 9) {
        setError('Please enter a valid 11-digit IFSC code.');
        return;
      }
    }

    setIsSubmitting(true);
    const res = await submitWithdrawalRequest({
      amount: numAmount,
      paymentMethod,
      upiId: upiId.trim(),
      accountHolderName: accountHolderName.trim(),
      bankAccountNumber: bankAccountNumber.trim(),
      ifscCode: ifscCode.trim().toUpperCase(),
      bankName: bankName.trim()
    });

    setIsSubmitting(false);
    if (res.success && res.request) {
      showToast(
        `Withdrawal request #${res.request.requestNumber} for ₹${numAmount} submitted successfully!`,
        'success'
      );
      onClose();
    } else {
      setError(res.error || 'Failed to submit withdrawal request.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto bg-[#130b30] border border-purple-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-1 mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider border border-emerald-500/30">
            <CreditCard className="w-3.5 h-3.5" />
            <span>Request Manual Payout</span>
          </div>
          <h2 className="text-2xl font-black text-white">Affiliate Fund Withdrawal</h2>
          <p className="text-xs text-slate-300">
            Available Balance: <strong className="text-emerald-400 font-black">₹{wallet.availableBalance}</strong> • Minimum: ₹{settings.minWithdrawalAmount}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/80 border border-red-500 text-red-200 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
              <span>Withdrawal Amount (₹) <span className="text-pink-500">*</span></span>
              <button
                type="button"
                onClick={() => setAmount(wallet.availableBalance)}
                className="text-[11px] text-pink-400 font-bold hover:underline cursor-pointer"
              >
                Withdraw All (₹{wallet.availableBalance})
              </button>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-bold">₹</span>
              <input
                type="number"
                min={settings.minWithdrawalAmount}
                max={Math.min(wallet.availableBalance, settings.maxWithdrawalAmount)}
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                placeholder="500"
                className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-[#1b1046] border border-purple-800 text-base text-white focus:outline-none focus:border-pink-500 font-black"
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 mt-1">
              <span>Min: ₹{settings.minWithdrawalAmount}</span>
              <span>Max per request: ₹{settings.maxWithdrawalAmount.toLocaleString()}</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Select Payout Method <span className="text-pink-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('upi')}
                className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                  paymentMethod === 'upi'
                    ? 'bg-pink-600/30 border-pink-500 text-white font-bold shadow-md shadow-pink-600/20'
                    : 'bg-[#1b1046] border-purple-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Smartphone className="w-5 h-5 text-pink-400" />
                <div>
                  <span className="block text-xs font-bold text-white">Instant UPI</span>
                  <span className="text-[10px] text-slate-400">GPay, PhonePe, Paytm</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('bank_transfer')}
                className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                  paymentMethod === 'bank_transfer'
                    ? 'bg-pink-600/30 border-pink-500 text-white font-bold shadow-md shadow-pink-600/20'
                    : 'bg-[#1b1046] border-purple-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Building2 className="w-5 h-5 text-emerald-400" />
                <div>
                  <span className="block text-xs font-bold text-white">Bank Transfer</span>
                  <span className="text-[10px] text-slate-400">NEFT / IMPS via IFSC</span>
                </div>
              </button>
            </div>
          </div>

          {/* UPI Fields */}
          {paymentMethod === 'upi' && (
            <div className="p-4 rounded-2xl bg-[#1b1046] border border-purple-800 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Your UPI ID (VPA) <span className="text-pink-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. yourname@oksbi or 9876543210@paytm"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#120a2e] border border-purple-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 font-mono"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                🔒 Admin will transfer funds directly to this UPI ID and attach the UPI Reference ID.
              </p>
            </div>
          )}

          {/* Bank Transfer Fields */}
          {paymentMethod === 'bank_transfer' && (
            <div className="p-4 rounded-2xl bg-[#1b1046] border border-purple-800 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Account Holder Name <span className="text-pink-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Full name as in Bank Passbook"
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#120a2e] border border-purple-800 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Bank Account Number <span className="text-pink-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Enter Account Number"
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#120a2e] border border-purple-800 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Confirm Account Number <span className="text-pink-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Re-enter Account Number"
                    value={confirmAccountNumber}
                    onChange={(e) => setConfirmAccountNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#120a2e] border border-purple-800 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    IFSC Code <span className="text-pink-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SBIN0001234"
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-xl bg-[#120a2e] border border-purple-800 text-xs text-white font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Bank Name <span className="text-slate-500">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. State Bank of India"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#120a2e] border border-purple-800 text-xs text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Processing Info Notice */}
          <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-800 text-[11px] text-slate-300 flex items-start gap-2">
            <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{settings.processingInfo}</span>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-purple-900/40 hover:bg-purple-900/60 text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || wallet.availableBalance < settings.minWithdrawalAmount}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Submitting...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Submit Withdrawal Request</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
