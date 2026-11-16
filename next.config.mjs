/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [{
      source: '/:path*',
      has: [{ type: 'host', value: 'v0-peluqueria-canina\\.vercel\\.app' }],
      destination: 'https://peluqueria.turacion.com.uy/:path*',
      permanent: true,
    }]
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
