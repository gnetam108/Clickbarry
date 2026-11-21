import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageId, Product } from '../types';
import { TESTIMONIALS } from '../data/mockData';
import { useProducts } from '../context/ProductContext';
import { useAuth } from '../context/AuthContext';
import { GoldSealBadge } from '../components/GoldSealBadge';
import heroImage from '../assets/images/hero_strawberries_1794019708249.jpg';
import sellerLaptopImage from '../assets/images/seller_dashboard_laptop_1794019709659.jpg';
import affiliateCoinsImage from '../assets/images/affiliate_coins_chart_1794019709558.jpg';
import securityShieldImage from '../assets/images/gold_security_shield_1794019711572.jpg';
import rajeshAvatar from '../assets/images/seller_rajesh_avatar_1794019709871.jpg';
import {
  ArrowRight,
  UserPlus,
  CreditCard,
  Package,
  TrendingUp,
  Star,
  RefreshCw,
  Shield,
  Sparkles,
  ShoppingBag,
  Check,
  ChevronRight,
  Search,
  CheckCircle2,
  Eye,
  Rocket,
  Lock
} from 'lucide-react';

interface HomePageProps {
  onNavigate: (page: PageId) => void;
  onOpenProductModal: (product: Product) => void;
  onOpenProductDetail?: (product: Product) => void;
  onOpenSignup: (defaultRole?: 'affiliate' | 'seller') => void;
  onOpenLogin: () => void;
}

const QUICK_CATEGORIES = [
  { id: 'all', label: 'All Categories' },
  { id: 'templates', label: 'Notion & Templates' },
  { id: 'software', label: 'Software & Code' },
  { id: 'graphics', label: 'Canva & Graphics' },
  { id: 'ebooks', label: 'E-Books & Guides' },
  { id: 'courses', label: 'Video Courses' }
];

