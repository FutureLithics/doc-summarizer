import request from 'supertest';
import app from '../../app';
import path from 'path';
import { Server } from 'http';
import fs from 'fs';

let server: Server;

beforeAll((done) => {
  server = app.listen(0, () => done());
});

afterAll((done) => {
  server.close(done);
});

describe('Extraction Routes', () => {
  describe('GET /api/extractions', () => {
    it('should return empty list initially', async () => {
      const response = await request(app).get('/api/extractions');
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return list of extractions after upload', async () => {
      // First upload a file
      const uploadResponse = await request(app)
        .post('/api/extractions/upload')
        .attach('file', Buffer.from('Test document content'), {
          filename: 'test.txt',
          contentType: 'text/plain'
        });

      // Wait a bit for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Then get the list
      const response = await request(app).get('/api/extractions');
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toHaveProperty('fileName', 'test.txt');
      expect(response.body[0]).toHaveProperty('status');
      expect(response.body[0]).toHaveProperty('summary');
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
      const response = await request(app).get('/api/extractions/999');
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