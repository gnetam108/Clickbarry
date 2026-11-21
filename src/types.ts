export type UserRole = 'affiliate' | 'seller' | 'admin';

export type MembershipStatus = 'none' | 'pending' | 'active' | 'failed' | 'refunded' | 'expired';

export type PageId =
  | 'home'
  | 'marketplace'
  | 'product-detail'
  | 'affiliate'
  | 'affiliate-auth'
  | 'affiliate-dashboard'
  | 'seller'
  | 'seller-auth'
  | 'seller-dashboard'
  | 'login'
  | 'signup'
  | 'admin-login'
  | 'admincore'
  | 'dashboard'
  | 'admin'
  | 'how-it-works'
  | 'directory'
  | 'guarantee'
  | 'sellers'
  | 'affiliates'
  | 'about'
  | 'contact';

export interface Product {
  id: string;
  title: string;
  sellerName: string;
  sellerAvatar?: string;
  sellerVerified: boolean;
  category: 'templates' | 'courses' | 'software' | 'ebooks' | 'graphics';
  categoryLabel: string;
  price: number;
  originalPrice: number;
  commissionRate: number; // 30% - 100% (max net-safe depends on seller platform fee)
  rating: number;
  reviewsCount: number;
  salesCount: number;
  views: number;
  clicks: number;
  originalUrl: string;
  image: string;
  description: string;
  features: string[];
  fileFormat: string;
  isDemo?: boolean;
  createdAt?: string;
  sellerId?: string;
  affiliateId?: string;
  merchantName?: string;
  affiliateUrl?: string;
  merchantWebsite?: string;
  networkName?: string;
  networkId?: 'amazon' | 'clickbank' | 'digistore24' | 'other' | string;
  isAdminProduct?: boolean;
  isExternalAffiliate?: boolean;
  approvalStatus?: 'approved' | 'pending' | 'rejected';
  status?: 'draft' | 'published' | 'approved' | 'pending' | 'rejected';
  isFeatured?: boolean;
  rejectionReason?: string;
  adminNotes?: string;
  updatedAt?: string;
  isRealDb?: boolean;
}

export type SupportedNetworkId = 'amazon' | 'clickbank' | 'digistore24' | 'other';

export interface ExternalNetwork {
  id: SupportedNetworkId | string;
  name: string;
  logoUrl?: string;
  subidParam: string;
  requiresExternalReporting: boolean;
  description?: string;
}

