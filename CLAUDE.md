# CLAUDE.md — AI Instructions for GIVOO Platform

> **Read this ENTIRE file before writing ANY code. This is the single source of truth.**

---

## 1. PROJECT OVERVIEW

**GIVOO** is India's first self-serve bulk corporate gifting platform by Arts Shala (Delhi). Corporate buyers browse products, build branded gift packs, get instant transparent pricing, and place orders — all without a sales rep.

**UI Goal:** Vibrant, colorful, product-focused, high-impact. The platform should feel premium and fun — not like a boring B2B portal. Think "if Notion's clean layout met a candy store's energy."

---

## 2. TECH STACK (Mandatory — Do Not Substitute)

| Layer | Technology | Notes |
|-------|-----------|-------|
| Monorepo | Turborepo | apps/web, apps/api, packages/types, packages/pricing |
| Frontend | Next.js 14 App Router + TypeScript | App directory only. No pages/. |
| Styling | Tailwind CSS v3 + shadcn/ui | Extended with custom Bento tokens |
| Animations | Framer Motion v11+ | Drag sliders, spring physics, page transitions |
| State (Client) | Zustand | Gift Builder state |
| State (Server) | TanStack React Query v5 | All data fetching |
| Backend | Node.js + Express + TypeScript | |
| ORM | Prisma | PostgreSQL connector |
| Database | PostgreSQL 15 (Digital Ocean Managed) | NOT AWS |
| Cache/Queue | Redis 7 (Digital Ocean Managed) + BullMQ | |
| **Auth** | **NextAuth.js (Auth.js) v5 + Google OAuth** | **Database sessions via Prisma adapter** |
| Payments | Razorpay | Fee passed to customer |
| Shipping | Shiprocket (Stage 2+) | Manual zones Stage 1 |
| Email | React Email + SendGrid | |
| WhatsApp | Interakt or Wati API | |
| File Storage | Digital Ocean Spaces + CDN | NOT AWS S3 |
| Hosting | Digital Ocean App Platform | NOT Vercel for backend |
| PDF | @react-pdf/renderer | NOT Puppeteer until Stage 4 |
| Monitoring | Sentry + PostHog | |

### Authentication Architecture: NextAuth.js + Google OAuth

GIVOO uses **NextAuth.js v5** (Auth.js) with **Google OAuth** as the primary login method. No Clerk. No custom email/password auth in Stage 1.

**How it works:**
1. User clicks "Sign in with Google" → redirected to Google consent screen
2. Google returns user info (name, email, avatar) → NextAuth creates a session
3. On first login, a `User` record is created in PostgreSQL via Prisma adapter
4. The `User.role` field in the database determines permissions (default: `company_member`)
5. Admin manually promotes users to other roles via the admin dashboard
6. NextAuth middleware protects routes based on session + role checks

