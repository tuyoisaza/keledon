const { PrismaClient } = require('@prisma/client');
const {
  encryptVendorSecretAtRest,
  isVendorSecretEncryptedAtRest,
} = require('../dist/security/vendor-secret-crypto.js');

const APPLY = process.argv.includes('--apply');
const SECRET_FIELDS = ['username', 'password', 'apiKey'];

async function main() {
  if (!process.env.KELEDON_VENDOR_KEY?.trim()) {
    throw new Error('Set KELEDON_VENDOR_KEY before running this migration');
  }

  const prisma = new PrismaClient();
  try {
    const vendors = await prisma.vendor.findMany({
      select: {
        id: true,
        username: true,
        password: true,
        apiKey: true,
      },
    });
    let pending = 0;
    let migrated = 0;

    for (const vendor of vendors) {
      const data = {};
      for (const field of SECRET_FIELDS) {
        const value = vendor[field];
        if (value && !isVendorSecretEncryptedAtRest(value)) {
          data[field] = encryptVendorSecretAtRest(value);
        }
      }
      if (Object.keys(data).length === 0) continue;
      pending += 1;
      if (!APPLY) continue;

      const result = await prisma.vendor.updateMany({
        where: {
          id: vendor.id,
          username: vendor.username,
          password: vendor.password,
          apiKey: vendor.apiKey,
        },
        data,
      });
      if (result.count === 1) migrated += 1;
    }

    console.log(
      APPLY
        ? `Vendor secret migration complete: ${migrated} row(s) encrypted; ${pending - migrated} row(s) changed concurrently.`
        : `Dry run complete: ${pending} vendor row(s) need encryption. Re-run with --apply to write changes.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : 'Vendor secret migration failed',
  );
  process.exitCode = 1;
});
