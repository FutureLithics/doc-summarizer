// src/routes/organizations.ts
import { Router, Request, Response } from 'express';
import { requireAuth, requireSuperAdmin } from '../middleware/auth';
import Organization from '../models/Organization';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Organizations
 *   description: Organization management endpoints (Super Admin only)
 */

/**
 * @swagger
 * /api/organizations:
 *   get:
 *     tags: [Organizations]
 *     summary: Get all organizations (Super Admin only)
 *     description: Retrieve a list of all organizations in the system. Only accessible by super administrators.
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
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Super admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/', requireAuth as any, requireSuperAdmin as any, async (req: Request, res: Response) => {
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
 * /api/organizations:
 *   post:
 *     tags: [Organizations]
 *     summary: Create new organization (Super Admin only)
 *     description: Create a new organization in the system. Only accessible by super administrators.
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
 *                 example: "Acme Corporation"
 *               description:
 *                 type: string
 *                 description: Organization description
 *                 example: "Leading provider of innovative solutions"
 *     responses:
 *       201:
 *         description: Organization created successfully
 *       400:
 *         description: Invalid input data
 *       409:
 *         description: Organization with this name already exists
 *       500:
 *         description: Internal server error
 */
router.post('/', requireAuth as any, requireSuperAdmin as any, async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;

    // Validate required fields
    if (!name || name.trim() === '') {
      res.status(400).json({ error: 'Organization name is required' });
      return;
    }

    // Check if organization already exists
    const existingOrg = await Organization.findOne({ name: name.trim() });
    if (existingOrg) {
      res.status(409).json({ error: 'Organization with this name already exists' });
      return;
    }

    // Create new organization
    const organization = new Organization({
      name: name.trim(),
      description: description ? description.trim() : undefined
    });

    await organization.save();
    res.status(201).json(organization);
  } catch (error) {
    console.error('Error creating organization:', error);
    res.status(500).json({ error: 'Failed to create organization' });
  }
});

/**
 * @swagger
 * /api/organizations/{id}:
 *   put:
 *     tags: [Organizations]
 *     summary: Update organization (Super Admin only)
 *     description: Update an organization's details. Only accessible by super administrators.
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Organization name
 *               description:
 *                 type: string
 *                 description: Organization description
 *     responses:
 *       200:
 *         description: Organization updated successfully
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Organization not found
 *       409:
 *         description: Organization name already exists
 *       500:
 *         description: Internal server error
 */
router.put('/:id', requireAuth as any, requireSuperAdmin as any, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    // Validate at least one field is provided
    if (!name && !description) {
      res.status(400).json({ error: 'At least one field (name or description) must be provided' });
      return;
    }

    // Check if organization exists
    const existingOrg = await Organization.findById(id);
    if (!existingOrg) {
      res.status(404).json({ error: 'Organization not found' });
      return;
    }

    const updateData: any = {};

    // Validate and update name if provided
    if (name !== undefined) {
      if (name.trim() === '') {
        res.status(400).json({ error: 'Organization name cannot be empty' });
        return;
      }

      // Check if name is already taken by another organization
      const nameExists = await Organization.findOne({ 
        name: name.trim(), 
        _id: { $ne: id } 
      });
      if (nameExists) {
        res.status(409).json({ error: 'Organization name already exists' });
        return;
      }

      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description = description.trim();
    }

    // Update organization
    const updatedOrg = await Organization.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: true }
    );

    res.json(updatedOrg);
  } catch (error) {
    console.error('Error updating organization:', error);
    res.status(500).json({ error: 'Failed to update organization' });
  }
});

/**
 * @swagger
 * /api/organizations/{id}:
 *   delete:
 *     tags: [Organizations]
 *     summary: Delete organization (Super Admin only)
 *     description: Delete an organization from the system. Only accessible by super administrators.
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
 *       404:
 *         description: Organization not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', requireAuth as any, requireSuperAdmin as any, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if organization exists
    const existingOrg = await Organization.findById(id);
    if (!existingOrg) {
      res.status(404).json({ error: 'Organization not found' });
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