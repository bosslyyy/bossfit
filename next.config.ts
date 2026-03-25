import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate"
          }
        ]
      },
      {
        source: "/manifest.webmanifest",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, must-revalidate"
          }
        ]
      },
      {
        source: "/.well-known/assetlinks.json",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, must-revalidate"
          },
          {
            key: "Content-Type",
            value: "application/json; charset=utf-8"
          }
        ]
      }
    ];
  }
};

export default nextConfig;
