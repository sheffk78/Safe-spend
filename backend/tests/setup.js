/**
 * Jest Global Setup
 * Runs before all test suites
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Increase timeout for setup
jest.setTimeout(30000);

// Global setup before all tests
beforeAll(async () => {
    // Ensure database connection
    try {
        await prisma.$connect();
        console.log('Database connected for testing');
    } catch (error) {
        console.error('Failed to connect to database:', error);
        throw error;
    }
});

// Global teardown after all tests
afterAll(async () => {
    await prisma.$disconnect();
    console.log('Database disconnected after testing');
});
