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

## Image upload & compression

Every uploaded image is compressed and converted to WebP **before it hits storage** — no
original-size file ever reaches Digital Ocean Spaces or the CDN. Compression happens in two
places; the server is the source of truth.

**How it works**

1. **Client (best effort)** — `hooks/use-compressed-upload.ts` shrinks the image in the browser
   with `browser-image-compression` (web worker, long edge ≤ 2000px, target ~1MB) and uploads via
   XHR with real progress. If compression fails it falls back to sending the original. Use the
   `useCompressedUpload()` hook for progress UI, or the `compressAndUpload(file, { folder })` helper
   as a drop-in for a `FormData` + `fetch('/api/upload')` call.
2. **Server (source of truth)** — `lib/image-processing.ts` runs `sharp` inside the upload path
   (`lib/upload-to-digital-ocean.ts`). It: validates the format by **magic bytes** (not the
   extension or client MIME), rejects files > 15MB, bakes in EXIF orientation (`.rotate()` first)
   then strips all other metadata, converts to WebP (quality 80 for photos / 90 for graphics),
   preserves PNG transparency, and generates responsive variants at **320 / 640 / 1024 / 1600px**
   (never upscaling past the source) plus a ~10px base64 blur placeholder for
   `next/image placeholder="blur"`. HEIC (iPhone) input is decoded to WebP.

Processing is **inline** on the request (not queued): the CDN URL must be returned in the response
that every existing caller depends on, and BullMQ lives in `apps/api` with no Spaces access. Cost is
~200–600ms per image; acceptable for admin-side single-image uploads.

Variants are stored next to the primary with a width suffix — e.g.
`products/…-abc.webp`, `products/…-abc-640w.webp` — so they're reachable at predictable URLs.
`uploadToDigitalOcean(file, folder)` keeps its `Promise<string>` contract (returns the primary URL);
use `uploadImageWithVariants(file, folder, { hasText })` when you also need the variant URLs, blur
placeholder, and dimensions.

**Tuning**

| Env var           | Default | Meaning                                        |
|-------------------|---------|------------------------------------------------|
| `IMAGE_QUALITY`   | `80`    | WebP quality for photos (graphics use +10).    |
| `IMAGE_MAX_WIDTH` | `2000`  | Long-edge ceiling for the primary variant.     |

> `next.config.js` keeps `images.unoptimized: true` — the Next optimizer stays off and images serve
> straight from the CDN, so `formats`/`deviceSizes` there are declarative only. Optimization is done
> once, at upload time. Flip `unoptimized` to `false` to hand resizing back to the Next server.

**Reprocessing existing images**

`scripts/backfill-images.ts` re-compresses images already in the bucket. It never deletes originals
and never edits the database — it prints a manifest mapping each old URL to its new WebP URL so you
can rewire DB references (`ProductImage.url`, `BrandAsset.fileUrl`, …) as a separate, reviewed step.

```bash
npm run images:backfill -- --dry-run              # report only, no writes
npm run images:backfill                           # upload WebP + variants
npm run images:backfill -- --prefix=products/     # limit to one folder
npm run images:backfill -- --limit=50             # cap objects processed
```
