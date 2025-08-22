/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: false },     // habilitar en CI/prod
  typescript: { ignoreBuildErrors: false },  // habilitar en CI/prod
  images: { unoptimized: false },            // permitir optimización si usas <Image>
}
export default nextConfig
