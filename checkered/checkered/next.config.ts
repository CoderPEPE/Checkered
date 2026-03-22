import type { NextConfig } from "next";

// Backend URL — defaults to localhost for dev, override via env for production
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3002";

const nextConfig: NextConfig = {
  // Externalize packages that don't bundle well (replaces old webpack externals)
  serverExternalPackages: ["pino-pretty", "lokijs", "encoding"],

  // Proxy API requests to the backend server
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
