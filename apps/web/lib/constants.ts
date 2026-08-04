export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli",
  "Daman and Diu",
  "Delhi",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

/**
 * Public contact details shown until an admin saves the `contact`
 * PlatformSetting (Admin → Settings → Contact). The phone/WhatsApp numbers are
 * deliberate placeholders — the real business line isn't live yet, and a
 * plausible-looking fake number is worse than an obvious blank, because
 * customers dial it. Every surface that shows a contact number falls back here,
 * so there is exactly one place to update when the real number arrives.
 */
export const PLACEHOLDER_PHONE = "XXXXXXXXXXXX";

export const CONTACT_FALLBACK = {
  email: "support@givoo.in",
  phone: PLACEHOLDER_PHONE,
  whatsapp: PLACEHOLDER_PHONE, // digits only elsewhere; used for wa.me links
};

export const DELIVERY_RATES = { single: 90, individual: 140 };

// GIVOO / Arts Shala is registered in Delhi. Per SOW, GST is split as
// CGST+SGST for same-state (Delhi) deliveries and IGST for other states.
// The buyer's state is derived from the delivery pincode at pricing time.
export const SELLER_STATE_CODE = "DL";

export const BOX_SIZE_THRESHOLDS = [
  { max: 2, label: "Small" },
  { max: 4, label: "Medium" },
  { max: 6, label: "Large" },
  { max: Infinity, label: "XL" },
];

export const TIER_LABELS = ["1–24", "25–49", "50–99", "100–249", "250–499", "500+"];

export const MAX_FREE_REVISIONS = 2;
export const REVISION_FEE_PERCENT = 5;

export const NEFT_DETAILS = {
  accountName: "Arts Shala Gifting Pvt. Ltd.",
  accountNumber: "XXXXXXXXXXXX",
  ifsc: "SBIN0001234",
  bankName: "State Bank of India",
};

export const SLA_MINUTES: Record<string, number> = {
  draft: 60,           // 1 hour
  quote_sent: 1440,    // 24 hours
  confirmed: 240,      // 4 hours
  mockup_pending: 2880, // 48 hours
  mockup_approved: 240, // 4 hours
  production: 7200,    // 5 days (120h)
  quality_check: 1440, // 24 hours
  packed: 1440,        // 24 hours
  shipped: 240,        // 4 hours
  in_transit: 4320,    // 3 days (72h)
  delivered: 2880,     // 48 hours
  completed: 0,        // terminal
  cancelled: 0,        // terminal
  refunded: 0,         // terminal
};
