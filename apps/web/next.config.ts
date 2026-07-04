import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ligas/ui", "@ligas/contracts", "@ligas/domain"],
};

export default nextConfig;
