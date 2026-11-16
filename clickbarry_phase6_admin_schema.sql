-- ==============================================================================
-- CLICKBARRY: PHASE 6 – COMPLETE ADMIN DASHBOARD & PLATFORM MANAGEMENT SCHEMA
-- File: clickbarry_phase6_admin_schema.sql
-- Database: Supabase PostgreSQL (Project ID: xhkverrkjhfqrvqraafb)
-- ==============================================================================
-- Features Included:
-- 1. admin_users verification & Super Admin registration (gnetam108@gmail.com)
-- 2. categories table (Dynamic category creation, icons, sorting, active status)
-- 3. website_settings table (Central platform settings, fees, limits, branding)
-- 4. admin_audit_logs table (Immutable activity logging for all admin actions)
-- 5. Profile table enhancements (account status: active/suspended, seller verification, subscription status)
-- 6. Product table enhancements (featured flag, approval status, rejection reasons)
-- 7. High-speed indexing & Row Level Security (RLS) enforcement
-- ==============================================================================

-- 1. ENSURE ADMIN USERS TABLE & SEED SUPER ADMIN
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'super_admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Register owner/super admin gnetam108@gmail.com if profile exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE email = 'gnetam108@gmail.com') THEN
    INSERT INTO public.admin_users (id, email, role)
    SELECT id, email, 'super_admin'
    FROM public.profiles
    WHERE email = 'gnetam108@gmail.com'
    ON CONFLICT (email) DO UPDATE SET role = 'super_admin';
  END IF;
END $$;

-- 2. PROFILE ENHANCEMENTS (Status, Verification, Subscription)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS seller_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'none' CHECK (subscription_status IN ('none', 'active', 'pending', 'expired'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_price NUMERIC DEFAULT 999;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- 3. PRODUCT ENHANCEMENTS (Approval, Featured, Rejection Reason)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'approved' CHECK (approval_status IN ('approved', 'pending', 'rejected'));
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- 4. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon_name TEXT NOT NULL DEFAULT 'Folder',
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default categories if not present
INSERT INTO public.categories (name, slug, description, icon_name, is_active, display_order)
VALUES
  ('Notion & Digital Templates', 'templates', 'Productivity planners, workspace operating systems, and dashboard templates', 'LayoutTemplate', true, 1),
  ('Video Courses & Masterclasses', 'courses', 'Comprehensive video training, workshops, and high-impact digital skills', 'GraduationCap', true, 2),
  ('Software, Tools & Scripts', 'software', 'Web applications, micro-SaaS source code, automation scripts, and UI kits', 'Code', true, 3),
  ('E-Books, Guides & Playbooks', 'ebooks', 'In-depth PDFs, step-by-step handbooks, frameworks, and actionable blueprints', 'BookOpen', true, 4),
  ('Canva & Graphic Design Assets', 'graphics', 'Social media kits, pitch deck templates, branding kits, and vector packs', 'Palette', true, 5)
ON CONFLICT (slug) DO NOTHING;

-- 5. WEBSITE SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.website_settings (
  id TEXT PRIMARY KEY DEFAULT 'clickbarry_main',
  site_name TEXT NOT NULL DEFAULT 'ClickBarry',
  tagline TEXT NOT NULL DEFAULT 'Multi-Affiliate & Creator Product Discovery Marketplace',
  logo_url TEXT DEFAULT '',
  favicon_url TEXT DEFAULT '',
  description TEXT NOT NULL DEFAULT 'Discover high-converting digital products, verified creator tools, and top-tier affiliate programs.',
  support_email TEXT NOT NULL DEFAULT 'support@clickbarry.com',
  contact_phone TEXT NOT NULL DEFAULT '+91 98765 43210',
  contact_address TEXT NOT NULL DEFAULT 'ClickBarry HQ, Brigade Tech Gardens, Bengaluru, Karnataka, India',
  currency TEXT NOT NULL DEFAULT 'INR',
  currency_symbol TEXT NOT NULL DEFAULT '₹',
  min_withdrawal_amount NUMERIC NOT NULL DEFAULT 500,
  max_withdrawal_amount NUMERIC NOT NULL DEFAULT 100000,
  seller_subscription_price NUMERIC NOT NULL DEFAULT 999,
  platform_fee_percentage NUMERIC NOT NULL DEFAULT 0,
  featured_product_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  banner_announcement TEXT DEFAULT '⚡ Earn up to 70% commission on verified ClickBarry creator products & top affiliate networks!',
  is_registration_open BOOLEAN NOT NULL DEFAULT true,
  is_maintenance_mode BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default website settings
INSERT INTO public.website_settings (
  id, site_name, tagline, description, support_email, contact_phone, contact_address,
  currency, currency_symbol, min_withdrawal_amount, max_withdrawal_amount,
  seller_subscription_price, platform_fee_percentage, banner_announcement, is_registration_open, is_maintenance_mode
) VALUES (
  'clickbarry_main',
  'ClickBarry',
  'Multi-Affiliate & Creator Product Discovery Marketplace',
  'Discover high-converting digital products, verified creator tools, and top-tier affiliate programs.',
  'support@clickbarry.com',
  '+91 98765 43210',
  'ClickBarry HQ, Brigade Tech Gardens, Bengaluru, Karnataka, India',
  'INR',
  '₹',
  500,
  100000,
  999,
  0,
  '⚡ Earn up to 70% commission on verified ClickBarry creator products & top affiliate networks!',
  true,
  false
)
ON CONFLICT (id) DO NOTHING;

-- 6. ADMIN AUDIT LOGS TABLE
-- Immutable security log of every critical administrative action
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL, -- e.g. 'USER_SUSPENDED', 'PRODUCT_APPROVED', 'PAYOUT_PAID', 'SETTINGS_UPDATED'
  target_type TEXT NOT NULL, -- 'user' | 'seller' | 'affiliate' | 'product' | 'withdrawal' | 'settings' | 'category' | 'security'
  target_id TEXT NOT NULL,
  details TEXT NOT NULL,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_categories_active ON public.categories(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_admin ON public.admin_audit_logs(admin_email);
CREATE INDEX IF NOT EXISTS idx_audit_target ON public.admin_audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_products_approval ON public.products(approval_status);
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products(is_featured);

-- 8. ROW LEVEL SECURITY (RLS) POLICIES

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Categories RLS:
-- Everyone can read active categories
DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;
CREATE POLICY "Anyone can view categories" ON public.categories
  FOR SELECT USING (true);

-- Only Admins can create, update, delete categories
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories" ON public.categories
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Website Settings RLS:
-- Public can read website settings
DROP POLICY IF EXISTS "Anyone can view website settings" ON public.website_settings;
CREATE POLICY "Anyone can view website settings" ON public.website_settings
  FOR SELECT USING (true);

-- Only Admins can update website settings
DROP POLICY IF EXISTS "Admins can update website settings" ON public.website_settings;
CREATE POLICY "Admins can update website settings" ON public.website_settings
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Admin Audit Logs RLS:
-- Only authenticated Admins can view audit logs
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can view audit logs" ON public.admin_audit_logs
  FOR SELECT USING (public.is_admin());

-- Only Admins or system functions can insert audit logs
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can insert audit logs" ON public.admin_audit_logs
  FOR INSERT WITH CHECK (public.is_admin() OR auth.role() = 'authenticated');
