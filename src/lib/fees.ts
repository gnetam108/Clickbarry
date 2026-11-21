export interface SellerSaleBreakdown {
  price: number;
  affiliateCommissionRate: number;
  affiliateCommission: number;
  platformFeePct: number;
  platformFee: number;
  sellerNet: number;
  maxAllowedCommission: number;
  minAllowedCommission: number;
  isWithinBounds: boolean;
  hasNegativeSellerNet: boolean;
  isValid: boolean;
  validationError: string | null;
}

export interface WithdrawalFeeBreakdown {
  grossAmount: number;
  feePct: number;
  feeAmount: number;
  netPayable: number;
}

export interface SellerReferralRewardSummary {
  oneTimeBonusAmount: number;
  lifetimeCommissionAmount: number;
  totalRewardAmount: number;
  bonusEligible: boolean;
}

const round2 = (n: number): number => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/**
 * Computes Seller sale economics:
 * - Affiliate Commission = Price * (commissionRate / 100)
 * - Platform Fee = Price * (platformFeePct / 100) [default 15%]
 * - Seller Net = Price - Affiliate Commission - Platform Fee
 * Blocks commission rates < 30%, > 100%, or exceeding (100 - platformFeePct) which leave negative Seller net earnings.
 */
export const calculateSellerSaleBreakdown = (
  price: number,
  commissionRate: number,
  platformFeePct = 15,
  minCommission = 30,
  maxCommission = 100
): SellerSaleBreakdown => {
  const safePrice = Math.max(0, Number(price) || 0);
  const safeRate = Number(commissionRate) || 0;
  const safeFeePct = Math.max(0, Number(platformFeePct) || 0);
  const maxAllowedCommission = Math.max(0, round2(100 - safeFeePct));

  const affiliateCommission = round2(safePrice * (safeRate / 100));
  const platformFee = round2(safePrice * (safeFeePct / 100));
  const sellerNet = round2(safePrice - affiliateCommission - platformFee);

  const isWithinBounds = safeRate >= minCommission && safeRate <= maxCommission;
  const hasNegativeSellerNet = safeRate > maxAllowedCommission || sellerNet < -0.001;

  let validationError: string | null = null;
  if (safePrice <= 0) {
    validationError = 'Product price must be greater than ₹0.';
  } else if (safeRate < minCommission || safeRate > maxCommission) {
    validationError = `Affiliate commission must be between ${minCommission}% and ${maxCommission}%.`;
  } else if (hasNegativeSellerNet) {
    validationError =
      `${safeRate}% commission + ${safeFeePct}% ClickBarry Seller platform fee totals ${(safeRate + safeFeePct).toFixed(1)}% (>100%), resulting in negative Seller net earnings (₹${sellerNet.toFixed(2)}). Maximum allowed commission with a ${safeFeePct}% platform fee is ${maxAllowedCommission}%.`;
  }

  return {
    price: safePrice,
    affiliateCommissionRate: safeRate,
    affiliateCommission,
    platformFeePct: safeFeePct,
    platformFee,
    sellerNet,
    maxAllowedCommission,
    minAllowedCommission: minCommission,
    isWithinBounds,
    hasNegativeSellerNet,
    isValid: validationError === null,
    validationError
  };
};

/**
 * Computes Affiliate payout breakdown:
 * Gross Withdrawal Amount A -> 5% ClickBarry Fee (0.05 * A) -> Net Payable (0.95 * A)
 * Example: ₹1,000 -> ₹50 fee -> ₹950 net payable.
 */
export const calculateWithdrawalBreakdown = (
  grossAmount: number,
  withdrawalFeePct = 5
): WithdrawalFeeBreakdown => {
  const safeGross = Math.max(0, round2(Number(grossAmount) || 0));
  const safeFeePct = Math.max(0, Number(withdrawalFeePct) || 0);
  const feeAmount = round2(safeGross * (safeFeePct / 100));
  const netPayable = Math.max(0, round2(safeGross - feeAmount));

  return {
    grossAmount: safeGross,
    feePct: safeFeePct,
    feeAmount,
    netPayable
  };
};

