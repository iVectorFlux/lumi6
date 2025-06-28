import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function restoreDatabase(backupFile: string) {
  try {
    // Read backup file
    const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));
    console.log(`Restoring from backup: ${backupFile}`);

    // Restore companies and admins
    for (const company of backupData.companies) {
      const { admins, ...companyData } = company;
      await prisma.company.upsert({
        where: { id: company.id },
        update: companyData,
        create: companyData
      });

      // Restore admins
      for (const admin of admins) {
        await prisma.admin.upsert({
          where: { id: admin.id },
          update: admin,
          create: admin
        });
      }
    }

    // Note: QuestionBank model has been removed from schema

    // Restore candidates
    for (const candidate of backupData.candidates) {
      await prisma.candidate.upsert({
        where: { id: candidate.id },
        update: candidate,
        create: candidate
      });
    }

    // Restore tests
    for (const test of backupData.tests) {
      await prisma.test.upsert({
        where: { id: test.id },
        update: test,
        create: test
      });
    }

    // Restore results
    for (const result of backupData.results) {
      await prisma.testResult.upsert({
        where: { id: result.id },
        update: result,
        create: result
      });
    }

    console.log('Database restored successfully');
  } catch (error) {
    console.error('Error restoring database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get the most recent backup file if none specified
const backupDir = path.join(__dirname, '../../../backups');
const backups = fs.readdirSync(backupDir)
  .filter(file => file.startsWith('backup-'))
  .sort()
  .reverse();

if (backups.length === 0) {
  console.error('No backup files found');
  process.exit(1);
}

const backupFile = path.join(backupDir, backups[0]);
restoreDatabase(backupFile); 