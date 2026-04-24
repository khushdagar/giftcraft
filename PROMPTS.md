# PROMPTS.md — Complete Sprint Prompt Library (NextAuth + Google OAuth + Vibrant Bento UI)

> **ALL 17 sprint prompts. Auth: NextAuth.js v5 + Google OAuth (NOT Clerk).**
> Customer UI: Vibrant Bento Blocks. Admin UI: Clean Shopify style.
> Always have CLAUDE.md in your project root — Claude Code reads it automatically.

---

# HOW TO USE

1. Open VS Code terminal in your `giftcraft/` folder
2. Run: `claude`
3. Claude Code auto-reads CLAUDE.md from project root
4. Paste the sprint prompt below
5. After completion: run the "After This Sprint" tests
6. All pass? `git add . && git commit -m "Sprint X: description"` → next sprint

---
---

# ═══════════════════════════════════════
# PHASE 1: MVP LAUNCH | Sprints 1-6
# ═══════════════════════════════════════

---

## SPRINT 1: Project Setup + Auth + Bento Design System + Database

### What Gets Built
- Turborepo monorepo
- Tailwind CSS with FULL Vibrant Bento color system
- Complete Prisma schema (ALL tables including NextAuth adapter tables)
- NextAuth.js v5 + Google OAuth + Prisma adapter + role-based middleware
- Custom Bento-styled login page ("Continue with Google")
- Admin layout (Shopify-style)
- Customer layout (Bento-style navbar + footer + WhatsApp widget)
- Seed data

### Prompt

