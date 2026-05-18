/** @type {import('next').NextConfig} */
const nextConfig = {}

// Enable D1 + other Cloudflare bindings during local `next dev`
// (only loaded in dev to avoid impacting production builds)
if (process.env.NODE_ENV === 'development') {
  const { setupDevPlatform } = require('@cloudflare/next-on-pages/next-dev')
  setupDevPlatform().catch(console.error)
}

module.exports = nextConfig
