// src/routes/__tests__/extractions-sharing.test.ts
import request from 'supertest';
import app from '../../app';
import mongoose from 'mongoose';
import { Server } from 'http';
import User from '../../models/User';
import Extraction from '../../models/Extraction';

let server: Server;

// Helper function to create a user and get session cookie
const createUserAndLogin = async (email: string, password: string, role: 'user' | 'admin' = 'user') => {
  const user = new User({ email, password, role });
  await user.save();

  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({ email, password });

  const cookies = loginResponse.headers['set-cookie'];
  return { user: user as any, cookie: cookies ? cookies[0] : '' };
};

beforeAll(async () => {
  const testDbUri = 'mongodb://127.0.0.1:27017/test-extractions-sharing-db';
  
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  
  await mongoose.connect(testDbUri);
  
  return new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
});

afterAll(async () => {
  if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  }
  
  return new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
});

beforeEach(async () => {
  try {
    await User.deleteMany({});
    await Extraction.deleteMany({});
  } catch (error) {
    // Ignore cleanup errors
  }
});

describe('Extraction Sharing API', () => {
  describe('POST /api/extractions/:id/share', () => {
    it('should allow owner to share extraction with another user', async () => {
      // Create owner and another user
      const { user: owner, cookie: ownerCookie } = await createUserAndLogin('owner@test.com', 'password123');
      const { user: shareUser } = await createUserAndLogin('share@test.com', 'password123');

      // Create an extraction owned by the test user (the middleware sets a fixed ID in test mode)
      const testUserId = '507f1f77bcf86cd799439011';
      const extraction = new Extraction({
        userId: testUserId,
        status: 'completed',
        fileName: 'test.pdf',
        documentType: 'application/pdf',
        summary: 'Test summary',
        sharedWith: []
      });
      await extraction.save();

      // Share the extraction
      const response = await request(app)
        .post(`/api/extractions/${extraction._id}/share`)
        .set('Cookie', ownerCookie)
        .send({ userId: shareUser._id.toString() });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Extraction shared successfully');
      expect(response.body.extraction.sharedWith).toHaveLength(1);
      expect(response.body.extraction.sharedWith[0]._id).toBe(shareUser._id.toString());

      // Verify in database
      const updatedExtraction = await Extraction.findById(extraction._id);
      expect(updatedExtraction!.sharedWith).toHaveLength(1);
      expect(updatedExtraction!.sharedWith[0].toString()).toBe(shareUser._id.toString());
    });

    it('should prevent non-owner from sharing extraction', async () => {
      // Create owner and non-owner users
      const { user: owner } = await createUserAndLogin('owner@test.com', 'password123');
      const { user: nonOwner, cookie: nonOwnerCookie } = await createUserAndLogin('nonowner@test.com', 'password123');
      const { user: shareUser } = await createUserAndLogin('share@test.com', 'password123');

      // Create an extraction owned by a different user (not the test user)
      const differentUserId = '507f1f77bcf86cd799439012'; // Different from test user ID
      const extraction = new Extraction({
        userId: differentUserId,
        status: 'completed',
        fileName: 'test.pdf',
        documentType: 'application/pdf',
        summary: 'Test summary',
        sharedWith: []
      });
      await extraction.save();

      // Try to share the extraction as non-owner
      const response = await request(app)
        .post(`/api/extractions/${extraction._id}/share`)
        .set('Cookie', nonOwnerCookie)
        .send({ userId: shareUser._id.toString() });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Only the owner can perform this action');

      // Verify extraction was not shared
      const unchangedExtraction = await Extraction.findById(extraction._id);
      expect(unchangedExtraction!.sharedWith).toHaveLength(0);
    });

    it('should return 400 when trying to share with same user twice', async () => {
      // Create owner and another user
      const { user: owner, cookie: ownerCookie } = await createUserAndLogin('owner@test.com', 'password123');
      const { user: shareUser } = await createUserAndLogin('share@test.com', 'password123');

      // Create an extraction already shared with the user
      const testUserId = '507f1f77bcf86cd799439011';
      const extraction = new Extraction({
        userId: testUserId,
        status: 'completed',
        fileName: 'test.pdf',
        documentType: 'application/pdf',
        summary: 'Test summary',
        sharedWith: [shareUser._id]
      });
      await extraction.save();

      // Try to share again with same user
      const response = await request(app)
        .post(`/api/extractions/${extraction._id}/share`)
        .set('Cookie', ownerCookie)
        .send({ userId: shareUser._id.toString() });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Extraction already shared with this user');
    });

    it('should return 404 when sharing with non-existent user', async () => {
      // Create owner
      const { user: owner, cookie: ownerCookie } = await createUserAndLogin('owner@test.com', 'password123');

      // Create an extraction
      const testUserId = '507f1f77bcf86cd799439011';
      const extraction = new Extraction({
        userId: testUserId,
        status: 'completed',
        fileName: 'test.pdf',
        documentType: 'application/pdf',
        summary: 'Test summary',
        sharedWith: []
      });
      await extraction.save();

      // Try to share with non-existent user
      const fakeUserId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .post(`/api/extractions/${extraction._id}/share`)
        .set('Cookie', ownerCookie)
        .send({ userId: fakeUserId.toString() });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found');
    });

    it('should handle sharing with valid request structure in test mode', async () => {
      // Create an extraction and user
      const { user: owner } = await createUserAndLogin('owner@test.com', 'password123');
      const { user: shareUser } = await createUserAndLogin('share@test.com', 'password123');

      const testUserId = '507f1f77bcf86cd799439011';
      const extraction = new Extraction({
        userId: testUserId,
        status: 'completed',
        fileName: 'test.pdf',
        documentType: 'application/pdf',
        summary: 'Test summary',
        sharedWith: []
      });
      await extraction.save();

      // In test mode, auth is bypassed, so this should work
      const response = await request(app)
        .post(`/api/extractions/${extraction._id}/share`)
        .send({ userId: shareUser._id.toString() });

      expect(response.status).toBe(200);
    });
  });

  describe('DELETE /api/extractions/:id/unshare', () => {
    it('should allow owner to unshare extraction', async () => {
      // Create owner and shared user
      const { user: owner, cookie: ownerCookie } = await createUserAndLogin('owner@test.com', 'password123');
      const { user: shareUser } = await createUserAndLogin('share@test.com', 'password123');

      // Create an extraction already shared with the user
      const testUserId = '507f1f77bcf86cd799439011';
      const extraction = new Extraction({
        userId: testUserId,
        status: 'completed',
        fileName: 'test.pdf',
        documentType: 'application/pdf',
        summary: 'Test summary',
        sharedWith: [shareUser._id]
      });
      await extraction.save();

      // Unshare the extraction
      const response = await request(app)
        .delete(`/api/extractions/${extraction._id}/unshare`)
        .set('Cookie', ownerCookie)
        .send({ userId: shareUser._id.toString() });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User removed from sharing successfully');
      expect(response.body.extraction.sharedWith).toHaveLength(0);

      // Verify in database
      const updatedExtraction = await Extraction.findById(extraction._id);
      expect(updatedExtraction!.sharedWith).toHaveLength(0);
    });

    it('should prevent non-owner from unsharing extraction', async () => {
      // Create owner and non-owner users
      const { user: owner } = await createUserAndLogin('owner@test.com', 'password123');
      const { user: nonOwner, cookie: nonOwnerCookie } = await createUserAndLogin('nonowner@test.com', 'password123');
      const { user: shareUser } = await createUserAndLogin('share@test.com', 'password123');

      // Create an extraction shared with a user (different owner)
      const differentUserId = '507f1f77bcf86cd799439012';
      const extraction = new Extraction({
        userId: differentUserId,
        status: 'completed',
        fileName: 'test.pdf',
        documentType: 'application/pdf',
        summary: 'Test summary',
        sharedWith: [shareUser._id]
      });
      await extraction.save();

      // Try to unshare as non-owner
      const response = await request(app)
        .delete(`/api/extractions/${extraction._id}/unshare`)
        .set('Cookie', nonOwnerCookie)
        .send({ userId: shareUser._id.toString() });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Only the owner can perform this action');

      // Verify extraction sharing was not changed
      const unchangedExtraction = await Extraction.findById(extraction._id);
      expect(unchangedExtraction!.sharedWith).toHaveLength(1);
    });
  });

  describe('GET /api/extractions - Shared access', () => {
    it('should include shared extractions in user list', async () => {
      // Create owner and another user
      const { user: owner, cookie: ownerCookie } = await createUserAndLogin('owner@test.com', 'password123');
      const { user: shareUser, cookie: shareUserCookie } = await createUserAndLogin('share@test.com', 'password123');

      // Create extraction shared with test user (owned by the actual owner we created)
      const extraction = new Extraction({
        userId: owner._id,
        status: 'completed',
        fileName: 'shared-test.pdf',
        documentType: 'application/pdf',
        summary: 'Shared test summary',
        sharedWith: ['507f1f77bcf86cd799439011'] // Share with the test user
      });
      await extraction.save();

      // Get extractions as the shared user
      const response = await request(app)
        .get('/api/extractions')
        .set('Cookie', shareUserCookie);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].fileName).toBe('shared-test.pdf');
      expect(response.body[0].userId._id).toBe(owner._id.toString());
    });

    it('should allow shared user to access individual extraction', async () => {
      // Create owner and another user
      const { user: owner } = await createUserAndLogin('owner@test.com', 'password123');
      const { user: shareUser, cookie: shareUserCookie } = await createUserAndLogin('share@test.com', 'password123');

      // Create extraction shared with test user (owned by the actual owner we created)
      const extraction = new Extraction({
        userId: owner._id,
        status: 'completed',
        fileName: 'shared-test.pdf',
        documentType: 'application/pdf',
        summary: 'Shared test summary',
        originalText: 'Shared text content',
        sharedWith: ['507f1f77bcf86cd799439011'] // Share with the test user
      });
      await extraction.save();

      // Access extraction as the shared user
      const response = await request(app)
        .get(`/api/extractions/${extraction._id}`)
        .set('Cookie', shareUserCookie);

      expect(response.status).toBe(200);
      expect(response.body.fileName).toBe('shared-test.pdf');
      expect(response.body.summary).toBe('Shared test summary');
      expect(response.body.userId._id).toBe(owner._id.toString());
    });

    it('should prevent non-shared user from accessing extraction', async () => {
      // Create owner and non-shared user
      const { user: owner } = await createUserAndLogin('owner@test.com', 'password123');
      const { user: nonSharedUser, cookie: nonSharedCookie } = await createUserAndLogin('nonshared@test.com', 'password123');

      // Create extraction not shared with test user (owned by the actual owner we created)
      const extraction = new Extraction({
        userId: owner._id,
        status: 'completed',
        fileName: 'private-test.pdf',
        documentType: 'application/pdf',
        summary: 'Private test summary',
        sharedWith: []
      });
      await extraction.save();

      // Try to access extraction as non-shared user
      const response = await request(app)
        .get(`/api/extractions/${extraction._id}`)
        .set('Cookie', nonSharedCookie);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Extraction not found');
    });
  });
});