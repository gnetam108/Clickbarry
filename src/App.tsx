/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { PageId, Product } from './types';
import { ProductProvider, useProducts } from './context/ProductContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { HybridAffiliateProvider, useHybridAffiliate } from './context/HybridAffiliateContext';
import { WalletProvider } from './context/WalletContext';
import { AdminProvider } from './context/AdminContext';
import { PayUMembershipProvider } from './context/PayUMembershipContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { MarketplacePage } from './pages/MarketplacePage';
import { SellerDashboardPage } from './pages/SellerDashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { DirectoryPage } from './pages/DirectoryPage';
import { GuaranteePage } from './pages/GuaranteePage';
import { ForSellersPage } from './pages/ForSellersPage';
import { ForAffiliatesPage } from './pages/ForAffiliatesPage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { ProductModal } from './components/ProductModal';
import { AddEditProductModal } from './components/AddEditProductModal';
import { AuthModal } from './components/AuthModal';
import { PayUCheckoutModal } from './components/PayUCheckoutModal';
import { SupabaseDevStatusBar } from './components/SupabaseDevStatusBar';
import { CheckCircle2, AlertCircle, Info, X, LogOut, ShieldCheck } from 'lucide-react';
import { validateSafeUrl } from './lib/tracking';

const PAGE_PATHS: Record<Exclude<PageId, 'login' | 'signup'>, string> = {
  home: '/',
  marketplace: '/marketplace',
  dashboard: '/dashboard',
  admin: '/admin',
  'how-it-works': '/how-it-works',
  directory: '/directory',
  guarantee: '/guarantee',
  sellers: '/sellers',
  affiliates: '/affiliates',
  about: '/about',
  contact: '/contact'
};

const PATH_TO_PAGE: Record<string, PageId> = Object.entries(PAGE_PATHS).reduce(
  (acc, [pageId, path]) => {
    acc[path] = pageId as PageId;
    return acc;
  },
  {} as Record<string, PageId>
);

