// next.config.mjs

import nextPwa from "@ducanh2912/next-pwa";

const withPWA = nextPwa({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  runtimeCaching: [
    {
      urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
      handler: "NetworkFirst",
      options: {
        cacheName: "api-cache",
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 60 * 60,
        },
        networkTimeoutSeconds: 10,
      },
    },
    {
      handler: "NetworkFirst",
      urlPattern: ({ request, url }) =>
        request.mode === "navigate" && url.pathname.startsWith("/"),
      options: {
        cacheName: 'pages',
        expiration: {
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60,
        },
        networkTimeoutSeconds: 10
      }
    }
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: false },
  typescript: { ignoreBuildErrors: false },
  // --- CAMBIO AQUÍ ---
  // Añade remotePatterns a tu configuración de 'images' existente
  images: {
    unoptimized: false,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "upcdn.io",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default withPWA(nextConfig);