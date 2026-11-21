import type { NextConfig } from "next";

// The app ships as static files inside Capacitor. No Next.js server exists at
// runtime, so no API routes, Server Actions, middleware or server rendering.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
