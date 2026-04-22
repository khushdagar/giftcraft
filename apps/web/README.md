## @giftcraft/web

Next.js 14 App Router frontend + server actions + NextAuth.js.

```bash
cp ../../.env.example ../../.env    # then fill in values
npm install                         # from the monorepo root
npm run db:push                     # push schema to Postgres
npm run db:seed                     # seed starter data
npm run dev                         # http://localhost:3000
```

Route groups:

- `app/(customer)/` — public marketing + shop pages (home, catalog, products, builder, checkout)
- `app/dashboard/`  — customer portal, requires any signed-in user
- `app/admin/`      — admin back-office, requires `super_admin` role
- `app/login`       — Google sign-in with split-layout design
- `app/unauthorized`— friendly 403 page
- `app/api/auth/[...nextauth]/` — NextAuth handler

Auth flow: `middleware.ts` guards `/admin/*` and `/dashboard/*` only; everything else is public. On first sign-in by the email set in `SEED_ADMIN_EMAIL`, `events.createUser` in `auth.ts` auto-promotes that user to `super_admin`. After that, `/admin/settings/users` lets you manage every other user's role.
