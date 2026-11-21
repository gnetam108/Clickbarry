import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Retrieve credentials from Vite env, Next.js env aliases, or localStorage fallback
// Default credentials provided for ClickBarry project
const DEFAULT_SUPABASE_URL = 'https://xhkverrkjhfqrvqraafb.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_H3MSli5qkJObuqu-_DBPJQ_LEEdPCGg';

function getRawUrl(): string | undefined {
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem('clickbarry_supabase_url');
    if (local && local.trim()) return local.trim();
  }
  return (
    import.meta.env.VITE_SUPABASE_URL ||
    import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
    import.meta.env.SUPABASE_URL ||
    DEFAULT_SUPABASE_URL
  ) as string | undefined;
}

function getRawAnonKey(): string | undefined {
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem('clickbarry_supabase_anon_key');
    if (local && local.trim()) return local.trim();
  }
  return (
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_KEY
  ) as string | undefined;
}

/**
 * Validates and normalizes the Supabase URL.
 * Automatically formats bare project IDs (e.g. 'xhkverrkjhfqrvqraafb') into 'https://xhkverrkjhfqrvqraafb.supabase.co'.
 */
export function sanitizeSupabaseUrl(url: string | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  let clean = url.trim().replace(/^["']|["']$/g, '');

  // Exclude placeholder and empty strings
  if (clean === '' || clean.includes('your-project-id') || clean === 'MY_SUPABASE_URL') {
    return null;
  }

  // If user passed bare project ID (letters/numbers, no dots or slashes)
  if (/^[a-z0-9_-]{10,30}$/i.test(clean)) {
    return `https://${clean}.supabase.co`;
  }

  // Prepend https:// if user entered domain without protocol
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = 'https://' + clean;
  }

  try {
    const parsed = new URL(clean);
    if ((parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.hostname.length > 0) {
      return parsed.origin;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Validates the Supabase Anonymous / Publishable Key.
 * Supports both traditional JWT (eyJ...) and new sb_publishable_... keys.
 */
export function sanitizeAnonKey(key: string | undefined): string | null {
  if (!key || typeof key !== 'string') return null;
  const clean = key.trim().replace(/^["']|["']$/g, '');
  if (clean === '' || clean.includes('your-anon-publishable-key') || clean === 'MY_ANON_KEY') {
    return null;
  }
  return clean;
}

export const validSupabaseUrl = sanitizeSupabaseUrl(getRawUrl());
export const validSupabaseAnonKey = sanitizeAnonKey(getRawAnonKey());

/**
 * True only if both a valid HTTP/HTTPS URL and non-placeholder anon key are provided.
 */
export const isSupabaseConfigured: boolean = Boolean(validSupabaseUrl && validSupabaseAnonKey);

/**
 * Safely initialize the Supabase client without crashing the app on invalid/missing env vars.
 */
function createSafeSupabaseClient(): SupabaseClient | null {
  if (!validSupabaseUrl || !validSupabaseAnonKey) {
    return null;
  }

  try {
    return createClient(validSupabaseUrl, validSupabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  } catch (err) {
    console.warn('Could not initialize Supabase client:', err);
    return null;
  }
}

export const supabase: SupabaseClient | null = createSafeSupabaseClient();

export interface SupabaseConnectionStatus {
  clientInitialized: boolean;
  configured: boolean;
  connected: boolean;
  status: 'connected' | 'not-connected';
  message: string;
  url?: string;
  latencyMs?: number;
  testedAt?: string;
  tableExists?: boolean;
}

/**
 * Performs a real connection test using the Supabase API.
 * Uses /auth/v1/health & /auth/v1/settings which support modern sb_publishable_... keys.
 * Also checks table status.
 */
export async function testSupabaseConnection(
  customUrl?: string,
  customKey?: string
): Promise<SupabaseConnectionStatus> {
  const testedAt = new Date().toLocaleTimeString();

  const targetUrl = sanitizeSupabaseUrl(customUrl || getRawUrl());
  const targetKey = sanitizeAnonKey(customKey || getRawAnonKey());

  // Check 1: Client initialization & configuration
  if (!targetUrl || !targetKey) {
    const rawUrl = customUrl || getRawUrl();
    let reason = 'Environment variables missing in .env.local.';
    if (rawUrl && !targetUrl) {
      reason = `Invalid Supabase URL format ("${rawUrl}"). Must be like https://xyz.supabase.co.`;
    } else if (targetUrl && !targetKey) {
      reason = 'Supabase Anon Key is missing or invalid.';
    }

    return {
      clientInitialized: false,
      configured: false,
      connected: false,
      status: 'not-connected',
      message: `${reason} Please check your .env.local or settings.`,
      url: targetUrl || rawUrl || 'Not configured',
      testedAt
    };
  }

  const startTime = Date.now();

  try {
    // Check 2: Modern Supabase projects with sb_publishable keys authenticate via /auth/v1/health or /auth/v1/settings
    // We check /auth/v1/health first, then /auth/v1/settings
    const healthPromise = fetch(`${targetUrl}/auth/v1/health`, {
      method: 'GET',
      headers: {
        apikey: targetKey,
        Authorization: `Bearer ${targetKey}`
      }
    }).catch(() => null);

    const settingsPromise = fetch(`${targetUrl}/auth/v1/settings`, {
      method: 'GET',
      headers: {
        apikey: targetKey,
        Authorization: `Bearer ${targetKey}`
      }
    }).catch(() => null);

    const [healthRes, settingsRes] = await Promise.all([healthPromise, settingsPromise]);
    const latencyMs = Date.now() - startTime;

    const isAuthHealthy = healthRes && healthRes.ok;
    const isSettingsAccessible = settingsRes && settingsRes.ok;

    if (isAuthHealthy || isSettingsAccessible) {
      // Check if products table exists
      let tableExists = false;
      try {
        const client = customUrl || customKey ? createClient(targetUrl, targetKey) : supabase;
        if (client) {
          const { error } = await client.from('products').select('id').limit(1);
          if (!error || error.code !== 'PGRST205') {
            tableExists = true;
          }
        }
      } catch {
        tableExists = false;
      }

      return {
        clientInitialized: true,
        configured: true,
        connected: true,
        status: 'connected',
        message: `Connected successfully! Supabase project is active and responding (${latencyMs}ms).`,
        url: targetUrl,
        latencyMs,
        testedAt,
        tableExists
      };
    }

    // If both failed, try REST v1 root as fallback
    const restRes = await fetch(`${targetUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        apikey: targetKey,
        Authorization: `Bearer ${targetKey}`
      }
    }).catch(() => null);

    if (restRes && (restRes.ok || restRes.status === 200 || restRes.status === 404)) {
      return {
        clientInitialized: true,
        configured: true,
        connected: true,
        status: 'connected',
        message: `Connected successfully! Supabase REST API responded in ${latencyMs}ms.`,
        url: targetUrl,
        latencyMs,
        testedAt
      };
    }

    if (restRes && (restRes.status === 401 || restRes.status === 403)) {
      const body = await restRes.json().catch(() => null);
      return {
        clientInitialized: true,
        configured: true,
        connected: false,
        status: 'not-connected',
        message: body?.message || `Authentication failed (HTTP ${restRes.status}). Verify your Publishable / Anon Key.`,
        url: targetUrl,
        latencyMs,
        testedAt
      };
    }

    return {
      clientInitialized: true,
      configured: true,
      connected: false,
      status: 'not-connected',
      message: `Failed to connect. HTTP Status: ${healthRes?.status || restRes?.status || 'Unknown'}. Verify your project URL.`,
      url: targetUrl,
      latencyMs,
      testedAt
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return {
      clientInitialized: true,
      configured: true,
      connected: false,
      status: 'not-connected',
      message: `Failed to reach Supabase server (${err?.message || 'Network fetch error'}). Verify your Project URL.`,
      url: targetUrl,
      latencyMs,
      testedAt
    };
  }
}

/**
 * Helper to save credentials locally in browser for quick dev testing
 */
export function saveDevSupabaseCredentials(url: string, key: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('clickbarry_supabase_url', url.trim());
    localStorage.setItem('clickbarry_supabase_anon_key', key.trim());
  }
}
