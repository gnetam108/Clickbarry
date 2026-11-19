import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Product, PageId } from '../types';
import { useProducts } from '../context/ProductContext';
import { useAuth } from '../context/AuthContext';
import { useHybridAffiliate } from '../context/HybridAffiliateContext';
import { PromoteProductModal } from '../components/PromoteProductModal';
import {
  Search,
  ArrowUpDown,
  ShoppingBag,
  CheckCircle2,
  ExternalLink,
  Eye,
  MousePointerClick,
  Link2,
  TrendingUp,
  Rocket,
  ArrowRight
} from 'lucide-react';

interface MarketplacePageProps {
  onOpenProductModal: (product: Product) => void;
  onOpenProductDetail?: (product: Product) => void;
  onNavigate: (page: PageId) => void;
  onOpenSignup: (defaultRole?: 'affiliate' | 'seller') => void;
}

export const MarketplacePage: React.FC<MarketplacePageProps> = ({
  onOpenProductModal,
  onOpenProductDetail,
  onNavigate,
  onOpenSignup
}) => {
  const [searchParams] = useSearchParams();
  const { products, recordView, recordClick, showToast } = useProducts();
  const { user, role } = useAuth();
  const { adminProducts, recordOutboundClick } = useHybridAffiliate();

  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState<string>(
    () => searchParams.get('category') || 'all'
  );
  const [sortBy, setSortBy] = useState<
    'popular' | 'newest' | 'views' | 'price-low' | 'price-high' | 'commission'
  >('popular');
  const [promotingProduct, setPromotingProduct] = useState<Product | null>(null);

  useEffect(() => {
    const q = searchParams.get('q');
    const cat = searchParams.get('category');
    if (q !== null) setSearchQuery(q);
    if (cat !== null) setSelectedCategory(cat);
  }, [searchParams]);

  // Combine approved Marketplace Seller products + Admin-published network products (all real DB records)
  const allMarketplaceProducts = useMemo(() => {
    const adminMapped: Product[] = adminProducts
      .filter((ap) => ap.status === 'published')
      .map((ap) => ({
        id: ap.id,
        title: ap.title,
        sellerName: ap.networkName,
        sellerVerified: true,
        category: ap.category,
        categoryLabel: ap.networkName,
        price: ap.price,
        originalPrice: ap.price,
        commissionRate: ap.commissionRate || 10,
        rating: 0,
        reviewsCount: 0,
        salesCount: 0,
        views: 0,
        clicks: ap.clicksCount || 0,
        originalUrl: ap.affiliateProductUrl,
        affiliateUrl: ap.affiliateProductUrl,
        merchantName: ap.networkName,
        networkName: ap.networkName,
        networkId: ap.networkId,
        image: ap.imageUrl,
        description: ap.description,
        features: ['Verified product listing', 'Direct merchant checkout'],
        fileFormat: `${ap.networkName} Order`,
        isAdminProduct: true,
        isExternalAffiliate: true,
        approvalStatus: 'approved',
        status: 'published',
        createdAt: ap.createdAt
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
    return allMarketplaceProducts
      .filter((prod) => {
        const matchesSearch =
          prod.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          prod.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          prod.sellerName.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesCategory =
          selectedCategory === 'all' || prod.category === selectedCategory;

        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        if (sortBy === 'price-low') return a.price - b.price;
        if (sortBy === 'price-high') return b.price - a.price;
        if (sortBy === 'commission') return b.commissionRate - a.commissionRate;
        if (sortBy === 'views') return (b.views || 0) - (a.views || 0);
        if (sortBy === 'newest') {
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        }
        return (b.salesCount || 0) + (b.clicks || 0) - ((a.salesCount || 0) + (a.clicks || 0));
      });
  }, [allMarketplaceProducts, searchQuery, selectedCategory, sortBy]);

  const handleOpenDetails = (prod: Product) => {
    recordView(prod.id);
    if (onOpenProductDetail) {
      onOpenProductDetail(prod);
    } else {
      onOpenProductModal(prod);
    }
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
      } catch {
        // fallback below
      }
    }

    handleOpenDetails(prod);
  };

  const handlePromoteClick = (e: React.MouseEvent, prod: Product) => {
    e.stopPropagation();
    if (!user) {
      showToast('Create a 100% Free Affiliate account to generate tracking links.', 'info');
      onOpenSignup('affiliate');
      return;
    }
    if (role === 'seller') {
      showToast('Please sign in with an Affiliate account to promote marketplace products.', 'info');
      return;
    }
    setPromotingProduct(prod);
  };

  return (
    <div className="min-h-screen bg-[#0d0725] text-slate-100 py-10 px-4 sm:px-6 lg:px-8 space-y-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Banner */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-purple-900 via-rose-950 to-indigo-950 p-8 sm:p-12 border border-purple-800/50 shadow-2xl">
          <div className="max-w-3xl space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/20 text-pink-300 text-xs font-bold uppercase tracking-wider">
                ClickBarry Affiliate Marketplace
              </span>
              <span className="inline-flex items-center text-[11px] bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full font-bold">
                Admin-Approved Digital Products
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
              Discover High-Converting Digital Products
            </h1>
            <p className="text-slate-300 text-base sm:text-lg">
              Browse verified digital products with real affiliate commission rates. Generate instant tracking links as an Affiliate or inspect product details.
            </p>
          </div>
        </div>

        {/* Search, Filter & Controls */}
        <div className="bg-[#140c33] rounded-2xl p-4 sm:p-6 border border-purple-900/60 shadow-lg space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search products, sellers, categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-14 py-2.5 rounded-xl bg-[#1d1245] border border-purple-800 text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:border-pink-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

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
                  <option value="newest">Newest Listed</option>
                  <option value="views">Most Viewed</option>
                  <option value="commission">Highest Commission %</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
              </div>
            </div>
          </div>

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
              Showing {filteredProducts.length} approved digital products
            </span>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="bg-[#140b33] rounded-3xl p-12 text-center border border-purple-900/40 space-y-4">
              <ShoppingBag className="w-10 h-10 text-pink-400 mx-auto" />
              <div className="space-y-1">
                <p className="text-white text-lg font-bold">
                  {allMarketplaceProducts.length === 0
                    ? 'No approved marketplace products yet'
                    : 'No products found matching your search'}
                </p>
                <p className="text-slate-400 text-xs max-w-md mx-auto">
                  {allMarketplaceProducts.length === 0
                    ? 'Once Sellers submit products and the platform approves them, they appear right here for Affiliates to promote.'
                    : 'Try clearing your search or switching category filters.'}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {(searchQuery || selectedCategory !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                    }}
                    className="px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold cursor-pointer"
                  >
                    Reset All Filters
                  </button>
                )}
                <button
                  onClick={() => onNavigate('seller')}
                  className="px-5 py-2.5 rounded-xl bg-[#241654] hover:bg-[#2f1d6e] text-white text-xs font-bold cursor-pointer"
                >
                  Become a Seller
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((prod) => (
                <div
                  key={prod.id}
                  onClick={() => handleOpenDetails(prod)}
                  className="bg-[#140b33] rounded-2xl overflow-hidden border border-purple-900/50 hover:border-pink-500/70 shadow-lg hover:shadow-2xl transition-all cursor-pointer group flex flex-col"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-slate-900">
                    <img
                      src={prod.image}
                      alt={prod.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded text-xs font-semibold text-pink-300">
                      {prod.categoryLabel}
                    </div>
                    <div className="absolute top-3 right-3 bg-emerald-500/95 text-slate-950 px-2.5 py-0.5 rounded text-xs font-extrabold shadow-md">
                      Earn {prod.commissionRate}%
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="truncate">{prod.merchantName || prod.sellerName}</span>
                          {prod.sellerVerified && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          )}
                        </div>
                        <span className="text-[11px] text-emerald-400 font-semibold shrink-0">
                          ₹{Math.round(prod.price * (prod.commissionRate / 100))}/sale
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
                          <span className="text-2xl font-black text-white">₹{prod.price}</span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3 text-blue-400" />
                            <span>{prod.views || 0}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <MousePointerClick className="w-3 h-3 text-pink-400" />
                            <span>{prod.clicks || 0}</span>
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetails(prod);
                          }}
                          className="py-2 rounded-lg bg-[#201449] hover:bg-[#2c1c66] text-slate-100 font-bold text-xs border border-purple-800 flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <span>Details</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>

                        <button
                          onClick={(e) => handlePromoteClick(e, prod)}
                          className="py-2 rounded-lg bg-pink-600/20 hover:bg-pink-600/40 text-pink-300 hover:text-white font-bold text-xs border border-pink-500/50 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Link2 className="w-3 h-3 text-pink-400" />
                          <span>Promote</span>
                        </button>

                        <button
                          onClick={(e) => handleShopNow(e, prod)}
                          className="py-2 rounded-lg bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold text-xs shadow-md shadow-pink-600/30 transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Visit</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <PromoteProductModal
          product={promotingProduct}
          isOpen={Boolean(promotingProduct)}
          onClose={() => setPromotingProduct(null)}
          onNavigateToDashboard={() => onNavigate('affiliate-dashboard')}
        />

        {/* Dual Role Onboarding Banner */}
        <div className="rounded-3xl bg-gradient-to-r from-pink-900/40 via-purple-900/40 to-indigo-900/40 border border-pink-500/30 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-xl sm:text-2xl font-bold text-white">
              Promote Products for Free or Sell Your Own Digital Assets
            </h3>
            <p className="text-sm text-slate-300 max-w-xl">
              Affiliates join completely free and start generating tracking links immediately. Creators can register as a Seller to submit products for approval.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigate('affiliate')}
              className="px-5 py-3 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <TrendingUp className="w-4 h-4" />
              <span>Join as Affiliate (Free)</span>
            </button>
            <button
              onClick={() => onNavigate('seller')}
              className="px-5 py-3 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold text-xs shadow-lg shadow-pink-600/30 flex items-center gap-2 cursor-pointer"
            >
              <Rocket className="w-4 h-4" />
              <span>Become a Seller</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
