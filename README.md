# GIVOO

**India's first self-serve bulk corporate gifting platform** — by Arts Shala, Delhi.

Corporate buyers browse products, build branded gift packs, get instant transparent (GST-compliant) pricing, download quote PDFs, and place orders — all without a sales rep. The Arts Shala team manages products, orders, vendors, and clients from a Shopify-style admin dashboard.

---

## Tech Stack

- **Frontend:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Framer Motion
- **Backend:** Node.js · Express · Prisma ORM
- **Database:** PostgreSQL 15 + Redis 7 (Digital Ocean Managed)
- **Auth:** NextAuth.js v5 + Google OAuth (5 roles, stored in DB)
- **Payments:** Razorpay · **Shipping:** Shiprocket · **Storage:** DO Spaces + CDN
- **Hosting:** Digital Ocean App Platform · **Monorepo:** Turborepo

---

## Project Structure

```
apps/web      → Next.js frontend + API routes
apps/api      → Express backend
packages/*    → shared types & pricing engine
```

---

## Getting Started

```bash
npm install                  # install all workspaces
# add your keys to apps/web/.env
npm run db:push              # push Prisma schema to the database
npm run db:seed              # seed sample data
npm run dev                  # start the dev server
```

Open http://localhost:3000

### Useful commands

```bash
npm run build                          # production build
npm run db:studio                      # visual database browser
npm run make-admin -- you@email.com    # promote a user to super_admin
```

---

## Key Business Rules

1. Branding cost is **included** in the product price — never a separate line item.
2. Razorpay fee (~2.36%) is **passed to the customer** as a separate line.
3. Full **Indian GST** compliance (per-product HSN; CGST+SGST or IGST).
4. **Digital Ocean only** — no AWS, no Vercel for backend.
5. Admin dashboard is **Shopify-style** (calm); customer side is vibrant Bento.
6. MOQ enforced at **builder entry**, not as a catalog filter.

---

## Documentation

| File | What it covers |
|------|----------------|
| `CLAUDE.md` | Source of truth — tech stack, design system, business & coding rules |
| `ARCHITECTURE.md` | DB schema, pricing engine, order state machine |
| `API_ENDPOINTS.md` | REST API reference |
| `WORKFLOW_DETAILED.md` | User journeys (client / vendor / admin) |
| `TESTING_AND_EDGE_CASES.md` | Test cases and edge-case matrix |

---

*Confidential — Arts Shala · GIVOO Platform*
