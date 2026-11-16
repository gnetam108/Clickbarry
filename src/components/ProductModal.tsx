import React, { useState } from 'react';
import { Product } from '../types';
import {
  X,
  Star,
  CheckCircle2,
  Download,
  Share2,
  ShieldCheck,
  Check,
  Copy,
  ShoppingBag,
  ExternalLink,
  Eye,
  MousePointerClick,
  Sparkles,
  Layers
} from 'lucide-react';

import { useProducts } from '../context/ProductContext';
import { useEffect } from 'react';

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onOpenSignup: () => void;
  onShopNowClick?: (product: Product) => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
  onClose,
  onOpenSignup,
  onShopNowClick
}) => {
  const { recordView, recordClick, showToast } = useProducts();
  const [copied, setCopied] = useState(false);
  const [purchaseStep, setPurchaseStep] = useState<'view' | 'checkout' | 'success'>('view');
  const [customerEmail, setCustomerEmail] = useState('');

  // Automatically track real product view
  useEffect(() => {
    if (product) {
      recordView(product.id);
    }
  }, [product?.id]);

  if (!product) return null;

  const referralLink = `https://clickbarry.com/go?ref=demo_affiliate&prod=${product.id}`;

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShopNow = () => {
    onShopNowClick?.(product);
    recordClick(product.id);

    // Validate safe HTTP/HTTPS affiliate tracking URL
    let targetUrl = (product.affiliateUrl || product.originalUrl)?.trim();
    if (targetUrl) {
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
      }
      try {
        const parsed = new URL(targetUrl);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          showToast(`Redirecting to verified merchant at ${parsed.hostname}...`, 'info');
          window.open(targetUrl, '_blank', 'noopener,noreferrer');
          return;
        }
      } catch {
        // Fall back to details
      }
    }
    setPurchaseStep('checkout');
  };

  const handleSimulatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerEmail) return;
    onShopNowClick?.(product);
    setPurchaseStep('success');
  };

  const ctr = product.views > 0 ? ((product.clicks / product.views) * 100).toFixed(1) : '0.0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-[#130b30] border border-purple-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {purchaseStep === 'success' ? (
          <div className="py-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <div className="space-y-2">
              <span className="text-xs uppercase font-bold text-emerald-400 tracking-wider">
                Order #CB-ORD-{Math.floor(10000 + Math.random() * 90000)} Confirmed
              </span>
              <h3 className="text-2xl font-black text-white">
                Thank You for Your Order!
              </h3>
              <p className="text-sm text-slate-300 max-w-md mx-auto">
                Access instructions and digital download keys have been generated for <strong>{customerEmail}</strong>.
              </p>
            </div>

            <div className="bg-[#1b1046] p-4 rounded-2xl border border-purple-800 text-left max-w-md mx-auto space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Product Item:</span>
                <span className="font-bold text-white line-clamp-1">{product.title}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Format:</span>
                <span className="font-semibold text-pink-300">{product.fileFormat}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Amount Paid:</span>
                <span className="font-black text-emerald-400">₹{product.price}</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => alert(`Simulated Download started for: ${product.title}`)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Assets (.ZIP)</span>
              </button>
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-slate-200 text-xs font-semibold"
              >
                Close &amp; Return
              </button>
            </div>
          </div>
        ) : purchaseStep === 'checkout' ? (
          <div className="space-y-6">
            <div className="space-y-1">
              <span className="text-xs font-bold text-pink-400 uppercase tracking-wider">
                Direct Creator Checkout (Demo)
              </span>
              <h3 className="text-2xl font-black text-white">
                Complete Your Order
              </h3>
            </div>

            <div className="p-4 rounded-2xl bg-[#1b1046] border border-purple-800 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-white">{product.title}</h4>
                <p className="text-xs text-slate-400">Sold by {product.sellerName}</p>
              </div>
              <span className="text-xl font-black text-pink-400">₹{product.price}</span>
            </div>

            <form onSubmit={handleSimulatePayment} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Deliver Download Link to Email:
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#1b1046] border border-purple-800 text-sm text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-800 text-xs text-slate-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Protected by ClickBarry Buyer Guarantee. Instant digital delivery upon confirmation.</span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPurchaseStep('view')}
                  className="flex-1 py-2.5 rounded-xl bg-purple-900/40 text-slate-300 text-xs font-semibold"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Simulate Order Confirmation (₹{product.price})</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header Product View */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-start">
              <div className="sm:col-span-5 rounded-2xl overflow-hidden aspect-[4/3] bg-slate-900 shadow-md relative">
                <img
                  src={product.image}
                  alt={product.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                {product.isRealDb ? (
                  <div className="absolute top-2 left-2 bg-emerald-950/90 border border-emerald-500/60 backdrop-blur-md px-2.5 py-0.5 rounded text-[10px] font-bold text-emerald-300 flex items-center gap-1 shadow-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Live Supabase Product</span>
                  </div>
                ) : (
                  <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-pink-300">
                    Sample Demo Listing
                  </div>
                )}
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
                  {product.sellerVerified && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  <span>•</span>
                  <div className="flex items-center gap-1 text-amber-400 font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{product.rating}</span>
                  </div>
                  <span>({product.salesCount || 0} sales)</span>
                </div>

                {/* Price */}
                <div className="pt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white">
                    ₹{product.price}
                  </span>
                  {product.originalPrice && (
                    <span className="text-sm text-slate-500 line-through">
                      ₹{product.originalPrice}
                    </span>
                  )}
                  {product.originalPrice && product.originalPrice > product.price && (
                    <span className="text-xs text-emerald-400 font-bold">
                      {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                    </span>
                  )}
                </div>

                {/* Live Stats Strip */}
                <div className="flex items-center gap-3 pt-2 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-blue-400" />
                    <strong className="text-slate-200">{product.views || 0}</strong> views
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MousePointerClick className="w-3.5 h-3.5 text-pink-400" />
                    <strong className="text-slate-200">{product.clicks || 0}</strong> shop clicks
                  </span>
                  <span>•</span>
                  <span className="text-emerald-400 font-bold">
                    {ctr}% CTR
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Product Description
              </h4>
              <p className="text-slate-300 text-sm leading-relaxed">
                {product.description}
              </p>
            </div>

            {/* Key Features */}
            {product.features && product.features.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  What's Included
                </h4>
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

            {/* Merchant / Affiliate Destination Info Box */}
            <div className="p-4 rounded-2xl bg-[#1a1040] border border-purple-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300">Merchant / Platform:</span>
                <span className="text-pink-300 font-bold text-xs">{product.merchantName || 'Direct Merchant Store'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Destination URL:</span>
                <span className="text-pink-400 font-mono text-[11px] truncate max-w-xs">{product.affiliateUrl || product.originalUrl}</span>
              </div>
              <div className="pt-2 border-t border-purple-900/60 text-[11px] text-slate-400 leading-relaxed">
                ⚖️ <strong>Affiliate Notice:</strong> Clicking "Shop Now" takes you directly to {product.merchantName || 'the product seller'}. We may receive an affiliate commission if you purchase.
              </div>
            </div>

            {/* Affiliate Box */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/60 to-pink-950/60 border border-purple-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center gap-1">
                  <Share2 className="w-3.5 h-3.5 text-pink-400" />
                  <span>Affiliate Referral Link</span>
                </span>
                <span className="text-emerald-400 font-bold">
                  Earn ₹{Math.round(product.price * (product.commissionRate / 100))} per sale
                </span>
              </div>
              <div className="flex items-center gap-2 bg-black/40 p-2 rounded-xl">
                <input
                  type="text"
                  readOnly
                  value={referralLink}
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
            </div>

            {/* Footer Actions with Shop Now & Direct Checkout */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-purple-900/60">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Instant Digital Access Delivery</span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={handleShopNow}
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold text-xs shadow-lg shadow-pink-600/30 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Shop Now</span>
                </button>

                <button
                  onClick={() => setPurchaseStep('checkout')}
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-[#231554] hover:bg-[#2f1c70] text-slate-100 font-bold text-xs border border-purple-700 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Instant Buy (₹{product.price})</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
