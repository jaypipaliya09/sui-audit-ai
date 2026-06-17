/**
 * Seeder: Admin user.
 *
 * Creates (or updates) the admin account used for the admin dashboard.
 *   email:    admin@suiaudit.com
 *   password: Admin@12345
 *
 * Run:  npm run seed:admin   (from apps/api)
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'admin@suiaudit.com';
const ADMIN_PASSWORD = 'Admin@12345';

async function main() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      passwordHash,
      role: 'ADMIN',
      emailVerified: true,
    },
    create: {
      email: ADMIN_EMAIL,
      passwordHash,
      role: 'ADMIN',
      emailVerified: true,
      name: 'Admin',
    },
  });

  console.log('✅ Admin user seeded');
  console.log(`   email:    ${admin.email}`);
  console.log(`   password: ${ADMIN_PASSWORD}`);
  console.log(`   role:     ${admin.role}`);
  console.log(`   id:       ${admin.id}`);
}

main()
  .catch((err) => {
    console.error('❌ Admin seeding failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
