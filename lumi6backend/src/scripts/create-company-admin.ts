import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createCompanyAdmin() {
  const email = 'company@lumi6.com';
  const password = 'Demo@123';
  const name = 'Test Company Admin';

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if admin already exists
    const existing = await prisma.admin.findUnique({ where: { email } });
    if (existing) {
      console.log(`Company admin with email ${email} already exists.`);
      console.log(`Admin ID: ${existing.id}`);
      console.log(`Company ID: ${existing.companyId}`);
      return;
    }

    // Create or find a test company
    let company = await prisma.company.findFirst({
      where: { name: 'Test Company' }
    });

    if (!company) {
      company = await prisma.company.create({
        data: {
          name: 'Test Company',
          credits: 100, // Give some initial credits for testing
        },
      });
      console.log(`Created new test company: ${company.name} (ID: ${company.id})`);
    } else {
      console.log(`Using existing test company: ${company.name} (ID: ${company.id})`);
    }

    // Create the company admin
    const admin = await prisma.admin.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'companyadmin',
        companyId: company.id,
      },
    });

    console.log('\n✅ Company admin created successfully!');
    console.log('==========================================');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Name: ${name}`);
    console.log(`Role: companyadmin`);
    console.log(`Admin ID: ${admin.id}`);
    console.log(`Company: ${company.name}`);
    console.log(`Company ID: ${company.id}`);
    console.log('==========================================');
    console.log('\nYou can now log in at: /companyadmin/login');

  } catch (error) {
    console.error('Error creating company admin:', error);
    throw error;
  }
}

createCompanyAdmin()
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  }); 