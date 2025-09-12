const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/components/(.*): '<rootDir>/src/components/$1',
    '^@/lib/(.*): '<rootDir>/src/lib/$1',
    '^@/hooks/(.*): '<rootDir>/src/hooks/$1',
  },
  testEnvironment: 'jest-environment-jsdom',
}

module.exports = createJestConfig(customJestConfig)