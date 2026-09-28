// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // A Reanimated shared value is a mutable box, not an immutable render value,
    // so assigning to `.value` from an event handler is correct and intended.
    files: ["src/**/*.{ts,tsx}"],
    rules: { "react-hooks/immutability": "off" },
  },
]);
