module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  setupFilesAfterEnv: [], // Add setup files if needed later
  // Optional: Add coverage configuration
  // collectCoverage: true,
  // coverageDirectory: "coverage",
  // coverageProvider: "v8",
  // Add moduleNameMapper for path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
}; 