/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // The 3D venue draws avatars and album art into WebGL textures, which
    // needs CORS. Hosts that don't send CORS headers are loaded through the
    // same-origin image optimizer instead (see components/venue/scene/textures.ts).
    remotePatterns: [
      { protocol: 'https', hostname: '**.scdn.co' },
      { protocol: 'https', hostname: '**.spotifycdn.com' },
      { protocol: 'https', hostname: '**.fbcdn.net' },
      { protocol: 'https', hostname: '**.fbsbx.com' },
      { protocol: 'https', hostname: '**.googleusercontent.com' },
      { protocol: 'https', hostname: 'utfs.io' },
      { protocol: 'https', hostname: '**.ufs.sh' },
      { protocol: 'https', hostname: 'i.pravatar.cc' },
    ],
  },
};

module.exports = nextConfig;
