/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
  useParams
} from 'react-router-dom';
import { PageId, Product, UserRole } from './types';
import { ProductProvider, useProducts } from './context/ProductContext';
import { AuthProvider, useAuth, OAUTH_REDIRECT_PENDING_KEY } from './context/AuthContext';
import { HybridAffiliateProvider, useHybridAffiliate } from './context/HybridAffiliateContext';
import { WalletProvider } from './context/WalletContext';
import { AdminProvider } from './context/AdminContext';
import { PayUMembershipProvider, usePayUMembership } from './context/PayUMembershipContext';
import { ReferralProvider, useReferrals } from './context/ReferralContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { MarketplacePage } from './pages/MarketplacePage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { AffiliateDashboardPage } from './pages/AffiliateDashboardPage';
import { SellerDashboardPage } from './pages/SellerDashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { LoginPage } from './pages/LoginPage';
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
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { validateSafeUrl } from './lib/tracking';

const PAGE_PATHS: Record<PageId, string> = {
  home: '/',
  marketplace: '/marketplace',
  'product-detail': '/marketplace',
  affiliate: '/affiliate',
  'affiliate-auth': '/affiliate/auth',
  'affiliate-dashboard': '/affiliate/dashboard',
  seller: '/seller',
  'seller-auth': '/seller/auth',
  'seller-dashboard': '/seller/dashboard',
  login: '/login',
  signup: '/signup',
  'admin-login': '/admin-login',
  admincore: '/admincore',
  admin: '/admincore',
  dashboard: '/dashboard',
  'how-it-works': '/how-it-works',
  directory: '/directory',
  guarantee: '/guarantee',
  sellers: '/sellers',
  affiliates: '/affiliates',
  about: '/about',
  contact: '/contact'
};

const PATH_TO_PAGE: Record<string, PageId> = {
  '/': 'home',
  '/marketplace': 'marketplace',
  '/affiliate': 'affiliate',
  '/affiliate/auth': 'affiliate-auth',
  '/affiliate/dashboard': 'affiliate-dashboard',
  '/affiliates': 'affiliates',
  '/seller': 'seller',
  '/seller/auth': 'seller-auth',
  '/seller/dashboard': 'seller-dashboard',
  '/sellers': 'sellers',
  '/login': 'login',
  '/signup': 'signup',
  '/admin-login': 'admin-login',
  '/admincore': 'admincore',
  '/admin': 'admincore',
  '/dashboard': 'dashboard',
  '/how-it-works': 'how-it-works',
  '/directory': 'directory',
  '/guarantee': 'guarantee',
  '/about': 'about',
  '/contact': 'contact'
};

const ProductDetailRouteWrapper: React.FC<{
  onNavigate: (page: PageId) => void;
  onOpenAffiliateSignup: () => void;
}> = ({ onNavigate, onOpenAffiliateSignup }) => {
  const { id } = useParams<{ id: string }>();
  return (
    <ProductDetailPage
      productId={id || ''}
      onNavigate={onNavigate}
      onOpenAffiliateSignup={onOpenAffiliateSignup}
    />
  );
};

