/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // FFmpeg.wasm için gerekli header'lar (SharedArrayBuffer desteği)
  async headers() {
    return [
      {
        source: '/video-editor',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
        ],
      },
    ]
  },

  // Webpack config - FFmpeg.wasm için
  webpack: (config, { isServer }) => {
    // FFmpeg.wasm worker desteği
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    }
    return config
  },
}

module.exports = nextConfig
