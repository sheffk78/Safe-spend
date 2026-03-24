module.exports = {
    testEnvironment: 'node',
    testTimeout: 30000,
    verbose: true,
    testMatch: ['**/tests/**/*.test.js'],
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    modulePathIgnorePatterns: ['<rootDir>/tests/test_*.py'],
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/server.js'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html']
};