const RequireAuth: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const { showToast } = useProducts();

  useEffect(() => {
    if (!isLoading && !user) {
      showToast('Please sign in or register free to access the ClickBarry Marketplace.', 'info');
    }
  }, [isLoading, user, showToast]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-[#0c0722]">
        <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const DashboardRedirect: React.FC = () => {
  const { user, role, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-[#0c0722]">
        <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (role === 'admin') {
    return <Navigate to="/admincore" replace />;
  }
  if (role === 'seller') {
    return <Navigate to="/seller/dashboard" replace />;
  }
  return <Navigate to="/affiliate/dashboard" replace />;
};

function AppContent() {
  const { user, profile, role, isLoading, isPasswordRecovery, oauthError, clearOAuthError } = useAuth();
  const { refreshProducts, fetchSellerProducts, recordClick, showToast, toast, hideToast } = useProducts();
  const { resolveAndTrackClick } = useHybridAffiliate();
  const { isLifetimeSeller, isLoading: isMembershipLoading, openCheckout } = usePayUMembership();
  const { captureReferralCodeFromUrl } = useReferrals();
  const location = useLocation();
  const navigate = useNavigate();

  const normalizedPath = location.pathname !== '/' ? location.pathname.replace(/\/+$/, '') : '/';
  const currentPage: PageId = normalizedPath.startsWith('/product/')
    ? 'product-detail'
    : PATH_TO_PAGE[normalizedPath] || 'home';

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup' | 'forgot' | 'reset'>('login');
  const [authDefaultRole, setAuthDefaultRole] = useState<'affiliate' | 'seller'>('affiliate');

  const trackedSlugRef = useRef<string | null>(null);

  // Capture ?ref=REF_CODE across any landing route
  useEffect(() => {
    captureReferralCodeFromUrl();
  }, [location.search, captureReferralCodeFromUrl]);

  // Public incoming affiliate tracking link clicks: ?cb_trk=...
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const trackingSlug = urlParams.get('cb_trk')?.trim();
    if (!trackingSlug || trackedSlugRef.current === trackingSlug) return;

    trackedSlugRef.current = trackingSlug;

    resolveAndTrackClick(trackingSlug).then((res) => {
      if (res.success && res.targetUrl) {
        const { isValid, sanitizedUrl } = validateSafeUrl(res.targetUrl);
        if (isValid && sanitizedUrl) {
          window.location.href = sanitizedUrl;
        }
      }
    });
  }, [location.search, resolveAndTrackClick]);

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

  // Surface any Google OAuth callback error on return to origin
  useEffect(() => {
    if (oauthError) {
      showToast(oauthError, 'error');
      clearOAuthError();
    }
  }, [oauthError, showToast, clearOAuthError]);

  // Redirect authenticated Google OAuth users to their saved role dashboard
  useEffect(() => {
    if (typeof window === 'undefined' || isLoading || !user || !role) return;
    let isOAuthReturn = false;
    try {
      isOAuthReturn = localStorage.getItem(OAUTH_REDIRECT_PENDING_KEY) === '1';
    } catch {}

    if (!isOAuthReturn) return;

    try {
      localStorage.removeItem(OAUTH_REDIRECT_PENDING_KEY);
    } catch {}

    // Clean any residual OAuth query params (?code=...) on origin
    if (window.location.search.includes('code=')) {
      window.history.replaceState(null, '', normalizedPath);
    }

    const displayName = profile?.full_name || user.email?.split('@')[0] || 'Member';
    showToast(`Signed in with Google as ${displayName}`, 'success');

    if (role === 'admin') {
      navigate('/admincore', { replace: true });
    } else if (role === 'seller') {
      navigate('/seller/dashboard', { replace: true });
      if (!isLifetimeSeller) {
        try {
          sessionStorage.setItem(`cb_prompt_seller_checkout_${user.id}`, '1');
        } catch {}
      }
    } else {
      navigate('/affiliate/dashboard', { replace: true });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [isLoading, user, role, isLifetimeSeller, profile, normalizedPath, navigate, showToast]);

  // Immediately prompt ₹999 Lifetime Access popup once after Seller signup/login when payment is not active
  useEffect(() => {
    if (typeof window === 'undefined' || isLoading || isMembershipLoading || !user || role !== 'seller' || isLifetimeSeller) {
      return;
    }
    const promptKey = `cb_prompt_seller_checkout_${user.id}`;
    const shownKey = `cb_checkout_auto_prompted_${user.id}`;
    try {
      const shouldPrompt = sessionStorage.getItem(promptKey) === '1';
      const alreadyShown = sessionStorage.getItem(shownKey) === '1';
      if ((shouldPrompt || normalizedPath === '/seller/dashboard') && !alreadyShown) {
        sessionStorage.removeItem(promptKey);
        sessionStorage.setItem(shownKey, '1');
        openCheckout();
      }
    } catch {}
  }, [isLoading, isMembershipLoading, user, role, isLifetimeSeller, normalizedPath, openCheckout]);

  const navigateTo = (page: PageId) => {
    const targetPath = PAGE_PATHS[page] || '/';
    navigate(targetPath);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openProductDetail = (product: Product) => {
    navigate(`/product/${product.id}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenLogin = () => {
    setAuthModalMode('login');
    setAuthModalOpen(true);
  };

  const handleOpenSignup = (defaultRole: 'affiliate' | 'seller' = 'affiliate') => {
    setAuthDefaultRole(defaultRole);
    setAuthModalMode('signup');
    setAuthModalOpen(true);
  };

  const handleAuthSuccess = (_email: string, resolvedRole?: UserRole) => {
    const targetRole = resolvedRole || role;
    if (targetRole === 'admin') {
      navigate('/admincore');
    } else if (targetRole === 'seller') {
      if (user?.id) {
        try {
          sessionStorage.setItem(`cb_prompt_seller_checkout_${user.id}`, '1');
        } catch {}
      }
      navigate('/seller/dashboard');
    } else {
      navigate('/affiliate/dashboard');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setIsAddEditModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setIsAddEditModalOpen(true);
  };

  // AddEditProductModal handles addProduct/updateProduct internally; sync state here
  const handleSaveProduct = async () => {
    await refreshProducts();
    if (user?.id) {
      await fetchSellerProducts(user.id);
    }
  };

  const handleShopNowClick = (prod: Product) => {
    recordClick(prod.id);
  };

  return (
    <div className="min-h-screen bg-[#0c0722] text-slate-100 flex flex-col font-sans selection:bg-pink-500 selection:text-white relative">
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
              aria-label="Dismiss notification"
              className="ml-2 text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Clean Public Header (Zero AdminCore references) */}
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
                onOpenProductDetail={openProductDetail}
                onOpenSignup={handleOpenSignup}
                onOpenLogin={handleOpenLogin}
              />
            }
          />

          <Route
            path="/marketplace"
            element={
              <RequireAuth>
                <MarketplacePage
                  onOpenProductModal={(p) => setSelectedProduct(p)}
                  onOpenProductDetail={openProductDetail}
                  onNavigate={navigateTo}
                  onOpenSignup={handleOpenSignup}
                />
              </RequireAuth>
            }
          />

          <Route
            path="/product/:id"
            element={
              <RequireAuth>
                <ProductDetailRouteWrapper
                  onNavigate={navigateTo}
                  onOpenAffiliateSignup={() => handleOpenSignup('affiliate')}
                />
              </RequireAuth>
            }
          />

          {/* Affiliate Routes */}
          <Route
            path="/affiliate"
            element={
              <ForAffiliatesPage
                onNavigate={navigateTo}
                onOpenSignup={() => handleOpenSignup('affiliate')}
              />
            }
          />
          <Route
            path="/affiliate/auth"
            element={
              <ForAffiliatesPage
                onNavigate={navigateTo}
                onOpenSignup={() => handleOpenSignup('affiliate')}
              />
            }
          />
          <Route
            path="/affiliates"
            element={
              <ForAffiliatesPage
                onNavigate={navigateTo}
                onOpenSignup={() => handleOpenSignup('affiliate')}
              />
            }
          />
          <Route
            path="/affiliate/dashboard"
            element={
              <AffiliateDashboardPage
                onNavigate={navigateTo}
                onOpenProductModal={(p) => setSelectedProduct(p)}
                onOpenProductDetail={openProductDetail}
              />
            }
          />

          {/* Seller Routes */}
          <Route
            path="/seller"
            element={
              <ForSellersPage
                onNavigate={navigateTo}
                onOpenSignup={() => handleOpenSignup('seller')}
              />
            }
          />
          <Route
            path="/seller/auth"
            element={
              <ForSellersPage
                onNavigate={navigateTo}
                onOpenSignup={() => handleOpenSignup('seller')}
              />
            }
          />
          <Route
            path="/sellers"
            element={
              <ForSellersPage
                onNavigate={navigateTo}
                onOpenSignup={() => handleOpenSignup('seller')}
              />
            }
          />
          <Route
            path="/seller/dashboard"
            element={
              <SellerDashboardPage
                onNavigate={navigateTo}
                onOpenProductModal={(p) => setSelectedProduct(p)}
                onOpenProductDetail={openProductDetail}
                onOpenAddModal={handleOpenAddModal}
                onOpenEditModal={handleOpenEditModal}
              />
            }
          />

          {/* Dedicated Auth Routes */}
          <Route
            path="/login"
            element={<LoginPage onNavigate={navigateTo} initialAuthTab="login" />}
          />
          <Route
            path="/signup"
            element={<LoginPage onNavigate={navigateTo} initialAuthTab="signup" />}
          />

          {/* Legacy /dashboard role redirect */}
          <Route path="/dashboard" element={<DashboardRedirect />} />

          {/* Private AdminCore Routes (Never linked in public UI) */}
          <Route
            path="/admin-login"
            element={<AdminLoginPage onNavigate={navigateTo} />}
          />
          <Route
            path="/admincore"
            element={
              <AdminDashboardPage
                onNavigate={navigateTo}
                onOpenProductModal={(p) => setSelectedProduct(p)}
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

          {/* Info & Marketplace Supporting Routes */}
          <Route
            path="/how-it-works"
            element={
              <HowItWorksPage
                onNavigate={navigateTo}
                onOpenSignup={() => handleOpenSignup('affiliate')}
              />
            }
          />
          <Route
            path="/directory"
            element={
              <RequireAuth>
                <DirectoryPage
                  onNavigate={navigateTo}
                  onOpenProductModal={(p) => setSelectedProduct(p)}
                  onOpenProductDetail={openProductDetail}
                  onOpenSignup={handleOpenSignup}
                />
              </RequireAuth>
            }
          />
          <Route
            path="/guarantee"
            element={
              <GuaranteePage
                onNavigate={navigateTo}
                onOpenSignup={() => handleOpenSignup('affiliate')}
              />
            }
          />
          <Route
            path="/about"
            element={
              <AboutPage
                onNavigate={navigateTo}
                onOpenSignup={() => handleOpenSignup('affiliate')}
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

      {/* Clean Public Footer (Zero AdminCore references) */}
      <Footer onNavigate={navigateTo} />

      {/* Product Details Quick Modal */}
      <ProductModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onOpenSignup={() => handleOpenSignup('affiliate')}
        onShopNowClick={handleShopNowClick}
        onViewFullPage={(p) => {
          setSelectedProduct(null);
          openProductDetail(p);
        }}
      />

      {/* Add / Edit Product Modal (Seller Submission) */}
      <AddEditProductModal
        isOpen={isAddEditModalOpen}
        onClose={() => setIsAddEditModalOpen(false)}
        onSave={handleSaveProduct}
        editingProduct={editingProduct}
      />

      {/* Auth Modal (Login / Sign Up / Reset) */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authModalMode}
        defaultRole={authDefaultRole}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* PayU Hosted Checkout Modal (Gateway currently disabled until PayU activation) */}
      <PayUCheckoutModal onSuccessRedirect={() => navigateTo('seller-dashboard')} />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ReferralProvider>
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
        </ReferralProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
