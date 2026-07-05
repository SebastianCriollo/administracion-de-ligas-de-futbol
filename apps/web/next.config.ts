import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ligas/ui", "@ligas/contracts", "@ligas/domain"],
  // Build autocontenida para el contenedor Docker (node .next/standalone).
  output: "standalone",
};

export default nextConfig;
