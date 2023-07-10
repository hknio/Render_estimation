/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: [
        "../packages/token-manager-sdk/src",
        "../packages/circuit-breaker-sdk/src",
    ],
    typescript: {
        ignoreBuildErrors: true
    }
}

module.exports = nextConfig
