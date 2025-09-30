// ===============================================
// COMPREHENSIVE TESTING SETUP
// jest.config.js
// ===============================================

// Custom Jest configuration
const customJestConfig = {
  // Setup files to run before tests
  setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],

  // Test environment
  testEnvironment: 'jest-environment-jsdom',

  // Module name mapper for handling CSS imports and path aliases
  moduleNameMapper: {
    // Handle CSS imports (with CSS modules)
    '^.+\\.module\\.(css|sass|scss)$': 'identity-obj-proxy',

    // Handle CSS imports (without CSS modules)
    '^.+\\.(css|sass|scss)$': '<rootDir>/__mocks__/styleMock.js',

    // Handle image imports
    '^.+\\.(png|jpg|jpeg|gif|webp|avif|ico|bmp|svg)$/i': '<rootDir>/__mocks__/fileMock.js',

    // Path aliases
    '^@/(.*)$': '<rootDir>/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/hooks/(.*)$': '<rootDir>/hooks/$1',
    '^@/store/(.*)$': '<rootDir>/store/$1',
    '^@/types/(.*)$': '<rootDir>/types/$1',
  },

  // Coverage configuration
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    'hooks/**/*.{js,jsx,ts,tsx}',
    'store/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!**/jest.config.js',
  ],

  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  // Test match patterns
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],

  // Transform files with babel
  transform: {
    '^.+\\.(ts|tsx)$': ['babel-jest', {
      configFile: './babel.config.js'
    }],
  },

  transformIgnorePatterns: [
    'node_modules/(?!(next)/)',
  ],

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Ignore patterns
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],

  // Clear mocks between tests
  clearMocks: true,

  // Verbose output
  verbose: true,
}

// Export Jest configuration directly (not using next/jest to avoid SWC issues)
module.exports = customJestConfig
// module.exports = {
//   testEnvironment: 'node',
//   preset: 'ts-jest',
  
//   testMatch: [
//     '**/__tests__/**/*.test.ts',
//     '**/__tests__/**/*.test.tsx'
//   ],

//   // Module name mapper for path aliases
//   moduleNameMapper: {
//     '^@/(.*)$': '<rootDir>/$1'
//   },

//   // FIXED: Simplified ts-jest configuration
//   transform: {
//     '^.+\\.(ts|tsx)$': ['ts-jest', {
//       tsconfig: 'tsconfig.json'
//     }]
//   },

//   testTimeout: 30000,
//   maxWorkers: 1,
//   forceExit: true,
//   detectOpenHandles: true,
//   clearMocks: true,
//   restoreMocks: true,
//   resetMocks: true,
//   verbose: true,
  
//   moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
//   rootDir: '.'
// }