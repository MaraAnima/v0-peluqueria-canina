/** @type {import('next').NextConfig} */
const nextConfig = {
  skipTrailingSlashRedirect: true,
  async redirects() {
    return [{
      source: '/:admin(admin(?!/))',
      destination: '/admin/',
      permanent: false,
    }, {
      source: '/:path((?!admin(?:/|$)).*[^/])/',
      destination: '/:path',
      permanent: true,
    }, {
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
    return {
      beforeFiles: [
        { source: '/', destination: '/index.html' },
        { source: '/admin/', destination: 'https://tu-racion-equipo-admin.pages.dev/admin/' },
        { source: '/admin/:path*', destination: 'https://tu-racion-equipo-admin.pages.dev/admin/:path*' },
      ],
    }
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
