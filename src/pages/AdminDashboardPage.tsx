import React, { useState, useMemo, useEffect } from 'react';
import {
  PageId,
  Product,
  WithdrawalRequest,
  AdminUserRecord,
  PlatformCategory,
  MembershipStatus,
  ProductReportRecord
} from '../types';
import { useAdmin } from '../context/AdminContext';
import { useProducts } from '../context/ProductContext';
import { useHybridAffiliate } from '../context/HybridAffiliateContext';
import { useWallet } from '../context/WalletContext';
import { useAuth } from '../context/AuthContext';
import { usePayUMembership } from '../context/PayUMembershipContext';
import { useReferrals } from '../context/ReferralContext';
import { calculateWithdrawalBreakdown } from '../lib/fees';
import { AdminProcessPayoutModal } from '../components/AdminProcessPayoutModal';
import defaultProductCover from '../assets/images/seller_dashboard_laptop_1794019709659.jpg';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  ShoppingBag,
  DollarSign,
  Wallet,
  FolderTree,
  Settings,
  BarChart3,
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowUpRight,
  Download,
  RefreshCw,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Lock,
  Star,
  ExternalLink,
  Calendar,
  ChevronRight,
  Copy,
  Check,
  Menu,
  X,
  TrendingUp,
  AlertCircle,
  Building2,
  Smartphone,
  CreditCard,
  Sparkles,
  Sliders,
  BadgeCheck,
  Radio,
  FileSpreadsheet,
  Flag,
  Gift
} from 'lucide-react';

interface AdminDashboardPageProps {
  onNavigate: (page: PageId) => void;
  onOpenProductModal?: (product: Product) => void;
}

type AdminSection =
  | 'overview'
  | 'users'
  | 'sellers'
  | 'affiliates'
  | 'products'
  | 'financials'
  | 'withdrawals'
  | 'referrals'
  | 'categories'
  | 'settings'
  | 'reports'
  | 'security';

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  onNavigate,
  onOpenProductModal
}) => {
  const { user, profile } = useAuth();
  const {
    isSuperAdmin,
    adminRole,
    users,
    categories,
    settings,
    auditLogs,
    dateFilter,
    setDateFilter,
    customDateRange,
    setCustomDateRange,
    isInDateRange,
    updateUserStatus,
    toggleSellerVerification,
    updateSubscriptionStatus,
    approveProduct,
    rejectProduct,
    suspendProduct,
    toggleFeaturedProduct,
    deleteProductAdmin,
    addCategory,
    updateCategory,
    deleteCategory,
    updateWebsiteSettings,
    salesLedger,
    adminReferralCommissions,
    financialReport,
    exportToCsv,
    refreshAdminData,
    isLoading
  } = useAdmin();

  const { allProducts, productReports, resolveProductReport, fetchProductReportsAdmin } = useProducts();
  const {
    externalProducts,
    allAffiliateLinks,
    allRecentClicks,
    allCommissionRecords
  } = useHybridAffiliate();
  const { allWithdrawals } = useWallet();
  const { allMembershipPayments, isPaymentGatewayEnabled } = usePayUMembership();
  const {
    allReferrals,
    allReferralCommissions,
    fraudLogs,
    refreshReferrals,
    adminUpdateReferralCommissionStatus,
    adminToggleReferralStatus,
    adminResolveFraudLog
  } = useReferrals();

  // Navigation State
  const [activeSection, setActiveSection] = useState<AdminSection>('overview');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Search & Filters
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'seller' | 'affiliate' | 'admin' | 'suspended'>('all');

  const [productSearch, setProductSearch] = useState('');
  const [productStatusFilter, setProductStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'featured'>('all');
  const [productSourceFilter, setProductSourceFilter] = useState<string>('all');

  const [withdrawalFilterStatus, setWithdrawalFilterStatus] = useState<string>('all');
  const [withdrawalSearch, setWithdrawalSearch] = useState('');

  // Modals & Drawers
  const [selectedUserForDetail, setSelectedUserForDetail] = useState<AdminUserRecord | null>(null);
  const [suspendModalUser, setSuspendModalUser] = useState<AdminUserRecord | null>(null);
  const [suspendReason, setSuspendReason] = useState('');

  const [rejectProductTarget, setRejectProductTarget] = useState<Product | null>(null);
  const [rejectReason, setRejectReason] = useState('Product information or external URL could not be verified.');
  const [suspendProductTarget, setSuspendProductTarget] = useState<Product | null>(null);
  const [suspendProductReason, setSuspendProductReason] = useState('Suspended by platform moderation due to policy or link check.');

  const [editingCategory, setEditingCategory] = useState<PlatformCategory | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatSlug, setNewCatSlug] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('Folder');

  const [adminPayoutModalTarget, setAdminPayoutModalTarget] = useState<WithdrawalRequest | null>(null);
  const [deleteProductTarget, setDeleteProductTarget] = useState<Product | null>(null);
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<PlatformCategory | null>(null);

  // Settings local form state (always syncs when settings load from Supabase)
  const [tempSettings, setTempSettings] = useState(settings);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Referral Management filters & sub-tabs
  const [referralSubTab, setReferralSubTab] = useState<'all' | 'commissions' | 'fraud' | 'settings'>('all');
  const [referralSearch, setReferralSearch] = useState('');
  const [referralTypeFilter, setReferralTypeFilter] = useState<'all' | 'affiliate' | 'seller'>('all');
  const [referralActionLoadingId, setReferralActionLoadingId] = useState<string | null>(null);
  const [referralActionFeedback, setReferralActionFeedback] = useState<string | null>(null);

  useEffect(() => {
    setTempSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (isSuperAdmin && activeSection === 'products') {
      fetchProductReportsAdmin();
    }
  }, [isSuperAdmin, activeSection, fetchProductReportsAdmin]);

  // Date-filtered metrics & 15 real DB KPI Calculations
  const stats = useMemo(() => {
    const datedUsers = users.filter((u) => isInDateRange(u.createdAt));
    const totalUsers = datedUsers.length;
    const sellers = users.filter((u) => u.role === 'seller' || u.role === 'both');
    const datedSellers = datedUsers.filter((u) => u.role === 'seller' || u.role === 'both');
    const affiliates = datedUsers.filter((u) => u.role === 'affiliate' || u.role === 'both');
    const activeUsers = datedUsers.filter((u) => u.status === 'active').length;

    const activeSellerMemberships = sellers.filter((u) => u.subscriptionStatus === 'active').length;
    const pendingSellerPayments = sellers.filter(
      (u) => u.subscriptionStatus === 'pending' || u.subscriptionStatus === 'none' || !u.subscriptionStatus
    ).length;
    const failedOrRefundedSellers = sellers.filter(
      (u) => u.subscriptionStatus === 'failed' || u.subscriptionStatus === 'refunded'
    ).length;

    const datedProducts = allProducts.filter((p) => isInDateRange(p.createdAt));
    const datedExternal = externalProducts.filter((p) => isInDateRange(p.createdAt));
    const totalListed = datedProducts.length + datedExternal.length;
    const pendingProducts = allProducts.filter((p) => p.approvalStatus === 'pending' || p.status === 'draft').length;
    const approvedProducts = allProducts.filter((p) => p.approvalStatus === 'approved' && p.status === 'published').length;
    const rejectedProducts = allProducts.filter((p) => p.approvalStatus === 'rejected').length;

    const datedClicks = allRecentClicks.filter((c) => isInDateRange(c.createdAt));
    const totalClicks = datedClicks.length;

    const datedCommissions = allCommissionRecords.filter((c) => isInDateRange(c.createdAt));
    const verifiedCommissionCount = datedCommissions.filter((c) => c.status === 'verified' || c.status === 'paid').length;
    const datedSalesCount = salesLedger.filter((s) => isInDateRange(s.createdAt) && s.status === 'verified').length;
    const verifiedSales = Math.max(datedSalesCount, verifiedCommissionCount);

    const pendingCommissions = datedCommissions
      .filter((c) => c.status === 'pending')
      .reduce((acc, c) => acc + c.commissionAmount, 0);

    const approvedCommissions = datedCommissions
      .filter((c) => c.status === 'verified' || c.status === 'paid')
      .reduce((acc, c) => acc + c.commissionAmount, 0);

    const datedWithdrawals = allWithdrawals.filter((w) => isInDateRange(w.createdAt));
    const pendingWithdrawalRows = datedWithdrawals.filter(
      (w) => w.status === 'pending' || w.status === 'approved' || w.status === 'processing'
    );
    const completedWithdrawalRows = datedWithdrawals.filter((w) => w.status === 'paid');

    const pendingWithdrawalsCount = pendingWithdrawalRows.length;
    const pendingWithdrawalsAmount = pendingWithdrawalRows.reduce((acc, w) => acc + w.amount, 0);
    const completedWithdrawalsCount = completedWithdrawalRows.length;
    const completedWithdrawalsAmount = completedWithdrawalRows.reduce((acc, w) => acc + w.amount, 0);
    const totalWithdrawalsAmount = datedWithdrawals.reduce((acc, w) => acc + w.amount, 0);
    const actualPlatformRevenue = financialReport.actualPlatformNetRevenue;
    const referralEarnings =
      financialReport.referralEarnings ||
      adminReferralCommissions
        .filter((rc) => isInDateRange(rc.createdAt) && rc.status !== 'reversed')
        .reduce((acc, rc) => acc + rc.rewardAmount, 0);

    return {
      totalUsers,
      totalSellers: datedSellers.length,
      totalAffiliates: affiliates.length,
      activeUsers,
      activeSellerMemberships,
      pendingSellerPayments,
      failedOrRefundedSellers,
      totalListed,
      pendingProducts,
      approvedProducts,
      rejectedProducts,
      totalClicks,
      verifiedSales,
      pendingCommissions,
      approvedCommissions,
      pendingWithdrawalsCount,
      pendingWithdrawalsAmount,
      completedWithdrawalsCount,
      completedWithdrawalsAmount,
      totalWithdrawalsAmount,
      actualPlatformRevenue,
      referralEarnings
    };
  }, [
    users,
    allProducts,
    externalProducts,
    allRecentClicks,
    allCommissionRecords,
    salesLedger,
    adminReferralCommissions,
    allWithdrawals,
    financialReport,
    isInDateRange
  ]);

  // Real 7-day click chart buckets derived from database clicks
  const dailyClickBuckets = useMemo(() => {
    const days: { label: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const dayKey = d.toISOString().split('T')[0];
      const label = i === 0 ? 'Today' : d.toLocaleDateString(undefined, { weekday: 'short' });
      const count = allRecentClicks.filter((c) => (c.createdAt || '').startsWith(dayKey)).length;
      days.push({ label, count });
    }
    return days;
  }, [allRecentClicks]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.fullName?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.id?.toLowerCase().includes(userSearch.toLowerCase());

      if (!matchSearch) return false;

      if (userRoleFilter === 'seller') return u.role === 'seller' || u.role === 'both';
      if (userRoleFilter === 'affiliate') return u.role === 'affiliate' || u.role === 'both';
      if (userRoleFilter === 'admin') return u.role === 'admin' || u.adminRole === 'super_admin';
      if (userRoleFilter === 'suspended') return u.status === 'suspended';
      return true;
    });
  }, [users, userSearch, userRoleFilter]);

  // Filtered Products (uses allProducts so Pending/Rejected/Approved are all visible)
  const filteredProducts = useMemo(() => {
    return allProducts.filter((p) => {
      const matchSearch =
        p.title?.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.category?.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.sellerName?.toLowerCase().includes(productSearch.toLowerCase());

      if (!matchSearch) return false;

      if (productStatusFilter === 'pending') return p.approvalStatus === 'pending' || p.status === 'draft';
      if (productStatusFilter === 'approved') return p.approvalStatus === 'approved' && p.status === 'published';
      if (productStatusFilter === 'rejected') return p.approvalStatus === 'rejected';
      if (productStatusFilter === 'featured') return Boolean(p.isFeatured);

      if (productSourceFilter !== 'all') {
        const net = (p.networkName || 'clickbarry').toLowerCase();
        if (productSourceFilter === 'seller') return !p.networkName || net.includes('clickbarry');
        if (productSourceFilter === 'amazon') return net.includes('amazon');
        if (productSourceFilter === 'clickbank') return net.includes('clickbank');
        if (productSourceFilter === 'digistore24') return net.includes('digistore');
      }

      return true;
    });
  }, [allProducts, productSearch, productStatusFilter, productSourceFilter]);

  // Filtered Withdrawals
  const filteredWithdrawals = useMemo(() => {
    return allWithdrawals.filter((w) => {
      const matchStatus = withdrawalFilterStatus === 'all' || w.status === withdrawalFilterStatus;
      const matchSearch =
        w.requestNumber?.toLowerCase().includes(withdrawalSearch.toLowerCase()) ||
        w.affiliateId?.toLowerCase().includes(withdrawalSearch.toLowerCase()) ||
        w.upiId?.toLowerCase().includes(withdrawalSearch.toLowerCase()) ||
        w.transactionReference?.toLowerCase().includes(withdrawalSearch.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [allWithdrawals, withdrawalFilterStatus, withdrawalSearch]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    await updateWebsiteSettings(tempSettings);
    setIsSavingSettings(false);
  };

  const handleSaveCategory = async () => {
    if (!newCatName.trim() || !newCatSlug.trim()) return;
    if (editingCategory) {
      await updateCategory(editingCategory.id, {
        name: newCatName.trim(),
        slug: newCatSlug.trim().toLowerCase().replace(/\s+/g, '-'),
        description: newCatDesc.trim(),
        iconName: newCatIcon
      });
    } else {
      await addCategory({
        name: newCatName.trim(),
        slug: newCatSlug.trim().toLowerCase().replace(/\s+/g, '-'),
        description: newCatDesc.trim(),
        iconName: newCatIcon,
        isActive: true,
        displayOrder: categories.length + 1
      });
    }
    setShowCategoryModal(false);
    setEditingCategory(null);
    setNewCatName('');
    setNewCatSlug('');
    setNewCatDesc('');
  };

  const navItems: { id: AdminSection; label: string; icon: any; badge?: number | string }[] = [
    { id: 'overview', label: 'Overview Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'User Management', icon: Users, badge: users.length },
    { id: 'sellers', label: 'Seller Management', icon: UserCheck, badge: stats.totalSellers },
    { id: 'affiliates', label: 'Affiliate Management', icon: Sparkles, badge: stats.totalAffiliates },
    { id: 'products', label: 'Product Moderation', icon: ShoppingBag, badge: stats.pendingProducts > 0 ? `${stats.pendingProducts} new` : undefined },
    { id: 'financials', label: 'Financial Management', icon: DollarSign },
    { id: 'withdrawals', label: 'Withdrawals & Payouts', icon: Wallet, badge: allWithdrawals.filter((w) => w.status === 'pending').length || undefined },
    {
      id: 'referrals',
      label: 'Referral Management',
      icon: Gift,
      badge: fraudLogs.filter((f) => !f.resolved).length > 0
        ? `${fraudLogs.filter((f) => !f.resolved).length} alert`
        : allReferrals.length || undefined
    },
    { id: 'categories', label: 'Category Management', icon: FolderTree, badge: categories.length },
    { id: 'settings', label: 'Website Settings', icon: Settings },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
    { id: 'security', label: 'Security & Audit Logs', icon: ShieldCheck, badge: auditLogs.length }
  ];

  // =========================================================================
  // SECURITY GATE: SUPER ADMIN AUTHORIZATION BARRIER
  // =========================================================================
  if (!isSuperAdmin) {
    return (
      <div className="min-h-[85vh] bg-[#090518] text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#130b30] border border-red-800/80 rounded-3xl p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-red-600/20 rounded-full blur-2xl pointer-events-none" />

          <div className="w-16 h-16 mx-auto rounded-3xl bg-red-950/80 border border-red-700/80 flex items-center justify-center text-red-400 shadow-lg shadow-red-900/40">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-red-400 bg-red-950/60 border border-red-800 px-3 py-1 rounded-full">
              Restricted Area
            </span>
            <h2 className="text-2xl font-black text-white">Super Admin Access Required</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              You are currently logged in as <strong className="text-pink-300">{user?.email || 'Guest Visitor'}</strong>. Administrative platform operations, financial ledger audits, user suspensions, and manual withdrawal disbursements are restricted to authorized Super Administrators (<strong>gnetam108@gmail.com</strong>).
            </p>
          </div>

          <div className="pt-2 space-y-3">
            <button
              onClick={() => onNavigate('admin-login')}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 via-pink-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold shadow-lg shadow-pink-600/30 cursor-pointer transition-all"
            >
              Sign In on Private Admin Portal
            </button>
            <button
              onClick={() => onNavigate('marketplace')}
              className="w-full py-2.5 rounded-xl bg-[#1d1245] hover:bg-[#28185f] text-slate-200 hover:text-white border border-purple-800 text-xs font-semibold cursor-pointer transition-colors"
            >
              Return to Marketplace
            </button>
            <button
              onClick={() => onNavigate('home')}
              className="w-full py-2.5 rounded-xl bg-transparent hover:bg-white/5 text-slate-400 hover:text-white text-xs font-semibold cursor-pointer transition-colors"
            >
              Back to Homepage
            </button>
          </div>

          <div className="pt-2 border-t border-purple-900/60 text-[11px] text-slate-400">
            <span>Security System: Role-Based Access Control Active</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090518] text-slate-100 flex flex-col md:flex-row font-sans selection:bg-pink-500 selection:text-white">
      {/* MOBILE TOPBAR */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[#11092c] border-b border-purple-900/60 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="p-1.5 rounded-lg bg-purple-950 text-slate-200 border border-purple-800"
            aria-label="Toggle admin menu"
          >
            {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-pulse" />
            <span className="font-extrabold text-sm tracking-tight text-white">AdminCore</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('marketplace')}
            className="text-xs px-2.5 py-1 rounded-full bg-purple-900/70 text-pink-300 font-semibold border border-purple-700/60 cursor-pointer"
          >
            Marketplace
          </button>
        </div>
      </div>

      {/* MODERN ADMIN SIDEBAR */}
      <aside
        className={`${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 fixed md:sticky top-0 left-0 z-50 md:z-30 w-72 h-screen bg-[#0e0724] border-r border-purple-900/50 flex flex-col transition-transform duration-300 ease-in-out shadow-2xl overflow-y-auto`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-purple-900/40 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-500/30">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                  <span>ClickBarry</span>
                  <span className="text-[10px] bg-pink-500/20 text-pink-400 border border-pink-500/30 px-1.5 py-0.2 rounded font-mono uppercase">
                    Admin
                  </span>
                </h1>
                <p className="text-[10px] text-slate-400 font-medium">Platform Management Core</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="md:hidden text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Authenticated Admin Pill */}
        <div className="p-4 mx-3 my-3 rounded-2xl bg-[#160d38] border border-purple-800/60 shadow-inner">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 via-pink-600 to-rose-500 flex items-center justify-center text-xs font-bold text-white shadow-md">
              {(profile?.full_name || user?.email || 'A')[0].toUpperCase()}
            </div>
            <div className="overflow-hidden flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white truncate block">
                  {profile?.full_name || 'Super Admin'}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              </div>
              <span className="text-[10px] text-pink-300 font-mono truncate block">
                {user?.email || 'gnetam108@gmail.com'}
              </span>
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-purple-900/50 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Role:</span>
            <span className="font-bold text-emerald-400 flex items-center gap-1">
              <BadgeCheck className="w-3 h-3" />
              SUPER ADMIN
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSection(item.id);
                  setMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-lg shadow-pink-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-[#1a0f44]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-purple-950 text-pink-300 border border-purple-800'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer Controls */}
        <div className="p-4 border-t border-purple-900/40 bg-[#0a051d] space-y-2">
          <button
            onClick={() => onNavigate('marketplace')}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-[#150c38] hover:bg-[#1d114c] border border-purple-800/60 transition-all cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 text-pink-400" />
            <span>Open Marketplace</span>
          </button>
          <button
            onClick={() => onNavigate('home')}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold text-pink-300 hover:text-white bg-pink-950/40 hover:bg-pink-900/40 border border-pink-800/60 transition-all cursor-pointer"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Public Homepage</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Control Bar with Date Filters & Quick Actions */}
        <header className="sticky top-0 z-30 bg-[#0d0724]/95 backdrop-blur-md border-b border-purple-900/50 px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-white capitalize">
                  {activeSection.replace('-', ' ')}
                </h2>
                <span className="text-[11px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-400" />
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Platform control, moderation, ledger verification & revenue analytics
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Date Range Selector */}
            <div className="flex items-center flex-wrap bg-[#150c38] border border-purple-800/80 rounded-xl p-1 text-xs gap-0.5">
              {(['today', '7d', '30d', 'this_month', 'this_year', 'custom', 'all'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setDateFilter(p)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                    dateFilter === p
                      ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white font-bold shadow'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {p === 'today' && 'Today'}
                  {p === '7d' && '7 Days'}
                  {p === '30d' && '30 Days'}
                  {p === 'this_month' && 'This Month'}
                  {p === 'this_year' && 'This Year'}
                  {p === 'custom' && 'Custom Date'}
                  {p === 'all' && 'All Time'}
                </button>
              ))}
            </div>

            {dateFilter === 'custom' && (
              <div className="flex items-center gap-1.5 bg-[#150c38] border border-purple-800 rounded-xl px-2.5 py-1 text-xs">
                <input
                  type="date"
                  value={customDateRange.startDate}
                  onChange={(e) => setCustomDateRange({ ...customDateRange, startDate: e.target.value })}
                  className="bg-transparent text-white text-xs outline-none"
                  aria-label="Start date"
                />
                <span className="text-slate-500">to</span>
                <input
                  type="date"
                  value={customDateRange.endDate}
                  onChange={(e) => setCustomDateRange({ ...customDateRange, endDate: e.target.value })}
                  className="bg-transparent text-white text-xs outline-none"
                  aria-label="End date"
                />
              </div>
            )}

            {/* Refresh Data */}
            <button
              onClick={refreshAdminData}
              disabled={isLoading}
              title="Refresh Data from Supabase"
              className="p-2 rounded-xl bg-[#160d38] hover:bg-[#20144e] text-slate-300 hover:text-white border border-purple-800 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-pink-400' : ''}`} />
            </button>

            {/* Quick Export CSV */}
            <div className="relative group">
              <button
                onClick={() => exportToCsv('financials')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-xs shadow-md shadow-pink-600/30 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </header>

        {/* TAB / SECTION ROUTING */}
        <div className="p-4 sm:p-8 space-y-8 flex-1">
          {/* =================================================================== */}
          {/* 1. OVERVIEW DASHBOARD */}
          {/* =================================================================== */}
          {activeSection === 'overview' && (
            <div className="space-y-8">
              {/* Top Banner Notice */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-900/60 via-pink-950/40 to-[#12082f] border border-pink-500/30 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-pink-600/20 border border-pink-500/40 flex items-center justify-center text-pink-400 shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white">
                      ClickBarry Master Platform Operations & Ledger
                    </h3>
                    <p className="text-xs text-slate-300">
                      All calculations reflect real database transactions. External network earnings (Amazon/ClickBank) are strictly segregated from ClickBarry funds.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                    Ledger Status: 100% Balanced
                  </span>
                </div>
              </div>

              {/* 15 Real-Data Overview KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="p-4 rounded-2xl bg-[#130b31] border border-purple-800/60 shadow-lg">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-semibold">Total Users</span>
                    <Users className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-2xl font-black text-white tabular-nums">{stats.totalUsers}</div>
                  <div className="text-[11px] text-slate-400 mt-1">{stats.activeUsers} active accounts</div>
                </div>

                <div className="p-4 rounded-2xl bg-[#130b31] border border-purple-800/60 shadow-lg">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-semibold">Total Sellers</span>
                    <UserCheck className="w-4 h-4 text-pink-400" />
                  </div>
                  <div className="text-2xl font-black text-white tabular-nums">{stats.totalSellers}</div>
                  <div className="text-[11px] text-pink-300 mt-1 font-medium">Registered creators</div>
                </div>

                <div className="p-4 rounded-2xl bg-[#130b31] border border-purple-800/60 shadow-lg">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-semibold">Total Affiliates</span>
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="text-2xl font-black text-white tabular-nums">{stats.totalAffiliates}</div>
                  <div className="text-[11px] text-indigo-300 mt-1 font-medium">Free affiliate accounts</div>
                </div>

                <div className="p-4 rounded-2xl bg-[#130b31] border border-emerald-500/40 shadow-lg">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-semibold">Active Seller Memberships</span>
                    <BadgeCheck className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-black text-emerald-400 tabular-nums">
                    {stats.activeSellerMemberships}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">₹999 verified lifetime</div>
                </div>

                <div className="p-4 rounded-2xl bg-[#130b31] border border-amber-500/40 shadow-lg">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-semibold">Pending Seller Payments</span>
                    <CreditCard className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-black text-amber-400 tabular-nums">
                    {stats.pendingSellerPayments}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {stats.failedOrRefundedSellers} failed / refunded
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#130b31] border border-purple-800/60 shadow-lg">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-semibold">Total Products</span>
                    <ShoppingBag className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="text-2xl font-black text-white tabular-nums">{stats.totalListed}</div>
                  <div className="text-[11px] text-cyan-300 mt-1">{stats.totalClicks} total clicks</div>
                </div>

                <div className="p-4 rounded-2xl bg-[#130b31] border border-amber-500/40 shadow-lg">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-semibold">Pending Approvals</span>
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-black text-amber-400 tabular-nums">{stats.pendingProducts}</div>
                  <div className="text-[11px] text-amber-300 mt-1 font-medium">Awaiting review</div>
                </div>

                <div className="p-4 rounded-2xl bg-[#130b31] border border-emerald-500/40 shadow-lg">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-semibold">Approved Products</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-black text-emerald-400 tabular-nums">{stats.approvedProducts}</div>
                  <div className="text-[11px] text-slate-400 mt-1">Live on Marketplace</div>
                </div>

                <div className="p-4 rounded-2xl bg-[#130b31] border border-red-500/40 shadow-lg">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-semibold">Rejected Products</span>
                    <XCircle className="w-4 h-4 text-red-400" />
                  </div>
                  <div className="text-2xl font-black text-red-400 tabular-nums">{stats.rejectedProducts}</div>
                  <div className="text-[11px] text-slate-400 mt-1">Declined / suspended</div>
                </div>

                <div className="p-4 rounded-2xl bg-[#130b31] border border-purple-800/60 shadow-lg">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-semibold">Verified Sales</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-black text-emerald-400 tabular-nums">{stats.verifiedSales}</div>
                  <div className="text-[11px] text-slate-400 mt-1 font-medium">Confirmed orders</div>
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-br from-pink-900/60 via-purple-900/40 to-[#190d3d] border border-pink-500/50 shadow-xl">
                  <div className="flex items-center justify-between text-pink-300 mb-2">
                    <span className="text-xs font-bold">Platform Revenue</span>
                    <DollarSign className="w-4 h-4 text-pink-400" />
                  </div>
                  <div className="text-2xl font-black text-white tabular-nums">
                    ₹{stats.actualPlatformRevenue.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-pink-200 mt-1 font-medium">
                    Passes + 15% + 5% fees
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#130b31] border border-purple-800/60 shadow-lg">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-semibold">Affiliate Commission</span>
                    <DollarSign className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-black text-amber-400 tabular-nums">
                    ₹{stats.approvedCommissions.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 font-medium">
                    ₹{stats.pendingCommissions.toLocaleString()} pending
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#130b31] border border-amber-500/40 shadow-lg">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-semibold">Pending Withdrawals</span>
                    <Wallet className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-black text-amber-300 tabular-nums">
                    ₹{stats.pendingWithdrawalsAmount.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 font-medium">
                    {stats.pendingWithdrawalsCount} requests queued
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#130b31] border border-emerald-500/40 shadow-lg">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-semibold">Completed Withdrawals</span>
                    <Wallet className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-black text-emerald-400 tabular-nums">
                    ₹{stats.completedWithdrawalsAmount.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 font-medium">
                    {stats.completedWithdrawalsCount} payouts settled
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#130b31] border border-indigo-500/40 shadow-lg">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-semibold">Referral Earnings</span>
                    <Gift className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="text-2xl font-black text-indigo-300 tabular-nums">
                    ₹{stats.referralEarnings.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 font-medium">
                    10% + ₹100 seller rewards
                  </div>
                </div>
              </div>

              {/* VISUAL CHARTS ROW (Real Data Driven) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Chart 1: 7-Day Real Link Clicks */}
                <div className="p-5 rounded-2xl bg-[#130b31] border border-purple-800/60 shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-cyan-400" />
                        <span>7-Day Tracked Affiliate Clicks</span>
                      </h4>
                      <p className="text-xs text-slate-400">Real click activity logged over the past 7 days</p>
                    </div>
                    <span className="text-xs font-bold text-cyan-300 bg-cyan-950/40 border border-cyan-800/60 px-2.5 py-1 rounded-lg tabular-nums">
                      {allRecentClicks.length} Total Clicks
                    </span>
                  </div>

                  {(() => {
                    const maxClicks = Math.max(1, ...dailyClickBuckets.map((d) => d.count));
                    return (
                      <div className="h-44 w-full flex items-end justify-between gap-2 pt-4 px-2">
                        {dailyClickBuckets.map((bucket, idx) => {
                          const heightPct = bucket.count === 0 ? 4 : Math.max(12, Math.round((bucket.count / maxClicks) * 100));
                          return (
                            <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                              <span className="text-[10px] font-bold text-slate-300 font-mono tabular-nums">
                                {bucket.count}
                              </span>
                              <div
                                style={{ height: `${heightPct}%` }}
                                className={`w-full max-w-[32px] rounded-t-lg transition-all duration-500 ${
                                  bucket.count > 0 ? 'bg-cyan-500 shadow-md shadow-cyan-500/20' : 'bg-purple-900/40'
                                }`}
                              />
                              <span className="text-[10px] text-slate-400 font-mono">{bucket.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                  <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-purple-900/50 mt-2">
                    <span>Source: `affiliate_clicks` table</span>
                    <span className="text-cyan-400 font-bold">Live DB Sync</span>
                  </div>
                </div>

                {/* Chart 2: Financial Distribution (Real Data Scaled) */}
                <div className="p-5 rounded-2xl bg-[#130b31] border border-purple-800/60 shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-emerald-400" />
                        <span>Revenue &amp; Affiliate Payout Breakdown</span>
                      </h4>
                      <p className="text-xs text-slate-400">Real financial stream totals in current filter window</p>
                    </div>
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-2.5 py-1 rounded-lg">
                      Double-Entry Ledger
                    </span>
                  </div>

                  {(() => {
                    const items = [
                      { label: 'Seller Subs', amount: financialReport.sellerSubscriptionRevenue, color: 'bg-pink-500' },
                      { label: 'Approved Comm', amount: financialReport.verifiedSellerCommission, color: 'bg-emerald-500' },
                      { label: 'External Comm', amount: financialReport.externalNetworkCommission, color: 'bg-indigo-500' },
                      { label: 'Payouts Paid', amount: financialReport.actualAffiliatePayouts, color: 'bg-purple-500' },
                      { label: 'Pending Payout', amount: financialReport.pendingWithdrawalsVolume, color: 'bg-amber-500' }
                    ];
                    const maxAmt = Math.max(1, ...items.map((x) => x.amount));
                    return (
                      <div className="h-44 w-full flex items-end justify-between gap-3 pt-4 px-2">
                        {items.map((bar, i) => {
                          const heightPct = bar.amount === 0 ? 4 : Math.max(12, Math.round((bar.amount / maxAmt) * 100));
                          return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                              <span className="text-[10px] font-bold text-slate-300 font-mono truncate max-w-[70px]">
                                ₹{bar.amount.toLocaleString()}
                              </span>
                              <div
                                style={{ height: `${heightPct}%` }}
                                className={`w-full max-w-[36px] rounded-t-lg transition-all duration-500 ${
                                  bar.amount > 0 ? `${bar.color} shadow-md` : 'bg-purple-900/40'
                                }`}
                              />
                              <span className="text-[10px] text-slate-400 text-center font-medium truncate max-w-[65px]">
                                {bar.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                  <div className="pt-3 border-t border-purple-900/50 mt-2 flex items-center justify-between text-xs text-slate-400">
                    <span>Reconciliation: Verified Payout &amp; Commission Ledger</span>
                    <span className="text-emerald-400 font-bold">Real DB Records</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions & Recent Platform Audit Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Pending Moderation Highlights */}
                <div className="lg:col-span-2 p-5 rounded-2xl bg-[#130b31] border border-purple-800/60 shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-pink-400" />
                      <span>Pending Products Awaiting Approval</span>
                    </h4>
                    <button
                      onClick={() => setActiveSection('products')}
                      className="text-xs text-pink-400 hover:text-pink-300 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <span>Manage All ({allProducts.length})</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {allProducts.filter((p) => p.approvalStatus === 'pending' || p.status === 'draft').length === 0 ? (
                    <div className="p-8 text-center rounded-xl bg-purple-950/20 border border-purple-900/40">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                      <p className="text-xs font-bold text-white">All products are currently reviewed!</p>
                      <p className="text-[11px] text-slate-400">New submissions by sellers will appear here instantly for approval.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {allProducts
                        .filter((p) => p.approvalStatus === 'pending' || p.status === 'draft')
                        .slice(0, 4)
                        .map((prod) => (
                          <div
                            key={prod.id}
                            className="p-3 rounded-xl bg-[#1a0f40] border border-purple-800/80 flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3">
                              <img
                                src={prod.image || defaultProductCover}
                                alt={prod.title}
                                className="w-10 h-10 rounded-lg object-cover bg-purple-950 border border-purple-800 shrink-0"
                              />
                              <div>
                                <span className="font-bold text-xs text-white block truncate max-w-[220px]">
                                  {prod.title}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  by {prod.sellerName || 'Seller'} • ₹{prod.price} • {prod.category}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => approveProduct(prod.id)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => setRejectProductTarget(prod)}
                                className="px-2.5 py-1.5 rounded-lg bg-red-950 text-red-300 hover:bg-red-900 border border-red-800 text-xs font-semibold cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Right: Security & Audit Activity Snippet */}
                <div className="p-5 rounded-2xl bg-[#130b31] border border-purple-800/60 shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Security Audit Logs</span>
                    </h4>
                    <button
                      onClick={() => setActiveSection('security')}
                      className="text-xs text-pink-400 hover:text-pink-300 font-bold"
                    >
                      View All
                    </button>
                  </div>
                  <div className="space-y-2.5">
                    {auditLogs.slice(0, 5).map((log) => (
                      <div
                        key={log.id}
                        className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-900/50 text-[11px]"
                      >
                        <div className="flex items-center justify-between text-slate-400 mb-1">
                          <span className="font-mono font-bold text-pink-300">{log.action}</span>
                          <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-slate-200 truncate">{log.details}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* 2. USER MANAGEMENT */}
          {/* =================================================================== */}
          {activeSection === 'users' && (
            <div className="space-y-6">
              {/* Header with Search and Role Filter */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search users by name, email, or User ID..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#140b33] border border-purple-800/80 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                  {(['all', 'seller', 'affiliate', 'admin', 'suspended'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setUserRoleFilter(r)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                        userRoleFilter === r
                          ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white font-bold shadow'
                          : 'bg-[#140b33] text-slate-300 hover:text-white border border-purple-800/60'
                      }`}
                    >
                      {r === 'all' && 'All Users'}
                      {r === 'seller' && 'Sellers Only'}
                      {r === 'affiliate' && 'Affiliates Only'}
                      {r === 'admin' && 'Administrators'}
                      {r === 'suspended' && 'Suspended'}
                    </button>
                  ))}
                  <button
                    onClick={() => exportToCsv('users')}
                    className="p-2 rounded-xl bg-purple-950 hover:bg-purple-900 text-slate-300 hover:text-white border border-purple-800"
                    title="Export Users CSV"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Users Table */}
              <div className="rounded-2xl bg-[#130b31] border border-purple-800/60 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#1b1046] text-slate-300 uppercase font-mono text-[10px] tracking-wider border-b border-purple-900/60">
                      <tr>
                        <th className="py-3 px-4">User</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Seller Verified</th>
                        <th className="py-3 px-4">Subscription</th>
                        <th className="py-3 px-4">Catalog / Sales</th>
                        <th className="py-3 px-4">Registered</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-900/40 text-slate-200">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400">
                            No users matched your filter criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((u) => (
                          <tr key={u.id} className="hover:bg-purple-950/30 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center font-bold text-white text-xs shrink-0">
                                  {(u.fullName || u.email || 'U')[0].toUpperCase()}
                                </div>
                                <div className="overflow-hidden">
                                  <span className="font-bold text-white block truncate max-w-[150px]">
                                    {u.fullName || 'Member'}
                                  </span>
                                  <span className="text-[10px] text-slate-400 block truncate max-w-[150px] font-mono">
                                    {u.email}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                  u.role === 'admin'
                                    ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                                    : u.role === 'seller'
                                    ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40'
                                    : u.role === 'affiliate'
                                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                                    : 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                }`}
                              >
                                {u.adminRole === 'super_admin' ? 'SUPER ADMIN' : u.role}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  u.status === 'active'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : 'bg-red-500/20 text-red-300 border border-red-500/40'
                                }`}
                              >
                                {u.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <button
                                onClick={() => toggleSellerVerification(u.id, !u.sellerVerified)}
                                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                                  u.sellerVerified
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                    : 'bg-slate-800 text-slate-400 hover:text-white'
                                }`}
                              >
                                <BadgeCheck className="w-3 h-3 text-amber-400" />
                                <span>{u.sellerVerified ? 'Verified' : 'Unverified'}</span>
                              </button>
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  u.subscriptionStatus === 'active'
                                    ? 'bg-pink-500/20 text-pink-300'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {u.subscriptionStatus === 'active' ? '₹999 Active' : 'None'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-[11px]">
                              <span>{u.totalProductsCount || 0} prods • {u.totalSalesCount || 0} sales</span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                              {new Date(u.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setSelectedUserForDetail(u)}
                                  className="p-1.5 rounded-lg bg-purple-950 text-slate-300 hover:text-white hover:bg-purple-900 cursor-pointer"
                                  title="View User Details"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                {u.status === 'active' ? (
                                  <button
                                    onClick={() => setSuspendModalUser(u)}
                                    className="p-1.5 rounded-lg bg-red-950/80 text-red-400 hover:bg-red-900 cursor-pointer"
                                    title="Suspend User"
                                  >
                                    <Lock className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => updateUserStatus(u.id, 'active', 'Reactivated by admin')}
                                    className="p-1.5 rounded-lg bg-emerald-950/80 text-emerald-400 hover:bg-emerald-900 cursor-pointer"
                                    title="Reactivate User"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* 3. SELLER MANAGEMENT */}
          {/* =================================================================== */}
          {activeSection === 'sellers' && (
            <div className="space-y-6">
              {/* Seller metrics bar */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-[#130b31] border border-purple-800/60">
                  <span className="text-xs text-slate-400">Total Sellers</span>
                  <div className="text-xl font-bold text-white mt-1">{stats.totalSellers}</div>
                </div>
                <div className="p-4 rounded-2xl bg-[#130b31] border border-purple-800/60">
                  <span className="text-xs text-slate-400">Verified Sellers</span>
                  <div className="text-xl font-bold text-amber-400 mt-1">
                    {users.filter((u) => (u.role === 'seller' || u.role === 'both') && u.sellerVerified).length}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-[#130b31] border border-purple-800/60">
                  <span className="text-xs text-slate-400">Subscription Revenue</span>
                  <div className="text-xl font-bold text-pink-400 mt-1">
                    ₹{financialReport.sellerSubscriptionRevenue.toLocaleString()}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-[#130b31] border border-purple-800/60 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400">Export Sellers</span>
                    <div className="text-xs font-bold text-white mt-1">CSV Report</div>
                  </div>
                  <button
                    onClick={() => exportToCsv('sellers')}
                    className="p-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Sellers List */}
              <div className="space-y-3">
                {users
                  .filter((u) => u.role === 'seller' || u.role === 'both')
                  .map((seller) => {
                    const sellerProds = allProducts.filter((p) => p.sellerId === seller.id || p.sellerName?.toLowerCase() === seller.fullName?.toLowerCase());
                    return (
                      <div
                        key={seller.id}
                        className="p-4 rounded-2xl bg-[#130b31] border border-purple-800/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center font-bold text-white">
                            {(seller.fullName || 'S')[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-extrabold text-sm text-white">{seller.fullName}</h4>
                              {seller.sellerVerified && (
                                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                                  <BadgeCheck className="w-3 h-3" />
                                  Verified
                                </span>
                              )}
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                  seller.subscriptionStatus === 'active'
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : seller.subscriptionStatus === 'failed'
                                    ? 'bg-red-500/20 text-red-300'
                                    : seller.subscriptionStatus === 'refunded'
                                    ? 'bg-purple-500/20 text-purple-300'
                                    : 'bg-amber-500/20 text-amber-300'
                                }`}
                              >
                                {seller.subscriptionStatus === 'active'
                                  ? 'Active'
                                  : seller.subscriptionStatus === 'failed'
                                  ? 'Failed'
                                  : seller.subscriptionStatus === 'refunded'
                                  ? 'Refunded'
                                  : 'Payment Pending'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 font-mono">{seller.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs font-mono">
                          <div>
                            <span className="text-slate-400 block text-[10px]">PRODUCTS</span>
                            <span className="font-bold text-white">{sellerProds.length}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">EST. SALES</span>
                            <span className="font-bold text-emerald-400">{seller.totalSalesCount || 0}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">EARNINGS</span>
                            <span className="font-bold text-pink-300">₹{(seller.totalEarnings || 0).toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => toggleSellerVerification(seller.id, !seller.sellerVerified)}
                            className="px-3 py-1.5 rounded-xl bg-purple-900/80 hover:bg-purple-800 text-xs font-bold text-amber-300 border border-purple-700 cursor-pointer"
                          >
                            {seller.sellerVerified ? 'Revoke Seal' : 'Grant Gold Seal'}
                          </button>
                          <select
                            value={seller.subscriptionStatus || 'pending'}
                            onChange={(e) =>
                              updateSubscriptionStatus(seller.id, e.target.value as MembershipStatus)
                            }
                            aria-label={`Membership status for ${seller.email}`}
                            className="px-2.5 py-1.5 rounded-xl bg-pink-950/90 text-xs font-bold text-pink-200 border border-pink-700 cursor-pointer focus:outline-none"
                          >
                            <option value="pending">Payment Pending</option>
                            <option value="active">Active (₹999 Paid)</option>
                            <option value="failed">Failed</option>
                            <option value="refunded">Refunded</option>
                            <option value="none">None / Revoked</option>
                          </select>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* PAYU LIFETIME SELLER MEMBERSHIP PAYMENTS TABLE */}
              <div className="rounded-2xl bg-[#130b31] border border-purple-800/60 shadow-xl overflow-hidden space-y-3 p-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-purple-900/60 pb-4">
                  <div>
                    <h4 className="font-extrabold text-base text-white flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-emerald-400" />
                      <span>PayU Lifetime Seller Membership Payments (₹999 INR)</span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      PayU Checkout Gateway: <strong>{isPaymentGatewayEnabled ? 'Live Server Verification Active' : 'Pending Server Integration (Disabled)'}</strong>
                    </p>
                  </div>
                  <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-full font-bold">
                    {allMembershipPayments.filter((p) => p.status === 'success').length} Active Memberships
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#1b1046] text-slate-300 uppercase font-mono text-[10px] tracking-wider border-b border-purple-900/60">
                      <tr>
                        <th className="py-3 px-4">Seller</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">PayU TXNID</th>
                        <th className="py-3 px-4">PayU ID (Mihpayid)</th>
                        <th className="py-3 px-4">Payment Mode</th>
                        <th className="py-3 px-4">Payment Status</th>
                        <th className="py-3 px-4">Verification</th>
                        <th className="py-3 px-4">Payment Date</th>
                        <th className="py-3 px-4 text-right">Membership</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-900/40 text-slate-200">
                      {allMembershipPayments.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-slate-400">
                            No PayU membership transactions recorded yet.
                          </td>
                        </tr>
                      ) : (
                        allMembershipPayments.map((p) => (
                          <tr key={p.id} className="hover:bg-purple-950/30 transition-colors">
                            <td className="py-3 px-4">
                              <span className="font-bold text-white block truncate max-w-[150px]">{p.sellerName || 'Seller'}</span>
                              <span className="text-[10px] text-pink-300 font-mono block truncate max-w-[150px]">{p.sellerEmail}</span>
                            </td>
                            <td className="py-3 px-4 font-bold text-emerald-400 text-sm">
                              ₹{p.amount.toFixed(2)}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-300 text-[11px]">
                              {p.txnid}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                              {p.payuId || '—'}
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded-lg bg-purple-950 text-indigo-300 border border-purple-800 text-[10px] font-mono uppercase">
                                {p.paymentMode || 'UPI'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                  p.status === 'success'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : p.status === 'pending'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                    : 'bg-red-500/20 text-red-300 border border-red-500/40'
                                }`}
                              >
                                {p.status}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`text-[11px] font-semibold flex items-center gap-1 ${p.status === 'success' ? 'text-emerald-400' : 'text-amber-300'}`}>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{p.status === 'success' ? 'Verified' : 'Unverified'}</span>
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-400 text-[11px]">
                              {new Date(p.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span
                                className={`text-[10px] font-extrabold px-2.5 py-1 rounded-xl whitespace-nowrap ${
                                  p.status === 'success'
                                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {p.status === 'success' ? 'LIFETIME ACTIVE' : 'INACTIVE'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* 4. AFFILIATE MANAGEMENT */}
          {/* =================================================================== */}
          {activeSection === 'affiliates' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-[#130b31] border border-purple-800/60">
                  <span className="text-xs text-slate-400">Total Affiliates</span>
                  <div className="text-xl font-bold text-white mt-1">{stats.totalAffiliates}</div>
                </div>
                <div className="p-4 rounded-2xl bg-[#130b31] border border-purple-800/60">
                  <span className="text-xs text-slate-400">Generated Links</span>
                  <div className="text-xl font-bold text-indigo-400 mt-1">{allAffiliateLinks.length}</div>
                </div>
                <div className="p-4 rounded-2xl bg-[#130b31] border border-purple-800/60">
                  <span className="text-xs text-slate-400">Approved Commissions</span>
                  <div className="text-xl font-bold text-emerald-400 mt-1">
                    ₹{stats.approvedCommissions.toLocaleString()}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-[#130b31] border border-purple-800/60 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400">Export Affiliates</span>
                    <div className="text-xs font-bold text-white mt-1">CSV Report</div>
                  </div>
                  <button
                    onClick={() => exportToCsv('affiliates')}
                    className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Affiliates List */}
              <div className="space-y-3">
                {users
                  .filter((u) => u.role === 'affiliate' || u.role === 'both')
                  .map((aff) => {
                    const links = allAffiliateLinks.filter((l) => l.affiliateId === aff.id);
                    const clicks = links.reduce((acc, l) => acc + (l.clicksCount || 0), 0);
                    return (
                      <div
                        key={aff.id}
                        className="p-4 rounded-2xl bg-[#130b31] border border-purple-800/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white">
                            {(aff.fullName || 'A')[0].toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-extrabold text-sm text-white">{aff.fullName}</h4>
                            <p className="text-xs text-slate-400 font-mono">{aff.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 text-xs font-mono">
                          <div>
                            <span className="text-slate-400 block text-[10px]">LINKS</span>
                            <span className="font-bold text-indigo-300">{links.length} Active</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">TOTAL CLICKS</span>
                            <span className="font-bold text-cyan-400">{clicks}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">SALES</span>
                            <span className="font-bold text-emerald-400">{aff.totalSalesCount || 0}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedUserForDetail(aff)}
                            className="px-3 py-1.5 rounded-xl bg-purple-900/70 hover:bg-purple-800 text-xs font-bold text-white cursor-pointer"
                          >
                            View Stats
                          </button>
                          {aff.status === 'active' ? (
                            <button
                              onClick={() => setSuspendModalUser(aff)}
                              className="px-3 py-1.5 rounded-xl bg-red-950 text-red-300 hover:bg-red-900 text-xs font-bold border border-red-800 cursor-pointer"
                            >
                              Suspend
                            </button>
                          ) : (
                            <button
                              onClick={() => updateUserStatus(aff.id, 'active')}
                              className="px-3 py-1.5 rounded-xl bg-emerald-950 text-emerald-300 hover:bg-emerald-900 text-xs font-bold border border-emerald-800 cursor-pointer"
                            >
                              Activate
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* 5. PRODUCT MANAGEMENT */}
          {/* =================================================================== */}
          {activeSection === 'products' && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search product titles, categories, sellers..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#140b33] border border-purple-800/80 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {(['all', 'pending', 'approved', 'featured', 'rejected'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setProductStatusFilter(s)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                        productStatusFilter === s
                          ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white font-bold shadow'
                          : 'bg-[#140b33] text-slate-300 hover:text-white border border-purple-800/60'
                      }`}
                    >
                      {s === 'all' && 'All Statuses'}
                      {s === 'pending' && 'Pending Approval'}
                      {s === 'approved' && 'Approved & Live'}
                      {s === 'featured' && 'Featured Only'}
                      {s === 'rejected' && 'Rejected'}
                    </button>
                  ))}
                  <select
                    value={productSourceFilter}
                    onChange={(e) => setProductSourceFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-[#140b33] text-slate-200 border border-purple-800/80 text-xs font-semibold focus:outline-none"
                  >
                    <option value="all">All Networks</option>
                    <option value="seller">ClickBarry Direct</option>
                    <option value="amazon">Amazon Associates</option>
                    <option value="clickbank">ClickBank</option>
                    <option value="digistore24">Digistore24</option>
                  </select>
                  <button
                    onClick={() => exportToCsv('products')}
                    className="p-2 rounded-xl bg-purple-950 text-slate-300 hover:text-white border border-purple-800"
                    title="Export Products CSV"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Products Table */}
              <div className="rounded-2xl bg-[#130b31] border border-purple-800/60 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#1b1046] text-slate-300 uppercase font-mono text-[10px] tracking-wider border-b border-purple-900/60">
                      <tr>
                        <th className="py-3 px-4">Product</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Network / Source</th>
                        <th className="py-3 px-4">Price</th>
                        <th className="py-3 px-4">Commission</th>
                        <th className="py-3 px-4">Approval</th>
                        <th className="py-3 px-4">Featured</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-900/40 text-slate-200">
                      {filteredProducts.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400">
                            No products match your criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredProducts.map((p) => (
                          <tr key={p.id} className="hover:bg-purple-950/30 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <img
                                  src={p.image || defaultProductCover}
                                  alt={p.title}
                                  className="w-10 h-10 rounded-lg object-cover bg-purple-950 border border-purple-800 shrink-0"
                                />
                                <div className="overflow-hidden">
                                  <span className="font-bold text-white block truncate max-w-[180px]">
                                    {p.title}
                                  </span>
                                  <span className="text-[10px] text-slate-400 block truncate max-w-[180px]">
                                    by {p.sellerName || 'Seller'}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="px-2 py-0.5 rounded-full bg-purple-950 text-pink-300 border border-purple-800 text-[10px] font-medium capitalize">
                                {p.category}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="text-[11px] font-semibold text-slate-300">
                                {p.networkName || 'ClickBarry Seller'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-bold text-white">
                              ₹{p.price}
                            </td>
                            <td className="py-3.5 px-4 text-emerald-400 font-bold">
                              {p.commissionRate || 40}%
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  p.approvalStatus === 'approved' && p.status === 'published'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : p.approvalStatus === 'rejected'
                                    ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                }`}
                              >
                                {p.approvalStatus === 'approved' && p.status === 'published' ? 'APPROVED' : p.approvalStatus === 'rejected' ? 'REJECTED' : 'PENDING'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <button
                                onClick={() => toggleFeaturedProduct(p.id, !p.isFeatured)}
                                className={`p-1.5 rounded-lg cursor-pointer ${
                                  p.isFeatured ? 'text-amber-400 bg-amber-950/60 border border-amber-700/60' : 'text-slate-500 hover:text-amber-300'
                                }`}
                                title={p.isFeatured ? 'Featured on Homepage' : 'Mark as Featured'}
                              >
                                <Star className={`w-4 h-4 ${p.isFeatured ? 'fill-amber-400' : ''}`} />
                              </button>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {p.approvalStatus !== 'approved' && (
                                  <button
                                    onClick={() => approveProduct(p.id)}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] cursor-pointer"
                                  >
                                    Approve
                                  </button>
                                )}
                                {p.approvalStatus === 'approved' && p.status === 'published' && (
                                  <button
                                    onClick={() => setSuspendProductTarget(p)}
                                    className="px-2 py-1 rounded-lg bg-amber-950/80 text-amber-300 hover:bg-amber-900 border border-amber-700 text-[11px] font-semibold cursor-pointer"
                                  >
                                    Suspend
                                  </button>
                                )}
                                <button
                                  onClick={() => setRejectProductTarget(p)}
                                  className="px-2 py-1 rounded-lg bg-purple-950 text-slate-300 hover:text-white border border-purple-800 text-[11px] cursor-pointer"
                                >
                                  Reject
                                </button>
                                <button
                                  onClick={() => setDeleteProductTarget(p)}
                                  className="p-1.5 rounded-lg bg-red-950/80 text-red-400 hover:bg-red-900 border border-red-800 cursor-pointer"
                                  title="Delete Listing"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Reported Products Queue */}
              <div className="rounded-2xl bg-[#130b31] border border-red-800/50 shadow-xl overflow-hidden">
                <div className="p-4 border-b border-purple-900/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flag className="w-4 h-4 text-red-400" />
                    <h4 className="font-extrabold text-sm text-white">Reported Products Moderation Queue</h4>
                  </div>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 font-bold">
                    {productReports.filter((r) => r.status === 'open' || r.status === 'investigating').length} Open Reports
                  </span>
                </div>
                {productReports.length === 0 ? (
                  <p className="text-xs text-slate-400 py-8 text-center">No product reports submitted.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#1b1046] text-slate-300 uppercase font-mono text-[10px] border-b border-purple-900/60">
                        <tr>
                          <th className="py-3 px-4">Product</th>
                          <th className="py-3 px-4">Reason &amp; Details</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Reported</th>
                          <th className="py-3 px-4 text-right">Moderation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-purple-900/40 text-slate-200">
                        {productReports.map((rep: ProductReportRecord) => (
                          <tr key={rep.id}>
                            <td className="py-3 px-4 font-bold text-white">
                              {rep.productTitle || rep.productId.slice(0, 10)}
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-semibold text-red-300 block">{rep.reason}</span>
                              {rep.details && (
                                <span className="text-[11px] text-slate-400 block max-w-xs truncate">
                                  {rep.details}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-950 text-amber-300 border border-purple-800">
                                {rep.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-400 text-[11px]">
                              {new Date(rep.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                {rep.status !== 'resolved' && (
                                  <button
                                    onClick={() => resolveProductReport(rep.id, 'resolved', 'Reviewed and resolved by Admin')}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold cursor-pointer"
                                  >
                                    Resolve
                                  </button>
                                )}
                                {rep.status === 'open' && (
                                  <button
                                    onClick={() => resolveProductReport(rep.id, 'investigating')}
                                    className="px-2 py-1 rounded-lg bg-amber-950 text-amber-300 border border-amber-800 text-[11px] font-bold cursor-pointer"
                                  >
                                    Investigate
                                  </button>
                                )}
                                {rep.status !== 'dismissed' && (
                                  <button
                                    onClick={() => resolveProductReport(rep.id, 'dismissed', 'Dismissed after verification')}
                                    className="px-2 py-1 rounded-lg bg-purple-950 text-slate-300 border border-purple-800 text-[11px] cursor-pointer"
                                  >
                                    Dismiss
                                  </button>
                                )}
                              </div>
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

          {/* =================================================================== */}
          {/* 6. FINANCIAL MANAGEMENT */}
          {/* =================================================================== */}
          {activeSection === 'financials' && (
            <div className="space-y-6">
              {/* Financial Integrity Card */}
              <div className="p-5 rounded-2xl bg-[#140b33] border border-purple-800/80 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-white">
                        ClickBarry Reconciled Financial Audit
                      </h3>
                      <p className="text-xs text-slate-400">
                        Strict separation of Platform Subscriptions vs Affiliate Commissions. External Network earnings are never blended.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => exportToCsv('financials')}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold shadow cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Audit Report</span>
                  </button>
                </div>

                {/* 9 Core Reconciled Ledger Streams */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-[#1c1244] border border-pink-500/30">
                    <span className="text-[11px] font-bold text-pink-300 uppercase block">
                      1. Seller Subscription Revenue
                    </span>
                    <div className="text-2xl font-black text-white mt-1">
                      ₹{financialReport.sellerSubscriptionRevenue.toLocaleString()}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Direct ClickBarry platform revenue at ₹999 lifetime access per active seller.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#1c1244] border border-amber-500/30">
                    <span className="text-[11px] font-bold text-amber-300 uppercase block">
                      2. Seller Platform Fees ({settings.platformFeePercentage ?? 15}%)
                    </span>
                    <div className="text-2xl font-black text-amber-400 mt-1">
                      ₹{(financialReport.sellerSaleFees || 0).toLocaleString()}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      15% per-sale platform fee collected from verified Seller marketplace orders.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#1c1244] border border-cyan-500/30">
                    <span className="text-[11px] font-bold text-cyan-300 uppercase block">
                      3. Affiliate Withdrawal Fees ({settings.withdrawalFeePercentage ?? 5}%)
                    </span>
                    <div className="text-2xl font-black text-cyan-300 mt-1">
                      ₹{(financialReport.affiliateWithdrawalFees || 0).toLocaleString()}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      5% processing fee retained when affiliate payouts settle (e.g. ₹1,000 → ₹50 fee).
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#1c1244] border border-purple-800/70">
                    <span className="text-[11px] font-bold text-emerald-300 uppercase block">
                      4. Verified Affiliate Commission
                    </span>
                    <div className="text-2xl font-black text-emerald-400 mt-1">
                      ₹{financialReport.verifiedSellerCommission.toLocaleString()}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Commissions earned by affiliate marketers from verified ClickBarry marketplace transactions.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#1c1244] border border-indigo-800/70">
                    <span className="text-[11px] font-bold text-indigo-300 uppercase block">
                      5. External Network Commission
                    </span>
                    <div className="text-2xl font-black text-indigo-300 mt-1">
                      ₹{financialReport.externalNetworkCommission.toLocaleString()}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      External network earnings (reported separately; not ClickBarry controlled funds).
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#1c1244] border border-indigo-500/30">
                    <span className="text-[11px] font-bold text-indigo-300 uppercase block">
                      6. Referral Rewards Accrued
                    </span>
                    <div className="text-2xl font-black text-indigo-300 mt-1">
                      ₹{(financialReport.referralEarnings || 0).toLocaleString()}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      10% lifetime referral rewards + ₹100 Seller pass bonuses.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#1c1244] border border-purple-800/70">
                    <span className="text-[11px] font-bold text-purple-300 uppercase block">
                      7. Affiliate Withdrawal Requests
                    </span>
                    <div className="text-2xl font-black text-white mt-1">
                      ₹{financialReport.totalAffiliateWithdrawalRequests.toLocaleString()}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Total gross payout volume requested by affiliates across UPI &amp; Bank Transfers.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#1c1244] border border-emerald-500/30">
                    <span className="text-[11px] font-bold text-emerald-400 uppercase block">
                      8. Actual Settled Payouts (Net Paid)
                    </span>
                    <div className="text-2xl font-black text-emerald-400 mt-1">
                      ₹{financialReport.actualAffiliatePayouts.toLocaleString()}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Manually executed payments with verified Bank UTR or UPI Reference Number.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#1c1244] border border-amber-500/30">
                    <span className="text-[11px] font-bold text-amber-300 uppercase block">
                      9. Pending / Processing Payouts
                    </span>
                    <div className="text-2xl font-black text-amber-400 mt-1">
                      ₹{financialReport.pendingWithdrawalsVolume.toLocaleString()}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Currently locked &amp; reserved in the double-entry accounting ledger.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-900/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-white">Net Platform Revenue (Passes + Fees − Referrals):</span>
                    <span className="text-emerald-300 font-extrabold">
                      ₹{financialReport.actualPlatformNetRevenue.toLocaleString()}
                    </span>
                  </div>
                  <span className="font-mono text-emerald-400 font-bold">VERIFIED BALANCED</span>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* 7. ADMIN WITHDRAWAL MANAGEMENT (Phase 5 Connected) */}
          {/* =================================================================== */}
          {activeSection === 'withdrawals' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={withdrawalSearch}
                    onChange={(e) => setWithdrawalSearch(e.target.value)}
                    placeholder="Search by Request #, UPI ID, or UTR..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#140b33] border border-purple-800/80 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {(['all', 'pending', 'processing', 'paid', 'rejected'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setWithdrawalFilterStatus(st)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                        withdrawalFilterStatus === st
                          ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white font-bold shadow'
                          : 'bg-[#140b33] text-slate-300 hover:text-white border border-purple-800/60'
                      }`}
                    >
                      {st.toUpperCase()}
                    </button>
                  ))}
                  <button
                    onClick={() => exportToCsv('withdrawals')}
                    className="p-2 rounded-xl bg-purple-950 text-slate-300 hover:text-white border border-purple-800"
                    title="Export Payouts CSV"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Withdrawals Table */}
              <div className="rounded-2xl bg-[#130b31] border border-purple-800/60 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#1b1046] text-slate-300 uppercase font-mono text-[10px] tracking-wider border-b border-purple-900/60">
                      <tr>
                        <th className="py-3 px-4">Request #</th>
                        <th className="py-3 px-4">Gross</th>
                        <th className="py-3 px-4">5% Fee</th>
                        <th className="py-3 px-4">Net Payable</th>
                        <th className="py-3 px-4">Method &amp; Details</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Bank UTR / UPI Ref</th>
                        <th className="py-3 px-4">Submitted</th>
                        <th className="py-3 px-4 text-right">Process Payout</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-900/40 text-slate-200">
                      {filteredWithdrawals.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-slate-400">
                            No withdrawal requests found.
                          </td>
                        </tr>
                      ) : (
                        filteredWithdrawals.map((req) => {
                          const feePct = req.platformFeePct ?? settings.withdrawalFeePercentage ?? 5;
                          const feeCalc = calculateWithdrawalBreakdown(req.amount, feePct);
                          const feeAmt = req.platformFeeAmount ?? feeCalc.feeAmount;
                          const netAmt = req.netPayableAmount ?? feeCalc.netPayable;
                          return (
                          <tr key={req.id} className="hover:bg-purple-950/30 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-pink-300">
                              {req.requestNumber}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-white">
                              ₹{req.amount.toLocaleString()}
                            </td>
                            <td className="py-3.5 px-4 text-amber-300 font-semibold">
                              -₹{feeAmt.toLocaleString()}
                            </td>
                            <td className="py-3.5 px-4 font-extrabold text-emerald-400">
                              ₹{netAmt.toLocaleString()}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1.5 font-medium">
                                {req.paymentMethod === 'upi' ? (
                                  <>
                                    <Smartphone className="w-3.5 h-3.5 text-pink-400" />
                                    <span className="font-mono text-xs">{req.upiId}</span>
                                  </>
                                ) : (
                                  <>
                                    <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                                    <span className="text-[11px]">{req.accountHolderName} • {req.bankName} (IFSC: {req.ifscCode})</span>
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                                  req.status === 'paid'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : req.status === 'pending'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                    : req.status === 'processing'
                                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                    : 'bg-red-500/20 text-red-300 border border-red-500/40'
                                }`}
                              >
                                {req.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300">
                              {req.transactionReference || <span className="text-slate-600">—</span>}
                            </td>
                            <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                              {new Date(req.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() => setAdminPayoutModalTarget(req)}
                                className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer shadow transition-all ${
                                  req.status === 'paid'
                                    ? 'bg-purple-950 text-slate-400 hover:text-white'
                                    : 'bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white'
                                }`}
                              >
                                {req.status === 'paid' ? 'View Receipt' : 'Review & Pay'}
                              </button>
                            </td>
                          </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* 7B. REFERRAL MANAGEMENT (AdminCore) */}
          {/* =================================================================== */}
          {activeSection === 'referrals' && (() => {
            const effectiveComms = allReferralCommissions.length > 0 ? allReferralCommissions : adminReferralCommissions;
            const filteredRefs = allReferrals.filter((r) => {
              if (referralTypeFilter !== 'all' && r.referralType !== referralTypeFilter) return false;
              const q = referralSearch.trim().toLowerCase();
              if (!q) return true;
              return (
                (r.referrerName || '').toLowerCase().includes(q) ||
                (r.referrerEmail || '').toLowerCase().includes(q) ||
                (r.referredName || '').toLowerCase().includes(q) ||
                (r.referredEmail || '').toLowerCase().includes(q) ||
                (r.referralCodeUsed || '').toLowerCase().includes(q)
              );
            });
            const filteredComms = effectiveComms.filter((rc) => {
              const q = referralSearch.trim().toLowerCase();
              if (!q) return true;
              return (
                (rc.referrerName || '').toLowerCase().includes(q) ||
                (rc.referrerEmail || '').toLowerCase().includes(q) ||
                (rc.referredName || '').toLowerCase().includes(q) ||
                (rc.referredEmail || '').toLowerCase().includes(q) ||
                (rc.sourceTransactionId || '').toLowerCase().includes(q)
              );
            });
            const totalCreditedBonuses = effectiveComms.filter(
              (c) => c.rewardType === 'one_time_bonus' && (c.status === 'approved' || c.status === 'paid')
            ).length;
            const totalNetReferralPaidOut = effectiveComms
              .filter((c) => c.status === 'approved' || c.status === 'paid')
              .reduce((s, c) => s + c.rewardAmount, 0);
            const unresolvedFraudCount = fraudLogs.filter((f) => !f.resolved).length;

            return (
              <div className="space-y-6">
                {/* Summary KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-5 rounded-2xl bg-[#130b31] border border-purple-800/60 shadow-xl">
                    <span className="text-xs text-slate-400">All Referrals</span>
                    <div className="text-2xl font-black text-white mt-1">{allReferrals.length}</div>
                    <span className="text-[11px] text-slate-400">
                      {allReferrals.filter((r) => r.referralType === 'affiliate').length} Affiliates •{' '}
                      {allReferrals.filter((r) => r.referralType === 'seller').length} Sellers
                    </span>
                  </div>
                  <div className="p-5 rounded-2xl bg-[#130b31] border border-pink-500/30 shadow-xl">
                    <span className="text-xs text-slate-400">₹100 Seller Bonuses Credited</span>
                    <div className="text-2xl font-black text-pink-300 mt-1">
                      ₹{(totalCreditedBonuses * (settings.sellerReferralBonus ?? 100)).toLocaleString()}
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {totalCreditedBonuses} verified ₹999 Seller passes
                    </span>
                  </div>
                  <div className="p-5 rounded-2xl bg-[#130b31] border border-emerald-500/30 shadow-xl">
                    <span className="text-xs text-slate-400">Approved &amp; Paid Referral Rewards</span>
                    <div className="text-2xl font-black text-emerald-400 mt-1">
                      ₹{totalNetReferralPaidOut.toLocaleString()}
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Strict Net-Earnings Basis ({settings.referralCommissionPercentage ?? 10}%)
                    </span>
                  </div>
                  <div className="p-5 rounded-2xl bg-[#130b31] border border-amber-500/30 shadow-xl">
                    <span className="text-xs text-slate-400">Fraud &amp; Reversal Alerts</span>
                    <div className="text-2xl font-black text-amber-400 mt-1">{unresolvedFraudCount}</div>
                    <span className="text-[11px] text-slate-400">
                      {fraudLogs.length} total security events logged
                    </span>
                  </div>
                </div>

                {/* Sub-tabs & Search */}
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {[
                      { id: 'all', label: `All Referrals (${allReferrals.length})` },
                      { id: 'commissions', label: `Referral Commission History (${effectiveComms.length})` },
                      { id: 'fraud', label: `Fraud Detection (${unresolvedFraudCount})` },
                      { id: 'settings', label: 'Referral Commission Settings' }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setReferralSubTab(tab.id as any)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                          referralSubTab === tab.id
                            ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow'
                            : 'bg-[#140b33] text-slate-300 hover:text-white border border-purple-800/60'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 min-w-[220px]">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={referralSearch}
                        onChange={(e) => setReferralSearch(e.target.value)}
                        placeholder="Search referrer, referred user, or code..."
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#140b33] border border-purple-800/80 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-pink-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => refreshReferrals()}
                      className="p-2 rounded-xl bg-purple-950 text-slate-300 hover:text-white border border-purple-800 cursor-pointer"
                      title="Refresh Referral Ledger"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {referralActionFeedback && (
                  <div className="p-3 rounded-xl bg-indigo-950/70 border border-indigo-500/40 text-xs text-indigo-200 flex items-center justify-between">
                    <span>{referralActionFeedback}</span>
                    <button
                      type="button"
                      onClick={() => setReferralActionFeedback(null)}
                      className="text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* SUB-TAB 1: ALL REFERRALS */}
                {referralSubTab === 'all' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      {(['all', 'affiliate', 'seller'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setReferralTypeFilter(t)}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase cursor-pointer ${
                            referralTypeFilter === t
                              ? 'bg-indigo-600 text-white'
                              : 'bg-[#130b31] text-slate-400 border border-purple-800/60'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>

                    <div className="rounded-2xl bg-[#130b31] border border-purple-800/60 shadow-xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[#1b1046] text-slate-300 uppercase font-mono text-[10px] border-b border-purple-900/60">
                            <tr>
                              <th className="py-3 px-4">Referrer Details</th>
                              <th className="py-3 px-4">Referred User Details</th>
                              <th className="py-3 px-4">Referral Type</th>
                              <th className="py-3 px-4">₹100 Bonus Status</th>
                              <th className="py-3 px-4">Lifetime Net Commission</th>
                              <th className="py-3 px-4">Status</th>
                              <th className="py-3 px-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-purple-900/40">
                            {filteredRefs.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="py-12 text-center text-slate-400">
                                  No referral records match your current filter.
                                </td>
                              </tr>
                            ) : (
                              filteredRefs.map((ref) => (
                                <tr key={ref.id} className="hover:bg-[#1a1040]/50">
                                  <td className="py-3 px-4">
                                    <div className="font-bold text-white">
                                      {ref.referrerName || ref.referrerId.slice(0, 10)}
                                    </div>
                                    <div className="text-[11px] text-slate-400 font-mono">
                                      {ref.referrerEmail || ref.referrerId}
                                    </div>
                                    <span className="text-[10px] text-pink-300 font-mono">
                                      Code: {ref.referralCodeUsed}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="font-bold text-white">
                                      {ref.referredName || ref.referredUserId.slice(0, 10)}
                                    </div>
                                    <div className="text-[11px] text-slate-400 font-mono">
                                      {ref.referredEmail || ref.referredUserId}
                                    </div>
                                    {ref.referralType === 'seller' && (
                                      <span className="text-[10px] text-slate-400 uppercase">
                                        Pass: {ref.referredSubscriptionStatus || 'none'}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4">
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                        ref.referralType === 'seller'
                                          ? 'bg-pink-500/20 text-pink-300'
                                          : 'bg-indigo-500/20 text-indigo-300'
                                      }`}
                                    >
                                      {ref.referralType}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4">
                                    {ref.referralType === 'seller' ? (
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                          ref.bonusStatus === 'credited'
                                            ? 'bg-emerald-500/20 text-emerald-300'
                                            : ref.bonusStatus === 'reversed' || ref.bonusStatus === 'failed_pass'
                                            ? 'bg-red-500/20 text-red-300'
                                            : 'bg-amber-500/20 text-amber-300'
                                        }`}
                                      >
                                        {ref.bonusStatus === 'credited'
                                          ? `Credited (₹${ref.bonusAmount || 100})`
                                          : ref.bonusStatus === 'reversed'
                                          ? 'Reversed'
                                          : ref.bonusStatus === 'failed_pass'
                                          ? 'Pass Failed'
                                          : 'Pending ₹999 Pass'}
                                      </span>
                                    ) : (
                                      <span className="text-[11px] text-slate-500">N/A</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 font-bold text-emerald-400">
                                    ₹{(ref.lifetimeCommissionTotal || 0).toLocaleString()}
                                  </td>
                                  <td className="py-3 px-4">
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                        ref.status === 'active'
                                          ? 'bg-emerald-500/20 text-emerald-300'
                                          : ref.status === 'blocked'
                                          ? 'bg-red-500/20 text-red-300'
                                          : 'bg-amber-500/20 text-amber-300'
                                      }`}
                                    >
                                      {ref.status}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <button
                                      type="button"
                                      disabled={referralActionLoadingId === ref.id}
                                      onClick={async () => {
                                        setReferralActionLoadingId(ref.id);
                                        const nextStatus = ref.status === 'blocked' ? 'active' : 'blocked';
                                        const res = await adminToggleReferralStatus(
                                          ref.id,
                                          nextStatus,
                                          nextStatus === 'blocked' ? 'Flagged by AdminCore Fraud Review' : 'Restored by AdminCore'
                                        );
                                        setReferralActionLoadingId(null);
                                        setReferralActionFeedback(
                                          res.success
                                            ? `Referral ${ref.id.slice(0, 8)} updated to ${nextStatus}.`
                                            : res.error || 'Failed to update referral.'
                                        );
                                      }}
                                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                                        ref.status === 'blocked'
                                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                                          : 'bg-red-950 text-red-300 border border-red-700/60'
                                      }`}
                                    >
                                      {ref.status === 'blocked' ? 'Reactivate' : 'Block'}
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* SUB-TAB 2: REFERRAL COMMISSION HISTORY */}
                {referralSubTab === 'commissions' && (
                  <div className="rounded-2xl bg-[#130b31] border border-purple-800/60 shadow-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#1b1046] text-slate-300 uppercase font-mono text-[10px] border-b border-purple-900/60">
                          <tr>
                            <th className="py-3 px-4">Date</th>
                            <th className="py-3 px-4">Referrer</th>
                            <th className="py-3 px-4">Referred User</th>
                            <th className="py-3 px-4">Reward Type</th>
                            <th className="py-3 px-4">Net Earnings Base</th>
                            <th className="py-3 px-4">Reward</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-purple-900/40">
                          {filteredComms.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="py-12 text-center text-slate-400">
                                No referral commission records found yet.
                              </td>
                            </tr>
                          ) : (
                            filteredComms.map((rc) => (
                              <tr key={rc.id} className="hover:bg-[#1a1040]/50">
                                <td className="py-3 px-4 text-slate-400">
                                  {new Date(rc.createdAt).toLocaleDateString()}
                                </td>
                                <td className="py-3 px-4">
                                  <div className="font-bold text-white">
                                    {rc.referrerName || rc.referrerId.slice(0, 10)}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    {rc.referrerEmail || rc.referrerId}
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="font-bold text-white">
                                    {rc.referredName || rc.referredUserId.slice(0, 10)}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    {rc.referredEmail || rc.referredUserId}
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="font-semibold text-white block">
                                    {rc.rewardType === 'one_time_bonus'
                                      ? '₹100 Seller Pass Bonus'
                                      : `${rc.commissionRate}% Lifetime Commission`}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {rc.sourceTransactionId || rc.sourceType || '—'}
                                  </span>
                                </td>
                                <td className="py-3 px-4 font-mono text-slate-200">
                                  ₹{rc.baseAmount.toLocaleString()}
                                  {rc.deductionsAmount ? (
                                    <span className="block text-[10px] text-slate-400">
                                      Deductions: -₹{rc.deductionsAmount.toLocaleString()}
                                    </span>
                                  ) : null}
                                </td>
                                <td
                                  className={`py-3 px-4 font-bold ${
                                    rc.status === 'reversed' ? 'text-red-400 line-through' : 'text-emerald-400'
                                  }`}
                                >
                                  ₹{rc.rewardAmount.toLocaleString()}
                                </td>
                                <td className="py-3 px-4">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                      rc.status === 'approved' || rc.status === 'paid'
                                        ? 'bg-emerald-500/20 text-emerald-300'
                                        : rc.status === 'reversed'
                                        ? 'bg-red-500/20 text-red-300'
                                        : 'bg-amber-500/20 text-amber-300'
                                    }`}
                                  >
                                    {rc.status}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                                  {rc.status === 'pending' && (
                                    <button
                                      type="button"
                                      disabled={referralActionLoadingId === rc.id}
                                      onClick={async () => {
                                        setReferralActionLoadingId(rc.id);
                                        const res = await adminUpdateReferralCommissionStatus(rc.id, 'approved');
                                        setReferralActionLoadingId(null);
                                        setReferralActionFeedback(
                                          res.success ? 'Referral reward approved.' : res.error || 'Error approving reward.'
                                        );
                                      }}
                                      className="px-2 py-1 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-700/60 text-[10px] font-bold cursor-pointer"
                                    >
                                      Approve
                                    </button>
                                  )}
                                  {rc.status === 'approved' && (
                                    <button
                                      type="button"
                                      disabled={referralActionLoadingId === rc.id}
                                      onClick={async () => {
                                        setReferralActionLoadingId(rc.id);
                                        const res = await adminUpdateReferralCommissionStatus(rc.id, 'paid');
                                        setReferralActionLoadingId(null);
                                        setReferralActionFeedback(
                                          res.success ? 'Referral reward marked Paid.' : res.error || 'Error updating status.'
                                        );
                                      }}
                                      className="px-2 py-1 rounded-lg bg-indigo-950 text-indigo-300 border border-indigo-700/60 text-[10px] font-bold cursor-pointer"
                                    >
                                      Mark Paid
                                    </button>
                                  )}
                                  {rc.status !== 'reversed' && (
                                    <button
                                      type="button"
                                      disabled={referralActionLoadingId === rc.id}
                                      onClick={async () => {
                                        setReferralActionLoadingId(rc.id);
                                        const res = await adminUpdateReferralCommissionStatus(
                                          rc.id,
                                          'reversed',
                                          'Reversed by AdminCore review'
                                        );
                                        setReferralActionLoadingId(null);
                                        setReferralActionFeedback(
                                          res.success ? 'Referral commission reversed.' : res.error || 'Error reversing reward.'
                                        );
                                      }}
                                      className="px-2 py-1 rounded-lg bg-red-950 text-red-300 border border-red-700/60 text-[10px] font-bold cursor-pointer"
                                    >
                                      Reverse
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* SUB-TAB 3: FRAUD DETECTION */}
                {referralSubTab === 'fraud' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-[#130b31] border border-amber-500/30 flex items-start gap-3 text-xs">
                      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-white">Automated Referral Fraud Detection &amp; Integrity Guard</h4>
                        <p className="text-slate-300 mt-0.5">
                          Monitors and blocks self-referrals, duplicate attribution attempts, immutable referrer tampering, suspended referrer activity, and automatic reversals on refunded or failed transactions.
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-[#130b31] border border-purple-800/60 shadow-xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[#1b1046] text-slate-300 uppercase font-mono text-[10px] border-b border-purple-900/60">
                            <tr>
                              <th className="py-3 px-4">Timestamp</th>
                              <th className="py-3 px-4">Event Type</th>
                              <th className="py-3 px-4">Severity</th>
                              <th className="py-3 px-4">Actor / Code</th>
                              <th className="py-3 px-4">Details</th>
                              <th className="py-3 px-4 text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-purple-900/40">
                            {fraudLogs.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="py-12 text-center text-slate-400">
                                  No fraud or abuse attempts logged.
                                </td>
                              </tr>
                            ) : (
                              fraudLogs.map((log) => (
                                <tr key={log.id}>
                                  <td className="py-3 px-4 text-slate-400">
                                    {new Date(log.createdAt).toLocaleString()}
                                  </td>
                                  <td className="py-3 px-4 font-mono text-pink-300">
                                    {log.eventType}
                                  </td>
                                  <td className="py-3 px-4">
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                        log.severity === 'critical' || log.severity === 'high'
                                          ? 'bg-red-500/20 text-red-300'
                                          : log.severity === 'medium'
                                          ? 'bg-amber-500/20 text-amber-300'
                                          : 'bg-slate-500/20 text-slate-300'
                                      }`}
                                    >
                                      {log.severity}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 font-mono text-[11px] text-slate-200">
                                    {log.userEmail || log.userId || '—'}
                                    {log.attemptedCode && (
                                      <span className="block text-pink-300">Code: {log.attemptedCode}</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-slate-300">{log.details}</td>
                                  <td className="py-3 px-4 text-right">
                                    {log.resolved ? (
                                      <span className="text-[10px] font-bold text-emerald-400 uppercase">
                                        Resolved
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => adminResolveFraudLog(log.id)}
                                        className="px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-700/60 text-[10px] font-bold cursor-pointer"
                                      >
                                        Mark Resolved
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* SUB-TAB 4: REFERRAL COMMISSION SETTINGS */}
                {referralSubTab === 'settings' && (
                  <form onSubmit={handleSaveSettings} className="max-w-3xl p-6 rounded-2xl bg-[#130b31] border border-purple-800/60 shadow-xl space-y-5">
                    <div>
                      <h3 className="font-extrabold text-sm text-white">Referral Commission &amp; Bonus Rules</h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Lifetime commissions are strictly computed on eligible net earnings after platform deductions — never on gross sales.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1">
                          Lifetime Referral Commission (%)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={50}
                          step={0.5}
                          value={tempSettings.referralCommissionPercentage ?? 10}
                          onChange={(e) =>
                            setTempSettings({
                              ...tempSettings,
                              referralCommissionPercentage: Number(e.target.value)
                            })
                          }
                          className="w-full px-3 py-2 rounded-xl bg-[#1b1046] border border-purple-800 text-white text-xs focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1">
                          One-Time Seller Pass Bonus (₹)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={tempSettings.sellerReferralBonus ?? 100}
                          onChange={(e) =>
                            setTempSettings({ ...tempSettings, sellerReferralBonus: Number(e.target.value) })
                          }
                          className="w-full px-3 py-2 rounded-xl bg-[#1b1046] border border-purple-800 text-white text-xs focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1">
                          Calculation Basis
                        </label>
                        <select
                          value={tempSettings.referralRevenueBasis || 'net_earnings'}
                          onChange={(e) =>
                            setTempSettings({
                              ...tempSettings,
                              referralRevenueBasis: e.target.value as 'net_earnings' | 'platform_revenue'
                            })
                          }
                          className="w-full px-3 py-2 rounded-xl bg-[#1b1046] border border-purple-800 text-white text-xs focus:outline-none"
                        >
                          <option value="net_earnings">Eligible Net Earnings Only (Recommended)</option>
                          <option value="platform_revenue">Platform Net Revenue Share</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isSavingSettings}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 text-white font-bold text-xs shadow-lg cursor-pointer"
                      >
                        {isSavingSettings ? 'Saving...' : 'Save Referral Settings'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            );
          })()}

          {/* =================================================================== */}
          {/* 8. CATEGORY MANAGEMENT */}
          {/* =================================================================== */}
          {activeSection === 'categories' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-base text-white">Marketplace Categories</h3>
                  <p className="text-xs text-slate-400">Organize digital assets, courses, templates, and creator tools</p>
                </div>
                <button
                  onClick={() => {
                    setEditingCategory(null);
                    setNewCatName('');
                    setNewCatSlug('');
                    setNewCatDesc('');
                    setShowCategoryModal(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 text-white font-bold text-xs shadow-md cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Category</span>
                </button>
              </div>

              {/* Categories Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((cat) => {
                  const count = allProducts.filter((p) => p.category?.toLowerCase() === cat.slug.toLowerCase()).length;
                  return (
                    <div
                      key={cat.id}
                      className="p-5 rounded-2xl bg-[#130b31] border border-purple-800/60 shadow-xl space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-xl bg-pink-600/20 border border-pink-500/30 flex items-center justify-center text-pink-400">
                          <FolderTree className="w-5 h-5" />
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingCategory(cat);
                              setNewCatName(cat.name);
                              setNewCatSlug(cat.slug);
                              setNewCatDesc(cat.description || '');
                              setShowCategoryModal(true);
                            }}
                            className="p-1.5 rounded-lg bg-purple-950 text-slate-300 hover:text-white"
                            title="Edit Category"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteCategoryTarget(cat)}
                            className="p-1.5 rounded-lg bg-red-950/80 text-red-400 hover:bg-red-900 cursor-pointer"
                            title="Delete Category"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-extrabold text-sm text-white">{cat.name}</h4>
                        <span className="text-[10px] text-pink-300 font-mono">slug: {cat.slug}</span>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{cat.description}</p>
                      </div>

                      <div className="pt-2 border-t border-purple-900/50 flex items-center justify-between text-xs">
                        <span className="text-slate-400">Active Listings:</span>
                        <span className="font-bold text-white font-mono">{count} products</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* 9. WEBSITE SETTINGS */}
          {/* =================================================================== */}
          {activeSection === 'settings' && (
            <div className="space-y-6 max-w-4xl">
              <form onSubmit={handleSaveSettings} className="space-y-6">
                {/* Branding Card */}
                <div className="p-5 rounded-2xl bg-[#130b31] border border-purple-800/60 shadow-xl space-y-4">
                  <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                    <Settings className="w-4 h-4 text-pink-400" />
                    <span>Platform Branding & Identity</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Site Name</label>
                      <input
                        type="text"
                        value={tempSettings.siteName}
                        onChange={(e) => setTempSettings({ ...tempSettings, siteName: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#1b1046] border border-purple-800 text-white text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Tagline</label>
                      <input
                        type="text"
                        value={tempSettings.tagline}
                        onChange={(e) => setTempSettings({ ...tempSettings, tagline: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#1b1046] border border-purple-800 text-white text-xs focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Description</label>
                      <textarea
                        rows={2}
                        value={tempSettings.description}
                        onChange={(e) => setTempSettings({ ...tempSettings, description: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#1b1046] border border-purple-800 text-white text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Economics & Withdrawal Limits */}
                <div className="p-5 rounded-2xl bg-[#130b31] border border-purple-800/60 shadow-xl space-y-4">
                  <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    <span>Financial Limits & Seller Pricing</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">
                        Min Withdrawal Amount (₹)
                      </label>
                      <input
                        type="number"
                        value={tempSettings.minWithdrawalAmount}
                        onChange={(e) => setTempSettings({ ...tempSettings, minWithdrawalAmount: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-xl bg-[#1b1046] border border-purple-800 text-white text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">
                        Max Withdrawal Amount (₹)
                      </label>
                      <input
                        type="number"
                        value={tempSettings.maxWithdrawalAmount}
                        onChange={(e) => setTempSettings({ ...tempSettings, maxWithdrawalAmount: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-xl bg-[#1b1046] border border-purple-800 text-white text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">
                        Seller Subscription Pass (₹)
                      </label>
                      <input
                        type="number"
                        value={tempSettings.sellerSubscriptionPrice}
                        onChange={(e) => setTempSettings({ ...tempSettings, sellerSubscriptionPrice: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-xl bg-[#1b1046] border border-purple-800 text-white text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Marketplace Commission, Platform Fees & Referral Rules */}
                <div className="p-5 rounded-2xl bg-[#130b31] border border-purple-800/60 shadow-xl space-y-4">
                  <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-pink-400" />
                    <span>Platform Fees, Commission Bounds &amp; Referral Program</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">
                        Seller Platform Fee (%)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={50}
                        step={0.5}
                        value={tempSettings.platformFeePercentage ?? 15}
                        onChange={(e) =>
                          setTempSettings({ ...tempSettings, platformFeePercentage: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-[#1b1046] border border-purple-800 text-white text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">
                        Affiliate Withdrawal Fee (%)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={25}
                        step={0.5}
                        value={tempSettings.withdrawalFeePercentage ?? 5}
                        onChange={(e) =>
                          setTempSettings({ ...tempSettings, withdrawalFeePercentage: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-[#1b1046] border border-purple-800 text-white text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">
                        Min Affiliate Commission (%)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={tempSettings.affiliateCommissionMin ?? 30}
                        onChange={(e) =>
                          setTempSettings({ ...tempSettings, affiliateCommissionMin: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-[#1b1046] border border-purple-800 text-white text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">
                        Max Affiliate Commission (%)
                      </label>
                      <input
                        type="number"
                        min={30}
                        max={100}
                        value={tempSettings.affiliateCommissionMax ?? 100}
                        onChange={(e) =>
                          setTempSettings({ ...tempSettings, affiliateCommissionMax: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-[#1b1046] border border-purple-800 text-white text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">
                        Lifetime Referral Rate (%)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={50}
                        step={0.5}
                        value={tempSettings.referralCommissionPercentage ?? 10}
                        onChange={(e) =>
                          setTempSettings({
                            ...tempSettings,
                            referralCommissionPercentage: Number(e.target.value)
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-[#1b1046] border border-purple-800 text-white text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">
                        Seller Pass Referral Bonus (₹)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={tempSettings.sellerReferralBonus ?? 100}
                        onChange={(e) =>
                          setTempSettings({ ...tempSettings, sellerReferralBonus: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-[#1b1046] border border-purple-800 text-white text-xs focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="text-xs font-semibold text-slate-300 block mb-1">
                        Referral Commission Revenue Basis
                      </label>
                      <select
                        value={tempSettings.referralRevenueBasis || 'net_earnings'}
                        onChange={(e) =>
                          setTempSettings({
                            ...tempSettings,
                            referralRevenueBasis: e.target.value as 'net_earnings' | 'platform_revenue'
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-[#1b1046] border border-purple-800 text-white text-xs focus:outline-none"
                      >
                        <option value="net_earnings">Eligible Net Earnings Only (After Platform Deductions)</option>
                        <option value="platform_revenue">Platform Net Revenue Share</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Contact & Support */}
                <div className="p-5 rounded-2xl bg-[#130b31] border border-purple-800/60 shadow-xl space-y-4">
                  <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-400" />
                    <span>Support & Operations</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Support Email</label>
                      <input
                        type="email"
                        value={tempSettings.supportEmail}
                        onChange={(e) => setTempSettings({ ...tempSettings, supportEmail: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#1b1046] border border-purple-800 text-white text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Contact Phone</label>
                      <input
                        type="text"
                        value={tempSettings.contactPhone}
                        onChange={(e) => setTempSettings({ ...tempSettings, contactPhone: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#1b1046] border border-purple-800 text-white text-xs focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Homepage Announcement Banner</label>
                      <input
                        type="text"
                        value={tempSettings.bannerAnnouncement || ''}
                        onChange={(e) => setTempSettings({ ...tempSettings, bannerAnnouncement: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#1b1046] border border-purple-800 text-white text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="submit"
                    disabled={isSavingSettings}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-xs shadow-lg shadow-pink-600/30 cursor-pointer"
                  >
                    {isSavingSettings ? 'Saving Settings...' : 'Save Website Settings'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* =================================================================== */}
          {/* 10. REPORTS & ANALYTICS */}
          {/* =================================================================== */}
          {activeSection === 'reports' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-base text-white">Platform Analytics & CSV Data Export</h3>
                  <p className="text-xs text-slate-400">Download immutable data records for financial accounting & compliance</p>
                </div>
              </div>

              {/* CSV Export Hub */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { id: 'users', label: 'All Registered Users', desc: 'User profiles, emails, status, and registration dates', icon: Users },
                  { id: 'sellers', label: 'Verified Sellers', desc: 'Seller stores, subscription status, and product counts', icon: UserCheck },
                  { id: 'affiliates', label: 'Affiliate Marketers', desc: 'Affiliates, tracking links, and conversion clicks', icon: Sparkles },
                  { id: 'products', label: 'Platform Catalog', desc: 'All products, approval statuses, categories, and prices', icon: ShoppingBag },
                  { id: 'clicks', label: 'Outbound Clicks Audit', desc: 'Real-time click log across affiliate tracking links', icon: ArrowUpRight },
                  { id: 'commissions', label: 'Verified Commissions', desc: 'Sales commission entries and order references', icon: DollarSign },
                  { id: 'withdrawals', label: 'Withdrawal Payouts', desc: 'UPI and Bank withdrawal requests with UTR numbers', icon: Wallet },
                  { id: 'financials', label: 'Financial Balance Sheet', desc: 'Reconciled platform revenue and disbursement summary', icon: FileSpreadsheet }
                ].map((exportItem) => {
                  const Icon = exportItem.icon;
                  return (
                    <div
                      key={exportItem.id}
                      className="p-5 rounded-2xl bg-[#130b31] border border-purple-800/60 shadow-xl flex flex-col justify-between gap-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-pink-600/20 border border-pink-500/30 flex items-center justify-center text-pink-400 shrink-0">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-sm text-white">{exportItem.label}</h4>
                          <p className="text-xs text-slate-400 mt-1">{exportItem.desc}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => exportToCsv(exportItem.id as any)}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-xs font-bold text-pink-300 hover:text-white border border-purple-700/60 transition-all cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export CSV</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* 11. SECURITY & AUDIT LOGS */}
          {/* =================================================================== */}
          {activeSection === 'security' && (
            <div className="space-y-6">
              {/* Security Status Card */}
              <div className="p-5 rounded-2xl bg-[#130b31] border border-emerald-500/30 shadow-xl space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white">Super Admin Security & Role-Based Access</h3>
                    <p className="text-xs text-slate-400">
                      Row Level Security (RLS) active on all Supabase tables. Passwords and auth secrets are never exposed in UI or logs.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                  <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-900/60">
                    <span className="text-slate-400 block text-[10px]">AUTHORIZED SUPER ADMIN</span>
                    <span className="font-mono text-emerald-400 font-bold">gnetam108@gmail.com</span>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-900/60">
                    <span className="text-slate-400 block text-[10px]">DATABASE INTEGRATION</span>
                    <span className="font-mono text-pink-300 font-bold">xhkverrkjhfqrvqraafb</span>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-900/60">
                    <span className="text-slate-400 block text-[10px]">LOG RECORD COUNT</span>
                    <span className="font-mono text-white font-bold">{auditLogs.length} immutable records</span>
                  </div>
                </div>
              </div>

              {/* Audit Logs Table */}
              <div className="rounded-2xl bg-[#130b31] border border-purple-800/60 shadow-xl overflow-hidden">
                <div className="p-4 border-b border-purple-900/60 flex items-center justify-between">
                  <h4 className="font-extrabold text-sm text-white">Administrative Activity Audit Feed</h4>
                  <span className="text-[11px] text-slate-400 font-mono">Ordered by latest activity</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#1b1046] text-slate-300 uppercase font-mono text-[10px] tracking-wider border-b border-purple-900/60">
                      <tr>
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4">Admin Email</th>
                        <th className="py-3 px-4">Action</th>
                        <th className="py-3 px-4">Target Type & ID</th>
                        <th className="py-3 px-4">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-900/40 text-slate-200">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-purple-950/30 transition-colors">
                          <td className="py-3 px-4 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 font-mono text-pink-300">
                            {log.adminEmail}
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-950 text-emerald-300 border border-purple-800 font-mono">
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                            {log.targetType.toUpperCase()}: {log.targetId}
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {log.details}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ===================================================================== */}
      {/* MODALS */}
      {/* ===================================================================== */}

      {/* 1. Admin Process Payout Modal (Connected to Phase 5) */}
      <AdminProcessPayoutModal
        request={adminPayoutModalTarget}
        isOpen={Boolean(adminPayoutModalTarget)}
        onClose={() => setAdminPayoutModalTarget(null)}
      />

      {/* 2. User Detail Modal */}
      {selectedUserForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-[#140b33] border border-purple-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-white">User Profile Details</h3>
              <button
                onClick={() => setSelectedUserForDetail(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 rounded-2xl bg-[#1b1046] border border-purple-800/60 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">User ID:</span>
                <span className="font-mono text-white">{selectedUserForDetail.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Name:</span>
                <span className="font-bold text-white">{selectedUserForDetail.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Email:</span>
                <span className="font-mono text-pink-300">{selectedUserForDetail.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Account Status:</span>
                <span className="font-bold text-emerald-400">{selectedUserForDetail.status.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Seller Verification:</span>
                <span className="font-bold text-amber-300">{selectedUserForDetail.sellerVerified ? 'Verified (Gold Seal)' : 'Unverified'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Subscription Status:</span>
                <span className="font-bold text-white">{selectedUserForDetail.subscriptionStatus}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Registered At:</span>
                <span className="text-white">{new Date(selectedUserForDetail.createdAt).toLocaleString()}</span>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setSelectedUserForDetail(null)}
                className="px-4 py-2 rounded-xl bg-purple-900 text-white font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Suspend User Modal */}
      {suspendModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-[#140b33] border border-red-800/80 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-950 border border-red-800 flex items-center justify-center text-red-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white">Suspend Account</h3>
                <p className="text-xs text-slate-400">{suspendModalUser.email}</p>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Reason for Suspension (Recorded in Audit Log)
              </label>
              <textarea
                rows={3}
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="e.g. Terms violation, fraudulent affiliate activity, or prohibited product listing."
                className="w-full px-3 py-2 rounded-xl bg-[#1b1046] border border-purple-800 text-white text-xs focus:outline-none focus:border-red-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setSuspendModalUser(null);
                  setSuspendReason('');
                }}
                className="px-4 py-2 rounded-xl bg-purple-950 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await updateUserStatus(suspendModalUser.id, 'suspended', suspendReason);
                  setSuspendModalUser(null);
                  setSuspendReason('');
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs"
              >
                Confirm Suspension
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Reject Product Modal */}
      {rejectProductTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-[#140b33] border border-purple-800 p-6 shadow-2xl space-y-4">
            <h3 className="font-extrabold text-base text-white">Reject Product Submission</h3>
            <p className="text-xs text-slate-400">
              Provide feedback for &ldquo;{rejectProductTarget.title}&rdquo;. The product will be returned to draft status.
            </p>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Reason for Rejection</label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#1b1046] border border-purple-800 text-white text-xs focus:outline-none focus:border-pink-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setRejectProductTarget(null)}
                className="px-4 py-2 rounded-xl bg-purple-950 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
                <button
                  onClick={async () => {
                    await rejectProduct(rejectProductTarget.id, rejectReason);
                    setRejectProductTarget(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs"
                >
                  Reject Product
                </button>
              </div>
            </div>
          </div>
        )}

      {/* 4b. Suspend Product Modal */}
      {suspendProductTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-[#140b33] border border-amber-700/80 p-6 shadow-2xl space-y-4">
            <h3 className="font-extrabold text-base text-white">Suspend Live Product</h3>
            <p className="text-xs text-slate-400">
              Suspend &ldquo;{suspendProductTarget.title}&rdquo; from the public Affiliate Marketplace immediately.
            </p>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Suspension Reason</label>
              <textarea
                rows={3}
                value={suspendProductReason}
                onChange={(e) => setSuspendProductReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#1b1046] border border-purple-800 text-white text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setSuspendProductTarget(null)}
                className="px-4 py-2 rounded-xl bg-purple-950 text-slate-300 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await suspendProduct(suspendProductTarget.id, suspendProductReason);
                  setSuspendProductTarget(null);
                }}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs cursor-pointer"
              >
                Confirm Suspend
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Add / Edit Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-[#140b33] border border-purple-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-white">
                {editingCategory ? 'Edit Category' : 'Create New Category'}
              </h3>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Category Name</label>
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => {
                    setNewCatName(e.target.value);
                    if (!editingCategory) {
                      setNewCatSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                    }
                  }}
                  placeholder="e.g. AI Prompt Packs"
                  className="w-full px-3 py-2 rounded-xl bg-[#1b1046] border border-purple-800 text-white text-xs focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">URL Slug</label>
                <input
                  type="text"
                  value={newCatSlug}
                  onChange={(e) => setNewCatSlug(e.target.value)}
                  placeholder="e.g. ai-prompt-packs"
                  className="w-full px-3 py-2 rounded-xl bg-[#1b1046] border border-purple-800 text-white text-xs focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  placeholder="Short description of products in this category"
                  className="w-full px-3 py-2 rounded-xl bg-[#1b1046] border border-purple-800 text-white text-xs focus:outline-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCategoryModal(false)}
                className="px-4 py-2 rounded-xl bg-purple-950 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCategory}
                className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs"
              >
                Save Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Confirm Delete Product Modal */}
      {deleteProductTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-[#140b33] border border-red-800/80 p-6 shadow-2xl space-y-4">
            <h3 className="font-extrabold text-base text-white">Delete Product Listing</h3>
            <p className="text-xs text-slate-300">
              Confirm permanent deletion of <strong>&ldquo;{deleteProductTarget.title}&rdquo;</strong> from the catalog?
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteProductTarget(null)}
                className="px-4 py-2 rounded-xl bg-purple-950 text-slate-300 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await deleteProductAdmin(deleteProductTarget.id, 'Removed by admin during moderation review');
                  setDeleteProductTarget(null);
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Confirm Delete Category Modal */}
      {deleteCategoryTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-[#140b33] border border-red-800/80 p-6 shadow-2xl space-y-4">
            <h3 className="font-extrabold text-base text-white">Remove Category</h3>
            <p className="text-xs text-slate-300">
              Remove category <strong>&ldquo;{deleteCategoryTarget.name}&rdquo;</strong>?
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteCategoryTarget(null)}
                className="px-4 py-2 rounded-xl bg-purple-950 text-slate-300 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await deleteCategory(deleteCategoryTarget.id);
                  setDeleteCategoryTarget(null);
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs cursor-pointer"
              >
                Remove Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
