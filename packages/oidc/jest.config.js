module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverage: true,
  roots: ['<rootDir>/src'],
  coverageDirectory: './output/coverage',
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
  reporters: [
    'default',
    [
      'jest-junit',
      {
        suiteName: require('./package.json').name,
        outputName: require('./package.json').name.split('/')[1] + '.xml',
        outputDirectory: './output/test-results',
      },
    ],
  ],
};
