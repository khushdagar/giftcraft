# GiftCraft Project Exploration Summary
**Date:** April 22, 2026 | **User:** software@rankingeek.com

---

## OVERVIEW

GiftCraft is India's first self-serve bulk corporate gifting platform. This document summarizes the complete codebase exploration, all requirements, architecture, and what needs to be built for **Sprint 2**.

---

## CURRENT PROJECT STATE

### ✅ SPRINT 1 - COMPLETED

All Sprint 1 deliverables are in place:

| Component | Status | Details |
|-----------|--------|---------|
| **Monorepo Setup** | ✅ | Turborepo with apps/web, apps/api, packages/types, packages/pricing |
| **Database** | ✅ | Prisma schema with 41+ models + NextAuth adapter tables |
| **Auth** | ✅ | NextAuth.js v5 + Google OAuth + role-based middleware |
| **Design System** | ✅ | Full Tailwind + Bento color palette (navy, block colors, grays) |
| **Layouts** | ✅ | Customer (navbar/footer/widget) + Admin (Shopify-style sidebar) |
| **Pages (Stubbed)** | ✅ | Homepage, Catalog, Product detail, Builder, Checkout, Dashboard, Admin |
| **API** | ✅ | Health endpoint + product creation endpoint with validation + audit logging |
| **NextAuth Adapter** | ✅ | Prisma adapter configured for database sessions |
| **Seed Data** | ✅ | Shipping zones, packaging, addons, HSN codes, occasions, settings |

### 📋 PRISMA SCHEMA - ALL 41 MODELS DEFINED

**Stage 1 (Fully Wired):**
- Account, Session, VerificationToken (NextAuth)
- User, Company, BrandAsset
- Product, PriceTier, ProductImage, ProductVariant
- Category, ProductCategory, ProductOccasion
- HsnCode, ProductHsn
- Packaging, Addon
- Vendor, ProductVendor
- Order, OrderItem, OrderAddon, OrderRecipient, OrderTimeline
- Quote, PriceAuditLog
- ShippingZone
- Collection, CollectionProduct
- HomepageBanner, Testimonial
- OccasionConfig, Coupon
- PlatformSetting

**Stage 2-5 (Empty, placeholders):**
- InventoryStock, InventoryMovement
- GocCampaign, GocOption, GocClaim
- CompanyWallet, WalletTransaction
- DisputeTicket, ArtworkApproval, OrderSlaLog
- AutomationRule, NotificationPreference, ConsentLog
- GstEinvoice, OrderModification
- SampleOrder, Reseller, ResellerOrder
- GiftingSequence, SequenceEnrollment, RoiOutcome
- MockupTemplate, GeneratedMockup, WhiteLabelStore

---

## KEY FILES & PURPOSE

| File | Purpose | Read When |
|------|---------|-----------|
| **CLAUDE.md** | ✨ THE AUTHORITATIVE SOURCE. Tech stack, design system, business rules, auth architecture, API response formats. | BEFORE ANY CODE |
| **ARCHITECTURE.md** | System diagram, database schema depth, pricing engine logic, order state machine, integration specs | Need technical depth |
| **WORKFLOW_DETAILED.md** | Step-by-step user journeys: Client (Priya), Vendor (Rajesh), Admin (Ankit) | Understand UX flow |
| **PROMPTS.md** | ALL 17 sprint prompts (Sprint 1-17) organized by phase. Copy-paste to build. | During development |
| **TESTING_AND_EDGE_CASES.md** | Test cases per sprint + critical edge cases (pricing, GST, security) | After each sprint |
| **README1.md** | Project overview, prerequisites, sprint map, execution guide | Onboarding |

---

## DESIGN SYSTEM — MANDATORY RULES

### Color Palette (Tailwind Config)