```
Read CLAUDE.md first. It contains the MANDATORY "Vibrant Bento Block" design system and NextAuth.js auth setup.

Initialize the GiftCraft project — Sprint 1.

1. TURBOREPO MONOREPO:
   - apps/web (Next.js 14 App Router, TypeScript)
   - apps/api (Node.js + Express, TypeScript)
   - packages/types (shared TypeScript interfaces)
   - packages/pricing (pricing engine, empty for now)

2. TAILWIND CONFIG with FULL Bento color palette from CLAUDE.md Section 3.2:
   navy (900/800/700), block colors (amber/indigo/emerald/rose/violet/sky/orange/teal each with 50/100/500), grays, success/error/warning.
   Font: Inter from Google Fonts (400, 500, 600, 700, 900 weights).
   shadcn/ui configured with Bento-compatible theme.

3. NEXTAUTH.JS v5 + GOOGLE OAUTH SETUP (NOT Clerk — see CLAUDE.md Section 5):
   
   Install: next-auth@5, @auth/prisma-adapter, @auth/core
   
   a) app/api/auth/[...nextauth]/route.ts:
      - Google OAuth provider with GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
      - PrismaAdapter for database sessions
      - session callback: fetch User.role and User.companyId from database, attach to session object
      - Custom pages: signIn → "/login"
   
   b) Prisma schema additions for NextAuth adapter:
      - Account model (userId, provider, providerAccountId, tokens, etc.)
      - Session model (sessionToken, userId, expires)
      - VerificationToken model (identifier, token, expires)
      - User model updated: add accounts Session[] and Account[] relations, emailVerified DateTime?, image String?
   
   c) middleware.ts:
      - /admin/* → require session AND role === "super_admin". No session → redirect /login. Wrong role → redirect /unauthorized.
      - /dashboard/* → require any session. No session → redirect /login.
      - Everything else → public (no auth needed)
      - Use NextAuth auth() wrapper for middleware
   
   d) hooks/usePermissions.ts:
      - Uses useSession() from next-auth/react
      - Returns: isAuthenticated, isAdmin, isCompanyAdmin, isCompanyMember, isVendor, isReseller, canManageProducts, canPlaceOrders, canApproveOrders, canManageTeam, companyId, userId
   
   e) components/auth/PermissionGate.tsx:
      - Wrapper that renders children only if permission check passes
      - Props: requires (permission string). Falls back to null or redirect.
   
   f) SessionProvider wrapper in root layout:
      - apps/web/app/layout.tsx wraps {children} in <SessionProvider> from next-auth/react
   
   g) /login page — BENTO STYLED:
      - Split layout: left half = pastel gradient (amber-50 to indigo-50 diagonal) with massive heading "Bulk Gifting, Made Beautiful." and subtitle
      - Right half = white card (rounded-md border-2 p-12) with:
        - GiftCraft logo at top
        - "Welcome to GiftCraft" text-3xl font-black
        - "Sign in to start gifting" text-gray-500
        - Large "Continue with Google" button: rounded-2xl border-2 border-gray-300 py-4 px-8 font-bold with Google icon. hover:border-navy-800 hover:-translate-y-1 hover:shadow-xl
        - Small text below: "By signing in, you agree to our Terms of Service"
        - "Need vendor access? Contact us" link at bottom
      - Mobile: single column, gradient on top (shorter), card below
   
   h) /unauthorized page:
      - Bento-style error page: "Access Denied" with illustration
      - "You don't have permission to access this page"
      - "Go to Dashboard" button + "Contact Admin" button

4. PRISMA SCHEMA — ALL tables from ARCHITECTURE.md:
   
   Include NextAuth adapter tables (Account, Session, VerificationToken) PLUS all GiftCraft tables:
   
   Product (id, name, slug unique, brand, sku unique, descriptionShort, descriptionLong, material, dimensionL/W/H Float, weightG Float, leadTimeDays Int, status enum active/draft/archived/seasonal, printingTechnique enum, printingPosition, isEcoCertified, isFeatured, sortOrder, metaTitle, metaDescription, createdAt, updatedAt)
   
   PriceTier (productId, tier Int 1-6, minQty, maxQty, costPrice Decimal, sellPrice Decimal)
   ProductImage, ProductVariant, Category (self-ref), ProductCategory, ProductOccasion
   HsnCode (code unique, defaultGstRate Decimal), ProductHsn
   Packaging, Addon
   Company (with tier enum standard/silver/gold/platinum)
   User (with role enum super_admin/company_admin/company_member/vendor/reseller, companyId, email unique — this model also has NextAuth relations: accounts Account[], sessions Session[])
   BrandAsset, Vendor, ProductVendor
   Order (12-stage status enum, all Decimal amounts including razorpayFee)
   OrderItem, OrderAddon, OrderRecipient, OrderTimeline
   Quote (shareToken unique), PriceAuditLog, ShippingZone
   Collection, CollectionProduct, HomepageBanner, Testimonial, OccasionConfig, Coupon, PlatformSetting
   
   Empty tables for future: InventoryStock, InventoryMovement, GocCampaign, GocOption, GocClaim, CompanyWallet, WalletTransaction, DisputeTicket, ArtworkApproval, OrderSlaLog, AutomationRule, NotificationPreference, ConsentLog, GstEinvoice, OrderModification, SampleOrder, Reseller, ResellerOrder, GiftingSequence, SequenceEnrollment, RoiOutcome, MockupTemplate, GeneratedMockup, WhiteLabelStore, etc.
   
   Decimal(10,2) for ALL money. Indexes on slugs, status, email, shareToken.

5. CUSTOMER LAYOUT — BENTO STYLE:
   Sticky navbar: logo (font-black), nav links, "Build a Gift" chunky button (rounded-2xl bg-navy-800 hover:-translate-y-1), user avatar (from Google profile image via NextAuth session) with dropdown (Dashboard, Orders, Sign Out using next-auth/react signOut()), cart badge.
   Mobile: hamburger → full-screen overlay.
   Footer: dark bg, 5 columns, social icons, WhatsApp link. Mobile: accordion.
   WhatsApp widget: fixed bottom-right, green circle, pulse animation.

6. ADMIN LAYOUT — SHOPIFY STYLE (NOT Bento):
   Left sidebar: white bg, border-r. Nav: Dashboard, Products, Orders, Clients, Vendors, Analytics, Settings (lucide icons). Active: left-3 border-navy-800, bg-gray-50. Top bar: search, bell, avatar (Google profile image from session). Collapsible on tablet. Content: max-w-7xl mx-auto.

7. ADMIN ROLE MANAGEMENT PAGE — app/(admin)/settings/users/page.tsx:
   Table of all users: name, email, Google avatar, role (dropdown to change), company assignment (dropdown), created date.
   Only super_admin can access this page and change roles.
   When admin changes a user's role from the dropdown and saves, the User.role field updates in PostgreSQL.
   This is how Arts Shala promotes a new client to company_admin or onboards a vendor.

8. SEED DATA:
   6 ShippingZones, 4 Packaging, 5 Addons, 20 HsnCodes, 10 OccasionConfigs, PlatformSettings.
   Create one seed User with role super_admin (email: your admin Google email) so you can log in as admin immediately.
```

