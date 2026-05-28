import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const counts = {
    companies: await prisma.company.count(),
    companyCountries: await prisma.companyCountry.count(),
    brands: await prisma.brand.count(),
    teams: await prisma.team.count(),
    users: await prisma.user.count(),
    keledons: await prisma.keledon.count(),
    managedInterfaces: await prisma.managedInterface.count(),
    teamInterfaces: await prisma.teamInterface.count(),
    vendors: await prisma.vendor.count(),
    workflows: await prisma.workflow.count(),
    flows: await prisma.flow.count(),
    flowSteps: await prisma.flowStep.count(),
    providerCatalog: await prisma.providerCatalog.count(),
    tenantProviderConfigs: await prisma.tenantProviderConfig.count(),
    tenantVoiceProfiles: await prisma.tenantVoiceProfile.count(),
    featureFlags: await prisma.featureFlag.count(),
    knowledgeBases: await prisma.knowledgeBase.count(),
    knowledgeDocuments: await prisma.knowledgeDocument.count(),
  };
  console.log(JSON.stringify(counts, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
