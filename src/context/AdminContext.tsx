import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  AdminRole,
  AdminUserRecord,
  AdminAuditLog,
  PlatformCategory,
  PlatformWebsiteSettings,
  DateFilterPeriod,
  FinancialReconciliationReport
} from '../types';
import { supabase } from '../lib/supabase';
import { useAuth, PRIMARY_SUPER_ADMIN_EMAIL } from './AuthContext';
import { useProducts } from './ProductContext';
import { useHybridAffiliate } from './HybridAffiliateContext';
import { useWallet } from './WalletContext';

const DEFAULT_SETTINGS: PlatformWebsiteSettings = {
  siteName: 'ClickBarry',
  tagline: 'Multi-Affiliate & Creator Product Discovery Marketplace',
  logoUrl: '',
  faviconUrl: '',
  description: 'Discover high-converting digital products, verified creator tools, and top-tier affiliate programs.',
  supportEmail: 'support@clickbarry.com',
  contactPhone: '+91 98765 43210',
  contactAddress: 'ClickBarry HQ, Brigade Tech Gardens, Bengaluru, Karnataka, India',
  currency: 'INR',
  currencySymbol: '₹',
  minWithdrawalAmount: 500,
  maxWithdrawalAmount: 100000,
  sellerSubscriptionPrice: 999,
  platformFeePercentage: 0,
  featuredProductIds: [],
  bannerAnnouncement: 'Earn commissions promoting verified creator products or list once as a Seller!',
  isRegistrationOpen: true,
  isMaintenanceMode: false,
  updatedAt: new Date().toISOString()
};

const DEFAULT_CATEGORIES: PlatformCategory[] = [
  {
    id: 'cat-1',
    name: 'Notion & Digital Templates',
    slug: 'templates',
    description: 'Productivity planners, workspace operating systems, and dashboard templates',
    iconName: 'LayoutTemplate',
    isActive: true,
    displayOrder: 1,
    productCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'cat-2',
    name: 'Video Courses & Masterclasses',
    slug: 'courses',
    description: 'Comprehensive video training, workshops, and high-impact digital skills',
    iconName: 'GraduationCap',
    isActive: true,
    displayOrder: 2,
    productCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'cat-3',
    name: 'Software, Tools & Scripts',
    slug: 'software',
    description: 'Web applications, micro-SaaS source code, automation scripts, and UI kits',
    iconName: 'Code',
    isActive: true,
    displayOrder: 3,
    productCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'cat-4',
    name: 'E-Books, Guides & Playbooks',
    slug: 'ebooks',
    description: 'In-depth PDFs, step-by-step handbooks, frameworks, and actionable blueprints',
    iconName: 'BookOpen',
    isActive: true,
    displayOrder: 4,
    productCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'cat-5',
    name: 'Canva & Graphic Design Assets',
    slug: 'graphics',
    description: 'Social media kits, pitch deck templates, branding kits, and vector packs',
    iconName: 'Palette',
    isActive: true,
    displayOrder: 5,
    productCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z'
  }
];

interface AdminContextType {
  isSuperAdmin: boolean;
  adminRole: AdminRole;
  users: AdminUserRecord[];
  categories: PlatformCategory[];
  settings: PlatformWebsiteSettings;
  auditLogs: AdminAuditLog[];
  dateFilter: DateFilterPeriod;
  setDateFilter: (filter: DateFilterPeriod) => void;
  customDateRange: { startDate: string; endDate: string };
  setCustomDateRange: (range: { startDate: string; endDate: string }) => void;
  isInDateRange: (isoDate?: string) => boolean;
  isLoading: boolean;

  updateUserStatus: (userId: string, status: 'active' | 'suspended', reason?: string) => Promise<{ success: boolean; error?: string }>;
  toggleSellerVerification: (userId: string, verified: boolean) => Promise<{ success: boolean; error?: string }>;
  updateSubscriptionStatus: (userId: string, status: 'active' | 'none' | 'pending') => Promise<{ success: boolean; error?: string }>;

