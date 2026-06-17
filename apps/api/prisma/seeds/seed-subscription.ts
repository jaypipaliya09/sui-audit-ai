/**
 * Seeder: Top-level subscription for a specific wallet.
 *
 * Grants the wallet the highest plan (ENTERPRISE) with an effectively
 * unlimited audit quota. The subscription is linked to the wallet's user
 * (created the same way wallet sign-in does) so `getStatus` returns it.
 *
 * Run:  npm run seed:subscription   (from apps/api)
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const WALLET_ADDRESS =
  '0x886e929c950f63ffdfe3c76cc047e192a14dbe2fdc17b0816cfde924714f7e21';

async function main() {
  // Ensure the wallet's user exists (mirrors usersRepository.upsertBySuiAddress).
  const user = await prisma.user.upsert({
    where: { suiAddress: WALLET_ADDRESS },
    update: {},
    create: {
      suiAddress: WALLET_ADDRESS,
      email: `${WALLET_ADDRESS}@sui-auth.local`,
    },
  });

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setFullYear(periodEnd.getFullYear() + 10); // 10-year period

  const data = {
    plan: 'ENTERPRISE' as const,
    status: 'ACTIVE' as const,
    auditsLimit: 1_000_000,
    auditsUsedThisPeriod: 0,
    // Bypass the prepaid-credit balance check entirely (VIP / unlimited).
    grantedUnlimited: true,
    creditsBalance: 1_000_000,
    currentPeriodStart: now,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: false,
    walletAddress: WALLET_ADDRESS,
    userId: user.id,
  };

  const sub = await prisma.subscription.upsert({
    where: { userId: user.id },
    update: data,
    create: data,
  });

  console.log('✅ Top-level subscription seeded');
  console.log(`   wallet:      ${WALLET_ADDRESS}`);
  console.log(`   userId:      ${user.id}`);
  console.log(`   plan:        ${sub.plan}`);
  console.log(`   status:      ${sub.status}`);
  console.log(`   auditsLimit: ${sub.auditsLimit}`);
  console.log(`   validUntil:  ${sub.currentPeriodEnd?.toISOString()}`);
}

main()
  .catch((err) => {
    console.error('❌ Subscription seeding failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
