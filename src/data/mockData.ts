import { Product, Seller, Testimonial } from '../types';
import rajeshAvatar from '../assets/images/seller_rajesh_avatar_1794019709871.jpg';

export const SAMPLE_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    title: 'Ultimate Notion Creator & Business OS',
    sellerName: 'Rajesh Kumar Studio',
    sellerVerified: true,
    category: 'templates',
    categoryLabel: 'Notion Template',
    price: 499,
    originalPrice: 1999,
    commissionRate: 50,
    rating: 4.9,
    reviewsCount: 142,
    salesCount: 890,
    views: 3420,
    clicks: 684,
    originalUrl: 'https://notion.so/templates/creator-business-os-clickbarry-demo',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
    description: 'A complete operating system for digital creators, freelancers, and agency owners with task management, CRM, finance tracker, and content scheduler.',
    features: ['50+ Pre-built databases', 'Automated client invoicing', 'Social media calendar', 'Lifetime updates included'],
    fileFormat: 'Notion Template Link',
    isDemo: true,
    createdAt: '2026-02-15'
  },
  {
    id: 'prod-2',
    title: 'Next.js 15 & Tailwind SaaS Boilerplate',
    sellerName: 'DevSprint Labs',
    sellerVerified: true,
    category: 'software',
    categoryLabel: 'Source Code',
    price: 1499,
    originalPrice: 4999,
    commissionRate: 35,
    rating: 4.95,
    reviewsCount: 88,
    salesCount: 412,
    views: 2150,
    clicks: 387,
    originalUrl: 'https://github.com/clickbarry-demo/nextjs-saas-starter',
    image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80',
    description: 'Production-ready fullstack SaaS starter kit with Auth, Stripe/Razorpay integration, PostgreSQL schema, email dispatch, and responsive landing page.',
    features: ['Next.js 15 App Router', 'Tailwind CSS v4', 'Authentication ready', 'Clean TypeScript code'],
    fileFormat: 'GitHub Repo + ZIP',
    isDemo: true,
    createdAt: '2026-02-28'
  },
  {
    id: 'prod-3',
    title: '5,000+ Viral Canva Reels & Carousel Templates',
    sellerName: 'PixelMagic Design',
    sellerVerified: true,
    category: 'graphics',
    categoryLabel: 'Graphic Design',
    price: 399,
    originalPrice: 1499,
    commissionRate: 60,
    rating: 4.8,
    reviewsCount: 230,
    salesCount: 1450,
    views: 4890,
    clicks: 1220,
    originalUrl: 'https://canva.com/templates/social-creator-pack-clickbarry-demo',
    image: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=600&q=80',
    description: 'Boost your Instagram, YouTube Shorts, and LinkedIn growth with plug-and-play customizable Canva templates designed for high engagement.',
    features: ['Fully editable in Free Canva', 'Niche-specific packs included', 'Royalty-free audio ideas', 'One-click brand color apply'],
    fileFormat: 'Canva Template Links',
    isDemo: true,
    createdAt: '2026-01-10'
  },
  {
    id: 'prod-4',
    title: 'Zero to ₹1 Lakh/Month Freelancing Playbook',
    sellerName: 'Ananya Sharma',
    sellerVerified: true,
    category: 'ebooks',
    categoryLabel: 'E-Book & Guide',
    price: 299,
    originalPrice: 999,
    commissionRate: 50,
    rating: 4.9,
    reviewsCount: 95,
    salesCount: 620,
    views: 1840,
    clicks: 440,
    originalUrl: 'https://gumroad.com/l/freelance-playbook-clickbarry-demo',
    image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
    description: 'Step-by-step master roadmap covering cold outreach email scripts, high-ticket proposal templates, international payment setup, and portfolio blueprints.',
    features: ['120-Page PDF with real case studies', '15 High-converting email scripts', 'Contract agreement templates', 'Portfolio checklist'],
    fileFormat: 'PDF + Google Docs',
    isDemo: true,
    createdAt: '2026-03-01'
  },
  {
    id: 'prod-5',
    title: 'E-Commerce Dropshipping Masterclass 2026',
    sellerName: 'Vikas Growth Media',
    sellerVerified: true,
    category: 'courses',
    categoryLabel: 'Video Course',
    price: 999,
    originalPrice: 3999,
    commissionRate: 40,
    rating: 4.85,
    reviewsCount: 164,
    salesCount: 780,
    views: 2600,
    clicks: 520,
    originalUrl: 'https://courses.clickbarry-demo.com/dropshipping-mastery',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80',
    description: 'Comprehensive 8-hour HD video course covering winning product research, Meta & Google Ad campaigns, supplier agreements, and shipping logistics in India.',
    features: ['8 Hours on-demand HD video', 'Supplier contact database', 'Private student community', 'Certificate of completion'],
    fileFormat: 'Video Access Portal',
    isDemo: true,
    createdAt: '2026-02-05'
  },
  {
    id: 'prod-6',
    title: 'AI Prompts Vault: 2,500+ ChatGPT & Midjourney Recipes',
    sellerName: 'PromptCraft AI',
    sellerVerified: false,
    category: 'templates',
    categoryLabel: 'Prompt Library',
    price: 199,
    originalPrice: 799,
    commissionRate: 50,
    rating: 4.75,
    reviewsCount: 52,
    salesCount: 340,
    views: 1250,
    clicks: 290,
    originalUrl: 'https://notion.so/templates/ai-prompts-vault-clickbarry-demo',
    image: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=600&q=80',
    description: 'Curated library of tested prompts for copywriters, marketers, designers, and software engineers to save 20+ hours every week.',
    features: ['Spreadsheet & Notion database', 'Midjourney v6 styles cheat sheet', 'SEO blogging workflows', 'Copywriting frameworks'],
    fileFormat: 'Notion + Google Sheet',
    isDemo: true,
    createdAt: '2026-03-12'
  }
];

