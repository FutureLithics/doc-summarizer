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

// Users management (admin only)
router.get('/users', requireAuth as any, requireAdmin as any, (req: Request, res: Response) => {
    res.render('users', { title: 'User Management - DocExtract' });
});

// API Routes
// Users API (admin only)
router.get('/api/users', requireAuth as any, requireAdmin as any, async (req: Request, res: Response) => {
    try {
        const User = (await import('../models/User')).default;
        const users = await User.find({}, 'email role createdAt').sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Create new user (admin only)
router.post('/api/users', requireAuth as any, requireAdmin as any, async (req: Request, res: Response) => {
  try {
      const { email, role, password } = req.body;

      // Validate required fields
      if (!email || !role || !password) {
          return res.status(400).json({ 
              error: 'Email, role, and password are required' 
          });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
          return res.status(400).json({ 
              error: 'Invalid email format' 
          });
      }

      // Validate role
      if (!['user', 'admin'].includes(role)) {
          return res.status(400).json({ 
              error: 'Role must be either "user" or "admin"' 
          });
      }

      // Validate password length
      if (password.length < 6) {
          return res.status(400).json({ 
              error: 'Password must be at least 6 characters long' 
          });
      }

      const User = (await import('../models/User')).default;

      // Check if user already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
          return res.status(409).json({ 
              error: 'User with this email already exists' 
          });
      }

      // Create new user
      const newUser = new User({
          email: email.toLowerCase(),
          password,
          role
      });

      await newUser.save();

      // Return user without password
      const userResponse = {
          _id: newUser._id,
          email: newUser.email,
          role: newUser.role,
          createdAt: newUser.createdAt
      };

      res.status(201).json(userResponse);
  } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: 'Failed to create user' });
  }
});

export default router; 