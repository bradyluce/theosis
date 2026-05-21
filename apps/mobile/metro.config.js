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

module.exports = config;
