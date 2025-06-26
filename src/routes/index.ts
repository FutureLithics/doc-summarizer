import { Router, Request, Response } from 'express';
import authRoutes from './auth';
import extractionRoutes from './extractions';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     responses:
 *       200:
 *         description: API health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 */
router.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Home route (no auth required)
router.get('/', (req, res) => {
    res.render('home', { title: 'DocExtract - Extract text from documents' });
});

// Authentication routes (public)
router.use('/auth', authRoutes);

// Protected routes
router.use('/extractions', requireAuth as any, extractionRoutes);
router.use('/extraction', requireAuth as any, extractionRoutes);

export default router; 