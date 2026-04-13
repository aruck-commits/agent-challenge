import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Allow running "next ./src/ui" while keeping env files at workspace root.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    externalDir: true,
  },
  webpack: (config) => {
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      (warning) => {
        const message = typeof warning?.message === 'string' ? warning.message : '';
        const resource = warning?.module?.resource ?? warning?.module?.userRequest ?? '';
        return message.includes('Critical dependency: the request of a dependency is an expression')
          && typeof resource === 'string'
          && resource.includes('@elizaos/core/dist/node/index.node.js');
      },
    ];
    return config;
  },
  serverExternalPackages: [
    '@elizaos/client-telegram',
    '@anush008/tokenizers',
    '@anush008/tokenizers-darwin-universal',
    'fastembed',
  ],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
