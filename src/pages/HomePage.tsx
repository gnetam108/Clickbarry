import React, { useState } from 'react';
import { PageId, Product } from '../types';
import { TESTIMONIALS } from '../data/mockData';
import { useProducts } from '../context/ProductContext';
import { GoldSealBadge } from '../components/GoldSealBadge';
import {
  CheckCircle,
  ArrowRight,
  UserPlus,
  CreditCard,
  Package,
  TrendingUp,
  Star,
  RefreshCw,
  Quote,
  Shield,
  Sparkles,
  ShoppingBag,
  Check,
  ChevronRight,
  HelpCircle
} from 'lucide-react';

interface HomePageProps {
  onNavigate: (page: PageId) => void;
  onOpenProductModal: (product: Product) => void;
  onOpenSignup: () => void;
  onOpenLogin: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onNavigate,
  onOpenProductModal,
  onOpenSignup,
  onOpenLogin
}) => {
  const { products, recordView, recordClick } = useProducts();
  const [activeTestimonialIndex, setActiveTestimonialIndex] = useState(0);

  const heroImage = '/src/assets/images/hero_strawberries_1794019708249.jpg';
  const sellerLaptopImage = '/src/assets/images/seller_dashboard_laptop_1794019709659.jpg';
  const affiliateCoinsImage = '/src/assets/images/affiliate_coins_chart_1794019709558.jpg';
  const securityShieldImage = '/src/assets/images/gold_security_shield_1794019711572.jpg';
  const rajeshAvatar = '/src/assets/images/seller_rajesh_avatar_1794019709871.jpg';

  const currentTestimonial = TESTIMONIALS[activeTestimonialIndex];

  return (
    <div className="min-h-screen bg-[#0c0722] text-slate-100 flex flex-col">
      {/* ---------------------------------------------------- */}
      {/* 1. HERO SECTION (Matching Reference Image Closely) */}
      {/* ---------------------------------------------------- */}
      <section className="relative hero-space-bg pt-8 pb-16 lg:pt-14 lg:pb-24 overflow-hidden border-b border-purple-900/30">
        {/* Ambient Glowing Orbs */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-pink-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-72 h-72 bg-purple-700/25 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-6 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-6 xl:col-span-6 space-y-6 text-left">
              {/* Main Headline */}
              <div className="space-y-1">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
                  Discover Products
                </h1>
                <div className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] flex items-baseline gap-3">
                  <span className="text-white">You'll</span>
                  <span className="relative inline-block font-display italic font-black bg-gradient-to-r from-pink-400 via-rose-500 to-pink-500 bg-clip-text text-transparent drop-shadow-[0_4px_20px_rgba(255,27,107,0.6)]">
                    Love
                    {/* Brush Stroke Effect Under Love */}
                    <span className="absolute -bottom-1.5 left-0 w-full h-1.5 bg-gradient-to-r from-pink-500 to-rose-400 rounded-full opacity-80" />
                  </span>
                </div>
              </div>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-slate-200/90 font-medium max-w-xl leading-relaxed">
                Explore products from sellers and stores in one convenient place.
              </p>

              {/* Green Trust Checkmark Bullets (from reference design) */}
              <div className="space-y-3 pt-1">
                {[
                  'Search & Discover Products',
                  'Connect with Trusted Sellers',
                  'Shop Directly from Original Stores',
                  'A Smarter Way to Find What You Need'
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

              {/* Call to Actions (from reference design) */}
              <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                {/* Primary Button: Explore Products -> */}
                <button
                  onClick={() => onNavigate('marketplace')}
                  className="px-8 py-3.5 rounded-full bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold text-base shadow-xl shadow-pink-600/40 hover:shadow-pink-600/60 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Explore Products</span>
                  <ArrowRight className="w-5 h-5" />
                </button>

                {/* Secondary Button Card: List Your Product (Get ₹999 Lifetime Access) */}
                <button
                  onClick={onOpenSignup}
                  className="px-6 py-2.5 rounded-full bg-white hover:bg-slate-100 text-slate-900 transition-all shadow-lg hover:shadow-xl flex items-center gap-3 border border-slate-200 cursor-pointer group text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                    <Check className="w-5 h-5 text-slate-950 stroke-[3]" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-950 leading-tight group-hover:text-pink-600 transition-colors">
                      List Your Product
                    </span>
                    <span className="text-xs font-semibold text-slate-600 leading-tight">
                      Get ₹999 Lifetime Access
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Right Artwork Column: Large Strawberry Splash + Golden Badge */}
            <div className="lg:col-span-6 xl:col-span-6 relative flex justify-center items-center mt-6 lg:mt-0">
              {/* Outer decorative fruit splash aura */}
              <div className="relative w-full max-w-lg aspect-square flex items-center justify-center">
                {/* Strawberry Splash Artwork */}
                <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-2xl border border-pink-500/20 group">
                  <img
                    src={heroImage}
                    alt="ClickBarry Fresh Ripe Strawberries in Splash"
                    className="w-full h-full object-cover object-center transform transition-transform duration-700 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  {/* Glass rim reflection */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0c0722]/80 via-transparent to-transparent pointer-events-none" />
                </div>

                {/* Floating Golden Seal Ribbon Badge (as shown in reference image) */}
                <div className="absolute -bottom-4 sm:bottom-0 right-0 sm:right-2 z-20">
                  <GoldSealBadge onClick={() => onNavigate('guarantee')} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 2. HOW IT WORKS – 4 STEPS (Light Section on White/Cream) */}
      {/* ---------------------------------------------------- */}
      <section className="bg-slate-50 text-slate-900 py-16 lg:py-20 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Centered Heading with pink lines */}
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="flex items-center justify-center gap-4">
              <span className="h-[2px] w-12 sm:w-20 bg-gradient-to-r from-transparent to-pink-500 rounded" />
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
                How It Works?
              </h2>
              <span className="h-[2px] w-12 sm:w-20 bg-gradient-to-l from-transparent to-pink-500 rounded" />
            </div>
            <p className="mt-2 text-base sm:text-lg font-semibold text-indigo-900">
              Simple Steps to Start Your Journey
            </p>
          </div>

          {/* 4 Connected Step Cards matching reference */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {/* Step 1 */}
            <div className="relative bg-white rounded-2xl p-6 border border-purple-100 shadow-md hover:shadow-xl transition-all group flex flex-col items-center text-center">
              {/* Pink Circled Number Badge */}
              <div className="absolute -top-4 w-9 h-9 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold text-base flex items-center justify-center shadow-md">
                1
              </div>

              {/* Step Icon */}
              <div className="mt-4 w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <UserPlus className="w-7 h-7" />
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-1">
                Register Account
              </h3>
              <p className="text-sm text-slate-600">
                Create your account on ClickBarry.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative bg-white rounded-2xl p-6 border border-purple-100 shadow-md hover:shadow-xl transition-all group flex flex-col items-center text-center">
              {/* Pink Circled Number Badge */}
              <div className="absolute -top-4 w-9 h-9 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold text-base flex items-center justify-center shadow-md">
                2
              </div>

              {/* Step Icon */}
              <div className="mt-4 w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <CreditCard className="w-7 h-7" />
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-1">
                Pay Once – ₹999
              </h3>
              <p className="text-sm text-slate-600">
                Get premium access with one-time payment.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative bg-white rounded-2xl p-6 border border-purple-100 shadow-md hover:shadow-xl transition-all group flex flex-col items-center text-center">
              {/* Pink Circled Number Badge */}
              <div className="absolute -top-4 w-9 h-9 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold text-base flex items-center justify-center shadow-md">
                3
              </div>

              {/* Step Icon */}
              <div className="mt-4 w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Package className="w-7 h-7" />
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-1">
                List Your Products
              </h3>
              <p className="text-sm text-slate-600">
                Add your digital products with attractive offers.
              </p>
            </div>

            {/* Step 4 */}
            <div className="relative bg-white rounded-2xl p-6 border border-purple-100 shadow-md hover:shadow-xl transition-all group flex flex-col items-center text-center">
              {/* Pink Circled Number Badge */}
              <div className="absolute -top-4 w-9 h-9 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold text-base flex items-center justify-center shadow-md">
                4
              </div>

              {/* Step Icon */}
              <div className="mt-4 w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-7 h-7" />
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-1">
                Grow Your Business
              </h3>
              <p className="text-sm text-slate-600">
                Reach more customers and increase your sales.
              </p>
            </div>
          </div>

          {/* Quick CTA strip below steps */}
          <div className="mt-12 text-center">
            <button
              onClick={() => onNavigate('how-it-works')}
              className="inline-flex items-center gap-2 text-sm font-bold text-pink-600 hover:text-pink-700 cursor-pointer"
            >
              <span>Learn about full seller & affiliate roadmap</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 3. BENEFITS & PROMISE TRIO (Seller, Affiliate, Promise) */}
      {/* ---------------------------------------------------- */}
      <section className="bg-slate-100 text-slate-900 py-16 lg:py-20 border-b border-slate-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Seller Benefits */}
            <div className="rounded-2xl overflow-hidden bg-white shadow-lg border border-pink-100 flex flex-col transition-transform hover:-translate-y-1">
              {/* Header: Pink / Magenta with Gold Star */}
              <div className="bg-gradient-to-r from-rose-500 to-pink-600 px-6 py-4 flex items-center gap-3 text-white">
                <Star className="w-6 h-6 fill-amber-300 text-amber-300 shrink-0" />
                <h3 className="text-xl font-bold tracking-tight">
                  Seller Benefits
                </h3>
              </div>

              {/* Content Body */}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
                <ul className="space-y-3">
                  {[
                    'Premium seller dashboard',
                    'List unlimited products',
                    'Reach global audience',
                    'Track performance easily'
                  ].map((feat, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-sm font-semibold text-slate-800">
                      <div className="w-4 h-4 rounded-full bg-pink-500 text-white flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                {/* 3D Laptop with Cart Image */}
                <div className="pt-2 flex justify-center">
                  <div className="w-full max-w-[240px] aspect-[4/3] rounded-xl overflow-hidden shadow-inner bg-slate-50 p-2 flex items-center justify-center">
                    <img
                      src={sellerLaptopImage}
                      alt="Seller Dashboard on Laptop"
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>

                <button
                  onClick={() => onNavigate('sellers')}
                  className="w-full py-2.5 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-700 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Start Selling for ₹999
                </button>
              </div>
            </div>

            {/* Card 2: Affiliate Benefits */}
            <div className="rounded-2xl overflow-hidden bg-white shadow-lg border border-purple-100 flex flex-col transition-transform hover:-translate-y-1">
              {/* Header: Indigo / Violet with Handshake Icon */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center gap-3 text-white">
                <div className="w-6 h-6 text-amber-300">
                  🤝
                </div>
                <h3 className="text-xl font-bold tracking-tight">
                  Affiliate Benefits
                </h3>
              </div>

              {/* Content Body */}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
                <ul className="space-y-3">
                  {[
                    'Discover high-quality products',
                    'Promote & earn commission',
                    'Easy tracking & payments',
                    'Grow your income'
                  ].map((feat, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-sm font-semibold text-slate-800">
                      <div className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                {/* 3D Gold Bar Chart with Coins Image */}
                <div className="pt-2 flex justify-center">
                  <div className="w-full max-w-[240px] aspect-[4/3] rounded-xl overflow-hidden shadow-inner bg-slate-50 p-2 flex items-center justify-center">
                    <img
                      src={affiliateCoinsImage}
                      alt="Affiliate Commission Growth"
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>

                <button
                  onClick={() => onNavigate('affiliates')}
                  className="w-full py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Explore Affiliate Program
                </button>
              </div>
            </div>

            {/* Card 3: Our Promise */}
            <div className="rounded-2xl overflow-hidden bg-white shadow-lg border border-emerald-100 flex flex-col transition-transform hover:-translate-y-1">
              {/* Header: Emerald Green with Shield Check Icon */}
              <div className="bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-4 flex items-center gap-3 text-white">
                <Shield className="w-6 h-6 fill-white/20 text-white shrink-0" />
                <h3 className="text-xl font-bold tracking-tight">
                  Our Promise
                </h3>
              </div>

              {/* Content Body */}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
                <ul className="space-y-3">
                  {[
                    'Secure & Trusted Platform',
                    'Transparent Policies',
                    'Dedicated Support',
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

                {/* 3D Gold & Blue Shield Image */}
                <div className="pt-2 flex justify-center">
                  <div className="w-full max-w-[240px] aspect-[4/3] rounded-xl overflow-hidden shadow-inner bg-slate-50 p-2 flex items-center justify-center">
                    <img
                      src={securityShieldImage}
                      alt="ClickBarry Security Guarantee Shield"
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
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
      {/* 4. REFUND POLICY & TESTIMONIAL ROW (Matching Reference) */}
      {/* ---------------------------------------------------- */}
      <section className="bg-slate-50 text-slate-900 py-14 lg:py-16 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            {/* Left Card: Refund Policy */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-purple-100 shadow-md flex items-start gap-5 hover:shadow-lg transition-shadow">
              {/* Circular Refresh 360 Icon */}
              <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-1">
                <RefreshCw className="w-7 h-7" />
              </div>

              <div className="space-y-3 flex-1">
                <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  Refund Policy
                </h3>
                <p className="text-slate-700 text-sm sm:text-base leading-relaxed font-medium">
                  If you get less than 5 sales in 1 month, you can apply for a refund after 1 month from your purchase date.
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

            {/* Right Card: What Our Users Say (Rajesh Kumar Testimonial) */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-purple-100 shadow-md flex flex-col sm:flex-row items-center sm:items-start gap-5 hover:shadow-lg transition-shadow">
              {/* Avatar circle */}
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-pink-500 shrink-0 shadow-md">
                <img
                  src={currentTestimonial.avatar || rajeshAvatar}
                  alt={currentTestimonial.name}
                  className="w-full h-full object-cover object-top"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="space-y-2 flex-1 text-center sm:text-left">
                {/* Header with Orange Quotes */}
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="text-amber-500 font-serif text-3xl font-bold leading-none">““</span>
                  <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                    What Our Users Say
                  </h3>
                </div>

                {/* Quote text */}
                <p className="text-slate-800 text-base sm:text-lg font-semibold italic leading-snug">
                  "{currentTestimonial.content}"
                </p>

                {/* Attribution and Stars */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-slate-100">
                  <span className="text-sm font-bold text-slate-700">
                    — {currentTestimonial.name}, {currentTestimonial.role}
                  </span>

                  {/* 5 Golden Stars */}
                  <div className="flex items-center justify-center sm:justify-end gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </div>

                {/* Testimonial Switchers */}
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
      {/* 5. FEATURED MARKETPLACE PREVIEW STRIP */}
      {/* ---------------------------------------------------- */}
      <section className="bg-[#0f0927] text-white py-16 lg:py-20 border-b border-purple-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <span className="text-pink-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Top Trending Digital Assets
              </span>
              <h2 className="text-3xl font-extrabold tracking-tight mt-1 text-white">
                Popular on ClickBarry Marketplace
              </h2>
            </div>

            <button
              onClick={() => onNavigate('marketplace')}
              className="px-5 py-2.5 rounded-full bg-[#201442] hover:bg-pink-600 text-white font-semibold text-sm border border-purple-800 transition-all flex items-center gap-2 self-start cursor-pointer"
            >
              <span>View All Products</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Grid of sample products */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.slice(0, 3).map((prod) => (
              <div
                key={prod.id}
                onClick={() => {
                  recordView(prod.id);
                  onOpenProductModal(prod);
                }}
                className="bg-[#170e3a] rounded-2xl overflow-hidden border border-purple-900/60 hover:border-pink-500/60 shadow-lg hover:shadow-2xl transition-all cursor-pointer group flex flex-col"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-slate-900">
                  <img
                    src={prod.image}
                    alt={prod.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-md text-xs font-bold text-pink-300">
                    {prod.categoryLabel}
                  </div>
                  <div className="absolute top-3 right-3 bg-emerald-600/90 text-white px-2.5 py-1 rounded-md text-xs font-extrabold">
                    {prod.commissionRate}% Commission
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="font-bold text-lg text-white group-hover:text-pink-400 transition-colors line-clamp-1">
                      {prod.title}
                    </h3>
                    <p className="text-slate-400 text-xs mt-1">
                      By {prod.sellerName}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-purple-900/40">
                    <div>
                      <span className="text-2xl font-black text-white">
                        ₹{prod.price}
                      </span>
                      {prod.originalPrice && (
                        <span className="text-xs text-slate-500 line-through ml-2">
                          ₹{prod.originalPrice}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          recordClick(prod.id);
                          if (prod.originalUrl && prod.originalUrl.startsWith('http')) {
                            window.open(prod.originalUrl, '_blank', 'noopener,noreferrer');
                          } else {
                            recordView(prod.id);
                            onOpenProductModal(prod);
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer shadow-md shadow-pink-600/30"
                      >
                        <span>Shop Now</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          recordView(prod.id);
                          onOpenProductModal(prod);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-[#201449] hover:bg-[#2b1b63] text-pink-300 font-bold text-xs border border-purple-800 transition-colors flex items-center gap-1 cursor-pointer"
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
      </section>

      {/* ---------------------------------------------------- */}
      {/* 6. CONVERSION BANNER (Join ClickBarry Today) */}
      {/* ---------------------------------------------------- */}
      <section className="bg-gradient-to-r from-purple-900 via-rose-900 to-pink-900 text-white py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto rounded-3xl bg-black/30 backdrop-blur-md p-8 sm:p-12 border border-pink-500/30 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-pink-500/20 text-pink-300 text-xs font-bold uppercase tracking-wider">
            🍓 Start Today With Zero Recurring Monthly Fees
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Ready to Sell or Earn with ClickBarry?
          </h2>
          <p className="text-slate-200 text-base max-w-2xl mx-auto">
            Join hundreds of creators and affiliates. Pay once ₹999 for lifetime seller access or sign up for free as an affiliate and earn up to 70% commission on digital products.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              onClick={onOpenSignup}
              className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-extrabold text-base shadow-xl shadow-pink-600/40 cursor-pointer"
            >
              List Your Product – ₹999 Lifetime
            </button>
            <button
              onClick={() => onNavigate('affiliates')}
              className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#160c33] hover:bg-[#251554] text-white font-bold text-base border border-purple-700 cursor-pointer"
            >
              Join as Affiliate (Free)
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
