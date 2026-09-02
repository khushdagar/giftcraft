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
      { protocol: "https", hostname: "**.digitaloceanspaces.com" },
      { protocol: "https", hostname: "cdn.givoo.in" },
      { protocol: "https", hostname: "cdn.swagupadmin.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
   
    formats: ["image/avif", "image/webp"],
    deviceSizes: [320, 640, 1024, 1600, 2000],
  },
  
  cacheMaxMemorySize: 32 * 1024 * 1024,

  experimental: {
    typedRoutes: false,
   
    cpus: 1,
    workerThreads: false,
  },

  async headers() {
   
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
    const routeRedirects = [
      { source: "/packs", destination: "/curated-packs", permanent: true },
    ];

    let host = "";
    try {
      host = new URL(process.env.NEXT_PUBLIC_APP_URL || "").hostname;
    } catch {
    }
    if (!host || host === "localhost") return routeRedirects;
    const isWww = host.startsWith("www.");
    const altHost = isWww ? host.slice(4) : `www.${host}`;
    return [
      ...routeRedirects,
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
