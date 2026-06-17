// File: next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  // SDKs are server-only; keep them out of the client bundle.
  serverExternalPackages: ["@naviprotocol/lending", "@mysten/deepbook-v3"],
  // DEV-009 (DEGRADED→fixed): @suilend/sdk@3.0.4 ships ESM with bare directory specifiers
  // (`export * from "./api"`) and no "type":"module"/.mjs — native Node ESM (the path
  // serverExternalPackages uses) rejects the directory import. Route it through webpack via
  // transpilePackages so the bundler resolves "./api" -> "./api/index.js".
  transpilePackages: ["@suilend/sdk"],
};
export default nextConfig;
