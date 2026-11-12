import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async redirects() {
    return [
      { source: '/para-clinicas', destination: '/clinicas', permanent: true },
      { source: '/portal', destination: '/portal/login', permanent: true },
      // Redirecionamento permanente (301) de non-www para www
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'benavera.com.br',
          },
        ],
        destination: 'https://www.benavera.com.br/:path*',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      { source: '/:private(admin|login|portal|dashboard|atendente|representante|configuracoes|equipe|financiamentos|novo-financiamento|pacientes|repasses|p|c|proposta|api)/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      { source: '/simuladorclinicas/admin/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
