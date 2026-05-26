module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  transform: {
    '^.+\\.ts$': '<rootDir>/scripts/jest-ts-transformer.cjs',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
};
