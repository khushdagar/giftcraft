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
  },
  experimental: {
    typedRoutes: false,
  },
};

module.exports = nextConfig;
