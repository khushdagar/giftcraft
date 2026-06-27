// Vendors extracted from the GiftCraft Vendor Master PDF (Vendors tab, V001–V043).
// V001–V006: onboarded Delhi packaging suppliers (with contacts).
// V007–V043: suggested brand / manufacturer / service suppliers — status "To Approach".

export type SeedVendor = {
  code: string;
  name: string;
  type: string;
  productsServices: string;
  contactName?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  city?: string;
  state?: string;
  address?: string;
  paymentTerms?: string;
  qualityRating?: number;
  reliabilityRating?: number;
  onboardingStatus: string;
  gstKycReceived?: boolean;
  bankDetailsReceived?: boolean;
  agreementSigned?: boolean;
  samplesReceived?: boolean;
  notes?: string;
};

export const VENDOR_SEED: SeedVendor[] = [
  {
    code: 'V001',
    name: 'SR Box Makers',
    type: 'Packaging - Boxes',
    productsServices: 'All Types of Boxes.',
    contactName: 'Sumit Dhingra',
    email: 'srboxmakers@gmail.com',
    phone: '9268196180, 9818018582',
    whatsapp: '9268196180',
    city: 'Delhi',
    state: 'DL',
    address: '1066, Bahadurgarh Road, Sadar Bazar, Delhi-100006',
    paymentTerms: '50% Advance',
    qualityRating: 4,
    reliabilityRating: 5,
    onboardingStatus: 'onboarded',
    gstKycReceived: true,
    samplesReceived: true,
    notes: 'Very polite and cooperative. Used in Roblox Women\'s Day event for 30 flower-printed boxes.',
  },
  {
    code: 'V002',
    name: 'Thareja Box Makers',
    type: 'Packaging - Bags',
    productsServices: 'Jute bags, paper bags.',
    contactName: 'Sarvesh Thareja',
    email: 'sarvesh.thareja@gmail.com',
    phone: '9810622242, 9810183466',
    whatsapp: '9810622242, 9810183466',
    city: 'Delhi',
    state: 'DL',
    address: '1184/1, opp saini market, bahadurgarh road, sadar bazar, delhi-10006',
    paymentTerms: '50% Advance',
    qualityRating: 4,
    reliabilityRating: 4,
    onboardingStatus: 'onboarded',
    gstKycReceived: true,
    samplesReceived: true,
    notes: 'Used in Roblox Women\'s Day event for 100 small jute bags.',
  },
  {
    code: 'V003',
    name: 'Taneja Creations',
    type: 'Packaging - Boxes',
    productsServices: 'All Types of Boxes.',
    contactName: 'Arjun Taneja',
    email: 'taneja.creations1@gmail.com',
    phone: '8750110061, 9971837246',
    whatsapp: '8750110061, 9971837246',
    city: 'Delhi',
    state: 'DL',
    address: '3009A, Bahadurgarh Road, Sadar Bazar, Delhi-10006',
    paymentTerms: '50% Advance',
    onboardingStatus: 'onboarded',
    gstKycReceived: true,
    samplesReceived: true,
  },
  {
    code: 'V004',
    name: 'Taneja Creations',
    type: 'Packaging - Bags',
    productsServices: 'Jute bags, paper bags.',
    contactName: 'Arjun Taneja',
    email: 'taneja.creations1@gmail.com',
    phone: '8750110061, 9971837246',
    whatsapp: '8750110061, 9971837246',
    city: 'Delhi',
    state: 'DL',
    address: '3009A, Bahadurgarh Road, Sadar Bazar, Delhi-10006',
    paymentTerms: '50% Advance',
    onboardingStatus: 'onboarded',
    gstKycReceived: true,
    samplesReceived: true,
  },
  {
    code: 'V005',
    name: 'Thareja Box Makers',
    type: 'Packaging - Boxes',
    productsServices: 'Jute bags, paper bags.',
    contactName: 'Sarvesh Thareja',
    email: 'sarvesh.thareja@gmail.com',
    phone: '9810622242, 9810183466',
    whatsapp: '9810622242, 9810183466',
    city: 'Delhi',
    state: 'DL',
    address: '1184/1, opp saini market, bahadurgarh road, sadar bazar, delhi-10006',
    paymentTerms: '50% Advance',
    onboardingStatus: 'onboarded',
    gstKycReceived: true,
    samplesReceived: true,
  },
  {
    code: 'V006',
    name: 'SR Box Makers',
    type: 'Packaging - Bags',
    productsServices: 'All Types of Boxes.',
    contactName: 'Sumit Dhingra',
    email: 'srboxmakers@gmail.com',
    phone: '9268196180, 9818018582',
    whatsapp: '9268196180',
    city: 'Delhi',
    state: 'DL',
    address: '1066, Bahadurgarh Road, Sadar Bazar, Delhi-100006',
    paymentTerms: '50% Advance',
    onboardingStatus: 'onboarded',
    gstKycReceived: true,
    samplesReceived: true,
  },
  { code: 'V007', name: 'Borosil', type: 'Brand - Drinkware', productsServices: 'Steel bottles, flasks, mugs, glassware', city: 'Mumbai', onboardingStatus: 'to_approach', notes: 'Suggested supplier — verify bulk B2B pricing, MOQ & lead time' },
  { code: 'V008', name: 'Milton / Cello', type: 'Brand - Drinkware', productsServices: 'Steel bottles, tumblers, flasks', city: 'Mumbai / Daman', onboardingStatus: 'to_approach', notes: 'Suggested supplier — verify bulk B2B pricing, MOQ & lead time' },
  { code: 'V009', name: 'Vaya', type: 'Brand - Drinkware', productsServices: 'Premium vacuum flasks & tumblers', city: 'Hyderabad', onboardingStatus: 'to_approach', notes: 'Suggested supplier — verify bulk B2B pricing, MOQ & lead time' },
  { code: 'V010', name: 'boAt', type: 'Brand - Tech', productsServices: 'Speakers, earbuds, power banks', city: 'Gurugram', onboardingStatus: 'to_approach', notes: 'Suggested supplier — verify bulk B2B pricing, MOQ & lead time' },
  { code: 'V011', name: 'Noise', type: 'Brand - Tech', productsServices: 'Earbuds, smart bands', city: 'Gurugram', onboardingStatus: 'to_approach', notes: 'Suggested supplier — verify bulk B2B pricing, MOQ & lead time' },
  { code: 'V012', name: 'JBL (Harman)', type: 'Brand - Tech', productsServices: 'Speakers, earbuds', city: 'Bengaluru', onboardingStatus: 'to_approach', notes: 'Suggested supplier — verify bulk B2B pricing, MOQ & lead time' },
  { code: 'V013', name: 'Ambrane / URBN', type: 'Brand - Tech', productsServices: 'Power banks, cables, chargers', city: 'New Delhi', onboardingStatus: 'to_approach', notes: 'Suggested supplier — verify bulk B2B pricing, MOQ & lead time' },
  { code: 'V014', name: 'Portronics', type: 'Brand - Tech', productsServices: 'Speakers, chargers, accessories', city: 'New Delhi', onboardingStatus: 'to_approach', notes: 'Suggested supplier — verify bulk B2B pricing, MOQ & lead time' },
  { code: 'V015', name: 'SanDisk / HP', type: 'Brand - Tech', productsServices: 'USB pen drives', onboardingStatus: 'to_approach', notes: 'Suggested supplier — verify bulk B2B pricing, MOQ & lead time' },
  { code: 'V016', name: 'Wildcraft', type: 'Brand - Bags', productsServices: 'Backpacks, laptop bags', city: 'Bengaluru', onboardingStatus: 'to_approach', notes: 'Suggested supplier — verify bulk B2B pricing, MOQ & lead time' },
  { code: 'V017', name: 'Arctic Fox', type: 'Brand - Bags', productsServices: 'Backpacks, messengers', city: 'Mumbai', onboardingStatus: 'to_approach', notes: 'Suggested supplier — verify bulk B2B pricing, MOQ & lead time' },
  { code: 'V018', name: 'DailyObjects', type: 'Brand - Bags/Tech', productsServices: 'Premium sleeves, backpacks, tech kits', city: 'New Delhi', onboardingStatus: 'to_approach', notes: 'Suggested supplier — verify bulk B2B pricing, MOQ & lead time' },
  { code: 'V019', name: 'Mokobara', type: 'Brand - Luggage', productsServices: 'Premium backpacks, trolleys', city: 'Bengaluru', onboardingStatus: 'to_approach', notes: 'Suggested supplier — verify bulk B2B pricing, MOQ & lead time' },
  { code: 'V020', name: 'Safari / American Tourister', type: 'Brand - Luggage', productsServices: 'Trolleys, cabin bags', city: 'Mumbai', onboardingStatus: 'to_approach', notes: 'Suggested supplier — verify bulk B2B pricing, MOQ & lead time' },
  { code: 'V021', name: 'Parker (Luxor)', type: 'Brand - Pens', productsServices: 'Executive pens', city: 'New Delhi', onboardingStatus: 'to_approach', notes: 'Suggested supplier — verify bulk B2B pricing, MOQ & lead time' },
  { code: 'V022', name: 'William Penn', type: 'Brand - Pens/Leather', productsServices: 'Luxury pens & leather', city: 'Bengaluru', onboardingStatus: 'to_approach', notes: 'Suggested supplier — verify bulk B2B pricing, MOQ & lead time' },
  { code: 'V023', name: 'Leather Talks', type: 'Brand - Leather', productsServices: 'Journals, folios, organizers, wallets', city: 'New Delhi', onboardingStatus: 'to_approach', notes: 'Suggested supplier — verify bulk B2B pricing, MOQ & lead time' },
  { code: 'V024', name: 'Tan & Able', type: 'Brand - Leather', productsServices: 'Wallets, belts, cardholders', onboardingStatus: 'to_approach', notes: 'Suggested supplier — verify bulk B2B pricing, MOQ & lead time' },
  { code: 'V025', name: 'Nightingale', type: 'Brand - Stationery', productsServices: 'Diaries, planners', city: 'Kolkata', onboardingStatus: 'to_approach', notes: 'Suggested supplier — verify bulk B2B pricing, MOQ & lead time' },
  { code: 'V026', name: 'VAHDAM', type: 'Brand - Gourmet', productsServices: 'Premium teas', city: 'New Delhi', onboardingStatus: 'to_approach', notes: 'Suggested supplier — verify bulk B2B pricing, MOQ & lead time' },
  { code: 'V027', name: 'Blue Tokai', type: 'Brand - Gourmet', productsServices: 'Specialty coffee', city: 'Gurugram', onboardingStatus: 'to_approach', notes: 'Suggested supplier — verify bulk B2B pricing, MOQ & lead time' },
  { code: 'V028', name: 'Sleepy Owl', type: 'Brand - Gourmet', productsServices: 'Coffee', city: 'New Delhi', onboardingStatus: 'to_approach', notes: 'Suggested supplier — verify bulk B2B pricing, MOQ & lead time' },
  { code: 'V029', name: '4700BC', type: 'Brand - Gourmet', productsServices: 'Gourmet popcorn', city: 'Gurugram', onboardingStatus: 'to_approach', notes: 'Suggested supplier — verify bulk B2B pricing, MOQ & lead time' },
  { code: 'V030', name: 'Happilo', type: 'Brand - Gourmet', productsServices: 'Dry fruits, nuts', city: 'Bengaluru', onboardingStatus: 'to_approach', notes: 'Suggested supplier — verify bulk B2B pricing, MOQ & lead time' },
  { code: 'V031', name: 'Farmley', type: 'Brand - Gourmet', productsServices: 'Flavored nuts, trail mix, hampers', city: 'Noida', onboardingStatus: 'to_approach', notes: 'Suggested supplier — verify bulk B2B pricing, MOQ & lead time' },
  { code: 'V032', name: 'Smoor', type: 'Brand - Gourmet', productsServices: 'Chocolates', city: 'Bengaluru', onboardingStatus: 'to_approach', notes: 'Suggested supplier — verify bulk B2B pricing, MOQ & lead time' },
  { code: 'V033', name: 'Paul & Mike', type: 'Brand - Gourmet', productsServices: 'Craft chocolate', city: 'Kochi', onboardingStatus: 'to_approach', notes: 'Suggested supplier — verify bulk B2B pricing, MOQ & lead time' },
  { code: 'V034', name: 'Bombay Shaving Company', type: 'Brand - Wellness', productsServices: 'Grooming kits', city: 'Gurugram', onboardingStatus: 'to_approach', notes: 'Suggested supplier — verify bulk B2B pricing, MOQ & lead time' },
  { code: 'V035', name: 'Forest Essentials', type: 'Brand - Wellness', productsServices: 'Luxury ayurvedic skincare', city: 'New Delhi', onboardingStatus: 'to_approach', notes: 'Suggested supplier — verify bulk B2B pricing, MOQ & lead time' },
  { code: 'V036', name: 'Plum', type: 'Brand - Wellness', productsServices: 'Skincare & bath sets', city: 'Mumbai', onboardingStatus: 'to_approach', notes: 'Suggested supplier — verify bulk B2B pricing, MOQ & lead time' },
  { code: 'V037', name: 'Boldfit', type: 'Brand - Wellness', productsServices: 'Fitness, yoga mats', city: 'Bengaluru', onboardingStatus: 'to_approach', notes: 'Suggested supplier — verify bulk B2B pricing, MOQ & lead time' },
  { code: 'V038', name: 'Tiruppur Apparel OEM', type: 'Manufacturer - Apparel', productsServices: 'Polos, tees, hoodies, caps, shirts', city: 'Tiruppur', onboardingStatus: 'to_approach', notes: 'Suggested supplier — verify bulk B2B pricing, MOQ & lead time' },
  { code: 'V039', name: 'Drinkware OEM (import/MOQ)', type: 'Manufacturer - Drinkware', productsServices: 'OEM steel bottles, mugs, tumblers', city: 'Mumbai', onboardingStatus: 'to_approach', notes: 'Suggested supplier — verify bulk B2B pricing, MOQ & lead time' },
  { code: 'V040', name: 'Eco OEM', type: 'Manufacturer - Eco', productsServices: 'Jute/cotton totes, bamboo, cork, seed paper', city: 'Jaipur / Delhi', onboardingStatus: 'to_approach', notes: 'Suggested supplier — verify bulk B2B pricing, MOQ & lead time' },
  { code: 'V041', name: 'Leather OEM', type: 'Manufacturer - Leather', productsServices: 'OEM wallets, folios, organizers', city: 'Kanpur / Delhi', onboardingStatus: 'to_approach', notes: 'Suggested supplier — verify bulk B2B pricing, MOQ & lead time' },
  { code: 'V042', name: 'Recognition OEM', type: 'Manufacturer - Recognition', productsServices: 'Trophies, mementos, name plates', city: 'Moradabad / Delhi', onboardingStatus: 'to_approach', notes: 'Suggested supplier — verify bulk B2B pricing, MOQ & lead time' },
  { code: 'V043', name: 'Xoxoday / Qwikcilver', type: 'Service - Gift Cards', productsServices: 'Multi-brand e-gift cards', city: 'Bengaluru', onboardingStatus: 'to_approach', notes: 'Suggested supplier — verify bulk B2B pricing, MOQ & lead time' },
];
