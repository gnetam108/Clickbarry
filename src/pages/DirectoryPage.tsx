import React, { useState, useMemo } from 'react';
import { PageId, Product } from '../types';
import { useProducts } from '../context/ProductContext';
import {
  Search,
  CheckCircle2,
  Package,
  ArrowRight,
  Store,
  ExternalLink,
  Eye
} from 'lucide-react';

interface DirectoryPageProps {
  onNavigate: (page: PageId) => void;
  onOpenProductModal: (product: Product) => void;
  onOpenProductDetail?: (product: Product) => void;
  onOpenSignup: (defaultRole?: 'affiliate' | 'seller') => void;
}

interface DerivedSellerBrand {
  id: string;
  name: string;
  verified: boolean;
  categories: string[];
  totalProducts: number;
  featuredProductTitle: string;
  totalViews: number;
}

export const DirectoryPage: React.FC<DirectoryPageProps> = ({
  onNavigate,
  onOpenProductModal,
  onOpenProductDetail
}) => {
  const { products, recordView, recordClick } = useProducts();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'products' | 'merchants'>('products');
  const [selectedMerchant, setSelectedMerchant] = useState<string>('all');

  // Derive merchants purely from real approved products
  const merchants = useMemo(() => {
    const list = new Set<string>();
    products.forEach((p) => {
      if (p.merchantName) list.add(p.merchantName);
      else if (p.sellerName) list.add(p.sellerName);
    });
    return ['all', ...Array.from(list)];
  }, [products]);

  // Derive verified brands/creators dynamically from real DB products
  const derivedBrands = useMemo<DerivedSellerBrand[]>(() => {
    const map = new Map<string, DerivedSellerBrand>();
    products.forEach((p) => {
      const key = p.sellerId || p.sellerName || p.merchantName || 'Seller';
      const displayName = p.merchantName || p.sellerName || 'Creator';
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          id: key,
          name: displayName,
          verified: Boolean(p.sellerVerified),
          categories: [p.categoryLabel],
          totalProducts: 1,
          featuredProductTitle: p.title,
          totalViews: p.views || 0
        });
      } else {
        existing.totalProducts += 1;
        existing.totalViews += p.views || 0;
        if (p.sellerVerified) existing.verified = true;
        if (!existing.categories.includes(p.categoryLabel)) {
          existing.categories.push(p.categoryLabel);
        }
      }
    });
    return Array.from(map.values());
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const matchSearch =
        prod.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prod.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (prod.merchantName && prod.merchantName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        prod.sellerName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchMerchant =
        selectedMerchant === 'all' ||
        (prod.merchantName && prod.merchantName.toLowerCase() === selectedMerchant.toLowerCase()) ||
        prod.sellerName.toLowerCase() === selectedMerchant.toLowerCase();

      return matchSearch && matchMerchant;
    });
  }, [products, searchQuery, selectedMerchant]);

  const filteredBrands = useMemo(() => {
    return derivedBrands.filter(
      (b) =>
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.categories.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase())) ||
        b.featuredProductTitle.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [derivedBrands, searchQuery]);

  const handleOpenProduct = (prod: Product) => {
    recordView(prod.id);
    if (onOpenProductDetail) {
      onOpenProductDetail(prod);
    } else {
      onOpenProductModal(prod);
    }
  };

  const handleShopNow = (e: React.MouseEvent, prod: Product) => {
    e.stopPropagation();
    recordClick(prod.id);

    let targetUrl = (prod.affiliateUrl || prod.originalUrl)?.trim();
    if (targetUrl) {
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
      }
      try {
        const parsed = new URL(targetUrl);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          window.open(targetUrl, '_blank', 'noopener,noreferrer');
          return;
        }
      } catch {
        // fallback below
      }
    }
    handleOpenProduct(prod);
  };

  return (
    <div className="min-h-screen bg-[#0d0724] text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-pink-500/20 text-pink-300 text-xs font-bold uppercase tracking-wider">
            ClickBarry Verified Brand Directory
          </span>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white">
            Creator Brands &amp; Affiliate Catalog
          </h1>
          <p className="text-slate-300 text-base sm:text-lg">
            Browse real creator studios and approved digital assets listed on the ClickBarry Marketplace.
          </p>

          <div className="max-w-md mx-auto pt-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search products or creator brands..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-full bg-[#180f3c] border border-purple-800 text-slate-100 text-sm focus:outline-none focus:border-pink-500 shadow-lg"
              />
            </div>
          </div>
        </div>

        {/* Toggle between Affiliate Products & Brands */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setActiveTab('products')}
            className={`px-6 py-2.5 rounded-full font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'products'
                ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-600/30'
                : 'bg-[#180f3c] text-slate-300 hover:text-white border border-purple-800'
            }`}
          >
            Approved Products ({filteredProducts.length})
          </button>
          <button
            onClick={() => setActiveTab('merchants')}
            className={`px-6 py-2.5 rounded-full font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'merchants'
                ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-600/30'
                : 'bg-[#180f3c] text-slate-300 hover:text-white border border-purple-800'
            }`}
          >
            Creator Brands ({filteredBrands.length})
          </button>
        </div>

        {/* TAB 1: Products */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            {merchants.length > 1 && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="text-xs text-slate-400 font-semibold mr-1">Filter by Creator:</span>
                {merchants.slice(0, 8).map((m) => (
                  <button
                    key={m}
                    onClick={() => setSelectedMerchant(m)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      selectedMerchant === m
                        ? 'bg-pink-600 text-white'
                        : 'bg-[#1a0f44] text-slate-300 hover:text-white hover:bg-[#251662]'
                    }`}
                  >
                    {m === 'all' ? 'All Creators' : m}
                  </button>
                ))}
              </div>
            )}

            {filteredProducts.length === 0 ? (
              <div className="bg-[#140b33] rounded-3xl p-12 text-center border border-purple-900/50 space-y-3">
                <Package className="w-10 h-10 text-pink-400 mx-auto" />
                <p className="text-base font-bold text-white">No Approved Products Listed Yet</p>
                <p className="text-xs text-slate-400">
                  Real creator listings appear here automatically as soon as they are approved.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((prod) => (
                  <div
                    key={prod.id}
                    onClick={() => handleOpenProduct(prod)}
                    className="bg-[#140b33] rounded-2xl overflow-hidden border border-purple-900/60 hover:border-pink-500/70 shadow-xl transition-all cursor-pointer group flex flex-col justify-between"
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
                      <div className="absolute top-3 right-3 bg-emerald-500 text-slate-950 px-2 py-0.5 rounded text-xs font-extrabold shadow-md">
                        {prod.commissionRate}% Comm.
                      </div>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                          <span className="font-semibold text-slate-300">{prod.sellerName}</span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3 text-blue-400" /> {prod.views || 0}
                          </span>
                        </div>
                        <h3 className="font-bold text-base text-white group-hover:text-pink-400 transition-colors line-clamp-2">
                          {prod.title}
                        </h3>
                        <p className="text-slate-400 text-xs mt-2 line-clamp-2">{prod.description}</p>
                      </div>

                      <div className="space-y-3 pt-3 border-t border-purple-900/40">
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-black text-white">₹{prod.price}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={(e) => handleShopNow(e, prod)}
                            className="py-2.5 rounded-lg bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold text-xs shadow-md shadow-pink-600/30 flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Visit Product</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenProduct(prod);
                            }}
                            className="py-2.5 rounded-lg bg-[#201449] hover:bg-[#2b1b63] text-pink-300 font-bold text-xs border border-purple-800 flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <span>Details</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Derived Creator Brands */}
        {activeTab === 'merchants' && (
          filteredBrands.length === 0 ? (
            <div className="bg-[#140b33] rounded-3xl p-12 text-center border border-purple-900/50 space-y-3">
              <Store className="w-10 h-10 text-pink-400 mx-auto" />
              <p className="text-base font-bold text-white">No Creator Brands Found Yet</p>
              <p className="text-xs text-slate-400">
                Brands are populated dynamically from approved ClickBarry Sellers.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredBrands.map((brand) => (
                <div
                  key={brand.id}
                  className="bg-[#140b33] rounded-3xl p-6 sm:p-8 border border-purple-900/60 hover:border-pink-500/60 shadow-xl transition-all flex flex-col justify-between space-y-5"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-purple-600 flex items-center justify-center text-white font-black text-xl shrink-0">
                      {brand.name[0]?.toUpperCase() || 'C'}
                    </div>

                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold text-white tracking-tight">{brand.name}</h3>
                        {brand.verified && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            Verified
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-pink-300 font-semibold">
                        {brand.categories.join(' • ')}
                      </p>

                      <div className="flex items-center gap-3 pt-1 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Package className="w-3.5 h-3.5 text-purple-400" />
                          {brand.totalProducts} Approved Product{brand.totalProducts === 1 ? '' : 's'}
                        </span>
                        <span>•</span>
                        <span>{brand.totalViews} total views</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-[#1c1143] p-3.5 border border-purple-800/50 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                        Featured Listing
                      </span>
                      <span className="text-white font-semibold line-clamp-1">
                        {brand.featuredProductTitle}
                      </span>
                    </div>
                    <button
                      onClick={() => onNavigate('marketplace')}
                      className="text-pink-400 font-bold hover:text-pink-300 shrink-0 ml-3 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Explore</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Join Directory CTA */}
        <div className="rounded-3xl bg-gradient-to-r from-purple-950 via-pink-950 to-indigo-950 border border-pink-500/30 p-8 sm:p-10 text-center space-y-4">
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Promote Digital Products &amp; Earn Commissions Free
          </h2>
          <p className="text-slate-300 text-sm max-w-xl mx-auto">
            Register free as a ClickBarry Affiliate to generate tracking links for any approved Marketplace listing.
          </p>
          <button
            onClick={() => onNavigate('affiliate')}
            className="px-8 py-3 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold text-sm shadow-xl shadow-pink-600/40 cursor-pointer"
          >
            Open Affiliate Portal
          </button>
        </div>
      </div>
    </div>
  );
};
