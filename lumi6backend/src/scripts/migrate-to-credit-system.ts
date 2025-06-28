import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Define enums locally
enum TestType {
  SPEAKING = 'SPEAKING',
  PROFICIENCY = 'PROFICIENCY',
  EQ = 'EQ',
  WRITING = 'WRITING'
}

enum CreditTransactionType {
  PURCHASE = 'PURCHASE',
  CONSUMPTION = 'CONSUMPTION',
  REFUND = 'REFUND',
  ADJUSTMENT = 'ADJUSTMENT',
  EXPIRY = 'EXPIRY'
}

interface MigrationStats {
  companiesProcessed: number;
  creditsConverted: number;
  permissionsCreated: number;
  transactionsCreated: number;
  errors: string[];
}

/**
 * Migrate existing companies to the new credit system
 */
async function migrateToCreditsSystem(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    companiesProcessed: 0,
    creditsConverted: 0,
    permissionsCreated: 0,
    transactionsCreated: 0,
    errors: []
  };

  console.log('🚀 Starting migration to credit system...');

  try {
    // Get all companies with their current credits and test usage
    const companies = await prisma.company.findMany({
      include: {
        tests: { select: { id: true } },
        proficiencyTests: { select: { id: true } },
        eqTests: { select: { id: true } },
        writingTests: { select: { id: true } }
      }
    });

    console.log(`📊 Found ${companies.length} companies to process`);

    for (const company of companies) {
      console.log(`\n🏢 Processing company: ${company.name} (${company.id})`);
      
      try {
        await prisma.$transaction(async (tx) => {
          // Determine which test types the company has used
          const usedTestTypes: TestType[] = [];
          
          if (company.tests.length > 0) {
            usedTestTypes.push(TestType.SPEAKING);
          }
          if (company.proficiencyTests.length > 0) {
            usedTestTypes.push(TestType.PROFICIENCY);
          }
          if (company.eqTests.length > 0) {
            usedTestTypes.push(TestType.EQ);
          }
          if (company.writingTests.length > 0) {
            usedTestTypes.push(TestType.WRITING);
          }

          // If no tests used, give default permissions for all test types
          const testTypesToSetup = usedTestTypes.length > 0 ? usedTestTypes : [
            TestType.SPEAKING,
            TestType.PROFICIENCY,
            TestType.EQ,
            TestType.WRITING
          ];

          // Create test permissions
          for (const testType of testTypesToSetup) {
            await tx.companyTestPermission.create({
              data: {
                companyId: company.id,
                testType,
                isEnabled: true
              }
            });
            stats.permissionsCreated++;
            console.log(`  ✅ Created permission for ${testType}`);
          }

          // Convert old credits to new system
          if (company.credits > 0) {
            // Distribute old credits across test types based on usage
            const creditsPerType = Math.floor(company.credits / testTypesToSetup.length);
            const remainderCredits = company.credits % testTypesToSetup.length;

            for (let i = 0; i < testTypesToSetup.length; i++) {
              const testType = testTypesToSetup[i];
              const creditsToAssign = creditsPerType + (i < remainderCredits ? 1 : 0);

              if (creditsToAssign > 0) {
                // Create credit record
                await tx.companyCredit.create({
                  data: {
                    companyId: company.id,
                    testType,
                    totalCredits: creditsToAssign,
                    usedCredits: 0,
                    availableCredits: creditsToAssign,
                    isActive: true
                  }
                });

                // Create transaction record for migration
                await tx.creditTransaction.create({
                  data: {
                    companyId: company.id,
                    testType,
                    transactionType: CreditTransactionType.PURCHASE,
                    amount: creditsToAssign,
                    balanceBefore: 0,
                    balanceAfter: creditsToAssign,
                    description: `Migrated from legacy credit system`,
                    referenceType: 'migration'
                  }
                });

                stats.creditsConverted += creditsToAssign;
                stats.transactionsCreated++;
                console.log(`  💰 Assigned ${creditsToAssign} ${testType} credits`);
              }
            }
          } else {
            // Company has no old credits, give them starter credits
            const starterCredits = 10; // Give 10 credits per test type as starter

            for (const testType of testTypesToSetup) {
              // Create credit record
              await tx.companyCredit.create({
                data: {
                  companyId: company.id,
                  testType,
                  totalCredits: starterCredits,
                  usedCredits: 0,
                  availableCredits: starterCredits,
                  isActive: true
                }
              });

              // Create transaction record
              await tx.creditTransaction.create({
                data: {
                  companyId: company.id,
                  testType,
                  transactionType: CreditTransactionType.PURCHASE,
                  amount: starterCredits,
                  balanceBefore: 0,
                  balanceAfter: starterCredits,
                  description: `Starter credits for new credit system`,
                  referenceType: 'migration'
                }
              });

              stats.creditsConverted += starterCredits;
              stats.transactionsCreated++;
              console.log(`  🎁 Assigned ${starterCredits} starter ${testType} credits`);
            }
          }
        });

        stats.companiesProcessed++;
        console.log(`  ✅ Successfully processed ${company.name}`);

      } catch (error) {
        const errorMsg = `Failed to process company ${company.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        stats.errors.push(errorMsg);
        console.error(`  ❌ ${errorMsg}`);
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`  Companies processed: ${stats.companiesProcessed}/${companies.length}`);
    console.log(`  Credits converted: ${stats.creditsConverted}`);
    console.log(`  Permissions created: ${stats.permissionsCreated}`);
    console.log(`  Transactions created: ${stats.transactionsCreated}`);
    
    if (stats.errors.length > 0) {
      console.log(`  Errors: ${stats.errors.length}`);
      stats.errors.forEach(error => console.log(`    - ${error}`));
    }

    return stats;

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

/**
 * Verify the migration results
 */
async function verifyMigration(): Promise<void> {
  console.log('\n🔍 Verifying migration results...');

  try {
    // Check companies have permissions
    const companiesWithoutPermissions = await prisma.company.findMany({
      where: {
        testPermissions: {
          none: {}
        }
      },
      select: { id: true, name: true }
    });

    if (companiesWithoutPermissions.length > 0) {
      console.log(`⚠️  Found ${companiesWithoutPermissions.length} companies without permissions:`);
      companiesWithoutPermissions.forEach(company => 
        console.log(`    - ${company.name} (${company.id})`)
      );
    } else {
      console.log('✅ All companies have test permissions');
    }

    // Check companies have credits
    const companiesWithoutCredits = await prisma.company.findMany({
      where: {
        companyCredits: {
          none: {}
        }
      },
      select: { id: true, name: true }
    });

    if (companiesWithoutCredits.length > 0) {
      console.log(`⚠️  Found ${companiesWithoutCredits.length} companies without credits:`);
      companiesWithoutCredits.forEach(company => 
        console.log(`    - ${company.name} (${company.id})`)
      );
    } else {
      console.log('✅ All companies have credit records');
    }

    // Get total credit statistics
    const creditStats = await prisma.companyCredit.groupBy({
      by: ['testType'],
      _sum: {
        totalCredits: true,
        availableCredits: true
      },
      _count: {
        id: true
      }
    });

    console.log('\n📊 Credit Statistics by Test Type:');
    creditStats.forEach(stat => {
      console.log(`  ${stat.testType}: ${stat._sum.totalCredits} total, ${stat._sum.availableCredits} available (${stat._count.id} companies)`);
    });

    // Check transaction history
    const transactionCount = await prisma.creditTransaction.count({
      where: {
        referenceType: 'migration'
      }
    });

    console.log(`\n📝 Migration transactions created: ${transactionCount}`);
    console.log('✅ Migration verification completed');

  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  }
}

/**
 * Main migration function
 */
async function main() {
  try {
    console.log('🔄 Credit System Migration Started');
    console.log('=====================================');

    // Run migration
    const stats = await migrateToCreditsSystem();

    // Verify results
    await verifyMigration();

    console.log('\n🎉 Migration completed successfully!');
    console.log('=====================================');

    if (stats.errors.length > 0) {
      console.log('\n⚠️  Some companies had errors during migration.');
      console.log('Please review the errors above and handle them manually.');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration if called directly
if (require.main === module) {
  main();
}

export { migrateToCreditsSystem, verifyMigration }; 