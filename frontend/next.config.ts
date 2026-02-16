import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  webpack(config, { isServer }) {
    if (!isServer) {
      // face-api.js → @tensorflow/tfjs-core → node-fetch pull in Node-only
      // modules that don't exist in the browser bundle. Stub them out.
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        encoding: false,
      };
    }
    return config;
  },
};

export default nextConfig;