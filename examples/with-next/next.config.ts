import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@yamblog/next"],
  serverExternalPackages: ["@yamblog/core", "gray-matter"],
};

export default nextConfig;
