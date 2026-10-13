import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const nextConfig: NextConfig = {
  // Il pacchetto condiviso è TypeScript non compilato: Next lo deve compilare lui.
  transpilePackages: ['@brainy/content'],
  images: {
    localPatterns: [
      {
        pathname: '/api/media/file/**',
      },
    ],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  // Con i workspace npm `next` sta nella node_modules della radice del repository:
  // la radice di Turbopack deve essere quella, non apps/cms (come nel template).
  turbopack: {
    root: path.resolve(dirname, '../..'),
  },
  // Non far generare ad ogni avvio il file AGENTS.md.
  agentRules: false,
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
