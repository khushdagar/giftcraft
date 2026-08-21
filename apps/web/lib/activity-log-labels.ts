/**
 * Plain-English wording for the admin Activity Log.
 *
 * The log is written straight off Prisma, so it speaks in model names and
 * operation names ("createMany on ProposalPack"). Nobody outside the dev team
 * reads that as a sentence. Everything here is presentation only — it maps the
 * stored jargon onto words an account manager can scan, and it works on rows
 * that were written long before this file existed.
 */

/** Model name → how a person would say it, singular and plural. */
const ENTITY_LABELS: Record<string, [one: string, many: string]> = {
  Product: ['product', 'products'],
  ProductVariant: ['product variant', 'product variants'],
  ProductImage: ['product image', 'product images'],
  ProductSlugHistory: ['product web address', 'product web addresses'],
  ProductPackItem: ['item inside a pack', 'items inside a pack'],
  ProductCategory: ['product category link', 'product category links'],
  ProductOccasion: ['product occasion tag', 'product occasion tags'],
  ProductVendor: ['product supplier link', 'product supplier links'],
  ProductHsn: ['product HSN code', 'product HSN codes'],
  PriceTier: ['price slab', 'price slabs'],
  HsnCode: ['HSN code', 'HSN codes'],
  Category: ['category', 'categories'],
  OccasionConfig: ['occasion', 'occasions'],
  GiftCollection: ['collection', 'collections'],
  GiftPack: ['gift pack', 'gift packs'],
  GiftPackItem: ['item inside a gift pack', 'items inside a gift pack'],
  BudgetBand: ['budget band', 'budget bands'],
  Packaging: ['packaging option', 'packaging options'],
  Addon: ['add-on', 'add-ons'],

  Order: ['order', 'orders'],
  OrderItem: ['order line', 'order lines'],
  OrderAddon: ['order add-on', 'order add-ons'],
  OrderRecipient: ['order recipient', 'order recipients'],
  OrderTimeline: ['order status update', 'order status updates'],
  OrderModification: ['order change request', 'order change requests'],
  OrderSlaLog: ['order SLA record', 'order SLA records'],
  ShipmentTracking: ['shipment tracking update', 'shipment tracking updates'],
  SampleOrder: ['sample order', 'sample orders'],

  Quote: ['quote', 'quotes'],
  Proposal: ['proposal', 'proposals'],
  ProposalPack: ['pack inside a proposal', 'packs inside a proposal'],
  ProposalDownload: ['proposal download', 'proposal downloads'],
  Enquiry: ['enquiry', 'enquiries'],
  ArtworkApproval: ['artwork approval', 'artwork approvals'],
  MockupTemplate: ['mockup template', 'mockup templates'],
  GeneratedMockup: ['generated mockup', 'generated mockups'],

  User: ['user', 'users'],
  Company: ['company', 'companies'],
  SavedAddress: ['saved address', 'saved addresses'],
  SavedPack: ['saved pack', 'saved packs'],
  SavedPackItem: ['item in a saved pack', 'items in a saved pack'],
  BrandAsset: ['brand asset', 'brand assets'],

  Vendor: ['vendor', 'vendors'],
  VendorPO: ['purchase order', 'purchase orders'],
  VendorPayment: ['vendor payment', 'vendor payments'],
  VendorPaymentDetails: ['vendor bank detail', 'vendor bank details'],
  VendorCommunication: ['vendor message', 'vendor messages'],
  VendorScore: ['vendor score', 'vendor scores'],

  Coupon: ['coupon', 'coupons'],
  GocCampaign: ['GOC campaign', 'GOC campaigns'],
  GocOption: ['GOC gift option', 'GOC gift options'],
  GocClaim: ['GOC claim', 'GOC claims'],
  AutomationRule: ['automation', 'automations'],
  GiftingSequence: ['gifting sequence', 'gifting sequences'],
  SequenceEnrollment: ['sequence enrolment', 'sequence enrolments'],

  HomepageBanner: ['homepage banner', 'homepage banners'],
  Testimonial: ['testimonial', 'testimonials'],
  Review: ['review', 'reviews'],
  BlogPost: ['blog post', 'blog posts'],
  BlogCategory: ['blog category', 'blog categories'],
  BlogComment: ['blog comment', 'blog comments'],
  UrlRedirect: ['URL redirect', 'URL redirects'],

  PlatformSetting: ['setting', 'settings'],
  ShippingZone: ['shipping zone', 'shipping zones'],
  InventoryStock: ['stock record', 'stock records'],
  InventoryMovement: ['stock movement', 'stock movements'],
  DisputeTicket: ['dispute', 'disputes'],
  CompanyWallet: ['company wallet', 'company wallets'],
  WalletTransaction: ['wallet transaction', 'wallet transactions'],
  GstEinvoice: ['GST e-invoice', 'GST e-invoices'],
  Reseller: ['reseller', 'resellers'],
  ResellerOrder: ['reseller order', 'reseller orders'],
  NotificationPreference: ['notification preference', 'notification preferences'],
  AdminNotificationRead: ['notification (marked read)', 'notifications (marked read)'],
  PushSubscription: ['push subscription', 'push subscriptions'],
  ConsentLog: ['consent record', 'consent records'],
  WhiteLabelStore: ['white-label store', 'white-label stores'],
  RoiOutcome: ['ROI record', 'ROI records'],
  GhlLeadStatus: ['lead status', 'lead statuses'],
};

/** "ProductPackItem" → "product pack item" when we have no entry for it. */
function fallbackEntity(entity: string): string {
  return entity
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .toLowerCase();
}