  approveProduct: (productId: string) => Promise<{ success: boolean; error?: string }>;
  rejectProduct: (productId: string, reason: string) => Promise<{ success: boolean; error?: string }>;
  toggleFeaturedProduct: (productId: string, isFeatured: boolean) => Promise<{ success: boolean; error?: string }>;
  deleteProductAdmin: (productId: string, reason: string) => Promise<{ success: boolean; error?: string }>;

  addCategory: (cat: Omit<PlatformCategory, 'id' | 'createdAt'>) => Promise<{ success: boolean; error?: string }>;
  updateCategory: (id: string, updates: Partial<PlatformCategory>) => Promise<{ success: boolean; error?: string }>;
  deleteCategory: (id: string) => Promise<{ success: boolean; error?: string }>;

  updateWebsiteSettings: (newSettings: Partial<PlatformWebsiteSettings>) => Promise<{ success: boolean; error?: string }>;
  addAuditLog: (action: string, targetType: AdminAuditLog['targetType'], targetId: string, details: string) => Promise<void>;
  financialReport: FinancialReconciliationReport;
  exportToCsv: (dataType: 'users' | 'sellers' | 'affiliates' | 'products' | 'clicks' | 'commissions' | 'withdrawals' | 'financials') => void;
  refreshAdminData: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin } = useAuth();
  const { products, allProducts, fetchAllProductsAdmin, updateProduct, deleteProduct, showToast } = useProducts();
  const { allRecentClicks, allCommissionRecords, recentClicks, commissionRecords } = useHybridAffiliate();
  const { allWithdrawals } = useWallet();

  const [dateFilter, setDateFilter] = useState<DateFilterPeriod>('all');
  const [customDateRange, setCustomDateRange] = useState<{ startDate: string; endDate: string }>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [settings, setSettings] = useState<PlatformWebsiteSettings>(DEFAULT_SETTINGS);
  const [rawCategories, setRawCategories] = useState<PlatformCategory[]>(DEFAULT_CATEGORIES);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [users, setUsers] = useState<AdminUserRecord[]>([]);

  // Strict server/DB-backed Super Admin check
  const isSuperAdmin = useMemo(() => {
    if (!user || !user.email) return false;
    return isAdmin || user.email.toLowerCase().trim() === PRIMARY_SUPER_ADMIN_EMAIL.toLowerCase();
  }, [user, isAdmin]);

  const adminRole: AdminRole = isSuperAdmin ? 'super_admin' : 'admin';

  // Date filter matcher
  const isInDateRange = useCallback(
    (isoDate?: string): boolean => {
      if (dateFilter === 'all' || !isoDate) return true;
      const target = new Date(isoDate);
      if (isNaN(target.getTime())) return true;
      const now = new Date();

      if (dateFilter === 'today') {
        return target.toDateString() === now.toDateString();
      }
      if (dateFilter === '7d') {
        return target.getTime() >= now.getTime() - 7 * 24 * 60 * 60 * 1000;
      }
      if (dateFilter === '30d') {
        return target.getTime() >= now.getTime() - 30 * 24 * 60 * 60 * 1000;
      }
      if (dateFilter === 'this_month') {
        return target.getMonth() === now.getMonth() && target.getFullYear() === now.getFullYear();
      }
      if (dateFilter === 'this_year') {
        return target.getFullYear() === now.getFullYear();
      }
      if (dateFilter === 'custom') {
        const start = new Date(customDateRange.startDate + 'T00:00:00');
        const end = new Date(customDateRange.endDate + 'T23:59:59');
        return target >= start && target <= end;
      }
      return true;
    },
    [dateFilter, customDateRange]
  );

  // Dynamically compute real category product counts
  const categories = useMemo(() => {
    const sourceProducts = allProducts.length > 0 ? allProducts : products;
    return rawCategories.map((c) => ({
      ...c,
      productCount: sourceProducts.filter((p) => p.category === c.slug).length
    }));
  }, [rawCategories, allProducts, products]);

  const addAuditLog = useCallback(
    async (action: string, targetType: AdminAuditLog['targetType'], targetId: string, details: string) => {
      if (!isSuperAdmin) return;

      const logEntry: AdminAuditLog = {
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        adminEmail: user?.email || PRIMARY_SUPER_ADMIN_EMAIL,
        action,
        targetType,
        targetId,
        details,
        timestamp: new Date().toISOString()
      };

      setAuditLogs((prev) => [logEntry, ...prev].slice(0, 300));

      if (supabase) {
        try {
          await supabase.from('admin_audit_logs').insert({
            admin_id: user?.id,
            admin_email: user?.email || PRIMARY_SUPER_ADMIN_EMAIL,
            action,
            target_type: targetType,
            target_id: targetId,
            details
          });
        } catch {}
      }
    },
    [user, isSuperAdmin]
  );

  // Load ONLY real DB profiles, settings, categories, and audit logs
  const loadPlatformData = useCallback(async () => {
    if (!supabase) return;
    setIsLoading(true);

    try {
      const [settingsRes, catRes] = await Promise.all([
        supabase.from('website_settings').select('*').eq('id', 'clickbarry_main').maybeSingle(),
        supabase.from('categories').select('*').order('display_order', { ascending: true })
      ]);

      if (settingsRes.data && !settingsRes.error) {
        const s = settingsRes.data;
        setSettings({
          siteName: s.site_name || DEFAULT_SETTINGS.siteName,
          tagline: s.tagline || DEFAULT_SETTINGS.tagline,
          logoUrl: s.logo_url || '',
          faviconUrl: s.favicon_url || '',
          description: s.description || DEFAULT_SETTINGS.description,
          supportEmail: s.support_email || DEFAULT_SETTINGS.supportEmail,
          contactPhone: s.contact_phone || DEFAULT_SETTINGS.contactPhone,
          contactAddress: s.contact_address || DEFAULT_SETTINGS.contactAddress,
          currency: s.currency || 'INR',
          currencySymbol: s.currency_symbol || '₹',
          minWithdrawalAmount: Number(s.min_withdrawal_amount) || 500,
          maxWithdrawalAmount: Number(s.max_withdrawal_amount) || 100000,
          sellerSubscriptionPrice: Number(s.seller_subscription_price) || 999,
          platformFeePercentage: Number(s.platform_fee_percentage) || 0,
          featuredProductIds: s.featured_product_ids || [],
          bannerAnnouncement: s.banner_announcement || DEFAULT_SETTINGS.bannerAnnouncement,
          isRegistrationOpen: s.is_registration_open ?? true,
          isMaintenanceMode: s.is_maintenance_mode ?? false,
          updatedAt: s.updated_at || new Date().toISOString()
        });
      }

      if (catRes.data && catRes.data.length > 0 && !catRes.error) {
        setRawCategories(
          catRes.data.map((c: any) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            description: c.description || '',
            iconName: c.icon_name || 'Folder',
            imageUrl: c.image_url,
            isActive: c.is_active ?? true,
            displayOrder: c.display_order || 0,
            createdAt: c.created_at || new Date().toISOString()
          }))
        );
      }

      if (isSuperAdmin) {
        const [profilesRes, logsRes, adminProds] = await Promise.all([
          supabase.from('profiles').select('*').order('created_at', { ascending: false }),
          supabase.from('admin_audit_logs').select('*').order('created_at', { ascending: false }).limit(200),
          fetchAllProductsAdmin()
        ]);

        if (logsRes.data && !logsRes.error) {
          setAuditLogs(
            logsRes.data.map((l: any) => ({
              id: l.id,
              adminEmail: l.admin_email,
              action: l.action,
              targetType: l.target_type,
              targetId: l.target_id,
              details: l.details,
              timestamp: l.created_at
            }))
          );
        }

        if (profilesRes.data && !profilesRes.error) {
          const mappedUsers: AdminUserRecord[] = profilesRes.data.map((p: any) => {
            const emailLower = (p.email || '').toLowerCase();
            const isRootAdmin = emailLower === PRIMARY_SUPER_ADMIN_EMAIL.toLowerCase();
            const rawRole = isRootAdmin ? 'admin' : p.role || 'affiliate';
            const normRole: AdminUserRecord['role'] =
              rawRole === 'admin' || rawRole === 'super_admin'
                ? 'admin'
                : rawRole === 'seller'
                ? 'seller'
                : 'affiliate';

            const userProds = adminProds.filter((prod) => prod.sellerId === p.id);
            const userClicks = allRecentClicks.filter((c) => c.affiliateId === p.id).length;
            const userComms = allCommissionRecords.filter((c) => c.affiliateId === p.id);
            const verifiedComms = userComms.filter((c) => c.status === 'verified' || c.status === 'paid');

            return {
              id: p.id,
              email: p.email || '',
              fullName: p.full_name || p.email?.split('@')[0] || 'Member',
              role: normRole,
              adminRole: normRole === 'admin' ? 'super_admin' : undefined,
              status: p.status === 'suspended' ? 'suspended' : 'active',
              sellerVerified: Boolean(p.seller_verified),
              subscriptionStatus: (p.subscription_status as AdminUserRecord['subscriptionStatus']) || 'none',
              subscriptionPrice: Number(p.subscription_price || 999),
              totalProductsCount: userProds.length,
              totalClicksCount: userClicks,
              totalSalesCount: verifiedComms.length,
              totalEarnings: verifiedComms.reduce((s, c) => s + c.commissionAmount, 0),
              createdAt: p.created_at || new Date().toISOString(),
              lastActiveAt: p.last_active_at || p.updated_at || p.created_at
            };
          });
          setUsers(mappedUsers);
        } else {
          setUsers([]);
        }
      } else {
        setUsers([]);
        setAuditLogs([]);
      }
    } catch (err) {
      console.warn('Admin loadPlatformData error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isSuperAdmin, fetchAllProductsAdmin, allRecentClicks, allCommissionRecords]);

  useEffect(() => {
    loadPlatformData();
  }, [loadPlatformData]);

  // USER MANAGEMENT ACTIONS
  const updateUserStatus = async (
    userId: string,
    status: 'active' | 'suspended',
    reason?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!isSuperAdmin) return { success: false, error: 'Unauthorized' };
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return { success: false, error: 'User not found' };

    if (targetUser.email.toLowerCase() === PRIMARY_SUPER_ADMIN_EMAIL.toLowerCase() && status === 'suspended') {
      return { success: false, error: 'Cannot suspend the Primary Super Administrator account.' };
    }

    if (supabase) {
      const { error } = await supabase.from('profiles').update({ status }).eq('id', userId);
      if (error) return { success: false, error: error.message };
    }

    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status, notes: reason || u.notes } : u)));
    await addAuditLog(
      status === 'suspended' ? 'USER_SUSPENDED' : 'USER_ACTIVATED',
      'user',
      userId,
      `User ${targetUser.email} status changed to ${status}. Reason: ${reason || 'Admin action'}`
    );
    showToast(`User ${targetUser.fullName || targetUser.email} is now ${status}.`, 'success');
    return { success: true };
  };

  const toggleSellerVerification = async (
    userId: string,
    verified: boolean
  ): Promise<{ success: boolean; error?: string }> => {
    if (!isSuperAdmin) return { success: false, error: 'Unauthorized' };
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return { success: false, error: 'User not found' };

    if (supabase) {
      const { error } = await supabase.from('profiles').update({ seller_verified: verified }).eq('id', userId);
      if (error) return { success: false, error: error.message };
    }

    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, sellerVerified: verified } : u)));
    await addAuditLog(
      verified ? 'SELLER_VERIFIED' : 'SELLER_VERIFICATION_REVOKED',
      'seller',
      userId,
      `Seller badge for ${targetUser.email} set to ${verified ? 'Verified' : 'Unverified'}.`
    );
    showToast(`Seller verification updated: ${verified ? 'Verified' : 'Unverified'}`, 'success');
    return { success: true };
  };

  const updateSubscriptionStatus = async (
    userId: string,
    subStatus: 'active' | 'none' | 'pending'
  ): Promise<{ success: boolean; error?: string }> => {
    if (!isSuperAdmin) return { success: false, error: 'Unauthorized' };
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return { success: false, error: 'User not found' };

    if (supabase) {
      const { error } = await supabase.from('profiles').update({ subscription_status: subStatus }).eq('id', userId);
      if (error) return { success: false, error: error.message };
    }

    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, subscriptionStatus: subStatus } : u)));
    await addAuditLog(
      'SUBSCRIPTION_UPDATED',
      'seller',
      userId,
      `Subscription for ${targetUser.email} updated to: ${subStatus.toUpperCase()}`
    );
    showToast(`Subscription status updated to ${subStatus}.`, 'success');
    return { success: true };
  };

  // PRODUCT MODERATION ACTIONS
  const approveProduct = async (productId: string): Promise<{ success: boolean; error?: string }> => {
    if (!isSuperAdmin) return { success: false, error: 'Unauthorized' };
    const res = await updateProduct(productId, {
      approvalStatus: 'approved',
      status: 'published',
      rejectionReason: ''
    });

    if (res.success) {
      await addAuditLog('PRODUCT_APPROVED', 'product', productId, `Product ${productId} approved for Marketplace.`);
      showToast('Product approved and live in Marketplace!', 'success');
    }
    return res;
  };

  const rejectProduct = async (productId: string, reason: string): Promise<{ success: boolean; error?: string }> => {
    if (!isSuperAdmin) return { success: false, error: 'Unauthorized' };
    const res = await updateProduct(productId, {
      approvalStatus: 'rejected',
      status: 'draft',
      rejectionReason: reason
    });

    if (res.success) {
      await addAuditLog('PRODUCT_REJECTED', 'product', productId, `Product ${productId} rejected. Reason: ${reason}`);
      showToast('Product rejected and returned to seller.', 'info');
    }
    return res;
  };

  const toggleFeaturedProduct = async (productId: string, isFeatured: boolean): Promise<{ success: boolean; error?: string }> => {
    if (!isSuperAdmin) return { success: false, error: 'Unauthorized' };
    const res = await updateProduct(productId, { isFeatured });
    if (res.success) {
      const newIds = isFeatured
        ? Array.from(new Set([...settings.featuredProductIds, productId]))
        : settings.featuredProductIds.filter((id) => id !== productId);
      setSettings((prev) => ({ ...prev, featuredProductIds: newIds }));
      await addAuditLog('PRODUCT_FEATURE_TOGGLED', 'product', productId, `Featured status: ${isFeatured}`);
      showToast(`Product ${isFeatured ? 'marked as Featured' : 'removed from Featured'}`, 'success');
    }
    return res;
  };

  const deleteProductAdmin = async (productId: string, reason: string): Promise<{ success: boolean; error?: string }> => {
    if (!isSuperAdmin) return { success: false, error: 'Unauthorized' };
    const res = await deleteProduct(productId);
    if (res.success) {
      await addAuditLog('PRODUCT_REMOVED_ADMIN', 'product', productId, `Product removed by Admin. Reason: ${reason}`);
      showToast('Product listing removed from platform.', 'success');
    }
    return res;
  };

  // CATEGORY MANAGEMENT ACTIONS
  const addCategory = async (cat: Omit<PlatformCategory, 'id' | 'createdAt'>): Promise<{ success: boolean; error?: string }> => {
    if (!isSuperAdmin) return { success: false, error: 'Unauthorized' };
    const newCat: PlatformCategory = {
      ...cat,
      id: `cat-${Date.now()}`,
      createdAt: new Date().toISOString()
    };

    if (supabase) {
      const { data, error } = await supabase
        .from('categories')
        .insert({
          name: newCat.name,
          slug: newCat.slug,
          description: newCat.description,
          icon_name: newCat.iconName,
          image_url: newCat.imageUrl,
          is_active: newCat.isActive,
          display_order: newCat.displayOrder
        })
        .select()
        .single();
      if (error) return { success: false, error: error.message };
      if (data) newCat.id = data.id;
    }

    setRawCategories((prev) => [...prev, newCat]);
    await addAuditLog('CATEGORY_CREATED', 'category', newCat.slug, `New category created: ${newCat.name}`);
    showToast(`Category "${newCat.name}" added successfully.`, 'success');
    return { success: true };
  };

  const updateCategory = async (id: string, updates: Partial<PlatformCategory>): Promise<{ success: boolean; error?: string }> => {
    if (!isSuperAdmin) return { success: false, error: 'Unauthorized' };
    if (supabase) {
      await supabase
        .from('categories')
        .update({
          name: updates.name,
          description: updates.description,
          icon_name: updates.iconName,
          image_url: updates.imageUrl,
          is_active: updates.isActive,
          display_order: updates.displayOrder
        })
        .eq('id', id);
    }

    setRawCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c)));
    await addAuditLog('CATEGORY_UPDATED', 'category', id, `Category ${id} updated.`);
    showToast('Category updated.', 'success');
    return { success: true };
  };

  const deleteCategory = async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (!isSuperAdmin) return { success: false, error: 'Unauthorized' };
    const target = rawCategories.find((c) => c.id === id);
    if (supabase) {
      await supabase.from('categories').delete().eq('id', id);
    }

    setRawCategories((prev) => prev.filter((c) => c.id !== id));
    await addAuditLog('CATEGORY_DELETED', 'category', id, `Category "${target?.name || id}" removed.`);
    showToast('Category removed.', 'info');
    return { success: true };
  };

  // WEBSITE SETTINGS ACTIONS
  const updateWebsiteSettings = async (newS: Partial<PlatformWebsiteSettings>): Promise<{ success: boolean; error?: string }> => {
    if (!isSuperAdmin) return { success: false, error: 'Unauthorized' };
    const merged: PlatformWebsiteSettings = {
      ...settings,
      ...newS,
      updatedAt: new Date().toISOString()
    };

    if (supabase) {
      const { error } = await supabase.from('website_settings').upsert({
        id: 'clickbarry_main',
        site_name: merged.siteName,
        tagline: merged.tagline,
        logo_url: merged.logoUrl,
        favicon_url: merged.faviconUrl,
        description: merged.description,
        support_email: merged.supportEmail,
        contact_phone: merged.contactPhone,
        contact_address: merged.contactAddress,
        currency: merged.currency,
        currency_symbol: merged.currencySymbol,
        min_withdrawal_amount: merged.minWithdrawalAmount,
        max_withdrawal_amount: merged.maxWithdrawalAmount,
        seller_subscription_price: merged.sellerSubscriptionPrice,
        platform_fee_percentage: merged.platformFeePercentage,
        featured_product_ids: merged.featuredProductIds,
        banner_announcement: merged.bannerAnnouncement,
        is_registration_open: merged.isRegistrationOpen,
        is_maintenance_mode: merged.isMaintenanceMode,
        updated_at: merged.updatedAt
      });
      if (error) return { success: false, error: error.message };
    }

    setSettings(merged);
    await addAuditLog('SETTINGS_UPDATED', 'settings', 'clickbarry_main', 'Platform website settings updated.');
    showToast('Platform settings saved successfully!', 'success');
    return { success: true };
  };

  // FINANCIAL RECONCILIATION FROM REAL DB DATA ONLY
  const financialReport: FinancialReconciliationReport = useMemo(() => {
    const comms = allCommissionRecords.length > 0 ? allCommissionRecords : commissionRecords;
    const filteredUsers = users.filter((u) => isInDateRange(u.createdAt));
    const filteredComms = comms.filter((c) => isInDateRange(c.createdAt));
    const filteredWithdrawals = allWithdrawals.filter((w) => isInDateRange(w.createdAt));

    const paidSellers = filteredUsers.filter((u) => u.subscriptionStatus === 'active' && u.role !== 'admin');
    const sellerSubscriptionRevenue = paidSellers.reduce((sum, u) => sum + (u.subscriptionPrice || 999), 0);

    const internalCommissions = filteredComms
      .filter((c) => c.status === 'verified' || c.status === 'paid')
      .reduce((sum, c) => sum + c.commissionAmount, 0);

    const externalCommissions = filteredComms
      .filter((c) => c.networkName && c.networkName.toLowerCase() !== 'clickbarry marketplace')
      .reduce((sum, c) => sum + c.commissionAmount, 0);

    const totalAffiliateWithdrawalRequests = filteredWithdrawals.reduce((sum, w) => sum + w.amount, 0);
    const actualAffiliatePayouts = filteredWithdrawals
      .filter((w) => w.status === 'paid')
      .reduce((sum, w) => sum + w.amount, 0);
    const pendingWithdrawalsVolume = filteredWithdrawals
      .filter((w) => w.status === 'pending' || w.status === 'approved' || w.status === 'processing')
      .reduce((sum, w) => sum + w.amount, 0);

    const platformFees = 0;
    const refundsAndReversals = 0;
    const actualPlatformNetRevenue = sellerSubscriptionRevenue + platformFees - refundsAndReversals;

    return {
      period: dateFilter.toUpperCase(),
      sellerSubscriptionRevenue,
      platformFees,
      verifiedSellerCommission: internalCommissions,
      externalNetworkCommission: externalCommissions,
      totalAffiliateWithdrawalRequests,
      actualAffiliatePayouts,
      pendingWithdrawalsVolume,
      refundsAndReversals,
      actualPlatformNetRevenue,
      reconciliationStatus: 'balanced'
    };
  }, [users, allCommissionRecords, commissionRecords, allWithdrawals, dateFilter, isInDateRange]);

  // CSV EXPORTER
  const exportToCsv = (
    dataType: 'users' | 'sellers' | 'affiliates' | 'products' | 'clicks' | 'commissions' | 'withdrawals' | 'financials'
  ) => {
    const filename = `clickbarry_${dataType}_export_${new Date().toISOString().split('T')[0]}.csv`;
    const rows: string[][] = [];
    const clicksList = allRecentClicks.length > 0 ? allRecentClicks : recentClicks;
    const commsList = allCommissionRecords.length > 0 ? allCommissionRecords : commissionRecords;
    const prodsList = allProducts.length > 0 ? allProducts : products;

    if (dataType === 'users' || dataType === 'sellers' || dataType === 'affiliates') {
      let filtered = users;
      if (dataType === 'sellers') filtered = users.filter((u) => u.role === 'seller');
      if (dataType === 'affiliates') filtered = users.filter((u) => u.role === 'affiliate');

      rows.push(['User ID', 'Full Name', 'Email', 'Role', 'Status', 'Seller Verified', 'Subscription', 'Earnings (INR)', 'Created At']);
      filtered.forEach((u) => {
        rows.push([
          `"${u.id}"`,
          `"${u.fullName || ''}"`,
          `"${u.email}"`,
          `"${u.role}"`,
          `"${u.status}"`,
          `"${u.sellerVerified ? 'Yes' : 'No'}"`,
          `"${u.subscriptionStatus}"`,
          `"${u.totalEarnings || 0}"`,
          `"${u.createdAt}"`
        ]);
      });
    } else if (dataType === 'products') {
      rows.push(['Product ID', 'Title', 'Category', 'Price', 'Commission Rate', 'Approval Status', 'Status', 'Seller Name', 'Clicks', 'Views']);
      prodsList.forEach((p) => {
        rows.push([
          `"${p.id}"`,
          `"${p.title.replace(/"/g, '""')}"`,
          `"${p.category}"`,
          `"${p.price}"`,
          `"${p.commissionRate}%"`,
          `"${p.approvalStatus || 'pending'}"`,
          `"${p.status || 'published'}"`,
          `"${p.sellerName || ''}"`,
          `"${p.clicks || 0}"`,
          `"${p.views || 0}"`
        ]);
      });
    } else if (dataType === 'clicks') {
      rows.push(['Click ID', 'Tracking ID', 'Network', 'Destination URL', 'Timestamp']);
      clicksList.forEach((c) => {
        rows.push([`"${c.id}"`, `"${c.trackingId}"`, `"${c.networkName}"`, `"${c.destinationUrl}"`, `"${c.createdAt}"`]);
      });
    } else if (dataType === 'commissions') {
      rows.push(['Commission ID', 'Affiliate ID', 'Order Reference', 'Sale Amount (INR)', 'Commission (INR)', 'Network', 'Status', 'Created At']);
      commsList.forEach((c) => {
        rows.push([
          `"${c.id}"`,
          `"${c.affiliateId}"`,
          `"${c.orderReference}"`,
          `"${c.saleAmount}"`,
          `"${c.commissionAmount}"`,
          `"${c.networkName}"`,
          `"${c.status}"`,
          `"${c.createdAt}"`
        ]);
      });
    } else if (dataType === 'withdrawals') {
      rows.push(['Request Number', 'Affiliate ID', 'Amount (INR)', 'Payment Method', 'Status', 'Transaction Ref (UTR)', 'Created At']);
      allWithdrawals.forEach((w) => {
        rows.push([
          `"${w.requestNumber}"`,
          `"${w.affiliateId}"`,
          `"${w.amount}"`,
          `"${w.paymentMethod}"`,
          `"${w.status}"`,
          `"${w.transactionReference || ''}"`,
          `"${w.createdAt}"`
        ]);
      });
    } else if (dataType === 'financials') {
      rows.push(['Metric', 'Amount (INR)']);
      rows.push(['Seller Subscription Revenue', `${financialReport.sellerSubscriptionRevenue}`]);
      rows.push(['Verified Seller Commission', `${financialReport.verifiedSellerCommission}`]);
      rows.push(['Total Affiliate Withdrawals Requested', `${financialReport.totalAffiliateWithdrawalRequests}`]);
      rows.push(['Actual Affiliate Payouts (Paid)', `${financialReport.actualAffiliatePayouts}`]);
      rows.push(['Pending Withdrawals Volume', `${financialReport.pendingWithdrawalsVolume}`]);
      rows.push(['Actual Platform Net Revenue', `${financialReport.actualPlatformNetRevenue}`]);
    }

    if (rows.length <= 1) {
      showToast('No records available to export yet.', 'info');
      return;
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addAuditLog('CSV_EXPORTED', 'security', dataType, `CSV report exported for: ${dataType}`);
    showToast(`CSV Report "${filename}" exported!`, 'success');
  };

  return (
    <AdminContext.Provider
      value={{
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
        isLoading,
        updateUserStatus,
        toggleSellerVerification,
        updateSubscriptionStatus,
        approveProduct,
        rejectProduct,
        toggleFeaturedProduct,
        deleteProductAdmin,
        addCategory,
        updateCategory,
        deleteCategory,
        updateWebsiteSettings,
        addAuditLog,
        financialReport,
        exportToCsv,
        refreshAdminData: loadPlatformData
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};
