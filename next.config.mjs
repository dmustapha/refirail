// File: next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  // SDKs are server-only; keep them out of the client bundle.
  serverExternalPackages: ["@suilend/sdk", "@naviprotocol/lending", "@mysten/deepbook-v3"],
};
export default nextConfig;
