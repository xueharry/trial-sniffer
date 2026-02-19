/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},
  webpack: (config) => {
    // Snowflake SDK requires these configurations (for webpack mode)
    config.externals.push({
      'snowflake-sdk': 'commonjs snowflake-sdk'
    });
    return config;
  },
};

module.exports = nextConfig;
