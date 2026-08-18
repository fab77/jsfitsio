export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',

  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
    }],
  },

  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },

  extensionsToTreatAsEsm: ['.ts'],

  // Remote tests depend on external services and are intentionally
  // excluded from the standard deterministic test suite.
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/remote/',
  ],
};