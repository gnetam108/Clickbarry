-- ==============================================================================
-- CLICKBARRY: PHASE 8 – CLICKBANK-STYLE MARKETPLACE, 3-ROLE RBAC & ZERO-TRUST RLS
-- File: clickbarry_phase8_clickbank_rbac.sql
-- Database: Supabase PostgreSQL (Project ID: xhkverrkjhfqrvqraafb)
-- ==============================================================================

-- 1. PROFILES ROLE & PRIVILEGE HARDENING
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'affiliate';

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS chk_profiles_role_valid;
ALTER TABLE public.profiles
  ADD CONSTRAINT chk_profiles_role_valid CHECK (role IN ('affiliate', 'seller', 'admin'));

-- 2. STRICT SUPER ADMIN CHECK (DB + JWT Email)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users WHERE id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ) OR (
    lower(coalesce(auth.jwt() ->> 'email', '')) = 'gnetam108@gmail.com'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. SIGNUP PROFILE TRIGGER: Allow only 'affiliate' or 'seller' from client metadata
--    Root admin email gnetam108@gmail.com is always assigned 'admin'.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  meta_role TEXT;
  assigned_role TEXT;
BEGIN
  meta_role := lower(coalesce(NEW.raw_user_meta_data ->> 'role', 'affiliate'));

  IF lower(coalesce(NEW.email, '')) = 'gnetam108@gmail.com' THEN
    assigned_role := 'admin';
  ELSIF meta_role = 'seller' THEN
    assigned_role := 'seller';
  ELSE
    assigned_role := 'affiliate';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, status, seller_verified, subscription_status)
  VALUES (
    NEW.id,
    lower(NEW.email),
    coalesce(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    assigned_role,
    'active',
    false,
    'none'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = coalesce(public.profiles.full_name, EXCLUDED.full_name);

  IF assigned_role = 'admin' THEN
    INSERT INTO public.admin_users (id, email, role)
    VALUES (NEW.id, lower(NEW.email), 'super_admin')
    ON CONFLICT (email) DO UPDATE SET role = 'super_admin';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. PREVENT SELF-ESCALATION ON PROFILES UPDATE & INSERT
CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT public.is_admin() THEN
    -- Block non-admin users from altering role, status, seller_verified, or subscription_status
    IF TG_OP = 'UPDATE' THEN
      NEW.role := OLD.role;
      NEW.status := OLD.status;
      NEW.seller_verified := OLD.seller_verified;
      NEW.subscription_status := OLD.subscription_status;
    ELSIF TG_OP = 'INSERT' THEN
      IF NEW.role NOT IN ('affiliate', 'seller') THEN
        NEW.role := 'affiliate';
      END IF;
      NEW.status := 'active';
      NEW.seller_verified := false;
      NEW.subscription_status := 'none';
    END IF;
  END IF;
  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_protect_profile_privileges ON public.profiles;
CREATE TRIGGER trg_protect_profile_privileges
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_privileges();

-- 5. PRODUCTS MODERATION WORKFLOW: New Seller products default to 'pending'
ALTER TABLE public.products
  ALTER COLUMN approval_status SET DEFAULT 'pending';

CREATE OR REPLACE FUNCTION public.protect_product_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT public.is_admin() THEN
    IF TG_OP = 'INSERT' THEN
      NEW.approval_status := 'pending';
      NEW.is_featured := false;
    ELSIF TG_OP = 'UPDATE' THEN
      -- Sellers editing content retain existing approval unless it was rejected (resubmitted -> pending)
      IF OLD.approval_status = 'rejected' THEN
        NEW.approval_status := 'pending';
      ELSE
        NEW.approval_status := OLD.approval_status;
      END IF;
      NEW.is_featured := OLD.is_featured;
    END IF;
  END IF;
  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_protect_product_approval ON public.products;
CREATE TRIGGER trg_protect_product_approval
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_product_approval();

-- Public marketplace can ONLY read published + approved products; sellers see own; admins see all
DROP POLICY IF EXISTS "Public view published products" ON public.products;
DROP POLICY IF EXISTS "Anyone can view published products" ON public.products;
DROP POLICY IF EXISTS "Marketplace approved products only" ON public.products;
CREATE POLICY "Marketplace approved products only" ON public.products
  FOR SELECT
  USING (
    (status = 'published' AND approval_status = 'approved')
    OR auth.uid() = seller_id
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Sellers insert own products" ON public.products;
CREATE POLICY "Sellers insert own products" ON public.products
  FOR INSERT
  WITH CHECK (
    auth.uid() = seller_id
    AND (
      public.is_admin()
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'seller' AND status = 'active')
    )
  );

DROP POLICY IF EXISTS "Sellers update own products" ON public.products;
CREATE POLICY "Sellers update own products" ON public.products
  FOR UPDATE
  USING (auth.uid() = seller_id OR public.is_admin())
  WITH CHECK (auth.uid() = seller_id OR public.is_admin());

DROP POLICY IF EXISTS "Sellers delete own products" ON public.products;
CREATE POLICY "Sellers delete own products" ON public.products
  FOR DELETE
  USING (auth.uid() = seller_id OR public.is_admin());

-- 6. SAFE TRACKING CLICK INCREMENT RPC (Works for unauthenticated public visitors)
CREATE OR REPLACE FUNCTION public.increment_affiliate_click(p_slug TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.affiliate_links
  SET clicks_count = coalesce(clicks_count, 0) + 1,
      updated_at = timezone('utc'::text, now())
  WHERE unique_tracking_slug = p_slug;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.increment_affiliate_click(TEXT) TO anon, authenticated;

-- 7. SELLER & ADMIN VISIBILITY FOR AFFILIATE ACTIVITY & COMMISSIONS
DROP POLICY IF EXISTS "Sellers view affiliate links for own products" ON public.affiliate_links;
CREATE POLICY "Sellers view affiliate links for own products" ON public.affiliate_links
  FOR SELECT
  USING (
    public.is_admin()
    OR auth.uid() = affiliate_id
    OR EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = affiliate_links.product_id AND p.seller_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Sellers and admins view clicks" ON public.affiliate_clicks;
CREATE POLICY "Sellers and admins view clicks" ON public.affiliate_clicks
  FOR SELECT
  USING (
    public.is_admin()
    OR auth.uid() = affiliate_id
    OR EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = affiliate_clicks.product_id AND p.seller_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Sellers and admins view commissions" ON public.commission_records;
CREATE POLICY "Sellers and admins view commissions" ON public.commission_records
  FOR SELECT
  USING (
    public.is_admin()
    OR auth.uid() = affiliate_id
    OR EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = commission_records.product_id AND p.seller_id = auth.uid()
    )
  );

-- Only admins or verified product sellers can create commission records
DROP POLICY IF EXISTS "Sellers insert commission records" ON public.commission_records;
CREATE POLICY "Admins or sellers insert commission records" ON public.commission_records
  FOR INSERT
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = commission_records.product_id AND p.seller_id = auth.uid()
    )
  );

-- Only admins can approve/modify/pay commissions
DROP POLICY IF EXISTS "Admins update commission records" ON public.commission_records;
CREATE POLICY "Admins update commission records" ON public.commission_records
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 8. PROFILES ADMIN VISIBILITY
DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;
CREATE POLICY "Admins view all profiles" ON public.profiles
  FOR SELECT
  USING (public.is_admin() OR auth.uid() = id);

DROP POLICY IF EXISTS "Admins update all profiles" ON public.profiles;
CREATE POLICY "Admins update all profiles" ON public.profiles
  FOR UPDATE
  USING (public.is_admin() OR auth.uid() = id)
  WITH CHECK (public.is_admin() OR auth.uid() = id);
