const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '../../../..');
const safeVoiceFields = [
  'id',
  'name',
  'providerId',
  'language',
  'isEnabled',
  'isDefault',
];
const sensitiveConfig = JSON.stringify({ apiKey: 'synthetic-voice-secret' });
const row = {
  id: 'voice-a',
  companyId: 'company-a',
  providerId: 'provider-a',
  name: 'Support voice',
  language: 'es',
  isEnabled: true,
  isDefault: false,
  config: sensitiveConfig,
  providerCatalog: {
    id: 'provider-a',
    metadata: 'synthetic-catalog-secret',
  },
};

function loadCrudService(backend) {
  const module = { exports: {} };
  const code = ts.transpileModule(
    fs.readFileSync(
      path.join(root, `${backend}/src/crud/crud.service.ts`),
      'utf8',
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        experimentalDecorators: true,
      },
    },
  ).outputText;
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    require: (name) => {
      if (name === '@prisma/client')
        return { Prisma: new Proxy({}, { get: () => ({}) }) };
      if (name === '@nestjs/common') {
        return {
          BadRequestException: class BadRequestException extends Error {},
          Injectable: () => () => {},
        };
      }
      return new Proxy({}, { get: () => class {} });
    },
  });
  return module.exports.CrudService;
}

function projectedResult(args) {
  if (!args.select) return { ...row };
  return Object.fromEntries(
    Object.entries(args.select)
      .filter(([, selected]) => selected === true)
      .map(([field]) => [field, row[field]]),
  );
}

async function main() {
  for (const backend of ['services/api', 'cloud']) {
    const guardSource = fs.readFileSync(
      path.join(root, `${backend}/src/guards/crud-access.guard.ts`),
      'utf8',
    );
    const voiceProfileFields = guardSource.match(
      /'voice-profiles':\s*\[([^\]]+)\]/,
    )?.[1];
    assert.ok(
      voiceProfileFields,
      `${backend} must define voice-profile fields`,
    );
    assert.doesNotMatch(voiceProfileFields, /\bconfig\b/);

    const calls = [];
    const CrudService = loadCrudService(backend);
    const service = Object.create(CrudService.prototype);
    service.prisma = {
      tenantVoiceProfile: Object.fromEntries(
        ['findMany', 'findFirst', 'create', 'update'].map((method) => [
          method,
          async (args) => {
            calls.push({ method, args });
            const result = projectedResult(args);
            return method === 'findMany' ? [result] : result;
          },
        ]),
      ),
    };

    const list = await service.getTenantVoiceProfiles('company-a');
    const detail = await service.getTenantVoiceProfile('voice-a', 'company-a');
    const callCount = calls.length;
    await assert.rejects(
      service.createTenantVoiceProfile({
        companyId: 'company-a',
        providerId: 'provider-a',
        name: row.name,
        config: sensitiveConfig,
      }),
      /config is not supported/,
    );
    await assert.rejects(
      service.updateTenantVoiceProfile('voice-a', {
        config: sensitiveConfig,
      }),
      /config is not supported/,
    );
    assert.equal(calls.length, callCount);
    const created = await service.createTenantVoiceProfile({
      companyId: 'company-a',
      providerId: 'provider-a',
      name: row.name,
    });
    const updated = await service.updateTenantVoiceProfile('voice-a', {});

    assert.equal(calls.length, 4);
    for (const { args } of calls) {
      assert.equal(
        JSON.stringify(Object.keys(args.select)),
        JSON.stringify(safeVoiceFields),
      );
      assert.equal(Object.hasOwn(args, 'include'), false);
      assert.equal(Object.hasOwn(args.select, 'config'), false);
      assert.equal(Object.hasOwn(args.select, 'providerCatalog'), false);
    }
    assert.equal(calls[0].args.where.companyId, 'company-a');
    assert.equal(calls[1].args.where.companyId, 'company-a');
    for (const result of [list[0], detail, created, updated]) {
      assert.equal(Object.hasOwn(result, 'config'), false);
      assert.equal(Object.hasOwn(result, 'providerCatalog'), false);
      assert.equal(
        JSON.stringify(result).includes('synthetic-voice-secret'),
        false,
      );
      assert.equal(
        JSON.stringify(result).includes('synthetic-catalog-secret'),
        false,
      );
    }
  }
  console.log(
    'PASS API/Cloud tenant voice-profile list/detail/create/update responses use the same safe projection and omit profile/provider config',
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