```
Navy:   900 (#1A1A1A), 800 (#1A3C6E), 700 (#2D5A9E)
Block:  amber, indigo, emerald, rose, violet, sky, orange, teal
        (each with 50, 100, 500 variants)
Gray:   50–900
Status: success (emerald), error (red), warning (amber)
```

### Typography (MANDATORY)

- **Headings:** `font-black` (900), `tracking-tighter` or `tracking-tight`
- **Body:** `text-base text-gray-700 leading-relaxed`
- **Prices:** `font-black tabular-nums text-2xl sm:text-3xl`
- **Step labels:** `text-xs font-semibold uppercase tracking-[0.2em]`

### Components (MANDATORY)

| Element | Rule | Example |
|---------|------|---------|
| Cards | `rounded-md border-2 border-gray-200` | NO rounded-lg |
| Buttons | `rounded-2xl px-8 py-4 font-bold text-lg hover:-translate-y-1` | Chunky with lift |
| Pills | `rounded-full border-2` | Active = navy-800 filled |
| Images | ALWAYS on `bg-gray-50` background | Never bare white |
| Hover | `whileHover={{ y: -8, boxShadow: "0 20px..." }}` | Framer Motion |

### Layouts

- **Customer:** Vibrant Bento blocks. Sections visually separated. Product-first.
- **Admin:** Shopify-clean. White background, card-based, minimal colors.

---

## CRITICAL BUSINESS RULES

| Rule | Details | Impact |
|------|---------|--------|
| **Branding in Base Price** | No separate branding cost line anywhere | Affects pricing UI, PDFs, invoices |
| **Razorpay Fee Separate** | ~2.36% shown as separate line item | Builder Step 4, PDF, checkout |
| **GST per HSN** | Each product has HSN code. CGST+SGST (intra-state) or IGST (inter-state) | Pricing engine complexity |
| **MOQ at Builder Entry** | Corporate=25, Party=10. NOT in catalog filter. All products visible. | Catalog shows no MOQ filter |
| **Digital Ocean Only** | No AWS. No Vercel for backend. | Infrastructure constraint |
| **No Inventory (Stage 1)** | Source from vendors on demand. Tables exist but empty. | Order creation doesn't check stock |
| **NextAuth + Google OAuth** | NOT Clerk. Roles stored in User.role (database), not Google. 5 roles: super_admin, company_admin, company_member, vendor, reseller. | Auth architecture |

---

## SPRINT 2 SCOPE — CATALOG + PRODUCTS

### What Gets Built

You selected Sprint 2 from PROMPTS.md, which includes:

**A) Admin Product Management (Shopify-style, NOT Bento)**
- 8-tab form: Basic, Tax/HSN, Images, Printing, Pricing, Vendor, Visibility, Analytics
- Product list: shadcn DataTable with search, filter, sort, bulk actions
- Bulk CSV upload: template download, validation, dry-run, confirm
- Category tree: L1→L2→L3 drag reorder
- Collections: name, banner, products, active toggle

**B) Customer Catalog (/catalog) — Bento vibrant**
- Left sidebar: rounded-md cards with filters
- 9 filters: Category, Price Range, Brand, Occasion, Recipient, Eco Toggle, Delivery Time, Branding Toggle, NO MOQ filter
- Product grid: 4/3/2 responsive cols
- Cards: rounded-md border-2, image on gray-50, hover lift, badges (MOQ amber, eco emerald, branding indigo)
- Search: autocomplete, fuzzy, 300ms debounce
- URL-synced filters
- Mobile: bottom sheet filters
- Empty state: "Clear All Filters" + "Get Help on WhatsApp" buttons with illustration

