import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { useProducts } from '../context/ProductContext';
import { useAuth } from '../context/AuthContext';
import { useHybridAffiliate } from '../context/HybridAffiliateContext';
import {
  X,
  CheckCircle2,
  Share2,
  ShieldCheck,
  Check,
  Copy,
  ExternalLink,
  Eye,
  MousePointerClick,
  Link2,
  ArrowRight
} from 'lucide-react';

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onOpenSignup: () => void;
  onShopNowClick?: (product: Product) => void;
  onViewFullPage?: (product: Product) => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
  onClose,
  onOpenSignup,
  onShopNowClick,
  onViewFullPage
}) => {
  const { recordView, recordClick, showToast } = useProducts();
  const { user, role } = useAuth();
  const { affiliateLinks, generateOrGetLink } = useHybridAffiliate();

  const [copied, setCopied] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (product) {
      recordView(product.id);
      const existing = affiliateLinks.find((l) => l.productId === product.id);
      if (existing) {
        setGeneratedUrl(`${window.location.origin}/?cb_trk=${encodeURIComponent(existing.uniqueTrackingSlug)}`);
      } else {
        setGeneratedUrl(null);
      }
    }
  }, [product?.id, affiliateLinks, recordView]);

  if (!product) return null;

  const handleGenerateAffiliateLink = async () => {
    if (!user) {
      showToast('Create a free Affiliate account to get your unique tracking link!', 'info');
      onClose();
      onOpenSignup();
      return;
    }

    if (role === 'seller') {
      showToast('Sign in with an Affiliate account to generate promotion links.', 'info');
      return;
    }

    setIsGenerating(true);
    const res = await generateOrGetLink({
      productId: product.id,
      targetUrl: product.affiliateUrl || product.originalUrl || window.location.origin,
      productTitle: product.title,
      productPrice: product.price,
      commissionRate: product.commissionRate || 40,
      networkName: product.networkName || product.merchantName || 'ClickBarry Marketplace',
      networkId: (product.networkId as string) || 'other'
    });
    setIsGenerating(false);

    if (res.success && res.link) {
      const shareUrl = `${window.location.origin}/?cb_trk=${encodeURIComponent(res.link.uniqueTrackingSlug)}`;
      setGeneratedUrl(shareUrl);
      showToast('Your unique Affiliate tracking link is ready!', 'success');
    } else {
      showToast(res.error || 'Could not generate affiliate link', 'error');
    }
  };

  const handleCopyLink = async () => {
    if (!generatedUrl) return;
    try {
      await navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      showToast('Affiliate link copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleShopNow = () => {
    onShopNowClick?.(product);
    recordClick(product.id);

    let targetUrl = (product.affiliateUrl || product.originalUrl)?.trim();
    if (targetUrl) {
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
      }
      try {
        const parsed = new URL(targetUrl);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          showToast(`Opening product destination (${parsed.hostname})...`, 'info');
          window.open(targetUrl, '_blank', 'noopener,noreferrer');
          return;
        }
      } catch {}
    }
    showToast('Destination URL unavailable.', 'error');
  };

  const ctr = product.views > 0 ? ((product.clicks / product.views) * 100).toFixed(1) : '0.0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-[#130b30] border border-purple-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors cursor-pointer z-10"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-start">
            <div className="sm:col-span-5 rounded-2xl overflow-hidden aspect-[4/3] bg-slate-900 shadow-md relative">
              <img
                src={product.image}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="sm:col-span-7 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs bg-pink-500/20 text-pink-300 font-bold px-2 py-0.5 rounded">
                  {product.categoryLabel}
                </span>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded">
                  {product.commissionRate}% Commission
                </span>
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-white leading-snug">
                {product.title}
              </h3>

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span>By {product.sellerName}</span>
                {product.sellerVerified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                <span>•</span>
                <span>{product.salesCount || 0} sales</span>
              </div>

              <div className="pt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">₹{product.price}</span>
              </div>

              <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-blue-400" />
                  <strong className="text-slate-200">{product.views || 0}</strong> views
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MousePointerClick className="w-3.5 h-3.5 text-pink-400" />
                  <strong className="text-slate-200">{product.clicks || 0}</strong> clicks
                </span>
                <span>•</span>
                <span className="text-emerald-400 font-bold">{ctr}% CTR</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Product Description</h4>
            <p className="text-slate-300 text-sm leading-relaxed">{product.description}</p>
          </div>

          {product.features && product.features.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Highlights</h4>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                {product.features.map((feat, idx) => (
                  <li key={idx} className="flex items-center gap-2 bg-[#1b1046] p-2 rounded-lg border border-purple-900/60">
                    <Check className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Real Affiliate Link Box */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/60 to-pink-950/60 border border-purple-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-pink-400" />
                <span>Promote This Product</span>
              </span>
              <span className="text-emerald-400 font-bold">
                Earn ₹{Math.round(product.price * (product.commissionRate / 100))} per sale
              </span>
            </div>

            {generatedUrl ? (
              <div className="flex items-center gap-2 bg-black/40 p-2 rounded-xl">
                <input
                  type="text"
                  readOnly
                  value={generatedUrl}
                  className="bg-transparent text-xs text-pink-300 flex-1 outline-none font-mono truncate"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-3 py-1 rounded-lg bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleGenerateAffiliateLink}
                disabled={isGenerating}
                className="w-full py-2.5 rounded-xl bg-pink-600/25 hover:bg-pink-600/40 border border-pink-500/50 text-pink-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>
                  {isGenerating
                    ? 'Generating...'
                    : user
                    ? 'Generate My Unique Affiliate Link'
                    : 'Join Free as Affiliate to Promote'}
                </span>
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-purple-900/60">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Admin-Approved Marketplace Listing</span>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              {onViewFullPage && (
                <button
                  onClick={() => {
                    onClose();
                    onViewFullPage(product);
                  }}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-[#231554] hover:bg-[#2f1c70] text-slate-100 font-bold text-xs border border-purple-700 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Full Page</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={handleShopNow}
                className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold text-xs shadow-lg shadow-pink-600/30 flex items-center justify-center gap-2 cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Visit Product</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
