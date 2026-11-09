/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    "typeorm",
    "pg",
    "pg-pool",
    "pg-protocol",
    "pg-types",
    "bcryptjs",
    "reflect-metadata",
  ],
  poweredByHeader: false,
};

export default nextConfig;