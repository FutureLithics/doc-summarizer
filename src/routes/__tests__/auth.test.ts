import request from 'supertest';
import app from '../../app';

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
      expect(response.body).toHaveProperty('message', 'Invalid input');
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
      expect(response.body).toHaveProperty('token');
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