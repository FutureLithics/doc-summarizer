import request from 'supertest';
import app from '../../app';
import mongoose from 'mongoose';
import { Server } from 'http';
import User from '../../models/User';

let server: Server;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/test-auth-db');
  return new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
});

afterAll(async () => {
  await mongoose.connection.close();
  return new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
});

beforeEach(async () => {
  // Clean up users before each test
  await User.deleteMany({});
});

describe('Auth Routes', () => {
  describe('POST /api/auth/signup', () => {
    it('should create a new user with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'test1@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'User created successfully');
    });

    it('should return 400 with invalid input', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: '',
          password: ''
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Email and password are required');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      // First create a user
      await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'login@example.com',
          password: 'password123'
        });

      // Then try to login
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Login successful');
    });

    it('should return 401 with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'wrong@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Invalid credentials');
    });
  });
}); 