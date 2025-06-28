import { execSync } from 'child_process';
import path from 'path';

async function safeMigrate() {
  try {
    console.log('Creating backup before migration...');
    execSync('npx ts-node src/scripts/backup-db.ts', { stdio: 'inherit' });

    console.log('\nRunning migration...');
    execSync('npx prisma migrate dev', { stdio: 'inherit' });

    console.log('\nRestoring data from backup...');
    execSync('npx ts-node src/scripts/restore-db.ts', { stdio: 'inherit' });

    console.log('\nMigration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
    console.log('\nAttempting to restore from backup...');
    try {
      execSync('npx ts-node src/scripts/restore-db.ts', { stdio: 'inherit' });
      console.log('Data restored successfully');
    } catch (restoreError) {
      console.error('Failed to restore data:', restoreError);
    }
  }
}

safeMigrate(); 