import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import bcrypt from 'bcryptjs';

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
// Get all users - admin gets full list, regular users get limited list for sharing
router.get('/', requireAuth as any, async (req: any, res: Response) => {
  try {
    const User = (await import('../models/User')).default;
    const userRole = req.user?.role;
    const { forSharing } = req.query;

    if (userRole === 'admin' || userRole === 'superadmin') {
      // Admins get full user list with all details
      const users = await User.find({}, 'email role createdAt').sort({ createdAt: -1 });
      res.json(users);
    } else if (forSharing === 'true') {
      // Regular users get limited list for sharing purposes only
      const users = await User.find({}, '_id email role').sort({ email: 1 });
      res.json(users);
    } else {
      // Regular users trying to access full user list without sharing context
      res.status(403).json({ 
        error: 'Admin access required for full user list. Use ?forSharing=true for sharing purposes.' 
      });
    }
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
    if (!['user', 'admin', 'superadmin'].includes(role)) {
      res.status(400).json({ 
        error: 'Role must be "user", "admin", or "superadmin"' 
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

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     tags: [Users]
 *     summary: Update user (Admin only)
 *     description: Update a user's email and/or role. Only accessible by administrators.
 *     security:
 *       - sessionAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - in: header
 *         name: Authorization
 *         schema:
 *           type: string
 *           example: "Bearer your-jwt-token-here"
 *         required: false
 *         description: Bearer token for authentication (alternative to session)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's new email address
 *                 example: "updated@docextract.com"
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *                 description: User's new role
 *                 example: "admin"
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 email:
 *                   type: string
 *                 role:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: User not found
 *       409:
 *         description: Email already exists
 */
// Update user (admin only) OR Update own profile
router.put('/:id', requireAuth as any, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { email, role, currentPassword, newPassword } = req.body;
    
    // Check if user is updating their own profile or is an admin
    const isOwnProfile = req.user.id === id;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    
    if (!isOwnProfile && !isAdmin) {
        res.status(403).json({ 
            error: 'Access denied. You can only update your own profile or be an admin.' 
        });
        return;
    }

    const User = (await import('../models/User')).default;

    // Check if user exists
    const existingUser = await User.findById(id);
    if (!existingUser) {
      res.status(404).json({ 
        error: 'User not found' 
      });
      return;
    }

    // Handle own profile update with password changes
    if (isOwnProfile && (currentPassword || newPassword)) {
      // Require current password for any profile changes
      if (!currentPassword) {
        res.status(400).json({ 
          error: 'Current password is required to update your profile' 
        });
        return;
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, existingUser.password);
      if (!isValidPassword) {
        res.status(400).json({ 
          error: 'Current password is incorrect' 
        });
        return;
      }

      const updateData: any = {};

      // Update email if provided
      if (email && email !== existingUser.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          res.status(400).json({ 
            error: 'Invalid email format' 
          });
          return;
        }

        // Check if email is already taken
        const emailExists = await User.findOne({ 
          email: email.toLowerCase(), 
          _id: { $ne: id } 
        });
        if (emailExists) {
          res.status(409).json({ 
            error: 'Email already exists' 
          });
          return;
        }

        updateData.email = email.toLowerCase();
      }

      // Update password if provided
      if (newPassword) {
        if (newPassword.length < 6) {
          res.status(400).json({ 
            error: 'New password must be at least 6 characters long' 
          });
          return;
        }
        updateData.password = newPassword;
      }

      // Update user
      const updatedUser = await User.findByIdAndUpdate(
        id, 
        updateData, 
        { new: true, select: 'email role createdAt' }
      );

      res.json(updatedUser);
      return;
    }

    // Handle admin user management (only admins can change roles)
    if (!isAdmin) {
      res.status(403).json({ 
        error: 'Admin access required to modify user roles' 
      });
      return;
    }

    // Validate at least one field is provided
    if (!email && !role) {
      res.status(400).json({ 
        error: 'At least one field (email or role) must be provided' 
      });
      return;
    }

    const adminUpdateData: any = {};

    // Validate and update email if provided
    if (email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({ 
          error: 'Invalid email format' 
        });
        return;
      }

      // Check if email is already taken by another user
      const emailExists = await User.findOne({ 
        email: email.toLowerCase(), 
        _id: { $ne: id } 
      });
      if (emailExists) {
        res.status(409).json({ 
          error: 'Email already exists' 
        });
        return;
      }

      adminUpdateData.email = email.toLowerCase();
    }

         // Validate and update role if provided
     if (role !== undefined) {
       if (!['user', 'admin', 'superadmin'].includes(role)) {
         res.status(400).json({ 
           error: 'Role must be "user", "admin", or "superadmin"' 
         });
         return;
       }
       adminUpdateData.role = role;
     }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      id, 
      adminUpdateData, 
      { new: true, select: 'email role createdAt' }
    );

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Delete user (Admin only)
 *     description: Delete a user from the system. Only accessible by administrators.
 *     security:
 *       - sessionAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - in: header
 *         name: Authorization
 *         schema:
 *           type: string
 *           example: "Bearer your-jwt-token-here"
 *         required: false
 *         description: Bearer token for authentication (alternative to session)
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User deleted successfully"
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
// Delete user (admin only)
router.delete('/:id', requireAuth as any, requireAdmin as any, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const User = (await import('../models/User')).default;

    // Check if user exists
    const existingUser = await User.findById(id);
    if (!existingUser) {
      res.status(404).json({ 
        error: 'User not found' 
      });
      return;
    }

    // Delete user
    await User.findByIdAndDelete(id);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router; 