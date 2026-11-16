import React, { useState, useMemo } from 'react';
import { Product, PageId } from '../types';
import { useProducts } from '../context/ProductContext';
import { useHybridAffiliate } from '../context/HybridAffiliateContext';
import { PromoteProductModal } from '../components/PromoteProductModal';
import {
  Search,
  Filter,
  ArrowUpDown,
  Sparkles,
  ShoppingBag,
  Star,
  CheckCircle2,
  ExternalLink,
  Share2,
  PackagePlus,
  Eye,
  MousePointerClick,
  Link2
} from 'lucide-react';

interface MarketplacePageProps {
  onOpenProductModal: (product: Product) => void;
  onNavigate: (page: PageId) => void;
  onOpenSignup: () => void;
}

export const MarketplacePage: React.FC<MarketplacePageProps> = ({
  onOpenProductModal,
  onNavigate,
  onOpenSignup
}) => {
  const { products, recordView, recordClick } = useProducts();
  const { adminProducts, recordOutboundClick } = useHybridAffiliate();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'popular' | 'views' | 'price-low' | 'price-high' | 'commission'>('popular');
  const [promotingProduct, setPromotingProduct] = useState<Product | null>(null);

  // Map Admin external products into main Marketplace products
  const allMarketplaceProducts = useMemo(() => {
    const adminMapped: Product[] = adminProducts
      .filter((ap) => ap.status === 'published')
      .map((ap) => ({
        id: ap.id,
        title: ap.title,
        sellerName: `${ap.networkName} (Verified)`,
        sellerVerified: true,
        category: ap.category,
        categoryLabel: ap.networkName,
        price: ap.price,
        originalPrice: Math.round(ap.price * 1.3),
        commissionRate: ap.commissionRate || 10,
        rating: 4.9,
        reviewsCount: 12,
        salesCount: 35,
        views: ap.clicksCount * 4,
        clicks: ap.clicksCount,
        originalUrl: ap.affiliateProductUrl,
        affiliateUrl: ap.affiliateProductUrl,
        merchantName: ap.networkName,
        networkName: ap.networkName,
        networkId: ap.networkId,
        image: ap.imageUrl,
        description: ap.description,
        features: ['Verified external network listing', 'Direct merchant checkout', 'Fast delivery'],
        fileFormat: `${ap.networkName} Order`,
        isAdminProduct: true,
        isExternalAffiliate: true,
        status: 'published'
      }));

    return [...products, ...adminMapped];
  }, [products, adminProducts]);

  const categories = [
    { id: 'all', label: 'All Products' },
    { id: 'templates', label: 'Notion & Templates' },
    { id: 'software', label: 'Software & Code' },
    { id: 'graphics', label: 'Canva & Graphics' },
    { id: 'ebooks', label: 'E-Books & Guides' },
    { id: 'courses', label: 'Video Courses' }
  ];

  const filteredProducts = useMemo(() => {
    return allMarketplaceProducts.filter((prod) => {
      const matchesSearch =
        prod.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prod.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prod.sellerName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === 'all' || prod.category === selectedCategory;

      return matchesSearch && matchesCategory;
    }).sort((a, b) => {
      if (sortBy === 'price-low') return a.price - b.price;
      if (sortBy === 'price-high') return b.price - a.price;
      if (sortBy === 'commission') return b.commissionRate - a.commissionRate;
      if (sortBy === 'views') return (b.views || 0) - (a.views || 0);
      return (b.salesCount || 0) - (a.salesCount || 0);
    });
  }, [allMarketplaceProducts, searchQuery, selectedCategory, sortBy]);

  const handleCardClick = (prod: Product) => {
    recordView(prod.id);
    onOpenProductModal(prod);
  };

  const handleShopNow = async (e: React.MouseEvent, prod: Product) => {
    e.stopPropagation();
    recordClick(prod.id);

    const targetUrl = prod.affiliateUrl || prod.originalUrl;
    if (targetUrl) {
      await recordOutboundClick(
        `click_${prod.id.substring(0, 8)}`,
        targetUrl,
        prod.networkName || prod.merchantName || 'ClickBarry Marketplace',
        prod.id
      );

      let clean = targetUrl.trim();
      if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
        clean = 'https://' + clean;
      }
      try {
        const parsed = new URL(clean);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          window.open(clean, '_blank', 'noopener,noreferrer');
          return;
        }
      } catch {}
    }

    recordView(prod.id);
    onOpenProductModal(prod);
  };

  return (
    <div className="min-h-screen bg-[#0d0725] text-slate-100 py-10 px-4 sm:px-6 lg:px-8 space-y-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Banner */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-purple-900 via-rose-950 to-indigo-950 p-8 sm:p-12 border border-purple-800/50 shadow-2xl">
          <div className="max-w-3xl space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/20 text-pink-300 text-xs font-bold uppercase tracking-wider">
                🍓 ClickBarry Affiliate Discovery
              </span>
              <span className="inline-flex items-center text-[11px] bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full font-bold">
                ⚡ Direct Merchant Links &amp; Instant Access
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
              Discover High-Quality Digital Products &amp; Tools
            </h1>
            <p className="text-slate-300 text-base sm:text-lg">
              Explore curated digital products from top creators, platforms, and affiliate marketers. Click <strong>Shop Now</strong> to purchase directly through verified merchant partners.
            </p>
          </div>
        </div>

        {/* Affiliate Disclosure Banner */}
        <div className="bg-[#150a32] rounded-2xl p-4 border border-purple-800/70 flex items-start gap-3 shadow-lg">
          <span className="text-lg">ℹ️</span>
          <div className="space-y-0.5">
            <span className="font-bold text-xs text-pink-300 uppercase tracking-wide">Affiliate Disclosure</span>
            <p className="text-xs text-slate-300 leading-relaxed">
              Some links on ClickBarry are affiliate links. We and our partner creators may earn a commission when you make a purchase through these links, at no additional cost to you. ClickBarry does not directly process payments or sell these products.
            </p>
          </div>
        </div>

        {/* Search, Filter & Controls */}
        <div className="bg-[#140c33] rounded-2xl p-4 sm:p-6 border border-purple-900/60 shadow-lg space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search templates, courses, software..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-[#1d1245] border border-purple-800 text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:border-pink-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Sort & Dashboard Link */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-pink-400" />
                <span className="text-xs font-semibold text-slate-400">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-[#1d1245] border border-purple-800 text-slate-200 text-xs font-semibold rounded-lg px-3 py-2 focus:outline-none focus:border-pink-500 cursor-pointer"
                >
                  <option value="popular">Most Popular</option>
                  <option value="views">Most Viewed</option>
                  <option value="commission">Highest Commission %</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
              </div>

              <button
                onClick={() => onNavigate('dashboard')}
                className="px-4 py-2 rounded-xl bg-pink-600/30 hover:bg-pink-600 border border-pink-500 text-pink-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <PackagePlus className="w-3.5 h-3.5" />
                <span>Seller Dashboard</span>
              </button>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-purple-900/40">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-md shadow-pink-600/30'
                    : 'bg-[#1e1346] text-slate-300 hover:text-white hover:bg-[#27195a]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-slate-400">
              Showing {filteredProducts.length} digital products
            </span>
            <span className="text-xs text-pink-400 font-medium">
              Demo sample listings
            </span>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="bg-[#140b33] rounded-3xl p-12 text-center border border-purple-900/40 space-y-3">
              <p className="text-slate-300 text-base font-semibold">No products found matching your search.</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((prod) => (
                <div
                  key={prod.id}
                  onClick={() => handleCardClick(prod)}
                  className="bg-[#140b33] rounded-2xl overflow-hidden border border-purple-900/50 hover:border-pink-500/70 shadow-lg hover:shadow-2xl transition-all cursor-pointer group flex flex-col"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-[16/10] overflow-hidden bg-slate-900">
                    <img
                      src={prod.image}
                      alt={prod.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded text-xs font-semibold text-pink-300">
                      {prod.categoryLabel}
                    </div>
                    <div className="absolute top-3 right-3 bg-emerald-500/90 text-slate-950 px-2 py-0.5 rounded text-xs font-extrabold flex items-center gap-1 shadow-md">
                      <span>Earn {prod.commissionRate}%</span>
                    </div>

                    {prod.isRealDb ? (
                      <div className="absolute bottom-2 left-2 bg-emerald-950/90 border border-emerald-500/70 text-emerald-300 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 shadow-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Live Product</span>
                      </div>
                    ) : (
                      <div className="absolute bottom-2 left-2 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-slate-300">
                        Sample Demo
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="truncate">{prod.merchantName || prod.sellerName}</span>
                          {prod.sellerVerified && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          )}
                        </div>
                        <span className="text-[10px] text-pink-300 bg-pink-950/60 border border-pink-800/60 px-1.5 py-0.5 rounded font-mono shrink-0">
                          Affiliate
                        </span>
                      </div>

                      <h3 className="font-bold text-base text-white group-hover:text-pink-400 transition-colors line-clamp-2">
                        {prod.title}
                      </h3>

                      <p className="text-slate-400 text-xs mt-2 line-clamp-2">
                        {prod.description}
                      </p>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-purple-900/40">
                      <div className="flex items-center justify-between">
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-black text-white">
                            ₹{prod.price}
                          </span>
                          {prod.originalPrice && (
                            <span className="text-xs text-slate-500 line-through">
                              ₹{prod.originalPrice}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-xs text-amber-400 font-bold">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>{prod.rating}</span>
                          <span className="text-slate-500 font-normal">({prod.reviewsCount || 0})</span>
                        </div>
                      </div>

                      {/* Views & Clicks tracker pill */}
                      <div className="flex items-center justify-between text-[11px] text-slate-400 bg-[#1a0f44] px-2.5 py-1 rounded-lg">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3 text-blue-400" />
                          <span>{prod.views || 0} views</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <MousePointerClick className="w-3 h-3 text-pink-400" />
                          <span>{prod.clicks || 0} clicks</span>
                        </span>
                      </div>

                      {/* Action buttons (Shop Now & Promote Product) */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={(e) => handleShopNow(e, prod)}
                          className="py-2.5 rounded-lg bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold text-xs shadow-md shadow-pink-600/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Shop Now</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPromotingProduct(prod);
                          }}
                          className="py-2.5 rounded-lg bg-pink-600/20 hover:bg-pink-600/40 text-pink-300 hover:text-white font-bold text-xs border border-pink-500/50 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          title="Generate Unique Affiliate Tracking Link"
                        >
                          <Link2 className="w-3.5 h-3.5 text-pink-400" />
                          <span>Promote</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Promote Product Modal */}
        <PromoteProductModal
          product={promotingProduct}
          isOpen={Boolean(promotingProduct)}
          onClose={() => setPromotingProduct(null)}
          onNavigateToDashboard={() => onNavigate('dashboard')}
        />

        {/* Sell Your Own Digital Product Banner */}
        <div className="rounded-3xl bg-gradient-to-r from-pink-900/40 via-purple-900/40 to-indigo-900/40 border border-pink-500/30 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-xl sm:text-2xl font-bold text-white">
              Are you a creator or developer with digital products?
            </h3>
            <p className="text-sm text-slate-300 max-w-xl">
              Pay ₹999 once and get lifetime seller listing with zero recurring platform fees, plus access to our affiliate distribution network.
            </p>
          </div>
          <button
            onClick={() => onNavigate('dashboard')}
            className="px-6 py-3 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold text-sm shadow-lg shadow-pink-600/30 shrink-0 cursor-pointer"
          >
            Manage in Seller Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
