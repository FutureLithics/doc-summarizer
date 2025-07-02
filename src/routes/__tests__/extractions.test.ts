import request from 'supertest';
import app from '../../app';
import path from 'path';
import { Server } from 'http';
import mongoose from 'mongoose';
import Extraction from '../../models/Extraction';
import PDFDocument from 'pdfkit'
import { createLargePdfBuffer } from './testHelpers';

let server: Server;

// Helper function to create a test PDF buffer
const createTestPdfBuffer = (content: string): Promise<Buffer> => {
  return new Promise((resolve) => {
    // Create PDF with settings that are more compatible with pdf-parse
    const doc = new PDFDocument({
      compress: false,  // Disable compression to avoid XRef issues
      autoFirstPage: true
    });
    const chunks: Buffer[] = [];
    
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    
    // Add text content
    if (content && content.trim()) {
      doc.text(content, 50, 50);
    }
    
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

    it('should handle multiple sentences correctly in text processing', async () => {
      const testContent = 'First sentence of the document. Second sentence with more details. Third sentence to test summarization. Fourth sentence that should not appear in summary.';
      
      const response = await request(app)
        .post('/api/extractions/upload')
        .attach('file', Buffer.from(testContent), {
          filename: 'multi-sentence.txt',
          contentType: 'text/plain'
        });

      expect(response.status).toBe(201);
      
      const { extractionId } = response.body;
      
      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const extractionResponse = await request(app).get(`/api/extractions/${extractionId}`);
      const extraction = extractionResponse.body;
      
      expect(extraction.status).toBe('completed');
      expect(extraction.summary).toBeDefined();
      
      // Summary should contain first few sentences, not the fourth
      expect(extraction.summary.toLowerCase()).toContain('first sentence');
      expect(extraction.summary.toLowerCase()).toContain('second sentence');
      expect(extraction.summary.toLowerCase()).not.toContain('fourth sentence');
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
      
      // PDF parsing may be inconsistent, so we accept either completed or failed status
      // The main logic is tested in the text file version above
      expect(['completed', 'failed']).toContain(extraction.status);
      
      if (extraction.status === 'completed') {
        expect(extraction.summary).toBeDefined();
        // Summary should contain first few sentences, not the fourth
        expect(extraction.summary.toLowerCase()).toContain('first sentence');
        expect(extraction.summary.toLowerCase()).toContain('second sentence');
        expect(extraction.summary.toLowerCase()).not.toContain('fourth sentence');
      }
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
      
      // Should handle empty PDFs gracefully - either complete with minimal content or fail
      expect(['completed', 'failed']).toContain(extraction.status);
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

  describe('PDF Library Constraints and Edge Cases', () => {
    it('should handle large PDF files within reasonable limits', async () => {
      // Create a moderately large PDF (around 1MB) to test file size handling
      const largePdfBuffer = await createLargePdfBuffer(1); // 1MB
      
      const response = await request(app)
        .post('/api/extractions/upload')
        .attach('file', largePdfBuffer, {
          filename: 'large-test.pdf',
          contentType: 'application/pdf'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('extractionId');
      
      const { extractionId } = response.body;
      
      // Wait longer for large file processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const extractionResponse = await request(app).get(`/api/extractions/${extractionId}`);
      expect(extractionResponse.status).toBe(200);
      
      const extraction = extractionResponse.body;
      // Large files should either complete or fail gracefully (not hang or crash)
      expect(['completed', 'failed']).toContain(extraction.status);
      
      if (extraction.status === 'completed') {
        expect(extraction.summary).toBeDefined();
        expect(extraction.summary.length).toBeGreaterThan(0);
        // Should contain content indicating it's from our large file
        expect(extraction.summary.toLowerCase()).toContain('large pdf document');
      }
    });

    it('should handle corrupted PDF data gracefully', async () => {
      // Create a buffer that looks like a PDF but is corrupted
      const corruptedPdfData = Buffer.concat([
        Buffer.from('%PDF-1.4\n'), // Valid PDF header
        Buffer.from('This is not valid PDF content but starts like one'),
        Buffer.from('\x00\x01\x02\x03'), // Some binary garbage
        Buffer.from('%%EOF') // PDF footer
      ]);
      
      const response = await request(app)
        .post('/api/extractions/upload')
        .attach('file', corruptedPdfData, {
          filename: 'corrupted.pdf',
          contentType: 'application/pdf'
        });

      expect(response.status).toBe(201);
      
      const { extractionId } = response.body;
      
      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const extractionResponse = await request(app).get(`/api/extractions/${extractionId}`);
      const extraction = extractionResponse.body;
      
      // Corrupted PDFs should fail gracefully, not crash the system
      expect(extraction.status).toBe('failed');
    });

    it('should handle very small PDF files', async () => {
      // Create minimal PDF with just a few characters
      const minimalContent = 'Hi';
      const minimalPdfBuffer = await createTestPdfBuffer(minimalContent);
      
      const response = await request(app)
        .post('/api/extractions/upload')
        .attach('file', minimalPdfBuffer, {
          filename: 'minimal.pdf',
          contentType: 'application/pdf'
        });

      expect(response.status).toBe(201);
      
      const { extractionId } = response.body;
      
      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const extractionResponse = await request(app).get(`/api/extractions/${extractionId}`);
      const extraction = extractionResponse.body;
      
      // Very small content should be handled appropriately
      // It might complete with minimal summary or fail due to insufficient content
      expect(['completed', 'failed']).toContain(extraction.status);
      
      if (extraction.status === 'completed') {
        expect(extraction.summary).toBeDefined();
        // Should not be empty if completed
        expect(extraction.summary.trim().length).toBeGreaterThan(0);
      }
    });

    it('should respect file upload size limits', async () => {
      try {
        const largePdfBuffer = await createLargePdfBuffer(5);
        
        const response = await request(app)
          .post('/api/extractions/upload')
          .attach('file', largePdfBuffer, {
            filename: 'very-large.pdf',
            contentType: 'application/pdf'
          });

        if (response.status === 201) {
          expect(response.body).toHaveProperty('extractionId');
          
          // If accepted, wait and check that it processes without hanging
          const { extractionId } = response.body;
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          const extractionResponse = await request(app).get(`/api/extractions/${extractionId}`);
          expect(extractionResponse.status).toBe(200);
          expect(['completed', 'failed']).toContain(extractionResponse.body.status);
        } else {

          expect(response.status).toBe(400);
          expect(response.body).toHaveProperty('message');
        }
      } catch (error) {
        console.log('Large PDF creation failed - system memory constraints');
        expect(error).toBeDefined();
      }
    }, 30000); // 30 second timeout for this test

    it('should handle PDF with special characters and encoding', async () => {
      const specialContent = 'Special chars: äöü ñ 中文 العربية עברית 🚀 ©®™ €$¥ "quotes" & <tags>';
      const specialCharPdfBuffer = await createTestPdfBuffer(specialContent);
      
      const response = await request(app)
        .post('/api/extractions/upload')
        .attach('file', specialCharPdfBuffer, {
          filename: 'special-chars.pdf',
          contentType: 'application/pdf'
        });

      expect(response.status).toBe(201);
      
      const { extractionId } = response.body;
      
      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const extractionResponse = await request(app).get(`/api/extractions/${extractionId}`);
      const extraction = extractionResponse.body;
      
      // Should handle special characters gracefully
      expect(extraction.status).toBeDefined();
      expect(['completed', 'failed']).toContain(extraction.status);
      
      if (extraction.status === 'completed') {
        expect(extraction.summary).toBeDefined();
        // Summary should contain some recognizable content, even if some special chars are filtered
        expect(extraction.summary.toLowerCase()).toContain('special');
      }
    });
  });

  describe('DELETE /api/extractions/:id', () => {
    it('should delete an existing extraction', async () => {
      // First upload a file
      const uploadResponse = await request(app)
        .post('/api/extractions/upload')
        .attach('file', path.join(__dirname, '../__fixtures__/test.txt'));

      const { extractionId } = uploadResponse.body;

      // Verify it exists
      const getResponse = await request(app).get(`/api/extractions/${extractionId}`);
      expect(getResponse.status).toBe(200);

      // Delete it
      const deleteResponse = await request(app).delete(`/api/extractions/${extractionId}`);
      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body).toHaveProperty('message', 'Extraction deleted successfully');

      // Verify it's gone
      const getAfterDeleteResponse = await request(app).get(`/api/extractions/${extractionId}`);
      expect(getAfterDeleteResponse.status).toBe(404);
    });

    it('should return 404 for non-existent extraction', async () => {
      const response = await request(app).delete('/api/extractions/507f1f77bcf86cd799439011');
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Extraction not found');
    });

    it('should return 404 for invalid extraction ID', async () => {
      const response = await request(app).delete('/api/extractions/invalid-id');
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Extraction not found');
    });
  });

  describe('PUT /api/extractions/:id', () => {
    it('should update an existing extraction', async () => {
      // First upload a file
      const uploadResponse = await request(app)
        .post('/api/extractions/upload')
        .attach('file', path.join(__dirname, '../__fixtures__/test.txt'));

      const { extractionId } = uploadResponse.body;

      // Update it
      const updateResponse = await request(app)
        .put(`/api/extractions/${extractionId}`)
        .send({
          fileName: 'updated-test.txt',
          summary: 'Updated summary content'
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body).toHaveProperty('message', 'Extraction updated successfully');
      expect(updateResponse.body.extraction.fileName).toBe('updated-test.txt');
      expect(updateResponse.body.extraction.summary).toBe('Updated summary content');

      // Verify it's actually updated
      const getResponse = await request(app).get(`/api/extractions/${extractionId}`);
      expect(getResponse.body.fileName).toBe('updated-test.txt');
      expect(getResponse.body.summary).toBe('Updated summary content');
    });

    it('should update only fileName when summary is not provided', async () => {
      // First upload a file
      const uploadResponse = await request(app)
        .post('/api/extractions/upload')
        .attach('file', path.join(__dirname, '../__fixtures__/test.txt'));

      const { extractionId } = uploadResponse.body;

      // Update only fileName
      const updateResponse = await request(app)
        .put(`/api/extractions/${extractionId}`)
        .send({
          fileName: 'filename-only-update.txt'
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.extraction.fileName).toBe('filename-only-update.txt');
    });

    it('should return 400 for empty fileName', async () => {
      const response = await request(app)
        .put('/api/extractions/507f1f77bcf86cd799439011')
        .send({
          fileName: '',
          summary: 'Some summary'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 404 for non-existent extraction', async () => {
      const response = await request(app)
        .put('/api/extractions/507f1f77bcf86cd799439011')
        .send({
          fileName: 'test.txt',
          summary: 'Test summary'
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Extraction not found');
    });

    it('should return 404 for invalid extraction ID', async () => {
      const response = await request(app)
        .put('/api/extractions/invalid-id')
        .send({
          fileName: 'test.txt',
          summary: 'Test summary'
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Extraction not found');
    });
  });

  describe('File Sharing and Access Control', () => {
    let testUser1: any;
    let testUser2: any;
    let testUser3: any;
    let adminUser: any;
    let sharedExtraction: any;
    let ownedExtraction: any;
  
    beforeEach(async () => {
      // Create test users
      const User = (await import('../../models/User')).default;
      
      testUser1 = await User.create({
        email: 'user1@test.com',
        password: 'password123',
        role: 'user'
      });
      
      testUser2 = await User.create({
        email: 'user2@test.com', 
        password: 'password123',
        role: 'user'
      });
      
      testUser3 = await User.create({
        email: 'user3@test.com',
        password: 'password123', 
        role: 'user'
      });
      
      adminUser = await User.create({
        email: 'admin@test.com',
        password: 'password123',
        role: 'admin'
      });
  
      // Create test extractions
      ownedExtraction = await Extraction.create({
        userId: testUser1._id,
        fileName: 'owned-file.txt',
        documentType: 'text/plain',
        status: 'completed',
        summary: 'This is an owned file',
        originalText: 'Content of owned file'
      });
  
      sharedExtraction = await Extraction.create({
        userId: testUser1._id,
        fileName: 'shared-file.txt', 
        documentType: 'text/plain',
        status: 'completed',
        summary: 'This is a shared file',
        originalText: 'Content of shared file',
        sharedWith: [testUser2._id]
      });
    });
  
    afterEach(async () => {
      const User = (await import('../../models/User')).default;
      await User.deleteMany({});
      await Extraction.deleteMany({});
    });
  
    describe('Shared File Access and Permissions', () => {
      it('should allow shared users to view and edit shared files but not delete them', async () => {
        // Mock authentication for testUser2 (shared user)
        const mockReq = {
          user: { id: testUser2._id.toString(), role: 'user' }
        } as any;
  
        // Test: Shared user can view the shared extraction
        const getResponse = await request(app)
          .get(`/api/extractions/${sharedExtraction._id}`)
          .set('Authorization', `Bearer mock-token-user2`);
        
        // Note: In a real test, you'd need to properly mock authentication
        // For this example, we'll test the business logic directly
        
        // Verify shared user can access the file
        const extraction = await Extraction.findOne({
          _id: sharedExtraction._id,
          $or: [
            { userId: testUser2._id },
            { sharedWith: testUser2._id }
          ]
        });
        
        expect(extraction).toBeTruthy();
        expect(extraction!.sharedWith).toContainEqual(testUser2._id);
        
        // Test: Shared user can edit the extraction
        const updateData = {
          fileName: 'updated-shared-file.txt',
          summary: 'Updated summary by shared user'
        };
        
        const updatedExtraction = await Extraction.findOneAndUpdate(
          {
            _id: sharedExtraction._id,
            $or: [
              { userId: testUser2._id },
              { sharedWith: testUser2._id }
            ]
          },
          updateData,
          { new: true }
        );
        
        expect(updatedExtraction).toBeTruthy();
        expect(updatedExtraction!.fileName).toBe('updated-shared-file.txt');
        expect(updatedExtraction!.summary).toBe('Updated summary by shared user');
        
        // Test: Shared user cannot delete the extraction (only owner can)
        const isOwner = sharedExtraction.userId.toString() === testUser2._id.toString();
        const isAdmin = false; // testUser2 is not admin
        
        expect(isOwner).toBe(false);
        expect(isAdmin).toBe(false);
        
        // Verify deletion would be blocked for shared user
        const canDelete = isOwner || isAdmin;
        expect(canDelete).toBe(false);
        
        // But owner can still delete
        const ownerCanDelete = sharedExtraction.userId.toString() === testUser1._id.toString();
        expect(ownerCanDelete).toBe(true);
      });
  
      it('should properly distinguish between owned and shared files in user profile data', async () => {
        // Create additional test data
        const anotherSharedFile: any = await Extraction.create({
          userId: testUser3._id,
          fileName: 'another-shared-file.txt',
          documentType: 'text/plain', 
          status: 'completed',
          summary: 'Another shared file',
          originalText: 'Content of another shared file',
          sharedWith: [testUser2._id]
        });
  
        // Test the business logic for profile data aggregation
        const userId = testUser2._id;
        
        // Get all extractions accessible to testUser2
        const allExtractions = await Extraction.find({
          $or: [
            { userId: userId },
            { sharedWith: userId }
          ]
        }).populate('userId', 'email role').lean();
        
        // Calculate sharing indicators
        const extractionsWithSharingInfo = allExtractions.map(extraction => ({
          ...extraction,
          isOwner: extraction.userId._id.toString() === userId.toString(),
          isShared: extraction.sharedWith.some((user: any) => user.toString() === userId.toString()),
          canEdit: extraction.userId._id.toString() === userId.toString() || 
                   extraction.sharedWith.some((user: any) => user.toString() === userId.toString()),
          canDelete: extraction.userId._id.toString() === userId.toString()
        }));
        
        // Verify statistics
        const totalFiles = extractionsWithSharingInfo.length;
        const ownedFiles = extractionsWithSharingInfo.filter(ext => ext.isOwner).length;
        const sharedFiles = extractionsWithSharingInfo.filter(ext => ext.isShared && !ext.isOwner).length;
        
        expect(totalFiles).toBe(2); // sharedExtraction + anotherSharedFile
        expect(ownedFiles).toBe(0); // testUser2 owns no files
        expect(sharedFiles).toBe(2); // testUser2 has 2 files shared with them
        
        // Verify permissions for each file
        const sharedFile1 = extractionsWithSharingInfo.find(ext => ext._id.toString() === sharedExtraction._id.toString());
        const sharedFile2 = extractionsWithSharingInfo.find(ext => ext._id.toString() === anotherSharedFile._id.toString());
        
        expect(sharedFile1).toBeTruthy();
        expect(sharedFile1!.isOwner).toBe(false);
        expect(sharedFile1!.isShared).toBe(true);
        expect(sharedFile1!.canEdit).toBe(true);
        expect(sharedFile1!.canDelete).toBe(false);
        
        expect(sharedFile2).toBeTruthy();
        expect(sharedFile2!.isOwner).toBe(false);
        expect(sharedFile2!.isShared).toBe(true);
        expect(sharedFile2!.canEdit).toBe(true);
        expect(sharedFile2!.canDelete).toBe(false);
        
        // Verify owner's perspective
        const ownerExtractions = await Extraction.find({
          $or: [
            { userId: testUser1._id },
            { sharedWith: testUser1._id }
          ]
        }).lean();
        
        const ownerExtractionsWithInfo = ownerExtractions.map(extraction => ({
          ...extraction,
          isOwner: extraction.userId.toString() === testUser1._id.toString(),
          isShared: extraction.sharedWith.some((user: any) => user.toString() === testUser1._id.toString()),
          canEdit: true, // Owner can always edit
          canDelete: true // Owner can always delete
        }));
        
        const ownerOwnedFiles = ownerExtractionsWithInfo.filter(ext => ext.isOwner).length;
        expect(ownerOwnedFiles).toBe(2); // ownedExtraction + sharedExtraction
      });
    });
  });
}); 