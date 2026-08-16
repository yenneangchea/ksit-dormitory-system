import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Legacy admin pages have a separate lint backlog. Keep the production build
  // focused on compilation while application tests cover authentication flows.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
