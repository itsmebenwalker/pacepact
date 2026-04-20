/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: '/dashboard', destination: '/groups', permanent: true },
      { source: '/groups/:groupId', destination: '/group/:groupId', permanent: true },
      { source: '/groups/:groupId/plan', destination: '/group/:groupId/plan', permanent: true },
      { source: '/groups/:groupId/members', destination: '/group/:groupId/members', permanent: true },
    ]
  },
}

export default nextConfig
