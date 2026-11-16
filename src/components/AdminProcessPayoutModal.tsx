import React, { useState } from 'react';
import { WithdrawalRequest } from '../types';
import { useWallet } from '../context/WalletContext';
import { useProducts } from '../context/ProductContext';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  Clock,
  RotateCcw,
  Check,
  Building2,
  Smartphone,
  Copy,
  AlertCircle,
  FileText,
  DollarSign
} from 'lucide-react';

interface AdminProcessPayoutModalProps {
  request: WithdrawalRequest | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AdminProcessPayoutModal: React.FC<AdminProcessPayoutModalProps> = ({
  request,
  isOpen,
  onClose
}) => {
  const { adminUpdatePayout } = useWallet();
  const { showToast } = useProducts();

  const [newStatus, setNewStatus] = useState<'approved' | 'processing' | 'paid' | 'rejected'>('approved');
  const [transactionReference, setTransactionReference] = useState('');
  const [adminRemarks, setAdminRemarks] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [paymentProofUrl, setPaymentProofUrl] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !request) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newStatus === 'paid' && !transactionReference.trim()) {
      setError('Transaction Reference (UPI Reference ID or Bank UTR number) is required before marking request as Paid.');
      return;
    }

    if (newStatus === 'rejected' && !rejectionReason.trim()) {
      setError('Please provide a specific rejection reason for the affiliate.');
      return;
    }

    setIsSubmitting(true);
    const res = await adminUpdatePayout({
      requestId: request.id,
      status: newStatus,
      transactionReference: transactionReference.trim() || undefined,
      adminRemarks: adminRemarks.trim() || undefined,
      rejectionReason: rejectionReason.trim() || undefined,
      paymentProofUrl: paymentProofUrl.trim() || undefined
    });

    setIsSubmitting(false);
    if (res.success) {
      showToast(`Payout Request #${request.requestNumber} updated to ${newStatus.toUpperCase()}!`, 'success');
      onClose();
    } else {
      setError(res.error || 'Failed to update payout request');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto bg-[#130b30] border border-purple-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-100 space-y-5">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold uppercase tracking-wider border border-purple-500/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin Payout Management</span>
          </div>
          <h2 className="text-xl font-black text-white">Process Withdrawal #{request.requestNumber}</h2>
          <p className="text-xs text-slate-300">
            Amount: <strong className="text-emerald-400 font-bold text-sm">₹{request.amount}</strong> via{' '}
            <strong className="text-white uppercase">{request.paymentMethod}</strong>
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-950/80 border border-red-500 text-red-200 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Payout Details Card */}
        <div className="p-4 rounded-2xl bg-[#1b1046] border border-purple-800 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-400">Affiliate:</span>
            <span className="font-bold text-white">{request.affiliateName || request.affiliateEmail || request.affiliateId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Requested On:</span>
            <span className="text-slate-300">{new Date(request.createdAt).toLocaleString()}</span>
          </div>

          {request.paymentMethod === 'upi' ? (
            <div className="pt-2 border-t border-purple-900/60 flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5 text-pink-400" />
                <span>UPI ID:</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-pink-300">{request.upiId}</span>
                <button
                  type="button"
                  onClick={() => {
                    if (request.upiId) {
                      navigator.clipboard.writeText(request.upiId);
                      showToast('UPI ID copied to clipboard!', 'info');
                    }
                  }}
                  className="p-1 hover:text-white text-slate-400"
                  title="Copy UPI ID"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="pt-2 border-t border-purple-900/60 space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">A/C Holder:</span>
                <span className="text-white font-bold">{request.accountHolderName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">A/C Number:</span>
                <span className="text-pink-300 font-bold">{request.bankAccountNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">IFSC Code:</span>
                <span className="text-emerald-400 font-bold">{request.ifscCode}</span>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Action Status Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Update Status <span className="text-pink-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setNewStatus('approved')}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  newStatus === 'approved'
                    ? 'bg-blue-600 text-white border-blue-500 shadow'
                    : 'bg-[#1b1046] border-purple-900 text-slate-400 hover:text-white'
                }`}
              >
                Approve
              </button>

              <button
                type="button"
                onClick={() => setNewStatus('processing')}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  newStatus === 'processing'
                    ? 'bg-amber-600 text-white border-amber-500 shadow'
                    : 'bg-[#1b1046] border-purple-900 text-slate-400 hover:text-white'
                }`}
              >
                Processing
              </button>

              <button
                type="button"
                onClick={() => setNewStatus('paid')}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  newStatus === 'paid'
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow'
                    : 'bg-[#1b1046] border-purple-900 text-slate-400 hover:text-white'
                }`}
              >
                Mark Paid
              </button>

              <button
                type="button"
                onClick={() => setNewStatus('rejected')}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  newStatus === 'rejected'
                    ? 'bg-red-600 text-white border-red-500 shadow'
                    : 'bg-[#1b1046] border-purple-900 text-slate-400 hover:text-white'
                }`}
              >
                Reject
              </button>
            </div>
          </div>

          {/* Conditional Input for Paid: UTR / Reference ID */}
          {newStatus === 'paid' && (
            <div className="space-y-3 p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/50">
              <div>
                <label className="block text-xs font-bold text-emerald-300 mb-1">
                  UPI Ref ID / Bank UTR Number <span className="text-pink-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 412988192019 or UPI/4910291928"
                  value={transactionReference}
                  onChange={(e) => setTransactionReference(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#120a2e] border border-emerald-500/60 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Payment Proof URL <span className="text-slate-500">(Optional)</span>
                </label>
                <input
                  type="url"
                  placeholder="https://... screenshot or bank receipt link"
                  value={paymentProofUrl}
                  onChange={(e) => setPaymentProofUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#120a2e] border border-purple-800 text-xs text-white font-mono"
                />
              </div>
            </div>
          )}

          {/* Conditional Input for Rejected */}
          {newStatus === 'rejected' && (
            <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-500/50">
              <label className="block text-xs font-bold text-red-300 mb-1">
                Reason for Rejection <span className="text-pink-400">*</span>
              </label>
              <textarea
                required
                rows={2}
                placeholder="e.g. Invalid UPI ID / Incorrect Bank Account details. Please re-check and resubmit."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#120a2e] border border-red-500/60 text-xs text-white resize-none"
              />
              <span className="text-[10px] text-slate-400 block mt-1">
                Funds will be released back to the affiliate's available balance.
              </span>
            </div>
          )}

          {/* Admin Remarks */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Admin Remarks / Note to Affiliate <span className="text-slate-500">(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Processed via HDFC NEFT. Should reflect in 2 hours."
              value={adminRemarks}
              onChange={(e) => setAdminRemarks(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#1b1046] border border-purple-800 text-xs text-white"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
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
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:from-purple-700 hover:to-rose-700 text-white font-bold text-xs shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>Confirm Update</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
