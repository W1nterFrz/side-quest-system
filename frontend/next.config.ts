import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8000/api/:path*",
      },
    ];
  },
  httpAgentOptions: {
    keepAlive: true,
    timeout: 120_000, // 120s proxy timeout
  },
};

export default nextConfig;