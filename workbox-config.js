module.exports = {
  globDirectory: ".",
  globPatterns: ["**/*.{css,jpg,svg,png,js,avif,html,ico,webp,json,md}"],
  globIgnores: ["_assets/img/screenshots/**"],
  swDest: "sw.js",
  ignoreURLParametersMatching: [/^utm_/, /^fbclid$/],
  runtimeCaching: [
    {
      urlPattern:
        /^https:\/\/cdn\.jsdelivr\.net\/npm\/bootstrap@5\.3\.7\/dist\/css\/bootstrap\.min\.css$/,
      handler: "CacheFirst",
      options: {
        cacheName: "bootstrap-css",
        expiration: {
          maxEntries: 1,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        },
      },
    },
    {
      urlPattern:
        /^https:\/\/cdn\.jsdelivr\.net\/npm\/bootstrap@5\.3\.7\/dist\/js\/bootstrap\.bundle\.min\.js$/,
      handler: "CacheFirst",
      options: {
        cacheName: "bootstrap-js",
        expiration: {
          maxEntries: 1,
          maxAgeSeconds: 60 * 60 * 24 * 30,
        },
      },
    },
    {
      urlPattern:
        /^https:\/\/cdn\.jsdelivr\.net\/npm\/@popperjs\/core@2\.11\.8\/dist\/umd\/popper\.min\.js$/,
      handler: "CacheFirst",
      options: {
        cacheName: "popper-js",
        expiration: {
          maxEntries: 1,
          maxAgeSeconds: 60 * 60 * 24 * 30,
        },
      },
    },
  ],
};
