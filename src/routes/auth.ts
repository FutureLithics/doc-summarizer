import { Router, Request, Response } from 'express';

const router = Router();

interface AuthRequest {
  email: string;
  password: string;
}

// Simple in-memory store for testing
const users: Record<string, string> = {
  'test@example.com': 'password'
};

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
  const { email, password } = req.body as AuthRequest;
  
  if (!email || !password) {
    res.status(400).json({ message: 'Invalid input' });
    return;
  }

  if (users[email]) {
    res.status(409).json({ message: 'User already exists' });
    return;
  }

  users[email] = password;
  res.status(201).json({ message: 'User created successfully' });
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
  const { email, password } = req.body as AuthRequest;
  
  if (users[email] && users[email] === password) {
    res.json({ token: 'mock-jwt-token' });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
};

router.post('/signup', signupHandler);
router.post('/login', loginHandler);

export default router; 