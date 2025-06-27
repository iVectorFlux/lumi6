import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createSuperadmin() {
  const email = 'admin@lumi6.com';
  const password = 'Demo@123';
  const name = 'Super Admin';

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Check if superadmin already exists
  const existing = await prisma.admin.findUnique({ where: { email } });
  if (existing) {
    console.log('Superadmin already exists.');
    return;
  }

  // Create a default company if needed
  let company = await prisma.company.findFirst();
  if (!company) {
    company = await prisma.company.create({
      data: {
        name: 'Default Company',
      },
    });
  }

  // Create the superadmin
  await prisma.admin.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role: 'superadmin',
      companyId: company.id,
    },
  });

  console.log('Superadmin created successfully!');
}

createSuperadmin().finally(() => prisma.$disconnect()); 