export const REFERRAL_DISALLOWED_TX_STATUSES = [
  'failed',
  'refunded',
  'disputed',
  'rejected',
  'reversed',
  'cancelled'
] as const;

export const isDisallowedReferralTxStatus = (status?: string | null): boolean => {
  if (!status) return false;
  return (REFERRAL_DISALLOWED_TX_STATUSES as readonly string[]).includes(status.toLowerCase().trim());
};

/**
 * Computes Affiliate eligible NET earnings after platform withdrawal deduction (default 5%).
 * Referral commission is NEVER calculated on gross order/sale amount.
 */
export const calculateAffiliateNetEarnings = (
  grossCommission: number,
  withdrawalFeePct = 5
): number => {
  const safeGross = Math.max(0, Number(grossCommission) || 0);
  const safeFee = Math.max(0, Number(withdrawalFeePct) || 0);
  const deduction = round2(safeGross * (safeFee / 100));
  return Math.max(0, round2(safeGross - deduction));
};

/**
 * Computes lifetime referral commission (default 10%) strictly on eligible NET earnings.
 * Returns ₹0 for failed, refunded, disputed, rejected, reversed, or cancelled transactions.
 */
export const calculateAffiliateReferralReward = (
  netEarnings: number,
  referralPct = 10,
  transactionStatus = 'verified'
): number => {
  if (isDisallowedReferralTxStatus(transactionStatus)) return 0;
  const safeNet = Math.max(0, Number(netEarnings) || 0);
  const safePct = Math.max(0, Number(referralPct) || 0);
  return round2(safeNet * (safePct / 100));
};

/**
 * Computes Seller referral earnings:
 * - ₹100 one-time bonus credited ONLY when referred Seller's ₹999 Lifetime Pass is verified active
 * - 10% lifetime referral commission strictly on referred Seller's eligible NET earnings
 *   (after affiliate commission & 15% ClickBarry Seller fee — NEVER on gross sales)
 * - Returns ₹0 on failed, refunded, disputed, rejected, reversed, or cancelled transactions.
 */
export const calculateSellerReferralReward = (params: {
  isReferredSellerActive: boolean;
  sellerBonus?: number;
  sellerNetEarnings?: number;
  eligibleRevenue?: number;
  referralPct?: number;
  transactionStatus?: string;
  membershipStatus?: string;
}): SellerReferralRewardSummary => {
  const bonusAmount = params.sellerBonus ?? 100;
  const pct = params.referralPct ?? 10;
  const netRev = params.sellerNetEarnings ?? params.eligibleRevenue ?? 0;

  const membershipBad = isDisallowedReferralTxStatus(params.membershipStatus);
  const bonusEligible = Boolean(params.isReferredSellerActive) && !membershipBad;
  const oneTimeBonusAmount = bonusEligible ? round2(bonusAmount) : 0;
  const lifetimeCommissionAmount = calculateAffiliateReferralReward(
    netRev,
    pct,
    params.transactionStatus || 'verified'
  );

  return {
    oneTimeBonusAmount,
    lifetimeCommissionAmount,
    totalRewardAmount: round2(oneTimeBonusAmount + lifetimeCommissionAmount),
    bonusEligible
  };
};

/**
 * Prevents self-referral and duplicate referral binding.
 */
export const canBindReferral = (
  referrerId?: string | null,
  referredUserId?: string | null,
  existingReferredBy?: string | null
): boolean => {
  if (!referrerId || !referredUserId) return false;
  if (referrerId === referredUserId) return false;
  if (existingReferredBy) return false;
  return true;
};

export const isValidReferralCodeFormat = (code?: string | null): boolean => {
  if (!code) return false;
  return /^[A-Z0-9_-]{4,32}$/.test(code.trim().toUpperCase());
};

export const buildReferralUrl = (referralCode: string, origin?: string): string => {
  const cleanCode = referralCode.trim().toUpperCase();
  const defaultOrigin =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_PUBLIC_SITE_URL) ||
    'https://clickbarry.com';
  const base = (origin || defaultOrigin).replace(/\/+$/, '');
  return `${base}/?ref=${encodeURIComponent(cleanCode)}`;
};
