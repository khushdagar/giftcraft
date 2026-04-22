# GiftCraft Platform

## India's First Self-Serve Bulk Gifting Platform

**Corporate Gifting | Wedding Bulk Gifting | Party Return Gifts**

Built by Arts Shala, Delhi | April 2026

---

## What is GiftCraft?

GiftCraft enables corporate buyers to browse 500+ products, assemble custom branded gift packs, get instant transparent pricing with GST compliance, download professional quote PDFs, and place orders — all without speaking to a sales rep. Admin team manages products, orders, vendors, and clients from a Shopify-style dashboard.

---

## Project Files — What Each File Does

| File | Purpose | When to Read |
|------|---------|-------------|
| **README.md** | This file. Project overview, setup, and sprint execution guide. | First |
| **CLAUDE.md** | AI coding rules, tech stack, business rules, design tokens, project structure. | Before ANY code generation |
| **ARCHITECTURE.md** | Database schema, system diagram, pricing engine logic, order state machine, integration specs. | When you need technical depth |
| **WORKFLOW_DETAILED.md** | Step-by-step user journeys for Client, Vendor, and Admin personas. | To understand user flows |
| **PROMPTS.md** | ALL 17 sprint prompts organized by phase. Copy-paste into Claude to build each sprint. | During development — this is your build guide |
| **TESTING_AND_EDGE_CASES.md** | Test cases per sprint + edge case matrix. Run after each sprint. | After each sprint build |

---

## Tech Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui + Framer Motion
- **Backend:** Node.js + Express + TypeScript + Prisma ORM
- **Database:** PostgreSQL 15 (Digital Ocean Managed)
- **Cache/Queue:** Redis 7 (Digital Ocean Managed) + BullMQ
- **Auth:** NextAuth.js v5 + Google OAuth (5 roles via database)
- **Payments:** Razorpay (fee passed to customer)
- **Shipping:** Shiprocket (Stage 2+)
- **Storage:** Digital Ocean Spaces + CDN
- **Hosting:** Digital Ocean App Platform
- **Monorepo:** Turborepo

---

## Non-Negotiable Business Rules

1. **Branding cost is PART of product base price.** No separate branding line item anywhere.
2. **Razorpay fee (~2.36%) paid by customer.** Shown as separate line item at checkout.
3. **Full Indian GST compliance.** Per-product HSN codes. CGST+SGST (intra-state) or IGST (inter-state).
4. **Digital Ocean ONLY.** No AWS. No Vercel for backend.
5. **Admin dashboard = Shopify style.** White background, left sidebar, card-based layout.
6. **5-stage rollout.** Never build Stage 3 features in Stage 1.
7. **No inventory first 6 months.** Source from vendors on demand.
8. **MOQ at builder entry, NOT catalog filter.** All products visible for browsing.

---

## Before You Start — Prerequisites (Do This FIRST)

### 1. Create Accounts and Get API Keys (1 hour)

| Service | What to Do | What You Get |
|---------|-----------|-------------|
| **Google Cloud Console** | Create OAuth 2.0 credentials at console.cloud.google.com. Add authorized redirect URI: http://localhost:3000/api/auth/callback/google | Client ID + Client Secret |
| **Razorpay** | Already set up. Get keys from dashboard. | Key ID + Key Secret + Webhook Secret |
| **Digital Ocean** | Create: Managed PostgreSQL, Managed Redis, Spaces bucket "giftcraft-dev" with CDN | Database URL, Redis URL, Spaces keys |
| **SendGrid** | Sign up. Verify sender email. | API Key |
| **GitHub** | Create private repo "giftcraft" | Repo URL |

### 2. Local Development Setup

Ensure installed: Node.js 20+, npm, Git, VS Code (with Tailwind + Prisma extensions).

### 3. Prepare Product Data (Start Now, Finish by Sprint 2)

Create a spreadsheet with your first 30 products. Each needs:
- Name, Brand, Material, Dimensions (L/W/H cm), Weight (grams)
- HSN Code, GST Rate
- Printing Technique (Laser/Screen/UV/etc.)
- 6-tier pricing: Cost + Sell price at each tier (1-24, 25-49, 50-99, 100-249, 250-499, 500+)
- Primary vendor: name, cost, lead time

This becomes your CSV for bulk upload in Sprint 2.

---

## Development Stages and Sprint Map

