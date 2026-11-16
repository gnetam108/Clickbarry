import React, { useState, useEffect } from 'react';
import {
  testSupabaseConnection,
  SupabaseConnectionStatus,
  validSupabaseUrl,
  validSupabaseAnonKey,
  saveDevSupabaseCredentials
} from '../lib/supabase';
import {
  Database,
  CheckCircle2,
  XCircle,
  RefreshCw,
  X,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  Clock,
  Key,
  Save,
  Check
} from 'lucide-react';

export const SupabaseDevStatusBar: React.FC = () => {
  const [status, setStatus] = useState<SupabaseConnectionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Quick edit state inside modal
  const [inputUrl, setInputUrl] = useState(validSupabaseUrl || 'https://xhkverrkjhfqrvqraafb.supabase.co');
  const [inputKey, setInputKey] = useState(validSupabaseAnonKey || 'sb_publishable_H3MSli5qkJObuqu-_DBPJQ_LEEdPCGg');
  const [showConfigForm, setShowConfigForm] = useState(false);

  // Automatically test connection on mount
  useEffect(() => {
    runTest();
  }, []);

  const runTest = async (overrideUrl?: string, overrideKey?: string) => {
    setIsLoading(true);
    try {
      const result = await testSupabaseConnection(overrideUrl, overrideKey);
      setStatus(result);
      if (result.url && result.url.startsWith('http')) {
        setInputUrl(result.url);
      }
    } catch (err: any) {
      setStatus({
        clientInitialized: false,
        configured: false,
        connected: false,
        status: 'not-connected',
        message: err?.message || 'Unexpected connection error',
        testedAt: new Date().toLocaleTimeString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAndTest = async (e: React.FormEvent) => {
    e.preventDefault();
    saveDevSupabaseCredentials(inputUrl, inputKey);
    await runTest(inputUrl, inputKey);
  };

  const isConnected = status?.connected === true;

  return (
    <>
      {/* Compact Top Development Status Strip */}
      <aside aria-label="Development environment status" className="w-full bg-[#090416] border-b border-purple-900/50 text-xs py-1.5 px-4 sm:px-6 z-40 relative">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              Supabase Status:
            </span>

            {/* Clear Green / Red Connection Status Pill */}
            <button
              onClick={() => setIsModalOpen(true)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-all hover:scale-105 select-none ${
                isLoading
                  ? 'bg-purple-950 text-slate-300 border border-purple-800'
                  : isConnected
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/70 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                  : 'bg-red-950 text-red-300 border border-red-500/70 shadow-[0_0_12px_rgba(239,68,68,0.3)]'
              }`}
              title="Click to view detailed Supabase connection diagnostics"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3 h-3 text-pink-400 animate-spin" />
                  <span>Checking Connection...</span>
                </>
              ) : isConnected ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="tracking-wide">Connected (Green)</span>
                  {status?.latencyMs !== undefined && (
                    <span className="text-[10px] text-emerald-400 font-mono font-semibold">({status.latencyMs}ms)</span>
                  )}
                </>
              ) : (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span className="tracking-wide">Not Connected (Red)</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            {status?.message && (
              <span className={`hidden md:inline truncate max-w-lg font-medium ${
                isConnected ? 'text-emerald-300' : 'text-red-300'
              }`}>
                {status.message}
              </span>
            )}
            <button
              onClick={() => setIsModalOpen(true)}
              className="text-pink-400 hover:text-pink-300 font-bold underline underline-offset-2 cursor-pointer whitespace-nowrap ml-1"
            >
              {isConnected ? 'View Diagnostics' : 'Fix & Connect'}
            </button>
          </div>
        </div>
      </aside>

      {/* Detailed Connection Status & Diagnostic Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto bg-[#120a2e] border border-purple-800 rounded-3xl p-6 sm:p-7 shadow-2xl text-slate-100 space-y-5">
            {/* Close Button */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 p-1 text-slate-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-purple-700/60 flex items-center justify-center text-pink-400 shrink-0">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Supabase Connection Diagnostics</h3>
                <p className="text-xs text-slate-400">Phase 3: Real API Ping &amp; Credential Verification</p>
              </div>
            </div>

            {/* Status Hero Card (Green or Red) */}
            <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
              isConnected
                ? 'bg-emerald-950/80 border-emerald-500/70 text-emerald-200'
                : 'bg-red-950/80 border-red-500/70 text-red-200'
            }`}>
              {isConnected ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm uppercase tracking-wide">
                    {isConnected ? 'Connected (Green)' : 'Not Connected (Red)'}
                  </span>
                  {status?.testedAt && (
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" />
                      {status.testedAt}
                    </span>
                  )}
                </div>
                <p className="text-xs leading-relaxed text-slate-200 font-medium">
                  {status?.message}
                </p>
                {status?.latencyMs !== undefined && (
                  <span className="text-[11px] text-emerald-300 block font-mono font-bold pt-0.5">
                    Live Response Latency: {status.latencyMs}ms
                  </span>
                )}
              </div>
            </div>

            {/* Diagnostic Checklist */}
            <div className="bg-[#170e3c] rounded-2xl p-4 border border-purple-900/60 space-y-2.5 text-xs">
              <span className="font-bold text-slate-300 block uppercase tracking-wider text-[10px]">
                Diagnostic Checklist
              </span>

              {/* 1. Client initialization */}
              <div className="flex items-center justify-between py-1 border-b border-purple-900/40">
                <span className="text-slate-300">1. Supabase Client Initialized:</span>
                <span className={`font-bold flex items-center gap-1 ${status?.clientInitialized ? 'text-emerald-400' : 'text-red-400'}`}>
                  {status?.clientInitialized ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  <span>{status?.clientInitialized ? 'Ready' : 'Not Initialized'}</span>
                </span>
              </div>

              {/* 2. URL config */}
              <div className="flex items-center justify-between py-1 border-b border-purple-900/40">
                <span className="text-slate-300">2. Supabase Project URL:</span>
                <span className="font-mono text-[11px] text-slate-200 truncate max-w-[220px]">
                  {status?.url || 'Missing'}
                </span>
              </div>

              {/* 3. Anon Key */}
              <div className="flex items-center justify-between py-1 border-b border-purple-900/40">
                <span className="text-slate-300">3. Publishable Anon Key:</span>
                <span className="font-mono text-[11px] text-slate-300">
                  {status?.configured ? 'Detected (Publishable)' : 'Missing'}
                </span>
              </div>

              {/* 4. Real API Ping */}
              <div className="flex items-center justify-between py-1 border-b border-purple-900/40">
                <span className="text-slate-300">4. Live Supabase Ping:</span>
                <span className={`font-bold flex items-center gap-1 ${isConnected ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isConnected ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  <span>{isConnected ? 'Passed (Connected)' : 'Failed'}</span>
                </span>
              </div>

              {/* 5. Database Table Status */}
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-300">5. Products Table in Database:</span>
                <span className={`font-bold flex items-center gap-1 ${status?.tableExists ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {status?.tableExists ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Ready (Found)</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Not Created Yet</span>
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* Phase 3 Step 2: Database Schema & Migration Setup */}
            <div className="bg-[#180e3b] rounded-2xl p-4 border border-purple-700/80 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-pink-300 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-pink-400" />
                  <span>Phase 3 Step 2: SQL Migration (clickbarry_phase3_schema.sql)</span>
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  status?.tableExists ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50' : 'bg-amber-950 text-amber-300 border border-amber-500/50'
                }`}>
                  {status?.tableExists ? 'Tables Detected' : 'Pending SQL Run'}
                </span>
              </div>

              <p className="text-[11px] text-slate-300 leading-relaxed">
                Supabase database schema तैयार है! इसमें <strong>profiles</strong>, <strong>products</strong>, <strong>product_events</strong>, Row Level Security (RLS), और <strong>product-images</strong> स्टोरेज बकेट शामिल हैं।
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const fullSql = `-- ============================================================================
-- ClickBarry - Phase 3 Step 2 Database Schema & Security Migration
-- Target Database: Supabase PostgreSQL (Project ID: xhkverrkjhfqrvqraafb)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 2. PROFILE CREATION TRIGGER ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
      updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. PRODUCTS TABLE
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

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published products" ON public.products;
CREATE POLICY "Public can view published products"
  ON public.products FOR SELECT
  USING (status = 'published' OR (auth.role() = 'authenticated' AND auth.uid() = seller_id));

DROP POLICY IF EXISTS "Sellers can create products" ON public.products;
CREATE POLICY "Sellers can create products"
  ON public.products FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = seller_id);

DROP POLICY IF EXISTS "Sellers can update own products" ON public.products;
CREATE POLICY "Sellers can update own products"
  ON public.products FOR UPDATE TO authenticated
  USING (auth.uid() = seller_id) WITH CHECK (auth.uid() = seller_id);

DROP POLICY IF EXISTS "Sellers can delete own products" ON public.products;
CREATE POLICY "Sellers can delete own products"
  ON public.products FOR DELETE TO authenticated
  USING (auth.uid() = seller_id);

-- 4. PRODUCT_EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.product_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'shop_click')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Visitors can record product events" ON public.product_events;
CREATE POLICY "Visitors can record product events"
  ON public.product_events FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.products WHERE products.id = product_events.product_id AND products.status = 'published')
  );

DROP POLICY IF EXISTS "Sellers can view own product events" ON public.product_events;
CREATE POLICY "Sellers can view own product events"
  ON public.product_events FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.products WHERE products.id = product_events.product_id AND products.seller_id = auth.uid())
  );

-- 5. INDEXES
CREATE INDEX IF NOT EXISTS idx_products_seller_id ON public.products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_events_product_id ON public.product_events(product_id);
CREATE INDEX IF NOT EXISTS idx_product_events_type_created ON public.product_events(event_type, created_at DESC);

-- 6. STORAGE BUCKET 'product-images'
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('product-images', 'product-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;
CREATE POLICY "Public can view product images" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
CREATE POLICY "Authenticated users can upload product images" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'product-images' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete own product images" ON storage.objects;
CREATE POLICY "Users can delete own product images" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'product-images' AND (auth.uid())::text = (storage.foldername(name))[1]);
`;
                    navigator.clipboard.writeText(fullSql);
                    alert('Complete SQL Migration Copied to Clipboard! Now open Supabase Dashboard > SQL Editor, paste and click RUN.');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold text-[11px] shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Copy Complete SQL Migration</span>
                </button>

                <a
                  href="https://supabase.com/dashboard/project/xhkverrkjhfqrvqraafb/sql"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-purple-900/60 hover:bg-purple-900 text-purple-200 border border-purple-700 font-semibold text-[11px] flex items-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Supabase SQL Editor</span>
                </a>
              </div>
            </div>

            {/* Quick In-App Credential Editor */}
            <div className="bg-[#1b1046] rounded-2xl p-4 border border-purple-800 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-pink-400" />
                  <span>Configure / Verify Credentials</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowConfigForm(!showConfigForm)}
                  className="text-pink-400 hover:text-pink-300 text-[11px] font-semibold underline cursor-pointer"
                >
                  {showConfigForm ? 'Hide Form' : 'Edit / Enter Credentials'}
                </button>
              </div>

              {showConfigForm && (
                <form onSubmit={handleSaveAndTest} className="space-y-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Supabase Project URL or Project ID:
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="https://xhkverrkjhfqrvqraafb.supabase.co or xhkverrkjhfqrvqraafb"
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#130a30] border border-purple-800 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Supabase Publishable / Anon Key:
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="sb_publishable_... or eyJhbGci..."
                      value={inputKey}
                      onChange={(e) => setInputKey(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#130a30] border border-purple-800 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-pink-500"
                    />
                    <span className="text-[10px] text-amber-300 mt-0.5 block">
                      Never enter your secret service_role key!
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold text-xs shadow-md shadow-pink-600/30 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save &amp; Test Connection Now</span>
                  </button>
                </form>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <span className="text-[10px] text-slate-400">
                Phase 3: Connection Test Only
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => runTest()}
                  disabled={isLoading}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold text-xs shadow-md shadow-pink-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>{isLoading ? 'Testing...' : 'Test Connection Again'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
