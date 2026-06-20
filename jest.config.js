module.exports = {
  testEnvironment: 'node',
  setupFiles: ['./jest.setup.js'],
  moduleFileExtensions: ['js', 'json'],
  moduleNameMapper: {
    '^expo-sqlite$': '<rootDir>/__mocks__/expo-sqlite.js',
    '^expo-file-system$': '<rootDir>/__mocks__/expo-file-system.js',
    '^expo-sharing$': '<rootDir>/__mocks__/expo-sharing.js',
  },
  transform: {
    '^.+\\.js$': ['babel-jest', { configFile: './babel.config.js' }],
  },
  transformIgnorePatterns: ['node_modules/(?!(.*\\.mjs))'],
  collectCoverageFrom: ['src/**/*.js'],
  verbose: true,
};
