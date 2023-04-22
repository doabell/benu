/** @type {import('next').NextConfig} */
const { cache } =  require("./cache");

const withPWA = require("next-pwa")({
  dest: "public",
  reloadOnOnline: false,
  runtimeCaching: cache,
});

module.exports = withPWA({
  reactStrictMode: true,
});
