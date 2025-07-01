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
  const email = `admin${Math.random().toString(36).substring(2, 15)}@test.com`;
  return createUserAndLogin(email, 'admin123', 'admin');
};

// Helper function to create a regular user and login
const createRegularUserAndLogin = async () => {
  const email = `user${Math.random().toString(36).substring(2, 15)}@test.com`;
  return createUserAndLogin(email, 'user123', 'user');
};

beforeAll(async () => {
  // Ensure we're using test database
  const testDbUri = 'mongodb://127.0.0.1:27017/test-users-db';
  
  // Close any existing connections
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  
  // Connect to test database
  await mongoose.connect(testDbUri);
  
  return new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
});

afterAll(async () => {
  // Clean up test database
  if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  }
  
  return new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
});

beforeEach(async () => {
  // Clean up users before each test with more thorough cleanup
  try {
    await User.deleteMany({});
    await User.collection.drop().catch(() => {}); // Ignore errors if collection doesn't exist
    await User.createCollection();
  } catch (error) {
    // If collection doesn't exist, that's fine
  }
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
      // Create admin user with known email to check
      const adminEmail = 'admin-verify@test.com';
      const adminUser = new User({ email: adminEmail, password: 'admin123', role: 'admin' });
      await adminUser.save();
      
      const adminCookie = await createAdminAndLogin();

      const response = await request(app)
        .get('/api/users')
        .set('Cookie', adminCookie);

      expect(response.status).toBe(200);
      
      // Find the admin user in response
      const foundAdminUser = response.body.find((user: any) => user.email === adminEmail);
      expect(foundAdminUser).toBeDefined();
      expect(foundAdminUser.role).toBe('admin');
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

  describe('POST /api/users (Create User)', () => {
    it('should create a new user with valid data', async () => {
      const adminCookie = await createAdminAndLogin();
      
      const newUserData = {
        email: 'newuser@test.com',
        role: 'user',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/users')
        .set('Cookie', adminCookie)
        .send(newUserData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('_id');
      expect(response.body.email).toBe('newuser@test.com');
      expect(response.body.role).toBe('user');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).not.toHaveProperty('password');

      // Verify user was actually created in database
      const createdUser = await User.findById(response.body._id);
      expect(createdUser).toBeTruthy();
      expect(createdUser!.email).toBe('newuser@test.com');
    });

    it('should create a new admin user', async () => {
      const adminCookie = await createAdminAndLogin();
      
      const newAdminData = {
        email: 'newadmin@test.com',
        role: 'admin',
        password: 'adminpass123'
      };

      const response = await request(app)
        .post('/api/users')
        .set('Cookie', adminCookie)
        .send(newAdminData);

      expect(response.status).toBe(201);
      expect(response.body.email).toBe('newadmin@test.com');
      expect(response.body.role).toBe('admin');
    });

    it('should normalize email to lowercase', async () => {
      const adminCookie = await createAdminAndLogin();
      
      const newUserData = {
        email: 'NewUser@TEST.COM',
        role: 'user',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/users')
        .set('Cookie', adminCookie)
        .send(newUserData);

      expect(response.status).toBe(201);
      expect(response.body.email).toBe('newuser@test.com');
    });

    it('should return 400 for missing required fields', async () => {
      const adminCookie = await createAdminAndLogin();

      // Missing email
      let response = await request(app)
        .post('/api/users')
        .set('Cookie', adminCookie)
        .send({ role: 'user', password: 'password123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email, role, and password are required');

      // Missing role
      response = await request(app)
        .post('/api/users')
        .set('Cookie', adminCookie)
        .send({ email: 'test@test.com', password: 'password123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email, role, and password are required');

      // Missing password
      response = await request(app)
        .post('/api/users')
        .set('Cookie', adminCookie)
        .send({ email: 'test@test.com', role: 'user' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email, role, and password are required');
    });

    it('should return 400 for invalid email format', async () => {
      const adminCookie = await createAdminAndLogin();
      
      const invalidEmails = [
        'invalid-email',
        'invalid@',
        '@invalid.com',
        'invalid.email',
        'invalid@.com',
        'invalid@com.',
        ''
      ];

      for (const email of invalidEmails) {
        const response = await request(app)
          .post('/api/users')
          .set('Cookie', adminCookie)
          .send({ email, role: 'user', password: 'password123' });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Invalid email format');
      }
    });

    it('should return 400 for invalid role', async () => {
      const adminCookie = await createAdminAndLogin();
      
      const invalidRoles = ['superuser', 'moderator', 'guest', '', 'ADMIN', 'USER'];

      for (const role of invalidRoles) {
        const response = await request(app)
          .post('/api/users')
          .set('Cookie', adminCookie)
          .send({ email: 'test@test.com', role, password: 'password123' });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Role must be "user", "admin", or "superadmin"');
      }
    });

    it('should return 400 for password too short', async () => {
      const adminCookie = await createAdminAndLogin();
      
      const shortPasswords = ['', '1', '12', '123', '1234', '12345'];

      for (const password of shortPasswords) {
        const response = await request(app)
          .post('/api/users')
          .set('Cookie', adminCookie)
          .send({ email: 'test@test.com', role: 'user', password });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Password must be at least 6 characters long');
      }
    });

    it('should return 409 for duplicate email', async () => {
      const adminCookie = await createAdminAndLogin();
      
      // Create first user
      const userData = {
        email: 'duplicate@test.com',
        role: 'user',
        password: 'password123'
      };

      const firstResponse = await request(app)
        .post('/api/users')
        .set('Cookie', adminCookie)
        .send(userData);

      expect(firstResponse.status).toBe(201);

      // Try to create user with same email
      const secondResponse = await request(app)
        .post('/api/users')
        .set('Cookie', adminCookie)
        .send(userData);

      expect(secondResponse.status).toBe(409);
      expect(secondResponse.body.error).toBe('User with this email already exists');
    });

    it('should return 409 for duplicate email with different case', async () => {
      const adminCookie = await createAdminAndLogin();
      
      // Create first user
      await request(app)
        .post('/api/users')
        .set('Cookie', adminCookie)
        .send({ email: 'test@example.com', role: 'user', password: 'password123' });

      // Try to create user with same email but different case
      const response = await request(app)
        .post('/api/users')
        .set('Cookie', adminCookie)
        .send({ email: 'TEST@EXAMPLE.COM', role: 'user', password: 'password123' });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('User with this email already exists');
    });

    it('should return 403 for regular users', async () => {
      const userCookie = await createRegularUserAndLogin();
      
      const newUserData = {
        email: 'newuser@test.com',
        role: 'user',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/users')
        .set('Cookie', userCookie)
        .send(newUserData);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Admin access required');
    });

    it('should return 401 for unauthenticated requests', async () => {
      const newUserData = {
        email: 'newuser@test.com',
        role: 'user',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/users')
        .send(newUserData);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Authentication required');
    });

    it('should handle database errors gracefully', async () => {
      const adminCookie = await createAdminAndLogin();
      
      const newUserData = {
        email: 'newuser@test.com',
        role: 'user',
        password: 'password123'
      };

      // Close database connection to simulate error
      await mongoose.connection.close();

      const response = await request(app)
        .post('/api/users')
        .set('Cookie', adminCookie)
        .send(newUserData);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to create user');

      // Reconnect for cleanup
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/test-users-db');
    });

    it('should hash password before storing', async () => {
      const adminCookie = await createAdminAndLogin();
      
      const newUserData = {
        email: 'passwordtest@test.com',
        role: 'user',
        password: 'plainpassword123'
      };

      const response = await request(app)
        .post('/api/users')
        .set('Cookie', adminCookie)
        .send(newUserData);

      expect(response.status).toBe(201);

      // Check that password is hashed in database
      const createdUser = await User.findById(response.body._id);
      expect(createdUser!.password).not.toBe('plainpassword123');
      expect(createdUser!.password.length).toBeGreaterThan(20); // Hashed passwords are longer
    });

    it('should accept valid email formats', async () => {
      const adminCookie = await createAdminAndLogin();
      
      const validEmails = [
        'user@example.com',
        'user.name@example.com',
        'user+tag@example.com',
        'user123@example123.com',
        'a@b.co'
      ];

      for (let i = 0; i < validEmails.length; i++) {
        const response = await request(app)
          .post('/api/users')
          .set('Cookie', adminCookie)
          .send({ 
            email: validEmails[i], 
            role: 'user', 
            password: 'password123' 
          });

        expect(response.status).toBe(201);
        expect(response.body.email).toBe(validEmails[i].toLowerCase());
      }
    });

    it('should create users with proper timestamps', async () => {
      const adminCookie = await createAdminAndLogin();
      
      const beforeCreate = new Date();
      
      const response = await request(app)
        .post('/api/users')
        .set('Cookie', adminCookie)
        .send({ email: 'timestamp@test.com', role: 'user', password: 'password123' });

      const afterCreate = new Date();

      expect(response.status).toBe(201);
      
      const createdAt = new Date(response.body.createdAt);
      expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    });
  });

  describe('PUT /api/users/:id (Update User)', () => {
    it('should update user email and role', async () => {
      // Create a user to update
      const user = new User({ email: 'update@test.com', password: 'password123', role: 'user' });
      await user.save();

      const adminCookie = await createAdminAndLogin();

      const updateData = {
        email: 'updated@test.com',
        role: 'admin'
      };

      const response = await request(app)
        .put(`/api/users/${user._id}`)
        .set('Cookie', adminCookie)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.email).toBe('updated@test.com');
      expect(response.body.role).toBe('admin');

      // Verify in database
      const updatedUser = await User.findById(user._id);
      expect(updatedUser!.email).toBe('updated@test.com');
      expect(updatedUser!.role).toBe('admin');
    });

    it('should return 404 for non-existent user', async () => {
      const adminCookie = await createAdminAndLogin();
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .put(`/api/users/${fakeId}`)
        .set('Cookie', adminCookie)
        .send({ email: 'test@test.com' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });

    it('should return 409 for duplicate email', async () => {
      // Create two users
      const user1 = new User({ email: 'user1@test.com', password: 'password123', role: 'user' });
      const user2 = new User({ email: 'user2@test.com', password: 'password123', role: 'user' });
      await user1.save();
      await user2.save();

      const adminCookie = await createAdminAndLogin();

      // Try to update user2's email to user1's email
      const response = await request(app)
        .put(`/api/users/${user2._id}`)
        .set('Cookie', adminCookie)
        .send({ email: 'user1@test.com' });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Email already exists');
    });
  });

  describe('DELETE /api/users/:id (Delete User)', () => {
    it('should delete user successfully', async () => {
      // Create a user to delete
      const user = new User({ email: 'delete@test.com', password: 'password123', role: 'user' });
      await user.save();

      const adminCookie = await createAdminAndLogin();

      const response = await request(app)
        .delete(`/api/users/${user._id}`)
        .set('Cookie', adminCookie);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User deleted successfully');

      // Verify user is deleted from database
      const deletedUser = await User.findById(user._id);
      expect(deletedUser).toBeNull();
    });

    it('should return 404 for non-existent user', async () => {
      const adminCookie = await createAdminAndLogin();
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .delete(`/api/users/${fakeId}`)
        .set('Cookie', adminCookie);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });

    it('should require admin access', async () => {
      const user = new User({ email: 'delete@test.com', password: 'password123', role: 'user' });
      await user.save();

      const userCookie = await createRegularUserAndLogin();

      const response = await request(app)
        .delete(`/api/users/${user._id}`)
        .set('Cookie', userCookie);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Admin access required');
    });
  });

  describe('Password Change Functionality', () => {
    it('should change password with valid current password and strong new password', async () => {
      // Generate unique email to avoid conflicts using random string
      const uniqueEmail = `passwordchange${Math.random().toString(36).substring(2, 15)}@test.com`;
      
      // Create a user
      const user = new User({ email: uniqueEmail, password: 'oldPassword123!', role: 'user' });
      await user.save();

      // Login as the user
      const userCookie = await createUserAndLogin(uniqueEmail, 'oldPassword123!', 'user');

      const updateData = {
        currentPassword: 'oldPassword123!',
        newPassword: 'NewStrongPass123!'
      };

      const response = await request(app)
        .put(`/api/users/${user._id}`)
        .set('Cookie', userCookie)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.email).toBe(uniqueEmail);

      // Verify password was actually changed by trying to login with new password
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: uniqueEmail, password: 'NewStrongPass123!' });

      expect(loginResponse.status).toBe(200);
    });

    it('should reject password change with weak new password', async () => {
      // Generate unique email to avoid conflicts using random string
      const uniqueEmail = `weakpass${Math.random().toString(36).substring(2, 15)}@test.com`;
      
      // Create a user
      const user = new User({ email: uniqueEmail, password: 'oldPassword123!', role: 'user' });
      await user.save();

      // Login as the user
      const userCookie = await createUserAndLogin(uniqueEmail, 'oldPassword123!', 'user');

      // Test only the basic password length requirement since that's what's implemented
      const updateData = {
        currentPassword: 'oldPassword123!',
        newPassword: 'short' // Too short (less than 6 characters)
      };

      const response = await request(app)
        .put(`/api/users/${user._id}`)
        .set('Cookie', userCookie)
        .send(updateData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('New password must be at least 6 characters long');
    });
  });

  
}); 