import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { useAuth } from '../context/AuthContext';
import { useProducts } from '../context/ProductContext';
import sellerLaptopImage from '../assets/images/seller_dashboard_laptop_1794019709659.jpg';
import affiliateCoinsImage from '../assets/images/affiliate_coins_chart_1794019709558.jpg';
import heroImage from '../assets/images/hero_strawberries_1794019708249.jpg';
import securityShieldImage from '../assets/images/gold_security_shield_1794019711572.jpg';
import {
  X,
  PackagePlus,
  Image as ImageIcon,
  Link as LinkIcon,
  AlertCircle,
  Check,
  Upload,
  RefreshCw,
  Globe,
  Clock
} from 'lucide-react';

interface AddEditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (productData: any) => void;
  editingProduct?: Product | null;
}

const PRESET_COVER_ARTWORKS = [
  { name: 'Digital Product Kit', url: sellerLaptopImage },
  { name: 'Creator Analytics', url: affiliateCoinsImage },
  { name: 'Marketplace Featured', url: heroImage },
  { name: 'Verified Tool', url: securityShieldImage }
];

export const AddEditProductModal: React.FC<AddEditProductModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingProduct
}) => {
  const { user, profile } = useAuth();
  const { addProduct, updateProduct, uploadProductImage, showToast } = useProducts();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'templates' | 'courses' | 'software' | 'ebooks' | 'graphics'>('templates');
  const [price, setPrice] = useState<number | ''>(499);
  const [description, setDescription] = useState('');
  const [originalUrl, setOriginalUrl] = useState('');
  const [merchantName, setMerchantName] = useState('');
  const [commissionRate, setCommissionRate] = useState<number | ''>(40);
  const [merchantWebsite, setMerchantWebsite] = useState('');
  const [image, setImage] = useState(PRESET_COVER_ARTWORKS[0].url);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [imageInputMode, setImageInputMode] = useState<'upload' | 'url' | 'preset'>('upload');
  const [status, setStatus] = useState<'draft' | 'published'>('published');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');

  useEffect(() => {
    if (editingProduct) {
      setTitle(editingProduct.title);
      setCategory(editingProduct.category);
      setPrice(editingProduct.price);
      setDescription(editingProduct.description);
      setOriginalUrl(editingProduct.originalUrl || editingProduct.affiliateUrl || '');
      setMerchantName(editingProduct.merchantName || editingProduct.sellerName || '');
      setCommissionRate(editingProduct.commissionRate ?? 40);
      setMerchantWebsite(editingProduct.merchantWebsite || '');
      setImage(editingProduct.image || PRESET_COVER_ARTWORKS[0].url);
      setStatus((editingProduct.status as 'draft' | 'published') || 'published');
      setSelectedFile(null);
      setFilePreview(null);
      setImageInputMode('url');
    } else {
      setTitle('');
      setCategory('templates');
      setPrice(499);
      setDescription('');
      setOriginalUrl('');
      setMerchantName(profile?.full_name || '');
      setCommissionRate(40);
      setMerchantWebsite('');
      setImage(PRESET_COVER_ARTWORKS[0].url);
      setSelectedFile(null);
      setFilePreview(null);
      setStatus('published');
      setImageInputMode('upload');
    }
    setError(null);
  }, [editingProduct, isOpen, profile?.full_name]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      if (file.size > 5 * 1024 * 1024) {
        setError('Image file must be under 5MB.');
        return;
      }

      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
        setError('Please select a JPG, PNG, WEBP, or GIF image.');
        return;
      }

      setError(null);
      setSelectedFile(file);
      setFilePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || title.trim().length < 3) {
      setError('Product title must be at least 3 characters long.');
      return;
    }

    if (!price || Number(price) <= 0) {
      setError('Please provide a valid product price in ₹ greater than 0.');
      return;
    }

    if (!description.trim() || description.trim().length < 10) {
      setError('Please write a brief description of at least 10 characters.');
      return;
    }

    let cleanUrl = originalUrl.trim();
    if (!cleanUrl) {
      setError('Please enter your product sales or checkout destination URL.');
      return;
    }
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }

    try {
      const parsed = new URL(cleanUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        setError('Product URL must be a valid HTTP or HTTPS destination.');
        return;
      }
    } catch {
      setError('Please enter a valid website URL for your product.');
      return;
    }

    if (!user) {
      setError('You must be signed in as a Seller to submit products.');
      return;
    }

    setIsSubmitting(true);
    let finalImageUrl = image.trim();

    if (selectedFile) {
      setUploadProgressText('Uploading product image...');
      const uploadRes = await uploadProductImage(selectedFile, user.id);
      if (uploadRes.success && uploadRes.url) {
        finalImageUrl = uploadRes.url;
      } else {
        showToast(
          uploadRes.error?.includes('Bucket not found')
            ? "Storage bucket 'product-images' not ready yet. Using default artwork."
            : `Image upload note: ${uploadRes.error}. Using selected cover.`,
          'info'
        );
      }
    }

    if (!finalImageUrl) {
      finalImageUrl = PRESET_COVER_ARTWORKS[0].url;
    }

    setUploadProgressText('Saving product for review...');
    const resolvedMerchant = merchantName.trim() || profile?.full_name || 'Creator Store';

    if (editingProduct) {
      const updateRes = await updateProduct(editingProduct.id, {
        title: title.trim(),
        category,
        price: Number(price),
        description: description.trim(),
        originalUrl: cleanUrl,
        affiliateUrl: cleanUrl,
        merchantName: resolvedMerchant,
        commissionRate: Number(commissionRate) || 40,
        merchantWebsite: merchantWebsite.trim() || undefined,
        image: finalImageUrl,
        status
      });

      setIsSubmitting(false);
      if (updateRes.success) {
        onSave?.({ id: editingProduct.id, title, price, status });
        onClose();
      } else {
        setError(updateRes.error || 'Failed to update product in database.');
      }
    } else {
      const addRes = await addProduct({
        title: title.trim(),
        category,
        price: Number(price),
        description: description.trim(),
        originalUrl: cleanUrl,
        affiliateUrl: cleanUrl,
        merchantName: resolvedMerchant,
        commissionRate: Number(commissionRate) || 40,
        merchantWebsite: merchantWebsite.trim() || undefined,
        approvalStatus: 'pending',
        image: finalImageUrl,
        status
      });

      setIsSubmitting(false);
      if (addRes.success) {
        onSave?.(addRes.product);
        onClose();
      } else {
        setError(addRes.error || 'Failed to submit product to database.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-[#130b30] border border-purple-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-100">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-pink-600/30 rounded-full blur-2xl pointer-events-none" />

        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1 mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/20 text-pink-300 text-xs font-bold uppercase tracking-wider border border-pink-500/30">
            <PackagePlus className="w-3.5 h-3.5" />
            <span>{editingProduct ? 'Edit Seller Product' : 'Submit Product to ClickBarry Marketplace'}</span>
          </div>
          <h2 className="text-2xl font-black text-white">
            {editingProduct ? 'Update Product Listing' : 'Add New Digital Product'}
          </h2>
          <p className="text-xs text-slate-400">
            Configure your digital product details, pricing, and Affiliate commission percentage. New submissions are reviewed by Admin before going live.
          </p>
        </div>

        {!editingProduct && (
          <div className="mb-4 p-3 rounded-2xl bg-amber-950/50 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Admin Moderation Queue:</strong> Submitted products enter <strong>Pending Approval</strong> first and become discoverable in the public Marketplace once approved.
            </span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-950/80 border border-red-500/70 text-red-200 text-xs font-semibold flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Product Title <span className="text-pink-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Notion Creator Operating System or UI Kit"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#1b1046] border border-purple-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Brand / Store Name <span className="text-pink-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Your creator brand or store name"
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#1b1046] border border-purple-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Affiliate Commission Rate (%) <span className="text-pink-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  required
                  min="1"
                  max="90"
                  placeholder="40"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#1b1046] border border-purple-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 font-bold"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-pink-400 font-bold">%</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Product Category <span className="text-pink-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#1b1046] border border-purple-800 text-sm text-white focus:outline-none focus:border-pink-500 cursor-pointer"
              >
                <option value="templates">Notion &amp; Productivity Templates</option>
                <option value="software">Software, Plugins &amp; Source Code</option>
                <option value="graphics">Canva &amp; Graphic Design Kits</option>
                <option value="ebooks">E-Books, Guides &amp; Playbooks</option>
                <option value="courses">Video Courses &amp; Masterclasses</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Product Price in ₹ (INR) <span className="text-pink-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-bold">₹</span>
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  placeholder="499"
                  value={price}
                  onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : '')}
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-[#1b1046] border border-purple-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 font-bold"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
              <span>Product Sales / Checkout URL <span className="text-pink-500">*</span></span>
              <span className="text-[10px] text-pink-400 font-semibold">Where buyers land when visiting</span>
            </label>
            <div className="relative">
              <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="url"
                required
                placeholder="https://yourstore.com/product"
                value={originalUrl}
                onChange={(e) => setOriginalUrl(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#1b1046] border border-purple-800 text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 font-mono text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
              <span>Creator Website <span className="text-slate-500">(Optional)</span></span>
            </label>
            <div className="relative">
              <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="url"
                placeholder="https://yourbrand.com"
                value={merchantWebsite}
                onChange={(e) => setMerchantWebsite(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#1b1046] border border-purple-800 text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 font-mono text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Product Description <span className="text-pink-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="Explain what this product includes, key benefits, and why affiliates will love promoting it..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#1b1046] border border-purple-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 resize-none"
            />
          </div>

          {/* Product Image */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-300">
                Product Cover Image <span className="text-pink-500">*</span>
              </label>
              <div className="flex gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setImageInputMode('upload')}
                  className={`px-2.5 py-0.5 rounded-lg font-bold transition-colors cursor-pointer ${
                    imageInputMode === 'upload' ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setImageInputMode('url')}
                  className={`px-2.5 py-0.5 rounded-lg font-bold transition-colors cursor-pointer ${
                    imageInputMode === 'url' ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Image URL
                </button>
                <button
                  type="button"
                  onClick={() => setImageInputMode('preset')}
                  className={`px-2.5 py-0.5 rounded-lg font-bold transition-colors cursor-pointer ${
                    imageInputMode === 'preset' ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Covers
                </button>
              </div>
            </div>

            {imageInputMode === 'upload' && (
              <div className="border-2 border-dashed border-purple-800/80 hover:border-pink-500/80 rounded-2xl p-4 text-center transition-colors bg-[#180e3b]">
                <input
                  type="file"
                  id="product-image-file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="product-image-file"
                  className="flex flex-col items-center justify-center gap-2 cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {selectedFile ? selectedFile.name : 'Click to upload product cover'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      PNG, JPG, WEBP up to 5MB (product-images bucket)
                    </span>
                  </div>
                </label>

                {filePreview && (
                  <div className="mt-3 flex items-center justify-center">
                    <img
                      src={filePreview}
                      alt="Upload Preview"
                      className="h-20 w-32 object-cover rounded-xl border border-purple-700 shadow-md"
                    />
                  </div>
                )}
              </div>
            )}

            {imageInputMode === 'url' && (
              <div className="relative">
                <ImageIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="url"
                  placeholder="https://example.com/cover.jpg"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#1b1046] border border-purple-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 font-mono"
                />
              </div>
            )}

            {imageInputMode === 'preset' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PRESET_COVER_ARTWORKS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setImage(preset.url);
                      setSelectedFile(null);
                      setFilePreview(null);
                    }}
                    className={`relative rounded-xl overflow-hidden aspect-video border-2 transition-all cursor-pointer ${
                      image === preset.url && !selectedFile
                        ? 'border-pink-500 scale-105 shadow-md shadow-pink-500/30'
                        : 'border-purple-900 hover:border-purple-700 opacity-75 hover:opacity-100'
                    }`}
                  >
                    <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                    <span className="absolute inset-x-0 bottom-0 bg-black/80 text-[9px] text-white font-bold p-0.5 truncate text-center">
                      {preset.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="p-3.5 rounded-2xl bg-[#1b1046] border border-purple-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="font-bold text-xs text-white block">Submission Visibility</span>
              <span className="text-[11px] text-slate-400">
                {status === 'published'
                  ? 'Submit for Admin Approval & Marketplace listing'
                  : 'Save privately as Draft (not visible in Marketplace)'}
              </span>
            </div>

            <div className="flex rounded-xl bg-[#120a2e] p-1 border border-purple-900">
              <button
                type="button"
                onClick={() => setStatus('draft')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  status === 'draft' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Draft
              </button>
              <button
                type="button"
                onClick={() => setStatus('published')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  status === 'published' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Submit
              </button>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-purple-900/40 hover:bg-purple-900/70 text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold text-xs shadow-lg shadow-pink-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{uploadProgressText || 'Saving...'}</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{editingProduct ? 'Save Changes' : 'Submit Product'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
