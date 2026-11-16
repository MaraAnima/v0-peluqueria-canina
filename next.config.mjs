/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [{
      source: '/index.html',
      destination: '/',
      permanent: true,
    }, {
      source: '/:path*',
      has: [{ type: 'host', value: 'v0-peluqueria-canina\\.vercel\\.app' }],
      destination: 'https://peluqueria.turacion.com.uy/:path*',
      permanent: true,
    }]
  },
  async rewrites() {
    return { beforeFiles: [{ source: '/', destination: '/index.html' }] }
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
