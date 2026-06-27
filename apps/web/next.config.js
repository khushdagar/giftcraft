/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.cdn.digitaloceanspaces.com" },
      { protocol: "https", hostname: "*.digitaloceanspaces.com" },
      { protocol: "https", hostname: "cdn.swagupadmin.com" }, // SwagUp product images (demo data)
      { protocol: "https", hostname: "images.unsplash.com" }, // Unsplash images for homepage
    ],
  },
  experimental: {
    typedRoutes: false,
  },
};

module.exports = nextConfig;
