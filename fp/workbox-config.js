module.exports = {
  globDirectory: ".",
  globPatterns: ["**/*.{css,jpg,svg,png,js,avif,html,ico,webp,json,md}"],
  globIgnores: ["node_modules/**", "en/**", "es/**", "fr/**", "pt/**"],
  swDest: "sw.js",
  ignoreURLParametersMatching: [/^utm_/, /^fbclid$/],
  skipWaiting: true,
  clientsClaim: true,
};
