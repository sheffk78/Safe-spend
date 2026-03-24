/**
 * Auth & Org Onboarding Tests
 * 
 * Tests for:
 * - Signup + Login Happy Path
 * - Duplicate Email Fails
 * - Wrong Password Fails Login
 */

const request = require('supertest');
const { getApp, resetDatabase } = require('./utils');

describe('Auth & Org Onboarding', () => {
    let app;

    beforeAll(async () => {
        app = getApp();
    });

    beforeEach(async () => {
        await resetDatabase();
    });

    describe('Signup + Login Happy Path', () => {
        const testEmail = 'happy-path@test.com';
        const testPassword = 'SecurePassword123!';
        const testName = 'Happy Path Org';

        it('should successfully sign up a new organization', async () => {
            const res = await request(app)
                .post('/api/v1/auth/signup')
                .send({
                    email: testEmail,
                    password: testPassword,
                    name: testName
                })
                .expect(201);

            expect(res.body).toHaveProperty('token');
            expect(res.body.token).toBeTruthy();
            expect(res.body).toHaveProperty('organization');
            expect(res.body.organization).toHaveProperty('id');
            expect(res.body.organization).toHaveProperty('name', testName);
            expect(res.body.organization).toHaveProperty('email', testEmail);
        });

        it('should successfully login with valid credentials', async () => {
            // First signup
            await request(app)
                .post('/api/v1/auth/signup')
                .send({
                    email: testEmail,
                    password: testPassword,
                    name: testName
                })
                .expect(201);

            // Then login
            const loginRes = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: testEmail,
                    password: testPassword
                })
                .expect(200);

            expect(loginRes.body).toHaveProperty('token');
            expect(loginRes.body.token).toBeTruthy();
            expect(loginRes.body).toHaveProperty('organization');
            expect(loginRes.body.organization).toHaveProperty('email', testEmail);
        });

        it('should return correct org data from /auth/me endpoint', async () => {
            // Signup
            const signupRes = await request(app)
                .post('/api/v1/auth/signup')
                .send({
                    email: testEmail,
                    password: testPassword,
                    name: testName
                })
                .expect(201);

            const token = signupRes.body.token;

            // Get /auth/me
            const meRes = await request(app)
                .get('/api/v1/auth/me')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            expect(meRes.body).toHaveProperty('id');
            expect(meRes.body).toHaveProperty('name', testName);
            expect(meRes.body).toHaveProperty('email', testEmail);
        });
    });

    describe('Duplicate Email Fails', () => {
        const testEmail = 'duplicate@test.com';
        const testPassword = 'SecurePassword123!';

        it('should fail signup with duplicate email', async () => {
            // First signup
            await request(app)
                .post('/api/v1/auth/signup')
                .send({
                    email: testEmail,
                    password: testPassword,
                    name: 'First Org'
                })
                .expect(201);

            // Second signup with same email should fail
            const res = await request(app)
                .post('/api/v1/auth/signup')
                .send({
                    email: testEmail,
                    password: testPassword,
                    name: 'Second Org'
                })
                .expect(400);

            expect(res.body).toHaveProperty('error');
            expect(res.body.error.toLowerCase()).toContain('email');
        });
    });

    describe('Wrong Password Fails Login', () => {
        const testEmail = 'wrongpass@test.com';
        const testPassword = 'CorrectPassword123!';

        it('should fail login with wrong password', async () => {
            // Signup
            await request(app)
                .post('/api/v1/auth/signup')
                .send({
                    email: testEmail,
                    password: testPassword,
                    name: 'Test Org'
                })
                .expect(201);

            // Login with wrong password
            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: testEmail,
                    password: 'WrongPassword456!'
                })
                .expect(401);

            expect(res.body).toHaveProperty('error');
        });

        it('should fail login with non-existent email', async () => {
            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'nonexistent@test.com',
                    password: 'SomePassword123!'
                })
                .expect(401);

            expect(res.body).toHaveProperty('error');
        });
    });
});
