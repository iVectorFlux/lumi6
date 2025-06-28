import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(6)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your new password')
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters')
});

// Register new admin
router.post('/register', async (req, res) => {
  try {
    const { email, name, password } = registerSchema.parse(req.body);

    // Check if admin already exists
    const existingAdmin = await prisma.admin.findUnique({
      where: { email }
    });

    if (existingAdmin) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new admin
    const admin = await prisma.admin.create({
      data: {
        email,
        name,
        password: hashedPassword,
        company: { connect: { id: 'default-company-id' } }
      }
    });

    // Generate JWT
    const token = jwt.sign(
      { id: admin.id, email: admin.email, name: admin.name, role: 'companyadmin', companyId: admin.companyId },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Error creating admin account' });
  }
});

// Login admin
router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    // Find admin
    const admin = await prisma.admin.findUnique({
      where: { email }
    });

    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, admin.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: admin.id, email: admin.email, name: admin.name, role: 'companyadmin', companyId: admin.companyId },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Error logging in' });
  }
});

// Change password
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = changePasswordSchema.parse(req.body);
    const adminId = req.admin?.id;

    if (!adminId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Find admin
    const admin = await prisma.admin.findUnique({
      where: { id: adminId }
    });

    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    // Verify current password
    const validCurrentPassword = await bcrypt.compare(currentPassword, admin.password);

    if (!validCurrentPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Check if new password is different from current
    const samePassword = await bcrypt.compare(newPassword, admin.password);
    if (samePassword) {
      return res.status(400).json({ error: 'New password must be different from current password' });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.admin.update({
      where: { id: adminId },
      data: {
        password: hashedNewPassword,
        updatedAt: new Date()
      }
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }
    res.status(500).json({ error: 'Error changing password' });
  }
});

// Update profile
router.patch('/update-profile', authenticateToken, async (req, res) => {
  try {
    const { name } = updateProfileSchema.parse(req.body);
    const adminId = req.admin?.id;

    if (!adminId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Update admin name
    const updatedAdmin = await prisma.admin.update({
      where: { id: adminId },
      data: {
        name: name.trim(),
        updatedAt: new Date()
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companyId: true
      }
    });

    res.json({ 
      message: 'Profile updated successfully',
      admin: updatedAdmin
    });
  } catch (error) {
    console.error('Update profile error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }
    res.status(500).json({ error: 'Error updating profile' });
  }
});

export default router; 