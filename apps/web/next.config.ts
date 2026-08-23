import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Browser talks to :3000 only. Next proxies /api to Express — same cookies, no CORS maze.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:4000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
