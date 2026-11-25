import { PrismaClient, Role, CollegeStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Always present: report submission is restricted to these exact names.
const categories = ['Electronics', 'Documents', 'Stationery', 'Accessories', 'Sports Equipment', 'Other'];

const demoColleges = [
  { name: 'Westfield University', code: 'WR-2024-8841', status: CollegeStatus.ACTIVE },
  { name: 'Eastwood College', code: 'ER-2024-8702', status: CollegeStatus.PENDING },
  { name: 'Northside College', code: 'NR-2024-8690', status: CollegeStatus.ACTIVE },
];

function requireSeedCredential(name) {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`${name} must be set before running the seed script.`);
  }
  return value;
}

async function main() {
  for (const name of categories) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }

  let collegeCount = 0;
  if (process.env.SEED_DEMO_DATA === 'true') {
    for (const college of demoColleges) {
      await prisma.college.upsert({
        where: { code: college.code },
        update: { name: college.name, status: college.status },
        create: college,
      });
      collegeCount += 1;
    }
  }

  const email = requireSeedCredential('SEED_ADMIN_EMAIL').toLowerCase();
  const password = requireSeedCredential('SEED_ADMIN_PASSWORD');
  const rotate = process.env.SEED_ADMIN_ROTATE === 'true';
  const passwordHash = rotate ? await bcrypt.hash(password, 12) : undefined;

  await prisma.user.upsert({
    where: { email },
    update: rotate ? { passwordHash } : {},
    create: {
      email,
      name: 'CampusFind Administrator',
      role: Role.SUPER_ADMIN,
      passwordHash: passwordHash ?? (await bcrypt.hash(password, 12)),
    },
  });

  console.log(
    `Seeded ${categories.length} categories, ${collegeCount} demo colleges, and admin ${email}.`,
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : 'Seed failed.');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
