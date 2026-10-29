// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["res.cloudinary.com", "img.clerk.com", "images.clerk.dev"],
  },
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "prisma"],
    // The admission-card route reads font files from node_modules at runtime.
    // Without this, Vercel does not ship them and the card falls back to a plain font.
    outputFileTracingIncludes: {
      "/api/invite/[slug]/generate-card": [
        "./node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-400-normal.woff",
        "./node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-700-normal.woff",
      ],
    },
  },
};

module.exports = nextConfig;
