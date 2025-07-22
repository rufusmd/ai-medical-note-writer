/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        // Enable server actions for API routes
        serverActions: true,
    },
    env: {
        // Make AI provider settings available
        NEXT_PUBLIC_AI_PROVIDER: process.env.NEXT_PUBLIC_AI_PROVIDER,
        NEXT_PUBLIC_ENABLE_PROVIDER_FALLBACK: process.env.NEXT_PUBLIC_ENABLE_PROVIDER_FALLBACK,
    },
    // Optimize for medical app requirements
    images: {
        domains: ['localhost'],
    },
    // Security headers for HIPAA compliance
    async headers() {
        return [
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
                        key: 'Strict-Transport-Security',
                        value: 'max-age=31536000; includeSubDomains',
                    },
                ],
            },
        ];
    },
};

module.exports = nextConfig;