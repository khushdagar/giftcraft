# ARCHITECTURE.md — GiftCraft Technical Blueprint

> Read CLAUDE.md first for business rules and tech stack.

## System Architecture

```
Customer Browser / Admin Browser
        |
        v
  Next.js 14 (App Router) — SSR + Client Components
  NextAuth Middleware (Session + Role Check)
        |
        v
  Express API Server (Node.js + TypeScript)
  Prisma ORM — Zod Validation — Role Guards
        |
   _____|_____________________
  |           |               |
  v           v               v
PostgreSQL   Redis          DO Spaces
(DO Managed) (DO Managed)  (File Storage + CDN)
             + BullMQ
             Job Queues
        |
        v
  Background Workers (BullMQ)
  PDF Gen | Email/WhatsApp | SLA Checker
        |
        v
  External: Razorpay | Shiprocket | SendGrid | Interakt
```

## Core Data Objects

### Product
Key fields: name, slug, brand, sku, dimensions (L/W/H cm), weight (grams), printingTechnique (enum), leadTimeDays, status (active/draft/archived/seasonal), isEcoCertified, isFeatured.
Relations: images[], variants[], tiers[] (6 tiers), categories[], occasions[], vendors[].
IMPORTANT: printingTechnique is on the Product, NOT on the Order. Admin locks it when creating. sellPrice in PriceTier INCLUDES branding cost.

### Category Taxonomy (3 Levels)
Self-referencing: Category has parentId. Level 1 (Drinkware), Level 2 (Insulated Bottles), Level 3 (500ml Steel).
Filtering: selecting L1 returns all products in L1 + all L2 + all L3 underneath.

### Order State Machine (12 Stages)
quote -> confirmed -> design_approval -> design_approved -> vendor_po -> production -> qc_ready -> qc_passed -> packed -> shipped -> delivered -> completed

Rules: only adjacent transitions. design_approval -> design_approved requires ArtworkApproval record. delivered -> completed auto after 48h. Stage 1 uses simplified 6 stages.

### Pricing Engine Flow
Input: products[], packagingId, addons[], deliveryPincode, totalQuantity, clientTier?, couponCode?
Process: (1) Tier lookup per product (sell price INCLUDES branding), (2) + packaging, (3) + add-ons, (4) + shipping by zone, (5) + GST per HSN (CGST/SGST or IGST), (6) - discounts, (7) + Razorpay fee (2% x 1.18)
Output: lineItems (NO branding line), gstBreakdown per HSN, razorpayFee (SEPARATE), grandTotal, perUnitCost

### GST Routing
pincodeToState(): first 2 digits -> state code. 11->DL, 12->HR, 40->MH, 56->KA, 60->TN, etc.
Seller state = DL. If delivery state = DL: CGST + SGST (rate/2 each). If different: IGST (full rate).
Different products can have different HSN codes/rates in same order -> separate GST lines.

## Database Schema Evolution

### Stage 1: Created and populated
Product, ProductImage, ProductVariant, PriceTier, ProductHsn, HsnCode, Category, ProductCategory, ProductOccasion, Packaging, Addon, Company, User, BrandAsset, Vendor, ProductVendor, Order, OrderItem, OrderAddon, OrderRecipient, OrderTimeline, Quote, PriceAuditLog, ShippingZone, Collection, CollectionProduct, HomepageBanner, Testimonial, OccasionConfig, Coupon, PlatformSetting

### Stage 1: Created but empty (populated later)
InventoryStock/Movement/ClientInventory (Stage 3), GocCampaign/Option/Claim (Stage 3), CompanyWallet/WalletTransaction (Stage 3), DisputeTicket/ArtworkApproval/OrderSlaLog (Stage 2), AutomationRule/NotificationPreference/ConsentLog (Stage 2), GstEinvoice/OrderModification (Stage 2), SampleOrder/Reseller/ResellerOrder (Stage 3), OccasionReminder/EcoMetric/RfqRequest/RfqBid (Stage 3), GiftingSequence/SequenceEnrollment/RoiOutcome (Stage 4), MockupTemplate/GeneratedMockup/WhiteLabelStore (Stage 4)

## Third-Party Integration Specs

### NextAuth.js + Google OAuth
Middleware checks NextAuth session. Roles stored in User.role column in PostgreSQL. Routes: /admin/* requires super_admin (checked from database). /dashboard/* requires any session. Catalog, products, quotes, approve, claim pages are public.

### Razorpay Payments
Flow: frontend calls POST /api/orders/initiate -> backend creates Razorpay order -> frontend opens Razorpay modal -> customer pays -> success callback with payment_id + signature -> POST /api/orders/verify-payment verifies HMAC signature -> creates order.
Webhook backup: POST /api/webhooks/razorpay. Verify signature. Idempotent (check payment_id uniqueness).
Fee: (total * 0.02) * 1.18 = ~2.36% effective. Shown as separate line.

### Shiprocket (Stage 2+)
Auth: POST /auth/login -> JWT cached in Redis 10 days.
Serviceability: GET /courier/serviceability?pincode=X&weight=Y.
Create shipment: POST /orders/create/adhoc with order details.
Webhook: delivery events mapped to order stages. "Delivered" -> auto-advance + 48h dispute timer.

### Digital Ocean Spaces
S3-compatible. Use @aws-sdk/client-s3 with DO endpoint. Bucket: giftcraft-{env}. CDN enabled.
Keys: products/{id}/image.jpg (public), invoices/{orderId}/invoice.pdf (pre-signed URL).

## Deployment
Stage 1: Single Digital Ocean Droplet (2 vCPU, 4GB) running Next.js + Express + BullMQ workers.
Stage 2+: Separate API droplet. DB read replica for analytics.
Stage 3+: App Platform with auto-scaling.
