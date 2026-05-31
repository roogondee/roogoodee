/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Bundle the Sarabun TTFs used by the lab PDF report into serverless fns.
  experimental: {
    outputFileTracingIncludes: {
      '/api/admin/lab/**': ['./src/lib/lab/fonts/**'],
    },
  },
  async rewrites() {
    return [
      { source: '/booking', destination: '/booking/index.html' },
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
