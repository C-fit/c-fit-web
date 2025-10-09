import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // 빌드 시 eslint 검사 안함
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
