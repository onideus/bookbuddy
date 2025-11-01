import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create dev user
  const devUserId = 'dev-user-id';
  const hashedPassword = await bcrypt.hash('dev123', 10);

  const devUser = await prisma.user.upsert({
    where: { email: 'dev@booktracker.com' },
    update: {},
    create: {
      id: devUserId,
      email: 'dev@booktracker.com',
      password: hashedPassword,
      name: 'Dev User',
      createdAt: new Date(),
    },
  });

  console.log('✅ Development user created/updated:', devUser.email);
  console.log('   Email: dev@booktracker.com');
  console.log('   Password: dev123');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