| Phase | Sprint | Weeks | What Gets Built | Where to Build |
|-------|--------|-------|----------------|---------------|
| **PHASE 1: MVP** | Sprint 1 | 1-2 | Monorepo + DB + Auth + Layouts | Claude Chat |
| | Sprint 2 | 3-4 | Product CRUD + Catalog + Filters | Claude Chat |
| | Sprint 3 | 5-6 | Pricing Engine + Builder Steps 1-2 | Claude Chat |
| | Sprint 4 | 7-8 | Builder Steps 3-4 + Quote + Checkout | Claude Chat |
| | Sprint 5 | 9-10 | Admin Orders + Homepage + Static Pages | Claude Chat |
| | Sprint 6 | 11-12 | Settings + Polish + SEO + Launch Prep | Claude Chat |
| **PHASE 2: OPS** | Sprint 7 | 13-14 | 12-Stage Pipeline + SLA + Design Approval | Claude Code CLI |
| | Sprint 8 | 15-16 | Disputes + Shiprocket + Vendor Mgmt Full | Claude Code CLI |
| | Sprint 9 | 17-19 | CRM + Automation + Planner + Analytics | Claude Code CLI |
| **PHASE 3: GROWTH** | Sprint 10 | 20-21 | Gift of Choice + Build Your Box + Samples | Claude Code CLI |
| | Sprint 11 | 22-24 | Wallet + Multi-User + Inventory + Reseller | Claude Code CLI |
| | Sprint 12 | 25-26 | Occasions Engine + Eco Dashboard + RFQ | Claude Code CLI |
| **PHASE 4: ADVANCED** | Sprint 13 | 27-29 | Mockup Generator + Design Studio | Claude Code CLI |
| | Sprint 14 | 30-32 | Sequences + ROI + Go High Level + White-Label | Claude Code CLI |
| **PHASE 5: SCALE** | Sprint 15 | 33-35 | HRIS + Slack + Teams | Claude Code CLI |
| | Sprint 16 | 36-38 | Wedding + Party Modules + API | Claude Code CLI |
| | Sprint 17 | 39-41 | Zapier + Mobile App + AI | Claude Code CLI |

---

## How to Execute Each Sprint

### Phase 1 (Sprints 1-6): Using Claude Chat

1. Open a **NEW Claude Chat conversation** (fresh, not this one)
2. First message: paste the entire content of **CLAUDE.md** as context
3. Second message: paste the sprint prompt from **PROMPTS.md** for that sprint
4. Claude generates all files. Download them into your repo.
5. Run the test cases from **TESTING_AND_EDGE_CASES.md** for that sprint
6. If ALL tests pass → commit code, move to next sprint
7. If any test fails → fix in the same conversation before moving on

### Phase 2-5 (Sprints 7-17): Using Claude Code CLI

1. Open VS Code terminal in your project root
2. Run `claude` to start Claude Code
3. Paste: "Read CLAUDE.md first. Then do this:" followed by the sprint prompt from PROMPTS.md
4. Claude Code reads your codebase and makes changes directly
5. Run tests from TESTING_AND_EDGE_CASES.md
6. If all pass → commit, next sprint

### IMPORTANT RULES
- **Never skip a sprint.** Each builds on the previous.
- **Never mix sprints.** Complete one before starting the next.
- **Always run tests** before moving on.
- **New Claude Chat per sprint** (Phase 1). Long conversations degrade quality.
- **Commit after each sprint.** Branch name: `stage-X/sprint-Y/description`

---

## After Phase 1 Launch

Phase 1 gives you a fully functional, revenue-generating platform. A corporate client can browse, build gift packs, get quotes, pay, and track orders. Your team can manage products, pricing, orders, and vendors.

**You can start taking real orders after Phase 1.**

Phases 2-5 add operational depth, growth features, advanced capabilities, and integrations — but the core business runs on Phase 1.

---

## Quick Commands

```bash
npm install                     # Install all dependencies
npm run dev                     # Start dev server (all workspaces)
npm run build                   # Production build
npx prisma db push              # Push schema to database
npx prisma db seed              # Seed initial data
npx prisma studio               # Visual database browser
npm run test                    # Run all tests
npm run lint                    # Lint all code
npm run type-check              # TypeScript check
```

---

*Confidential — Arts Shala | GiftCraft Platform*
