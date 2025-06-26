import request from 'supertest';
import app from '../../app';
import mongoose from 'mongoose';
import { Server } from 'http';
import User from '../../models/User';

let server: Server;

// Helper function to create a user and get session cookie
const createUserAndLogin = async (email: string, password: string, role: 'user' | 'admin' = 'user') => {
  // Create user directly in database with specified role
  const user = new User({ email, password, role });
  await user.save();

  // Login to get session cookie
  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({ email, password });

  // Extract session cookie from response
  const cookies = loginResponse.headers['set-cookie'];
  return cookies ? cookies[0] : '';
};

// Helper function to create an admin user and login
const createAdminAndLogin = async () => {
  return createUserAndLogin('admin@test.com', 'admin123', 'admin');
};

// Helper function to create a regular user and login
const createRegularUserAndLogin = async () => {
  return createUserAndLogin('user@test.com', 'user123', 'user');
};

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/test-users-db');
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

describe('Users Routes', () => {
  describe('GET /users (Web Route)', () => {
    it('should render users page for admin users', async () => {
      const adminCookie = await createAdminAndLogin();

      const response = await request(app)
        .get('/users')
        .set('Cookie', adminCookie);

      expect(response.status).toBe(200);
      expect(response.text).toContain('User Management');
    });

    it('should deny access to regular users', async () => {
      const userCookie = await createRegularUserAndLogin();

      const response = await request(app)
        .get('/users')
        .set('Cookie', userCookie);

      expect(response.status).toBe(403);
      expect(response.text).toContain('Admin access required');
    });

    it('should redirect unauthenticated users to login', async () => {
      const response = await request(app)
        .get('/users');

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/login');
    });
  });

  describe('GET /api/users (API Route)', () => {
    it('should return list of users for admin', async () => {
      // Create multiple users
      await User.create([
        { email: 'user1@test.com', password: 'password123', role: 'user' },
        { email: 'user2@test.com', password: 'password123', role: 'user' },
        { email: 'admin1@test.com', password: 'password123', role: 'admin' }
      ]);

      const adminCookie = await createAdminAndLogin();

      const response = await request(app)
        .get('/api/users')
        .set('Cookie', adminCookie);

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(4); // 3 created above + 1 admin from login

      // Check that response includes expected fields
      const user = response.body[0];
      expect(user).toHaveProperty('_id');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('role');
      expect(user).toHaveProperty('createdAt');

      // Check that password is not included
      expect(user).not.toHaveProperty('password');
    });

    it('should return users sorted by creation date (newest first)', async () => {
      const adminCookie = await createAdminAndLogin();

      // Create users with delay to ensure different timestamps
      const user1 = new User({ email: 'first@test.com', password: 'password123', role: 'user' });
      await user1.save();
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const user2 = new User({ email: 'second@test.com', password: 'password123', role: 'user' });
      await user2.save();

      const response = await request(app)
        .get('/api/users')
        .set('Cookie', adminCookie);

      expect(response.status).toBe(200);
      expect(response.body.length).toBeGreaterThanOrEqual(2);

      // Check that users are sorted by createdAt in descending order
      for (let i = 1; i < response.body.length; i++) {
        const current = new Date(response.body[i].createdAt);
        const previous = new Date(response.body[i - 1].createdAt);
        expect(current.getTime()).toBeLessThanOrEqual(previous.getTime());
      }
    });

    it('should return 403 for regular users', async () => {
      const userCookie = await createRegularUserAndLogin();

      const response = await request(app)
        .get('/api/users')
        .set('Cookie', userCookie);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Admin access required');
    });

    it('should return 401 for unauthenticated requests', async () => {
      const response = await request(app)
        .get('/api/users');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Authentication required');
    });

    it('should handle empty user list', async () => {
      // Only create admin user for authentication
      const adminCookie = await createAdminAndLogin();

      const response = await request(app)
        .get('/api/users')
        .set('Cookie', adminCookie);

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(1); // Only the admin user
      expect(response.body[0].role).toBe('admin');
    });

    it('should include both user and admin roles in response', async () => {
      // Create users with different roles
      await User.create([
        { email: 'regularuser@test.com', password: 'password123', role: 'user' },
        { email: 'anotheradmin@test.com', password: 'password123', role: 'admin' }
      ]);

      const adminCookie = await createAdminAndLogin();

      const response = await request(app)
        .get('/api/users')
        .set('Cookie', adminCookie);

      expect(response.status).toBe(200);
      
      const roles = response.body.map((user: any) => user.role);
      expect(roles).toContain('user');
      expect(roles).toContain('admin');
    });

    it('should handle database errors gracefully', async () => {
      const adminCookie = await createAdminAndLogin();

      // Close database connection to simulate error
      await mongoose.connection.close();

      const response = await request(app)
        .get('/api/users')
        .set('Cookie', adminCookie);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to fetch users');

      // Reconnect for cleanup
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/test-users-db');
    });
  });

  describe('User Role Verification', () => {
    it('should correctly identify admin users', async () => {
      const adminCookie = await createAdminAndLogin();

      const response = await request(app)
        .get('/api/users')
        .set('Cookie', adminCookie);

      expect(response.status).toBe(200);
      
      // Find the admin user in response
      const adminUser = response.body.find((user: any) => user.email === 'admin@test.com');
      expect(adminUser).toBeDefined();
      expect(adminUser.role).toBe('admin');
    });

    it('should correctly identify regular users', async () => {
      // Create a regular user
      await User.create({ email: 'regular@test.com', password: 'password123', role: 'user' });
      
      const adminCookie = await createAdminAndLogin();

      const response = await request(app)
        .get('/api/users')
        .set('Cookie', adminCookie);

      expect(response.status).toBe(200);
      
      // Find the regular user in response
      const regularUser = response.body.find((user: any) => user.email === 'regular@test.com');
      expect(regularUser).toBeDefined();
      expect(regularUser.role).toBe('user');
    });
  });

  describe('API Response Format', () => {
    it('should return users with correct field types', async () => {
      await User.create({ email: 'typetest@test.com', password: 'password123', role: 'user' });
      
      const adminCookie = await createAdminAndLogin();

      const response = await request(app)
        .get('/api/users')
        .set('Cookie', adminCookie);

      expect(response.status).toBe(200);
      
      const user = response.body[0];
      expect(typeof user._id).toBe('string');
      expect(typeof user.email).toBe('string');
      expect(typeof user.role).toBe('string');
      expect(typeof user.createdAt).toBe('string');
      
      // Verify role is valid enum value
      expect(['user', 'admin']).toContain(user.role);
      
      // Verify email format
      expect(user.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      
      // Verify createdAt is valid ISO date
      expect(new Date(user.createdAt).toISOString()).toBe(user.createdAt);
    });
  });
}); 