### After This Sprint
1. `npm install` + `npm run build` — succeeds
2. `npx prisma db push` — all tables created (including Account, Session, VerificationToken for NextAuth)
3. `npx prisma db seed` — seed data + admin user present
4. Visit localhost:3000 → customer layout renders (navbar with Bento style, footer, WhatsApp widget)
5. Visit localhost:3000/login → Bento-styled login page with "Continue with Google" button
6. Click "Continue with Google" → Google OAuth consent → redirected back → session created
7. Visit /admin → if your email matches the seeded super_admin → admin layout renders with Shopify sidebar
8. Visit /admin with a non-admin Google account → redirected to /unauthorized
9. Visit /catalog → renders without login (public route)
10. Check database: Account and Session tables have records after Google login

---

## SPRINT 2: Catalog + Products with Bento Card Design

### What Gets Built
- Admin: 8-tab product form, bulk CSV upload, categories, collections
- Customer: Bento catalog with colorful filter pills, drag-to-scroll sliders, product-first detail page
- Price audit trail

### Prompt

```
Read CLAUDE.md. Sprint 2: Product system.

BUSINESS RULES: Branding in base price. No MOQ filter. Empty state shows Contact Us. Audit trail required.

UI RULES: rounded-md cards, images on gray-50, font-black prices, colorful filter pills (rounded-full), drag-to-scroll product sliders, product-first detail page with massive image.

AUTH: Use NextAuth.js session checks. Admin pages check session.user.role === "super_admin". Product API routes verify session before allowing mutations.

BUILD:

A) ADMIN PRODUCT MANAGEMENT (Shopify clean, NOT Bento):
   8-tab form: Basic, Tax/HSN (auto-lookup), Images (multi-upload + sample branding), Printing (technique dropdown + info box "cost included in sell price"), Pricing (6-tier with margin calc + MANDATORY PriceAuditLog on save), Vendor (primary + alternates + comparison), Visibility (status, featured, occasions, SEO), Analytics (placeholder).
   Product list: shadcn DataTable with search, filter, sort, bulk actions.
   Bulk CSV upload: template download, validation, dry-run, confirm. SKU exists = update.
   Category tree: L1→L2→L3, drag reorder.
   Collections: name, banner, products, active toggle.

B) CUSTOMER CATALOG (/catalog) — BENTO:
   Left sidebar filters in rounded-md cards with step labels ("CATEGORY", "PRICE RANGE").
   Category tree, price slider, brand pills (rounded-full, active = navy-800 filled), occasion pills, recipient pills, eco toggle, delivery time, branding toggle. NO MOQ FILTER.
   Active filter badges as colored pills with × close.
   Mobile: bottom sheet filters.
   Product grid: 4/3/2 cols. Cards: rounded-md border-2, image on gray-50 with group-hover:scale-105, "From ₹XXX" font-bold, badges (MOQ amber, eco emerald, branding indigo). "Add to Pack" slides up on hover (Framer Motion).
   Card hover: whileHover={{ y:-8, boxShadow }}. Staggered load 50ms.
   Search: autocomplete 300ms, fuzzy. Sort dropdown. URL-synced filters. Skeleton loading.
   Empty state: illustration + "Clear All Filters" + "Get Help on WhatsApp" (two chunky buttons).

C) PRODUCT DETAIL (/products/[slug]) — BENTO PRODUCT-FIRST:
   Left 60%: massive image on rounded-md bg-gray-50. Thumbnails below. Mobile carousel.
   Right 40%: step label "PRODUCT", name text-3xl font-black, brand, printing pill (indigo-100, read-only), eco badge.
   Pricing block (rounded-md border-2 bg-white): step label "PRICING", 6-tier table (active tier bg-amber-50 border-l-4 border-amber-500), font-black tabular-nums prices, qty input with AnimatedNumber on tier change, savings callout (amber-50 pill), GST note.
   Packaging block: radio cards (rounded-2xl, selected border-navy-800). Sleeve toggle.
   Add-ons block: toggle pills (rounded-full, selected emerald-500).
   Delivery block (rounded-md bg-sky-50): pincode input, zone result.
   Logo upload (rounded-md border-dashed). Branding notes textarea.
   CTAs: "Add to Gift Builder" chunky primary + "Get Quick Quote" secondary outlined.
   Related: drag-to-scroll Framer Motion slider. Label "YOU MAY ALSO LIKE".

D) API ROUTES with Zod validation and NextAuth session checks for mutations.
```