**C) Product Detail (/products/[slug]) — Product-first Bento**
- Left 60%: massive image on rounded-md bg-gray-50, thumbnails below, mobile carousel
- Right 40%: step label "PRODUCT", name text-3xl font-black, brand, printing pill (indigo-100 read-only), eco badge
- Pricing block (rounded-md border-2): 6-tier table, active tier bg-amber-50 border-l-4 border-amber-500, AnimatedNumber on qty change
- Packaging: radio cards (rounded-2xl, selected border-navy-800)
- Add-ons: toggle pills (rounded-full, selected emerald-500)
- Delivery: pincode input, zone result, rounded-md bg-sky-50
- Logo upload: rounded-md border-dashed
- CTAs: "Add to Gift Builder" + "Get Quick Quote"
- Related: drag-to-scroll Framer Motion slider

**D) API Routes (with Zod validation + NextAuth checks)**
- GET /api/products (with filters: category, price, brand, occasion, recipient, eco, delivery, branding)
- GET /api/products/[slug]
- POST /api/admin/products (already exists)
- PUT /api/admin/products/[id]
- DELETE /api/admin/products/[id]
- POST /api/admin/products/bulk-upload
- GET /api/categories
- GET /api/occasions
- GET /api/vendors

---

## TEST CASES & EDGE CASES FOR SPRINT 2

### Critical Tests (From TESTING_AND_EDGE_CASES.md)

**T2.1:** Create product via 8-tab form. HSN "7323" auto-fills 18% GST. Margin calc works. All tabs save.

**T2.2:** Change sell price → PriceAuditLog record created with old/new/user/timestamp/reason.

**T2.3:** Bulk CSV: valid rows create products. Invalid flagged. Existing SKU updates.

**T2.4:** Catalog: all 9 filters work. URL synced. Back button restores. Fuzzy search works.

**T2.5:** Catalog empty state shows BOTH "Clear All Filters" AND "Contact Us for Help".

**T2.6:** Product detail: tier highlights on qty change. Price animation visible. Delivery estimator works.

**T2.7:** Auth: only super_admin can create/edit products (API rejects others).

### Critical Edge Cases

**Pricing:**
- 24 units (Tier 1) vs 25 units (Tier 2) → 25 units CHEAPER per unit
- NO branding line in builder Step 4 → PASS
- Razorpay fee as separate line → PASS

**GST:**
- Pincode 110001 (Delhi) → CGST 9% + SGST 9% (for 18% product)
- Pincode 400001 (Maharashtra) → IGST 18%
- Mixed HSN (5% + 18%) → TWO separate GST lines

**Security:**
- /admin without auth → Redirect to /login
- /admin with company_member role → 403 Forbidden
- Upload .exe as product image → Rejected
- Access another company's order → 403 Forbidden

**URLs & Syncing:**
- Filter selection → URL updates with query params
- Browser back → Filters restore from URL
- Share filtered URL → Same filters apply for recipient
- Clear filters → URL resets to /catalog

---

## SPRINT 2 IMPLEMENTATION STRATEGY

### Phase 1: API Routes Setup

1. Create GET /api/products endpoint with Zod validation for filters
   - category, price range, brand, occasion, recipient, eco, deliveryTime, branding
   - Pagination: page, limit, total
   - Response: { success, data: { products[], total, page } }

2. Create GET /api/products/[slug] endpoint
   - Fetch product + all price tiers + images + categories + occasions + related products
   - Response includes 6-tier pricing table

3. Create API endpoints for filters:
   - GET /api/categories (tree structure with L1/L2/L3)
   - GET /api/occasions
   - GET /api/brands (distinct brands from products)

4. Extend POST /api/admin/products/bulk-upload
   - Template download
   - CSV validation (columns: name, sku, brand, hsnId, pricing tier 1-6)
   - Dry-run (show rows that will be created/updated)
   - Bulk insert/update with audit logging

### Phase 2: Admin Product Form

