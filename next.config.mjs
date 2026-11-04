/** @type {import('next').NextConfig} */
const nextConfig = {
  // This folder is the project root. Without this, Next picks up an unrelated lockfile in a parent folder and warns.
  outputFileTracingRoot: import.meta.dirname,
};

export default nextConfig;
