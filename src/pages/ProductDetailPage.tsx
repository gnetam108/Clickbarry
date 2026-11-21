import React, { useEffect, useState } from 'react';
import { PageId, Product } from '../types';
import { useProducts } from '../context/ProductContext';
import { useAuth } from '../context/AuthContext';
import { PromoteProductModal } from '../components/PromoteProductModal';
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Link2,
  Eye,
  MousePointerClick,
  ShieldCheck,
  Tag,
  Check,
  ShoppingBag,
  Flag
} from 'lucide-react';

interface ProductDetailPageProps {
  productId: string;
  onNavigate: (page: PageId) => void;
  onOpenAffiliateSignup: () => void;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  productId,
  onNavigate,
  onOpenAffiliateSignup
}) => {
  const { products, recordView, recordClick, reportProduct, showToast } = useProducts();
  const { user, role } = useAuth();
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState('Broken or invalid product link');
  const [reportDetails, setReportDetails] = useState('');
  const [isReporting, setIsReporting] = useState(false);

  const product: Product | undefined = products.find((p) => p.id === productId);

  useEffect(() => {
    if (product?.id) {
      recordView(product.id);
    }
  }, [product?.id, recordView]);

  if (!product) {
    return (
      <div className="min-h-screen bg-[#0c0722] text-slate-100 py-20 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-[#140b33] border border-purple-800 rounded-3xl p-8 text-center space-y-4">
          <ShoppingBag className="w-10 h-10 text-pink-400 mx-auto" />
          <h1 className="text-2xl font-black text-white">Product Not Found</h1>
          <p className="text-sm text-slate-400">
            This product may have been removed or is currently pending Admin approval.
          </p>
          <button
            onClick={() => onNavigate('marketplace')}
            className="px-6 py-2.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold text-sm cursor-pointer"
          >
            Back to Marketplace
          </button>
        </div>
      </div>
    );
  }

  const commissionInr = Math.round(product.price * (product.commissionRate / 100));

  const handleVisitProduct = () => {
    recordClick(product.id);
    let targetUrl = (product.affiliateUrl || product.originalUrl)?.trim();
    if (targetUrl) {
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
      }
      try {
        const parsed = new URL(targetUrl);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          showToast(`Opening ${parsed.hostname}...`, 'info');
          window.open(targetUrl, '_blank', 'noopener,noreferrer');
          return;
        }
      } catch {}
    }
    showToast('Product destination link is unavailable.', 'error');
  };

  const handlePromoteClick = () => {
    if (!user) {
      showToast('Register free as an Affiliate to generate your tracking link.', 'info');
      onOpenAffiliateSignup();
      return;
    }
    if (role === 'seller') {
      showToast('Sign in with an Affiliate account to generate promotional links.', 'info');
      return;
    }
    setPromoteOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#0c0722] text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <button
          onClick={() => onNavigate('marketplace')}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-pink-400 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Marketplace</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-[#140b33] border border-purple-800/80 rounded-3xl p-6 sm:p-10 shadow-2xl">
          {/* Product Media */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl overflow-hidden aspect-[4/3] bg-slate-900 border border-purple-800/60">
              <img
                src={product.image}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#1b1046] border border-purple-800/60 flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-400" />
                <div>
                  <span className="text-slate-400 block text-[10px]">Views</span>
                  <strong className="text-white text-sm">{product.views || 0}</strong>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#1b1046] border border-purple-800/60 flex items-center gap-2">
                <MousePointerClick className="w-4 h-4 text-pink-400" />
                <div>
                  <span className="text-slate-400 block text-[10px]">Clicks</span>
                  <strong className="text-white text-sm">{product.clicks || 0}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Product Details */}
          <div className="lg:col-span-7 space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-pink-500/20 text-pink-300 text-xs font-bold">
                <Tag className="w-3 h-3" />
                {product.categoryLabel}
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-extrabold border border-emerald-500/40">
                {product.commissionRate}% Affiliate Commission
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight">
              {product.title}
            </h1>

            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span>Created by <strong className="text-white">{product.sellerName}</strong></span>
              {product.sellerVerified && (
                <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verified Seller
                </span>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-[#1b1046] border border-purple-800/70 flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[11px] uppercase font-bold text-slate-400 block">Product Price</span>
                <span className="text-3xl font-black text-white">₹{product.price}</span>
              </div>
              <div className="text-right">
                <span className="text-[11px] uppercase font-bold text-emerald-400 block">Affiliate Payout / Sale</span>
                <span className="text-2xl font-black text-emerald-400">₹{commissionInr}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">Description</h2>
              <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>

            {product.features && product.features.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">Highlights</h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-200">
                  {product.features.map((feat, idx) => (
                    <li key={idx} className="flex items-center gap-2 bg-[#1b1046] p-2.5 rounded-xl border border-purple-900/60">
                      <Check className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handlePromoteClick}
                className="flex-1 py-3.5 px-6 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold text-sm shadow-lg shadow-pink-600/30 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Link2 className="w-4 h-4" />
                <span>Promote Product (Get Affiliate Link)</span>
              </button>

              <button
                onClick={handleVisitProduct}
                className="flex-1 py-3.5 px-6 rounded-xl bg-[#201449] hover:bg-[#2c1c66] text-white font-bold text-sm border border-purple-700 flex items-center justify-center gap-2 cursor-pointer"
              >
                <ExternalLink className="w-4 h-4 text-pink-400" />
                <span>Visit Product Page</span>
              </button>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Admin-approved ClickBarry Marketplace listing</span>
              </div>
              {user && (
                <button
                  type="button"
                  onClick={() => setShowReportForm((v) => !v)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-300 hover:text-red-200 cursor-pointer"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>Report Product</span>
                </button>
              )}
            </div>

            {showReportForm && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setIsReporting(true);
                  const res = await reportProduct(product.id, reportReason, reportDetails);
                  setIsReporting(false);
                  if (res.success) {
                    setShowReportForm(false);
                    setReportDetails('');
                  }
                }}
                className="p-4 rounded-2xl bg-red-950/30 border border-red-700/60 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-red-200 flex items-center gap-1.5">
                    <Flag className="w-3.5 h-3.5 text-red-400" />
                    <span>Report Product Listing</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowReportForm(false)}
                    className="text-[11px] text-slate-400 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#1b1046] border border-purple-800 text-xs text-white focus:outline-none focus:border-red-400"
                >
                  <option value="Broken or invalid product link">Broken or invalid product link</option>
                  <option value="Misleading pricing or commission">Misleading pricing or commission</option>
                  <option value="Duplicate or spam listing">Duplicate or spam listing</option>
                  <option value="Copyright / Prohibited content">Copyright / Prohibited content</option>
                  <option value="Other">Other</option>
                </select>
                <textarea
                  rows={2}
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Optional details for platform moderators..."
                  className="w-full px-3 py-2 rounded-xl bg-[#1b1046] border border-purple-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-400"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isReporting}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
                  >
                    {isReporting ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      <PromoteProductModal
        product={product}
        isOpen={promoteOpen}
        onClose={() => setPromoteOpen(false)}
        onNavigateToDashboard={() => onNavigate('affiliate-dashboard')}
      />
    </div>
  );
};
