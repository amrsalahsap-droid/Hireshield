/** @type {import('next').NextConfig} */
const nextConfig = {
  // macOS often hits EMFILE with file watchers; polling avoids exhausting FDs and flaky dev responses.
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 2000,
        aggregateTimeout: 600,
      };
      // Avoid ChunkLoadError when first compile is slow (disk, EMFILE, large app).
      config.output = { ...config.output, chunkLoadTimeout: 180000 };
    }
    return config;
  },
};

export default nextConfig;
