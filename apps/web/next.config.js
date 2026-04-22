/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.cdn.digitaloceanspaces.com" },
      { protocol: "https", hostname: "*.digitaloceanspaces.com" },
    ],
  },
  experimental: {
    typedRoutes: false,
  },
};

module.exports = nextConfig;
