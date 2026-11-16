import { AffiliateLink, ExternalAffiliateProduct, Product } from '../types';

/**
 * Validates whether a destination URL is safe to open/redirect.
 * Strictly requires http: or https: protocol and valid hostname.
 * Prevents javascript:, data:, or malformed open redirect exploits.
 */
export function validateSafeUrl(url: string | undefined): { isValid: boolean; sanitizedUrl: string | null; error?: string } {
  if (!url || typeof url !== 'string') {
    return { isValid: false, sanitizedUrl: null, error: 'Empty URL provided' };
  }

  let clean = url.trim();
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = 'https://' + clean;
  }

  try {
    const parsed = new URL(clean);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { isValid: false, sanitizedUrl: null, error: 'Only HTTP and HTTPS destinations are permitted' };
    }
    if (!parsed.hostname || parsed.hostname.length < 3 || !parsed.hostname.includes('.')) {
      return { isValid: false, sanitizedUrl: null, error: 'Invalid destination domain name' };
    }
    return { isValid: true, sanitizedUrl: parsed.href };
  } catch {
    return { isValid: false, sanitizedUrl: null, error: 'Malformed URL structure' };
  }
}

/**
 * Builds an authorized affiliate link with affiliate SubID/tracking tags.
 * Supports Amazon (tag=), ClickBank (tid=), Digistore24, and Seller Products.
 */
export function buildAffiliateUrl(
  destinationUrl: string,
  networkId: string,
  affiliateId: string,
  customSubid?: string
): string {
  const check = validateSafeUrl(destinationUrl);
  if (!check.isValid || !check.sanitizedUrl) {
    return destinationUrl;
  }

  try {
    const parsed = new URL(check.sanitizedUrl);
    const trackingTag = customSubid?.trim() || `cb_${affiliateId.substring(0, 8)}`;

    switch (networkId?.toLowerCase()) {
      case 'amazon':
        // Amazon uses ?tag=... if not already present
        if (!parsed.searchParams.has('tag')) {
          parsed.searchParams.set('tag', trackingTag);
        }
        break;

      case 'clickbank':
        // ClickBank uses ?tid=... for SubID
        parsed.searchParams.set('tid', trackingTag);
        break;

      case 'digistore24':
        // Digistore24 uses ?aff=... or subid
        parsed.searchParams.set('subid', trackingTag);
        break;

      default:
        // Generic / Marketplace / Direct Creator product
        parsed.searchParams.set('cb_ref', affiliateId.substring(0, 8));
        if (customSubid) {
          parsed.searchParams.set('cb_subid', customSubid);
        }
        break;
    }

    return parsed.href;
  } catch {
    return destinationUrl;
  }
}

/**
 * Generates a collision-resistant unique tracking slug for an affiliate link.
 */
export function generateTrackingSlug(affiliateId: string, productId: string): string {
  const affShort = (affiliateId || 'guest').substring(0, 6).toLowerCase().replace(/[^a-z0-9]/g, '');
  const prodShort = (productId || 'item').substring(0, 8).toLowerCase().replace(/[^a-z0-9]/g, '');
  const salt = Math.random().toString(36).substring(2, 6);
  return `cb_${affShort}_${prodShort}_${salt}`;
}
