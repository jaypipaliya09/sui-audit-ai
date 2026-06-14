import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const audits = await prisma.audit.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  console.log('--- LATEST AUDITS ---');
  audits.forEach(a => {
    console.log(`[${a.createdAt.toISOString()}] ID: ${a.id} | Status: ${a.status} | Track: ${a.track} | Error: ${a.errorMessage}`);
  });
  console.log('---------------------');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