### After This Sprint
- T2.1: Product CRUD works. HSN auto-fills. Margin calc. Audit trail logs changes.
- T2.2: CSV upload creates/updates products.
- T2.3: Catalog: Bento cards (rounded-md, images on gray-50, hover lift). Drag-to-scroll on related products.
- T2.4: All 9 filters work as colorful pills. URL synced.
- T2.5: Empty state shows Clear + Contact Us buttons.
- T2.6: Product detail: massive image, pricing block with tier highlight on amber-50, AnimatedNumber works.
- T2.7: Auth: only super_admin can create/edit products (API rejects others).

---

## SPRINT 3: Pricing Engine + Gift Builder Steps 1-2

### Prompt

```
Read CLAUDE.md. Sprint 3: Pricing engine + builder Steps 1-2.

PRICING: Branding in base price. Layers: Product + Packaging + Add-ons + Shipping + GST - Discounts + Razorpay Fee. GST per HSN. Seller DL.

UI: Builder numbered steps ("STEP 01: CHOOSE PRODUCTS"). Merged view on emerald-50. Spring+rotation animations. Toggle pill add-ons.

AUTH: Builder can be used without login (state in Zustand). "Place Order" at Step 4 requires NextAuth session (redirect to /login if not signed in, return to builder after sign-in).

BUILD:

A) PRICING ENGINE (packages/pricing/): PricingInput → PricingResult (NO brandingCost field). GST routing via pincodeToState(). Razorpay fee = (total * 0.02 * 1.18). Unit tests.

B) ZUSTAND STORE: full builder state.

C) QUANTITY MODAL: Bento-style rounded-md. "How many gift packs?" font-black. Corporate/Party radio cards on different block colors (indigo-50 vs orange-50). MOQ enforced.

D) STEP 1 (Choose Products): Split view. Left mini-catalog with draggable category pills. Right: merged product view on emerald-50/30 bg (rounded-md border-2). Products animate in with spring+rotation. Drag-to-reorder. Box size badge (rounded-full navy-800). Running subtotal on amber-50 block.

E) STEP 2 (Upload Logo): Logo upload (rounded-md border-dashed). Printing badges as indigo-100 pills (read-only). Branding notes on amber-50/50. Packaging radio cards. Add-ons as toggle pills (emerald-500 filled when active).
```

