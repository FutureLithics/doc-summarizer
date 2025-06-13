import request from 'supertest';
import app from '../../app';
import path from 'path';
import { Server } from 'http';
import mongoose from 'mongoose';
import Extraction from '../../models/Extraction';
import PDFDocument from 'pdfkit'

let server: Server;

// Helper function to create a test PDF buffer
const createTestPdfBuffer = (content: string): Promise<Buffer> => {
  return new Promise((resolve) => {
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];
    
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    
    doc.text(content);
    doc.end();
  });
};

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

  describe('PDF Text Extraction', () => {
    it('should properly extract text from PDF files', async () => {
      const testContent = 'This is a test PDF document with readable content. It should be extracted properly without garbled text.';
      const pdfBuffer = await createTestPdfBuffer(testContent);
      
      const response = await request(app)
        .post('/api/extractions/upload')
        .attach('file', pdfBuffer, {
          filename: 'test-extraction.pdf',
          contentType: 'application/pdf'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('extractionId');
      
      const { extractionId } = response.body;
      
      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Get the processed extraction
      const extractionResponse = await request(app).get(`/api/extractions/${extractionId}`);
      expect(extractionResponse.status).toBe(200);
      
      const extraction = extractionResponse.body;
      expect(extraction.status).toBe('completed');
      expect(extraction.summary).toBeDefined();
      expect(extraction.summary).not.toBe('');
      
      // Verify the summary contains recognizable content (not garbled)
      expect(extraction.summary.toLowerCase()).toContain('test');
    });

    it('should handle PDF files with multiple sentences correctly', async () => {
      const testContent = 'First sentence of the document. Second sentence with more details. Third sentence to test summarization. Fourth sentence that should not appear in summary.';
      const pdfBuffer = await createTestPdfBuffer(testContent);
      
      const response = await request(app)
        .post('/api/extractions/upload')
        .attach('file', pdfBuffer, {
          filename: 'multi-sentence.pdf',
          contentType: 'application/pdf'
        });

      expect(response.status).toBe(201);
      
      const { extractionId } = response.body;
      
      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const extractionResponse = await request(app).get(`/api/extractions/${extractionId}`);
      const extraction = extractionResponse.body;
      
      expect(extraction.status).toBe('completed');
      expect(extraction.summary).toBeDefined();
      
      // Summary should contain first few sentences, not the fourth
      expect(extraction.summary.toLowerCase()).toContain('first sentence');
      expect(extraction.summary.toLowerCase()).toContain('second sentence');
      expect(extraction.summary.toLowerCase()).not.toContain('fourth sentence');
    });

    it('should handle empty PDF files gracefully', async () => {
      const emptyPdfBuffer = await createTestPdfBuffer('');
      
      const response = await request(app)
        .post('/api/extractions/upload')
        .attach('file', emptyPdfBuffer, {
          filename: 'empty.pdf',
          contentType: 'application/pdf'
        });

      expect(response.status).toBe(201);
      
      const { extractionId } = response.body;
      
      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const extractionResponse = await request(app).get(`/api/extractions/${extractionId}`);
      const extraction = extractionResponse.body;
      
      // Should fail gracefully for empty PDFs
      expect(extraction.status).toBe('failed');
    });

    it('should store properly extracted PDF text in originalText field', async () => {
      const testContent = 'This content should be stored as readable text, not garbled binary data.';
      const pdfBuffer = await createTestPdfBuffer(testContent);
      
      const response = await request(app)
        .post('/api/extractions/upload')
        .attach('file', pdfBuffer, {
          filename: 'storage-test.pdf',
          contentType: 'application/pdf'
        });

      const { extractionId } = response.body;
      
      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Get the extraction directly from database to check originalText
      const extraction = await Extraction.findById(extractionId);
      
      expect(extraction).toBeTruthy();
      expect(extraction!.status).toBe('completed');
      expect(extraction!.originalText).toBeDefined();
      expect(extraction!.originalText).toContain('This content should be stored');
      
      // Verify it's not garbled binary data
      expect(extraction!.originalText).not.toMatch(/[^\x20-\x7E\s]/); // Should not contain non-printable characters
    });
  });

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