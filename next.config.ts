import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * This app is session + database driven (cart, orders, admin dashboard),
   * so we opt out of the experimental cacheComponents model to keep dynamic
   * routes simple and predictable.
   */
  cacheComponents: false,

  poweredByHeader: false,
  compress: true,
  reactStrictMode: true,

  // Review photos are posted to a Server Action (up to 4 × 5MB).
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },

  images: {
    formats: ["image/avif", "image/webp"],
    // Local placeholder artwork is SVG. Next.js automatically marks any
    // ".svg" src as `unoptimized` when dangerouslyAllowSVG is off (see
    // get-img-props), so these are served as-is — no optimizer proxy, and no
    // need for the SVG-specific contentSecurityPolicy sandbox.
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
      { protocol: "https", hostname: "images.unsplash.com" },
      // Customer review photos (Cloudinary secure_url)
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },

  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              // Customers paste their own reference-image URLs (track panel),
              // so any https host must be renderable — a fixed allow-list
              // would silently blank those images.
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://graph.facebook.com",
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