### After This Sprint
- T3.1: Pricing tests pass. No branding line.
- T3.2: Quantity modal: Bento styled, MOQ enforced.
- T3.3: Step 1: spring+rotation animations, drag reorder, box size badge.
- T3.4: Step 2: printing badges as pills, toggle pill add-ons.
- T3.5: Builder works WITHOUT login. State persists in Zustand.

---

## SPRINT 4: Builder Steps 3-4 + Quote + Checkout + Dashboard

### Prompt

```
Read CLAUDE.md. Sprint 4: Steps 3-4, quote, checkout, dashboard.

CRITICAL: Razorpay fee SEPARATE. No branding line. GST per HSN.

UI: Tier cards as colorful blocks (active amber-50). Grand total on navy-800. Per-unit in amber pill. Login page Bento-styled.

AUTH: "Place Order" in Step 4 requires NextAuth session. If not signed in, clicking "Place Order" redirects to /login?callbackUrl=/builder?step=4. After Google sign-in, user returns to builder Step 4 with state preserved. Checkout page requires auth.

BUILD:

A) STEP 3: Tier cards as colored blocks (active amber-50 + "YOUR TIER" badge). AnimatedNumber on qty change. Individual delivery surcharge amber note. CSV upload with validation.

B) STEP 4: Pricing breakdown (rounded-md, alternating rows). NO branding line. GST per HSN. Razorpay fee SEPARATE. Grand total: navy-800 bg, white text, font-black text-3xl. Per-unit: amber-50 pill. Coupon input. Quote PDF download. Share link. WhatsApp share. "Place Order" button → checks NextAuth session → if not signed in, redirect to /login with callback.

C) QUOTE PDF: @react-pdf/renderer A4. All details, NO branding line, Razorpay fee visible.

D) SHAREABLE QUOTE (/quote/[token]): Public, no auth. Read-only Bento display.

E) CHECKOUT (/checkout — auth required): session check in page component. Order summary. Billing form (GSTIN). Razorpay fee note. Payment button. Enterprise bank transfer option.

F) POST-CHECKOUT: Confirmation with celebration animation. Email + WhatsApp. GST invoice.

G) ORDER TRACKING (/orders/[id]/track): Public (no auth needed — accessible with order ID).

H) CUSTOMER DASHBOARD (/dashboard — auth required): session check. Welcome card (violet-50). Stats cards each on different block color (indigo-50, amber-50, emerald-50). Orders/Quotes/Assets/Profile tabs. User info from NextAuth session (Google name + avatar).
```

### After This Sprint
- T4.1-T4.5: Pricing correct. PDF correct. Checkout works. Dashboard works.
- T4.6: "Place Order" without login → /login → Google sign-in → returns to builder Step 4.
- T4.7: Dashboard shows Google name + avatar from session.
- T4.8: /checkout without auth → redirected to /login.

---

## SPRINT 5: Admin Orders + Homepage + Static Pages

### Prompt

```
Read CLAUDE.md. Sprint 5: Admin orders (Shopify style), homepage (full Bento), static pages.

ADMIN = Shopify clean. CUSTOMER = Vibrant Bento.

AUTH: Admin pages verify session.user.role === "super_admin" in page component using auth() server-side call.

BUILD:

A) ADMIN ORDERS (Shopify): List table, detail page with status update + OrderTimeline audit, QC upload, shipping entry, WhatsApp trigger. Session check: only super_admin.

B) HOMEPAGE — FULL BENTO:
   Hero: pastel gradient, "INDIA'S FIRST" step label, text-6xl font-black heading, two chunky CTAs, floating product images.
   Trust strip: logos (grayscale, hover color), stats (font-black numbers).
   Occasions Bento grid: each tile DIFFERENT block color (Diwali=amber, Christmas=rose, Onboarding=indigo, Birthday=violet). rounded-md border-2, hover lift.
   Featured products: drag-to-scroll Framer Motion slider (NOT arrow buttons).
   How It Works: 5 colored blocks (sky→indigo→violet→amber→emerald).
   Collections: each row with pastel bg.
   Testimonials: on indigo-50 bg.
   Bottom CTA: navy-800 bg, white heading, two buttons.
   All sections: whileInView fade-up animation.
   
   Navbar user section: if NextAuth session exists → show Google avatar + name + dropdown (Dashboard, Sign Out). If no session → show "Sign In" button linking to /login.

C) ADMIN HOMEPAGE MANAGEMENT (Shopify style).

D) PRICING PAGE: each layer in its own colored Bento block.

E) CONTACT, PACKS, BLOG pages.
```

