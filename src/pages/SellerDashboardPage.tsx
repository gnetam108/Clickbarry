import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Product, PageId, ExternalAffiliateProduct, AffiliateLink, WithdrawalRequest } from '../types';
import { useProducts, SellerAnalytics } from '../context/ProductContext';
import { useAuth } from '../context/AuthContext';
import { useHybridAffiliate } from '../context/HybridAffiliateContext';
import { useWallet } from '../context/WalletContext';
import { usePayUMembership } from '../context/PayUMembershipContext';
import { AddExternalProductModal } from '../components/AddExternalProductModal';
import { WithdrawalRequestModal } from '../components/WithdrawalRequestModal';
import { AdminProcessPayoutModal } from '../components/AdminProcessPayoutModal';
import {
  PackagePlus,
  Eye,
  MousePointerClick,
  TrendingUp,
  Package,
  Search,
  Edit2,
  Trash2,
  ExternalLink,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Lock,
  LogOut,
  User,
  ShieldCheck,
  RefreshCw,
  Globe,
  FileText,
  Link2,
  Copy,
  Check,
  DollarSign,
  CreditCard,
  Building2,
  Layers,
  ArrowUpRight,
  Info,
  PlusCircle,
  X,
  Wallet,
  Clock,
  RotateCcw,
  Smartphone,
  CheckCircle,
  XCircle,
  Bell,
  Settings,
  Sliders
} from 'lucide-react';

interface SellerDashboardPageProps {
  onNavigate: (page: PageId) => void;
  onOpenProductModal: (product: Product) => void;
  onOpenAddModal: () => void;
  onOpenEditModal: (product: Product) => void;
}

