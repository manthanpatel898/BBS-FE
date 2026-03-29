import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'export',       // Generates a static /out folder — upload this to S3
  trailingSlash: true,    // /dashboard → /dashboard/index.html (required for S3/CloudFront routing)
  images: {
    unoptimized: true,    // Next.js image optimisation needs a server; S3 can't run one
  },
};

export default nextConfig;
