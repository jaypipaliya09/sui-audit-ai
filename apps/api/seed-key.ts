import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create a test user
  const user = await prisma.user.create({
    data: {
      email: 'test@suiaudit.ai',
      name: 'Test User',
      plan: 'FREE',
      credits: 5,
    },
  });

  // Create a test API key
  const apiKey = await prisma.apiKey.create({
    data: {
      key: 'sk_test_1234567890abcdef',
      userId: user.id,
    },
  });

  console.log('--- TEST DATA CREATED ---');
  console.log('User Email:', user.email);
  console.log('Credits:', user.credits);
  console.log('Plan:', user.plan);
  console.log('\nYour Test API Key:');
  console.log(apiKey.key);
  console.log('-------------------------');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
