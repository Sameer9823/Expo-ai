/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: [
    "@prisma/adapter-neon",
    "ws",
    "bufferutil",
    "utf-8-validate",
  ],
};

module.exports = nextConfig;