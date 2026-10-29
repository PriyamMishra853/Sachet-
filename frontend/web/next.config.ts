import type { NextConfig } from "next";

const dev = process.env.NODE_ENV !== "production";
const apiOrigin = new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000").origin;

// Content Security Policy: the page may only load code, styles and images
// from its own site, and only talk to the Sachet API. If someone ever got
// HTML into the page, it couldn't load a script from elsewhere or send data
// away. Next.js needs inline scripts to start the app, and React's dev
// reloader needs eval, which is allowed in development only.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self' ${apiOrigin}`,
  "manifest-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(dev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  // /share has the shared message in its address: never send it to other sites.
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The repo-wide `pnpm lint` already covers this app.
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // The service worker must always be fresh, or a fix could take days to arrive.
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }] },
    ];
  },
};

export default config;
