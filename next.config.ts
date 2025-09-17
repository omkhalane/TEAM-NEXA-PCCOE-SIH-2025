import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  // This is required to allow cross-origin requests from the development environment.
  allowedDevOrigins: ["https://6000-firebase-studio-1758029522239.cluster-52r6vzs3ujeoctkkxpjif3x34a.cloudworkstations.dev"],
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
