import express from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = express.Router();
const prisma = new PrismaClient();

router.post('/signup', async (req, res) => {
  const { companyName, name, workEmail, password } = req.body;
  if (!companyName || !name || !workEmail || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  // Check if email already exists
  const existing = await prisma.admin.findUnique({ where: { email: workEmail } });
  if (existing) {
    return res.status(409).json({ error: 'Email already in use.' });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  let company: { id: string; name: string } | undefined;
  let user: { id: string; name: string; email: string } | undefined;
  try {
    await prisma.$transaction(async (tx) => {
      company = await tx.company.create({
        data: { name: companyName },
      });
      user = await tx.admin.create({
        data: {
          name,
          email: workEmail,
          password: hashedPassword,
          company: { connect: { id: company.id } },
        },
      });
    });
  } catch (err) {
    return res.status(500).json({ error: 'Could not create company.' });
  }
  if (!user || !company) {
    throw new Error('User or company is undefined after transaction');
  }
  // Generate JWT
  const token = jwt.sign({ userId: user.id, companyId: company.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
  res.json({ token, company: { id: company.id, name: company.name }, user: { id: user.id, name: user.name, email: user.email } });
});

export default router; 