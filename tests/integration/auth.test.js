import request from 'supertest';
import { Database } from '../../src/config/database.js';
import { redisClient } from '../../src/config/redis.js';
import App from '../../src/app.js';

describe('Authentication Integration Tests', () => {
  let app;
  let appInstance;

  beforeAll(async () => {
    // Connect to test database
    await Database.connect();
    try {
      await redisClient.connect();
    } catch (error) {
      console.warn('Redis connection failed, continuing without cache');
    }

    appInstance = new App();
    app = appInstance.getExpressApp();
  });

  afterAll(async () => {
    await Database.disconnect();
    try {
      await redisClient.disconnect();
    } catch (error) {
      // Ignore
    }
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', async () => {
      const userData = {
        name: 'Test User',
        email: `test${Date.now()}@example.com`,
        password: 'Test123456',
        language: 'fa'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toHaveProperty('email', userData.email);
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
    });

    it('should return 400 for invalid email', async () => {
      const userData = {
        name: 'Test User',
        email: 'invalid-email',
        password: 'Test123456'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 409 for duplicate email', async () => {
      const userData = {
        name: 'Test User',
        email: `duplicate${Date.now()}@example.com`,
        password: 'Test123456'
      };

      // Register first time
      await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      // Try to register again
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    let testUser;

    beforeAll(async () => {
      // Create a test user for login tests
      const userData = {
        name: 'Login Test User',
        email: `logintest${Date.now()}@example.com`,
        password: 'Test123456'
      };

      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      testUser = registerResponse.body.data.user;
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'Test123456'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tokens).toHaveProperty('accessToken');
    });

    it('should return 401 for invalid password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    let authToken;

    beforeAll(async () => {
      // Register and get token
      const userData = {
        name: 'Me Test User',
        email: `metest${Date.now()}@example.com`,
        password: 'Test123456'
      };

      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      authToken = registerResponse.body.data.tokens.accessToken;
    });

    it('should return user info with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toHaveProperty('email');
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});