### After This Sprint
- T5.1-T5.6: Admin orders work. Homepage renders full Bento. Navbar shows Google avatar when signed in.

---

## SPRINT 6: Settings + Polish + Launch

### Prompt

```
Read CLAUDE.md. Sprint 6 — FINAL Phase 1.

AUTH: Admin settings pages (including user role management) require super_admin. Add /admin/settings/users page where admin can view all users, see their Google email/avatar, and change their role dropdown (super_admin/company_admin/company_member/vendor/reseller). This is how new users get promoted after their first Google sign-in creates a default company_member record.

BUILD:
A) Admin settings: company, GST, zones, packaging, addons, margin threshold, Razorpay, coupons. Plus USER ROLE MANAGEMENT page.
B) Admin vendors, clients, analytics (recharts).
C) Responsive polish (375/768/1024/1440).
D) Performance (Next.js Image, React Query cache, debounce).
E) SEO (meta, OG, JSON-LD, sitemap).
F) Error handling (Bento-style 404/500, form validation, Razorpay failure).
G) Accessibility (keyboard, focus, reduced motion, contrast, aria-live).

END-TO-END TEST:
1. Homepage → Bento UI with vibrant colors
2. Catalog → colorful pills, drag sliders, Bento cards
3. Product → massive image, tier highlight, AnimatedNumber
4. Builder → quantity modal → spring animations → merged view
5. Step 4 → NO branding line, Razorpay SEPARATE, GST by HSN
6. "Place Order" → /login → Google OAuth → back to builder → checkout → pay
7. Admin (signed in as super_admin) → process order → WhatsApp sent
8. Admin → /admin/settings/users → change a user's role → verify role change works

IF ALL PASS → PHASE 1 READY FOR LAUNCH.
```

### After This Sprint
- T6.1-T6.9: Everything from previous sprint tests
- T6.10: Full end-to-end including Google OAuth login flow
- T6.11: Admin can manage user roles in /admin/settings/users
- T6.12: Non-admin users redirected from /admin pages

---
---

# ═══════════════════════════════════════
# PHASE 2: OPERATIONS | Sprints 7-9
# (Claude Code CLI)
# ═══════════════════════════════════════

## SPRINT 7: 12-Stage Pipeline + SLA + Design Approval

```
Read CLAUDE.md. Upgrade to 12-stage pipeline + SLA + design approval.

AUTH: All admin operations check NextAuth session.user.role === "super_admin". Design approval pages (/approve/[token]) are PUBLIC — no auth needed (token-based access).

1. 12-stage Order status enum. OrderSlaLog. BullMQ 15-min SLA checker.
2. Kanban view: 12 cols, draggable cards, SLA badges (emerald/amber/rose pills).
3. ArtworkApproval: admin uploads mockup → sends tokenised link → /approve/[token] (PUBLIC Bento-styled page with zoom, approve with checkbox sign-off, revision with notes). Hard block enforced.
4. Vendor PO + Spec Sheet PDF auto-generation.
```

Tests: T7.1-T7.8

## SPRINT 8: Disputes + Shiprocket + Vendor Management

```
Read CLAUDE.md. Add disputes, Shiprocket, full vendor management.

AUTH: Dispute submission requires NextAuth session (customer must be signed in). Admin resolution requires super_admin role.

1. DisputeTicket: 48h window, photo upload, resolution workflow.
2. Shiprocket integration: auth, shipments, AWB, webhook.
3. Vendor full: scoring, payment calendar, communication log, 90-day price confirmation.
```