export const SAMPLE_SELLERS: Seller[] = [
  {
    id: 'seller-1',
    name: 'Rajesh Kumar',
    brand: 'Rajesh Kumar Studio',
    avatar: rajeshAvatar,
    bio: 'Digital creator and productivity architect helping solopreneurs build automated systems.',
    category: 'Productivity & Notion Systems',
    totalProducts: 8,
    rating: 4.9,
    joinedYear: '2025',
    verified: true,
    featuredProduct: 'Ultimate Notion Creator & Business OS'
  },
  {
    id: 'seller-2',
    name: 'Pooja Verma',
    brand: 'PixelMagic Design',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
    bio: 'Senior UI/UX designer delivering viral visual assets and social media kits.',
    category: 'Graphics & Canva Templates',
    totalProducts: 14,
    rating: 4.85,
    joinedYear: '2025',
    verified: true,
    featuredProduct: '5,000+ Viral Canva Reels & Carousel Templates'
  },
  {
    id: 'seller-3',
    name: 'Arjun Mehta',
    brand: 'DevSprint Labs',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    bio: 'Fullstack developer building open-source boilerplates and developer micro-tools.',
    category: 'Web Dev & Software',
    totalProducts: 5,
    rating: 4.95,
    joinedYear: '2026',
    verified: true,
    featuredProduct: 'Next.js 15 & Tailwind SaaS Boilerplate'
  },
  {
    id: 'seller-4',
    name: 'Ananya Sharma',
    brand: 'Freelance Growth Hub',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80',
    bio: 'Career mentor and author of top-rated digital freelancing guides in India.',
    category: 'Career & E-Books',
    totalProducts: 6,
    rating: 4.9,
    joinedYear: '2025',
    verified: true,
    featuredProduct: 'Zero to ₹1 Lakh/Month Freelancing Playbook'
  }
];

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
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    content: 'Earned over ₹42,000 in commissions in my very first month promoting digital templates on WhatsApp and Telegram!',
    rating: 5,
    location: 'Ahmedabad, India'
  },
  {
    id: 't-3',
    name: 'Neha Roy',
    role: 'Digital Product Creator',
    type: 'seller',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    content: 'The ₹999 lifetime access is pure gold. Zero recurring monthly cuts and the refund guarantee gave me complete confidence.',
    rating: 5,
    location: 'Pune, India'
  }
];

export const FAQS = [
  {
    q: 'How does the ₹999 Lifetime Seller Access work?',
    a: 'You make a one-time payment of ₹999 with zero recurring monthly subscription fees. You get full access to list unlimited digital products, access the seller analytics dashboard, and let affiliates promote your products.'
  },
  {
    q: 'What is the ClickBarry Refund Policy?',
    a: 'We stand behind our creators with our 100% Peace of Mind policy. If you list your products on ClickBarry and receive fewer than 5 sales within 1 month, you are eligible to claim a full refund within 30 days of purchase.'
  },
  {
    q: 'How do affiliates get paid?',
    a: 'Affiliates receive automatic commission payouts directly to their linked Indian Bank Account or UPI ID every Tuesday with low minimum threshold.'
  },
  {
    q: 'What kinds of products can I sell on ClickBarry?',
    a: 'ClickBarry is built for all digital assets: Notion templates, e-books, spreadsheets, graphic kits, UI designs, code scripts, software plugins, prompt libraries, and online courses.'
  }
];