function AppContent() {
  const { user, profile, signOut, isPasswordRecovery } = useAuth();
  const { products, addProduct, updateProduct, recordClick, toast, hideToast } = useProducts();
  const { affiliateLinks, recordOutboundClick } = useHybridAffiliate();
  const location = useLocation();
  const navigate = useNavigate();

  const normalizedPath = location.pathname !== '/' ? location.pathname.replace(/\/+$/, '') : '/';
  const currentPage: PageId = PATH_TO_PAGE[normalizedPath] || 'home';
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup' | 'forgot' | 'reset'>('login');

  // Handle incoming affiliate tracking link clicks: ?cb_trk=...
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const trackingSlug = urlParams.get('cb_trk');
      if (trackingSlug) {
        // Find matching affiliate link
        const matched = affiliateLinks.find((l) => l.uniqueTrackingSlug === trackingSlug);
        if (matched && matched.targetUrl) {
          const { isValid, sanitizedUrl } = validateSafeUrl(matched.targetUrl);
          if (isValid && sanitizedUrl) {
            recordOutboundClick(
              trackingSlug,
              sanitizedUrl,
              matched.networkName,
              matched.productId,
              matched.externalProductId
            );
            // Redirect after brief record
            window.location.href = sanitizedUrl;
          }
        }
      }
    }
  }, [affiliateLinks, recordOutboundClick]);

  // Add / Edit Product Modal state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // If password recovery link was clicked in email, open reset modal automatically
  useEffect(() => {
    if (isPasswordRecovery) {
      setAuthModalMode('reset');
      setAuthModalOpen(true);
    }
  }, [isPasswordRecovery]);

  // Scroll to top on page change
  const navigateTo = (page: PageId) => {
    if (page === 'login') {
      setAuthModalMode('login');
      setAuthModalOpen(true);
      return;
    }
    if (page === 'signup') {
      setAuthModalMode('signup');
      setAuthModalOpen(true);
      return;
    }
    const targetPath = PAGE_PATHS[page] || '/';
    navigate(targetPath);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenLogin = () => {
    setAuthModalMode('login');
    setAuthModalOpen(true);
  };

  const handleOpenSignup = () => {
    setAuthModalMode('signup');
    setAuthModalOpen(true);
  };

  const handleAuthSuccess = (email: string) => {
    navigate(PAGE_PATHS.dashboard);
  };

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setIsAddEditModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setIsAddEditModalOpen(true);
  };

  const handleSaveProduct = (productData: any) => {
    if (editingProduct) {
      updateProduct(editingProduct.id, productData);
    } else {
      addProduct(productData);
    }
  };

  const handleShopNowClick = (prod: Product) => {
    recordClick(prod.id);
  };

  return (
    <div className="min-h-screen bg-[#0c0722] text-slate-100 flex flex-col font-sans selection:bg-pink-500 selection:text-white relative">
      {/* Supabase Connection Status Bar (Development Interface) */}
      <SupabaseDevStatusBar />

      {/* Toast Notification Container */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#1b1046] border border-pink-500/80 shadow-2xl text-xs font-semibold text-white">
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-pink-400 shrink-0" />}
            <span>{toast.message}</span>
            <button
              onClick={hideToast}
              className="ml-2 text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Top Banner Notice if logged in with Supabase */}
      {user && (
        <aside aria-label="Authenticated session" className="bg-gradient-to-r from-pink-600 via-purple-700 to-indigo-800 py-1.5 px-4 text-center text-xs font-bold text-white flex items-center justify-center gap-3 shadow-md">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              Logged in as <strong className="underline underline-offset-2">{profile?.full_name || user.email}</strong> (VERIFIED SELLER)
            </span>
          </div>
          <button
            onClick={() => navigateTo('dashboard')}
            className="underline text-[11px] text-pink-200 hover:text-white cursor-pointer font-bold"
          >
            Seller Dashboard
          </button>
          <span>•</span>
          <button
            onClick={() => navigateTo('admin')}
            className="underline text-[11px] text-amber-200 hover:text-white cursor-pointer font-bold flex items-center gap-1"
          >
            <ShieldCheck className="w-3 h-3 text-amber-300" />
            <span>Super Admin Portal</span>
          </button>
          <span>•</span>
          <button
            onClick={async () => {
              await signOut();
              navigateTo('home');
            }}
            className="underline text-[11px] text-pink-200 hover:text-rose-300 cursor-pointer font-bold"
          >
            Log Out
          </button>
        </aside>
      )}

      {/* Header */}
      <Header
        currentPage={currentPage}
        onNavigate={navigateTo}
        onOpenLogin={handleOpenLogin}
        onOpenSignup={handleOpenSignup}
        onOpenSearch={() => navigateTo('marketplace')}
      />

      {/* Main Page Body */}
      <main className="flex-1">
        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                onNavigate={navigateTo}
                onOpenProductModal={(p) => setSelectedProduct(p)}
                onOpenSignup={handleOpenSignup}
                onOpenLogin={handleOpenLogin}
              />
            }
          />
          <Route
            path="/marketplace"
            element={
              <MarketplacePage
                onOpenProductModal={(p) => setSelectedProduct(p)}
                onNavigate={navigateTo}
                onOpenSignup={handleOpenSignup}
              />
            }
          />
          <Route
            path="/dashboard"
            element={
              <SellerDashboardPage
                onNavigate={navigateTo}
                onOpenProductModal={(p) => setSelectedProduct(p)}
                onOpenAddModal={handleOpenAddModal}
                onOpenEditModal={handleOpenEditModal}
              />
            }
          />
          <Route
            path="/admin"
            element={
              <AdminDashboardPage
                onNavigate={navigateTo}
                onOpenProductModal={(p) => setSelectedProduct(p)}
              />
            }
          />
          <Route
            path="/how-it-works"
            element={
              <HowItWorksPage
                onNavigate={navigateTo}
                onOpenSignup={handleOpenSignup}
              />
            }
          />
          <Route
            path="/directory"
            element={
              <DirectoryPage
                onNavigate={navigateTo}
                onOpenProductModal={(p) => setSelectedProduct(p)}
                onOpenSignup={handleOpenSignup}
              />
            }
          />
          <Route
            path="/guarantee"
            element={
              <GuaranteePage
                onNavigate={navigateTo}
                onOpenSignup={handleOpenSignup}
              />
            }
          />
          <Route
            path="/sellers"
            element={
              <ForSellersPage
                onNavigate={navigateTo}
                onOpenSignup={handleOpenSignup}
              />
            }
          />
          <Route
            path="/affiliates"
            element={
              <ForAffiliatesPage
                onNavigate={navigateTo}
                onOpenSignup={handleOpenSignup}
              />
            }
          />
          <Route
            path="/about"
            element={
              <AboutPage
                onNavigate={navigateTo}
                onOpenSignup={handleOpenSignup}
              />
            }
          />
          <Route
            path="/contact"
            element={<ContactPage onNavigate={navigateTo} />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Footer */}
      <Footer onNavigate={navigateTo} />

      {/* Product Details & Simulated Checkout Modal */}
      <ProductModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onOpenSignup={handleOpenSignup}
        onShopNowClick={handleShopNowClick}
      />

      {/* Add / Edit Product Modal */}
      <AddEditProductModal
        isOpen={isAddEditModalOpen}
        onClose={() => setIsAddEditModalOpen(false)}
        onSave={handleSaveProduct}
        editingProduct={editingProduct}
      />

      {/* Auth Modal (Login / Sign Up) */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authModalMode}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* PayU Hosted Checkout Modal for Lifetime Seller Membership (₹999) */}
      <PayUCheckoutModal onSuccessRedirect={() => navigateTo('dashboard')} />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ProductProvider>
          <HybridAffiliateProvider>
            <WalletProvider>
              <AdminProvider>
                <PayUMembershipProvider>
                  <AppContent />
                </PayUMembershipProvider>
              </AdminProvider>
            </WalletProvider>
          </HybridAffiliateProvider>
        </ProductProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
