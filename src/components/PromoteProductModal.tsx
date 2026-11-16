import React, { useState } from 'react';
import { Product } from '../types';
import { useHybridAffiliate } from '../context/HybridAffiliateContext';
import { useAuth } from '../context/AuthContext';
import { useProducts } from '../context/ProductContext';
import {
  X,
  Sparkles,
  Link2,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Share2
} from 'lucide-react';

interface PromoteProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToDashboard?: () => void;
}

export const PromoteProductModal: React.FC<PromoteProductModalProps> = ({
  product,
  isOpen,
  onClose,
  onNavigateToDashboard
}) => {
  const { user } = useAuth();
  const { generateOrGetLink, copyLinkToClipboard } = useHybridAffiliate();
  const { showToast } = useProducts();

  const [customSubid, setCustomSubid] = useState('');
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen || !product) return null;

  const handleGenerate = async () => {
    if (!user) {
      showToast('Please log in to generate an affiliate link', 'info');
      return;
    }

    setIsGenerating(true);
    const target = product.affiliateUrl || product.originalUrl || 'https://clickbarry.com';
    const res = await generateOrGetLink({
      productId: product.id,
      targetUrl: target,
      productTitle: product.title,
      productPrice: product.price,
      commissionRate: product.commissionRate || 40,
      networkName: product.networkName || product.merchantName || 'ClickBarry Marketplace',
      networkId: (product.networkId as string) || 'other',
      customSubid: customSubid.trim() || undefined
    });

    setIsGenerating(false);
    if (res.success && res.link) {
      const shareUrl = `${window.location.origin}/?cb_trk=${encodeURIComponent(res.link.uniqueTrackingSlug)}`;
      setGeneratedLink(shareUrl);
      showToast('Unique tracking link generated! Added to My Affiliate Links.', 'success');
    } else {
      showToast(res.error || 'Failed to generate link', 'error');
    }
  };

  const handleCopy = async () => {
    if (!generatedLink) return;
    try {
      await navigator.clipboard.writeText(generatedLink);
      setIsCopied(true);
      showToast('Affiliate link copied to clipboard!', 'success');
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      showToast('Could not copy link', 'error');
    }
  };

  const potentialEarnings = Math.round(product.price * ((product.commissionRate || 40) / 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg bg-[#130b30] border border-purple-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-100 space-y-6">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/20 text-pink-300 text-xs font-bold uppercase tracking-wider border border-pink-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Method A: Promote Marketplace Product</span>
          </div>
          <h2 className="text-2xl font-black text-white">Generate Your Affiliate Link</h2>
          <p className="text-xs text-slate-300">
            Earn <strong>{product.commissionRate}% commission (₹{potentialEarnings})</strong> for every customer who buys via your tracking link.
          </p>
        </div>

        {/* Product Snapshot */}
        <div className="p-3.5 rounded-2xl bg-[#1b1046] border border-purple-800/80 flex items-center gap-3">
          <img src={product.image} alt={product.title} className="w-14 h-14 rounded-xl object-cover border border-purple-700 shrink-0" />
          <div className="space-y-0.5 min-w-0 flex-1">
            <h4 className="font-bold text-sm text-white truncate">{product.title}</h4>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="text-white font-bold">₹{product.price}</span>
              <span>•</span>
              <span className="text-emerald-400 font-bold">{product.commissionRate}% Commission</span>
            </div>
          </div>
        </div>

        {/* Optional Custom SubID */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span>Custom Tracking SubID <span className="text-slate-500">(Optional)</span></span>
            <span className="text-[10px] text-pink-400">e.g. yt_description, telegram_channel, blog_post</span>
          </label>
          <input
            type="text"
            placeholder="e.g. youtube_review"
            value={customSubid}
            onChange={(e) => setCustomSubid(e.target.value)}
            disabled={Boolean(generatedLink)}
            className="w-full px-4 py-2.5 rounded-xl bg-[#1b1046] border border-purple-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 font-mono"
          />
        </div>

        {/* Generated Link Display */}
        {generatedLink ? (
          <div className="space-y-3 p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Your Unique Affiliate Link is Ready!</span>
              </span>
              <span className="text-[11px] text-slate-400 font-mono">Saved to My Links</span>
            </div>

            <div className="flex items-center gap-2 bg-[#120a2e] p-2 rounded-xl border border-purple-800">
              <input
                type="text"
                readOnly
                value={generatedLink}
                className="bg-transparent text-xs text-pink-300 font-mono flex-1 outline-none truncate"
              />
              <button
                onClick={handleCopy}
                className="px-4 py-2 rounded-lg bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-300">
              ⚡ Share this link on YouTube, WhatsApp, Instagram, or your blog. Every visitor click will be recorded in your Affiliate Dashboard.
            </p>
          </div>
        ) : (
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold text-sm shadow-lg shadow-pink-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <Link2 className="w-4 h-4" />
            <span>{isGenerating ? 'Generating Unique Link...' : 'Generate My Affiliate Link'}</span>
          </button>
        )}

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-purple-900/60 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Secure ClickBarry Redirect</span>
          </div>
          {onNavigateToDashboard && (
            <button
              onClick={() => {
                onClose();
                onNavigateToDashboard();
              }}
              className="text-pink-400 font-bold hover:underline cursor-pointer"
            >
              View My Affiliate Links →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
