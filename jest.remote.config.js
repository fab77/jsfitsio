import baseConfig from "./jest.config.js";

export default {
  ...baseConfig,

  // Override the standard config: remote tests are the only tests
  // executed by this configuration.
  testPathIgnorePatterns: [
    "/node_modules/",
  ],

  testMatch: [
    "<rootDir>/tests/remote/**/*.test.ts",
  ],
};