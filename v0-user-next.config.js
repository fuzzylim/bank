/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    OBP_API_URL: process.env.OBP_API_URL,
    NEXT_PUBLIC_OBP_API_URL: process.env.NEXT_PUBLIC_OBP_API_URL,
    NEXT_PUBLIC_OBP_CONSUMER_KEY: process.env.NEXT_PUBLIC_OBP_CONSUMER_KEY,
  },
}

module.exports = nextConfig