export interface ExternalAffiliateProduct {
  id: string;
  affiliateId: string;
  title: string;
  imageUrl: string;
  description: string;
  price: number;
  networkName: string;
  networkId: SupportedNetworkId | string;
  affiliateProductUrl: string;
  commissionRate: number;
  category: 'templates' | 'courses' | 'software' | 'ebooks' | 'graphics';
  isAdminProduct: boolean;
  status: 'published' | 'draft' | 'archived';
  clicksCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AffiliateLink {
  id: string;
  affiliateId: string;
  productId?: string;
  externalProductId?: string;
  uniqueTrackingSlug: string;
  customSubid?: string;
  targetUrl: string;
  productTitle: string;
  productPrice: number;
  commissionRate: number;
  networkName: string;
  clicksCount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface AffiliateClick {
  id: string;
  trackingId: string;
  affiliateId?: string;
  productId?: string;
  externalProductId?: string;
  networkName: string;
  destinationUrl: string;
  referrer?: string;
  createdAt: string;
}

export interface CommissionRecord {
  id: string;
  affiliateId: string;
  productId?: string;
  externalProductId?: string;
  orderReference: string;
  saleAmount: number;
  commissionAmount: number;
  networkName: string;
  verificationSource: 'seller_confirmed' | 'network_api' | 'manual_admin';
  status: 'pending' | 'verified' | 'paid' | 'disputed' | 'rejected';
  paidAt?: string;
  notes?: string;
  createdAt: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export interface Seller {
  id: string;
  name: string;
  brand: string;
  avatar: string;
  bio: string;
  category: string;
  totalProducts: number;
  rating: number;
  joinedYear: string;
  verified: boolean;
  featuredProduct: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  type: 'seller' | 'affiliate' | 'buyer';
  avatar: string;
  content: string;
  rating: number;
  location: string;
}

export type WithdrawalStatus = 'pending' | 'approved' | 'processing' | 'paid' | 'rejected' | 'cancelled';

export interface WithdrawalRequest {
  id: string;
  requestNumber: string;
  affiliateId: string;
  affiliateEmail?: string;
  affiliateName?: string;
  amount: number; // Gross amount deducted from Affiliate wallet
  platformFeePct: number; // Default 5%
  platformFeeAmount: number; // 0.05 * amount
  netPayableAmount: number; // 0.95 * amount transferred to Affiliate
  paymentMethod: 'upi' | 'bank_transfer';
  upiId?: string;
  accountHolderName?: string;
  bankAccountNumber?: string;
  ifscCode?: string;
  bankName?: string;
  status: WithdrawalStatus;
  adminRemarks?: string;
  rejectionReason?: string;
  transactionReference?: string; // UPI Ref or Bank UTR
  paymentProofUrl?: string;
  processedBy?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AffiliateWallet {
  affiliateId: string;
  totalApprovedEarnings: number;
  pendingCommission: number;
  reservedBalance: number;
  availableBalance: number;
  totalWithdrawn: number;
  totalPaid: number;
  lastUpdatedAt: string;
}

export type LedgerEntryType =
  | 'commission_approved'
  | 'commission_pending'
  | 'withdrawal_reserved'
  | 'withdrawal_released'
  | 'withdrawal_paid'
  | 'admin_adjustment';

export interface WalletLedgerEntry {
  id: string;
  affiliateId: string;
  entryType: LedgerEntryType;
  amount: number;
  balanceAfter: number;
  referenceType?: string;
  referenceId?: string;
  description: string;
  createdAt: string;
}

export interface PayoutSettings {
  minWithdrawalAmount: number;
  maxWithdrawalAmount: number;
  withdrawalFeePercentage: number; // Default 5%
  allowedPaymentMethods: ('upi' | 'bank_transfer')[];
  processingInfo: string;
  isWithdrawalsEnabled: boolean;
}

export interface WalletNotification {
  id: string;
  affiliateId: string;
  requestId: string;
  requestNumber: string;
  title: string;
  message: string;
  status: WithdrawalStatus;
  adminRemarks?: string;
  transactionReference?: string;
  createdAt: string;
  read: boolean;
}

// ============================================================================
// PHASE 6 & 9: SUPER ADMIN, PLATFORM FEES, REFERRALS & REPORTS TYPES
// ============================================================================

export type AdminRole = 'super_admin' | 'admin' | 'moderator';

export type UserStatus = 'active' | 'suspended';

export interface AdminUserRecord {
  id: string;
  email: string;
  fullName: string;
  role: 'seller' | 'affiliate' | 'admin' | 'both';
  adminRole?: AdminRole;
  status: UserStatus;
  sellerVerified: boolean;
  subscriptionStatus: MembershipStatus;
  subscriptionPrice?: number;
  referralCode?: string;
  referredBy?: string;
  totalProductsCount: number;
  totalClicksCount: number;
  totalSalesCount: number;
  totalEarnings: number;
  createdAt: string;
  lastActiveAt?: string;
  notes?: string;
}

export interface AdminAuditLog {
  id: string;
  adminEmail: string;
  action: string;
  targetType: 'user' | 'seller' | 'affiliate' | 'product' | 'withdrawal' | 'settings' | 'category' | 'security' | 'report' | 'referral';
  targetId: string;
  details: string;
  timestamp: string;
  ipAddress?: string;
}

export interface PlatformCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  iconName: string;
  imageUrl?: string;
  isActive: boolean;
  displayOrder: number;
  productCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface PlatformWebsiteSettings {
  siteName: string;
  tagline: string;
  logoUrl: string;
  faviconUrl: string;
  description: string;
  supportEmail: string;
  contactPhone: string;
  contactAddress: string;
  currency: string;
  currencySymbol: string;
  minWithdrawalAmount: number;
  maxWithdrawalAmount: number;
  withdrawalFeePercentage: number; // Default 5%
  sellerSubscriptionPrice: number; // ₹999
  platformFeePercentage: number; // Default 15% seller platform fee
  affiliateCommissionMin: number; // Default 30%
  affiliateCommissionMax: number; // Default 100%
  referralCommissionPercentage: number; // Default 10%
  sellerReferralBonus: number; // Default ₹100
  referralRevenueBasis: 'net_earnings' | 'platform_revenue';
  featuredProductIds: string[];
  bannerAnnouncement?: string;
  isRegistrationOpen: boolean;
  isMaintenanceMode: boolean;
  updatedAt: string;
}

export type DateFilterPeriod = 'today' | '7d' | '30d' | 'this_month' | 'this_year' | 'custom' | 'all';

export interface FinancialReconciliationReport {
  period: string;
  sellerSubscriptionRevenue: number; // ₹999 * paid active sellers
  sellerSaleFees: number; // 15% Seller sale fees
  affiliateWithdrawalFees: number; // 5% Affiliate withdrawal fees
  platformFees: number; // Total sellerSaleFees + affiliateWithdrawalFees
  referralEarnings: number; // Total approved/paid referral commissions + bonuses
  verifiedSellerCommission: number; // Total commissions earned by affiliates from verified sellers
  externalNetworkCommission: number; // External networks
  totalAffiliateWithdrawalRequests: number; // Gross volume requested
  actualAffiliatePayouts: number; // Net paid volume settled by Admin with UTR
  pendingWithdrawalsVolume: number; // Pending/Processing volume
  refundsAndReversals: number; // Reversals/Refunds
  actualPlatformNetRevenue: number; // Subscription + Platform Fees - Referral Payouts - Refunds
  reconciliationStatus: 'balanced' | 'discrepancy';
}

export interface SellerMembershipPayment {
  id: string;
  sellerId: string;
  sellerEmail: string;
  sellerName?: string;
  txnid: string;
  payuId?: string;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  amount: number; // 999.00
  currency: string;
  status: 'pending' | 'success' | 'failed' | 'cancelled' | 'refunded';
  paymentMode?: string;
  bankRefNum?: string;
  hashVerified: boolean;
  membershipActivatedAt?: string;
  refundedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SaleRecord {
  id: string;
  productId?: string;
  sellerId: string;
  affiliateId?: string;
  trackingSlug?: string;
  orderReference: string;
  buyerEmail?: string;
  saleAmount: number;
  affiliateCommissionRate: number;
  affiliateCommissionAmount: number;
  platformFeePct: number;
  platformFeeAmount: number;
  sellerNetAmount: number;
  status: 'pending' | 'verified' | 'refunded' | 'disputed';
  verifiedAt?: string;
  createdAt: string;
}

export interface PlatformFeeRecord {
  id: string;
  sourceType: 'seller_sale_fee' | 'affiliate_withdrawal_fee';
  referenceId: string;
  userId?: string;
  grossAmount: number;
  feePercentage: number;
  feeAmount: number;
  netAmount: number;
  notes?: string;
  createdAt: string;
}

export type ReferralBonusStatus = 'credited' | 'pending_pass' | 'failed_pass' | 'reversed' | 'not_applicable';

export interface ReferralRecord {
  id: string;
  referrerId: string;
  referrerName?: string;
  referrerEmail?: string;
  referrerCode?: string;
  referredUserId: string;
  referredEmail?: string;
  referredName?: string;
  referredRole?: UserRole;
  referredSubscriptionStatus?: MembershipStatus;
  referralCodeUsed: string;
  referralType: 'affiliate' | 'seller';
  status: 'pending' | 'active' | 'blocked';
  bonusStatus?: ReferralBonusStatus;
  bonusAmount?: number;
  lifetimeCommissionTotal?: number;
  blockReason?: string;
  createdAt: string;
}

export interface ReferralCommissionRecord {
  id: string;
  referrerId: string;
  referrerName?: string;
  referrerEmail?: string;
  referredUserId: string;
  referredName?: string;
  referredEmail?: string;
  referralId?: string;
  rewardType: 'one_time_bonus' | 'lifetime_commission';
  sourceType?: 'seller_pass' | 'affiliate_net_earning' | 'seller_net_earning' | 'manual_adjustment';
  sourceTransactionId?: string;
  grossReferenceAmount?: number;
  deductionsAmount?: number;
  baseAmount: number;
  commissionRate: number;
  rewardAmount: number;
  status: 'pending' | 'approved' | 'paid' | 'reversed';
  reversalReason?: string;
  reversedAt?: string;
  notes?: string;
  createdAt: string;
}

export interface ReferralFraudLogRecord {
  id: string;
  userId?: string;
  userEmail?: string;
  referrerId?: string;
  referrerEmail?: string;
  attemptedCode?: string;
  eventType:
    | 'self_referral_blocked'
    | 'duplicate_referral_blocked'
    | 'immutable_referrer_tamper'
    | 'invalid_referral_code'
    | 'suspended_referrer_blocked'
    | 'commission_reversed'
    | 'referral_blocked_by_admin'
    | 'rapid_referral_anomaly';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: string;
  resolved: boolean;
  createdAt: string;
}

export interface ProductReportRecord {
  id: string;
  productId: string;
  productTitle?: string;
  reporterId: string;
  reporterEmail?: string;
  reason: string;
  details?: string;
  status: 'open' | 'investigating' | 'resolved' | 'dismissed';
  adminNotes?: string;
  resolvedBy?: string;
  createdAt: string;
  updatedAt?: string;
}



