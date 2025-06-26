import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: Get all users (Admin only)
 *     description: Retrieve a list of all users in the system. Only accessible by administrators.
 *     security:
 *       - sessionAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Authorization
 *         schema:
 *           type: string
 *           example: "Bearer your-jwt-token-here"
 *         required: false
 *         description: Bearer token for authentication (alternative to session)
 *     responses:
 *       200:
 *         description: List of users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                     description: User's unique identifier
 *                     example: "507f1f77bcf86cd799439011"
 *                   email:
 *                     type: string
 *                     format: email
 *                     description: User's email address
 *                     example: "admin@docextract.com"
 *                   role:
 *                     type: string
 *                     enum: [user, admin]
 *                     description: User's role in the system
 *                     example: "admin"
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                     description: Date when the user was created
 *                     example: "2024-01-15T10:30:00.000Z"
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Authentication required"
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Admin access required"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Failed to fetch users"
 */
// Get all users (admin only)
router.get('/', requireAuth as any, requireAdmin as any, async (req: any, res: Response) => {
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
router.post('/', requireAuth as any, requireAdmin as any, async (req: Request, res: Response) => {
  try {
    const { email, role, password } = req.body;

    // Validate required fields (check for missing values)
    if (email === undefined || email === null || role === undefined || role === null || password === undefined || password === null) {
      res.status(400).json({ 
        error: 'Email, role, and password are required' 
      });
      return;
    }

    // Validate email format (empty string should fail email validation, not required field validation)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ 
        error: 'Invalid email format' 
      });
      return;
    }

    // Validate role (empty string should fail role validation, not required field validation)
    if (!['user', 'admin'].includes(role)) {
      res.status(400).json({ 
        error: 'Role must be either "user" or "admin"' 
      });
      return;
    }

    // Validate password length (empty string should fail length validation, not required field validation)
    if (password.length < 6) {
      res.status(400).json({ 
        error: 'Password must be at least 6 characters long' 
      });
      return;
    }

    const User = (await import('../models/User')).default;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      res.status(409).json({ 
        error: 'User with this email already exists' 
      });
      return;
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