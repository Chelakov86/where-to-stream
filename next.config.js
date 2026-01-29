/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'flagcdn.com',
        pathname: '/**',
      },
    ],
  },

  // Security headers to protect against common web vulnerabilities
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            // Enable DNS prefetching for performance
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            // Enforce HTTPS connections (only in production)
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            // Prevent page from being embedded in iframes (clickjacking protection)
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            // Prevent MIME type sniffing
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            // Legacy XSS protection (modern browsers use CSP instead)
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            // Control referrer information sent with requests
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            // Disable browser features that could be misused
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          {
            // Content Security Policy - defines trusted sources for content
            // Note: 'unsafe-inline' and 'unsafe-eval' are needed for Next.js
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; " +
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'; " +
              "style-src 'self' 'unsafe-inline'; " +
              "img-src 'self' data: https://image.tmdb.org https://www.themoviedb.org https://flagcdn.com; " +
              "font-src 'self'; " +
              "connect-src 'self' https://api.themoviedb.org; " +
              "frame-ancestors 'none'; " +
              "base-uri 'self'; " +
              "form-action 'self';",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
