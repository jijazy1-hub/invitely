// next.config.js
// Must match FONT_FILES in src/lib/card-shared.ts.
const CARD_FONTS = [
  ...["latin", "latin-ext", "vietnamese"].flatMap((subset) =>
    ["400", "700"].map((w) => `./node_modules/@fontsource/inter/files/inter-${subset}-${w}-normal.woff`)
  ),
  "./node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-700-normal.woff",
  "./node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-ext-700-normal.woff",
  "./node_modules/@fontsource/great-vibes/files/great-vibes-latin-400-normal.woff",
  "./node_modules/@fontsource/great-vibes/files/great-vibes-latin-ext-400-normal.woff",
  "./node_modules/@fontsource/playfair-display/files/playfair-display-latin-400-normal.woff",
  "./node_modules/@fontsource/playfair-display/files/playfair-display-latin-700-normal.woff",
  "./node_modules/@fontsource/playfair-display/files/playfair-display-latin-ext-700-normal.woff",
  "./node_modules/@fontsource/cinzel/files/cinzel-latin-400-normal.woff",
  "./node_modules/@fontsource/cinzel/files/cinzel-latin-700-normal.woff",
  "./node_modules/@fontsource/cinzel/files/cinzel-latin-ext-700-normal.woff",
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["res.cloudinary.com", "img.clerk.com", "images.clerk.dev"],
  },
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "prisma"],
    // Card rendering reads font files from node_modules at runtime. Without this,
    // Vercel does not ship them and names/titles fall back to a plain font.
    outputFileTracingIncludes: {
      "/api/invite/[slug]/generate-card": CARD_FONTS,
      "/api/invite/[slug]/rsvp": CARD_FONTS,
      "/api/events/[eventId]/card-preview": CARD_FONTS,
    },
  },
};

module.exports = nextConfig;
