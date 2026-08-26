import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Follow imports into the Express app and Prisma package (monorepo).
  transpilePackages: ["@studiodesk/api", "@studiodesk/db"],
  serverExternalPackages: ["@prisma/client", "express", "bcryptjs"],
  outputFileTracingRoot: path.join(__dirname, "../.."),
  async rewrites() {
    // Local: browser stays on :3000; Next proxies /api to Express on :4000.
    // Vercel: skip this — pages/api/[...path] runs that same Express app.
    if (process.env.VERCEL) {
      return [];
    }
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:4000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
