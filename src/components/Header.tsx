import React, { useState } from 'react';
import { StrawberryLogo } from './StrawberryLogo';
import { PageId } from '../types';
import {
  User,
  Rocket,
  ChevronDown,
  Menu,
  X,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Search,
  LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  onOpenLogin: () => void;
  onOpenSignup: () => void;
  onOpenSearch?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  onNavigate,
  onOpenLogin,
  onOpenSignup,
  onOpenSearch
}) => {
  const { user, profile, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const handleLinkClick = (page: PageId) => {
    onNavigate(page);
    setMobileMenuOpen(false);
    setActiveDropdown(null);
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0d0722]/90 backdrop-blur-md border-b border-purple-900/40 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo */}
          <StrawberryLogo
            size="md"
            showTagline={true}
            onClick={() => handleLinkClick('home')}
          />

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2 text-[14px] font-medium text-slate-200">
            {/* Home Link (Pill highlighted when active, just like in reference design) */}
            <button
              onClick={() => handleLinkClick('home')}
              className={`px-4 py-1.5 rounded-full transition-all duration-200 whitespace-nowrap cursor-pointer ${
                currentPage === 'home'
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white font-semibold shadow-md shadow-pink-600/25'
                  : 'hover:text-pink-400'
              }`}
            >
              Home
            </button>

            {/* How It Works with Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setActiveDropdown('how-it-works')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button
                onClick={() => handleLinkClick('how-it-works')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg hover:text-pink-400 transition-colors whitespace-nowrap cursor-pointer ${
                  currentPage === 'how-it-works' || currentPage === 'sellers' || currentPage === 'affiliates'
                    ? 'text-pink-400 font-semibold'
                    : ''
                }`}
              >
                <span>How It Works</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeDropdown === 'how-it-works' ? 'rotate-180' : ''}`} />
              </button>

              {activeDropdown === 'how-it-works' && (
                <div className="absolute top-full left-0 mt-1 w-56 rounded-xl bg-[#140b33] border border-purple-800/60 shadow-2xl p-2 z-50">
                  <button
                    onClick={() => handleLinkClick('how-it-works')}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-purple-900/40 hover:text-pink-400 flex items-center justify-between cursor-pointer"
                  >
                    <span>Overview & 4 Steps</span>
                    <Sparkles className="w-4 h-4 text-pink-400" />
                  </button>
                  <button
                    onClick={() => handleLinkClick('sellers')}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-purple-900/40 hover:text-pink-400 flex items-center justify-between cursor-pointer"
                  >
                    <span>For Sellers (₹999 Access)</span>
                    <Rocket className="w-4 h-4 text-emerald-400" />
                  </button>
                  <button
                    onClick={() => handleLinkClick('affiliates')}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-purple-900/40 hover:text-pink-400 flex items-center justify-between cursor-pointer"
                  >
                    <span>For Affiliates (Up to 70%)</span>
                    <span className="text-xs bg-pink-500/20 text-pink-300 px-1.5 py-0.5 rounded">Earn</span>
                  </button>
                </div>
              )}
            </div>

            {/* Directory with Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setActiveDropdown('directory')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button
                onClick={() => handleLinkClick('directory')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg hover:text-pink-400 transition-colors whitespace-nowrap cursor-pointer ${
                  currentPage === 'directory' ? 'text-pink-400 font-semibold' : ''
                }`}
              >
                <span>Directory</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeDropdown === 'directory' ? 'rotate-180' : ''}`} />
              </button>

              {activeDropdown === 'directory' && (
                <div className="absolute top-full left-0 mt-1 w-52 rounded-xl bg-[#140b33] border border-purple-800/60 shadow-2xl p-2 z-50">
                  <button
                    onClick={() => handleLinkClick('directory')}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-purple-900/40 hover:text-pink-400 cursor-pointer"
                  >
                    All Verified Stores
                  </button>
                  <button
                    onClick={() => handleLinkClick('directory')}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-purple-900/40 hover:text-pink-400 cursor-pointer"
                  >
                    Top Rated Creators
                  </button>
                  <button
                    onClick={() => handleLinkClick('marketplace')}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-purple-900/40 hover:text-pink-400 cursor-pointer"
                  >
                    Explore Products
                  </button>
                </div>
              )}
            </div>

            {/* Categories Link (Direct or Dropdown to Marketplace) */}
            <div
              className="relative"
              onMouseEnter={() => setActiveDropdown('categories')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button
                onClick={() => handleLinkClick('marketplace')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg hover:text-pink-400 transition-colors whitespace-nowrap cursor-pointer ${
                  currentPage === 'marketplace' ? 'text-pink-400 font-semibold' : ''
                }`}
              >
                <span>Categories</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeDropdown === 'categories' ? 'rotate-180' : ''}`} />
              </button>

              {activeDropdown === 'categories' && (
                <div className="absolute top-full left-0 mt-1 w-56 rounded-xl bg-[#140b33] border border-purple-800/60 shadow-2xl p-2 z-50">
                  <button
                    onClick={() => handleLinkClick('marketplace')}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-purple-900/40 hover:text-pink-400 cursor-pointer"
                  >
                    Notion Templates
                  </button>
                  <button
                    onClick={() => handleLinkClick('marketplace')}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-purple-900/40 hover:text-pink-400 cursor-pointer"
                  >
                    Software & Source Code
                  </button>
                  <button
                    onClick={() => handleLinkClick('marketplace')}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-purple-900/40 hover:text-pink-400 cursor-pointer"
                  >
                    Canva & Graphic Packs
                  </button>
                  <button
                    onClick={() => handleLinkClick('marketplace')}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-purple-900/40 hover:text-pink-400 cursor-pointer"
                  >
                    E-Books & Playbooks
                  </button>
                  <button
                    onClick={() => handleLinkClick('marketplace')}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-purple-900/40 hover:text-pink-400 cursor-pointer"
                  >
                    Video Courses & Masterclasses
                  </button>
                </div>
              )}
            </div>

            {/* Guarantee Link */}
            <button
              onClick={() => handleLinkClick('guarantee')}
              className={`px-3 py-1.5 rounded-lg hover:text-pink-400 transition-colors whitespace-nowrap cursor-pointer ${
                currentPage === 'guarantee' ? 'text-pink-400 font-semibold' : ''
              }`}
            >
              Guarantee
            </button>

            {/* Dashboard Link */}
            <button
              onClick={() => handleLinkClick('dashboard')}
              className={`px-3 py-1.5 rounded-lg hover:text-pink-400 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                currentPage === 'dashboard' ? 'text-pink-400 font-semibold bg-purple-950/60' : ''
              }`}
            >
              <span>Dashboard</span>
              <span className="text-[10px] bg-pink-500/20 text-pink-300 font-bold px-1.5 py-0.5 rounded">Seller</span>
            </button>

            {/* Admin Portal Link */}
            <button
              onClick={() => handleLinkClick('admin')}
              className={`px-3 py-1.5 rounded-lg hover:text-pink-400 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                currentPage === 'admin' ? 'text-pink-400 font-semibold bg-purple-950/80 border border-pink-500/40 shadow-sm' : ''
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-pink-400" />
              <span>Admin</span>
              <span className="text-[10px] bg-gradient-to-r from-red-600 to-pink-600 text-white font-bold px-1.5 py-0.2 rounded">Core</span>
            </button>

            {/* About Us */}
            <button
              onClick={() => handleLinkClick('about')}
              className={`px-3 py-1.5 rounded-lg hover:text-pink-400 transition-colors whitespace-nowrap cursor-pointer ${
                currentPage === 'about' ? 'text-pink-400 font-semibold' : ''
              }`}
            >
              About Us
            </button>

            {/* Contact */}
            <button
              onClick={() => handleLinkClick('contact')}
              className={`px-3 py-1.5 rounded-lg hover:text-pink-400 transition-colors whitespace-nowrap cursor-pointer ${
                currentPage === 'contact' ? 'text-pink-400 font-semibold' : ''
              }`}
            >
              Contact
            </button>
          </nav>

          {/* Action CTAs (Login / Seller Profile & List Your Product) */}
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            {onOpenSearch && (
              <button
                onClick={onOpenSearch}
                aria-label="Search products"
                className="p-2 text-slate-300 hover:text-white hover:bg-white/5 rounded-full transition-colors cursor-pointer"
              >
                <Search className="w-4 h-4" />
              </button>
            )}

            {user ? (
              <div className="flex items-center gap-2">
                {/* Authenticated Seller Profile Pill */}
                <button
                  onClick={() => handleLinkClick('dashboard')}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1c123d] hover:bg-[#281b54] text-slate-100 text-xs font-semibold border border-purple-700/80 hover:border-pink-500/80 transition-all cursor-pointer"
                  title="Go to Seller Dashboard"
                >
                  <div className="w-5 h-5 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 flex items-center justify-center text-[10px] text-white font-extrabold">
                    {(profile?.full_name || user.email || 'S')[0].toUpperCase()}
                  </div>
                  <span className="truncate max-w-[120px]">
                    {profile?.full_name || user.email?.split('@')[0]}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </button>

                {/* Logout Button */}
                <button
                  onClick={async () => {
                    await signOut();
                    onNavigate('home');
                  }}
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-white/5 rounded-full transition-colors cursor-pointer"
                  title="Log Out"
                  aria-label="Log out"
                >
                  <LogOut className="w-4 h-4" />
                </button>

                {/* Seller Dashboard CTA */}
                <button
                  onClick={() => handleLinkClick('dashboard')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-600 hover:to-rose-700 text-white text-xs font-bold shadow-md shadow-pink-600/30 transition-all cursor-pointer"
                >
                  <Rocket className="w-3.5 h-3.5" />
                  <span>Dashboard</span>
                </button>
              </div>
            ) : (
              <>
                {/* Login button */}
                <button
                  onClick={onOpenLogin}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#181135] hover:bg-[#231a4a] text-slate-100 text-sm font-medium border border-purple-800/70 hover:border-pink-500/80 transition-all cursor-pointer whitespace-nowrap"
                >
                  <User className="w-4 h-4 text-slate-300" />
                  <span>Login</span>
                </button>

                {/* List Your Product CTA */}
                <button
                  onClick={onOpenSignup}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-600 hover:to-rose-700 text-white text-sm font-semibold shadow-lg shadow-pink-600/30 hover:shadow-pink-600/50 transition-all transform hover:-translate-y-0.5 cursor-pointer whitespace-nowrap"
                >
                  <Rocket className="w-4 h-4" />
                  <span>List Your Product</span>
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={onOpenLogin}
              className="p-2 text-slate-200 hover:text-pink-400 rounded-lg"
              aria-label="Login"
            >
              <User className="w-5 h-5" />
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-200 hover:text-pink-400 rounded-lg focus:outline-none"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#10092c] border-b border-purple-800/80 px-4 pt-3 pb-6 space-y-2">
          <div className="grid grid-cols-2 gap-2 pb-3 border-b border-purple-900/60">
            <button
              onClick={() => handleLinkClick('home')}
              className={`p-2.5 text-left rounded-lg text-sm font-medium ${
                currentPage === 'home' ? 'bg-pink-600 text-white' : 'text-slate-200 bg-purple-950/40'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => handleLinkClick('marketplace')}
              className={`p-2.5 text-left rounded-lg text-sm font-medium ${
                currentPage === 'marketplace' ? 'bg-pink-600 text-white' : 'text-slate-200 bg-purple-950/40'
              }`}
            >
              Marketplace
            </button>
            <button
              onClick={() => handleLinkClick('how-it-works')}
              className={`p-2.5 text-left rounded-lg text-sm font-medium ${
                currentPage === 'how-it-works' ? 'bg-pink-600 text-white' : 'text-slate-200 bg-purple-950/40'
              }`}
            >
              How It Works
            </button>
            <button
              onClick={() => handleLinkClick('directory')}
              className={`p-2.5 text-left rounded-lg text-sm font-medium ${
                currentPage === 'directory' ? 'bg-pink-600 text-white' : 'text-slate-200 bg-purple-950/40'
              }`}
            >
              Directory
            </button>
            <button
              onClick={() => handleLinkClick('sellers')}
              className={`p-2.5 text-left rounded-lg text-sm font-medium ${
                currentPage === 'sellers' ? 'bg-pink-600 text-white' : 'text-slate-200 bg-purple-950/40'
              }`}
            >
              For Sellers
            </button>
            <button
              onClick={() => handleLinkClick('affiliates')}
              className={`p-2.5 text-left rounded-lg text-sm font-medium ${
                currentPage === 'affiliates' ? 'bg-pink-600 text-white' : 'text-slate-200 bg-purple-950/40'
              }`}
            >
              For Affiliates
            </button>
            <button
              onClick={() => handleLinkClick('guarantee')}
              className={`p-2.5 text-left rounded-lg text-sm font-medium ${
                currentPage === 'guarantee' ? 'bg-pink-600 text-white' : 'text-slate-200 bg-purple-950/40'
              }`}
            >
              Guarantee
            </button>
            <button
              onClick={() => handleLinkClick('dashboard')}
              className={`p-2.5 text-left rounded-lg text-sm font-medium ${
                currentPage === 'dashboard' ? 'bg-pink-600 text-white' : 'text-slate-200 bg-purple-950/40'
              }`}
            >
              Seller Dashboard
            </button>
            <button
              onClick={() => handleLinkClick('admin')}
              className={`p-2.5 text-left rounded-lg text-sm font-bold flex items-center justify-between ${
                currentPage === 'admin' ? 'bg-pink-600 text-white' : 'text-pink-300 bg-purple-900/40 border border-purple-700/60'
              }`}
            >
              <span>Admin Portal</span>
              <span className="text-[10px] bg-red-500/20 text-red-300 px-1.5 py-0.2 rounded font-mono">SUPER</span>
            </button>
            <button
              onClick={() => handleLinkClick('about')}
              className={`p-2.5 text-left rounded-lg text-sm font-medium ${
                currentPage === 'about' ? 'bg-pink-600 text-white' : 'text-slate-200 bg-purple-950/40'
              }`}
            >
              About Us
            </button>
            <button
              onClick={() => handleLinkClick('contact')}
              className={`col-span-2 p-2.5 text-left rounded-lg text-sm font-medium ${
                currentPage === 'contact' ? 'bg-pink-600 text-white' : 'text-slate-200 bg-purple-950/40'
              }`}
            >
              Contact Support
            </button>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            {user ? (
              <>
                <div className="p-3 rounded-2xl bg-[#1c123d] border border-purple-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 flex items-center justify-center text-xs text-white font-extrabold">
                      {(profile?.full_name || user.email || 'S')[0].toUpperCase()}
                    </div>
                    <div>
                      <span className="font-bold text-xs text-white block">
                        {profile?.full_name || 'Seller'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {user.email}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/40">
                    Active Seller
                  </span>
                </div>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLinkClick('dashboard');
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 text-white font-semibold shadow-lg shadow-pink-600/30 cursor-pointer"
                >
                  <Rocket className="w-4 h-4" />
                  <span>Open Seller Dashboard</span>
                </button>

                <button
                  onClick={async () => {
                    setMobileMenuOpen(false);
                    await signOut();
                    onNavigate('home');
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-800/80 font-medium cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenSignup();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 text-white font-semibold shadow-lg shadow-pink-600/30 cursor-pointer"
                >
                  <Rocket className="w-4 h-4" />
                  <span>List Your Product (₹999 Lifetime)</span>
                </button>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenLogin();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full bg-[#181135] text-slate-200 border border-purple-800 font-medium cursor-pointer"
                >
                  <User className="w-4 h-4" />
                  <span>Login to Account</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
