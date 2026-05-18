const { setupDevPlatform } = require('@cloudflare/next-on-pages/next-dev')

// Enables D1 bindings during local `next dev`
if (process.env.NODE_ENV === 'development') {
  setupDevPlatform().catch(console.error)
}

/** @type {import('next').NextConfig} */
const nextConfig = {}

module.exports = nextConfig
