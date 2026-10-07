/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Bundle the Sarabun TTFs used by the lab PDF report into serverless fns.
  experimental: {
    outputFileTracingIncludes: {
      '/api/admin/lab/**': ['./src/lib/lab/fonts/**'],
      '/api/admin/certs/**': ['./src/lib/lab/fonts/**'],
    },
  },
  async rewrites() {
    return [
      { source: '/booking', destination: '/booking/index.html' },
    ];
  },
  async redirects() {
    return [
      // Superseded by /foreign/workpermit (2026-09-07), which has the verified
      // มติ ครม. 14 ก.ค. 2569 citation, fee, and dates this page guessed at.
      { source: '/foreign/deadline-2569', destination: '/foreign/workpermit', permanent: true },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
    ],
  },
};

export default nextConfig;
