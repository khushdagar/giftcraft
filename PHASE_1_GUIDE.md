# 🎁 GiftCraft Phase 1 — Complete Implementation Guide

> **Last Updated:** April 22, 2026  
> **Status:** Phase 1 Complete (Ready for Testing)  
> **Audience:** Admins, testers, and developers

---

## Table of Contents
1. [Phase 1 Overview](#phase-1-overview)
2. [Getting Started](#getting-started)
3. [User Roles & Permissions](#user-roles--permissions)
4. [Admin Dashboard](#admin-dashboard)
5. [Adding Products](#adding-products)
6. [Managing Settings](#managing-settings)
7. [Customer Journey](#customer-journey)
8. [Order Management](#order-management)
9. [Testing Checklist](#testing-checklist)
10. [FAQ & Troubleshooting](#faq--troubleshooting)

---

## Phase 1 Overview

**GiftCraft Phase 1** is the MVP (Minimum Viable Product) for an **India-first self-serve bulk corporate gifting platform**. Customers browse products, build branded gift packs, get instant pricing, place orders, and checkout with Razorpay.

### What's Included in Phase 1?
✅ Product catalog with tiered pricing  
✅ Interactive gift builder (Step-by-step wizard)  
✅ Real-time pricing calculator with GST & Razorpay fees  
✅ Google OAuth login (via NextAuth.js)  
✅ Razorpay payment integration  
✅ Admin dashboard for order management  
✅ Admin settings for zones, packaging, add-ons, coupons  
✅ Email notifications (SendGrid)  
✅ Responsive Bento-styled UI  

### What's NOT in Phase 1?
❌ Inventory management (vendors source on-demand)  
❌ Vendor portal  
❌ Reseller commission tracking  
❌ Shiprocket integration (manual shipping zones only)  
❌ PDF generation with @react-pdf/renderer (using basic HTML2PDF)  

---

## Getting Started

### 1️⃣ Environment Setup

**Install dependencies:**
```bash
npm install
```

**Set up environment variables** (`.env.local` in project root):
```env
# Database
DATABASE_URL="postgresql://..."

# NextAuth
NEXTAUTH_SECRET="your-random-32-char-secret"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Razorpay (Test Mode)
RAZORPAY_KEY_ID="rzp_test_xxxxx"
RAZORPAY_KEY_SECRET="rzp_test_xxxxx"
RAZORPAY_WEBHOOK_SECRET="whsec_test_xxxxx"

# Pricing
RAZORPAY_FEE_PERCENTAGE="2"
RAZORPAY_FEE_GST="18"

# Platform
SELLER_STATE_CODE="DL"
SELLER_GSTIN="07XXXXX1Z5"
```

### 2️⃣ Database Setup

**Create database tables:**
```bash
cd apps/web
npx prisma db push
```

**Seed demo data (optional):**
```bash
npx tsx ../../scripts/seed-demo-products.ts
```

### 3️⃣ Start the App

```bash
npm run dev
# App runs at http://localhost:3000
```

---

## User Roles & Permissions

GiftCraft has **5 user roles**, each with different access levels:

### 1. **Super Admin** (`super_admin`)
- **Who:** Arts Shala internal team
- **Access:** Full `/admin` dashboard
- **Can do:**
  - View all orders
  - Update order status
  - Manage shipping zones
  - Manage packaging & add-ons
  - Manage coupons
  - Manage platform settings
  - Manage user roles
  - View analytics & revenue

### 2. **Company Admin** (`company_admin`)
- **Who:** Client company account manager
- **Access:** `/dashboard` (company-specific)
- **Can do:**
  - View company's orders only
  - Manage team members
  - View team's spending
  - Download invoices

### 3. **Company Member** (`company_member`)
- **Who:** Client staff (default role for new signups)
- **Access:** `/` (public pages) + `/dashboard`
- **Can do:**
  - Browse catalog
  - Build gift packs
  - Place orders
  - View order history

### 4. **Vendor** (`vendor`)
- **Who:** Product/service vendor
- **Access:** `/vendor` portal (Stage 2)
- **Can do:**
  - View purchase orders (POs)
  - Upload QC photos
  - Track fulfillment

### 5. **Reseller** (`reseller`)
- **Who:** Reseller placing bulk orders
- **Access:** `/dashboard` + special pricing
- **Can do:**
  - Place orders on behalf of clients
  - Track reseller commission
  - Manage sub-customers (Stage 3)

---

## Admin Dashboard

### 📊 Overview (`/admin`)

The admin dashboard is your command center. It shows:

```
┌─────────────────────────────────────────────────────┐
│ GIFTCRAFT ADMIN DASHBOARD                          │
├─────────────────────────────────────────────────────┤
│                                                     │
│ KPI Cards (Real-time)                              │
│ ├─ Total Orders: 47                                │
│ ├─ Revenue (This Month): ₹3,45,000                 │
│ ├─ Active Quotes: 12                               │
│ └─ Clients: 23                                      │
│                                                     │
│ Revenue Chart (Last 6 months)                       │
│ Recent Orders (Last 10)                             │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Access:** Only `super_admin` role can access `/admin`

**What you see:**
- Orders count by status (confirmed, production, shipped, etc.)
- Revenue breakdown (MTD, 6-month trend)
- Active quotes waiting approval
- Client count
- Real-time order timeline

---

### 📋 Orders Management (`/admin/orders`)

**List View:**
Shows all orders in a table with filters

| Order # | Status | Items | Amount | Date | Actions |
|---------|--------|-------|--------|------|---------|
| ORD-001 | confirmed | 100x Mug | ₹50,000 | Apr 22 | View, Update Status |
| ORD-002 | production | 50x Tee | ₹25,000 | Apr 21 | View, Update Status |

**Filters:**
- Status: All, Confirmed, Production, Packed, Shipped, Delivered
- Search by order number
- Pagination (10 per page)

**Detail View** (`/admin/orders/[id]`)

When you click "View" on an order, you see:

**Left Column:**
- Order summary (Order #, Date, Customer)
- Customer billing details
- Items ordered (with prices)
- Order timeline (status changes with notes)

**Right Column (Sticky):**
- **Status Updater** — dropdown to change status
- **Optional note** — add notes when status changes
- **Grand total breakdown:**
  ```
  Subtotal:        ₹50,000
  Packaging:         +₹2,500
  Add-ons:           +₹3,000
  Shipping:            +₹150
  Discount (DEMO10): -₹5,000
  ────────────────────────
  Subtotal:        ₹50,650
  GST (18% CGST):    +₹4,559
  Razorpay Fee:        +₹945
  ────────────────────────
  GRAND TOTAL:     ₹56,154
  ```

**How to Update Order Status:**

1. Click dropdown: "Update Status"
2. Select new status:
   - **confirmed** → Order received, awaiting production approval
   - **production** → Mockup/design phase
   - **packed** → Items packed & ready
   - **shipped** → In transit
   - **delivered** → Customer received
3. Optional: Add note (e.g., "Shipped via Delhivery")
4. Click "Update"
5. **Timeline auto-updates** with your change + timestamp

---

### ⚙️ Settings Hub (`/admin/settings`)

Central place to configure your platform. Six sections:

#### 1️⃣ **Shipping Zones** (`/admin/settings/zones`)

Define geographic delivery zones with flat rates.

**Why?** Different states have different shipping costs.

**Table View:**
| Zone Name | States | Flat Rate | ETA | Active | Actions |
|-----------|--------|-----------|-----|--------|---------|
| North | DL, UP, HR, PB | ₹150 | 3-5d | ✓ | Edit, Delete |
| South | TN, KA, AP | ₹200 | 5-7d | ✓ | Edit, Delete |

**How to Add a Zone:**
1. Click **"Add Zone"** button
2. Fill form:
   - **Zone Name:** "North"
   - **States:** Select multiple (DL, UP, HR, PB, JK, etc.)
   - **Flat Rate:** ₹150 (per order, any qty)
   - **ETA Min Days:** 3
   - **ETA Max Days:** 5
   - **Active:** Toggle ON
3. Click **"Save"**
4. Zone appears in customer's Step 4 (Pricing) dropdown

**How to Edit a Zone:**
1. Click **"Edit"** on a zone row
2. Update fields
3. Click **"Save"**

**How to Delete a Zone:**
1. Click **"Delete"**
2. Confirm deletion
3. ⚠️ Customers can't select deleted zones

---

#### 2️⃣ **Packaging** (`/admin/settings/packaging`)

Define gift wrapping/packaging options (optional per-unit add-on).

**Table View:**
| Name | Price | Sort Order | Active | Actions |
|------|-------|-----------|--------|---------|
| Kraft Box | ₹25 | 1 | ✓ | Edit, Delete |
| Premium Velvet | ₹80 | 2 | ✓ | Edit, Delete |
| Gift Bag | ₹10 | 3 | ✗ | Edit, Delete |

**How to Add Packaging:**
1. Click **"Add Package"**
2. Fill form:
   - **Name:** "Kraft Box"
   - **Description:** "Natural kraft paper with tissue lining" (optional)
   - **Price per Unit:** ₹25
   - **Sort Order:** 1 (display order)
   - **Active:** Toggle ON
3. Click **"Save"**
4. Appears in customer's Step 3 (Customize) as checkbox

**Customer sees:**
```
[x] Kraft Box (+₹25/unit)
[ ] Premium Velvet (+₹80/unit)
[ ] Gift Bag (+₹10/unit)
```

---

#### 3️⃣ **Add-ons** (`/admin/settings/addons`)

Optional gift items (greeting cards, thank-you notes, etc.)

**Table View:**
| Name | Price | Sort Order | Active | Actions |
|------|-------|-----------|--------|---------|
| Greeting Card | ₹30 | 1 | ✓ | Edit, Delete |
| Custom Note | ₹50 | 2 | ✓ | Edit, Delete |

**How to Add Add-on:**
1. Click **"Add Add-on"**
2. Fill form:
   - **Name:** "Greeting Card"
   - **Price per Unit:** ₹30
   - **Description:** (optional)
   - **Active:** ON
3. Click **"Save"**

**Customer sees:**
```
☐ Greeting Card (+₹30/unit)
☐ Custom Note (+₹50/unit)
```

Multiple can be selected.

---

#### 4️⃣ **Coupons** (`/admin/settings/coupons`)

Discount/promo codes customers can use at checkout.

**Table View:**
| Code | Type | Amount | Min Order | Expires | Used | Active | Actions |
|------|------|--------|-----------|---------|------|--------|---------|
| DEMO10 | % | 10% | ₹5,000 | 30 Apr | 0/50 | ✓ | Edit, Delete |
| LAUNCH20 | ₹ | ₹1,000 | ₹10,000 | 30 May | 12/100 | ✓ | Edit, Delete |

**How to Create a Coupon:**
1. Click **"Add Coupon"**
2. Fill form:
   - **Code:** "DEMO10" (uppercase, no spaces)
   - **Type:** Choose:
     - **Percent** → "10%" off
     - **Flat ₹** → "₹1,000" off
   - **Value:** 10 (for %) or 1000 (for ₹)
   - **Min Order Value:** ₹5,000 (must spend this much to use)
   - **Expiry Date:** Date picker
   - **Usage Limit:** 50 (max uses)
   - **Description:** "10% launch week discount"
   - **Active:** ON
3. Click **"Save"**

**Customer sees in Step 4:**
```
Have a coupon? [DEMO10    ]
✓ Applied! 10% off = -₹5,000
```

**Auto-validation:**
- Code exists?
- Not expired?
- Usage < limit?
- Subtotal >= min order?

---

#### 5️⃣ **Platform Settings** (`/admin/settings/platform`)

Global configuration for fees, GST, margins.

**Cards View:**

**Razorpay Settings**
| Key | Value | Action |
|-----|-------|--------|
| RAZORPAY_FEE_PCT | 2 | Edit |
| RAZORPAY_FEE_GST_PCT | 18 | Edit |

**GST Settings**
| Key | Value | Action |
|-----|-------|--------|
| SELLER_STATE_CODE | DL | Edit |
| SELLER_GSTIN | 07XXXXX1Z5 | Edit |

**Margin Settings**
| Key | Value | Action |
|-----|-------|--------|
| DEFAULT_MARGIN_PCT | 25 | Edit |

**How to Edit:**
1. Click **"Edit"** on a setting
2. Change value (e.g., RAZORPAY_FEE_PCT from 2 to 2.5)
3. Click **"Save"**
4. **Effect:** Immediately applied to all new orders

**What each means:**
- **RAZORPAY_FEE_PCT:** Payment gateway charge (passed to customer)
- **RAZORPAY_FEE_GST_PCT:** GST on the fee itself (18% standard)
- **SELLER_STATE_CODE:** Your business state for GST routing
- **SELLER_GSTIN:** Your GST registration number
- **DEFAULT_MARGIN_PCT:** Cost markup (internal, not shown to customers)

---

#### 6️⃣ **Users & Roles** (`/admin/settings/users`)

Manage who can do what (already fully built).

**Table View:**
| User | Email | Role | Company | Actions |
|------|-------|------|---------|---------|
| Rajesh K | rajesh@acme.com | company_admin | Acme Corp | Change Role |
| Priya S | priya@acme.com | company_member | Acme Corp | Change Role |

**How to Change a User's Role:**
1. Click **"Change Role"** on a user
2. Select new role from dropdown
3. Click **"Save"**
4. **Effect:** Immediate. User's permissions update on next login.

**Role options:**
- `company_member` (default, can place orders)
- `company_admin` (can manage team + orders)
- `super_admin` (full admin access)
- `vendor` (vendor portal only)
- `reseller` (special pricing)

---

## Adding Products

There are three ways to add products to GiftCraft:

### Method 1: Via Admin API (Recommended for bulk imports)

Create products with tiered pricing via REST API.

**Endpoint:** `POST /api/admin/products`

**Request:**
```json
{
  "name": "Premium Coffee Mug",
  "sku": "MUG-001",
  "descriptionShort": "High-quality ceramic mug",
  "descriptionLong": "Perfect for corporate gifting...",
  "material": "Ceramic",
  "hsnCode": "6912",
  "moq": 25,
  "priceTiers": [
    {
      "minQty": 25,
      "maxQty": 49,
      "sellPrice": "180.00"
    },
    {
      "minQty": 50,
      "maxQty": 99,
      "sellPrice": "160.00"
    },
    {
      "minQty": 100,
      "maxQty": null,
      "sellPrice": "140.00"
    }
  ],
  "categoryId": "cat-001",
  "imageUrl": "https://...image.jpg",
  "isActive": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "prod-123",
    "name": "Premium Coffee Mug",
    "sku": "MUG-001",
    "priceTiers": [...]
  }
}
```

---

### Method 2: Via Database Seeding Script

For development/testing with sample data:

```bash
npx tsx scripts/seed-demo-products.ts
```

This script:
- Creates 3 demo products (Hat, Quarter-Zip, Crew Tee)
- Creates 20 price tiers (bulk discounts)
- Creates 3 sample collections/packs
- Creates 3 categories
- Creates 2 HSN codes

**To clean up later:**
```bash
npx tsx scripts/cleanup-demo-products.ts
```

---

### Method 3: Manual Admin UI (Future Sprint)

Admin UI for adding products graphically (coming in Stage 2).

---

## Managing Settings

All settings are configured in `/admin/settings`. Here's the typical setup workflow:

### 🚀 Initial Setup (First Time)

**Step 1: Define Shipping Zones**
1. Go to `/admin/settings/zones`
2. Add zones for your delivery coverage:
   - North (DL, UP, HR, PB) - ₹150, 3-5 days
   - South (TN, KA, AP) - ₹200, 5-7 days
   - East (WB, OR, JH) - ₹180, 4-6 days

**Step 2: Set Up Packaging Options**
1. Go to `/admin/settings/packaging`
2. Add wrapping options:
   - Kraft Box - ₹25
   - Premium Velvet - ₹80
   - Gift Bag - ₹10

**Step 3: Add Optional Add-ons**
1. Go to `/admin/settings/addons`
2. Add gift items:
   - Greeting Card - ₹30
   - Custom Note - ₹50
   - Thank You Card - ₹20

**Step 4: Create Promo Codes**
1. Go to `/admin/settings/coupons`
2. Create launch campaign codes:
   - DEMO10 (10% off) - Min ₹5,000, expires in 1 week
   - WELCOME20 (₹1,000 off) - Min ₹10,000, unlimited uses

**Step 5: Verify Platform Settings**
1. Go to `/admin/settings/platform`
2. Confirm:
   - Razorpay fee: 2% + 18% GST ✓
   - Your state code: DL ✓
   - Your GSTIN: 07XXXXX1Z5 ✓

**Done!** Your platform is ready for customers.

---

## Customer Journey

Here's the complete flow from a customer's perspective:

### 🏠 **Step 0: Homepage** (`/`)

Customer lands on vibrant Bento-styled homepage showing:
- Hero section: "Corporate Gifting Made Easy"
- Trust badges (delivery times, customer count)
- Occasion grid (Corporate, Festival, Wellness, etc.)
- Featured products slider
- How it works (5 steps)
- Testimonials
- Call-to-action: "Start Building"

**Customer action:** Clicks "Start Building" → redirected to `/builder`

---

### 🏪 **Optional: Browse Catalog** (`/catalog`)

Alternative path: Customer wants to browse before building.

**Features:**
- Product grid with images
- **Left sidebar filters:**
  - Category (Mugs, Tees, Caps, etc.)
  - Price range slider
  - Occasion tags
  - Material filter
- **Each product card shows:**
  - Image on gray-50 background
  - Product name
  - Description snippet
  - **"Price from ₹180"** (lowest tier)
  - "Add to Pack" button

**Customer action:** Click "Add to Pack" on a product → enters builder at Step 2

---

### 🎁 **Step 1: Choose Occasion** (`/builder?step=1`)

Customer selects why they're gifting.

**Options:**
```
┌─────────────────────────────────────────┐
│ CHOOSE OCCASION                         │
├─────────────────────────────────────────┤
│                                         │
│ ☐ Corporate (MOQ: 25)                  │
│ ☐ Festival (MOQ: 10)                   │
│ ☐ Welcome (MOQ: 15)                    │
│ ☐ Wellness (MOQ: 20)                   │
│ ☐ Appreciation (MOQ: 25)                │
│                                         │
│              [Continue]                 │
│                                         │
└─────────────────────────────────────────┘
```

**Why MOQ?**
- Different occasions have different minimum order quantities
- Corporate orders need 25+ units (B2B)
- Festival orders can be smaller (10 units)

**Customer action:** Select occasion → Click "Continue" → Step 2

---

### 🛍️ **Step 2: Select Products** (`/builder?step=2`)

Customer browses and picks products.

**Left sidebar:**
- Category filter
- Price range
- Search by name

**Right grid:**
- Product cards (4 per row on desktop)
- Each shows:
  - Large image
  - Name + description
  - **Tiered pricing:**
    ```
    ₹180/unit (25-49 qty)
    ₹160/unit (50-99 qty)
    ₹140/unit (100+ qty)
    ```
  - "Add to Pack" button

**Drag slider for featured products** (no arrow buttons, per Bento design)

**Right sidebar: Build Summary**
```
Your Gift Pack:

1. Coffee Mug
   Qty: 100
   Price: ₹14,000
   [Remove]

2. Premium Pen
   Qty: 100
   Price: ₹5,000
   [Remove]

─────────────
Subtotal: ₹19,000
```

**Customer action:** Add products → Click "Next" → Step 3

---

### 🎨 **Step 3: Customize** (`/builder?step=3`)

Customer personalizes their pack.

**Sections:**

**1. Delivery Mode**
```
How will gifts be delivered?

◉ Single shipment (1 address)
○ Individual delivery (to each recipient)
```

**2. Packaging** (Optional, +price per unit)
```
Add gift wrapping?

☐ Kraft Box (+₹25/unit)
☐ Premium Velvet (+₹80/unit)
☐ Gift Bag (+₹10/unit)
```

**3. Add-ons** (Optional, multiple allowed)
```
Add optional items?

☐ Greeting Card (+₹30/unit)
☐ Custom Note (+₹50/unit)
☐ Thank You Card (+₹20/unit)
```

**4. Upload Branding Assets**
```
Your Logo (optional)
[Upload image] or [Provide URL]

CSV for personalization (optional)
[Upload CSV] — "name, email, address"

Special Instructions
[Large text box]
```

**5. Preview**
```
Your pack preview:
- 100x Coffee Mug (₹14,000)
- 100x Premium Pen (₹5,000)
- 100x Kraft Box (₹2,500)
- 100x Greeting Card (₹3,000)

Subtotal: ₹24,500
```

**Customer action:** Customize options → Click "Review Pricing" → Step 4

---

### 💰 **Step 4: Review Pricing** (`/builder?step=4`)

Customer reviews final costs before checkout.

**Pricing breakdown:**
```
┌──────────────────────────────────────┐
│ YOUR GIFT PACK PRICING                │
├──────────────────────────────────────┤
│                                       │
│ 100x Coffee Mug @ ₹140/unit  ₹14,000 │
│ 100x Premium Pen @ ₹50/unit    ₹5,000 │
│                                       │
│ PRODUCT SUBTOTAL             ₹19,000 │
│                                       │
│ Packaging (Kraft Box)         +₹2,500 │
│ Add-ons (Card + Note)         +₹5,000 │
│ ─────────────────────────────────────│
│ SUBTOTAL                     ₹26,500 │
│                                       │
│ Select Delivery Zone:                 │
│ ┌──────────────────────────────────┐ │
│ │ ▼ North (DL, UP, HR, PB)        │ │
│ │   ETA: 3-5 business days        │ │
│ └──────────────────────────────────┘ │
│                                       │
│ Shipping (Flat Rate)           +₹150 │
│                                       │
│ SUBTOTAL (Before Tax)        ₹26,650 │
│                                       │
│ GST (18% CGST+SGST)          +₹4,797 │
│ Razorpay Fee (2.36%)           +₹631 │
│ ─────────────────────────────────────│
│                                       │
│ GRAND TOTAL                 ₹32,078  │
│                                       │
│ Have a coupon?  [DEMO10      ] ✓ OK  │
│ Discount applied: -₹3,250 (10%)      │
│                                       │
│ FINAL TOTAL                 ₹28,828  │
│                                       │
│            [PLACE ORDER]              │
│            [SAVE AS QUOTE]            │
│                                       │
└──────────────────────────────────────┘
```

**Key features:**
- ✅ **Price updates in real-time** as customer changes quantity/options
- ✅ **GST calculated per HSN code** (same-state = CGST+SGST, cross-state = IGST)
- ✅ **Razorpay fee shown separately** (2% + 18% GST = 2.36%)
- ✅ **⚠️ NO "Branding Cost" line** (included in base price per CLAUDE.md)
- ✅ **Coupon validation** (checks code, expiry, usage limit, min order)
- ✅ **Save as Quote** option (no payment yet, send to approver)

**Customer action:**
- Option A: Click **"Place Order"** → Checkout with Razorpay
- Option B: Click **"Save as Quote"** → Generates shareable PDF link

---

### 💳 **Step 5: Checkout** (`/checkout`)

Customer reviews and pays.

**Page layout:**

**Left: Order Summary**
```
Your Order
─────────────
100x Coffee Mug    ₹14,000
100x Premium Pen    ₹5,000
Packaging           ₹2,500
Add-ons             ₹5,000
─────────────────────────
Subtotal           ₹26,500
Shipping             ₹150
GST                ₹4,797
Razorpay Fee         ₹631
─────────────────────────
GRAND TOTAL        ₹32,078
```

**Right: Payment Form**
```
Billing Details
───────────────
Company: [text]
Contact Person: [text]
Email: [email]
Phone: [phone]
Address: [address]

   [CONTINUE TO PAYMENT]
```

**Customer enters:**
- Company name
- Contact person (receiver name)
- Email (for order confirmation)
- Phone (for delivery contact)
- Full delivery address

**Customer action:** Click "Continue to Payment" → Razorpay modal opens

---

### 💬 **Razorpay Payment Modal**

Razorpay hosted checkout appears:
```
┌──────────────────────────────────┐
│ RAZORPAY CHECKOUT                 │
│                                   │
│ Amount: ₹32,078                   │
│                                   │
│ [Enter Card Details]              │
│ [Enter UPI]                       │
│ [Other Payment Methods]           │
│                                   │
│ [PAY NOW]                         │
│                                   │
└──────────────────────────────────┘
```

**Payment methods (Razorpay test mode):**
- Credit/Debit card
- UPI (Google Pay, PhonePe, etc.)
- Netbanking
- Wallet

**Test cards:**
- Success: `4111 1111 1111 1111` (any future date)
- Failure: `4000 0000 0000 0002` (any future date)

---

### ✅ **Success Page** (`/orders/[id]/success`)

Payment successful!

```
┌──────────────────────────────────┐
│ 🎉 ORDER PLACED SUCCESSFULLY!    │
│                                   │
│ Order Number: ORD-001            │
│ Confirmation sent to: rajesh@... │
│                                   │
│ What happens next?               │
│ 1. You'll get an email with     │
│    invoice & timeline            │
│ 2. Our team will start mockup   │
│    design in 24 hours            │
│ 3. You'll approve mockup via    │
│    email link                    │
│ 4. Production starts after       │
│    approval                      │
│ 5. Delivery in 3-5 days          │
│                                   │
│ [VIEW ORDER] [BACK TO HOME]      │
│                                   │
└──────────────────────────────────┘
```

**Customer receives:**
- Email with order confirmation
- Invoice PDF attached
- Link to track order status (`/orders/[id]/track`)

---

### 📦 **Track Order** (`/orders/[id]/track`)

Customer can check order status anytime.

```
Order ORD-001 — Premium Mug Pack

Timeline:
─────────────────────────────────────
✅ Confirmed
   Apr 22, 2:15 PM
   Order received & payment verified

⏳ Mockup Pending
   Apr 22, 2:15 PM
   Design team creating mockup

⏳ Mockup Approved
   Awaiting customer approval

⏳ Production
   Scheduled to start after approval

⏳ Packed
   Items will be packed before shipping

⏳ Shipped
   Tracking link will appear here

⏳ Delivered
   Final delivery status

─────────────────────────────────────
```

**Features:**
- Real-time status updates
- Timestamps on each status change
- Notes from admin (e.g., "Shipped via Delhivery #1234567")
- Contact button if issues

---

## Order Management

### Admin's View of Orders

Once a customer places an order, admin sees it in `/admin/orders`.

### Order Statuses (14 total)

```
draft              Customer building (not submitted yet)
quote_sent        Quote sent to approver
confirmed         ✓ Payment received, awaiting production
mockup_pending    Design mockup being created
mockup_approved   ✓ Mockup approved, ready for production
production        ✓ Being manufactured
quality_check     ✓ QC photos uploaded
packed            ✓ Packed & ready to ship
shipped           ✓ In transit
in_transit        Still in transit
delivered         ✓ Delivered to customer
completed         Order fully completed
cancelled         ✗ Cancelled by customer or admin
refunded          ✗ Refund processed
```

### How Admin Processes an Order

**Timeline:**

**Hour 0 (Order Placed)**
```
Order ORD-001 placed
Status: confirmed
Admin action: Review details
```

**Day 1 (Design Phase)**
```
Admin updates: Status → mockup_pending
(Design team creates mockup, uploads as image/PDF)
```

**Day 2 (Approval)**
```
Email sent to customer with mockup
Customer approves design
Status auto-updates → mockup_approved
```

**Day 3-5 (Production)**
```
Admin updates: Status → production
Manufacturing team works on it
```

**Day 8 (QC Check)**
```
QC photos uploaded by vendor
Admin updates: Status → quality_check
Admin reviews photos & approves
```

**Day 9 (Packing)**
```
Admin updates: Status → packed
Note added: "Items packed, ready for shipment"
```

**Day 10 (Shipping)**
```
Admin updates: Status → shipped
Note added: "Delhivery tracking #1234567"
(Customer gets tracking link automatically)
```

**Day 13 (Delivery)**
```
Status auto-updates → delivered
(Customer gets delivery confirmation email)
```

**Day 14 (Completion)**
```
Admin marks: Status → completed
(Optional: request feedback from customer)
```

### Admin's Step-by-Step Process

**1. Open `/admin/orders`**
- See all orders in a table
- Filter by status, search by order number
- Click "View" on an order

**2. Review Order Details**
- Left: Customer info, items, timeline
- Right: Status updater, totals

**3. Update Status**
```
Current Status: confirmed
Change to: [▼ Select Status]

Optional Note: [Mockup ready, sending for approval]

[UPDATE]
```

**4. Save**
- Click **"Update"**
- Status changes immediately
- Email sent to customer with note
- Timeline entry created with timestamp

---

## Testing Checklist

Use this checklist to verify Phase 1 is working correctly:

### 🏠 Homepage
- [ ] Homepage loads without errors
- [ ] All sections visible (hero, trust, occasions, products, how-it-works, testimonials)
- [ ] Featured products slider drags smoothly (no arrow buttons)
- [ ] CTA buttons redirect to builder or catalog
- [ ] Mobile responsive (hamburger menu appears)

### 🏪 Catalog
- [ ] Products load in grid
- [ ] Filters work (category, price, material)
- [ ] Search by product name works
- [ ] Product cards show tiered pricing ("Price from ₹180")
- [ ] Click "Add to Pack" → goes to builder Step 2
- [ ] Images display on gray-50 background

### 🎁 Gift Builder
- [ ] **Step 1:** Occasion selection with MOQ labels
- [ ] **Step 2:** Product selection with drag slider
- [ ] **Step 2:** Quantity selector updates price in real-time
- [ ] **Step 3:** Packaging checkboxes add prices correctly
- [ ] **Step 3:** Add-ons checkboxes work (multiple allowed)
- [ ] **Step 3:** Logo upload works (or URL input)
- [ ] **Step 4:** Pricing breakdown shows all line items
- [ ] **Step 4:** **NO "Branding Cost" line** (must not appear)
- [ ] **Step 4:** Razorpay fee shown as separate line
- [ ] **Step 4:** GST calculated correctly (18% for same state)
- [ ] **Step 4:** Coupon code validation works
- [ ] **Step 4:** "Save as Quote" generates PDF link

### 💳 Checkout
- [ ] Checkout form appears
- [ ] Billing fields required
- [ ] Address auto-formatted
- [ ] "Continue to Payment" opens Razorpay modal
- [ ] Test payment with Razorpay test card works
- [ ] Success page appears after payment
- [ ] Email sent with order confirmation

### 📦 Order Tracking
- [ ] `/orders/[id]/track` page accessible
- [ ] Timeline shows status steps
- [ ] Status updates reflect in timeline
- [ ] Shipping tracking link appears when shipped

### 🔐 Authentication
- [ ] Login button redirects to Google OAuth
- [ ] Google sign-in works
- [ ] User created in database on first login
- [ ] Dashboard accessible after login
- [ ] Logout works

### 👨‍💼 Admin Dashboard
- [ ] `/admin` requires `super_admin` role
- [ ] Non-admin redirected to `/unauthorized`
- [ ] KPI cards show real order counts
- [ ] Revenue chart displays correctly
- [ ] Recent orders list appears

### 📋 Admin Orders
- [ ] `/admin/orders` shows all orders in table
- [ ] Status filter works
- [ ] Search by order # works
- [ ] Pagination works (Prev/Next buttons)
- [ ] Click order → detail page loads
- [ ] Status dropdown shows all 14 statuses
- [ ] Update status → timeline entry created
- [ ] Status email sent to customer
- [ ] Order total breakdown correct

### ⚙️ Admin Settings
- [ ] `/admin/settings` shows 6 section cards
- [ ] **Zones:** Add/edit/delete zones work
- [ ] **Packaging:** Add/edit/delete packages work
- [ ] **Add-ons:** Add/edit/delete add-ons work
- [ ] **Coupons:** Create code, verify usage limit, expiry
- [ ] **Platform:** Edit Razorpay fee % (and verify in next order)
- [ ] **Users:** Change user role (verify on next login)

### 💰 Pricing (Critical)
- [ ] **Tiered pricing:** Price changes with quantity
- [ ] **Example:** Qty 25 = ₹180, Qty 100 = ₹140
- [ ] **Packaging price:** Added per unit (qty × price)
- [ ] **Add-ons price:** Added per unit (qty × price)
- [ ] **Shipping:** Flat rate by zone (no qty adjustment)
- [ ] **GST:** 18% CGST+SGST for same state, IGST for other
- [ ] **Razorpay:** 2% + 18% GST = 2.36% (separate line)
- [ ] **Coupon:** % or ₹ off, min order check, usage limit check
- [ ] **Decimal places:** All prices show 2 decimals (₹14,000.00)

### 🌐 Responsive Design
- [ ] Desktop (1920px): Full layout, grid 4 columns
- [ ] Tablet (768px): Grid 2 columns, sidebar stacks
- [ ] Mobile (375px): Grid 1 column, hamburger menu, stacked
- [ ] All buttons touch-friendly (min 44px height)
- [ ] No horizontal scroll

### ♿ Accessibility
- [ ] Images have alt text
- [ ] Color contrast meets WCAG AA
- [ ] Form labels associated with inputs
- [ ] Keyboard navigation works (Tab through form)
- [ ] Screen reader friendly (semantic HTML)

### 🔒 Security
- [ ] No sensitive data in URLs (prices, costs)
- [ ] CORS properly set for API calls
- [ ] CSRF tokens on forms
- [ ] SQL injection protected (Prisma parameterized)
- [ ] XSS protected (React escapes by default)
- [ ] Admin routes require `super_admin` role

### 📧 Email
- [ ] Order confirmation sent after payment
- [ ] Invoice PDF attached to email
- [ ] Order tracking link in email works
- [ ] Status update emails sent when admin changes status
- [ ] All emails use correct sender (giftcraft@...)

### 🐛 Errors
- [ ] 404 page appears for invalid URLs
- [ ] Error boundary catches crashes
- [ ] Error messages user-friendly (not code dumps)
- [ ] Retry buttons work after errors
- [ ] No console errors (JavaScript)

---

## FAQ & Troubleshooting

### Customer Questions

**Q: What's the minimum order quantity?**
A: Depends on occasion chosen in Step 1:
- Corporate: 25 units
- Festival: 10 units
- Welcome: 15 units
- Wellness: 20 units

**Q: Can I customize individual gifts (different names)?**
A: Yes! In Step 3, upload a CSV file:
```
name,email,address
Rajesh Kumar,rajesh@company.com,Delhi
Priya Singh,priya@company.com,Bangalore
```

**Q: What payment methods do you accept?**
A: Razorpay (all methods):
- Credit/Debit card
- UPI (Google Pay, PhonePe)
- Netbanking
- Wallets

**Q: How long does delivery take?**
A: Depends on your zone:
- North: 3-5 days
- South: 5-7 days
- East: 4-6 days
(Plus 7-10 days for production)

**Q: Can I save an order and buy later?**
A: Yes! Use "Save as Quote" in Step 4. Get a shareable PDF link to send to approvers.

**Q: How do I track my order?**
A: Visit `/orders/[order-id]/track` or check the email link sent after purchase.

**Q: Can I use a coupon with other discounts?**
A: Only one coupon per order. Coupons are the only discount method in Phase 1.

**Q: What if I want to cancel my order?**
A: Contact support. Admin can mark order as "cancelled" and process refunds.

---

### Admin Questions

**Q: How do I add new products?**
A: Three methods:
1. **API:** POST to `/api/admin/products` with tiered pricing
2. **Seed script:** `npx tsx scripts/seed-demo-products.ts` (demo data only)
3. **UI:** Coming in Stage 2

**Q: Can I change a price after an order is placed?**
A: No. Price is locked when order is confirmed. Future orders use new prices.

**Q: How do I handle damaged goods?**
A: Mark order as "cancelled", process refund. Or use note in status update: "Re-manufacturing units 45-50, will add to shipment."

**Q: Can vendors see orders?**
A: Not in Phase 1. Vendor portal is Stage 2. For now, forward email summaries.

**Q: How do I calculate my margin?**
A: Look at `DEFAULT_MARGIN_PCT` in Platform Settings.
```
Cost Price = (Selling Price) / (1 + Margin%)
Example: If sell price ₹100, margin 25%
Cost price = 100 / 1.25 = ₹80
```

**Q: Can I edit a customer's order after placement?**
A: No. Can only change status (which affects timeline and customer notification). Advise customer to cancel and re-order, or use note to document changes.

**Q: How are GST slabs calculated?**
A: Per HSN code in Prisma schema:
- Hat (HSN 6505): 18%
- Tee (HSN 6204): 18%
For CGST+SGST calculation:
```
If seller state == buyer state:
  CGST = subtotal × 9%
  SGST = subtotal × 9%
Else (cross-state):
  IGST = subtotal × 18%
```

**Q: How do I backup the database?**
A: (Outside scope of this guide, handled by hosting provider)

---

### Developer Questions

**Q: Where's the product API?**
A: 
- GET `/api/products` — list all active
- GET `/api/products/[id]` — single product with tiers
- POST `/api/admin/products` — create (admin only)
- PATCH `/api/admin/products/[id]` — update (admin only)

**Q: How's pricing calculated on the backend?**
A: See `libs/pricing.ts`:
```typescript
function getPriceForQuantity(product, qty) {
  const tier = product.priceTiers.find(t =>
    qty >= t.minQty && (!t.maxQty || qty <= t.maxQty)
  )
  return tier.sellPrice
}
```

**Q: Can I use environment variables for secrets?**
A: Yes. All in `.env.local`:
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
- `DATABASE_URL`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- etc.

**Q: How do I run tests?**
A: (Tests not included in Phase 1. Coming Stage 2.)

**Q: What's the API rate limit?**
A: (No rate limiting in Phase 1. Consider adding in Stage 2.)

---

## Glossary

- **Occasion:** Why customer is gifting (Corporate, Festival, etc.)
- **MOQ:** Minimum Order Quantity (can't order less)
- **Price Tier:** Bulk discount level (qty 25 vs qty 100)
- **HSN Code:** Harmonized System Code for GST classification
- **GST:** Goods & Services Tax (India, 18% standard)
- **CGST:** Central GST (9%, same state)
- **SGST:** State GST (9%, same state)
- **IGST:** Integrated GST (18%, cross-state)
- **SKU:** Stock Keeping Unit (product code)
- **Order Timeline:** Audit trail of status changes
- **Razorpay Fee:** Payment gateway charge (2% + 18% GST)

---

## Support

For issues:
1. Check this guide's FAQ section
2. Check `/error` page (shows error details in dev mode)
3. Contact Arts Shala team (email, Slack, etc.)

---

**Last updated:** April 22, 2026  
**Next phase:** Stage 2 (Vendor Portal, Advanced Analytics, Inventory)
