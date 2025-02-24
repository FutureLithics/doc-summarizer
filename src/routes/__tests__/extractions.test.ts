import request from 'supertest';
import app from '../../app';
import path from 'path';
import { Server } from 'http';
import mongoose from 'mongoose';
import Extraction from '../../models/Extraction';

let server: Server;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/test-db');
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
  await Extraction.deleteMany({});
});

describe('Extraction Routes', () => {
  describe('GET /api/extractions', () => {
    it('should return empty list initially', async () => {
      const response = await request(app).get('/api/extractions');
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return list of extractions after upload', async () => {
      const uploadResponse = await request(app)
        .post('/api/extractions/upload')
        .attach('file', Buffer.from('Test document content'), {
          filename: 'test.txt',
          contentType: 'text/plain'
        });

      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      const response = await request(app).get('/api/extractions');
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toHaveProperty('fileName', 'test.txt');
      expect(response.body[0]).toHaveProperty('status');
      expect(response.body[0]).not.toHaveProperty('originalText');
    });
  });

  describe('POST /api/extractions/upload', () => {
    it('should accept PDF file upload', async () => {
      const response = await request(app)
        .post('/api/extractions/upload')
        .attach('file', path.join(__dirname, '../__fixtures__/test.pdf'));

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('extractionId');
    });

    it('should reject invalid file types', async () => {
      const response = await request(app)
        .post('/api/extractions/upload')
        .attach('file', Buffer.from('fake image data'), {
          filename: 'test.jpg',
          contentType: 'image/jpeg'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/extractions/:id', () => {
    it('should return 404 for non-existent extraction', async () => {
      const response = await request(app).get('/api/extractions/507f1f77bcf86cd799439011');
      expect(response.status).toBe(404);
    });

    it('should return extraction after upload', async () => {
      // First upload a file
      const uploadResponse = await request(app)
        .post('/api/extractions/upload')
        .attach('file', path.join(__dirname, '../__fixtures__/test.pdf'));

      const { extractionId } = uploadResponse.body;

      // Then get the extraction
      const response = await request(app).get(`/api/extractions/${extractionId}`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
    });
  });
}); 