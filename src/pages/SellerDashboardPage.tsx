import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Product, PageId } from '../types';
import { useProducts, SellerAnalytics } from '../context/ProductContext';
import { useAuth } from '../context/AuthContext';
import { useHybridAffiliate, SellerActivitySummary } from '../context/HybridAffiliateContext';
import { usePayUMembership } from '../context/PayUMembershipContext';
import sellerLaptopImage from '../assets/images/seller_dashboard_laptop_1794019709659.jpg';
import {
  LayoutDashboard,
  PackagePlus,
  Package,
  BarChart3,
  Link2,
  DollarSign,
  User,
  CreditCard,
  LogOut,
  Eye,
  MousePointerClick,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  Edit2,
  Trash2,
  RefreshCw,
  Lock,
  ShieldCheck,
  Menu,
  X,
  TrendingUp,
  ExternalLink,
  AlertTriangle
} from 'lucide-react';

interface SellerDashboardPageProps {
  onNavigate: (page: PageId) => void;
  onOpenProductModal: (product: Product) => void;
  onOpenProductDetail?: (product: Product) => void;
  onOpenAddModal: () => void;
  onOpenEditModal: (product: Product) => void;
}

type SellerTab =
  | 'overview'
  | 'products'
  | 'performance'
  | 'affiliate-activity'
  | 'sales'
  | 'profile'
  | 'membership';