export function entityLabel(entity: string, plural = false): string {
  const pair = ENTITY_LABELS[entity];
  if (pair) return plural ? pair[1] : pair[0];
  const base = fallbackEntity(entity);
  return plural ? `${base}s` : base;
}

/** Prisma operation → the word shown on the badge. */
export function actionLabel(action: string): string {
  switch (action) {
    case 'create':
      return 'Added';
    case 'createMany':
      return 'Added several';
    case 'update':
      return 'Updated';
    case 'updateMany':
      return 'Updated several';
    case 'delete':
      return 'Deleted';
    case 'deleteMany':
      return 'Deleted several';
    default:
      return action;
  }
}

/**
 * The one-line summary shown in the table: "Added a URL redirect",
 * "Updated several price slabs". The record's own name is shown beside it.
 */
export function summarize(action: string, entity: string): string {
  const many = action.endsWith('Many');
  const noun = entityLabel(entity, many);
  switch (action) {
    case 'create':
      return `Added a ${noun}`;
    case 'createMany':
      return `Added ${noun}`;
    case 'update':
      return `Updated a ${noun}`;
    case 'updateMany':
      return `Updated ${noun}`;
    case 'delete':
      return `Deleted a ${noun}`;
    case 'deleteMany':
      return `Deleted ${noun}`;
    default:
      return `${actionLabel(action)} — ${noun}`;
  }
}

/**
 * Rows that are bookkeeping rather than a decision someone made: read receipts
 * on notifications, and the join/child tables Prisma writes as part of one save
 * in the admin UI (saving a product writes its images, tiers, categories…).
 * Hidden by default in the log so the meaningful entries stand out; the page has
 * a checkbox to bring them back.
 */
export const BEHIND_THE_SCENES_ENTITIES = [
  'AdminNotificationRead',
  'ProductSlugHistory',
  'ProductImage',
  'ProductCategory',
  'ProductOccasion',
  'ProductVendor',
  'ProductHsn',
  'ProductPackItem',
  'PriceTier',
  'ProductVariant',
  'GiftPackItem',
  'ProposalPack',
  'ProposalDownload',
  'OrderTimeline',
  'OrderSlaLog',
  'SavedPackItem',
  'ConsentLog',
];

/** Field name → the label the admin form uses for it. */
const FIELD_LABELS: Record<string, string> = {
  sku: 'SKU',
  hsnCode: 'HSN code',
  gstRate: 'GST rate',
  metaTitle: 'SEO title',
  metaDescription: 'SEO description',
  descriptionShort: 'Short description',
  descriptionLong: 'Full description',
  keyFeatures: 'Key features',
  shippingDelivery: 'Shipping & delivery',
  imageUrl: 'Image',
  imageUrls: 'Images',
  slug: 'Web address',
  sortOrder: 'Display order',
  isActive: 'Live',
  isFeatured: 'Featured',
  isPack: 'Is a pack',
  isCollection: 'Is a collection',
  statusCode: 'Redirect type',
  source: 'Old URL',
  destination: 'New URL',
  sellPrice: 'Selling price',
  costPrice: 'Cost price',
  basePrice: 'Base price',
  minPrice: 'From price',
  maxPrice: 'To price',
  minQty: 'Minimum quantity',
  maxQty: 'Maximum quantity',
  moq: 'Minimum order quantity',
  leadTimeDays: 'Lead time (days)',
  weightGrams: 'Weight (grams)',
  companyId: 'Company',
  vendorId: 'Vendor',
  productId: 'Product',
  orderId: 'Order',
  userId: 'User',
  categoryId: 'Category',
  occasionId: 'Occasion',
  createdAt: 'Created',
  updatedAt: 'Last edited',
  recipientTags: 'Recipient tags',
  paymentStatus: 'Payment status',
  orderNumber: 'Order number',
  trackingNumber: 'Tracking number',
};

export function fieldLabel(field: string): string {
  const known = FIELD_LABELS[field];
  if (known) return known;
  const words = field
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Fields nobody needs to read in a diff — noise on every single row. */
export const HIDDEN_FIELDS = new Set(['id', 'createdAt', 'updatedAt', 'searchVector']);

const MONEY_FIELDS =
  /(price|amount|total|subtotal|cost|fee|charge|value|balance|paid|refund)/i;
const CUID = /^c[a-z0-9]{20,}$/;

/** Turn a stored value into something readable in a table cell. */
export function formatValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '(empty)';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';

  if (field === 'statusCode' && typeof value === 'number') {
    if (value === 301) return 'Permanent (301)';
    if (value === 302) return 'Temporary (302)';
    if (value === 410) return 'Gone (410)';
  }

  if (typeof value === 'number') {
    return MONEY_FIELDS.test(field)
      ? `₹${value.toLocaleString('en-IN')}`
      : value.toLocaleString('en-IN');
  }

  if (typeof value === 'string') {
    // Money often arrives as a Prisma Decimal, already stringified.
    if (MONEY_FIELDS.test(field) && /^-?\d+(\.\d+)?$/.test(value)) {
      return `₹${Number(value).toLocaleString('en-IN')}`;
    }
    if (/^\d{4}-\d{2}-\d{2}T[\d:.]+Z?$/.test(value)) {
      return new Date(value).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Kolkata',
      });
    }
    // A raw database id tells the reader nothing — say so instead of showing it.
    if (CUID.test(value)) return 'internal reference';
    return value.length > 160 ? `${value.slice(0, 160)}…` : value;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return 'none';
    const simple = value.every((v) => typeof v === 'string' || typeof v === 'number');
    if (simple && value.length <= 8) return value.join(', ');
    return `${value.length} items`;
  }

  const json = JSON.stringify(value);
  return json.length > 160 ? `${json.slice(0, 160)}…` : json;
}
