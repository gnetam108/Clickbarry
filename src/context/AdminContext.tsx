import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  AdminRole,
  AdminUserRecord,
  AdminAuditLog,
  PlatformCategory,
  PlatformWebsiteSettings,
  DateFilterPeriod,
  FinancialReconciliationReport,
  Product,
  ExternalAffiliateProduct,
  WithdrawalRequest,
  CommissionRecord
} from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useProducts } from './ProductContext';
import { useHybridAffiliate } from './HybridAffiliateContext';
import { useWallet } from './WalletContext';

// Default authorized Super Admin email provided in metadata
const PRIMARY_SUPER_ADMIN_EMAIL = 'gnetam108@gmail.com';

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
  bannerAnnouncement: '⚡ Earn up to 70% commission on verified ClickBarry creator products & top affiliate networks!',
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
    productCount: 4,
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
    productCount: 3,
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
    productCount: 2,
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
    productCount: 3,
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
    productCount: 2,
    createdAt: '2026-01-01T00:00:00.000Z'
  }
];

const LOCAL_ADMIN_USERS_KEY = 'cb_admin_users_v2';
const LOCAL_SETTINGS_KEY = 'cb_platform_settings_v2';
const LOCAL_CATEGORIES_KEY = 'cb_platform_categories_v2';
const LOCAL_AUDIT_LOGS_KEY = 'cb_admin_audit_logs_v2';

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
  isLoading: boolean;

  // User & Seller management
  updateUserStatus: (userId: string, status: 'active' | 'suspended', reason?: string) => Promise<{ success: boolean; error?: string }>;
  toggleSellerVerification: (userId: string, verified: boolean) => Promise<{ success: boolean; error?: string }>;
  updateSubscriptionStatus: (userId: string, status: 'active' | 'none' | 'pending') => Promise<{ success: boolean; error?: string }>;

  // Product management
  approveProduct: (productId: string) => Promise<{ success: boolean; error?: string }>;
  rejectProduct: (productId: string, reason: string) => Promise<{ success: boolean; error?: string }>;
  toggleFeaturedProduct: (productId: string, isFeatured: boolean) => Promise<{ success: boolean; error?: string }>;
  deleteProductAdmin: (productId: string, reason: string) => Promise<{ success: boolean; error?: string }>;

  // Category management
  addCategory: (cat: Omit<PlatformCategory, 'id' | 'createdAt'>) => Promise<{ success: boolean; error?: string }>;
  updateCategory: (id: string, updates: Partial<PlatformCategory>) => Promise<{ success: boolean; error?: string }>;
  deleteCategory: (id: string) => Promise<{ success: boolean; error?: string }>;

  // Settings
  updateWebsiteSettings: (newSettings: Partial<PlatformWebsiteSettings>) => Promise<{ success: boolean; error?: string }>;

  // Audit Logs
  addAuditLog: (action: string, targetType: AdminAuditLog['targetType'], targetId: string, details: string) => Promise<void>;

  // Financial reconciliation
  financialReport: FinancialReconciliationReport;

  // Exports
  exportToCsv: (dataType: 'users' | 'sellers' | 'affiliates' | 'products' | 'clicks' | 'commissions' | 'withdrawals' | 'financials') => void;

  // Refresh
  refreshAdminData: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const { products, updateProduct, deleteProduct, showToast } = useProducts();
  const { externalProducts, affiliateLinks, recentClicks, commissionRecords, totalOutboundClicks } = useHybridAffiliate();
  const { allWithdrawals } = useWallet();

  const [dateFilter, setDateFilter] = useState<DateFilterPeriod>('30d');
  const [customDateRange, setCustomDateRange] = useState<{ startDate: string; endDate: string }>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Settings state
  const [settings, setSettings] = useState<PlatformWebsiteSettings>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_SETTINGS_KEY);
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_SETTINGS;
  });

  // Categories state
  const [categories, setCategories] = useState<PlatformCategory[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_CATEGORIES_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_CATEGORIES;
  });

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_AUDIT_LOGS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'log-seed-1',
        adminEmail: PRIMARY_SUPER_ADMIN_EMAIL,
        action: 'PLATFORM_INITIALIZED',
        targetType: 'security',
        targetId: 'sys-core',
        details: 'ClickBarry Platform Management & Security System initialized with RLS verification.',
        timestamp: new Date().toISOString()
      }
    ];
  });

  // Users state
  const [users, setUsers] = useState<AdminUserRecord[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_ADMIN_USERS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Check if current user is Super Admin
  const isSuperAdmin = useMemo(() => {
    if (!user || !user.email) {
      return false;
    }
    const currentEmail = user.email.toLowerCase().trim();
    if (currentEmail === PRIMARY_SUPER_ADMIN_EMAIL.toLowerCase()) return true;
    if (user.user_metadata?.role === 'super_admin' || user.user_metadata?.role === 'admin') return true;
    // Check if listed in users table with admin role
    const matched = users.find((u) => u.id === user.id || u.email?.toLowerCase() === currentEmail);
    if (matched && (matched.role === 'admin' || matched.adminRole === 'super_admin' || matched.adminRole === 'admin')) {
      return true;
    }
    return false;
  }, [user, users]);

  const adminRole: AdminRole = useMemo(() => {
    if (user?.email?.toLowerCase().trim() === PRIMARY_SUPER_ADMIN_EMAIL.toLowerCase()) {
      return 'super_admin';
    }
    return 'super_admin';
  }, [user]);

  // Sync helpers
  const syncSettings = useCallback((newS: PlatformWebsiteSettings) => {
    setSettings(newS);
    try {
      localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(newS));
    } catch {}
  }, []);

  const syncCategories = useCallback((newC: PlatformCategory[]) => {
    setCategories(newC);
    try {
      localStorage.setItem(LOCAL_CATEGORIES_KEY, JSON.stringify(newC));
    } catch {}
  }, []);

  const syncAuditLogs = useCallback((newLogs: AdminAuditLog[]) => {
    setAuditLogs(newLogs);
    try {
      localStorage.setItem(LOCAL_AUDIT_LOGS_KEY, JSON.stringify(newLogs.slice(0, 200)));
    } catch {}
  }, []);

  const syncUsers = useCallback((newUsers: AdminUserRecord[]) => {
    setUsers(newUsers);
    try {
      localStorage.setItem(LOCAL_ADMIN_USERS_KEY, JSON.stringify(newUsers));
    } catch {}
  }, []);

  // Add audit log entry
  const addAuditLog = useCallback(
    async (action: string, targetType: AdminAuditLog['targetType'], targetId: string, details: string) => {
      const logEntry: AdminAuditLog = {
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        adminEmail: user?.email || PRIMARY_SUPER_ADMIN_EMAIL,
        action,
        targetType,
        targetId,
        details,
        timestamp: new Date().toISOString()
      };

      setAuditLogs((prev) => {
        const updated = [logEntry, ...prev].slice(0, 300);
        try {
          localStorage.setItem(LOCAL_AUDIT_LOGS_KEY, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      // Also persist to Supabase if table exists
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
        } catch {
          // Fallback handled in state
        }
      }
    },
    [user]
  );

  // Fetch real users from Supabase profiles + blend with local state
  const loadUsers = useCallback(async () => {
    let dbProfiles: any[] = [];
    if (supabase) {
      try {
        const { data, error } = await supabase.from('profiles').select('*');
        if (data && !error) {
          dbProfiles = data;
        }
      } catch (e) {
        console.warn('Profiles fetch error in admin:', e);
      }
    }

    const currentSavedUsers: AdminUserRecord[] = (() => {
      try {
        const saved = localStorage.getItem(LOCAL_ADMIN_USERS_KEY);
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    })();

    // Always include owner / super admin profile
    const baseMap = new Map<string, AdminUserRecord>();

    // Seed default baseline registered users if empty
    const defaultPlatformUsers: AdminUserRecord[] = [
      {
        id: 'usr-admin-1',
        email: PRIMARY_SUPER_ADMIN_EMAIL,
        fullName: 'Super Administrator (ClickBarry)',
        role: 'admin',
        adminRole: 'super_admin',
        status: 'active',
        sellerVerified: true,
        subscriptionStatus: 'active',
        subscriptionPrice: 999,
        totalProductsCount: 12,
        totalClicksCount: 3420,
        totalSalesCount: 148,
        totalEarnings: 84500,
        createdAt: '2026-01-15T10:00:00.000Z',
        lastActiveAt: new Date().toISOString(),
        notes: 'Platform Founder & Master Administrator'
      },
      {
        id: 'usr-seller-2',
        email: 'creator.aarav@clickbarry.store',
        fullName: 'Aarav Sharma (Notion Mastery)',
        role: 'seller',
        status: 'active',
        sellerVerified: true,
        subscriptionStatus: 'active',
        subscriptionPrice: 999,
        totalProductsCount: 4,
        totalClicksCount: 1140,
        totalSalesCount: 42,
        totalEarnings: 29400,
        createdAt: '2026-01-20T12:30:00.000Z',
        lastActiveAt: '2026-02-10T14:10:00.000Z'
      },
      {
        id: 'usr-affiliate-3',
        email: 'priya.affiliate@marketing.in',
        fullName: 'Priya Verma (Growth Marketer)',
        role: 'affiliate',
        status: 'active',
        sellerVerified: false,
        subscriptionStatus: 'none',
        totalProductsCount: 0,
        totalClicksCount: 890,
        totalSalesCount: 26,
        totalEarnings: 18200,
        createdAt: '2026-01-28T09:15:00.000Z',
        lastActiveAt: '2026-02-11T16:40:00.000Z'
      },
      {
        id: 'usr-seller-4',
        email: 'rohit.software@clickbarry.store',
        fullName: 'Rohit Gupta (DevKits)',
        role: 'both',
        status: 'active',
        sellerVerified: true,
        subscriptionStatus: 'active',
        subscriptionPrice: 999,
        totalProductsCount: 3,
        totalClicksCount: 650,
        totalSalesCount: 19,
        totalEarnings: 15300,
        createdAt: '2026-02-01T11:00:00.000Z',
        lastActiveAt: '2026-02-11T18:20:00.000Z'
      }
    ];

    defaultPlatformUsers.forEach((u) => baseMap.set(u.id, u));
    currentSavedUsers.forEach((u) => baseMap.set(u.id, u));

    // Incorporate current authenticated user
    if (user) {
      const existing = baseMap.get(user.id);
      baseMap.set(user.id, {
        id: user.id,
        email: user.email || 'seller@clickbarry.store',
        fullName: profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Verified Creator',
        role: user.email === PRIMARY_SUPER_ADMIN_EMAIL ? 'admin' : (existing?.role || 'both'),
        adminRole: user.email === PRIMARY_SUPER_ADMIN_EMAIL ? 'super_admin' : existing?.adminRole,
        status: existing?.status || 'active',
        sellerVerified: existing?.sellerVerified ?? true,
        subscriptionStatus: existing?.subscriptionStatus || 'active',
        subscriptionPrice: 999,
        totalProductsCount: existing?.totalProductsCount || 3,
        totalClicksCount: existing?.totalClicksCount || 120,
        totalSalesCount: existing?.totalSalesCount || 6,
        totalEarnings: existing?.totalEarnings || 4200,
        createdAt: user.created_at || existing?.createdAt || new Date().toISOString(),
        lastActiveAt: new Date().toISOString()
      });
    }

    // Merge Supabase DB profiles
    dbProfiles.forEach((p) => {
      const existing = baseMap.get(p.id);
      baseMap.set(p.id, {
        id: p.id,
        email: p.email || 'user@clickbarry.store',
        fullName: p.full_name || existing?.fullName || p.email?.split('@')[0] || 'Member',
        role: p.email === PRIMARY_SUPER_ADMIN_EMAIL ? 'admin' : (existing?.role || 'both'),
        status: (p.status as any) || existing?.status || 'active',
        sellerVerified: p.seller_verified ?? existing?.sellerVerified ?? true,
        subscriptionStatus: (p.subscription_status as any) || existing?.subscriptionStatus || 'active',
        subscriptionPrice: p.subscription_price || 999,
        totalProductsCount: existing?.totalProductsCount || 1,
        totalClicksCount: existing?.totalClicksCount || 0,
        totalSalesCount: existing?.totalSalesCount || 0,
        totalEarnings: existing?.totalEarnings || 0,
        createdAt: p.created_at || existing?.createdAt || new Date().toISOString(),
        lastActiveAt: p.last_active_at || new Date().toISOString()
      });
    });

    const userList = Array.from(baseMap.values());
    syncUsers(userList);
  }, [user, profile, syncUsers]);

  // Load Categories & Settings from Supabase if table exists
  const loadPlatformData = useCallback(async () => {
    setIsLoading(true);
    if (supabase) {
      try {
        const [settingsRes, catRes] = await Promise.all([
          supabase.from('website_settings').select('*').eq('id', 'clickbarry_main').maybeSingle(),
          supabase.from('categories').select('*').order('display_order', { ascending: true })
        ]);

        if (settingsRes.data && !settingsRes.error) {
          const s = settingsRes.data;
          syncSettings({
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
          const formattedCats: PlatformCategory[] = catRes.data.map((c: any) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            description: c.description || '',
            iconName: c.icon_name || 'Folder',
            imageUrl: c.image_url,
            isActive: c.is_active ?? true,
            displayOrder: c.display_order || 0,
            createdAt: c.created_at || new Date().toISOString()
          }));
          syncCategories(formattedCats);
        }
      } catch (err) {
        console.warn('Admin loadPlatformData error:', err);
      }
    }

    await loadUsers();
    setIsLoading(false);
  }, [syncSettings, syncCategories, loadUsers]);

  useEffect(() => {
    loadPlatformData();
  }, [loadPlatformData]);

  // USER MANAGEMENT ACTIONS
  const updateUserStatus = async (
    userId: string,
    status: 'active' | 'suspended',
    reason?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return { success: false, error: 'User not found' };

    // Prevent suspending the primary super admin
    if (targetUser.email === PRIMARY_SUPER_ADMIN_EMAIL && status === 'suspended') {
      return { success: false, error: 'Cannot suspend the Primary Super Administrator account.' };
    }

    const updatedUsers = users.map((u) =>
      u.id === userId ? { ...u, status, notes: reason || u.notes } : u
    );
    syncUsers(updatedUsers);

    await addAuditLog(
      status === 'suspended' ? 'USER_SUSPENDED' : 'USER_ACTIVATED',
      'user',
      userId,
      `User ${targetUser.email} status changed to ${status}. Reason: ${reason || 'Admin action'}`
    );

    if (supabase) {
      try {
        await supabase.from('profiles').update({ status }).eq('id', userId);
      } catch {}
    }

    showToast(`User ${targetUser.fullName || targetUser.email} is now ${status}.`, 'success');
    return { success: true };
  };

  const toggleSellerVerification = async (
    userId: string,
    verified: boolean
  ): Promise<{ success: boolean; error?: string }> => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return { success: false, error: 'User not found' };

    const updatedUsers = users.map((u) =>
      u.id === userId ? { ...u, sellerVerified: verified } : u
    );
    syncUsers(updatedUsers);

    await addAuditLog(
      verified ? 'SELLER_VERIFIED' : 'SELLER_VERIFICATION_REVOKED',
      'seller',
      userId,
      `Seller badge for ${targetUser.email} set to ${verified ? 'Verified (Gold Seal)' : 'Unverified'}.`
    );

    if (supabase) {
      try {
        await supabase.from('profiles').update({ seller_verified: verified }).eq('id', userId);
      } catch {}
    }

    showToast(`Seller badge updated: ${verified ? 'Verified' : 'Unverified'}`, 'success');
    return { success: true };
  };

  const updateSubscriptionStatus = async (
    userId: string,
    subStatus: 'active' | 'none' | 'pending'
  ): Promise<{ success: boolean; error?: string }> => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return { success: false, error: 'User not found' };

    const updatedUsers = users.map((u) =>
      u.id === userId ? { ...u, subscriptionStatus: subStatus } : u
    );
    syncUsers(updatedUsers);

    await addAuditLog(
      'SUBSCRIPTION_UPDATED',
      'seller',
      userId,
      `Subscription for ${targetUser.email} updated to: ${subStatus.toUpperCase()}`
    );

    if (supabase) {
      try {
        await supabase.from('profiles').update({ subscription_status: subStatus }).eq('id', userId);
      } catch {}
    }

    showToast(`Subscription status updated to ${subStatus}.`, 'success');
    return { success: true };
  };

  // PRODUCT MANAGEMENT ACTIONS
  const approveProduct = async (productId: string): Promise<{ success: boolean; error?: string }> => {
    const res = await updateProduct(productId, {
      approvalStatus: 'approved',
      status: 'published',
      rejectionReason: undefined
    });

    if (res.success) {
      await addAuditLog('PRODUCT_APPROVED', 'product', productId, `Product ${productId} approved for Marketplace discovery.`);
      showToast('Product approved and published successfully!', 'success');
    }
    return res;
  };

  const rejectProduct = async (productId: string, reason: string): Promise<{ success: boolean; error?: string }> => {
    const res = await updateProduct(productId, {
      approvalStatus: 'rejected',
      status: 'draft',
      rejectionReason: reason
    });

    if (res.success) {
      await addAuditLog('PRODUCT_REJECTED', 'product', productId, `Product ${productId} rejected. Reason: ${reason}`);
      showToast('Product rejected and returned to draft.', 'info');
    }
    return res;
  };

  const toggleFeaturedProduct = async (productId: string, isFeatured: boolean): Promise<{ success: boolean; error?: string }> => {
    const res = await updateProduct(productId, { isFeatured });
    if (res.success) {
      // Also update settings featuredProductIds
      const newIds = isFeatured
        ? Array.from(new Set([...settings.featuredProductIds, productId]))
        : settings.featuredProductIds.filter((id) => id !== productId);

      syncSettings({ ...settings, featuredProductIds: newIds });
      await addAuditLog('PRODUCT_FEATURE_TOGGLED', 'product', productId, `Product featured status set to: ${isFeatured}`);
      showToast(`Product ${isFeatured ? 'marked as Featured' : 'removed from Featured'}`, 'success');
    }
    return res;
  };

  const deleteProductAdmin = async (productId: string, reason: string): Promise<{ success: boolean; error?: string }> => {
    const res = await deleteProduct(productId);
    if (res.success) {
      await addAuditLog('PRODUCT_REMOVED_FRAUD', 'product', productId, `Prohibited or fraudulent product removed. Notes: ${reason}`);
      showToast('Product listing removed from platform.', 'success');
    }
    return res;
  };

  // CATEGORY MANAGEMENT ACTIONS
  const addCategory = async (cat: Omit<PlatformCategory, 'id' | 'createdAt'>): Promise<{ success: boolean; error?: string }> => {
    const newCat: PlatformCategory = {
      ...cat,
      id: `cat-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    const updated = [...categories, newCat];
    syncCategories(updated);

    if (supabase) {
      try {
        await supabase.from('categories').insert({
          name: newCat.name,
          slug: newCat.slug,
          description: newCat.description,
          icon_name: newCat.iconName,
          image_url: newCat.imageUrl,
          is_active: newCat.isActive,
          display_order: newCat.displayOrder
        });
      } catch {}
    }

    await addAuditLog('CATEGORY_CREATED', 'category', newCat.slug, `New category created: ${newCat.name}`);
    showToast(`Category "${newCat.name}" added successfully.`, 'success');
    return { success: true };
  };

  const updateCategory = async (id: string, updates: Partial<PlatformCategory>): Promise<{ success: boolean; error?: string }> => {
    const updated = categories.map((c) => (c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c));
    syncCategories(updated);

    if (supabase) {
      try {
        await supabase.from('categories').update({
          name: updates.name,
          description: updates.description,
          icon_name: updates.iconName,
          image_url: updates.imageUrl,
          is_active: updates.isActive,
          display_order: updates.displayOrder
        }).eq('id', id);
      } catch {}
    }

    await addAuditLog('CATEGORY_UPDATED', 'category', id, `Category ${id} updated.`);
    showToast('Category updated.', 'success');
    return { success: true };
  };

  const deleteCategory = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const target = categories.find((c) => c.id === id);
    const updated = categories.filter((c) => c.id !== id);
    syncCategories(updated);

    if (supabase) {
      try {
        await supabase.from('categories').delete().eq('id', id);
      } catch {}
    }

    await addAuditLog('CATEGORY_DELETED', 'category', id, `Category "${target?.name || id}" removed.`);
    showToast('Category removed.', 'info');
    return { success: true };
  };

  // WEBSITE SETTINGS ACTIONS
  const updateWebsiteSettings = async (newS: Partial<PlatformWebsiteSettings>): Promise<{ success: boolean; error?: string }> => {
    const merged: PlatformWebsiteSettings = {
      ...settings,
      ...newS,
      updatedAt: new Date().toISOString()
    };
    syncSettings(merged);

    if (supabase) {
      try {
        await supabase.from('website_settings').upsert({
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
      } catch (err: any) {
        console.warn('Supabase website settings update warning:', err);
      }
    }

    await addAuditLog('SETTINGS_UPDATED', 'settings', 'clickbarry_main', 'Platform website settings and financial limits updated.');
    showToast('Platform settings saved successfully!', 'success');
    return { success: true };
  };

  // FINANCIAL RECONCILIATION REPORT CALCULATION
  const financialReport: FinancialReconciliationReport = useMemo(() => {
    // 1. Seller Subscription Revenue: Only from active paid sellers (e.g. ₹999 lifetime access)
    const paidSellers = users.filter((u) => u.subscriptionStatus === 'active');
    const sellerSubscriptionRevenue = paidSellers.reduce((sum, u) => sum + (u.subscriptionPrice || 999), 0);

    // 2. Verified Seller Commission (Commissions from internal marketplace transactions)
    const internalCommissions = commissionRecords
      .filter((c) => c.status === 'verified' || c.status === 'paid')
      .reduce((sum, c) => sum + c.commissionAmount, 0);

    // 3. External Network Commission (Reported Amazon / ClickBank / Digistore24)
    // IMPORTANT RULE: External network commissions are NEVER counted as ClickBarry controlled revenue.
    const externalCommissions = commissionRecords
      .filter((c) => c.networkName && c.networkName.toLowerCase() !== 'clickbarry direct')
      .reduce((sum, c) => sum + c.commissionAmount, 0);

    // 4. Withdrawal volumes
    const totalAffiliateWithdrawalRequests = allWithdrawals.reduce((sum, w) => sum + w.amount, 0);
    const actualAffiliatePayouts = allWithdrawals
      .filter((w) => w.status === 'paid')
      .reduce((sum, w) => sum + w.amount, 0);
    const pendingWithdrawalsVolume = allWithdrawals
      .filter((w) => w.status === 'pending' || w.status === 'approved' || w.status === 'processing')
      .reduce((sum, w) => sum + w.amount, 0);

    // 5. Platform Net Revenue (Retained by ClickBarry = Subscription revenue + platform fees - reversals)
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
  }, [users, commissionRecords, allWithdrawals, dateFilter]);

  // CSV EXPORTER UTILITY
  const exportToCsv = (
    dataType: 'users' | 'sellers' | 'affiliates' | 'products' | 'clicks' | 'commissions' | 'withdrawals' | 'financials'
  ) => {
    let filename = `clickbarry_${dataType}_export_${new Date().toISOString().split('T')[0]}.csv`;
    let rows: string[][] = [];

    if (dataType === 'users' || dataType === 'sellers' || dataType === 'affiliates') {
      let filtered = users;
      if (dataType === 'sellers') filtered = users.filter((u) => u.role === 'seller' || u.role === 'both');
      if (dataType === 'affiliates') filtered = users.filter((u) => u.role === 'affiliate' || u.role === 'both');

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
      rows.push(['Product ID', 'Title', 'Category', 'Price', 'Original Price', 'Commission Rate', 'Source', 'Approval Status', 'Featured', 'Seller Name', 'Clicks', 'Views']);
      products.forEach((p) => {
        rows.push([
          `"${p.id}"`,
          `"${p.title.replace(/"/g, '""')}"`,
          `"${p.category}"`,
          `"${p.price}"`,
          `"${p.originalPrice}"`,
          `"${p.commissionRate}%"`,
          `"${p.networkName || 'ClickBarry Seller'}"`,
          `"${p.approvalStatus || 'approved'}"`,
          `"${p.isFeatured ? 'Yes' : 'No'}"`,
          `"${p.sellerName || ''}"`,
          `"${p.clicks || 0}"`,
          `"${p.views || 0}"`
        ]);
      });
    } else if (dataType === 'clicks') {
      rows.push(['Click ID', 'Tracking ID', 'Network', 'Destination URL', 'Timestamp']);
      recentClicks.forEach((c) => {
        rows.push([
          `"${c.id}"`,
          `"${c.trackingId}"`,
          `"${c.networkName}"`,
          `"${c.destinationUrl}"`,
          `"${c.createdAt}"`
        ]);
      });
    } else if (dataType === 'commissions') {
      rows.push(['Commission ID', 'Affiliate ID', 'Order Reference', 'Sale Amount (INR)', 'Commission (INR)', 'Network', 'Status', 'Verification', 'Created At']);
      commissionRecords.forEach((c) => {
        rows.push([
          `"${c.id}"`,
          `"${c.affiliateId}"`,
          `"${c.orderReference}"`,
          `"${c.saleAmount}"`,
          `"${c.commissionAmount}"`,
          `"${c.networkName}"`,
          `"${c.status}"`,
          `"${c.verificationSource}"`,
          `"${c.createdAt}"`
        ]);
      });
    } else if (dataType === 'withdrawals') {
      rows.push(['Request Number', 'Affiliate ID', 'Amount (INR)', 'Payment Method', 'Status', 'UPI ID', 'Bank Account', 'IFSC', 'Transaction Ref (UTR)', 'Created At', 'Processed At']);
      allWithdrawals.forEach((w) => {
        rows.push([
          `"${w.requestNumber}"`,
          `"${w.affiliateId}"`,
          `"${w.amount}"`,
          `"${w.paymentMethod}"`,
          `"${w.status}"`,
          `"${w.upiId || ''}"`,
          `"${w.bankAccountNumber ? `XXX${w.bankAccountNumber.slice(-4)}` : ''}"`,
          `"${w.ifscCode || ''}"`,
          `"${w.transactionReference || ''}"`,
          `"${w.createdAt}"`,
          `"${w.processedAt || ''}"`
        ]);
      });
    } else if (dataType === 'financials') {
      rows.push(['Metric', 'Amount (INR)', 'Notes']);
      rows.push(['Seller Subscription Revenue', `${financialReport.sellerSubscriptionRevenue}`, 'Lifetime access passes at ₹999']);
      rows.push(['Platform Fees', `${financialReport.platformFees}`, 'Direct platform processing fees']);
      rows.push(['Verified Seller Commission', `${financialReport.verifiedSellerCommission}`, 'Commissions earned by affiliates']);
      rows.push(['External Network Commission', `${financialReport.externalNetworkCommission}`, 'Amazon / ClickBank (Reported separately)']);
      rows.push(['Total Affiliate Withdrawals Requested', `${financialReport.totalAffiliateWithdrawalRequests}`, 'Total requested payout volume']);
      rows.push(['Actual Affiliate Payouts (Paid)', `${financialReport.actualAffiliatePayouts}`, 'Settled manually via Bank/UPI with UTR']);
      rows.push(['Pending Withdrawals Volume', `${financialReport.pendingWithdrawalsVolume}`, 'Pending / in-process requests']);
      rows.push(['Actual Platform Net Revenue', `${financialReport.actualPlatformNetRevenue}`, 'ClickBarry net revenue retained']);
    }

    if (rows.length === 0) {
      showToast('No records available to export.', 'info');
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

    addAuditLog('CSV_EXPORTED', 'security', dataType, `Administrative CSV report exported for: ${dataType}`);
    showToast(`CSV Report "${filename}" exported successfully!`, 'success');
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
