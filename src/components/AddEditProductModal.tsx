import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { useAuth } from '../context/AuthContext';
import { useProducts } from '../context/ProductContext';
import {
  X,
  PackagePlus,
  Image as ImageIcon,
  DollarSign,
  FileText,
  Link as LinkIcon,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Check,
  Upload,
  RefreshCw,
  Eye,
  FileImage,
  Globe
} from 'lucide-react';

interface AddEditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (productData: any) => void;
  editingProduct?: Product | null;
}

const PRESET_SAMPLE_IMAGES = [
  {
    name: 'Notion Workspace',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Code & Software',
    url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Design & Graphics',
    url: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'E-Book & Guide',
    url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Video Course',
    url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'AI Prompts Vault',
    url: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=600&q=80'
  }
];

export const AddEditProductModal: React.FC<AddEditProductModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingProduct
}) => {
  const { user } = useAuth();
  const { addProduct, updateProduct, uploadProductImage, showToast } = useProducts();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'templates' | 'courses' | 'software' | 'ebooks' | 'graphics'>('templates');
  const [price, setPrice] = useState<number | ''>(499);
  const [description, setDescription] = useState('');
  const [originalUrl, setOriginalUrl] = useState('');
  const [merchantName, setMerchantName] = useState('');
  const [commissionRate, setCommissionRate] = useState<number | ''>(40);
  const [merchantWebsite, setMerchantWebsite] = useState('');
  const [image, setImage] = useState(PRESET_SAMPLE_IMAGES[0].url);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [imageInputMode, setImageInputMode] = useState<'upload' | 'url' | 'preset'>('upload');
  const [status, setStatus] = useState<'draft' | 'published'>('published'); // Live active by default

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');

  // Sync state with editing product if provided
  useEffect(() => {
    if (editingProduct) {
      setTitle(editingProduct.title);
      setCategory(editingProduct.category);
      setPrice(editingProduct.price);
      setDescription(editingProduct.description);
      setOriginalUrl(editingProduct.affiliateUrl || editingProduct.originalUrl || 'https://gumroad.com/demo');
      setMerchantName(editingProduct.merchantName || 'Gumroad / Direct Store');
      setCommissionRate(editingProduct.commissionRate ?? 40);
      setMerchantWebsite(editingProduct.merchantWebsite || '');
      setImage(editingProduct.image);
      setStatus((editingProduct.status as any) || 'published');
      setSelectedFile(null);
      setFilePreview(null);
      setImageInputMode('url');
    } else {
      // Default reset
      setTitle('');
      setCategory('templates');
      setPrice(499);
      setDescription('');
      setOriginalUrl('');
      setMerchantName('');
      setCommissionRate(40);
      setMerchantWebsite('');
      setImage(PRESET_SAMPLE_IMAGES[0].url);
      setSelectedFile(null);
      setFilePreview(null);
      setStatus('published');
      setImageInputMode('upload');
    }
    setError(null);
  }, [editingProduct, isOpen]);

  if (!isOpen) return null;

  // Handle local image file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Validate size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image file must be under 5MB.');
        return;
      }

      // Validate type
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

    // Validation 1: Title
    if (!title.trim() || title.trim().length < 3) {
      setError('Product title must be at least 3 characters long.');
      return;
    }

    // Validation 2: Price
    if (!price || Number(price) <= 0) {
      setError('Please provide a valid product price in ₹ greater than 0.');
      return;
    }

    // Validation 3: Description
    if (!description.trim() || description.trim().length < 10) {
      setError('Please write a brief description of at least 10 characters.');
      return;
    }

    // Validation 4: Affiliate Tracking URL
    let cleanUrl = originalUrl.trim();
    if (!cleanUrl) {
      setError('Please enter your affiliate referral / tracking URL.');
      return;
    }
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }

    try {
      const parsed = new URL(cleanUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        setError('Affiliate product URL must be a valid HTTP or HTTPS destination.');
        return;
      }
    } catch {
      setError('Please enter a valid website URL for your affiliate link.');
      return;
    }

    // Validation 5: Affiliate Login check
    if (!user) {
      setError('You must be logged in to your ClickBarry affiliate account to submit products.');
      return;
    }

    setIsSubmitting(true);
    let finalImageUrl = image.trim();

    // Handle real file upload to Supabase Storage if file was selected
    if (selectedFile) {
      setUploadProgressText('Uploading product image to Supabase Storage...');
      const uploadRes = await uploadProductImage(selectedFile, user.id);
      if (uploadRes.success && uploadRes.url) {
        finalImageUrl = uploadRes.url;
      } else {
        showToast(
          uploadRes.error?.includes('Bucket not found')
            ? "Storage bucket 'product-images' not found in Supabase. Using sample artwork."
            : `Storage upload note: ${uploadRes.error}. Using image preview.`,
          'info'
        );
      }
    }

    if (!finalImageUrl) {
      finalImageUrl = PRESET_SAMPLE_IMAGES[0].url;
    }

    setUploadProgressText('Saving affiliate product to Supabase Database...');

    const resolvedMerchant = merchantName.trim() || 'Direct Merchant / Platform';

    if (editingProduct) {
      // Real database update
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
        setError(updateRes.error || 'Failed to update affiliate product in database.');
      }
    } else {
      // Real database insert
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
        approvalStatus: 'approved',
        image: finalImageUrl,
        status
      });

      setIsSubmitting(false);
      if (addRes.success) {
        onSave?.(addRes.product);
        onClose();
      } else {
        setError(addRes.error || 'Failed to submit affiliate product to database.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-[#130b30] border border-purple-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-100">
        {/* Glow corner */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-pink-600/30 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1 mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/20 text-pink-300 text-xs font-bold uppercase tracking-wider border border-pink-500/30">
            <PackagePlus className="w-3.5 h-3.5" />
            <span>{editingProduct ? 'Edit Affiliate Product' : 'Submit Affiliate Product to Marketplace'}</span>
          </div>
          <h2 className="text-2xl font-black text-white">
            {editingProduct ? 'Update Product & Tracking Link' : 'Add Product with Your Affiliate Tracking Link'}
          </h2>
          <p className="text-xs text-slate-400">
            Submit any digital asset or software with your custom affiliate link. When visitors click <strong>Shop Now</strong>, they are redirected using your tracking URL.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-950/80 border border-red-500/70 text-red-200 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Product Title <span className="text-pink-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Notion All-In-One Workspace OS or AI Prompt Masterclass"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#1b1046] border border-purple-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
            />
          </div>

          {/* Merchant / Brand Name & Commission Rate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Merchant / Brand Name <span className="text-pink-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Notion, Gumroad, Coursera, Webflow, Amazon"
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#1b1046] border border-purple-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Affiliate Commission Rate (%) <span className="text-slate-500">(Optional)</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="40"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#1b1046] border border-purple-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 font-bold"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-pink-400 font-bold">%</span>
              </div>
            </div>
          </div>

          {/* Category & Price Grid */}
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

          {/* Affiliate Tracking URL */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
              <span>Affiliate Tracking URL <span className="text-pink-500">*</span></span>
              <span className="text-[10px] text-pink-400 font-semibold">Your personal tracking/referral link</span>
            </label>
            <div className="relative">
              <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="url"
                required
                placeholder="https://brand.com/item?ref=your_affiliate_id or https://gumroad.com/l/item/aff_123"
                value={originalUrl}
                onChange={(e) => setOriginalUrl(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#1b1046] border border-purple-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 font-mono text-xs"
              />
            </div>
          </div>

          {/* Optional Merchant Official Website */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
              <span>Merchant / Brand Website <span className="text-slate-500">(Optional)</span></span>
              <span className="text-[10px] text-slate-400">e.g. https://notion.so</span>
            </label>
            <div className="relative">
              <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="url"
                placeholder="https://merchant-homepage.com"
                value={merchantWebsite}
                onChange={(e) => setMerchantWebsite(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#1b1046] border border-purple-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 font-mono text-xs"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Product Description <span className="text-pink-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="Highlight what this product includes, key benefits, and why visitors should buy it..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#1b1046] border border-purple-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 resize-none"
            />
          </div>

          {/* Product Image Section: File Upload / URL / Presets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-300">
                Product Image <span className="text-pink-500">*</span>
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
                  Presets
                </button>
              </div>
            </div>

            {/* Mode 1: Real File Upload */}
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
                      {selectedFile ? selectedFile.name : 'Click to select product image'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      PNG, JPG, WEBP up to 5MB (Uploads to Supabase Storage bucket: product-images)
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

            {/* Mode 2: Paste Image URL */}
            {imageInputMode === 'url' && (
              <div className="relative">
                <ImageIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#1b1046] border border-purple-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 font-mono"
                />
              </div>
            )}

            {/* Mode 3: Pick from Curated Presets */}
            {imageInputMode === 'preset' && (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {PRESET_SAMPLE_IMAGES.map((preset, idx) => (
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
                        : 'border-purple-900 hover:border-purple-700 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                    <span className="absolute inset-x-0 bottom-0 bg-black/80 text-[8px] text-white font-bold p-0.5 truncate text-center">
                      {preset.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Publishing Status Toggle (Draft vs Published) */}
          <div className="p-3.5 rounded-2xl bg-[#1b1046] border border-purple-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="font-bold text-xs text-white block">Marketplace Status</span>
              <span className="text-[11px] text-slate-400">
                {status === 'published'
                  ? '🟢 Live in Marketplace: Discoverable with your affiliate link'
                  : '🟡 Draft / Pending: Saved privately in your Affiliate Dashboard'}
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
                Live
              </button>
            </div>
          </div>

          {/* Submit Action */}
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
                  <span>{uploadProgressText || 'Saving to Supabase...'}</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{editingProduct ? 'Save Changes' : status === 'published' ? 'Publish Affiliate Product' : 'Save as Draft'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
