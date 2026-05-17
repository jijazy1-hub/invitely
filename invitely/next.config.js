// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      "res.cloudinary.com",
      "img.clerk.com",
      "images.clerk.dev",
    ],
  },
  // Allow @fontsource files to be read from node_modules at runtime
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "prisma"],
  },
};

module.exports = nextConfig;
