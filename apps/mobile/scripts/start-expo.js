// Tiny shim that sets EXPO_OFFLINE=1 and forwards args to `expo start`.
// Cross-platform replacement for `cross-env EXPO_OFFLINE=1 expo start` —
// avoids depending on cross-env, which has shifted maintainers and
// shipped Windows-broken majors more than once.
//
// EXPO_OFFLINE makes the CLI skip its api.expo.dev native-modules
// version check on startup, which has been flaky for us. Run
// `npx expo install --check` or `npx expo-doctor` manually when you
// want the check.

const { spawn } = require("node:child_process");
const path = require("node:path");

// Only set EXPO_OFFLINE if the caller hasn't explicitly opted out.
process.env.EXPO_OFFLINE = process.env.EXPO_OFFLINE ?? "1";

const expoBin = path.resolve(
  __dirname,
  "..",
  "node_modules",
  ".bin",
  process.platform === "win32" ? "expo.cmd" : "expo",
);

const args = ["start", ...process.argv.slice(2)];

const child = spawn(expoBin, args, {
  stdio: "inherit",
  // shell: true gives us reasonable arg-quoting on Windows when the
  // .cmd shim spawns its child.
  shell: process.platform === "win32",
  env: process.env,
});

child.on("exit", (code) => process.exit(code ?? 0));
child.on("error", (err) => {
  console.error("[start-expo] failed to spawn expo:", err);
  process.exit(1);
});
