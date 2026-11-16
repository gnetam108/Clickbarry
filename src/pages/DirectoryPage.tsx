import React, { useState, useMemo } from 'react';
import { PageId, Product } from '../types';
import { SAMPLE_SELLERS } from '../data/mockData';
import { useProducts } from '../context/ProductContext';
import {
  Search,
  CheckCircle2,
  Star,
  Package,
  ArrowRight,
  Store,
  ExternalLink,
  ShieldCheck,
  Tag,
  Building2,
  Sparkles
} from 'lucide-react';

interface DirectoryPageProps {
  onNavigate: (page: PageId) => void;
  onOpenProductModal: (product: Product) => void;
  onOpenSignup: () => void;
}

export const DirectoryPage: React.FC<DirectoryPageProps> = ({
  onNavigate,
  onOpenProductModal,
  onOpenSignup
}) => {
  const { products, recordView, recordClick } = useProducts();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'products' | 'merchants'>('products');
  const [selectedMerchant, setSelectedMerchant] = useState<string>('all');

  // Extract unique merchants from live products and sample data
  const merchants = useMemo(() => {
    const list = new Set<string>();
    products.forEach((p) => {
      if (p.merchantName) list.add(p.merchantName);
      else if (p.sellerName) list.add(p.sellerName);
    });
    // Add popular affiliate platforms
    ['Notion', 'Gumroad', 'Amazon', 'Coursera', 'Webflow'].forEach((m) => list.add(m));
    return ['all', ...Array.from(list)];
  }, [products]);

  // Filter products by search and merchant
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

  const filteredSellers = SAMPLE_SELLERS.filter((seller) => {
    return (
      seller.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      seller.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      seller.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      seller.bio.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

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
        // fallback
      }
    }
    recordView(prod.id);
    onOpenProductModal(prod);
  };

  return (
    <div className="min-h-screen bg-[#0d0724] text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-pink-500/20 text-pink-300 text-xs font-bold uppercase tracking-wider">
            🍓 Affiliate Discovery &amp; Brand Directory
          </span>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white">
            Discover Top Digital Brands &amp; Affiliate Tools
          </h1>
          <p className="text-slate-300 text-base sm:text-lg">
            Browse verified digital assets, creator tools, productivity kits, and software listed with affiliate tracking links.
          </p>

          {/* Search bar */}
          <div className="max-w-md mx-auto pt-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search products, brands, or affiliate tools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-full bg-[#180f3c] border border-purple-800 text-slate-100 text-sm focus:outline-none focus:border-pink-500 shadow-lg"
              />
            </div>
          </div>
        </div>

        {/* Affiliate Disclosure Banner */}
        <div className="bg-[#150a32] rounded-2xl p-4 border border-purple-800/70 flex items-start gap-3 shadow-lg max-w-4xl mx-auto">
          <span className="text-lg">ℹ️</span>
          <div className="space-y-0.5">
            <span className="font-bold text-xs text-pink-300 uppercase tracking-wide">Affiliate Disclosure</span>
            <p className="text-xs text-slate-300 leading-relaxed">
              Some links in this directory are affiliate links. ClickBarry and our registered affiliate partners may receive an affiliate commission if you purchase products through these links, at zero additional cost to you.
            </p>
          </div>
        </div>

        {/* Toggle between Affiliate Product Discovery & Brand Directory */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setActiveTab('products')}
            className={`px-6 py-2.5 rounded-full font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'products'
                ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-600/30'
                : 'bg-[#180f3c] text-slate-300 hover:text-white border border-purple-800'
            }`}
          >
            ⚡ Affiliate Products ({filteredProducts.length})
          </button>
          <button
            onClick={() => setActiveTab('merchants')}
            className={`px-6 py-2.5 rounded-full font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'merchants'
                ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-600/30'
                : 'bg-[#180f3c] text-slate-300 hover:text-white border border-purple-800'
            }`}
          >
            🏢 Creator Brands &amp; Studios ({filteredSellers.length})
          </button>
        </div>

        {/* TAB 1: Affiliate Products Grid */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            {/* Merchant filter chips */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs text-slate-400 font-semibold mr-1">Filter by Merchant:</span>
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
                  {m === 'all' ? 'All Merchants' : m}
                </button>
              ))}
            </div>

            {/* Products grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((prod) => (
                <div
                  key={prod.id}
                  onClick={() => {
                    recordView(prod.id);
                    onOpenProductModal(prod);
                  }}
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
                    <div className="absolute top-3 right-3 bg-pink-600 text-white px-2 py-0.5 rounded text-xs font-bold shadow-md">
                      {prod.merchantName || 'Verified Merchant'}
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                        <span className="font-semibold text-slate-300">{prod.sellerName}</span>
                        <span className="text-emerald-400 font-bold">{prod.commissionRate}% Commission</span>
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
                        <span className="text-2xl font-black text-white">₹{prod.price}</span>
                        <span className="text-xs text-pink-300 bg-pink-950/70 border border-pink-800/80 px-2 py-0.5 rounded-full font-mono">
                          Affiliate Link
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={(e) => handleShopNow(e, prod)}
                          className="py-2.5 rounded-lg bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold text-xs shadow-md shadow-pink-600/30 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Shop Now</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            recordView(prod.id);
                            onOpenProductModal(prod);
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
          </div>
        )}

        {/* TAB 2: Brand & Studios Directory */}
        {activeTab === 'merchants' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredSellers.map((seller) => (
              <div
                key={seller.id}
                className="bg-[#140b33] rounded-3xl p-6 sm:p-8 border border-purple-900/60 hover:border-pink-500/60 shadow-xl transition-all flex flex-col justify-between space-y-6"
              >
                <div className="flex items-start gap-4">
                  <img
                    src={seller.avatar}
                    alt={seller.name}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-pink-500/60 shrink-0 shadow-md"
                    referrerPolicy="no-referrer"
                  />

                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-white tracking-tight">
                        {seller.brand}
                      </h3>
                      {seller.verified && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          Verified
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-pink-300 font-semibold">
                      {seller.category}
                    </p>

                    <div className="flex items-center gap-3 pt-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1 text-amber-400 font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        {seller.rating}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Package className="w-3.5 h-3.5 text-purple-400" />
                        {seller.totalProducts} Digital Products
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-slate-300 text-sm leading-relaxed">
                  {seller.bio}
                </p>

                <div className="rounded-xl bg-[#1c1143] p-3.5 border border-purple-800/50 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                      Bestselling Asset
                    </span>
                    <span className="text-white font-semibold line-clamp-1">
                      {seller.featuredProduct}
                    </span>
                  </div>
                  <button
                    onClick={() => onNavigate('marketplace')}
                    className="text-pink-400 font-bold hover:text-pink-300 shrink-0 ml-3 flex items-center gap-1"
                  >
                    <span>Explore</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-purple-900/50">
                  <span className="text-xs text-slate-400">
                    Partner since {seller.joinedYear}
                  </span>

                  <button
                    onClick={() => onNavigate('marketplace')}
                    className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Store className="w-3.5 h-3.5" />
                    <span>View Brand Products</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Join Directory CTA */}
        <div className="rounded-3xl bg-gradient-to-r from-purple-950 via-pink-950 to-indigo-950 border border-pink-500/30 p-8 sm:p-10 text-center space-y-4">
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Want to submit affiliate products to the ClickBarry Directory?
          </h2>
          <p className="text-slate-300 text-sm max-w-xl mx-auto">
            Join as a ClickBarry affiliate marketer, submit products from top merchants with your personal tracking links, and earn commissions on every sale.
          </p>
          <button
            onClick={() => onNavigate('dashboard')}
            className="px-8 py-3 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold text-sm shadow-xl shadow-pink-600/40 cursor-pointer"
          >
            Open Affiliate Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