1. Create /admin/products page with DataTable
2. Create /admin/products/[id]/edit page with 8-tab form
3. Tab components:
   - Basic: name, slug, brand, sku, material, dimensions, weight, leadTime, status
   - Tax/HSN: HSN dropdown with auto-filled GST rate, ProductHsn creation
   - Images: multi-upload to DO Spaces, reorder, set primary
   - Printing: technique dropdown, position, info box "cost included in price"
   - Pricing: 6-tier table with cost/sell, margin %, min/max qty, MANDATORY PriceAuditLog on save
   - Vendor: primary vendor, alternates, cost comparison
   - Visibility: status, featured toggle, occasion tags, SEO fields
   - Analytics: placeholder for now (Stage 5)

### Phase 3: Customer Catalog

1. Implement /catalog page component
2. Left sidebar: rounded-md filter cards
   - Category tree (collapsible L1→L2→L3)
   - Price range slider
   - Brand pills (rounded-full)
   - Occasion pills
   - Recipient pills
   - Eco toggle
   - Delivery time radio
   - Branding toggle
   - NO MOQ filter
3. URL query params: ?category=drinkware&priceMin=100&priceMax=500&eco=true&etc
4. Active filters: colored pills with × close
5. Mobile: bottom sheet instead of sidebar
6. Product grid: 4 cols (lg), 3 cols (md), 2 cols (sm)
7. Search: autocomplete with debounce, fuzzy matching
8. Sort: dropdown (price low-high, price high-low, newest, popular)
9. Empty state: illustration + "Clear All Filters" + "Contact Us on WhatsApp"

### Phase 4: Product Detail Page

1. Fetch product by slug from API
2. Left 60%: massive image gallery
3. Right 40%: info blocks
   - Step label "PRODUCT"
   - Product name text-3xl font-black
   - Brand + printing tech pill (indigo-100 read-only)
   - Eco badge
   - Pricing block (rounded-md border-2 bg-white):
     - Step label "PRICING"
     - 6-tier table (active tier bg-amber-50 border-l-4 amber-500)
     - Qty input → AnimatedNumber updates prices
     - Savings callout (amber-50 pill)
     - GST note
   - Packaging: radio cards rounded-2xl
   - Add-ons: toggle pills emerald-500
   - Delivery: pincode input → zone result, rounded-md bg-sky-50
   - Logo upload: rounded-md border-dashed
   - Branding notes: textarea
   - CTAs: "Add to Gift Builder" + "Get Quick Quote"
4. Related products: drag-to-scroll slider (Framer Motion, NOT arrow buttons)

### Phase 5: Testing & Polish

1. Run all T2.1–T2.7 tests
2. Edge cases: pricing tiers, GST routing, URL syncing, empty states
3. Responsive check: 375/768/1024/1440px
4. Animations: useReducedMotion on all Framer Motion
5. Type checking: `npm run type-check`
6. Lint: `npm run lint`

---

## KEY CONSTRAINTS & DONT'S

### DO
✅ Use Decimal(10,2) for ALL money fields
✅ Create PriceAuditLog on EVERY price change
✅ Show Razorpay fee as SEPARATE line
✅ Calculate GST per product HSN code
✅ Check prefers-reduced-motion on all animations
✅ Use shadcn/ui components
✅ Put product images on gray-50 background
✅ Use rounded-md for cards, rounded-2xl for buttons
✅ Use font-black for headings and prices
✅ Use drag-to-scroll sliders (Framer Motion)
✅ Use NextAuth.js + Google OAuth for auth

### DON'T
❌ Show "Branding Cost" line to customers
❌ Use AWS services
❌ Use Clerk (we use NextAuth.js)
❌ Build Stage 3+ features in Stage 1
❌ Use rounded-lg for cards (use rounded-md)
❌ Use font-normal for headings
❌ Put product images on bare white
❌ Use arrow-button carousels (use drag sliders)
❌ Make admin dashboard vibrant (admin is Shopify-calm)
❌ Skip authentication checks on admin endpoints

---

## FILE STRUCTURE AFTER SPRINT 2

Expected new/modified files:

