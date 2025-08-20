module.exports = {
  globDirectory: ".",
  globPatterns: ["**/*.{css,jpg,svg,png,js,avif,html,ico,webp,json,md}"],
  globIgnores: ["_assets/img/screenshots/**"],
  swDest: "sw.js",
  ignoreURLParametersMatching: [/^utm_/, /^fbclid$/],
};
