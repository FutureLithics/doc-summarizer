// src/routes/organizations.ts
import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import Organization from '../models/Organization';

const router = Router();

// Middleware to check if user is superadmin
const requireSuperAdmin = (req: any, res: Response, next: any) => {
  if (!req.user || req.user.role !== 'superadmin') {
    return res.status(403).json({ 
      error: 'Superadmin access required' 
    });
  }
  next();
};

/**
 * @swagger
 * /api/organizations:
 *   post:
 *     tags: [Organizations]
 *     summary: Create organization (Superadmin only)
 *     description: Create a new organization. Only accessible by superadministrators.
 *     security:
 *       - sessionAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Organization name
 *                 example: "MyCompany"
 *               description:
 *                 type: string
 *                 description: Organization description
 *                 example: "A sample organization"
 *     responses:
 *       201:
 *         description: Organization created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 description:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid input data
 *       403:
 *         description: Superadmin access required
 *       409:
 *         description: Organization name already exists
 */
// Create organization (superadmin only)
router.post('/', requireAuth as any, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;

    // Validate required fields
    if (!name || name.trim() === '') {
      res.status(400).json({ 
        error: 'Organization name is required' 
      });
      return;
    }

    // Check if organization already exists
    const existingOrg = await Organization.findOne({ 
      name: name.trim() 
    });
    
    if (existingOrg) {
      res.status(409).json({ 
        error: 'Organization with this name already exists' 
      });
      return;
    }

    // Create new organization
    const newOrganization = new Organization({
      name: name.trim(),
      description: description?.trim() || ''
    });

    await newOrganization.save();

    res.status(201).json(newOrganization);
  } catch (error) {
    console.error('Error creating organization:', error);
    res.status(500).json({ error: 'Failed to create organization' });
  }
});

/**
 * @swagger
 * /api/organizations:
 *   get:
 *     tags: [Organizations]
 *     summary: Get all organizations (Superadmin only)
 *     description: Retrieve a list of all organizations. Only accessible by superadministrators.
 *     security:
 *       - sessionAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of organizations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 *       403:
 *         description: Superadmin access required
 */
// Get all organizations (superadmin only)
router.get('/', requireAuth as any, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const organizations = await Organization.find({}).sort({ createdAt: -1 });
    res.json(organizations);
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

/**
 * @swagger
 * /api/organizations/{id}:
 *   delete:
 *     tags: [Organizations]
 *     summary: Delete organization (Superadmin only)
 *     description: Delete an organization from the system. Only accessible by superadministrators.
 *     security:
 *       - sessionAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Organization ID
 *     responses:
 *       200:
 *         description: Organization deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Organization deleted successfully"
 *       403:
 *         description: Superadmin access required
 *       404:
 *         description: Organization not found
 */
// Delete organization (superadmin only)
router.delete('/:id', requireAuth as any, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if organization exists
    const existingOrg = await Organization.findById(id);
    if (!existingOrg) {
      res.status(404).json({ 
        error: 'Organization not found' 
      });
      return;
    }

    // Delete organization
    await Organization.findByIdAndDelete(id);

    res.json({ message: 'Organization deleted successfully' });
  } catch (error) {
    console.error('Error deleting organization:', error);
    res.status(500).json({ error: 'Failed to delete organization' });
  }
});

export default router;