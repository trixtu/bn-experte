import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: [
    "https://keen-laughter-production.up.railway.app", // adaugă aici URL-ul tău
    "http://localhost:3000", // poți lăsa și localhost pentru dev
  ],
};

export default nextConfig;
