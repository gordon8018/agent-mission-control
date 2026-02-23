const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Clearing tasks...');
  
  const result = await prisma.task.deleteMany({});
  console.log(`✅ Deleted ${result.count} tasks`);
}

main()
  .catch((e) => {
    console.error('❌ Failed to clear tasks:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
