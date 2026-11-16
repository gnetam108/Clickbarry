export type PageId =
  | 'home'
  | 'marketplace'
  | 'dashboard'
  | 'admin'
  | 'how-it-works'
  | 'directory'
  | 'guarantee'
  | 'sellers'
  | 'affiliates'
  | 'about'
  | 'contact'
  | 'login'
  | 'signup';

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
  commissionRate: number; // e.g. 40%
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
  status: 'pending' | 'verified' | 'paid' | 'disputed';
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
  amount: number;
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
// PHASE 6: SUPER ADMIN & PLATFORM MANAGEMENT TYPES
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
  subscriptionStatus: 'active' | 'none' | 'pending';
  subscriptionPrice?: number;
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
  targetType: 'user' | 'seller' | 'affiliate' | 'product' | 'withdrawal' | 'settings' | 'category' | 'security';
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
  sellerSubscriptionPrice: number;
  platformFeePercentage: number;
  featuredProductIds: string[];
  bannerAnnouncement?: string;
  isRegistrationOpen: boolean;
  isMaintenanceMode: boolean;
  updatedAt: string;
}

export type DateFilterPeriod = 'today' | '7d' | '30d' | 'this_month' | 'this_year' | 'custom' | 'all';

export interface FinancialReconciliationReport {
  period: string;
  sellerSubscriptionRevenue: number; // ₹999 * paid sellers (Direct ClickBarry revenue)
  platformFees: number; // Fees on seller transactions if configured
  verifiedSellerCommission: number; // Total commissions earned by affiliates from verified sellers
  externalNetworkCommission: number; // Reported for Amazon/ClickBank (NOT ClickBarry controlled funds)
  totalAffiliateWithdrawalRequests: number; // Total volume requested
  actualAffiliatePayouts: number; // Paid volume (settled by Admin with UTR)
  pendingWithdrawalsVolume: number; // Pending/Processing volume
  refundsAndReversals: number; // Reversals
  actualPlatformNetRevenue: number; // Net revenue retained by ClickBarry
  reconciliationStatus: 'balanced' | 'discrepancy';
}

// ============================================================================
// PAYU LIFETIME SELLER MEMBERSHIP (₹999) TYPES
// ============================================================================

export interface SellerMembershipPayment {
  id: string;
  sellerId: string;
  sellerEmail: string;
  sellerName?: string;
  txnid: string;
  payuId?: string; // mihpayid
  amount: number; // 999.00
  currency: string;
  status: 'pending' | 'success' | 'failed' | 'cancelled';
  paymentMode?: string;
  bankRefNum?: string;
  hashVerified: boolean;
  membershipActivatedAt?: string;
  createdAt: string;
  updatedAt?: string;
}