```
apps/web/
├── app/
│   ├── (admin)/
│   │   ├── products/
│   │   │   ├── page.tsx (list with DataTable)
│   │   │   └── [id]/
│   │   │       └── edit/
│   │   │           ├── page.tsx (8-tab form wrapper)
│   │   │           └── tabs/
│   │   │               ├── basic.tsx
│   │   │               ├── tax-hsn.tsx
│   │   │               ├── images.tsx
│   │   │               ├── printing.tsx
│   │   │               ├── pricing.tsx
│   │   │               ├── vendor.tsx
│   │   │               ├── visibility.tsx
│   │   │               └── analytics.tsx
│   ├── (customer)/
│   │   ├── catalog/
│   │   │   ├── page.tsx (refactored to use API)
│   │   │   └── components/
│   │   │       ├── filters-sidebar.tsx
│   │   │       ├── product-grid.tsx
│   │   │       └── empty-state.tsx
│   │   ├── products/
│   │   │   └── [slug]/
│   │   │       ├── page.tsx (refactored to use API)
│   │   │       └── components/
│   │   │           ├── image-gallery.tsx
│   │   │           ├── pricing-block.tsx
│   │   │           └── related-products.tsx
│   ├── api/
│   │   ├── products/
│   │   │   ├── route.ts (GET all products with filters)
│   │   │   └── [slug]/
│   │   │       └── route.ts (GET single product)
│   │   ├── categories/
│   │   │   └── route.ts (GET categories tree)
│   │   ├── occasions/
│   │   │   └── route.ts (GET occasions)
│   │   ├── brands/
│   │   │   └── route.ts (GET distinct brands)
│   │   ├── admin/
│   │   │   └── products/
│   │   │       ├── route.ts (POST create, PUT update, DELETE)
│   │   │       └── bulk-upload/
│   │   │           └── route.ts (CSV upload with validation)
├── components/
│   ├── admin/
│   │   ├── product-form/
│   │   │   └── tabs/
│   │   ├── product-table.tsx
│   │   └── bulk-upload-dialog.tsx
│   ├── catalog/
│   │   ├── filters-sidebar.tsx
│   │   ├── product-card.tsx
│   │   └── search-bar.tsx
├── lib/
│   ├── api.ts (API client functions)
│   └── queries.ts (React Query hooks)
├── hooks/
│   ├── useCatalogFilters.ts (URL sync, filter state)
│   └── useProduct.ts (React Query product fetch)
└── types/
    ├── catalog.ts
    └── product.ts
```

---

## EXECUTION CHECKLIST FOR SPRINT 2

- [ ] Read CLAUDE.md (all sections)
- [ ] Read ARCHITECTURE.md (pricing engine, schema)
- [ ] Review WORKFLOW_DETAILED.md (Priya's catalog flow)
- [ ] Implement API routes (GET /api/products, /api/products/[slug], etc.)
- [ ] Implement admin product form (8 tabs)
- [ ] Implement admin DataTable with bulk CSV upload
- [ ] Refactor /catalog page (wire to API, add 9 filters, URL sync)
- [ ] Refactor /products/[slug] page (fetch from API, add pricing block, delivery estimator)
- [ ] Run all T2.1–T2.7 tests
- [ ] Test edge cases (pricing tiers, GST, URL syncing, mobile)
- [ ] Run `npm run type-check` and `npm run lint`
- [ ] Commit: `git add . && git commit -m "Sprint 2: Catalog + Products + Admin"`

---

## NEXT STEPS

1. **Read CLAUDE.md** in full (you already have it)
2. **Create a detailed implementation plan** using EnterPlanMode
3. **Build API routes** first (products, categories, occasions)
4. **Build admin form** (8-tab product creation)
5. **Build catalog** (filters, search, grid)
6. **Build product detail** (images, pricing, delivery)
7. **Test thoroughly** against T2.1–T2.7
8. **Commit and move to Sprint 3** (Pricing Engine + Builder Steps 1-2)

---

*End of Exploration Summary*
*Ready for Sprint 2 implementation*
