import { Testimonial } from '../types';
import rajeshAvatar from '../assets/images/seller_rajesh_avatar_1794019709871.jpg';
import sellerLaptopImage from '../assets/images/seller_dashboard_laptop_1794019709659.jpg';
import affiliateCoinsImage from '../assets/images/affiliate_coins_chart_1794019709558.jpg';

export const TESTIMONIALS: Testimonial[] = [
  {
    id: 't-1',
    name: 'Rajesh Kumar',
    role: 'Seller',
    type: 'seller',
    avatar: rajeshAvatar,
    content: 'ClickBarry is an amazing platform! Easy to use, trusted and really helpful.',
    rating: 5,
    location: 'Bengaluru, India'
  },
  {
    id: 't-2',
    name: 'Sunil Patel',
    role: 'Affiliate Marketer',
    type: 'affiliate',
    avatar: affiliateCoinsImage,
    content: 'Clean tracking links and transparent commission ledger make promoting creator digital products straightforward.',
    rating: 5,
    location: 'Ahmedabad, India'
  },
  {
    id: 't-3',
    name: 'Neha Roy',
    role: 'Digital Product Creator',
    type: 'seller',
    avatar: sellerLaptopImage,
    content: 'Listing once with ₹999 lifetime seller access and letting affiliates discover our catalog keeps growth simple.',
    rating: 5,
    location: 'Pune, India'
  }
];

export const FAQS = [
  {
    q: 'How does the ₹999 Lifetime Seller Access work?',
    a: 'You make a one-time payment of ₹999 with zero recurring monthly subscription fees. You get full access to list digital products, view seller analytics, and let affiliates promote your approved products.'
  },
  {
    q: 'Is Affiliate Registration completely free?',
    a: 'Yes! Affiliate registration, marketplace browsing, tracking link generation, and wallet access are 100% free forever with zero membership fees.'
  },
  {
    q: 'How are new Seller products approved?',
    a: 'All newly submitted Seller products enter an Admin review queue (Pending status) to ensure quality and safety before appearing publicly in the ClickBarry Marketplace.'
  },
  {
    q: 'How do affiliates get paid?',
    a: 'Affiliates submit withdrawal requests via UPI or Bank Transfer from their available approved commission balance. Admin reviews and settles payouts with a verified UTR/transaction reference.'
  }
];
