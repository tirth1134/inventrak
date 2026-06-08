import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["formidable", "nodemailer", "bcryptjs", "node-cron", "@prisma/adapter-pg", "pg"],
  turbopack: {
    root: __dirname,
  },
  allowedDevOrigins: [
    "localhost",
    "localhost:3001",
    "localhost:3002",
    "127.0.0.1",
    "127.0.0.1:3001",
    "127.0.0.1:3002",
    "192.168.10.110",
    "192.168.10.110:3001",
    "192.168.10.110:3002",
  ],
};

export default nextConfig;