export const HomePage: React.FC<HomePageProps> = ({
  onNavigate,
  onOpenProductModal,
  onOpenProductDetail,
  onOpenSignup,
  onOpenLogin
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { products, recordView } = useProducts();
  const [activeTestimonialIndex, setActiveTestimonialIndex] = useState(0);
  const [heroSearchQuery, setHeroSearchQuery] = useState('');
  const [selectedPreviewCat, setSelectedPreviewCat] = useState('all');

  const currentTestimonial = TESTIMONIALS[activeTestimonialIndex];

  const previewProducts = useMemo(() => {
    return products
      .filter((p) => selectedPreviewCat === 'all' || p.category === selectedPreviewCat)
      .slice(0, 6);
  }, [products, selectedPreviewCat]);

  const handleMarketplaceSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (heroSearchQuery.trim()) params.set('q', heroSearchQuery.trim());
    if (selectedPreviewCat !== 'all') params.set('category', selectedPreviewCat);
    const qs = params.toString();
    navigate(qs ? `/marketplace?${qs}` : '/marketplace');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewProduct = (prod: Product) => {
    recordView(prod.id);
    if (onOpenProductDetail) {
      onOpenProductDetail(prod);
    } else {
      onOpenProductModal(prod);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0722] text-slate-100 flex flex-col">
      {/* ---------------------------------------------------- */}
      {/* 1. HERO SECTION */}
      {/* ---------------------------------------------------- */}
      <section className="relative hero-space-bg pt-8 pb-14 lg:pt-14 lg:pb-20 overflow-hidden border-b border-purple-900/30">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-pink-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-72 h-72 bg-purple-700/25 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-6 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-6 space-y-6 text-left">
              <div className="space-y-1">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
                  Discover Products
                </h1>
                <div className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] flex items-baseline gap-3">
                  <span className="text-white">You&apos;ll</span>
                  <span className="relative inline-block font-display italic font-black bg-gradient-to-r from-pink-400 via-rose-500 to-pink-500 bg-clip-text text-transparent drop-shadow-[0_4px_20px_rgba(255,27,107,0.6)]">
                    Love
                    <span className="absolute -bottom-1.5 left-0 w-full h-1.5 bg-gradient-to-r from-pink-500 to-rose-400 rounded-full opacity-80" />
                  </span>
                </div>
              </div>

              <p className="text-base sm:text-lg text-slate-200/90 font-medium max-w-xl leading-relaxed">
                ClickBarry connects digital product creators with affiliate marketers in one transparent marketplace. Promote verified products for free or list your catalog.
              </p>

              <div className="space-y-2.5 pt-1">
                {[
                  'Search & Discover Verified Digital Products',
                  '100% Free Affiliate Registration & Instant Tracking Links',
                  'Transparent Commission Rates & Real Click Analytics',
                  'Dedicated Dashboards for Affiliates & Creators'
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/50">
                      <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />
                    </div>
                    <span className="text-sm sm:text-base text-slate-100 font-semibold tracking-wide">
                      {item}
                    </span>
                  </div>
                ))}
              </div>

              {/* Primary CTAs */}
              <div className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {user ? (
                  <button
                    onClick={() => onNavigate('marketplace')}
                    className="px-7 py-3.5 rounded-full bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold text-sm sm:text-base shadow-xl shadow-pink-600/40 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Explore Marketplace</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={onOpenLogin}
                    className="px-7 py-3.5 rounded-full bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold text-sm sm:text-base shadow-xl shadow-pink-600/40 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Sign In to Access Marketplace</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={() => onNavigate('affiliate')}
                  className="px-6 py-3.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>Become an Affiliate (Free)</span>
                </button>

                <button
                  onClick={() => onNavigate('seller')}
                  className="px-5 py-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-sm border border-purple-400/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Rocket className="w-4 h-4 text-pink-400" />
                  <span>Become a Seller</span>
                </button>
              </div>
            </div>

            {/* Right Artwork Column */}
            <div className="lg:col-span-6 relative flex justify-center items-center mt-6 lg:mt-0">
              <div className="relative w-full max-w-lg aspect-square flex items-center justify-center">
                <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-2xl border border-pink-500/20 group">
                  <img
                    src={heroImage}
                    alt="ClickBarry Digital Affiliate Marketplace"
                    className="w-full h-full object-cover object-center transform transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0c0722]/80 via-transparent to-transparent pointer-events-none" />
                </div>

                <div className="absolute -bottom-4 sm:bottom-0 right-0 sm:right-2 z-20">
                  <GoldSealBadge onClick={() => onNavigate('guarantee')} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 2. AUTH-GATED MARKETPLACE DISCOVERY SECTION */}
      {/* ---------------------------------------------------- */}
      {user ? (
      <section className="bg-[#0f0927] text-white py-14 lg:py-18 border-b border-purple-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <span className="text-pink-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> ClickBarry Affiliate Marketplace
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-1 text-white">
                Explore &amp; Promote Verified Digital Products
              </h2>
              <p className="text-sm text-slate-300 mt-1 max-w-2xl">
                Browse admin-approved creator listings with transparent commission rates. Pick any offer, generate your unique affiliate link, and earn on verified sales.
              </p>
            </div>

            <button
              onClick={() => onNavigate('marketplace')}
              className="px-5 py-2.5 rounded-full bg-[#201442] hover:bg-pink-600 text-white font-semibold text-sm border border-purple-800 transition-all flex items-center gap-2 self-start cursor-pointer shrink-0"
            >
              <span>Open Full Marketplace</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Search Bar & Category Pills */}
          <div className="bg-[#150d36] rounded-2xl p-4 sm:p-5 border border-purple-900/60 space-y-4">
            <form onSubmit={handleMarketplaceSearch} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={heroSearchQuery}
                  onChange={(e) => setHeroSearchQuery(e.target.value)}
                  placeholder="Search Marketplace products, software, templates, e-books..."
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-[#1e1348] border border-purple-800 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-pink-500"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold text-sm shadow-lg shadow-pink-600/25 cursor-pointer shrink-0"
              >
                Search Marketplace
              </button>
            </form>

            <div className="flex flex-wrap items-center gap-2">
              {QUICK_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedPreviewCat(cat.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    selectedPreviewCat === cat.id
                      ? 'bg-pink-600 text-white shadow'
                      : 'bg-[#1f134a] text-slate-300 hover:text-white hover:bg-[#2a1a63]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Marketplace Product Grid */}
          {previewProducts.length === 0 ? (
            <div className="bg-[#150d36] rounded-3xl p-10 text-center border border-purple-900/50 space-y-4">
              <ShoppingBag className="w-10 h-10 text-pink-400 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">No Approved Products Listed Yet</h3>
                <p className="text-sm text-slate-400 max-w-md mx-auto">
                  {selectedPreviewCat === 'all'
                    ? 'The ClickBarry Marketplace is live and ready for creator listings. Sellers can submit digital products for approval, and Affiliates can join free.'
                    : 'No approved products found in this category yet.'}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                {selectedPreviewCat !== 'all' && (
                  <button
                    onClick={() => setSelectedPreviewCat('all')}
                    className="px-5 py-2.5 rounded-full bg-[#241654] hover:bg-[#2e1c6b] text-white text-xs font-bold cursor-pointer"
                  >
                    Show All Categories
                  </button>
                )}
                <button
                  onClick={() => onNavigate('seller')}
                  className="px-5 py-2.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 text-white text-xs font-bold cursor-pointer"
                >
                  List Your Product as a Seller
                </button>
                <button
                  onClick={() => onNavigate('affiliate')}
                  className="px-5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
                >
                  Join Free as Affiliate
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {previewProducts.map((prod) => (
                <div
                  key={prod.id}
                  onClick={() => handleViewProduct(prod)}
                  className="bg-[#170e3a] rounded-2xl overflow-hidden border border-purple-900/60 hover:border-pink-500/70 shadow-lg hover:shadow-2xl transition-all cursor-pointer group flex flex-col"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-slate-900">
                    <img
                      src={prod.image}
                      alt={prod.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-md text-xs font-bold text-pink-300">
                      {prod.categoryLabel}
                    </div>
                    <div className="absolute top-3 right-3 bg-emerald-500/95 text-slate-950 px-2.5 py-1 rounded-md text-xs font-extrabold">
                      {prod.commissionRate}% Commission
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="truncate flex items-center gap-1">
                          <span>By {prod.sellerName}</span>
                          {prod.sellerVerified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] shrink-0">
                          <Eye className="w-3 h-3 text-blue-400" /> {prod.views || 0}
                        </span>
                      </div>

                      <h3 className="font-bold text-lg text-white group-hover:text-pink-400 transition-colors line-clamp-1">
                        {prod.title}
                      </h3>

                      <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed">
                        {prod.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-purple-900/40">
                      <div>
                        <span className="text-2xl font-black text-white">₹{prod.price}</span>
                        <span className="block text-[11px] text-emerald-400 font-semibold">
                          Earn ₹{Math.round(prod.price * (prod.commissionRate / 100))}/sale
                        </span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewProduct(prod);
                        }}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold text-xs shadow-md shadow-pink-600/30 flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>View Details</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      ) : (
        <section className="bg-[#0f0927] text-white py-14 border-b border-purple-900/40">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl bg-gradient-to-br from-[#180f3d] via-[#130b30] to-[#1a0d3f] border border-purple-800/80 p-8 sm:p-10 text-center space-y-5 shadow-2xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-pink-500/20 text-pink-300 text-xs font-bold uppercase tracking-wider border border-pink-500/30">
                <Lock className="w-3.5 h-3.5" />
                <span>Members-Only Affiliate Marketplace</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Sign In to Browse &amp; Promote Verified Digital Products
              </h2>
              <p className="text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed">
                To protect creator listings and affiliate commission data, the ClickBarry Marketplace catalog is exclusively available to signed-in Affiliates and Sellers. Affiliates join <strong>100% free</strong> with Email or Google.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => onOpenSignup('affiliate')}
                  className="w-full sm:w-auto px-7 py-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-sm shadow-lg cursor-pointer"
                >
                  Create Free Affiliate Account
                </button>
                <button
                  onClick={onOpenLogin}
                  className="w-full sm:w-auto px-7 py-3 rounded-full bg-pink-600 hover:bg-pink-700 text-white font-bold text-sm shadow-lg cursor-pointer"
                >
                  Login to Unlock Marketplace
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ---------------------------------------------------- */}
      {/* 3. HOW IT WORKS – 4 STEPS */}
      {/* ---------------------------------------------------- */}
      <section className="bg-slate-50 text-slate-900 py-16 lg:py-20 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="flex items-center justify-center gap-4">
              <span className="h-[2px] w-12 sm:w-20 bg-gradient-to-r from-transparent to-pink-500 rounded" />
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
                How It Works?
              </h2>
              <span className="h-[2px] w-12 sm:w-20 bg-gradient-to-l from-transparent to-pink-500 rounded" />
            </div>
            <p className="mt-2 text-base sm:text-lg font-semibold text-indigo-900">
              Simple Steps for Affiliates &amp; Creators
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            <div className="relative bg-white rounded-2xl p-6 border border-purple-100 shadow-md hover:shadow-xl transition-all group flex flex-col items-center text-center">
              <div className="absolute -top-4 w-9 h-9 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold text-base flex items-center justify-center shadow-md">
                1
              </div>
              <div className="mt-4 w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <UserPlus className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Choose Your Role</h3>
              <p className="text-sm text-slate-600">
                Join 100% free as an Affiliate Marketer or register as a Digital Product Seller.
              </p>
            </div>

            <div className="relative bg-white rounded-2xl p-6 border border-purple-100 shadow-md hover:shadow-xl transition-all group flex flex-col items-center text-center">
              <div className="absolute -top-4 w-9 h-9 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold text-base flex items-center justify-center shadow-md">
                2
              </div>
              <div className="mt-4 w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <CreditCard className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Affiliates Free • Sellers ₹999</h3>
              <p className="text-sm text-slate-600">
                Affiliates never pay a rupee. Sellers unlock lifetime catalog access for ₹999 once.
              </p>
            </div>

            <div className="relative bg-white rounded-2xl p-6 border border-purple-100 shadow-md hover:shadow-xl transition-all group flex flex-col items-center text-center">
              <div className="absolute -top-4 w-9 h-9 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold text-base flex items-center justify-center shadow-md">
                3
              </div>
              <div className="mt-4 w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Package className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">List or Promote Offers</h3>
              <p className="text-sm text-slate-600">
                Approved Seller products go live in Marketplace for instant Affiliate promotion links.
              </p>
            </div>

            <div className="relative bg-white rounded-2xl p-6 border border-purple-100 shadow-md hover:shadow-xl transition-all group flex flex-col items-center text-center">
              <div className="absolute -top-4 w-9 h-9 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold text-base flex items-center justify-center shadow-md">
                4
              </div>
              <div className="mt-4 w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Track &amp; Grow Revenue</h3>
              <p className="text-sm text-slate-600">
                Monitor real clicks, verified sales, commissions, and UPI/Bank payouts transparently.
              </p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <button
              onClick={() => onNavigate('how-it-works')}
              className="inline-flex items-center gap-2 text-sm font-bold text-pink-600 hover:text-pink-700 cursor-pointer"
            >
              <span>Learn about full seller &amp; affiliate roadmap</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 4. BENEFITS & PROMISE TRIO */}
      {/* ---------------------------------------------------- */}
      <section className="bg-slate-100 text-slate-900 py-16 lg:py-20 border-b border-slate-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Seller Benefits */}
            <div className="rounded-2xl overflow-hidden bg-white shadow-lg border border-pink-100 flex flex-col transition-transform hover:-translate-y-1">
              <div className="bg-gradient-to-r from-rose-500 to-pink-600 px-6 py-4 flex items-center gap-3 text-white">
                <Star className="w-6 h-6 fill-amber-300 text-amber-300 shrink-0" />
                <h3 className="text-xl font-bold tracking-tight">Seller Benefits</h3>
              </div>

              <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
                <ul className="space-y-3">
                  {[
                    'Dedicated Seller dashboard',
                    'List unlimited digital products',
                    'Affiliate promotional reach',
                    'Track views, clicks & sales'
                  ].map((feat, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-sm font-semibold text-slate-800">
                      <div className="w-4 h-4 rounded-full bg-pink-500 text-white flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                <div className="pt-2 flex justify-center">
                  <div className="w-full max-w-[240px] aspect-[4/3] rounded-xl overflow-hidden shadow-inner bg-slate-50 p-2 flex items-center justify-center">
                    <img
                      src={sellerLaptopImage}
                      alt="Seller Dashboard on Laptop"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>

                <button
                  onClick={() => onNavigate('seller')}
                  className="w-full py-2.5 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-700 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Open Seller Portal
                </button>
              </div>
            </div>

            {/* Affiliate Benefits */}
            <div className="rounded-2xl overflow-hidden bg-white shadow-lg border border-purple-100 flex flex-col transition-transform hover:-translate-y-1">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center gap-3 text-white">
                <TrendingUp className="w-6 h-6 text-amber-300 shrink-0" />
                <h3 className="text-xl font-bold tracking-tight">Affiliate Benefits</h3>
              </div>

              <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
                <ul className="space-y-3">
                  {[
                    '100% Free registration forever',
                    'Promote verified digital products',
                    'Unique tracking links & SubIDs',
                    'Withdraw earnings via UPI / Bank'
                  ].map((feat, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-sm font-semibold text-slate-800">
                      <div className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                <div className="pt-2 flex justify-center">
                  <div className="w-full max-w-[240px] aspect-[4/3] rounded-xl overflow-hidden shadow-inner bg-slate-50 p-2 flex items-center justify-center">
                    <img
                      src={affiliateCoinsImage}
                      alt="Affiliate Commission Growth"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>

                <button
                  onClick={() => onNavigate('affiliate')}
                  className="w-full py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Join Free as Affiliate
                </button>
              </div>
            </div>

            {/* Our Promise */}
            <div className="rounded-2xl overflow-hidden bg-white shadow-lg border border-emerald-100 flex flex-col transition-transform hover:-translate-y-1">
              <div className="bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-4 flex items-center gap-3 text-white">
                <Shield className="w-6 h-6 fill-white/20 text-white shrink-0" />
                <h3 className="text-xl font-bold tracking-tight">Our Promise</h3>
              </div>

              <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
                <ul className="space-y-3">
                  {[
                    'Admin-moderated product catalog',
                    'Role-isolated security rules',
                    'Transparent commission ledger',
                    'Your Success, Our Priority'
                  ].map((feat, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-sm font-semibold text-slate-800">
                      <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                <div className="pt-2 flex justify-center">
                  <div className="w-full max-w-[240px] aspect-[4/3] rounded-xl overflow-hidden shadow-inner bg-slate-50 p-2 flex items-center justify-center">
                    <img
                      src={securityShieldImage}
                      alt="ClickBarry Security Guarantee Shield"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>

                <button
                  onClick={() => onNavigate('guarantee')}
                  className="w-full py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  View 100% Guarantee Terms
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 5. REFUND POLICY & TESTIMONIAL ROW */}
      {/* ---------------------------------------------------- */}
      <section className="bg-slate-50 text-slate-900 py-14 lg:py-16 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-purple-100 shadow-md flex items-start gap-5 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-1">
                <RefreshCw className="w-7 h-7" />
              </div>

              <div className="space-y-3 flex-1">
                <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  Refund Policy
                </h3>
                <p className="text-slate-700 text-sm sm:text-base leading-relaxed font-medium">
                  If you get less than 5 sales in 1 month, you can apply for a refund after 1 month from your seller pass purchase date.
                </p>
                <div>
                  <button
                    onClick={() => onNavigate('guarantee')}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-sm font-bold shadow-md shadow-pink-600/20 transition-all cursor-pointer"
                  >
                    <span>Learn More</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-purple-100 shadow-md flex flex-col sm:flex-row items-center sm:items-start gap-5 hover:shadow-lg transition-shadow">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-pink-500 shrink-0 shadow-md">
                <img
                  src={currentTestimonial.avatar || rajeshAvatar}
                  alt={currentTestimonial.name}
                  className="w-full h-full object-cover object-top"
                />
              </div>

              <div className="space-y-2 flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="text-amber-500 font-serif text-3xl font-bold leading-none">&ldquo;&ldquo;</span>
                  <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                    What Our Users Say
                  </h3>
                </div>

                <p className="text-slate-800 text-base sm:text-lg font-semibold italic leading-snug">
                  &ldquo;{currentTestimonial.content}&rdquo;
                </p>

                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-slate-100">
                  <span className="text-sm font-bold text-slate-700">
                    — {currentTestimonial.name}, {currentTestimonial.role}
                  </span>

                  <div className="flex items-center justify-center sm:justify-end gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </div>

                <div className="flex justify-center sm:justify-start gap-2 pt-2">
                  {TESTIMONIALS.map((t, idx) => (
                    <button
                      key={t.id}
                      onClick={() => setActiveTestimonialIndex(idx)}
                      className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${
                        idx === activeTestimonialIndex ? 'w-6 bg-pink-600' : 'bg-slate-300 hover:bg-slate-400'
                      }`}
                      aria-label={`View review from ${t.name}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 6. CONVERSION BANNER */}
      {/* ---------------------------------------------------- */}
      <section className="bg-gradient-to-r from-purple-900 via-rose-900 to-pink-900 text-white py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto rounded-3xl bg-black/30 backdrop-blur-md p-8 sm:p-12 border border-pink-500/30 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-pink-500/20 text-pink-300 text-xs font-bold uppercase tracking-wider">
            Start Today With Zero Recurring Monthly Fees
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Ready to Sell or Earn with ClickBarry?
          </h2>
          <p className="text-slate-200 text-base max-w-2xl mx-auto">
            Sign up 100% free as an affiliate to promote digital products and earn high commissions, or register as a creator to list your products in our marketplace.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              onClick={() => onNavigate('affiliate')}
              className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-extrabold text-base shadow-xl cursor-pointer"
            >
              Join as Affiliate (Free)
            </button>
            <button
              onClick={() => onOpenSignup('seller')}
              className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold text-base shadow-xl shadow-pink-600/30 cursor-pointer"
            >
              Register as Seller
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
