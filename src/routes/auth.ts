import { Router, Request, Response } from 'express';
import User from '../models/User';
import { requireGuest } from '../middleware/auth';

const router = Router();

interface AuthRequest {
  email: string;
  password: string;
}

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 */

/**
 * @swagger
 * /auth/signup:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Invalid input
 */
const signupHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as AuthRequest;
    
    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ message: 'Password must be at least 6 characters long' });
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(409).json({ message: 'User already exists' });
      return;
    }

    // Create new user
    const user = new User({ email, password });
    await user.save();

    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login to the application
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *       401:
 *         description: Invalid credentials
 */
const loginHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as AuthRequest;
    
    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required' });
      return;
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    // Check password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    // Set user session
    const session = req.session as any;
    session.user = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    res.json({ 
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const logoutHandler = async (req: Request, res: Response): Promise<void> => {
  const session = req.session as any;
  session.destroy((err: any) => {
    if (err) {
      console.error('Logout error:', err);
      res.status(500).json({ message: 'Could not log out' });
      return;
    }
    res.json({ message: 'Logged out successfully' });
  });
};

// Web routes (render forms)
router.get('/login', requireGuest, (req: Request, res: Response) => {
  res.render('layout', {
    title: 'Login',
    page: 'login'
  });
});

router.get('/signup', requireGuest, (req: Request, res: Response) => {
  res.render('layout', {
    title: 'Sign Up',
    page: 'signup'
  });
});

// API routes
router.post('/signup', signupHandler);
router.post('/login', loginHandler);
router.post('/logout', logoutHandler);

export default router; 