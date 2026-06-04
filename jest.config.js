/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',

  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',

  testRegex: '.*\\.spec\\.ts$',

  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.spec.json' }],
  },

  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },

  collectCoverageFrom: ['src/**/*.ts', '!src/generated/**', '!src/main.ts'],
  coverageDirectory: './coverage',
};
