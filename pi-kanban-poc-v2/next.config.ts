import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  // pi-coding-agent pulls in native/non-ESM modules (koffi, @mariozechner/clipboard,
  // etc.) that Turbopack can't bundle. Let Node require them at runtime instead.
  serverExternalPackages: [
    "@mariozechner/pi-coding-agent",
    "@mariozechner/pi-agent-core",
    "@mariozechner/pi-ai",
    "@mariozechner/pi-tui",
    "@mariozechner/clipboard",
    "koffi",
  ],
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
};

export default nextConfig;
