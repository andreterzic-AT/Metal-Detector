// Static export so the app can be hosted anywhere (e.g. GitHub Pages) and installed as a PWA.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ""

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath,
  images: { unoptimized: true },
  trailingSlash: true,
}

export default nextConfig
