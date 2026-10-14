const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

class BadRequest extends Error {}
const injectable = () => (target) => target;
const servicePath = path.resolve(__dirname, '../../src/crud/crud.service.ts');
const moduleExports = { exports: {} };
const source = ts.transpileModule(fs.readFileSync(servicePath, 'utf8'), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    experimentalDecorators: true,
  },
}).outputText;
vm.runInNewContext(source, {
  module: moduleExports,
  exports: moduleExports.exports,
  require: (name) =>
    name === '@nestjs/common'
      ? { BadRequestException: BadRequest, Injectable: injectable }
      : {},
});
const { CrudService } = moduleExports.exports;

function fixture(existingIds = ['iface-a', 'iface-b']) {
  const calls = [];
  const tx = {
    teamInterface: {
      deleteMany: async (args) => calls.push(['deleteMany', args]),
      createMany: async (args) => {
        calls.push(['createMany', args]);
        return { count: args.data.length };
      },
    },
  };
  const service = Object.create(CrudService.prototype);
  service.prisma = {
    managedInterface: {
      findMany: async (args) => {
        calls.push(['findMany', args]);
        return existingIds
          .filter((id) => args.where.id.in.includes(id))
          .map((id) => ({ id }));
      },
    },
    $transaction: async (work) => {
      calls.push(['transaction']);
      return work(tx);
    },
  };
  return { service, calls };
}

async function main() {
  const valid = fixture();
  assert.deepEqual(
    await valid.service.setTeamInterfaces('team-a', ['iface-a', 'iface-b']),
    { count: 2 },
  );
  assert.deepEqual(
    valid.calls.map(([name]) => name),
    ['findMany', 'transaction', 'deleteMany', 'createMany'],
  );

  for (const input of [undefined, ['iface-a', ''], ['iface-a', 'iface-a']]) {
    const invalid = fixture();
    await assert.rejects(
      invalid.service.setTeamInterfaces('team-a', input),
      BadRequest,
    );
    assert.equal(
      invalid.calls.some(([name]) => name === 'deleteMany'),
      false,
    );
  }

  const missing = fixture(['iface-a']);
  await assert.rejects(
    missing.service.setTeamInterfaces('team-a', ['iface-a', 'missing']),
    BadRequest,
  );
  assert.equal(
    missing.calls.some(([name]) => name === 'deleteMany'),
    false,
  );

  const clear = fixture();
  assert.equal((await clear.service.setTeamInterfaces('team-a', [])).count, 0);
  assert.deepEqual(
    clear.calls.map(([name]) => name),
    ['findMany', 'transaction', 'deleteMany'],
  );
  console.log(
    'PASS TeamInterface validation precedes an atomic replacement in Cloud CRUD',
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