Tests: T8.1-T8.8

## SPRINT 9: CRM + Automation + Planner + Analytics + E-Invoicing

```
Read CLAUDE.md. Add CRM, automation, budget planner, analytics, e-invoicing.

AUTH: Budget planner (/planner) is PUBLIC (no auth — lead generation tool). Analytics/CRM require super_admin.

1. Client CRM with pricing tiers.
2. Automation engine (all triggers).
3. Budget Planner: 4-step Bento wizard (occasion cards on different block colors, 3 recommendation cards on emerald/amber/violet-50). No login required.
4. Full analytics with recharts.
5. Notification preferences + DPDP.
6. GST e-invoicing (IRN + QR).
7. GST toggle, order modification rules.
```

Tests: T9.1-T9.8

---
---

# ═══════════════════════════════════════
# PHASE 3: GROWTH | Sprints 10-12
# ═══════════════════════════════════════

## SPRINT 10: Gift of Choice + Build Your Box + Samples

```
Read CLAUDE.md. Build GOC, Build Your Box, samples.

AUTH: Campaign creation requires NextAuth session (company_admin or higher). Claim pages (/claim/[token]) are PUBLIC — no auth, no Google sign-in needed for recipients. They just enter name + address.

1. GOC: campaign creation, tokenised claim links (PUBLIC Bento-styled pages), address entry, swap, auto-refund.
2. Build Your Box: budget meter (Framer Motion), category restrictions.
3. Sample orders: requires auth. Convert to bulk.
```

Tests: T10.1-T10.3

## SPRINT 11: Wallet + Multi-User + Inventory + Reseller

```
Read CLAUDE.md. Build wallet, multi-user, inventory, reseller.

AUTH: Multi-user management uses NextAuth sessions + User.role from database. Company admin invites team by email — when they sign in with Google, they get company_member role. Admin promotes via /admin/settings/users.

1. Wallet, 2. Multi-user (5 roles via database, managed through admin UI), 3. Inventory, 4. Reseller portal.
```

Tests: T11.1-T11.4

## SPRINT 12: Occasions Engine + Eco Dashboard + RFQ

```
Read CLAUDE.md. Occasions engine, eco dashboard, vendor RFQ. Auth: admin-only features check super_admin role.
```

Tests: T12.1-T12.3

---
---

# ═══════════════════════════════════════
# PHASE 4: ADVANCED | Sprints 13-14
# ═══════════════════════════════════════

## SPRINT 13: Mockup Generator + Design Studio + Live Preview

```
Read CLAUDE.md. Mockup generator (Konva.js), Design Studio, live preview, PNG export. Auth: mockup generator admin-only. Design Studio requires auth (any role).
```

Tests: T13.1-T13.4

## SPRINT 14: Sequences + ROI + Go High Level + White-Label

```
Read CLAUDE.md. Sequences (React Flow), ROI tracking, GHL integration (sync NextAuth user data to GHL contacts), white-label stores.
```

Tests: T14.1-T14.4

---
---

# ═══════════════════════════════════════
# PHASE 5: SCALE | Sprints 15-17
# ═══════════════════════════════════════

## SPRINT 15: HRIS + Communication Integrations

```
Read CLAUDE.md. HRIS via Merge.dev, Slack bot, Teams bot. Auth: HRIS config requires super_admin.
```

## SPRINT 16: Wedding + Party + Platform API

```
Read CLAUDE.md. Wedding module, party module, platform REST API. API auth: API keys stored in database, validated per request. OAuth 2.0 for enterprise clients.
```

## SPRINT 17: Zapier + Mobile + AI

```
Read CLAUDE.md. Zapier/Make, Google Sheets sync, React Native mobile app (use NextAuth session tokens for mobile auth), AI recommendations.
```

---

*End of GiftCraft Prompt Library*
*NextAuth.js + Google OAuth | Vibrant Bento UI*
*Confidential — Arts Shala*
