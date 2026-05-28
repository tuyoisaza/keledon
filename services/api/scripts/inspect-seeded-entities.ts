import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany({ select: { id: true, name: true, industry: true }, orderBy: { name: 'asc' } });
  const brands = await prisma.brand.findMany({ select: { id: true, name: true, companyId: true }, orderBy: { name: 'asc' } });
  const teams = await prisma.team.findMany({ select: { id: true, name: true, brandId: true, country: true }, orderBy: { name: 'asc' } });
  console.log(JSON.stringify({ companies, brands, teams }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
