import React, { useState } from 'react';
import { ExternalAffiliateProduct, SupportedNetworkId } from '../types';
import { useHybridAffiliate } from '../context/HybridAffiliateContext';
import {
  X,
  PlusCircle,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Upload,
  Check,
  Image as ImageIcon,
  DollarSign,
  Tag,
  Layers,
  Globe
} from 'lucide-react';
import { useProducts } from '../context/ProductContext';
import { useAuth } from '../context/AuthContext';

interface AddExternalProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdminMode?: boolean;
  editingProduct?: ExternalAffiliateProduct | null;
}

const NETWORK_OPTIONS: { id: SupportedNetworkId; name: string; example: string }[] = [
  { id: 'amazon', name: 'Amazon Associates', example: 'https://amazon.in/dp/B08XYZ?tag=yourtag-21' },
  { id: 'clickbank', name: 'ClickBank', example: 'https://hop.clickbank.net/?affiliate=user&vendor=item' },
  { id: 'digistore24', name: 'Digistore24', example: 'https://www.digistore24.com/redir/123456/affiliate' },
  { id: 'other', name: 'Other Networks / Direct Creator', example: 'https://notion.so/item?ref=your_id' }
];

export const AddExternalProductModal: React.FC<AddExternalProductModalProps> = ({
  isOpen,
  onClose,
  isAdminMode = false,
  editingProduct
}) => {
  const { user } = useAuth();
  const { addExternalProduct, updateExternalProduct, networks } = useHybridAffiliate();
  const { uploadProductImage, showToast } = useProducts();

  const [title, setTitle] = useState(editingProduct?.title || '');
  const [description, setDescription] = useState(editingProduct?.description || '');
  const [price, setPrice] = useState<number | ''>(editingProduct?.price || 499);
  const [networkId, setNetworkId] = useState<SupportedNetworkId>(
    (editingProduct?.networkId as SupportedNetworkId) || 'amazon'
  );
  const [affiliateProductUrl, setAffiliateProductUrl] = useState(editingProduct?.affiliateProductUrl || '');
  const [commissionRate, setCommissionRate] = useState<number | ''>(editingProduct?.commissionRate || 10);
  const [category, setCategory] = useState<'templates' | 'courses' | 'software' | 'ebooks' | 'graphics'>(
    editingProduct?.category || 'templates'
  );
  const [image, setImage] = useState(
    editingProduct?.imageUrl ||
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80'
  );
  const [status, setStatus] = useState<'published' | 'draft'>((editingProduct?.status as any) || 'published');

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be under 5MB');
        return;
      }
      setSelectedFile(file);
      setFilePreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Product title is required.');
      return;
    }

    if (!affiliateProductUrl.trim()) {
      setError('Authorized affiliate product URL is required.');
      return;
    }

    let cleanUrl = affiliateProductUrl.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }

    try {
      const parsed = new URL(cleanUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        setError('Destination must be a valid HTTP or HTTPS address.');
        return;
      }
    } catch {
      setError('Please provide a valid destination URL.');
      return;
    }

    setIsSubmitting(true);
    let finalImageUrl = image;

    if (selectedFile && user) {
      const uploadRes = await uploadProductImage(selectedFile, user.id);
      if (uploadRes.success && uploadRes.url) {
        finalImageUrl = uploadRes.url;
      }
    }

    const selectedNetObj = NETWORK_OPTIONS.find((n) => n.id === networkId);
    const networkName = selectedNetObj ? selectedNetObj.name : 'Other Networks';

    if (editingProduct) {
      const res = await updateExternalProduct(editingProduct.id, {
        title: title.trim(),
        description: description.trim(),
        price: Number(price) || 0,
        networkId,
        networkName,
        affiliateProductUrl: cleanUrl,
        commissionRate: Number(commissionRate) || 0,
        category,
        imageUrl: finalImageUrl,
        status
      });

      setIsSubmitting(false);
      if (res.success) {
        showToast('Affiliate product updated successfully!', 'success');
        onClose();
      } else {
        setError(res.error || 'Failed to update product');
      }
    } else {
      const res = await addExternalProduct({
        title: title.trim(),
        description: description.trim(),
        price: Number(price) || 0,
        networkId,
        networkName,
        affiliateProductUrl: cleanUrl,
        commissionRate: Number(commissionRate) || 0,
        category,
        imageUrl: finalImageUrl,
        isAdminProduct: isAdminMode,
        status
      });

      setIsSubmitting(false);
      if (res.success) {
        showToast(
          isAdminMode
            ? `Admin external product "${title}" published to Marketplace!`
            : `Your external affiliate product "${title}" added successfully!`,
          'success'
        );
        onClose();
      } else {
        setError(res.error || 'Failed to add product');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-[#130b30] border border-purple-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-1 mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/20 text-pink-300 text-xs font-bold uppercase tracking-wider border border-pink-500/30">
            <PlusCircle className="w-3.5 h-3.5" />
            <span>
              {isAdminMode
                ? 'Admin: Add External Network Product'
                : editingProduct
                ? 'Edit External Affiliate Product'
                : 'Method B: Add My Own Affiliate Link'}
            </span>
          </div>
          <h2 className="text-2xl font-black text-white">
            {isAdminMode
              ? 'List Verified External Network Product'
              : 'Add Your Own External Affiliate Product'}
          </h2>
          <p className="text-xs text-slate-300">
            {isAdminMode
              ? 'List Amazon, ClickBank, or Digistore24 products to display in the main ClickBarry Marketplace.'
              : 'Add your authorized affiliate tracking URL from Amazon, ClickBank, Digistore24, or other networks. ClickBarry will track your outbound clicks.'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/80 border border-red-500 text-red-200 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Network Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Affiliate Network <span className="text-pink-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {NETWORK_OPTIONS.map((net) => (
                <button
                  key={net.id}
                  type="button"
                  onClick={() => setNetworkId(net.id)}
                  className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                    networkId === net.id
                      ? 'bg-pink-600/30 border-pink-500 text-white font-bold shadow-md shadow-pink-600/20'
                      : 'bg-[#1b1046] border-purple-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="block text-xs font-bold truncate">{net.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Product Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Product Name / Title <span className="text-pink-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Kindle Paperwhite (16 GB) or ClickBank Keto Diet Plan"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#1b1046] border border-purple-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
            />
          </div>

          {/* Affiliate Product URL */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
              <span>Affiliate Tracking URL <span className="text-pink-500">*</span></span>
              <span className="text-[10px] text-pink-400 font-mono">Your unique affiliate tracking link</span>
            </label>
            <div className="relative">
              <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="url"
                required
                placeholder={NETWORK_OPTIONS.find((n) => n.id === networkId)?.example || 'https://...'}
                value={affiliateProductUrl}
                onChange={(e) => setAffiliateProductUrl(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#1b1046] border border-purple-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 font-mono"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              🔒 Your tracking ID is preserved. ClickBarry redirects visitors directly to this URL and records outbound clicks.
            </p>
          </div>

          {/* Price & Commission & Category Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Price (₹) <span className="text-pink-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2.5 rounded-xl bg-[#1b1046] border border-purple-800 text-sm text-white focus:outline-none focus:border-pink-500 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Commission % <span className="text-slate-400">(Optional)</span>
              </label>
              <input
                type="number"
                min="0"
                max="100"
                placeholder="10"
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2.5 rounded-xl bg-[#1b1046] border border-purple-800 text-sm text-white focus:outline-none focus:border-pink-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Category <span className="text-pink-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#1b1046] border border-purple-800 text-xs text-white focus:outline-none focus:border-pink-500 cursor-pointer"
              >
                <option value="templates">Templates</option>
                <option value="software">Software</option>
                <option value="courses">Courses</option>
                <option value="ebooks">E-Books</option>
                <option value="graphics">Graphics</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Description <span className="text-pink-500">*</span>
            </label>
            <textarea
              required
              rows={2}
              placeholder="Highlight product features and why buyers should purchase..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#1b1046] border border-purple-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 resize-none"
            />
          </div>

          {/* Product Image */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Product Image <span className="text-pink-500">*</span>
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="url"
                placeholder="https://images.unsplash.com/..."
                value={image}
                onChange={(e) => setImage(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-[#1b1046] border border-purple-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 font-mono"
              />
              <label
                htmlFor="ext-img-upload"
                className="px-3 py-2 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload</span>
              </label>
              <input id="ext-img-upload" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </div>
            {filePreview && (
              <div className="mt-2">
                <img src={filePreview} alt="Preview" className="h-16 w-24 object-cover rounded-lg border border-purple-700" />
              </div>
            )}
          </div>

          {/* Status Selection */}
          <div className="p-3 rounded-xl bg-[#1b1046] border border-purple-800 flex items-center justify-between">
            <span className="text-xs text-slate-300 font-semibold">Publishing Status</span>
            <div className="flex gap-1 bg-[#120a2e] p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setStatus('draft')}
                className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                  status === 'draft' ? 'bg-amber-600 text-white' : 'text-slate-400'
                }`}
              >
                Draft
              </button>
              <button
                type="button"
                onClick={() => setStatus('published')}
                className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                  status === 'published' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                }`}
              >
                Published
              </button>
            </div>
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
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold text-xs shadow-lg shadow-pink-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{editingProduct ? 'Save Changes' : 'Add External Affiliate Product'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
