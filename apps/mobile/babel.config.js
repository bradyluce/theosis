// Babel config for the Expo mobile app. babel-preset-expo covers nearly
// everything; two pieces of custom config are needed for Phase 3:
//
// 1. `unstable_transformImportMeta` — needed for libs that use
//    `import.meta` at module scope (zustand 5.x devtools middleware in
//    particular). Without this, the onboarding state-machine slice fails
//    to bundle.
//
// 2. `unstable_transformProfile: "default"` — overrides the auto-selected
//    `hermes-stable` profile. The hermes-stable profile assumes Hermes
//    can parse private-class-field syntax (`#x`, `#width`, etc.) and
//    skips the transform, but Expo SDK 54's bundled `hermesc.exe` rejects
//    that syntax during the .hbc precompile step. The `default` profile
//    applies the full transform set, including the private-fields
//    plugins, to every file (RN's own DOMRectReadOnly et al. under
//    src/private/webapis/geometry/, plus @tanstack/query-core, plus any
//    other transitive dep that uses #private).
//
// Important: if you change this file, also clear caches before the next
// bundle: `rm -rf .expo/cache dist node_modules/.cache
// %TEMP%/metro-* %TEMP%/haste-*`. Metro's transformer cache is keyed by
// file content + a config hash that doesn't always invalidate on babel
// config edits.

module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        "babel-preset-expo",
        {
          unstable_transformImportMeta: true,
          unstable_transformProfile: "default",
        },
      ],
    ],
  };
};
