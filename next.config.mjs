// next.config.mjs

import nextPwa from "@ducanh2912/next-pwa";

const withPWA = nextPwa({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  runtimeCaching: [
    {
      // Regla para la API: Intenta ir a la red primero.
      urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
      handler: "NetworkFirst", // <-- Cambio de estrategia
      options: {
        cacheName: "api-cache",
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 60 * 60, // 1 hora (puedes ajustarlo)
        },
        networkTimeoutSeconds: 10, // Si la red tarda más de 10s, usa la caché
      },
    },
    {
      // Regla para las páginas (esta la puedes dejar como está)
      handler: "NetworkFirst",
      urlPattern: ({ request, url }) =>
        request.mode === "navigate" && url.pathname.startsWith("/"),
      options: {
        cacheName: 'pages',
        expiration: {
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 días
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
  images: { unoptimized: false },
};

export default withPWA(nextConfig);