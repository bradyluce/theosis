// Metro config tuned for npm workspaces. Without this, Metro only watches
// apps/mobile/ and doesn't resolve @theosis/core through the workspace
// symlink — bundling fails with "Unable to resolve @theosis/core" the first
// time you import from it.
//
// Pattern from https://docs.expo.dev/guides/monorepos/. Two adjustments:
//   1. watchFolders extends the file watcher up to the repo root so changes
//      to packages/core trigger a re-bundle.
//   2. nodeModulesPaths lets Metro find hoisted deps in <root>/node_modules
//      AND any locally-installed-into-apps/mobile deps.
//   3. disableHierarchicalLookup off-by-default would let Metro climb out of
//      apps/mobile/node_modules looking for transitive deps; with workspaces
//      that's the only way it finds hoisted react-native, expo, etc.

const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

module.exports = config;