export const SellerDashboardPage: React.FC<SellerDashboardPageProps> = ({
  onNavigate,
  onOpenProductModal,
  onOpenAddModal,
  onOpenEditModal
}) => {
  const { user, profile, isLoading: isAuthLoading, signOut } = useAuth();
  const {
    products,
    sellerProducts,
    fetchSellerProducts,
    fetchSellerAnalytics,
    deleteProduct,
    showToast
  } = useProducts();

  const {
    affiliateLinks,
    externalProducts,
    adminProducts,
    deleteExternalProduct,
    copyLinkToClipboard,
    totalOutboundClicks,
    recentClicks,
    commissionRecords,
    verifiedSalesCount,
    totalConfirmedCommission,
    addManualSaleRecord
  } = useHybridAffiliate();

  const {
    wallet,
    myWithdrawals,
    allWithdrawals,
    ledgerEntries,
    notifications,
    unreadNotificationCount,
    markNotificationRead,
    markAllNotificationsRead,
    settings,
    updateSettings,
    creditApprovedCommission
  } = useWallet();

  const { isLifetimeSeller, openCheckout } = usePayUMembership();

  const handleListProductClick = () => {
    if (!isLifetimeSeller) {
      showToast('Activate ₹999 Lifetime Seller Membership with PayU to list digital products.', 'info');
      openCheckout();
      return;
    }
    onOpenAddModal();
  };

  // Tab State:
  // - 'wallet': Phase 5 Affiliate Wallet Dashboard & History
  // - 'admin-payouts': Phase 5 Admin Payout Management & Settings
  // - 'marketplace': Browse & Promote ClickBarry Marketplace products
  // - 'my-links': Method A generated affiliate tracking links
  // - 'my-external': Method B affiliate's own external affiliate products
  // - 'admin-external': Admin External Network Product Management
  // - 'clicks': Real Click Tracking audit log
  // - 'commissions': Verified Sales & Commissions
  const [activeTab, setActiveTab] = useState<
    'wallet' | 'admin-payouts' | 'marketplace' | 'my-links' | 'my-external' | 'admin-external' | 'clicks' | 'commissions'
  >('wallet');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [payoutFilterStatus, setPayoutFilterStatus] = useState<string>('all');
  const [payoutSearchQuery, setPayoutSearchQuery] = useState('');
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Phase 5 Modals
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
  const [adminSelectedPayout, setAdminSelectedPayout] = useState<WithdrawalRequest | null>(null);
  const [showAdminSettingsModal, setShowAdminSettingsModal] = useState(false);

  // External product modal state
  const [isExtModalOpen, setIsExtModalOpen] = useState(false);
  const [isAdminExtModal, setIsAdminExtModal] = useState(false);
  const [editingExtProduct, setEditingExtProduct] = useState<ExternalAffiliateProduct | null>(null);

  // Delete product confirmation
  const [deleteConfirmProduct, setDeleteConfirmProduct] = useState<Product | null>(null);
  const [deleteConfirmExt, setDeleteConfirmExt] = useState<ExternalAffiliateProduct | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Manual sale record modal state
  const [showManualSaleModal, setShowManualSaleModal] = useState(false);
  const [manualSaleProdId, setManualSaleProdId] = useState('');
  const [manualSaleAmount, setManualSaleAmount] = useState(499);
  const [manualOrderRef, setManualOrderRef] = useState('');

  // Seller Analytics State
  const [analytics, setAnalytics] = useState<SellerAnalytics>({
    totalProducts: 0,
    publishedProducts: 0,
    draftProducts: 0,
    totalViews: 0,
    totalClicks: 0,
    ctr: '0.0%',
    perProduct: {}
  });
  const [isFetchingData, setIsFetchingData] = useState(false);

  const loadDashboardData = useCallback(async () => {
    if (!user) return;
    setIsFetchingData(true);
    try {
      const [prods, stats] = await Promise.all([
        fetchSellerProducts(user.id),
        fetchSellerAnalytics(user.id)
      ]);
      setAnalytics(stats);
    } catch (err) {
      console.warn('Dashboard data fetch error:', err);
    } finally {
      setIsFetchingData(false);
    }
  }, [user, fetchSellerProducts, fetchSellerAnalytics]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user, loadDashboardData]);

  // Copy tracking link helper
  const handleCopyLink = async (link: AffiliateLink) => {
    const success = await copyLinkToClipboard(link);
    if (success) {
      setCopiedSlug(link.uniqueTrackingSlug);
      showToast('Affiliate tracking link copied to clipboard!', 'success');
      setTimeout(() => setCopiedSlug(null), 2500);
    } else {
      showToast('Could not copy link', 'error');
    }
  };

  const handleCopyRawUrl = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedSlug(id);
      showToast('Destination URL copied to clipboard!', 'success');
      setTimeout(() => setCopiedSlug(null), 2500);
    } catch {
      showToast('Could not copy link', 'error');
    }
  };

  // Handle manual sale confirmation by seller
  const handleCreateManualSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const commAmount = Math.round(manualSaleAmount * 0.4); // 40% commission
    await addManualSaleRecord({
      affiliateId: user.id,
      productId: manualSaleProdId || undefined,
      orderReference: manualOrderRef.trim() || `CB-ORD-${Math.floor(10000 + Math.random() * 90000)}`,
      saleAmount: Number(manualSaleAmount),
      commissionAmount: commAmount,
      networkName: 'ClickBarry Marketplace (Seller Confirmed)',
      verificationSource: 'seller_confirmed',
      status: 'verified',
      notes: 'Sale manually verified and confirmed by Seller.'
    });

    setShowManualSaleModal(false);
    setManualOrderRef('');
    showToast('Sale record verified and commission credited!', 'success');
  };

  // 1. Loading screen while Supabase session is verified
  if (isAuthLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-purple-800 border-t-pink-500 animate-spin" />
        <p className="text-sm text-slate-300 font-medium">Verifying Supabase Affiliate Authentication...</p>
      </div>
    );
  }

  // 2. Protected Gate for Unauthenticated Visitors
  if (!user) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full bg-[#130b30] border border-purple-800/80 rounded-3xl p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-pink-600/20 rounded-full blur-2xl pointer-events-none" />

          <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-purple-700/60 flex items-center justify-center text-pink-400">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-pink-400">Protected Affiliate Portal</span>
            <h2 className="text-2xl font-black text-white">Affiliate Login Required</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Log in to manage your affiliate tracking links, add external affiliate products (Amazon, ClickBank, Digistore24), view real outbound clicks, and track verified commissions.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={() => onNavigate('login')}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold text-sm shadow-lg shadow-pink-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <User className="w-4 h-4" />
              <span>Log In to Affiliate Account</span>
            </button>

            <button
              onClick={() => onNavigate('signup')}
              className="w-full py-3 rounded-xl bg-[#1d1245] hover:bg-[#28185f] text-slate-200 hover:text-white border border-purple-800 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Create Free Affiliate Account</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const sellerDisplayName = profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Affiliate Partner';

  return (
    <div className="min-h-screen bg-[#0d0725] text-slate-100 py-10 px-4 sm:px-6 lg:px-8 space-y-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Strip with Hybrid Affiliate Identity */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#140b33] rounded-3xl p-6 sm:p-8 border border-purple-800/60 shadow-xl">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/20 text-pink-300 text-xs font-bold uppercase tracking-wider border border-pink-500/40">
                <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                Hybrid Affiliate System Active
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] bg-purple-900/60 text-purple-200 px-2.5 py-0.5 rounded-full font-mono font-semibold border border-purple-700">
                Affiliate ID: {user.id.substring(0, 8)}...
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full font-bold">
                Method A &amp; B Ready
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Affiliate Dashboard — {sellerDisplayName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Logged in as <strong className="text-pink-300">{user.email}</strong> • Promote marketplace products, add external affiliate links, track outbound clicks, and manage verified commissions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigate('admin')}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-pink-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-xs shadow-lg shadow-pink-600/30 flex items-center gap-1.5 cursor-pointer"
              title="Open Super Admin Platform Management"
            >
              <ShieldCheck className="w-4 h-4 text-white" />
              <span>Admin Portal</span>
            </button>

            <button
              onClick={loadDashboardData}
              disabled={isFetchingData}
              title="Refresh live data from database"
              className="p-2.5 rounded-xl bg-[#1d1245] hover:bg-[#28185f] text-slate-300 hover:text-white border border-purple-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-pink-400 ${isFetchingData ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => {
                setEditingExtProduct(null);
                setIsAdminExtModal(false);
                setIsExtModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-purple-900/70 hover:bg-purple-800 text-slate-100 font-bold text-xs border border-purple-700 flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5 text-pink-400" />
              <span>Add My External Links</span>
            </button>

            {isLifetimeSeller ? (
              <div className="px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Lifetime Seller (₹999 Active)</span>
              </div>
            ) : (
              <button
                onClick={openCheckout}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-pink-600 hover:from-amber-600 hover:to-pink-700 text-white font-extrabold text-xs shadow-md shadow-pink-600/25 flex items-center gap-1.5 cursor-pointer animate-pulse"
                title="Pay ₹999 once for Lifetime Seller Access"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                <span>Unlock Seller Pass (₹999)</span>
              </button>
            )}

            <button
              onClick={handleListProductClick}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold text-xs shadow-lg shadow-pink-600/30 flex items-center gap-2 cursor-pointer"
            >
              <PackagePlus className="w-4 h-4" />
              <span>List Product</span>
            </button>

            <button
              onClick={async () => {
                await signOut();
                onNavigate('home');
              }}
              className="p-2.5 rounded-xl bg-red-950/50 hover:bg-red-900/60 text-red-300 hover:text-white border border-red-800/80 transition-colors cursor-pointer"
              title="Log out"
            >
              <LogOut className="w-4 h-4 text-red-400" />
            </button>
          </div>
        </div>

        {/* Real Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Total Outbound Link Clicks */}
          <div className="bg-[#140b33] p-6 rounded-2xl border border-purple-900/60 shadow-lg flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                Total Link Clicks
              </span>
              <p className="text-3xl font-black text-pink-400 mt-1 tabular-nums">
                {totalOutboundClicks + analytics.totalClicks}
              </p>
              <span className="text-[11px] text-slate-400 font-semibold mt-1 block">
                Outbound affiliate redirects
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-pink-500/20 text-pink-400 flex items-center justify-center shrink-0">
              <MousePointerClick className="w-6 h-6" />
            </div>
          </div>

          {/* Generated Affiliate Links */}
          <div className="bg-[#140b33] p-6 rounded-2xl border border-purple-900/60 shadow-lg flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                Active Tracking Links
              </span>
              <p className="text-3xl font-black text-white mt-1 tabular-nums">
                {affiliateLinks.length}
              </p>
              <span className="text-[11px] text-emerald-400 font-semibold mt-1 block">
                Method A marketplace links
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
              <Link2 className="w-6 h-6" />
            </div>
          </div>

          {/* Verified Sales */}
          <div className="bg-[#140b33] p-6 rounded-2xl border border-purple-900/60 shadow-lg flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                Verified Sales
              </span>
              <p className="text-3xl font-black text-emerald-400 mt-1 tabular-nums">
                {verifiedSalesCount}
              </p>
              <span className="text-[11px] text-emerald-400/90 font-semibold mt-1 block">
                Confirmed purchases
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          {/* Total Confirmed Commission */}
          <div className="bg-[#140b33] p-6 rounded-2xl border border-purple-900/60 shadow-lg flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                Confirmed Commission
              </span>
              <p className="text-3xl font-black text-white mt-1 tabular-nums">
                ₹{totalConfirmedCommission.toLocaleString()}
              </p>
              <span className="text-[11px] text-slate-400 font-semibold mt-1 block">
                Payable via UPI / Bank
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Dashboard Navigation Tabs */}
        <div className="bg-[#140b33] rounded-2xl p-2 border border-purple-900/60 flex flex-wrap gap-1.5 overflow-x-auto">
          {/* Phase 5 Wallet Tab */}
          <button
            onClick={() => setActiveTab('wallet')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'wallet'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-300 hover:text-white hover:bg-[#1f144d]'
            }`}
          >
            <Wallet className="w-3.5 h-3.5 text-emerald-300" />
            <span>Affiliate Wallet &amp; Payouts (₹{wallet.availableBalance})</span>
          </button>

          {/* Phase 5 Admin Payout Management Tab */}
          <button
            onClick={() => setActiveTab('admin-payouts')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'admin-payouts'
                ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-300 hover:text-white hover:bg-[#1f144d]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-pink-400" />
            <span>Admin Payout Management ({allWithdrawals.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('marketplace')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'marketplace'
                ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-md shadow-pink-600/30'
                : 'text-slate-300 hover:text-white hover:bg-[#1f144d]'
            }`}
          >
            🏪 Marketplace ({products.length})
          </button>

          <button
            onClick={() => setActiveTab('my-links')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'my-links'
                ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-md shadow-pink-600/30'
                : 'text-slate-300 hover:text-white hover:bg-[#1f144d]'
            }`}
          >
            🔗 My Affiliate Links ({affiliateLinks.length})
          </button>

          <button
            onClick={() => setActiveTab('my-external')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'my-external'
                ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-md shadow-pink-600/30'
                : 'text-slate-300 hover:text-white hover:bg-[#1f144d]'
            }`}
          >
            📦 My External Products ({externalProducts.filter((p) => !p.isAdminProduct).length})
          </button>

          <button
            onClick={() => setActiveTab('admin-external')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'admin-external'
                ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-md shadow-pink-600/30'
                : 'text-slate-300 hover:text-white hover:bg-[#1f144d]'
            }`}
          >
            ⚙️ Admin External Products ({adminProducts.length})
          </button>

          <button
            onClick={() => setActiveTab('clicks')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'clicks'
                ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-md shadow-pink-600/30'
                : 'text-slate-300 hover:text-white hover:bg-[#1f144d]'
            }`}
          >
            🖱️ Total Link Clicks ({totalOutboundClicks})
          </button>

          <button
            onClick={() => setActiveTab('commissions')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'commissions'
                ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-md shadow-pink-600/30'
                : 'text-slate-300 hover:text-white hover:bg-[#1f144d]'
            }`}
          >
            💰 Sales &amp; Commission ({commissionRecords.length})
          </button>
        </div>

        {/* TAB 1: MARKETPLACE & PROMOTE PRODUCT (METHOD A) */}
        {activeTab === 'marketplace' && (
          <div className="bg-[#140b33] rounded-3xl border border-purple-900/60 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-white">ClickBarry Marketplace Catalog</h3>
                <p className="text-xs text-slate-300">
                  Click <strong>Promote Product</strong> on any approved listing to generate your unique tracking link with SubID support.
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search products to promote..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#1b1046] border border-purple-800 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {products
                .filter((p) => p.title.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((prod) => {
                  const existingLink = affiliateLinks.find((l) => l.productId === prod.id);

                  return (
                    <div
                      key={prod.id}
                      className="bg-[#1b1046] rounded-2xl border border-purple-900/80 p-4 space-y-3 flex flex-col justify-between hover:border-pink-500/60 transition-colors"
                    >
                      <div className="space-y-3">
                        <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900">
                          <img src={prod.image} alt={prod.title} className="w-full h-full object-cover" />
                          <span className="absolute top-2 left-2 bg-black/80 px-2 py-0.5 rounded text-[10px] font-bold text-pink-300">
                            {prod.categoryLabel}
                          </span>
                          <span className="absolute top-2 right-2 bg-emerald-500/90 text-slate-950 px-2 py-0.5 rounded text-[10px] font-black">
                            Earn {prod.commissionRate}%
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-xs text-slate-400 mb-0.5">
                            <span className="truncate">{prod.merchantName || prod.sellerName}</span>
                            <span className="text-white font-black text-sm">₹{prod.price}</span>
                          </div>
                          <h4 className="font-bold text-white text-sm line-clamp-1">{prod.title}</h4>
                          <p className="text-slate-400 text-xs line-clamp-2 mt-1">{prod.description}</p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-purple-900/60 flex items-center justify-between gap-2">
                        {existingLink ? (
                          <button
                            onClick={() => handleCopyLink(existingLink)}
                            className="flex-1 py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900/80 border border-emerald-500/60 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            {copiedSlug === existingLink.uniqueTrackingSlug ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedSlug === existingLink.uniqueTrackingSlug ? 'Copied Tracking Link!' : 'Copy My Tracking Link'}</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => onOpenProductModal(prod)}
                            className="flex-1 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold text-xs shadow-md shadow-pink-600/30 flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Link2 className="w-3.5 h-3.5" />
                            <span>Promote Product</span>
                          </button>
                        )}

                        <button
                          onClick={() => onOpenProductModal(prod)}
                          className="p-2 rounded-xl bg-[#231554] hover:bg-[#2d1b6e] text-slate-300 hover:text-white transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* TAB 2: MY AFFILIATE LINKS (METHOD A) */}
        {activeTab === 'my-links' && (
          <div className="bg-[#140b33] rounded-3xl border border-purple-900/60 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-white">My Generated Affiliate Links</h3>
                <p className="text-xs text-slate-300">
                  Every link generated through Method A. Each link tracks outbound clicks and preserves your unique affiliate ID.
                </p>
              </div>

              <button
                onClick={() => setActiveTab('marketplace')}
                className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Promote New Product</span>
              </button>
            </div>

            {affiliateLinks.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <Link2 className="w-12 h-12 text-slate-500 mx-auto" />
                <h4 className="text-base font-bold text-white">No Affiliate Links Generated Yet</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Browse the marketplace and click "Promote Product" on any digital product to generate your first tracking link.
                </p>
                <button
                  onClick={() => setActiveTab('marketplace')}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold text-xs cursor-pointer shadow-lg shadow-pink-600/30"
                >
                  Browse Marketplace
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-purple-900/60 bg-[#1b1046]/70 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="py-3 px-4">Product</th>
                      <th className="py-3 px-4">Tracking Slug</th>
                      <th className="py-3 px-4">Commission %</th>
                      <th className="py-3 px-4 text-center">Total Clicks</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-900/40 text-xs">
                    {affiliateLinks.map((link) => (
                      <tr key={link.id} className="hover:bg-[#1a0f44]/50 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-bold text-white block truncate max-w-xs">{link.productTitle}</span>
                          <span className="text-[11px] text-slate-400 font-mono truncate max-w-xs block">
                            {link.targetUrl}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-pink-300">
                          {link.uniqueTrackingSlug}
                        </td>
                        <td className="py-3 px-4 font-bold text-emerald-400">
                          {link.commissionRate}%
                        </td>
                        <td className="py-3 px-4 text-center tabular-nums font-bold text-white">
                          {link.clicksCount}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleCopyLink(link)}
                            className="px-3 py-1.5 rounded-lg bg-pink-600/30 hover:bg-pink-600 border border-pink-500 text-pink-200 hover:text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            {copiedSlug === link.uniqueTrackingSlug ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedSlug === link.uniqueTrackingSlug ? 'Copied!' : 'Copy'}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MY EXTERNAL AFFILIATE PRODUCTS (METHOD B) */}
        {activeTab === 'my-external' && (
          <div className="bg-[#140b33] rounded-3xl border border-purple-900/60 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-white">My External Affiliate Products</h3>
                <p className="text-xs text-slate-300">
                  Add products with your authorized affiliate links from <strong>Amazon, ClickBank, Digistore24, or other networks</strong>.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingExtProduct(null);
                  setIsAdminExtModal(false);
                  setIsExtModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-pink-600/30"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add External Affiliate Product</span>
              </button>
            </div>

            {/* Note on External Sales */}
            <div className="p-3.5 rounded-2xl bg-[#1b1046] border border-purple-800 text-xs text-slate-300 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
              <span>
                <strong>Important Notice:</strong> These products use your own authorized affiliate tracking URLs. ClickBarry records all outbound clicks. Final confirmed sales and earnings are reported in your Amazon Associates, ClickBank, or Digistore24 dashboards.
              </span>
            </div>

            {externalProducts.filter((p) => !p.isAdminProduct).length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <Building2 className="w-12 h-12 text-slate-500 mx-auto" />
                <h4 className="text-base font-bold text-white">No External Affiliate Products Added</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Add your first affiliate product from Amazon, ClickBank, or Digistore24 with your unique referral link.
                </p>
                <button
                  onClick={() => {
                    setEditingExtProduct(null);
                    setIsAdminExtModal(false);
                    setIsExtModalOpen(true);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold text-xs cursor-pointer"
                >
                  Add External Product
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {externalProducts
                  .filter((p) => !p.isAdminProduct)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="bg-[#1b1046] rounded-2xl border border-purple-900/80 p-4 space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900">
                          <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                          <span className="absolute top-2 left-2 bg-black/80 px-2 py-0.5 rounded text-[10px] font-bold text-pink-300">
                            {item.networkName}
                          </span>
                          <span className="absolute top-2 right-2 bg-emerald-500 text-slate-950 px-2 py-0.5 rounded text-[10px] font-bold">
                            {item.commissionRate}% Comm.
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-xs text-slate-400 mb-0.5">
                            <span className="font-bold text-white">₹{item.price}</span>
                            <span className="font-semibold text-slate-300">{item.clicksCount} Clicks</span>
                          </div>
                          <h4 className="font-bold text-white text-sm line-clamp-1">{item.title}</h4>
                          <p className="text-slate-400 text-xs line-clamp-2 mt-1">{item.description}</p>
                          <span className="text-[10px] text-pink-400 font-mono block truncate mt-1">
                            {item.affiliateProductUrl}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-purple-900/60 flex items-center justify-between gap-1.5">
                        <button
                          onClick={() => handleCopyRawUrl(item.affiliateProductUrl, item.id)}
                          className="px-3 py-1.5 rounded-lg bg-pink-600/30 hover:bg-pink-600 text-pink-200 hover:text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          {copiedSlug === item.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedSlug === item.id ? 'Copied' : 'Copy'}</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingExtProduct(item);
                              setIsAdminExtModal(false);
                              setIsExtModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-[#241555] hover:bg-[#2e1c6e] text-indigo-300 hover:text-white cursor-pointer"
                            title="Edit Product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmExt(item)}
                            className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-200 cursor-pointer"
                            title="Delete Product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ADMIN EXTERNAL NETWORK PRODUCT MANAGEMENT */}
        {activeTab === 'admin-external' && (
          <div className="bg-[#140b33] rounded-3xl border border-purple-900/60 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold uppercase tracking-wider border border-purple-500/30 mb-1">
                  <span>Admin Section</span>
                </div>
                <h3 className="text-xl font-bold text-white">External Network Product Management</h3>
                <p className="text-xs text-slate-300">
                  Admin products added here from Amazon, ClickBank, Digistore24, or other networks are featured directly in the main ClickBarry Marketplace.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingExtProduct(null);
                  setIsAdminExtModal(true);
                  setIsExtModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-pink-600/20"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add Admin Network Product</span>
              </button>
            </div>

            {adminProducts.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <Building2 className="w-12 h-12 text-slate-500 mx-auto" />
                <h4 className="text-base font-bold text-white">No Admin External Products Listed</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Add verified listings from Amazon Associates, ClickBank, or Digistore24 to populate the main ClickBarry Marketplace.
                </p>
                <button
                  onClick={() => {
                    setEditingExtProduct(null);
                    setIsAdminExtModal(true);
                    setIsExtModalOpen(true);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-xs cursor-pointer"
                >
                  List Admin Network Product
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {adminProducts.map((item) => (
                  <div
                    key={item.id}
                    className="bg-[#1b1046] rounded-2xl border border-purple-900/80 p-4 space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900">
                        <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                        <span className="absolute top-2 left-2 bg-purple-950/90 text-purple-200 border border-purple-700 px-2 py-0.5 rounded text-[10px] font-bold">
                          Admin Verified: {item.networkName}
                        </span>
                        <span className="absolute top-2 right-2 bg-emerald-500 text-slate-950 px-2 py-0.5 rounded text-[10px] font-bold">
                          {item.commissionRate}%
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-0.5">
                          <span className="font-bold text-white">₹{item.price}</span>
                          <span className="font-semibold text-slate-300">{item.clicksCount} Outbound Clicks</span>
                        </div>
                        <h4 className="font-bold text-white text-sm line-clamp-1">{item.title}</h4>
                        <p className="text-slate-400 text-xs line-clamp-2 mt-1">{item.description}</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-purple-900/60 flex items-center justify-between gap-1.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        item.status === 'published' ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-300'
                      }`}>
                        {item.status}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingExtProduct(item);
                            setIsAdminExtModal(true);
                            setIsExtModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-[#241555] hover:bg-[#2e1c6e] text-indigo-300 hover:text-white cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmExt(item)}
                          className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-200 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: TOTAL LINK CLICKS AUDIT LOG */}
        {activeTab === 'clicks' && (
          <div className="bg-[#140b33] rounded-3xl border border-purple-900/60 p-6 space-y-6">
            <div>
              <h3 className="text-xl font-bold text-white">Outbound Affiliate Link Clicks</h3>
              <p className="text-xs text-slate-300">
                Live audit trail of each click through your tracking URLs. These clicks are kept strictly separate from verified sales.
              </p>
            </div>

            {recentClicks.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No outbound link clicks recorded yet. Share your affiliate tracking links to start collecting visitor clicks.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-purple-900/60 bg-[#1b1046]/70 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Network / Source</th>
                      <th className="py-3 px-4">Tracking Slug</th>
                      <th className="py-3 px-4">Destination URL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-900/40 text-xs">
                    {recentClicks.map((click) => (
                      <tr key={click.id} className="hover:bg-[#1a0f44]/50 transition-colors">
                        <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                          {new Date(click.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-bold text-pink-300">
                          {click.networkName}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-300">
                          {click.trackingId}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-400 truncate max-w-xs">
                          {click.destinationUrl}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: VERIFIED SALES & COMMISSIONS */}
        {activeTab === 'commissions' && (
          <div className="bg-[#140b33] rounded-3xl border border-purple-900/60 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-white">Verified Sales &amp; Commission Records</h3>
                <p className="text-xs text-slate-300">
                  Confirmed sales reported by sellers or network webhooks. Clicks alone do not equal verified commissions.
                </p>
              </div>

              <button
                onClick={() => setShowManualSaleModal(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirm Seller Sale</span>
              </button>
            </div>

            {/* Network Reporting Rules Notice */}
            <div className="p-4 rounded-2xl bg-[#1b1046] border border-purple-800 text-xs text-slate-300 space-y-1">
              <span className="font-bold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Affiliate Commission Rules:</span>
              </span>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                • <strong>Seller Products:</strong> Confirmed upon manual seller approval or automated webhook.
                <br />
                • <strong>Amazon &amp; ClickBank Products:</strong> <em>"External Network Reporting Required"</em> — Actual confirmed sales and earnings are verified in your official affiliate network portal.
              </p>
            </div>

            {commissionRecords.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs space-y-2">
                <p>No verified sale records found yet.</p>
                <p className="text-[11px] text-slate-500">
                  When customers complete verified purchases, commission records will be listed here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-purple-900/60 bg-[#1b1046]/70 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="py-3 px-4">Order Ref</th>
                      <th className="py-3 px-4">Network / Source</th>
                      <th className="py-3 px-4">Sale Amount</th>
                      <th className="py-3 px-4">Commission</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-900/40 text-xs">
                    {commissionRecords.map((comm) => (
                      <tr key={comm.id} className="hover:bg-[#1a0f44]/50 transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] font-bold text-white">
                          {comm.orderReference}
                        </td>
                        <td className="py-3 px-4 text-slate-300 font-semibold">
                          {comm.networkName}
                        </td>
                        <td className="py-3 px-4 font-bold text-white">
                          ₹{comm.saleAmount}
                        </td>
                        <td className="py-3 px-4 font-black text-emerald-400">
                          ₹{comm.commissionAmount}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-950 text-emerald-300 border border-emerald-500/50">
                            {comm.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {new Date(comm.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 1: PHASE 5 AFFILIATE WALLET DASHBOARD */}
        {activeTab === 'wallet' && (
          <div className="space-y-6">
            {/* Wallet Header Card */}
            <div className="bg-gradient-to-r from-emerald-950/80 via-[#160d36] to-purple-950/80 rounded-3xl border border-emerald-500/40 p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider border border-emerald-500/40 flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5" />
                    Affiliate Payout Wallet
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Ledger Accounting Active
                  </span>
                </div>
                <h3 className="text-3xl font-black text-white">
                  Available for Withdrawal: <span className="text-emerald-400">₹{wallet.availableBalance.toLocaleString()}</span>
                </h3>
                <p className="text-xs text-slate-300 max-w-xl">
                  {settings.processingInfo}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                <button
                  onClick={() => setIsWithdrawalModalOpen(true)}
                  disabled={wallet.availableBalance < settings.minWithdrawalAmount || !settings.isWithdrawalsEnabled}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Request Withdrawal (Min ₹{settings.minWithdrawalAmount})</span>
                </button>
              </div>
            </div>

            {/* 5 Core Accounting Balance Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="p-4 rounded-2xl bg-[#1b1046] border border-purple-800 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Approved</span>
                <p className="text-2xl font-black text-white">₹{wallet.totalApprovedEarnings.toLocaleString()}</p>
                <span className="text-[10px] text-emerald-400 font-semibold block">Confirmed commissions</span>
              </div>

              <div className="p-4 rounded-2xl bg-[#1b1046] border border-purple-800 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pending Comm.</span>
                <p className="text-2xl font-black text-amber-400">₹{wallet.pendingCommission.toLocaleString()}</p>
                <span className="text-[10px] text-slate-400 font-semibold block">Unconfirmed / reporting</span>
              </div>

              <div className="p-4 rounded-2xl bg-[#1b1046] border border-emerald-500/60 bg-emerald-950/20 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">Available Balance</span>
                <p className="text-2xl font-black text-emerald-400">₹{wallet.availableBalance.toLocaleString()}</p>
                <span className="text-[10px] text-emerald-300 font-semibold block">Eligible to withdraw now</span>
              </div>

              <div className="p-4 rounded-2xl bg-[#1b1046] border border-purple-800 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Reserved in Queue</span>
                <p className="text-2xl font-black text-pink-400">₹{wallet.reservedBalance.toLocaleString()}</p>
                <span className="text-[10px] text-slate-400 font-semibold block">Pending / processing requests</span>
              </div>

              <div className="p-4 rounded-2xl bg-[#1b1046] border border-purple-800 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Paid Out</span>
                <p className="text-2xl font-black text-teal-400">₹{wallet.totalPaid.toLocaleString()}</p>
                <span className="text-[10px] text-teal-300 font-semibold block">Successfully disbursed</span>
              </div>
            </div>

            {/* Notifications Bar if any notifications */}
            {notifications.filter((n) => n.affiliateId === user.id).length > 0 && (
              <div className="bg-[#1b1046] rounded-2xl border border-purple-800 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-pink-400" />
                    <span>Payout Notifications ({unreadNotificationCount} unread)</span>
                  </span>
                  {unreadNotificationCount > 0 && (
                    <button
                      onClick={markAllNotificationsRead}
                      className="text-[11px] text-pink-400 font-bold hover:underline cursor-pointer"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {notifications
                    .filter((n) => n.affiliateId === user.id)
                    .slice(0, 3)
                    .map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => markNotificationRead(notif.id)}
                        className={`p-3 rounded-xl border text-xs transition-colors cursor-pointer flex items-start justify-between gap-3 ${
                          notif.read ? 'bg-[#120a2e]/60 border-purple-900/60 text-slate-400' : 'bg-[#1f134d] border-pink-500/50 text-white'
                        }`}
                      >
                        <div>
                          <span className="font-bold block text-slate-200">{notif.title}</span>
                          <p className="text-[11px] text-slate-300 mt-0.5">{notif.message}</p>
                          {notif.transactionReference && (
                            <span className="text-[10px] text-emerald-400 font-mono block mt-1">
                              Transaction Ref / UTR: {notif.transactionReference}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                          {new Date(notif.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Section: Affiliate Withdrawal History */}
            <div className="bg-[#140b33] rounded-3xl border border-purple-900/60 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-bold text-white">My Withdrawal Requests &amp; Status</h4>
                  <p className="text-xs text-slate-400">
                    Track the lifecycle of your payout requests: Pending → Approved → Processing → Paid.
                  </p>
                </div>
                <button
                  onClick={() => setIsWithdrawalModalOpen(true)}
                  disabled={wallet.availableBalance < settings.minWithdrawalAmount}
                  className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Request Payout</span>
                </button>
              </div>

              {myWithdrawals.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs space-y-2">
                  <Clock className="w-10 h-10 text-slate-500 mx-auto" />
                  <p className="font-bold text-white">No Withdrawal Requests Yet</p>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    When your approved commissions reach ₹{settings.minWithdrawalAmount}, you can submit your UPI ID or Bank details for payout.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-purple-900/60 bg-[#1b1046]/70 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="py-3 px-4">Request ID</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Method &amp; Details</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4">Transaction Ref / UTR</th>
                        <th className="py-3 px-4">Admin Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-900/40 text-xs">
                      {myWithdrawals.map((req) => (
                        <tr key={req.id} className="hover:bg-[#1a0f44]/50 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-pink-300">
                            {req.requestNumber}
                          </td>
                          <td className="py-3 px-4 text-slate-400 text-[11px]">
                            {new Date(req.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 font-black text-white text-sm">
                            ₹{req.amount.toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-200 uppercase text-[11px] block">
                              {req.paymentMethod === 'upi' ? 'UPI' : 'Bank Transfer'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              {req.paymentMethod === 'upi' ? req.upiId : `${req.accountHolderName} • ${req.bankAccountNumber?.slice(-4)}`}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                                req.status === 'paid'
                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500/60'
                                  : req.status === 'processing'
                                  ? 'bg-amber-950 text-amber-300 border-amber-500/60'
                                  : req.status === 'approved'
                                  ? 'bg-blue-950 text-blue-300 border-blue-500/60'
                                  : req.status === 'rejected'
                                  ? 'bg-red-950 text-red-300 border-red-500/60'
                                  : 'bg-purple-950 text-purple-300 border-purple-700'
                              }`}
                            >
                              {req.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-emerald-400">
                            {req.transactionReference || '—'}
                          </td>
                          <td className="py-3 px-4 text-slate-300 text-[11px]">
                            {req.status === 'rejected'
                              ? req.rejectionReason || req.adminRemarks || 'Declined'
                              : req.adminRemarks || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Section: Immutable Wallet Financial Ledger */}
            <div className="bg-[#140b33] rounded-3xl border border-purple-900/60 p-6 space-y-4">
              <div>
                <h4 className="text-lg font-bold text-white">Wallet Financial Ledger Audit</h4>
                <p className="text-xs text-slate-400">
                  Every credit, reservation, release, and disbursement is permanently recorded in the immutable financial ledger.
                </p>
              </div>

              {ledgerEntries.filter((l) => l.affiliateId === user.id).length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No ledger transactions recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-purple-900/60 bg-[#1b1046]/70 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Entry Type</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4">Reference</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-900/40">
                      {ledgerEntries
                        .filter((l) => l.affiliateId === user.id)
                        .map((entry) => (
                          <tr key={entry.id} className="hover:bg-[#1a0f44]/50 transition-colors">
                            <td className="py-3 px-4 text-slate-400 text-[11px]">
                              {new Date(entry.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 font-bold">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  entry.entryType === 'commission_approved'
                                    ? 'bg-emerald-950 text-emerald-300'
                                    : entry.entryType === 'withdrawal_reserved'
                                    ? 'bg-pink-950 text-pink-300'
                                    : entry.entryType === 'withdrawal_paid'
                                    ? 'bg-teal-950 text-teal-300'
                                    : 'bg-amber-950 text-amber-300'
                                }`}
                              >
                                {entry.entryType.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-black text-white">
                              {entry.entryType === 'commission_approved' ? '+' : '-'}₹{entry.amount}
                            </td>
                            <td className="py-3 px-4 text-slate-300 text-[11px] max-w-sm truncate">
                              {entry.description}
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                              {entry.referenceId || '—'}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: PHASE 5 ADMIN PAYOUT MANAGEMENT */}
        {activeTab === 'admin-payouts' && (
          <div className="bg-[#140b33] rounded-3xl border border-purple-900/60 p-6 space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold uppercase tracking-wider border border-purple-500/30 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Admin Section</span>
                </div>
                <h3 className="text-xl font-bold text-white">Affiliate Payout Management</h3>
                <p className="text-xs text-slate-300">
                  Review withdrawal requests, verify UPI/Bank details, and enter UPI Reference IDs / Bank UTR numbers upon manual payment transfer.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAdminSettingsModal(true)}
                  className="px-4 py-2 rounded-xl bg-[#1b1046] hover:bg-[#251662] text-slate-200 border border-purple-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5 text-pink-400" />
                  <span>Payout Settings</span>
                </button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#1b1046] p-3 rounded-2xl border border-purple-800">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Request ID, Affiliate ID, or Email..."
                  value={payoutSearchQuery}
                  onChange={(e) => setPayoutSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#120a2e] border border-purple-800 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-pink-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-semibold">Filter Status:</span>
                <select
                  value={payoutFilterStatus}
                  onChange={(e) => setPayoutFilterStatus(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-[#120a2e] border border-purple-800 text-xs font-bold text-slate-200 cursor-pointer"
                >
                  <option value="all">All Requests</option>
                  <option value="pending">Pending Review</option>
                  <option value="approved">Approved</option>
                  <option value="processing">Processing</option>
                  <option value="paid">Paid</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            {/* Payouts Table */}
            {allWithdrawals.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs space-y-2">
                <ShieldCheck className="w-10 h-10 text-slate-500 mx-auto" />
                <p className="font-bold text-white">No Withdrawal Requests Submitted</p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  When affiliates submit UPI or Bank withdrawal requests, they will appear here for Admin review and manual disbursement.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-purple-900/60 bg-[#1b1046]/70 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="py-3 px-4">Request ID</th>
                      <th className="py-3 px-4">Affiliate</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Payment Method</th>
                      <th className="py-3 px-4">Account Details</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4">Reference / UTR</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-900/40">
                    {allWithdrawals
                      .filter((req) => {
                        const matchStatus = payoutFilterStatus === 'all' || req.status === payoutFilterStatus;
                        const matchSearch =
                          req.requestNumber.toLowerCase().includes(payoutSearchQuery.toLowerCase()) ||
                          req.affiliateId.toLowerCase().includes(payoutSearchQuery.toLowerCase()) ||
                          (req.affiliateEmail && req.affiliateEmail.toLowerCase().includes(payoutSearchQuery.toLowerCase()));
                        return matchStatus && matchSearch;
                      })
                      .map((req) => (
                        <tr key={req.id} className="hover:bg-[#1a0f44]/50 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-pink-300">
                            {req.requestNumber}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-white block">
                              {req.affiliateName || req.affiliateEmail || 'Affiliate'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              ID: {req.affiliateId.slice(0, 8)}...
                            </span>
                          </td>
                          <td className="py-3 px-4 font-black text-white text-sm">
                            ₹{req.amount.toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold uppercase text-[11px] text-slate-300 block">
                              {req.paymentMethod === 'upi' ? 'UPI Transfer' : 'Bank NEFT/IMPS'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px]">
                            {req.paymentMethod === 'upi' ? (
                              <span className="text-pink-300 font-bold">{req.upiId}</span>
                            ) : (
                              <div>
                                <span className="block text-slate-200">{req.accountHolderName}</span>
                                <span className="block text-slate-400 text-[10px]">A/C: {req.bankAccountNumber}</span>
                                <span className="block text-emerald-400 text-[10px]">IFSC: {req.ifscCode}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                                req.status === 'paid'
                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500/60'
                                  : req.status === 'processing'
                                  ? 'bg-amber-950 text-amber-300 border-amber-500/60'
                                  : req.status === 'approved'
                                  ? 'bg-blue-950 text-blue-300 border-blue-500/60'
                                  : req.status === 'rejected'
                                  ? 'bg-red-950 text-red-300 border-red-500/60'
                                  : 'bg-purple-950 text-purple-300 border-purple-700'
                              }`}
                            >
                              {req.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-emerald-400">
                            {req.transactionReference || '—'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setAdminSelectedPayout(req)}
                              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold text-xs shadow cursor-pointer"
                            >
                              Process Payout
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Modal: Process Payout */}
        <AdminProcessPayoutModal
          request={adminSelectedPayout}
          isOpen={Boolean(adminSelectedPayout)}
          onClose={() => setAdminSelectedPayout(null)}
        />

        {/* Modal: Affiliate Request Withdrawal */}
        <WithdrawalRequestModal
          isOpen={isWithdrawalModalOpen}
          onClose={() => setIsWithdrawalModalOpen(false)}
        />

        {/* Modal: Admin Payout Settings */}
        {showAdminSettingsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
            <div className="max-w-md w-full bg-[#130b30] border border-purple-800 rounded-3xl p-6 shadow-2xl space-y-4 text-slate-100">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-white text-base">Configure Payout Settings</h4>
                <button onClick={() => setShowAdminSettingsModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Minimum Withdrawal Amount (₹)</label>
                  <input
                    type="number"
                    value={settings.minWithdrawalAmount}
                    onChange={(e) => updateSettings({ minWithdrawalAmount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-[#1b1046] border border-purple-800 text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Maximum Withdrawal Limit (₹)</label>
                  <input
                    type="number"
                    value={settings.maxWithdrawalAmount}
                    onChange={(e) => updateSettings({ maxWithdrawalAmount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-[#1b1046] border border-purple-800 text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Processing Schedule Notice</label>
                  <textarea
                    rows={2}
                    value={settings.processingInfo}
                    onChange={(e) => updateSettings({ processingInfo: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#1b1046] border border-purple-800 text-white resize-none"
                  />
                </div>

                <div className="p-3 rounded-xl bg-[#1b1046] border border-purple-800 flex items-center justify-between">
                  <span>Enable Withdrawal Requests</span>
                  <input
                    type="checkbox"
                    checked={settings.isWithdrawalsEnabled}
                    onChange={(e) => updateSettings({ isWithdrawalsEnabled: e.target.checked })}
                    className="w-4 h-4 accent-pink-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdminSettingsModal(false)}
                  className="px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Add/Edit External Affiliate Product */}
        <AddExternalProductModal
          isOpen={isExtModalOpen}
          onClose={() => {
            setIsExtModalOpen(false);
            setEditingExtProduct(null);
          }}
          isAdminMode={isAdminExtModal}
          editingProduct={editingExtProduct}
        />

        {/* Modal: Manual Sale Confirmation */}
        {showManualSaleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
            <div className="max-w-md w-full bg-[#130b30] border border-purple-800 rounded-3xl p-6 shadow-2xl space-y-4 text-slate-100">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-white text-base">Manual Sale Confirmation</h4>
                <button onClick={() => setShowManualSaleModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateManualSale} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Order Reference</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CB-ORD-88219"
                    value={manualOrderRef}
                    onChange={(e) => setManualOrderRef(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#1b1046] border border-purple-800 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Sale Amount (₹)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={manualSaleAmount}
                    onChange={(e) => setManualSaleAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#1b1046] border border-purple-800 text-xs text-white"
                  />
                </div>

                <div className="p-3 rounded-xl bg-purple-950/50 border border-purple-800 text-[11px] text-slate-300">
                  Affiliate commission of 40% (₹{Math.round(manualSaleAmount * 0.4)}) will be credited to this affiliate account.
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowManualSaleModal(false)}
                    className="px-4 py-2 rounded-xl bg-purple-900/40 text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                  >
                    Confirm Sale
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Delete External Product Confirmation */}
        {deleteConfirmExt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
            <div className="max-w-md w-full bg-[#130b30] border border-red-500/60 rounded-3xl p-6 shadow-2xl space-y-4 text-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-lg font-black text-white">Delete External Product?</h3>
                <p className="text-xs text-slate-300">
                  Are you sure you want to delete <strong>"{deleteConfirmExt.title}"</strong>?
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmExt(null)}
                  className="flex-1 py-2.5 rounded-xl bg-purple-900/40 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await deleteExternalProduct(deleteConfirmExt.id);
                    setDeleteConfirmExt(null);
                    showToast('External affiliate product removed', 'info');
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
