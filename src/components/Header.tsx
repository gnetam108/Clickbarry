import React, { useState } from 'react';
import { StrawberryLogo } from './StrawberryLogo';
import { PageId } from '../types';
import {
  User,
  Rocket,
  Menu,
  X,
  Search,
  LogOut,
  ShoppingBag,
  TrendingUp,
  LayoutDashboard
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  onOpenLogin: () => void;
  onOpenSignup: (defaultRole?: 'affiliate' | 'seller') => void;
  onOpenSearch?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  onNavigate,
  onOpenLogin,
  onOpenSignup,
  onOpenSearch
}) => {
  const { user, profile, role, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLinkClick = (page: PageId) => {
    onNavigate(page);
    setMobileMenuOpen(false);
  };

  const dashboardTarget: PageId = role === 'seller' ? 'seller-dashboard' : 'affiliate-dashboard';
  const dashboardLabel = role === 'seller' ? 'Seller Dashboard' : 'Affiliate Dashboard';

  const isNavActive = (id: 'home' | 'marketplace' | 'affiliate' | 'seller') => {
    if (id === 'home') return currentPage === 'home';
    if (id === 'marketplace') return currentPage === 'marketplace' || currentPage === 'product-detail';
    if (id === 'affiliate') return currentPage === 'affiliate' || currentPage === 'affiliate-auth' || currentPage === 'affiliate-dashboard' || currentPage === 'affiliates';
    if (id === 'seller') return currentPage === 'seller' || currentPage === 'seller-auth' || currentPage === 'seller-dashboard' || currentPage === 'sellers';
    return false;
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0d0722]/95 backdrop-blur-md border-b border-purple-900/40 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          {/* Brand Logo */}
          <div className="shrink-0">
            <StrawberryLogo
              size="md"
              showTagline={true}
              onClick={() => handleLinkClick('home')}
            />
          </div>

          {/* Primary Navigation: Home | [Marketplace if logged in] | Affiliate | Seller */}
          <nav className="hidden lg:flex items-center gap-2 text-[14px] font-semibold text-slate-200">
            <button
              onClick={() => handleLinkClick('home')}
              className={`px-4 py-1.5 rounded-full transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer ${
                isNavActive('home')
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md shadow-pink-600/25'
                  : 'hover:text-pink-400'
              }`}
            >
              Home
            </button>

            {user && (
              <button
                onClick={() => handleLinkClick('marketplace')}
                className={`px-4 py-1.5 rounded-full transition-all duration-200 whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  isNavActive('marketplace')
                    ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md shadow-pink-600/25'
                    : 'hover:text-pink-400'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5 text-pink-400" />
                <span>Marketplace</span>
              </button>
            )}

            <button
              onClick={() => handleLinkClick('affiliate')}
              className={`px-4 py-1.5 rounded-full transition-all duration-200 whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                isNavActive('affiliate')
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md shadow-pink-600/25'
                  : 'hover:text-pink-400'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
              <span>Affiliate</span>
            </button>

            <button
              onClick={() => handleLinkClick('seller')}
              className={`px-4 py-1.5 rounded-full transition-all duration-200 whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                isNavActive('seller')
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md shadow-pink-600/25'
                  : 'hover:text-pink-400'
              }`}
            >
              <Rocket className="w-3.5 h-3.5 text-emerald-400" />
              <span>Seller</span>
            </button>
          </nav>

          {/* Right Auth & Action Controls */}
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            {user && onOpenSearch && (
              <button
                onClick={onOpenSearch}
                aria-label="Search marketplace"
                className="p-2 text-slate-300 hover:text-white hover:bg-white/5 rounded-full transition-colors cursor-pointer shrink-0"
              >
                <Search className="w-4 h-4" />
              </button>
            )}

            {user ? (
              <div className="flex items-center gap-2.5 shrink-0">
                {role !== 'admin' && (
                  <button
                    onClick={() => handleLinkClick(dashboardTarget)}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-600 hover:to-rose-700 text-white text-xs font-bold shadow-md shadow-pink-600/30 transition-all cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    <span>{dashboardLabel}</span>
                  </button>
                )}

                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1c123d] text-slate-100 text-xs font-semibold border border-purple-700/80 whitespace-nowrap shrink-0"
                  title={user.email || ''}
                >
                  <div className="w-5 h-5 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 flex items-center justify-center text-[10px] text-white font-extrabold">
                    {(profile?.full_name || user.email || 'M')[0].toUpperCase()}
                  </div>
                  <span className="truncate max-w-[110px]">
                    {profile?.full_name || user.email?.split('@')[0]}
                  </span>
                </div>

                <button
                  onClick={async () => {
                    await signOut();
                    onNavigate('home');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-300 hover:text-rose-400 hover:bg-white/5 border border-purple-900/60 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  title="Log Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  onClick={onOpenLogin}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#181135] hover:bg-[#231a4a] text-slate-100 text-sm font-medium border border-purple-800/70 hover:border-pink-500/80 transition-all cursor-pointer whitespace-nowrap shrink-0"
                >
                  <User className="w-4 h-4 text-slate-300" />
                  <span>Login</span>
                </button>

                <button
                  onClick={() => onOpenSignup('affiliate')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-600 hover:to-rose-700 text-white text-sm font-semibold shadow-lg shadow-pink-600/30 transition-all cursor-pointer whitespace-nowrap shrink-0"
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>Join Free</span>
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex lg:hidden items-center gap-2 shrink-0">
            {!user && (
              <button
                onClick={onOpenLogin}
                className="px-3 py-1.5 rounded-full bg-[#181135] border border-purple-800 text-xs font-bold text-slate-200 hover:text-pink-400 cursor-pointer"
              >
                Login
              </button>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-200 hover:text-pink-400 rounded-lg focus:outline-none cursor-pointer"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu (Zero AdminCore references) */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#10092c] border-b border-purple-800/80 px-4 pt-3 pb-6 space-y-3">
          <div className="grid grid-cols-2 gap-2 pb-3 border-b border-purple-900/60">
            <button
              onClick={() => handleLinkClick('home')}
              className={`p-2.5 text-left rounded-lg text-sm font-medium cursor-pointer ${
                isNavActive('home') ? 'bg-pink-600 text-white' : 'text-slate-200 bg-purple-950/40'
              }`}
            >
              Home
            </button>
            {user && (
              <button
                onClick={() => handleLinkClick('marketplace')}
                className={`p-2.5 text-left rounded-lg text-sm font-medium cursor-pointer ${
                  isNavActive('marketplace') ? 'bg-pink-600 text-white' : 'text-slate-200 bg-purple-950/40'
                }`}
              >
                Marketplace
              </button>
            )}
            <button
              onClick={() => handleLinkClick('affiliate')}
              className={`p-2.5 text-left rounded-lg text-sm font-medium cursor-pointer ${
                isNavActive('affiliate') ? 'bg-pink-600 text-white' : 'text-slate-200 bg-purple-950/40'
              }`}
            >
              Affiliate (Free)
            </button>
            <button
              onClick={() => handleLinkClick('seller')}
              className={`p-2.5 text-left rounded-lg text-sm font-medium cursor-pointer ${
                isNavActive('seller') ? 'bg-pink-600 text-white' : 'text-slate-200 bg-purple-950/40'
              }`}
            >
              Seller Portal
            </button>
          </div>

          <div className="pt-1 flex flex-col gap-2">
            {user ? (
              <>
                {role !== 'admin' && (
                  <button
                    onClick={() => handleLinkClick(dashboardTarget)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 text-white font-semibold shadow-lg shadow-pink-600/30 cursor-pointer"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Open {dashboardLabel}</span>
                  </button>
                )}

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
                    onOpenSignup('affiliate');
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 text-white font-semibold shadow-lg shadow-pink-600/30 cursor-pointer"
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>Become an Affiliate (Free)</span>
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