export const SellerDashboardPage: React.FC<SellerDashboardPageProps> = ({
  onNavigate,
  onOpenProductModal,
  onOpenProductDetail,
  onOpenAddModal,
  onOpenEditModal
}) => {
  const { user, profile, role, isLoading: isAuthLoading, signOut } = useAuth();
  const {
    sellerProducts,
    fetchSellerProducts,
    fetchSellerAnalytics,
    deleteProduct,
    showToast
  } = useProducts();
  const { fetchSellerActivity } = useHybridAffiliate();
  const {
    isLifetimeSeller,
    isPaymentGatewayEnabled,
    membershipPayment,
    openCheckout
  } = usePayUMembership();

  const [activeTab, setActiveTab] = useState<SellerTab>('overview');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  const [analytics, setAnalytics] = useState<SellerAnalytics>({
    totalProducts: 0,
    publishedProducts: 0,
    draftProducts: 0,
    pendingProducts: 0,
    approvedProducts: 0,
    rejectedProducts: 0,
    totalViews: 0,
    totalClicks: 0,
    ctr: '0.0%',
    perProduct: {}
  });

  const [activity, setActivity] = useState<SellerActivitySummary>({
    links: [],
    clicks: [],
    commissions: []
  });

  const loadSellerData = useCallback(async () => {
    if (!user) return;
    setIsFetching(true);
    try {
      const [, stats, sellerAct] = await Promise.all([
        fetchSellerProducts(user.id),
        fetchSellerAnalytics(user.id),
        fetchSellerActivity(user.id)
      ]);
      setAnalytics(stats);
      setActivity(sellerAct);
    } catch (err) {
      console.warn('Seller dashboard sync error:', err);
    } finally {
      setIsFetching(false);
    }
  }, [user, fetchSellerProducts, fetchSellerAnalytics, fetchSellerActivity]);

  useEffect(() => {
    if (user && (role === 'seller' || role === 'admin')) {
      loadSellerData();
    }
  }, [user, role, loadSellerData]);

  const filteredProducts = useMemo(() => {
    return sellerProducts.filter((p) => {
      const matchSearch =
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;
      if (statusFilter === 'all') return true;
      return (p.approvalStatus || 'pending') === statusFilter;
    });
  }, [sellerProducts, searchQuery, statusFilter]);

  const totalSalesAmount = useMemo(() => {
    return activity.commissions
      .filter((c) => c.status === 'verified' || c.status === 'paid')
      .reduce((sum, c) => sum + c.saleAmount, 0);
  }, [activity.commissions]);

  const totalAffiliatePayoutsOwed = useMemo(() => {
    return activity.commissions
      .filter((c) => c.status === 'verified' || c.status === 'paid')
      .reduce((sum, c) => sum + c.commissionAmount, 0);
  }, [activity.commissions]);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const res = await deleteProduct(deleteTarget.id);
    setIsDeleting(false);
    if (res.success) {
      setDeleteTarget(null);
      await loadSellerData();
    } else {
      showToast(res.error || 'Could not delete product.', 'error');
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center p-6 space-y-3 bg-[#0c0722]">
        <div className="w-12 h-12 rounded-full border-4 border-purple-800 border-t-pink-500 animate-spin" />
        <p className="text-sm text-slate-300 font-medium">Verifying Seller Account...</p>
      </div>
    );
  }

  // Gate 1: Guest -> Seller login required
  if (!user) {
    return (
      <div className="min-h-[80vh] bg-[#0c0722] flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full bg-[#140b33] border border-purple-800/80 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-400">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-pink-400">
              Creator &amp; Seller Portal
            </span>
            <h1 className="text-2xl font-black text-white">Seller Sign In Required</h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              Sign in or create a Seller account to submit digital products, manage pricing and affiliate commissions, and monitor product performance.
            </p>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => onNavigate('seller')}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold text-sm shadow-lg cursor-pointer"
            >
              Sign In / Register as Seller
            </button>
            <button
              onClick={() => onNavigate('marketplace')}
              className="w-full py-2.5 rounded-xl bg-[#1d1245] text-slate-200 border border-purple-800 text-xs font-semibold cursor-pointer"
            >
              Browse Marketplace
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Gate 2: Affiliate cannot access Seller Dashboard directly
  if (role === 'affiliate') {
    return (
      <div className="min-h-[80vh] bg-[#0c0722] flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full bg-[#140b33] border border-indigo-700/70 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-300">
              Role Separation Notice
            </span>
            <h1 className="text-2xl font-black text-white">Affiliate Account Detected</h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              You are signed in as an <strong>Affiliate</strong> ({user.email}). Access your Affiliate Dashboard to browse products, generate promotion links, and request payouts.
            </p>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => onNavigate('affiliate-dashboard')}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <TrendingUp className="w-4 h-4" />
              <span>Open My Affiliate Dashboard</span>
            </button>
            <button
              onClick={() => onNavigate('marketplace')}
              className="w-full py-2.5 rounded-xl bg-[#1d1245] text-slate-200 border border-purple-800 text-xs font-semibold cursor-pointer"
            >
              Explore Marketplace
            </button>
          </div>
        </div>
      </div>
    );
  }

  const sellerDisplayName =
    profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Seller';

  const navItems: { id: SellerTab; label: string; icon: any; badge?: number | string }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'products', label: 'My Products', icon: Package, badge: sellerProducts.length },
    { id: 'performance', label: 'Product Performance', icon: BarChart3 },
    { id: 'affiliate-activity', label: 'Affiliate Activity', icon: Link2, badge: activity.links.length },
    { id: 'sales', label: 'Sales', icon: DollarSign, badge: activity.commissions.length },
    { id: 'membership', label: 'Membership', icon: CreditCard },
    { id: 'profile', label: 'Profile', icon: User }
  ];

  return (
    <div className="min-h-screen bg-[#090518] text-slate-100 flex flex-col md:flex-row">
      {/* Mobile Topbar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[#11092c] border-b border-purple-900/60 sticky top-20 z-30">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="p-1.5 rounded-lg bg-purple-950 text-slate-200 border border-purple-800 cursor-pointer"
            aria-label="Toggle seller menu"
          >
            {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <span className="font-extrabold text-sm text-white">Seller Dashboard</span>
        </div>
        <button
          onClick={onOpenAddModal}
          className="px-3 py-1.5 rounded-lg bg-pink-600 text-white text-xs font-bold cursor-pointer"
        >
          + Add Product
        </button>
      </div>

      {/* Seller Sidebar (Zero AdminCore references) */}
      <aside
        className={`${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 fixed md:sticky top-20 left-0 z-40 md:z-20 w-72 h-[calc(100vh-5rem)] bg-[#0e0724] border-r border-purple-900/50 flex flex-col transition-transform duration-300 shadow-2xl overflow-y-auto shrink-0`}
      >
        <div className="p-4 mx-3 my-3 rounded-2xl bg-[#160d38] border border-purple-800/60 space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center text-sm font-black text-white shrink-0">
              {sellerDisplayName[0]?.toUpperCase() || 'S'}
            </div>
            <div className="overflow-hidden flex-1">
              <span className="text-xs font-bold text-white truncate block">{sellerDisplayName}</span>
              <span className="text-[10px] text-slate-400 font-mono truncate block">{user.email}</span>
            </div>
          </div>
          <div className="pt-2 border-t border-purple-900/50 flex items-center justify-between text-[11px]">
            <span className="text-pink-300 font-bold">SELLER ACCOUNT</span>
            <span className={isLifetimeSeller ? 'text-emerald-400 font-bold' : 'text-amber-300 font-semibold'}>
              {isLifetimeSeller ? 'Lifetime Active' : 'Standard'}
            </span>
          </div>
        </div>

        <div className="px-3 pb-2">
          <button
            onClick={() => {
              setMobileSidebarOpen(false);
              onOpenAddModal();
            }}
            className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold text-xs shadow-lg shadow-pink-600/25 flex items-center justify-center gap-2 cursor-pointer"
          >
            <PackagePlus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-lg'
                    : 'text-slate-300 hover:text-white hover:bg-[#1a0f44]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-white/20 text-white' : 'bg-purple-950 text-pink-300 border border-purple-800'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-purple-900/40 bg-[#0a051d] space-y-2">
          <button
            onClick={async () => {
              await signOut();
              onNavigate('home');
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-red-300 hover:text-white bg-red-950/40 hover:bg-red-900/50 border border-red-800/60 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 p-4 sm:p-8 space-y-8">
        {/* Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#140b33] rounded-2xl p-5 border border-purple-800/60">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              {navItems.find((n) => n.id === activeTab)?.label}
            </h1>
            <p className="text-xs text-slate-400">
              Seller ID: <span className="font-mono text-pink-300">{user.id.slice(0, 12)}</span> • Submit digital products, configure commissions, and track affiliate clicks
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={loadSellerData}
              disabled={isFetching}
              className="px-3.5 py-2 rounded-xl bg-[#1d1245] hover:bg-[#291a61] text-xs font-bold text-slate-200 border border-purple-800 flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-pink-400 ${isFetching ? 'animate-spin' : ''}`} />
              <span>Sync Data</span>
            </button>
            <button
              onClick={onOpenAddModal}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-white text-xs font-bold shadow flex items-center gap-1.5 cursor-pointer"
            >
              <PackagePlus className="w-3.5 h-3.5" />
              <span>Add Product</span>
            </button>
          </div>
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#140b33] p-5 rounded-2xl border border-purple-900/60 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Total Products</span>
                  <p className="text-3xl font-black text-white mt-1 tabular-nums">{analytics.totalProducts}</p>
                  <span className="text-[11px] text-emerald-400 font-semibold">
                    {analytics.approvedProducts} Approved • {analytics.pendingProducts} Pending
                  </span>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-pink-500/15 text-pink-400 flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-[#140b33] p-5 rounded-2xl border border-purple-900/60 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Total Views</span>
                  <p className="text-3xl font-black text-blue-400 mt-1 tabular-nums">{analytics.totalViews}</p>
                  <span className="text-[11px] text-slate-400">Marketplace impressions</span>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
                  <Eye className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-[#140b33] p-5 rounded-2xl border border-purple-900/60 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Product Clicks</span>
                  <p className="text-3xl font-black text-cyan-400 mt-1 tabular-nums">
                    {analytics.totalClicks + activity.clicks.length}
                  </p>
                  <span className="text-[11px] text-slate-400">CTR: {analytics.ctr}</span>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
                  <MousePointerClick className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-[#140b33] p-5 rounded-2xl border border-purple-900/60 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Verified Sales</span>
                  <p className="text-3xl font-black text-emerald-400 mt-1 tabular-nums">
                    ₹{totalSalesAmount.toLocaleString()}
                  </p>
                  <span className="text-[11px] text-slate-400">
                    {activity.links.length} promoting affiliate link{activity.links.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Seller Catalog Snapshot */}
            <div className="bg-[#140b33] rounded-2xl border border-purple-900/60 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-white">Your Product Submissions</h3>
                <button
                  onClick={() => setActiveTab('products')}
                  className="text-xs font-bold text-pink-400 hover:underline cursor-pointer"
                >
                  View Full Catalog
                </button>
              </div>

              {sellerProducts.length === 0 ? (
                <div className="py-10 text-center space-y-3">
                  <Package className="w-10 h-10 text-slate-500 mx-auto" />
                  <p className="text-sm font-bold text-white">No Products Submitted Yet</p>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Submit your first digital product with price and affiliate commission %. Once approved by Admin, affiliates can promote it in the Marketplace.
                  </p>
                  <button
                    onClick={onOpenAddModal}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-white text-xs font-bold cursor-pointer"
                  >
                    + Submit Your First Product
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {sellerProducts.slice(0, 5).map((prod) => (
                    <div
                      key={prod.id}
                      className="p-3.5 rounded-xl bg-[#1b1046] border border-purple-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={prod.image || sellerLaptopImage}
                          alt={prod.title}
                          className="w-12 h-10 rounded-lg object-cover bg-slate-900 shrink-0"
                        />
                        <div>
                          <h4 className="font-bold text-xs text-white">{prod.title}</h4>
                          <span className="text-[11px] text-slate-400">
                            ₹{prod.price} • {prod.commissionRate}% Affiliate Commission
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            prod.approvalStatus === 'approved'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : prod.approvalStatus === 'rejected'
                              ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {prod.approvalStatus || 'pending'}
                        </span>
                        <button
                          onClick={() => onOpenEditModal(prod)}
                          className="p-1.5 rounded-lg bg-[#24155c] text-slate-300 hover:text-white cursor-pointer"
                          title="Edit Product"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MY PRODUCTS TAB */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="bg-[#140b33] rounded-2xl p-4 sm:p-5 border border-purple-900/60 flex flex-col sm:flex-row gap-3 justify-between items-center">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search my products..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#1b1046] border border-purple-800 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-pink-500"
                />
              </div>

              <div className="flex items-center gap-2">
                {(['all', 'approved', 'pending', 'rejected'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize cursor-pointer ${
                      statusFilter === st ? 'bg-pink-600 text-white' : 'bg-[#1b1046] text-slate-300 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="bg-[#140b33] rounded-3xl p-12 text-center border border-purple-900/50 space-y-3">
                <Package className="w-10 h-10 text-pink-400 mx-auto" />
                <p className="text-base font-bold text-white">No Products Found</p>
                <button
                  onClick={onOpenAddModal}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-white text-xs font-bold cursor-pointer"
                >
                  + Add New Product
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredProducts.map((prod) => (
                  <div
                    key={prod.id}
                    className="bg-[#140b33] rounded-2xl border border-purple-900/60 overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative aspect-video bg-slate-900">
                        <img
                          src={prod.image || sellerLaptopImage}
                          alt={prod.title}
                          className="w-full h-full object-cover"
                        />
                        <span
                          className={`absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            prod.approvalStatus === 'approved'
                              ? 'bg-emerald-500 text-slate-950'
                              : prod.approvalStatus === 'rejected'
                              ? 'bg-red-600 text-white'
                              : 'bg-amber-400 text-slate-950'
                          }`}
                        >
                          {prod.approvalStatus || 'pending'}
                        </span>
                      </div>

                      <div className="p-4 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-pink-300 font-semibold">{prod.categoryLabel}</span>
                          <span className="text-white font-black">₹{prod.price}</span>
                        </div>
                        <h4 className="font-bold text-sm text-white line-clamp-1">{prod.title}</h4>
                        <p className="text-xs text-slate-400 line-clamp-2">{prod.description}</p>
                        <div className="text-[11px] text-emerald-400 font-semibold">
                          Affiliate Commission: {prod.commissionRate}% (₹{Math.round(prod.price * (prod.commissionRate / 100))})
                        </div>
                      </div>
                    </div>

                    <div className="p-4 pt-2 border-t border-purple-900/50 flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          if (onOpenProductDetail) onOpenProductDetail(prod);
                          else onOpenProductModal(prod);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#1b1046] text-slate-200 hover:text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onOpenEditModal(prod)}
                          className="p-1.5 rounded-lg bg-indigo-950 text-indigo-300 hover:text-white border border-indigo-800 cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(prod)}
                          className="p-1.5 rounded-lg bg-red-950/60 text-red-400 hover:text-red-200 border border-red-800 cursor-pointer"
                          title="Delete"
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

        {/* PRODUCT PERFORMANCE TAB */}
        {activeTab === 'performance' && (
          <div className="bg-[#140b33] rounded-2xl border border-purple-900/60 p-6 space-y-4">
            <div>
              <h3 className="font-bold text-base text-white">Product Views, Clicks &amp; CTR</h3>
              <p className="text-xs text-slate-400">Real engagement counts tracked from Marketplace visits</p>
            </div>
            {sellerProducts.length === 0 ? (
              <p className="text-xs text-slate-400 py-10 text-center">No products submitted yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#1b1046] text-slate-300 uppercase font-mono text-[10px] border-b border-purple-900/60">
                    <tr>
                      <th className="py-3 px-4">Product</th>
                      <th className="py-3 px-4">Approval</th>
                      <th className="py-3 px-4 text-center">Views</th>
                      <th className="py-3 px-4 text-center">Clicks</th>
                      <th className="py-3 px-4 text-center">CTR</th>
                      <th className="py-3 px-4 text-right">Affiliate Links</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-900/40">
                    {sellerProducts.map((prod) => {
                      const metric = analytics.perProduct[prod.id] || {
                        views: prod.views || 0,
                        clicks: prod.clicks || 0,
                        ctr: '0.0%'
                      };
                      const linkCount = activity.links.filter((l) => l.productId === prod.id).length;
                      return (
                        <tr key={prod.id}>
                          <td className="py-3 px-4 font-bold text-white">{prod.title}</td>
                          <td className="py-3 px-4 uppercase text-[11px] font-bold">
                            <span
                              className={
                                prod.approvalStatus === 'approved'
                                  ? 'text-emerald-400'
                                  : prod.approvalStatus === 'rejected'
                                  ? 'text-red-400'
                                  : 'text-amber-400'
                              }
                            >
                              {prod.approvalStatus || 'pending'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-blue-400 tabular-nums">{metric.views}</td>
                          <td className="py-3 px-4 text-center font-bold text-pink-400 tabular-nums">{metric.clicks}</td>
                          <td className="py-3 px-4 text-center font-bold text-emerald-400 tabular-nums">{metric.ctr}</td>
                          <td className="py-3 px-4 text-right font-bold text-white tabular-nums">{linkCount}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* AFFILIATE ACTIVITY TAB */}
        {activeTab === 'affiliate-activity' && (
          <div className="space-y-6">
            <div className="bg-[#140b33] rounded-2xl border border-purple-900/60 p-6 space-y-4">
              <div>
                <h3 className="font-bold text-base text-white">Affiliates Promoting Your Products</h3>
                <p className="text-xs text-slate-400">
                  Real affiliate tracking links generated for your approved Marketplace offers
                </p>
              </div>
              {activity.links.length === 0 ? (
                <p className="text-xs text-slate-400 py-10 text-center">
                  No affiliates have generated promotional links for your products yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#1b1046] text-slate-300 uppercase font-mono text-[10px] border-b border-purple-900/60">
                      <tr>
                        <th className="py-3 px-4">Product</th>
                        <th className="py-3 px-4">Affiliate ID</th>
                        <th className="py-3 px-4">Tracking Slug</th>
                        <th className="py-3 px-4 text-center">Clicks Driven</th>
                        <th className="py-3 px-4 text-right">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-900/40">
                      {activity.links.map((link) => (
                        <tr key={link.id}>
                          <td className="py-3 px-4 font-bold text-white">{link.productTitle}</td>
                          <td className="py-3 px-4 font-mono text-slate-300">{link.affiliateId.slice(0, 10)}...</td>
                          <td className="py-3 px-4 font-mono text-pink-300">{link.uniqueTrackingSlug}</td>
                          <td className="py-3 px-4 text-center font-bold text-cyan-400 tabular-nums">{link.clicksCount}</td>
                          <td className="py-3 px-4 text-right text-slate-400">
                            {new Date(link.createdAt).toLocaleDateString()}
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

        {/* SALES TAB */}
        {activeTab === 'sales' && (
          <div className="bg-[#140b33] rounded-2xl border border-purple-900/60 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-base text-white">Verified Product Sales &amp; Commissions</h3>
                <p className="text-xs text-slate-400">
                  Total Gross Sales: ₹{totalSalesAmount.toLocaleString()} • Affiliate Commissions: ₹{totalAffiliatePayoutsOwed.toLocaleString()}
                </p>
              </div>
            </div>

            {activity.commissions.length === 0 ? (
              <p className="text-xs text-slate-400 py-10 text-center">
                No verified sales recorded for your products yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#1b1046] text-slate-300 uppercase font-mono text-[10px] border-b border-purple-900/60">
                    <tr>
                      <th className="py-3 px-4">Order Ref</th>
                      <th className="py-3 px-4">Sale Amount</th>
                      <th className="py-3 px-4">Affiliate Commission</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-900/40">
                    {activity.commissions.map((c) => (
                      <tr key={c.id}>
                        <td className="py-3 px-4 font-mono text-pink-300 font-bold">{c.orderReference}</td>
                        <td className="py-3 px-4 font-bold text-white">₹{c.saleAmount.toLocaleString()}</td>
                        <td className="py-3 px-4 text-emerald-400 font-bold">₹{c.commissionAmount.toLocaleString()}</td>
                        <td className="py-3 px-4 uppercase font-bold text-[11px]">{c.status}</td>
                        <td className="py-3 px-4 text-slate-400">{new Date(c.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* MEMBERSHIP TAB */}
        {activeTab === 'membership' && (
          <div className="max-w-2xl bg-[#140b33] rounded-2xl border border-purple-900/60 p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-white">Seller Lifetime Membership (₹999)</h2>
                <p className="text-xs text-slate-400 mt-1">
                  One-time payment only. Zero monthly subscription, zero yearly renewal fees.
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                  isLifetimeSeller
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}
              >
                {isLifetimeSeller ? 'LIFETIME ACTIVE' : 'INACTIVE'}
              </span>
            </div>

            {membershipPayment && (
              <div className="p-4 rounded-xl bg-[#1b1046] border border-purple-800/60 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Transaction ID:</span>
                  <span className="font-mono text-white">{membershipPayment.txnid}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Amount Paid:</span>
                  <span className="font-bold text-emerald-400">₹{membershipPayment.amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className="uppercase font-bold text-white">{membershipPayment.status}</span>
                </div>
              </div>
            )}

            {!isLifetimeSeller && (
              <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 space-y-3">
                <div className="flex items-start gap-2.5 text-xs text-amber-200">
                  <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    {isPaymentGatewayEnabled
                      ? 'Activate your ₹999 Lifetime Seller Membership via PayU Hosted Checkout.'
                      : 'PayU Checkout is temporarily disabled pending server verification setup. You can still preview checkout details or submit products for Admin review.'}
                  </span>
                </div>
                <button
                  onClick={openCheckout}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-white text-xs font-bold cursor-pointer"
                >
                  View ₹999 Lifetime Pass Details
                </button>
              </div>
            )}
          </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="max-w-2xl bg-[#140b33] rounded-2xl border border-purple-900/60 p-6 sm:p-8 space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center text-2xl font-black text-white">
                {sellerDisplayName[0]?.toUpperCase() || 'S'}
              </div>
              <div>
                <h2 className="text-xl font-black text-white">{sellerDisplayName}</h2>
                <p className="text-xs text-slate-400 font-mono">{user.email}</p>
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 text-[11px] font-bold">
                  Seller / Creator Account
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2 border-t border-purple-900/50">
              <div className="p-3.5 rounded-xl bg-[#1b1046] border border-purple-800/60">
                <span className="text-slate-400 block text-[10px] uppercase">Seller ID</span>
                <span className="font-mono text-white font-bold break-all">{user.id}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#1b1046] border border-purple-800/60">
                <span className="text-slate-400 block text-[10px] uppercase">Account Status</span>
                <span className="text-emerald-400 font-bold uppercase">{profile?.status || 'ACTIVE'}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#1b1046] border border-purple-800/60">
                <span className="text-slate-400 block text-[10px] uppercase">Registration Date</span>
                <span className="text-white font-semibold">
                  {new Date(profile?.created_at || user.created_at || Date.now()).toLocaleDateString()}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#1b1046] border border-purple-800/60">
                <span className="text-slate-400 block text-[10px] uppercase">Verified Badge</span>
                <span className="text-amber-300 font-bold">
                  {profile?.seller_verified ? 'Verified Creator' : 'Standard'}
                </span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal (Zero window.confirm) */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="max-w-md w-full bg-[#130b30] border border-red-500/60 rounded-3xl p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-white">Delete Product Listing?</h3>
            <p className="text-xs text-slate-300">
              Are you sure you want to permanently remove <strong>&ldquo;{deleteTarget.title}&rdquo;</strong>?
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl bg-purple-900/40 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
