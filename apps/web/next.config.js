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
};

module.exports = nextConfig;