**5 Roles (stored in User.role column in PostgreSQL — NOT in Google):**
- `super_admin` — Arts Shala internal team. Full access to /admin/*.
- `company_admin` — Client company account manager. Manages their company's orders and team.
- `company_member` — Client staff. Can browse, build, order. Cannot manage team.
- `vendor` — Vendor portal access only. Views POs, uploads QC photos.
- `reseller` — Places orders on behalf of clients. Commission tracking. (Stage 3)

**Key packages:**
- `next-auth` (v5) — core auth library
- `@auth/prisma-adapter` — stores sessions, accounts, users in PostgreSQL
- `@auth/core` — shared auth types

**Route protection:**
- `/admin/*` — requires `super_admin` role → middleware checks session + role
- `/dashboard/*` — requires any authenticated user → middleware checks session exists
- `/catalog`, `/products/*`, `/pricing`, `/quote/*`, `/approve/*`, `/claim/*` — public, no auth
- API routes: Express middleware verifies NextAuth session token, extracts userId and role

**Why NOT Clerk:**
- No per-user pricing (NextAuth is free and open-source)
- Full control over user data (everything in your own PostgreSQL)
- Google OAuth is the simplest login for corporate users (everyone has Google)
- Role management via database is simpler for this use case
- No vendor lock-in

### DO NOT USE
- ❌ Clerk (@clerk/nextjs) — we use NextAuth.js + Google OAuth
- ❌ AWS (any service) — Digital Ocean only
- ❌ Redux/MobX — use Zustand
- ❌ Axios — use native fetch
- ❌ useEffect + fetch — use React Query
- ❌ CSS Modules / styled-components — use Tailwind
- ❌ Custom modals/dialogs — use shadcn Dialog
- ❌ Float for money — use Decimal(10,2)
- ❌ Custom email/password auth — Google OAuth only in Stage 1

---

## 3. VISUAL DESIGN SYSTEM — "VIBRANT BENTO BLOCKS" (MANDATORY)

This is NOT a generic corporate template. GIVOO's UI must feel alive, colorful, and modern. Every page follows the "Bento Block" philosophy — distinct, rounded tiles with bold typography and pastel accents.

### 3.1 Design Philosophy

- **"Modern Bento Box"**: Every section is a distinct rounded tile or block with clear boundaries. Sections never blur into each other — they're visually separated like a Bento lunch box where each compartment is its own world.
- **Product-First**: Products are the hero. Huge images, minimal surrounding text. Let the products sell themselves.
- **Self-Explanatory**: A first-time visitor should understand the platform in 5 seconds without reading a paragraph. Use visual hierarchy, icons, and chunky headings — not walls of text.
- **Playfully Professional**: Fun enough to feel exciting, professional enough for a CFO to approve a ₹3L order.

### 3.2 Color Palette — Vibrant & Multi-Tonal

```
// tailwind.config.ts — MANDATORY color extensions

colors: {
  // Core
  navy: {
    900: '#1A1A1A',     // Primary text, borders, dark blocks
    800: '#1A3C6E',     // Brand navy — headers, sidebar, CTAs
    700: '#2D5A9E',     // Hover states on navy elements
  },
  
  // Vibrant Accent Blocks (for Bento tiles, badges, category cards)
  block: {
    amber:   { 50: '#FFFBEB', 100: '#FEF3C7', 500: '#F59E0B' },   // Warm — pricing, highlights
    indigo:  { 50: '#EEF2FF', 100: '#E0E7FF', 500: '#6366F1' },   // Cool — tech, corporate
    emerald: { 50: '#ECFDF5', 100: '#D1FAE5', 500: '#10B981' },   // Fresh — eco, success
    rose:    { 50: '#FFF1F2', 100: '#FFE4E6', 500: '#F43F5E' },    // Warm — alerts, festive
    violet:  { 50: '#F5F3FF', 100: '#EDE9FE', 500: '#8B5CF6' },   // Rich — premium, VIP
    sky:     { 50: '#F0F9FF', 100: '#E0F2FE', 500: '#0EA5E9' },   // Light — info, shipping
    orange:  { 50: '#FFF7ED', 100: '#FFEDD5', 500: '#F97316' },   // Energetic — CTAs, party
    teal:    { 50: '#F0FDFA', 100: '#CCFBF1', 500: '#14B8A6' },   // Calm — wellness
  },

  // Functional
  success: '#10B981',
  error:   '#EF4444',
  warning: '#F59E0B',
  
  // Neutrals
  gray: {
    50:  '#FAFAFA',
    100: '#F4F4F5',
    200: '#E4E4E7',
    300: '#D4D4D8',
    400: '#A1A1AA',
    500: '#71717A',
    600: '#52525B',
    700: '#3F3F46',
    800: '#27272A',
    900: '#18181B',
  },
}
```

**Usage Rules:**
- Each major section on a page gets a DIFFERENT accent block colour as its background
- Category cards, occasion cards, and feature tiles each get their own distinct block colour
- Status badges use block colours: Active = emerald, Draft = gray, Archived = rose, Shipped = sky
- Navy-800 for primary text, borders, high-contrast elements. Never pure black (#000000).

### 3.3 Typography — Bold & Confident

**Headings:**
- Hero headings: `text-5xl sm:text-6xl lg:text-7xl font-black tracking-tighter leading-none`
- Section headings: `text-3xl sm:text-4xl font-black tracking-tight`
- Card headings: `text-xl font-bold`
- Step labels: `text-xs font-semibold uppercase tracking-[0.2em] text-gray-500` — above every major section ("STEP 01", "PRICING", "YOUR PACK")

**Body Text:**
- Primary: `text-base text-gray-700 leading-relaxed`
- Secondary: `text-sm text-gray-500`
- Prices: `text-2xl sm:text-3xl font-black tabular-nums`

**Rules:**
- NEVER use font-normal (400) for headings. Minimum font-semibold (600).
- ALWAYS add `tracking-tighter` or `tracking-tight` to headings.
- Price displays ALWAYS use `font-black` (900) and `tabular-nums`.

### 3.4 Component Design — Bento Blocks

**Cards:** `rounded-md border-2 border-gray-200` — never rounded-lg. Always border-2 (2px).

**Buttons:** `rounded-2xl px-8 py-4 font-bold text-lg hover:-translate-y-1 hover:shadow-xl` — chunky with lift.

**Filter Pills:** `rounded-full border-2` — active fills with navy-800.

**Product Images:** Always on `bg-gray-50` background block. Never bare white. `group-hover:scale-105`.

**Badges:** `rounded-full bg-{color}-100 text-{color}-700 px-3 py-1 text-xs font-semibold`

### 3.5 Framer Motion Rules

- **Drag-to-scroll** for product sliders (NOT arrow buttons). `drag="x"` with spring physics.
- **whileInView** fade-up for page sections. `initial={{ opacity:0, y:40 }}` → `animate={{ opacity:1, y:0 }}`.
- **whileHover** lift for cards: `{{ y: -8, boxShadow: "0 20px 40px rgba(0,0,0,0.08)" }}`.
- **AnimatedNumber** for price changes (400ms counting effect).
- Products in builder: `initial={{ opacity:0, scale:0.5, rotate:-10 }}` spring animation.
- **ALWAYS** check `useReducedMotion()`. If true, all durations = 0.

### 3.6 Layout Pattern Summary

- **Homepage:** Hero (pastel gradient) → Trust → Occasion Bento Grid (different color per tile) → Featured Products (drag slider) → How It Works (5 colored blocks) → Collections → Testimonials → CTA block → Footer
- **Catalog:** Left sidebar filters (colorful pills) + Right product grid (Bento cards on gray-50)
- **Product Detail:** 60% massive image on gray-50 | 40% info blocks (pricing on amber-50, delivery on sky-50)
- **Gift Builder:** Numbered steps with labels. Merged view on emerald-50. Total on navy-800 bg.
- **Admin:** SHOPIFY STYLE (clean, calm, NOT Bento). White sidebar, card-based KPIs.

---

## 4. NON-NEGOTIABLE BUSINESS RULES

### RULE 1: Branding Cost in Base Price
Standard printing cost INCLUDED in sell price. NO separate "Branding Cost" line item anywhere.

### RULE 2: Razorpay Fee on Customer
~2.36% passed to customer as SEPARATE line item in builder, PDF, checkout, invoice.

### RULE 3: Indian GST Compliance
Per-product HSN code. Seller = Delhi (DL). Same state = CGST+SGST. Different = IGST.

### RULE 4: MOQ at Builder Entry
No MOQ filter in catalog. MOQ enforced when entering gift builder (Corporate 25, Party 10).

### RULE 5: No Inventory First 6 Months
Source from vendors on demand. Tables exist but unpopulated until Stage 3.

### RULE 6: Admin = Shopify Style (Clean, NOT Bento)
Admin is calm and efficient. Customer-facing is vibrant Bento. Two different design languages.

### RULE 7: Digital Ocean Only
All infra on DO. No AWS.

### RULE 8: Stage Discipline
5 stages. Never implement later-stage features early.

---

## 5. AUTHENTICATION SETUP REFERENCE

### NextAuth.js Configuration

```typescript
// apps/web/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      // Fetch role from database User record
      const dbUser = await prisma.user.findUnique({
        where: { email: user.email! },
        select: { id: true, role: true, companyId: true },
      })
      if (dbUser) {
        session.user.id = dbUser.id
        session.user.role = dbUser.role         // 'super_admin' | 'company_admin' | etc.
        session.user.companyId = dbUser.companyId
      }
      return session
    },
  },
  pages: {
    signIn: "/login",     // Custom Bento-styled login page
    error: "/login",      // Redirect errors to login
  },
})
```

### NextAuth Prisma Schema Addition
```prisma
// These tables are REQUIRED by @auth/prisma-adapter
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

// User model (already exists — add relations)
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  phone         String?
  companyId     String?
  role          UserRole  @default(company_member)
  accounts      Account[]
  sessions      Session[]
  company       Company?  @relation(fields: [companyId], references: [id])
  createdAt     DateTime  @default(now())
}
```

### Middleware for Route Protection
```typescript
// apps/web/middleware.ts
import { auth } from "@/app/api/auth/[...nextauth]/route"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // Admin routes — require super_admin
  if (pathname.startsWith("/admin")) {
    if (!session) return NextResponse.redirect(new URL("/login", req.url))
    if (session.user.role !== "super_admin") {
      return NextResponse.redirect(new URL("/unauthorized", req.url))
    }
  }

  // Dashboard routes — require any auth
  if (pathname.startsWith("/dashboard")) {
    if (!session) return NextResponse.redirect(new URL("/login", req.url))
  }

  // Public routes: /, /catalog, /products, /pricing, /quote, /approve, /claim — no auth needed
  return NextResponse.next()
})

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*"],
}
```

### Custom Login Page (Bento-styled)
```
/login page: 
- Split layout: left half = pastel gradient (amber-50 to indigo-50) with GIVOO tagline
- Right half = white card (rounded-md) with:
  - GIVOO logo
  - "Welcome to GIVOO" text-3xl font-black
  - "Sign in to manage your gifting" text-gray-500
  - Large "Continue with Google" button (rounded-2xl, Google icon, chunky py-4)
  - "For vendor access, contact us" small text below
- Mobile: single column, gradient on top, form below
```

### Permission Hooks
```typescript
// hooks/usePermissions.ts
import { useSession } from "next-auth/react"

export function usePermissions() {
  const { data: session } = useSession()
  const role = session?.user?.role

  return {
    isAuthenticated: !!session,
    isAdmin: role === "super_admin",
    isCompanyAdmin: role === "company_admin",
    isCompanyMember: role === "company_member",
    isVendor: role === "vendor",
    isReseller: role === "reseller",
    canManageProducts: role === "super_admin",
    canPlaceOrders: ["super_admin", "company_admin", "company_member"].includes(role || ""),
    canApproveOrders: ["super_admin", "company_admin"].includes(role || ""),
    canManageTeam: ["super_admin", "company_admin"].includes(role || ""),
    companyId: session?.user?.companyId,
    userId: session?.user?.id,
  }
}
```

---

## 6. ENVIRONMENT VARIABLES

```env
# Database (Digital Ocean Managed PostgreSQL)
DATABASE_URL="postgresql://user:pass@db-host:25060/giftcraft?sslmode=require"

# Redis (Digital Ocean Managed Redis)
REDIS_URL="rediss://default:pass@redis-host:25061"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-a-random-32-char-secret-here"

# Google OAuth
GOOGLE_CLIENT_ID="xxxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxxx"

# Razorpay
RAZORPAY_KEY_ID="rzp_test_xxx"
RAZORPAY_KEY_SECRET="xxx"
RAZORPAY_WEBHOOK_SECRET="xxx"
RAZORPAY_FEE_PERCENTAGE="2"
RAZORPAY_FEE_GST="18"

# Digital Ocean Spaces
DO_SPACES_KEY="xxx"
DO_SPACES_SECRET="xxx"
DO_SPACES_REGION="blr1"
DO_SPACES_BUCKET="giftcraft-dev"
DO_SPACES_ENDPOINT="https://blr1.digitaloceanspaces.com"
DO_SPACES_CDN_ENDPOINT="https://giftcraft-dev.blr1.cdn.digitaloceanspaces.com"

# SendGrid
SENDGRID_API_KEY="SG.xxx"
SENDGRID_FROM_EMAIL="orders@giftcraft.in"
SENDGRID_FROM_NAME="GIVOO"

# WhatsApp
WHATSAPP_API_KEY="xxx"
WHATSAPP_BUSINESS_NUMBER="91XXXXXXXXXX"

# Platform
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_API_URL="http://localhost:4000"
SELLER_GSTIN="07XXXXXXXXX1Z5"
SELLER_STATE_CODE="DL"

# Sentry
SENTRY_DSN="https://xxx@sentry.io/xxx"

# PostHog
NEXT_PUBLIC_POSTHOG_KEY="phc_xxx"
```

---

## 7. CODING STANDARDS

- TypeScript strict mode. No `any`. Zod for API validation.
- Functional components only. Server Components by default.
- React Query for data fetching. react-hook-form + Zod for forms.
- Skeleton loading on all data pages. Error states with retry. Empty states with CTAs.
- Framer Motion with useReducedMotion() check on every animation.
- REST API: `{ success, data?, error? }`. Pagination: `{ page, limit, total }`.
- Prisma singleton. Transactions for multi-table writes. Decimal for all money.
- All price changes logged to PriceAuditLog.
- Google OAuth via NextAuth.js for all auth. Roles from database, not Google.

---

## 8. ALWAYS / NEVER

**ALWAYS:**
1. Use Decimal for money
2. Show Razorpay fee as separate line
3. Calculate GST per product HSN code
4. Check prefers-reduced-motion
5. Use shadcn/ui components
6. Put product images on gray-50 background
7. Use rounded-md for cards, rounded-2xl for buttons
8. Use font-black for headings and prices
9. Use drag-to-scroll sliders (not arrow buttons)
10. Use NextAuth.js + Google OAuth for auth (not Clerk)

**NEVER:**
1. Show "Branding Cost" line to customers
2. Use AWS services
3. Use Clerk (we use NextAuth.js)
4. Build Stage 3+ features in Stage 1
5. Use rounded-lg for cards (always rounded-md)
6. Use font-normal for headings
7. Put product images on bare white
8. Use arrow-button carousels (use drag sliders)
9. Make admin dashboard vibrant (admin is Shopify-calm)
10. Skip quantity pre-step modal in builder
