import express from 'express';
import { PrismaClient } from '@prisma/client';
const router = express.Router();
const prisma = new PrismaClient();

// ...existing endpoints...

// Save tab-switch/blur events for anti-cheating
router.post('/:id/cheating-events', async (req, res) => {
  const { id } = req.params;
  const { events } = req.body;
  await prisma.candidateTest.update({
    where: { id },
    data: { tabSwitchEvents: events },
  });
  res.json({ success: true });
});

export default router; 