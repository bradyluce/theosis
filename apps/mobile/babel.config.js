// Babel config for the Expo mobile app. The default preset (babel-preset-
// expo) covers everything we need; the only customization is enabling
// `unstable_transformImportMeta` so libraries that use `import.meta`
// (currently: zustand 5.x devtools middleware) work under Hermes.
// Without this, building the Phase 3 onboarding state machine fails.

module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        "babel-preset-expo",
        {
          unstable_transformImportMeta: true,
        },
      ],
    ],
  };
};
