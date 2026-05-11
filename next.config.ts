import type { NextConfig } from "next";

const securityHeaders = [
  // Pas de sniffing du content-type
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Pas d'embed dans un iframe externe (clickjacking)
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Force HTTPS (Vercel le fait déjà, mais on le déclare explicitement)
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Ne fuite pas le referrer complet vers les domaines externes
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  // Bloque l'accès aux APIs sensibles (caméra/micro/geo) — pas utilisées
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // Limite l'iframing à same-origin
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
