import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function backupDatabase() {
  try {
    // Create backups directory if it doesn't exist
    const backupDir = path.join(__dirname, '../../../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Get current timestamp for backup filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `backup-${timestamp}.json`);

    // Backup other important data
    const companies = await prisma.company.findMany({
      include: {
        admins: true
      }
    });

    const candidates = await prisma.candidate.findMany();
    const tests = await prisma.test.findMany();
    const results = await prisma.testResult.findMany();

    // Combine all data
    const backupData = {
      companies,
      candidates,
      tests,
      results,
      timestamp: new Date().toISOString()
    };

    // Write to file
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    console.log(`Backup created successfully at: ${backupFile}`);

    // Keep only the last 5 backups
    const backups = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('backup-'))
      .sort()
      .reverse();

    if (backups.length > 5) {
      backups.slice(5).forEach(file => {
        fs.unlinkSync(path.join(backupDir, file));
      });
      console.log('Cleaned up old backups');
    }
  } catch (error) {
    console.error('Error creating backup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

backupDatabase(); 