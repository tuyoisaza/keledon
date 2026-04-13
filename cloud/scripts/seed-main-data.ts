import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create PepsiCo company
  const pepsico = await prisma.company.upsert({
    where: { id: 'pepsico-001' },
    update: {},
    create: {
      id: 'pepsico-001',
      name: 'PepsiCo',
      industry: 'Food & Beverage',
    }
  });
  console.log('Created company:', pepsico.name);

  // Create PepsiCo countries
  await prisma.companyCountry.upsert({
    where: { countryCode_companyId: { countryCode: 'US', companyId: pepsico.id } },
    update: {},
    create: { companyId: pepsico.id, countryCode: 'US' }
  });
  await prisma.companyCountry.upsert({
    where: { countryCode_companyId: { countryCode: 'MX', companyId: pepsico.id } },
    update: {},
    create: { companyId: pepsico.id, countryCode: 'MX' }
  });
  console.log('Added countries for PepsiCo: US, MX');

  // Create Cheetos brand
  const cheetos = await prisma.brand.upsert({
    where: { id: 'brand-cheetos' },
    update: {},
    create: {
      id: 'brand-cheetos',
      name: 'Cheetos',
      companyId: pepsico.id,
      color: '#FF6B00'
    }
  });
  console.log('Created brand:', cheetos.name);

  // Create Stellantis company
  const stellantis = await prisma.company.upsert({
    where: { id: 'stellantis-001' },
    update: {},
    create: {
      id: 'stellantis-001',
      name: 'Stellantis',
      industry: 'Automotive',
    }
  });
  console.log('Created company:', stellantis.name);

  // Create Stellantis countries
  await prisma.companyCountry.upsert({
    where: { countryCode_companyId: { countryCode: 'US', companyId: stellantis.id } },
    update: {},
    create: { companyId: stellantis.id, countryCode: 'US' }
  });
  await prisma.companyCountry.upsert({
    where: { countryCode_companyId: { countryCode: 'MX', companyId: stellantis.id } },
    update: {},
    create: { companyId: stellantis.id, countryCode: 'MX' }
  });
  console.log('Added countries for Stellantis: US, MX');

  // Create Jeep brand
  const jeep = await prisma.brand.upsert({
    where: { id: 'brand-jeep' },
    update: {},
    create: {
      id: 'brand-jeep',
      name: 'Jeep',
      companyId: stellantis.id,
      color: '#000000'
    }
  });
  console.log('Created brand:', jeep.name);

  // Create teams for each brand-country combination
  const teams = [
    { id: 'team-pepsico-us', name: 'PepsiCo US', brandId: cheetos.id, country: 'US' },
    { id: 'team-pepsico-mx', name: 'PepsiCo Mexico', brandId: cheetos.id, country: 'MX' },
    { id: 'team-stellantis-us', name: 'Stellantis US', brandId: jeep.id, country: 'US' },
    { id: 'team-stellantis-mx', name: 'Stellantis Mexico', brandId: jeep.id, country: 'MX' },
  ];

  for (const team of teams) {
    await prisma.team.upsert({
      where: { id: team.id },
      update: {},
      create: team
    });
    console.log('Created team:', team.name);
  }

  // Create default Keledon
  await prisma.keledon.upsert({
    where: { id: 'keledon-001' },
    update: {},
    create: {
      id: 'keledon-001',
      name: 'Keledon Agent',
      email: 'agent@keledon.com',
      role: 'agent',
      autonomyLevel: 5,
      isActive: true,
      teamId: 'team-pepsico-us'
    }
  });
  console.log('Created Keledon agent');

  console.log('\n✅ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });