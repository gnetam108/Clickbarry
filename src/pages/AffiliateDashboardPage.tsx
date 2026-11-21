import React, { useState, useMemo } from 'react';
import { PageId, Product, AffiliateLink } from '../types';
import { useAuth } from '../context/AuthContext';
import { useProducts } from '../context/ProductContext';
import { useHybridAffiliate } from '../context/HybridAffiliateContext';
import { useWallet } from '../context/WalletContext';
import { useReferrals } from '../context/ReferralContext';
import { calculateWithdrawalBreakdown } from '../lib/fees';
import { PromoteProductModal } from '../components/PromoteProductModal';
import { WithdrawalRequestModal } from '../components/WithdrawalRequestModal';
import {
  LayoutDashboard,
  ShoppingBag,
  Link2,
  CheckCircle2,
  DollarSign,
  History,
  Wallet,
  User,
  LogOut,
  MousePointerClick,
  TrendingUp,
  Clock,
  BadgeCheck,
  Search,
  Copy,
  Check,
  RefreshCw,
  Lock,
  ShieldCheck,
  Menu,
  X,
  ExternalLink,
  Rocket,
  ArrowUpRight,
  Gift
} from 'lucide-react';

interface AffiliateDashboardPageProps {
  onNavigate: (page: PageId) => void;
  onOpenProductModal: (product: Product) => void;
  onOpenProductDetail?: (product: Product) => void;
}

type AffiliateTab =
  | 'overview'
  | 'marketplace'
  | 'links'
  | 'clicks'
  | 'sales'
  | 'earnings'
  | 'pending-commissions'
  | 'approved-commissions'
  | 'commissions'
  | 'payouts'
  | 'referrals'
  | 'profile';

export const AffiliateDashboardPage: React.FC<AffiliateDashboardPageProps> = ({
  onNavigate,
  onOpenProductModal,
  onOpenProductDetail
}) => {
  const { user, profile, role, isLoading: isAuthLoading, signOut } = useAuth();
  const { products, showToast } = useProducts();
  const {
    affiliateLinks,
    generateOrGetLink,
    copyLinkToClipboard,
    totalOutboundClicks,
    recentClicks,
    commissionRecords,
    verifiedSalesCount,
    totalConfirmedCommission,
    pendingCommissionAmount,
    approvedCommissionAmount,
    refreshAffiliateData,
    isLoadingLinks
  } = useHybridAffiliate();
  const {
    wallet,
    myWithdrawals,
    ledgerEntries,
    settings,
    refreshWalletData
  } = useWallet();
  const {
    myReferralCode,
    myReferralLink,
    myReferrals,
    totalReferredAffiliates,
    totalReferredSellers,
    myReferralCommissions,
    totalReferralEarnings,
    pendingReferralEarnings,
    approvedReferralEarnings,
    sellerBonusEarnedCount,
    sellerBonusPendingCount,
    refreshReferrals
  } = useReferrals();

  const [activeTab, setActiveTab] = useState<AffiliateTab>('overview');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [commissionStatusFilter, setCommissionStatusFilter] = useState<string>('all');
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [copiedRefLink, setCopiedRefLink] = useState(false);
  const [generatingProductId, setGeneratingProductId] = useState<string | null>(null);
  const [promotingProduct, setPromotingProduct] = useState<Product | null>(null);
  const [withdrawalModalOpen, setWithdrawalModalOpen] = useState(false);

  const filteredMarketplaceProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sellerName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = categoryFilter === 'all' || p.category === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [products, searchQuery, categoryFilter]);

  const filteredCommissions = useMemo(() => {
    return commissionRecords.filter((c) => {
      if (commissionStatusFilter === 'all') return true;
      return c.status === commissionStatusFilter;
    });
  }, [commissionRecords, commissionStatusFilter]);

  const conversionRate =
    totalOutboundClicks > 0
      ? ((verifiedSalesCount / totalOutboundClicks) * 100).toFixed(1) + '%'
      : '0.0%';

  const handleCopy = async (link: AffiliateLink) => {
    const ok = await copyLinkToClipboard(link);
    if (ok) {
      setCopiedSlug(link.uniqueTrackingSlug);
      showToast('Affiliate tracking link copied!', 'success');
      setTimeout(() => setCopiedSlug(null), 2200);
    } else {
      showToast('Failed to copy link.', 'error');
    }
  };

  const handleQuickPromote = async (prod: Product) => {
    setGeneratingProductId(prod.id);
    const res = await generateOrGetLink({
      productId: prod.id,
      targetUrl: prod.affiliateUrl || prod.originalUrl || window.location.origin,
      productTitle: prod.title,
      productPrice: prod.price,
      commissionRate: prod.commissionRate || 40,
      networkName: prod.networkName || prod.merchantName || 'ClickBarry Marketplace',
      networkId: (prod.networkId as string) || 'clickbarry'
    });
    setGeneratingProductId(null);

    if (res.success && res.link) {
      await handleCopy(res.link);
    } else {
      showToast(res.error || 'Could not generate tracking link.', 'error');
    }
  };

  const handleRefreshAll = async () => {
    await Promise.all([refreshAffiliateData(), refreshWalletData()]);
    showToast('Affiliate metrics synced from database.', 'info');
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center p-6 space-y-3 bg-[#0c0722]">
        <div className="w-12 h-12 rounded-full border-4 border-purple-800 border-t-pink-500 animate-spin" />
        <p className="text-sm text-slate-300 font-medium">Verifying Affiliate Session...</p>
      </div>
    );
  }

  // Gate 1: Guest -> Affiliate login required
  if (!user) {
    return (
      <div className="min-h-[80vh] bg-[#0c0722] flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full bg-[#140b33] border border-purple-800/80 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-300">
              Affiliate Portal • 100% Free
            </span>
            <h1 className="text-2xl font-black text-white">Affiliate Sign In Required</h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              Sign in or register completely free to access your Affiliate Dashboard, generate tracking links, monitor real clicks, and request commission payouts.
            </p>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => onNavigate('affiliate')}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-sm shadow-lg cursor-pointer"
            >
              Sign In / Join Free as Affiliate
            </button>
            <button
              onClick={() => onNavigate('marketplace')}
              className="w-full py-2.5 rounded-xl bg-[#1d1245] hover:bg-[#27185f] text-slate-200 border border-purple-800 text-xs font-semibold cursor-pointer"
            >
              Browse Marketplace First
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Gate 2: Seller cannot access Affiliate Dashboard directly
  if (role === 'seller') {
    return (
      <div className="min-h-[80vh] bg-[#0c0722] flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full bg-[#140b33] border border-pink-700/70 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-400">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-pink-400">
              Role Separation Notice
            </span>
            <h1 className="text-2xl font-black text-white">Seller Account Detected</h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              You are signed in with a <strong>Seller</strong> account ({user.email}). This dashboard is dedicated strictly to registered <strong>Affiliate</strong> accounts.
            </p>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => onNavigate('seller-dashboard')}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <Rocket className="w-4 h-4" />
              <span>Go to My Seller Dashboard</span>
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

  const displayName = profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Affiliate';

  const navItems: { id: AffiliateTab; label: string; icon: any; badge?: number | string }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'marketplace', label: 'Marketplace', icon: ShoppingBag, badge: products.length },
    { id: 'links', label: 'My Affiliate Links', icon: Link2, badge: affiliateLinks.length },
    { id: 'clicks', label: 'My Clicks', icon: MousePointerClick, badge: totalOutboundClicks },
    { id: 'sales', label: 'My Sales', icon: CheckCircle2, badge: verifiedSalesCount },
    { id: 'earnings', label: 'Earnings', icon: DollarSign },
    {
      id: 'pending-commissions',
      label: 'Pending Commission',
      icon: Clock,
      badge: commissionRecords.filter((c) => c.status === 'pending').length
    },
    {
      id: 'approved-commissions',
      label: 'Approved Commission',
      icon: BadgeCheck,
      badge: commissionRecords.filter((c) => c.status === 'verified' || c.status === 'paid').length
    },
    { id: 'commissions', label: 'Commission History', icon: History, badge: commissionRecords.length },
    { id: 'payouts', label: 'Payout Requests', icon: Wallet, badge: myWithdrawals.length },
    { id: 'referrals', label: 'Referral Earnings', icon: Gift, badge: myReferrals.length },
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
            aria-label="Toggle affiliate menu"
          >
            {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <span className="font-extrabold text-sm text-white">Affiliate Dashboard</span>
        </div>
        <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
          ₹{wallet.availableBalance.toLocaleString()} Avail.
        </span>
      </div>

      {/* Affiliate Sidebar */}
      <aside
        className={`${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 fixed md:sticky top-20 left-0 z-40 md:z-20 w-72 h-[calc(100vh-5rem)] bg-[#0e0724] border-r border-purple-900/50 flex flex-col transition-transform duration-300 shadow-2xl overflow-y-auto shrink-0`}
      >
        <div className="p-4 mx-3 my-3 rounded-2xl bg-[#160d38] border border-purple-800/60 space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-black text-white shrink-0">
              {displayName[0]?.toUpperCase() || 'A'}
            </div>
            <div className="overflow-hidden flex-1">
              <span className="text-xs font-bold text-white truncate block">{displayName}</span>
              <span className="text-[10px] text-slate-400 font-mono truncate block">{user.email}</span>
            </div>
          </div>
          <div className="pt-2 border-t border-purple-900/50 flex items-center justify-between text-[11px]">
            <span className="text-indigo-300 font-bold flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> AFFILIATE
            </span>
            <span className="text-emerald-400 font-bold">Free Forever</span>
          </div>
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
                    ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-lg'
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
                      isActive ? 'bg-white/20 text-white' : 'bg-purple-950 text-indigo-300 border border-purple-800'
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
              Affiliate ID: <span className="font-mono text-pink-300">{user.id.slice(0, 12)}</span> • Promote verified creator products and earn commissions
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleRefreshAll}
              disabled={isLoadingLinks}
              className="px-3.5 py-2 rounded-xl bg-[#1d1245] hover:bg-[#291a61] text-xs font-bold text-slate-200 border border-purple-800 flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-pink-400 ${isLoadingLinks ? 'animate-spin' : ''}`} />
              <span>Sync Data</span>
            </button>
            <button
              onClick={() => setActiveTab('marketplace')}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-white text-xs font-bold shadow cursor-pointer"
            >
              Browse Offers
            </button>
          </div>
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-[#140b33] p-5 rounded-2xl border border-purple-900/60 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Total Clicks</span>
                  <p className="text-3xl font-black text-cyan-400 mt-1 tabular-nums">{totalOutboundClicks}</p>
                  <span className="text-[11px] text-slate-400">Across {affiliateLinks.length} tracking links</span>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
                  <MousePointerClick className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-[#140b33] p-5 rounded-2xl border border-purple-900/60 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Total Sales</span>
                  <p className="text-3xl font-black text-emerald-400 mt-1 tabular-nums">{verifiedSalesCount}</p>
                  <span className="text-[11px] text-slate-400">Verified conversions</span>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-[#140b33] p-5 rounded-2xl border border-purple-900/60 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Total Earnings</span>
                  <p className="text-3xl font-black text-white mt-1 tabular-nums">
                    ₹{totalConfirmedCommission.toLocaleString()}
                  </p>
                  <span className="text-[11px] text-slate-400">Verified &amp; paid lifetime</span>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-pink-500/15 text-pink-400 flex items-center justify-center">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-[#140b33] p-5 rounded-2xl border border-purple-900/60 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Pending Commission</span>
                  <p className="text-3xl font-black text-amber-400 mt-1 tabular-nums">
                    ₹{pendingCommissionAmount.toLocaleString()}
                  </p>
                  <span className="text-[11px] text-slate-400">Awaiting verification</span>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-[#140b33] p-5 rounded-2xl border border-purple-900/60 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Approved Commission</span>
                  <p className="text-3xl font-black text-emerald-300 mt-1 tabular-nums">
                    ₹{approvedCommissionAmount.toLocaleString()}
                  </p>
                  <span className="text-[11px] text-slate-400">
                    Available Wallet: ₹{wallet.availableBalance.toLocaleString()}
                  </span>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-300 flex items-center justify-center">
                  <BadgeCheck className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-[#140b33] p-5 rounded-2xl border border-purple-900/60 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Conversion Rate</span>
                  <p className="text-3xl font-black text-indigo-300 mt-1 tabular-nums">{conversionRate}</p>
                  <span className="text-[11px] text-slate-400">Sales / Clicks ratio</span>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Active Links & Recent Clicks Snapshot */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#140b33] rounded-2xl border border-purple-900/60 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-white">Your Active Tracking Links</h3>
                  <button
                    onClick={() => setActiveTab('links')}
                    className="text-xs text-pink-400 hover:underline font-bold cursor-pointer"
                  >
                    Manage All
                  </button>
                </div>
                {affiliateLinks.length === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <Link2 className="w-8 h-8 text-slate-500 mx-auto" />
                    <p className="text-xs text-slate-400">
                      You haven&apos;t generated any tracking links yet.
                    </p>
                    <button
                      onClick={() => setActiveTab('marketplace')}
                      className="px-4 py-2 rounded-xl bg-pink-600 text-white text-xs font-bold cursor-pointer"
                    >
                      Pick a Product to Promote
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {affiliateLinks.slice(0, 4).map((link) => (
                      <div
                        key={link.id}
                        className="p-3 rounded-xl bg-[#1b1046] border border-purple-800/60 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-white block truncate">{link.productTitle}</span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {link.clicksCount} clicks • {link.commissionRate}% comm.
                          </span>
                        </div>
                        <button
                          onClick={() => handleCopy(link)}
                          className="px-3 py-1.5 rounded-lg bg-pink-600/25 hover:bg-pink-600 text-pink-200 hover:text-white text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          {copiedSlug === link.uniqueTrackingSlug ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedSlug === link.uniqueTrackingSlug ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-[#140b33] rounded-2xl border border-purple-900/60 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-white">Recent Tracked Clicks</h3>
                  <span className="text-[11px] text-slate-400">Live telemetry</span>
                </div>
                {recentClicks.length === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <MousePointerClick className="w-8 h-8 text-slate-500 mx-auto" />
                    <p className="text-xs text-slate-400">No clicks recorded yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {recentClicks.slice(0, 5).map((click) => (
                      <div
                        key={click.id}
                        className="p-3 rounded-xl bg-[#1b1046] border border-purple-800/60 flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0">
                          <span className="font-mono text-pink-300 font-bold block truncate">
                            {click.trackingId}
                          </span>
                          <span className="text-[11px] text-slate-400 truncate block">
                            {click.networkName}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 shrink-0">
                          {new Date(click.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MARKETPLACE TAB */}
        {activeTab === 'marketplace' && (
          <div className="space-y-6">
            <div className="bg-[#140b33] rounded-2xl p-4 sm:p-5 border border-purple-900/60 flex flex-col sm:flex-row gap-3 justify-between items-center">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search approved products..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#1b1046] border border-purple-800 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-pink-500"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 rounded-xl bg-[#1b1046] border border-purple-800 text-xs text-white font-semibold cursor-pointer"
              >
                <option value="all">All Categories</option>
                <option value="templates">Notion &amp; Templates</option>
                <option value="software">Software &amp; Code</option>
                <option value="graphics">Canva &amp; Graphics</option>
                <option value="ebooks">E-Books &amp; Guides</option>
                <option value="courses">Video Courses</option>
              </select>
            </div>

            {filteredMarketplaceProducts.length === 0 ? (
              <div className="bg-[#140b33] rounded-3xl p-12 text-center border border-purple-900/50 space-y-2">
                <ShoppingBag className="w-10 h-10 text-pink-400 mx-auto" />
                <h3 className="text-base font-bold text-white">No Approved Products Available</h3>
                <p className="text-xs text-slate-400">
                  Approved Seller listings appear here for instant Affiliate link generation.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredMarketplaceProducts.map((prod) => {
                  const existing = affiliateLinks.find((l) => l.productId === prod.id);
                  return (
                    <div
                      key={prod.id}
                      className="bg-[#140b33] rounded-2xl border border-purple-900/60 overflow-hidden flex flex-col justify-between hover:border-pink-500/60 transition-all"
                    >
                      <div>
                        <div className="relative aspect-[16/10] bg-slate-900">
                          <img src={prod.image} alt={prod.title} className="w-full h-full object-cover" />
                          <span className="absolute top-2.5 left-2.5 bg-black/75 px-2 py-0.5 rounded text-[11px] font-bold text-pink-300">
                            {prod.categoryLabel}
                          </span>
                          <span className="absolute top-2.5 right-2.5 bg-emerald-500 text-slate-950 px-2 py-0.5 rounded text-[11px] font-black">
                            {prod.commissionRate}% Comm.
                          </span>
                        </div>
                        <div className="p-4 space-y-2">
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span className="truncate">{prod.sellerName}</span>
                            <span className="text-white font-black">₹{prod.price}</span>
                          </div>
                          <h4 className="font-bold text-sm text-white line-clamp-1">{prod.title}</h4>
                          <p className="text-xs text-slate-400 line-clamp-2">{prod.description}</p>
                        </div>
                      </div>

                      <div className="p-4 pt-0 space-y-2">
                        <div className="text-[11px] text-emerald-400 font-semibold">
                          Earn ₹{Math.round(prod.price * (prod.commissionRate / 100))} per verified sale
                        </div>
                        <div className="flex items-center gap-2">
                          {existing ? (
                            <button
                              onClick={() => handleCopy(existing)}
                              className="flex-1 py-2 rounded-xl bg-emerald-600/20 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              {copiedSlug === existing.uniqueTrackingSlug ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copiedSlug === existing.uniqueTrackingSlug ? 'Copied Link!' : 'Copy My Link'}</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleQuickPromote(prod)}
                              disabled={generatingProductId === prod.id}
                              className="flex-1 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Link2 className="w-3.5 h-3.5" />
                              <span>{generatingProductId === prod.id ? 'Generating...' : 'Get Affiliate Link'}</span>
                            </button>
                          )}

                          <button
                            onClick={() => {
                              if (onOpenProductDetail) onOpenProductDetail(prod);
                              else onOpenProductModal(prod);
                            }}
                            className="px-3 py-2 rounded-xl bg-[#1d1245] hover:bg-[#2a1a62] text-slate-200 text-xs font-bold border border-purple-800 cursor-pointer"
                          >
                            Details
                          </button>

                          <button
                            onClick={() => setPromotingProduct(prod)}
                            className="px-2.5 py-2 rounded-xl bg-[#1d1245] hover:bg-[#2a1a62] text-pink-300 text-xs font-bold border border-purple-800 cursor-pointer"
                            title="Custom SubID"
                          >
                            SubID
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* MY AFFILIATE LINKS TAB */}
        {activeTab === 'links' && (
          <div className="bg-[#140b33] rounded-2xl border border-purple-900/60 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-white">Generated Affiliate Tracking Links</h3>
                <p className="text-xs text-slate-400">
                  Share these links to automatically credit clicks and commissions to your Affiliate account.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('marketplace')}
                className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold cursor-pointer"
              >
                + Promote Product
              </button>
            </div>

            {affiliateLinks.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <Link2 className="w-10 h-10 text-slate-500 mx-auto" />
                <p className="text-sm font-bold text-white">No Affiliate Links Yet</p>
                <p className="text-xs text-slate-400">
                  Visit the Marketplace tab to generate your first tracking link.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#1b1046] text-slate-300 uppercase font-mono text-[10px] border-b border-purple-900/60">
                    <tr>
                      <th className="py-3 px-4">Product</th>
                      <th className="py-3 px-4">Shareable Link</th>
                      <th className="py-3 px-4">SubID</th>
                      <th className="py-3 px-4">Comm %</th>
                      <th className="py-3 px-4 text-center">Clicks</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-900/40">
                    {affiliateLinks.map((link) => {
                      const shareUrl = `${window.location.origin}/?cb_trk=${encodeURIComponent(link.uniqueTrackingSlug)}`;
                      return (
                        <tr key={link.id} className="hover:bg-[#1a0f44]/50">
                          <td className="py-3 px-4 font-bold text-white max-w-[200px] truncate">
                            {link.productTitle}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-pink-300 max-w-[240px] truncate">
                            {shareUrl}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-300">
                            {link.customSubid || '—'}
                          </td>
                          <td className="py-3 px-4 text-emerald-400 font-bold">{link.commissionRate}%</td>
                          <td className="py-3 px-4 text-center font-bold text-white tabular-nums">
                            {link.clicksCount}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => handleCopy(link)}
                                className="px-3 py-1.5 rounded-lg bg-pink-600/25 hover:bg-pink-600 text-pink-200 hover:text-white font-bold inline-flex items-center gap-1 cursor-pointer"
                              >
                                {copiedSlug === link.uniqueTrackingSlug ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>{copiedSlug === link.uniqueTrackingSlug ? 'Copied' : 'Copy'}</span>
                              </button>
                              <a
                                href={shareUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg bg-[#1d1245] text-slate-300 hover:text-white"
                                title="Test Redirect"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* MY CLICKS TAB */}
        {activeTab === 'clicks' && (
          <div className="bg-[#140b33] rounded-2xl border border-purple-900/60 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-base text-white">Tracked Click Activity ({totalOutboundClicks})</h3>
                <p className="text-xs text-slate-400">
                  Real clicks recorded from your ClickBarry affiliate links. Clicks alone never generate fake earnings.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('links')}
                className="px-4 py-2 rounded-xl bg-[#1b1046] border border-purple-800 text-xs font-bold text-slate-200 cursor-pointer"
              >
                View My Links
              </button>
            </div>
            {recentClicks.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <MousePointerClick className="w-10 h-10 text-slate-500 mx-auto" />
                <p className="text-sm font-bold text-white">No Clicks Tracked Yet</p>
                <p className="text-xs text-slate-400">
                  Share an affiliate tracking link from the Marketplace to record real clicks here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#1b1046] text-slate-300 uppercase font-mono text-[10px] border-b border-purple-900/60">
                    <tr>
                      <th className="py-3 px-4">Tracking ID</th>
                      <th className="py-3 px-4">Product / Network</th>
                      <th className="py-3 px-4">Destination URL</th>
                      <th className="py-3 px-4">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-900/40">
                    {recentClicks.map((click) => (
                      <tr key={click.id}>
                        <td className="py-3 px-4 font-mono text-pink-300 font-bold">{click.trackingId}</td>
                        <td className="py-3 px-4 text-slate-200">{click.networkName}</td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-400 max-w-[260px] truncate">
                          {click.destinationUrl}
                        </td>
                        <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                          {new Date(click.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* MY SALES TAB */}
        {activeTab === 'sales' && (
          <div className="bg-[#140b33] rounded-2xl border border-purple-900/60 p-6 space-y-4">
            <div>
              <h3 className="font-bold text-base text-white">Verified Affiliate Sales</h3>
              <p className="text-xs text-slate-400">
                Sales are credited only upon confirmed merchant verification — clicks alone never create sales.
              </p>
            </div>
            {commissionRecords.filter((c) => c.status === 'verified' || c.status === 'paid').length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-slate-500 mx-auto" />
                <p className="text-sm font-bold text-white">No Verified Sales Recorded Yet</p>
                <p className="text-xs text-slate-400">
                  Confirmed affiliate sales will appear here automatically once verified.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#1b1046] text-slate-300 uppercase font-mono text-[10px] border-b border-purple-900/60">
                    <tr>
                      <th className="py-3 px-4">Order Ref</th>
                      <th className="py-3 px-4">Source</th>
                      <th className="py-3 px-4">Sale Amount</th>
                      <th className="py-3 px-4">Your Commission</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-900/40">
                    {commissionRecords
                      .filter((c) => c.status === 'verified' || c.status === 'paid')
                      .map((c) => (
                        <tr key={c.id} className="hover:bg-[#1a0f44]/50">
                          <td className="py-3 px-4 font-mono text-pink-300 font-bold">{c.orderReference}</td>
                          <td className="py-3 px-4 text-slate-300">{c.networkName}</td>
                          <td className="py-3 px-4 text-white font-bold">₹{c.saleAmount.toLocaleString()}</td>
                          <td className="py-3 px-4 text-emerald-400 font-black">₹{c.commissionAmount.toLocaleString()}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase">
                              {c.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-400">
                            {new Date(c.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* EARNINGS TAB */}
        {activeTab === 'earnings' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-[#140b33] p-5 rounded-2xl border border-emerald-500/40">
                <span className="text-xs text-slate-400 font-semibold">Available Balance</span>
                <div className="text-2xl font-black text-emerald-400 mt-1">
                  ₹{wallet.availableBalance.toLocaleString()}
                </div>
              </div>
              <div className="bg-[#140b33] p-5 rounded-2xl border border-purple-900/60">
                <span className="text-xs text-slate-400 font-semibold">Pending Clearance</span>
                <div className="text-2xl font-black text-amber-400 mt-1">
                  ₹{wallet.pendingCommission.toLocaleString()}
                </div>
              </div>
              <div className="bg-[#140b33] p-5 rounded-2xl border border-purple-900/60">
                <span className="text-xs text-slate-400 font-semibold">Reserved in Payouts</span>
                <div className="text-2xl font-black text-cyan-400 mt-1">
                  ₹{wallet.reservedBalance.toLocaleString()}
                </div>
              </div>
              <div className="bg-[#140b33] p-5 rounded-2xl border border-purple-900/60">
                <span className="text-xs text-slate-400 font-semibold">Total Paid Out</span>
                <div className="text-2xl font-black text-white mt-1">
                  ₹{wallet.totalPaid.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="bg-[#140b33] rounded-2xl border border-purple-900/60 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-white">Wallet Transaction Ledger</h3>
                <button
                  onClick={() => setActiveTab('payouts')}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Request Payout</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
              {ledgerEntries.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center">No wallet ledger entries yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#1b1046] text-slate-300 uppercase font-mono text-[10px] border-b border-purple-900/60">
                      <tr>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-900/40">
                      {ledgerEntries.map((entry) => (
                        <tr key={entry.id}>
                          <td className="py-3 px-4 font-mono text-pink-300">{entry.entryType}</td>
                          <td className={`py-3 px-4 font-bold ${entry.amount >= 0 ? 'text-emerald-400' : 'text-amber-300'}`}>
                            {entry.amount >= 0 ? `+₹${entry.amount}` : `-₹${Math.abs(entry.amount)}`}
                          </td>
                          <td className="py-3 px-4 text-slate-300">{entry.description}</td>
                          <td className="py-3 px-4 text-slate-400">
                            {new Date(entry.createdAt).toLocaleDateString()}
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

        {/* COMMISSION HISTORY TAB */}
        {activeTab === 'commissions' && (
          <div className="bg-[#140b33] rounded-2xl border border-purple-900/60 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="font-bold text-base text-white">Commission Ledger</h3>
              <div className="flex items-center gap-2">
                {['all', 'pending', 'verified', 'paid', 'rejected'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setCommissionStatusFilter(st)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold uppercase cursor-pointer ${
                      commissionStatusFilter === st
                        ? 'bg-pink-600 text-white'
                        : 'bg-[#1b1046] text-slate-300 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {filteredCommissions.length === 0 ? (
              <p className="text-xs text-slate-400 py-10 text-center">
                No commission entries matching this filter.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#1b1046] text-slate-300 uppercase font-mono text-[10px] border-b border-purple-900/60">
                    <tr>
                      <th className="py-3 px-4">Order Ref</th>
                      <th className="py-3 px-4">Network / Product</th>
                      <th className="py-3 px-4">Sale</th>
                      <th className="py-3 px-4">Commission</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-900/40">
                    {filteredCommissions.map((rec) => (
                      <tr key={rec.id}>
                        <td className="py-3 px-4 font-mono text-pink-300">{rec.orderReference}</td>
                        <td className="py-3 px-4 text-slate-200">{rec.networkName}</td>
                        <td className="py-3 px-4 text-white">₹{rec.saleAmount}</td>
                        <td className="py-3 px-4 font-bold text-emerald-400">₹{rec.commissionAmount}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              rec.status === 'verified' || rec.status === 'paid'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : rec.status === 'pending'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-red-500/20 text-red-300'
                            }`}
                          >
                            {rec.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {new Date(rec.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* PENDING COMMISSION TAB */}
        {activeTab === 'pending-commissions' && (
          <div className="bg-[#140b33] rounded-2xl border border-purple-900/60 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-base text-white">
                  Pending Commissions: <span className="text-amber-400">₹{pendingCommissionAmount.toLocaleString()}</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Commissions awaiting merchant &amp; platform verification before moving to your available wallet balance.
                </p>
              </div>
            </div>
            {commissionRecords.filter((c) => c.status === 'pending').length === 0 ? (
              <p className="text-xs text-slate-400 py-10 text-center">No pending commissions right now.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#1b1046] text-slate-300 uppercase font-mono text-[10px] border-b border-purple-900/60">
                    <tr>
                      <th className="py-3 px-4">Order Ref</th>
                      <th className="py-3 px-4">Product / Network</th>
                      <th className="py-3 px-4">Sale Amount</th>
                      <th className="py-3 px-4">Pending Commission</th>
                      <th className="py-3 px-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-900/40">
                    {commissionRecords
                      .filter((c) => c.status === 'pending')
                      .map((rec) => (
                        <tr key={rec.id}>
                          <td className="py-3 px-4 font-mono text-pink-300">{rec.orderReference}</td>
                          <td className="py-3 px-4 text-slate-200">{rec.networkName}</td>
                          <td className="py-3 px-4 text-white">₹{rec.saleAmount.toLocaleString()}</td>
                          <td className="py-3 px-4 font-bold text-amber-400">₹{rec.commissionAmount.toLocaleString()}</td>
                          <td className="py-3 px-4 text-slate-400">
                            {new Date(rec.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* APPROVED COMMISSION TAB */}
        {activeTab === 'approved-commissions' && (
          <div className="bg-[#140b33] rounded-2xl border border-purple-900/60 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-base text-white">
                  Approved Commissions: <span className="text-emerald-400">₹{approvedCommissionAmount.toLocaleString()}</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Available to withdraw: <strong className="text-emerald-300">₹{wallet.availableBalance.toLocaleString()}</strong>
                </p>
              </div>
              <button
                onClick={() => setActiveTab('payouts')}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
              >
                Request Payout
              </button>
            </div>
            {commissionRecords.filter((c) => c.status === 'verified' || c.status === 'paid').length === 0 ? (
              <p className="text-xs text-slate-400 py-10 text-center">No approved commissions yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#1b1046] text-slate-300 uppercase font-mono text-[10px] border-b border-purple-900/60">
                    <tr>
                      <th className="py-3 px-4">Order Ref</th>
                      <th className="py-3 px-4">Product / Network</th>
                      <th className="py-3 px-4">Sale Amount</th>
                      <th className="py-3 px-4">Approved Commission</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-900/40">
                    {commissionRecords
                      .filter((c) => c.status === 'verified' || c.status === 'paid')
                      .map((rec) => (
                        <tr key={rec.id}>
                          <td className="py-3 px-4 font-mono text-pink-300">{rec.orderReference}</td>
                          <td className="py-3 px-4 text-slate-200">{rec.networkName}</td>
                          <td className="py-3 px-4 text-white">₹{rec.saleAmount.toLocaleString()}</td>
                          <td className="py-3 px-4 font-bold text-emerald-400">₹{rec.commissionAmount.toLocaleString()}</td>
                          <td className="py-3 px-4 uppercase font-bold text-emerald-300 text-[10px]">{rec.status}</td>
                          <td className="py-3 px-4 text-slate-400">
                            {new Date(rec.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* PAYOUT REQUESTS TAB */}
        {activeTab === 'payouts' && (
          <div className="space-y-6">
            <div className="bg-[#140b33] rounded-2xl border border-purple-900/60 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-base text-white">
                  Available Balance: <span className="text-emerald-400">₹{wallet.availableBalance.toLocaleString()}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Minimum payout: ₹{settings.minWithdrawalAmount} • {settings.withdrawalFeePercentage ?? 5}% platform withdrawal fee applies (e.g. ₹1,000 request → ₹50 fee → ₹950 net payout)
                </p>
              </div>
              <button
                onClick={() => setWithdrawalModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs shadow-lg cursor-pointer shrink-0"
              >
                + Request Withdrawal
              </button>
            </div>

            <div className="bg-[#140b33] rounded-2xl border border-purple-900/60 p-6 space-y-4">
              <h3 className="font-bold text-base text-white">Withdrawal Request History</h3>
              {myWithdrawals.length === 0 ? (
                <p className="text-xs text-slate-400 py-10 text-center">No withdrawal requests submitted yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#1b1046] text-slate-300 uppercase font-mono text-[10px] border-b border-purple-900/60">
                      <tr>
                        <th className="py-3 px-4">Request #</th>
                        <th className="py-3 px-4">Method</th>
                        <th className="py-3 px-4">Gross</th>
                        <th className="py-3 px-4">5% Fee</th>
                        <th className="py-3 px-4">Net Payable</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">UTR / Reference</th>
                        <th className="py-3 px-4">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-900/40">
                      {myWithdrawals.map((req) => {
                        const feePct = req.platformFeePct ?? settings.withdrawalFeePercentage ?? 5;
                        const breakdown = calculateWithdrawalBreakdown(req.amount, feePct);
                        const feeAmt = req.platformFeeAmount ?? breakdown.feeAmount;
                        const netAmt = req.netPayableAmount ?? breakdown.netPayable;
                        return (
                          <tr key={req.id}>
                            <td className="py-3 px-4 font-mono text-pink-300 font-bold">{req.requestNumber}</td>
                            <td className="py-3 px-4 uppercase text-slate-300">{req.paymentMethod}</td>
                            <td className="py-3 px-4 font-bold text-white">₹{req.amount.toLocaleString()}</td>
                            <td className="py-3 px-4 text-amber-300">-₹{feeAmt.toLocaleString()}</td>
                            <td className="py-3 px-4 font-extrabold text-emerald-400">₹{netAmt.toLocaleString()}</td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  req.status === 'paid'
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : req.status === 'rejected'
                                    ? 'bg-red-500/20 text-red-300'
                                    : 'bg-amber-500/20 text-amber-300'
                                }`}
                              >
                                {req.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-300">
                              {req.transactionReference || req.rejectionReason || '—'}
                            </td>
                            <td className="py-3 px-4 text-slate-400">
                              {new Date(req.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* REFERRAL EARNINGS TAB */}
        {activeTab === 'referrals' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-indigo-950/60 via-purple-950/60 to-pink-950/60 rounded-2xl border border-indigo-500/40 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">
                    ClickBarry Affiliate Referral Program
                  </span>
                  <h2 className="text-xl font-black text-white mt-0.5">
                    My Referral Link — Earn 10% Lifetime (Net Earnings) + ₹100 Seller Bonus
                  </h2>
                  <p className="text-xs text-slate-300 mt-1">
                    Earn <strong>10% lifetime commission</strong> strictly on referred Affiliates&apos; &amp; Sellers&apos; eligible <strong>net earnings</strong> after platform deductions, plus a <strong>one-time ₹100 bonus</strong> once a referred Seller&apos;s ₹999 Lifetime Pass is verified active. Failed or refunded transactions never generate referral earnings.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-3 py-1 rounded-full bg-purple-950 border border-purple-700 text-xs font-mono text-pink-300 font-bold">
                    Code: {myReferralCode || '—'}
                  </span>
                  <button
                    onClick={() => refreshReferrals()}
                    className="p-2 rounded-xl bg-purple-950 border border-purple-700 text-slate-300 hover:text-white cursor-pointer"
                    title="Refresh Referral Data"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block">
                  My Referral Link
                </label>
                <div className="flex items-center gap-2 bg-black/40 p-2.5 rounded-xl border border-purple-800/60">
                  <input
                    type="text"
                    readOnly
                    value={myReferralLink}
                    className="bg-transparent text-xs text-pink-200 font-mono flex-1 outline-none truncate"
                  />
                  <button
                    onClick={async () => {
                      if (!myReferralLink) return;
                      try {
                        await navigator.clipboard.writeText(myReferralLink);
                        setCopiedRefLink(true);
                        showToast('Referral link copied!', 'success');
                        setTimeout(() => setCopiedRefLink(false), 2000);
                      } catch {}
                    }}
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    {copiedRefLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedRefLink ? 'Copied!' : 'Copy Referral Link'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-[#140b33] p-5 rounded-2xl border border-purple-900/60">
                <span className="text-xs text-slate-400">Total Referred Affiliates</span>
                <p className="text-2xl font-black text-indigo-300 mt-1">{totalReferredAffiliates}</p>
              </div>
              <div className="bg-[#140b33] p-5 rounded-2xl border border-purple-900/60">
                <span className="text-xs text-slate-400">Total Referred Sellers</span>
                <p className="text-2xl font-black text-pink-300 mt-1">{totalReferredSellers}</p>
                <span className="text-[10px] text-slate-400">
                  {sellerBonusEarnedCount} active pass • {sellerBonusPendingCount} pending
                </span>
              </div>
              <div className="bg-[#140b33] p-5 rounded-2xl border border-purple-900/60">
                <span className="text-xs text-slate-400">Referral Earnings</span>
                <p className="text-2xl font-black text-emerald-400 mt-1">
                  ₹{totalReferralEarnings.toLocaleString()}
                </p>
              </div>
              <div className="bg-[#140b33] p-5 rounded-2xl border border-purple-900/60">
                <span className="text-xs text-slate-400">Pending Referral Commission</span>
                <p className="text-2xl font-black text-amber-400 mt-1">
                  ₹{pendingReferralEarnings.toLocaleString()}
                </p>
              </div>
              <div className="bg-[#140b33] p-5 rounded-2xl border border-purple-900/60">
                <span className="text-xs text-slate-400">Approved Referral Commission</span>
                <p className="text-2xl font-black text-emerald-300 mt-1">
                  ₹{approvedReferralEarnings.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="bg-[#140b33] rounded-2xl border border-purple-900/60 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-white">Referred Partners ({myReferrals.length})</h3>
                <span className="text-[11px] text-slate-400">
                  Permanent attribution • Self &amp; duplicate referrals blocked
                </span>
              </div>
              {myReferrals.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center">
                  No referred affiliates or sellers yet. Share your referral link above to start earning!
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#1b1046] text-slate-300 uppercase font-mono text-[10px] border-b border-purple-900/60">
                      <tr>
                        <th className="py-2.5 px-3">Referred User</th>
                        <th className="py-2.5 px-3">Referral Type</th>
                        <th className="py-2.5 px-3">Account / Pass Status</th>
                        <th className="py-2.5 px-3">₹100 Bonus Status</th>
                        <th className="py-2.5 px-3">Lifetime Earned</th>
                        <th className="py-2.5 px-3">Joined</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-900/40">
                      {myReferrals.map((r) => (
                        <tr key={r.id}>
                          <td className="py-3 px-3">
                            <span className="font-bold text-white block">
                              {r.referredName || `Partner ${r.referredUserId.slice(0, 8)}`}
                            </span>
                            {r.referredEmail && (
                              <span className="text-[10px] text-slate-400 font-mono">{r.referredEmail}</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                r.referralType === 'seller'
                                  ? 'bg-pink-500/20 text-pink-300'
                                  : 'bg-indigo-500/20 text-indigo-300'
                              }`}
                            >
                              {r.referralType}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="text-[11px] font-semibold text-slate-300 uppercase">
                              {r.referralType === 'seller'
                                ? r.referredSubscriptionStatus || 'pending'
                                : r.status}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            {r.referralType === 'seller' ? (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  r.bonusStatus === 'credited'
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : r.bonusStatus === 'reversed' || r.bonusStatus === 'failed_pass'
                                    ? 'bg-red-500/20 text-red-300'
                                    : 'bg-amber-500/20 text-amber-300'
                                }`}
                              >
                                {r.bonusStatus === 'credited'
                                  ? '₹100 Credited'
                                  : r.bonusStatus === 'reversed'
                                  ? 'Reversed'
                                  : r.bonusStatus === 'failed_pass'
                                  ? 'Pass Failed'
                                  : 'Pending ₹999 Pass'}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-500">N/A (Affiliate)</span>
                            )}
                          </td>
                          <td className="py-3 px-3 font-bold text-emerald-400">
                            ₹{(r.lifetimeCommissionTotal || 0).toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-slate-400">
                            {new Date(r.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-[#140b33] rounded-2xl border border-purple-900/60 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-white">Referral History</h3>
                <span className="text-[11px] text-slate-400">
                  Calculated on eligible net earnings (failed &amp; refunded excluded)
                </span>
              </div>
              {myReferralCommissions.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center">
                  No referral commission entries recorded yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#1b1046] text-slate-300 uppercase font-mono text-[10px] border-b border-purple-900/60">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Reward Type</th>
                        <th className="py-2.5 px-3">Net Base</th>
                        <th className="py-2.5 px-3">Rate</th>
                        <th className="py-2.5 px-3">Commission</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-900/40">
                      {myReferralCommissions.map((rc) => (
                        <tr key={rc.id}>
                          <td className="py-3 px-3 text-slate-400">
                            {new Date(rc.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-3 font-semibold text-white">
                            {rc.rewardType === 'one_time_bonus'
                              ? '₹100 Seller Pass Bonus'
                              : '10% Lifetime Net Commission'}
                          </td>
                          <td className="py-3 px-3 text-slate-300 font-mono">
                            ₹{rc.baseAmount.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-slate-300">
                            {rc.rewardType === 'one_time_bonus' ? 'One-Time' : `${rc.commissionRate}%`}
                          </td>
                          <td
                            className={`py-3 px-3 font-bold ${
                              rc.status === 'reversed' ? 'text-red-400 line-through' : 'text-emerald-400'
                            }`}
                          >
                            +₹{rc.rewardAmount.toLocaleString()}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
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
                          <td className="py-3 px-3 text-slate-400 text-[11px]">
                            {rc.reversalReason || rc.notes || '—'}
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

        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="max-w-2xl bg-[#140b33] rounded-2xl border border-purple-900/60 p-6 sm:p-8 space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-2xl font-black text-white">
                {displayName[0]?.toUpperCase() || 'A'}
              </div>
              <div>
                <h2 className="text-xl font-black text-white">{displayName}</h2>
                <p className="text-xs text-slate-400 font-mono">{user.email}</p>
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold">
                  Affiliate Account • Free Forever
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2 border-t border-purple-900/50">
              <div className="p-3.5 rounded-xl bg-[#1b1046] border border-purple-800/60">
                <span className="text-slate-400 block text-[10px] uppercase">Affiliate ID</span>
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
                <span className="text-slate-400 block text-[10px] uppercase">Membership Fee</span>
                <span className="text-emerald-400 font-bold">₹0 (100% Free Affiliate Access)</span>
              </div>
            </div>
          </div>
        )}
      </main>

      <PromoteProductModal
        product={promotingProduct}
        isOpen={Boolean(promotingProduct)}
        onClose={() => setPromotingProduct(null)}
        onNavigateToDashboard={() => {
          setPromotingProduct(null);
          setActiveTab('links');
        }}
      />

      <WithdrawalRequestModal
        isOpen={withdrawalModalOpen}
        onClose={() => setWithdrawalModalOpen(false)}
      />
    </div>
  );
};
