import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const [companies, brands, teams, users, flows, devices] = await Promise.all([
    prisma.company.count(),
    prisma.brand.count(),
    prisma.team.count(),
    prisma.user.count(),
    prisma.flow.count(),
    prisma.device.count(),
  ]);
  console.log(`Companies: ${companies}, Brands: ${brands}, Teams: ${teams}, Users: ${users}, Flows: ${flows}, Devices: ${devices}`);
  await prisma.$disconnect();
}

check().catch(e => { console.error(e); process.exit(1); });
