import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@resvg/resvg-js", "opentype.js"],
  allowedDevOrigins: ["192.168.178.169"],
};

export default nextConfig;
