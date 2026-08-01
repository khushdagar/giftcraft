/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Images are already served from the Digital Ocean Spaces CDN. The Next
    // image optimizer was intermittently failing in production (cold-start /
    // timeout under concurrent thumbnail requests on a small instance), which
    // left images broken. Serve them straight from the CDN instead — reliable
    // and the CDN already handles caching.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "**.digitaloceanspaces.com" }, // DO Spaces (cdn + origin, any region)
      { protocol: "https", hostname: "cdn.swagupadmin.com" }, // SwagUp product images (demo data)
      { protocol: "https", hostname: "images.unsplash.com" }, // Unsplash images for homepage
    ],
    // NOTE: while `unoptimized: true` is set (see above) the Next optimizer is
    // bypassed, so these two settings are inert — next-gen formats and responsive
    // variants are pre-generated at UPLOAD time by lib/image-processing.ts and
    // served directly from the CDN. They are declared here so that if the
    // optimizer is ever re-enabled (flip unoptimized to false) it produces AVIF
    // first, then WebP, at these breakpoints without further changes.
    formats: ["image/avif", "image/webp"],
    deviceSizes: [320, 640, 1024, 1600, 2000],
  },
  experimental: {
    typedRoutes: false,
  },

  async headers() {
    // Private/token routes: noindex via header (NOT robots.txt-blocked, so
    // Google can crawl them and actually see the noindex directive).
    const noindex = { key: "X-Robots-Tag", value: "noindex, nofollow" };
    const noindexRoutes = [
      "/quote/:path*",
      "/approve/:path*",
      "/claim/:path*",
      "/orders/:path*",
      "/disputes/:path*",
      "/dashboard/:path*",
      "/admin/:path*",
      "/checkout/:path*",
      "/vendor/:path*",
      "/login",
      "/register",
      "/unauthorized",
    ];

    return [
      {
        // Baseline security headers (also a minor trust/SEO signal).
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
      ...noindexRoutes.map((source) => ({ source, headers: [noindex] })),
      {
        // Static marketing images/fonts in /public — cache for a week.
        source: "/:dir(category|home-banners|hero-banners|fonts)/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" },
        ],
      },
    ];
  },

  async redirects() {
    // www → apex (or vice versa) so exactly ONE canonical host serves content.
    // Derived from NEXT_PUBLIC_APP_URL at build time; skipped on localhost.
    let host = "";
    try {
      host = new URL(process.env.NEXT_PUBLIC_APP_URL || "").hostname;
    } catch {
      /* unset/invalid env — no host redirect */
    }
    if (!host || host === "localhost") return [];
    const isWww = host.startsWith("www.");
    const altHost = isWww ? host.slice(4) : `www.${host}`;
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: altHost }],
        destination: `https://${host}/:path*`,
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
