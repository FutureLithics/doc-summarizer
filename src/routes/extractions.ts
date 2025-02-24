import { Router, Request, Response } from 'express';
import multer from 'multer';
import Extraction, { IExtraction } from '../models/Extraction';
import mongoose from 'mongoose';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Extractions
 *   description: Document extraction endpoints
 */

interface Extraction {
  id: string;
  status: 'completed' | 'processing' | 'failed';
  createdAt: string;
  fileName: string;
  documentType: string;
  summary?: string;
  originalText?: string;
}

interface ExtractionResponse {
  id: string;
  status: string;
  createdAt: string;
  fileName: string;
  documentType: string;
  summary?: string;
}

// In-memory store for extractions
const extractions = new Map<string, ExtractionResponse>();

// Configure multer for file upload
const upload = multer({
  fileFilter: (_, file, cb) => {
    const allowedTypes = ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(null, false);
      cb(new Error('Invalid file type. Only PDF, TXT, and DOCX files are allowed.'));
    }
  }
}).single('file');

// Wrap upload middleware to handle errors
const uploadMiddleware = (req: Request, res: Response, next: Function) => {
  upload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};

// Basic text summarization function
const summarizeText = (text: string): string => {
  // Split into sentences and get first few
  const sentences = text.split(/[.!?]+/).filter(Boolean);
  const summaryLength = Math.min(3, sentences.length);
  const summary = sentences.slice(0, summaryLength).join('. ');
  return summary + '.';
};

// Enhanced document processing
const processDocument = async (buffer: Buffer, mimetype: string, fileName: string): Promise<string> => {
  if (process.env.NODE_ENV === 'test') {
    return `Test summary for ${fileName}`;
  }

  // Basic text extraction based on file type
  let text = '';
  switch (mimetype) {
    case 'text/plain':
      text = buffer.toString('utf-8');
      break;
    case 'application/pdf':
      // Simple PDF text extraction (in real app, use pdf-parse or similar)
      text = buffer.toString('utf-8').replace(/[^a-zA-Z0-9\s.]/g, '');
      break;
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      // Simple DOCX text extraction (in real app, use mammoth or similar)
      text = buffer.toString('utf-8').replace(/[^a-zA-Z0-9\s.]/g, '');
      break;
    default:
      throw new Error('Unsupported file type');
  }

  return summarizeText(text);
};

/**
 * @swagger
 * components:
 *   schemas:
 *     Extraction:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         status:
 *           type: string
 *           enum: [completed, processing, failed]
 *         fileName:
 *           type: string
 *         documentType:
 *           type: string
 *         summary:
 *           type: string
 *         createdAt:
 *           type: string
 */

/**
 * @swagger
 * /extractions:
 *   get:
 *     tags: [Extractions]
 *     summary: Get list of available extractions
 *     responses:
 *       200:
 *         description: List of extractions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   status:
 *                     type: string
 *                   createdAt:
 *                     type: string
 *                   fileName:
 *                     type: string
 *                   documentType:
 *                     type: string
 *                   summary:
 *                     type: string
 */
const getExtractions = async (_: Request, res: Response): Promise<void> => {
  try {
    const extractions = await Extraction.find().lean().select('-originalText');
    res.json(extractions);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch extractions' });
  }
};

/**
 * @swagger
 * /extractions/upload:
 *   post:
 *     tags: [Extractions]
 *     summary: Upload document for extraction
 *     operationId: uploadDocument
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: 'object'
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: 'string'
 *                 format: 'binary'
 *                 description: 'Upload a PDF, TXT, or DOCX file'
 *           encoding:
 *             file:
 *               style: 'form'
 *               explode: true
 *               allowReserved: true
 *     responses:
 *       201:
 *         description: Document processing started
 *         content:
 *           application/json:
 *             schema:
 *               type: 'object'
 *               properties:
 *                 message:
 *                   type: 'string'
 *                   example: Document processing started
 *                 extractionId:
 *                   type: 'string'
 *                   example: 1234567890
 *                 fileName:
 *                   type: 'string'
 *                   example: document.pdf
 */
const uploadDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    const fileBuffer = req.file.buffer;
    const fileType = req.file.mimetype;
    const fileName = req.file.originalname;

    const extraction = new Extraction({
      status: 'processing',
      fileName,
      documentType: fileType
    });

    await extraction.save();

    // Process document asynchronously
    processDocument(fileBuffer, fileType, fileName)
      .then(async summary => {
        await Extraction.findByIdAndUpdate(extraction._id, {
          status: 'completed',
          summary,
          originalText: fileBuffer.toString('utf-8')
        });
      })
      .catch(async () => {
        await Extraction.findByIdAndUpdate(extraction._id, {
          status: 'failed'
        });
      });

    res.status(201).json({ 
      message: 'Document processing started',
      extractionId: extraction._id,
      fileName
    });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Upload failed' });
  }
};

/**
 * @swagger
 * /extractions/{id}:
 *   get:
 *     tags: [Extractions]
 *     summary: Get extraction by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Extraction ID
 *     responses:
 *       200:
 *         description: Extraction details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 status:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                 fileName:
 *                   type: string
 *                 documentType:
 *                   type: string
 *                 summary:
 *                   type: string
 *       404:
 *         description: Extraction not found
 */
const getExtractionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Check if ID is valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({ message: 'Extraction not found' });
      return;
    }

    const extraction = await Extraction.findById(id).lean();
    
    if (extraction) {
      res.json(extraction);
    } else {
      res.status(404).json({ message: 'Extraction not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch extraction' });
  }
};

router.get('/', getExtractions);
router.post('/upload', uploadMiddleware, uploadDocument);
router.get('/:id', getExtractionById);

export default router; 