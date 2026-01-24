module.exports = {
  globDirectory: ".",
  globPatterns: ["**/*.{css,jpg,svg,png,js,avif,html,ico,webp,json,md}"],
  globIgnores: [
    "_assets/img/screenshots/**",
    "**/ai.txt",
    "_assets/img/icons/launch/fp/**",
    "node_modules/**",
  ],
  swDest: "sw.js",
  ignoreURLParametersMatching: [/^utm_/, /^fbclid$/],
  skipWaiting: true,
  clientsClaim: true,
};
