// Metro config. apps/mobile is intentionally NOT part of an npm workspace
// (Expo's babel-plugin-router resolver gets confused inside workspaces), so
// this stays minimal — Expo's defaults handle everything.
//
// `@theosis/core` is consumed via file:../../packages/core in package.json,
// which npm symlinks into apps/mobile/node_modules/@theosis/core. Metro
// follows the symlink without extra config. If you want hot-reload of
// @theosis/core changes during dev, set watchFolders to include
// packages/core; re-running `npm install` after changes also works.

const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// Watch packages/core so hot-reload picks up shared-type changes during dev.
config.watchFolders = [path.resolve(projectRoot, "../../packages/core")];

// When Metro resolves an import from inside packages/core (e.g. me-dtos.ts
// importing zod), it walks up from packages/core looking for node_modules
// and doesn't find one — packages/core has no installed deps; everything
// lives under apps/mobile/node_modules thanks to the file: dependency. Tell
// Metro to also consult apps/mobile/node_modules for any unresolved module,
// regardless of which file is doing the import.
config.resolver = config.resolver ?? {};
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
];

module.exports = config;
