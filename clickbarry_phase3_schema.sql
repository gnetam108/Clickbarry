-- ============================================================================
-- ClickBarry - Phase 3 Step 2 Database Schema & Security Migration
-- Target Database: Supabase PostgreSQL (Project ID: xhkverrkjhfqrvqraafb)
-- ============================================================================
-- Features included:
-- 1. profiles table (linked with Supabase auth.users)
-- 2. products table (seller products with category, price, status, original url)
-- 3. product_events table (views and shop_click tracking)
-- 4. Automatic user profile creation trigger on signup
-- 5. Row Level Security (RLS) policies for complete data privacy
-- 6. Performance indexes for search, filtering, and analytics
-- 7. Storage bucket 'product-images' configuration and upload policies
-- ============================================================================

-- Enable pgcrypto extension for UUID generation (enabled by default in Supabase)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies:
-- Users can only read their own profile (privacy protection)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can insert their own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Users can update only their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- 2. AUTOMATIC PROFILE CREATION TRIGGER ON SIGNUP
-- ============================================================================
-- Automatically copies id, email and full_name into public.profiles on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

-- Drop trigger if exists to prevent duplicates
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 3. PRODUCTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  image_url TEXT,
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  description TEXT,
  category TEXT NOT NULL,
  original_url TEXT,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Products Policies:
-- 1. Anyone (public visitors & authenticated) can view published products
DROP POLICY IF EXISTS "Public can view published products" ON public.products;
CREATE POLICY "Public can view published products"
  ON public.products
  FOR SELECT
  USING (
    status = 'published' 
    OR (auth.role() = 'authenticated' AND auth.uid() = seller_id)
  );

-- 2. Authenticated sellers can create products (enforcing seller_id = auth.uid())
DROP POLICY IF EXISTS "Sellers can create products" ON public.products;
CREATE POLICY "Sellers can create products"
  ON public.products
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = seller_id);

-- 3. Sellers can update only their own products (cannot reassign seller_id)
DROP POLICY IF EXISTS "Sellers can update own products" ON public.products;
CREATE POLICY "Sellers can update own products"
  ON public.products
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

-- 4. Sellers can delete only their own products
DROP POLICY IF EXISTS "Sellers can delete own products" ON public.products;
CREATE POLICY "Sellers can delete own products"
  ON public.products
  FOR DELETE
  TO authenticated
  USING (auth.uid() = seller_id);

-- ============================================================================
-- 4. PRODUCT_EVENTS TABLE (Analytics: Views & Shop Clicks)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.product_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'shop_click')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on product_events
ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY;

-- Product Events Policies:
-- 1. Anyone (visitors & sellers) can log a view or click for any published product
DROP POLICY IF EXISTS "Visitors can record product events" ON public.product_events;
CREATE POLICY "Visitors can record product events"
  ON public.product_events
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = product_events.product_id
        AND products.status = 'published'
    )
  );

-- 2. Sellers can ONLY view analytics events for their own products (private analytics)
DROP POLICY IF EXISTS "Sellers can view own product events" ON public.product_events;
CREATE POLICY "Sellers can view own product events"
  ON public.product_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = product_events.product_id
        AND products.seller_id = auth.uid()
    )
  );

-- ============================================================================
-- 5. PERFORMANCE INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_products_seller_id ON public.products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_events_product_id ON public.product_events(product_id);
CREATE INDEX IF NOT EXISTS idx_product_events_type_created ON public.product_events(event_type, created_at DESC);

-- ============================================================================
-- 6. STORAGE BUCKET CONFIGURATION ('product-images')
-- ============================================================================
-- Insert storage bucket if it doesn't already exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880, -- 5 MB limit per image
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- Storage Policies:
-- 1. Anyone can view/download images from product-images bucket (public CDN)
DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;
CREATE POLICY "Public can view product images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'product-images');

-- 2. Only authenticated users can upload product images
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
CREATE POLICY "Authenticated users can upload product images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- 3. Users can update/delete their own uploaded images
DROP POLICY IF EXISTS "Users can update own product images" ON storage.objects;
CREATE POLICY "Users can update own product images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete own product images" ON storage.objects;
CREATE POLICY "Users can delete own product images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
