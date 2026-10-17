const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true, esModuleInterop: true,
  } }).outputText;
  module._compile(code, filename);
};
const { CrudAuditService } = require('../src/crud/crud-audit.service.ts');
const { CrudAuditService: CloudCrudAuditService } = require('../../../cloud/src/crud/crud-audit.service.ts');

function fixture() {
  const calls = { audit: [], companyUsers: [], enrichedUsers: [] };
  const logs = [{
    id: 'audit-1', userId: 'user-a', action: 'UPDATE', entity: 'vendor', entityId: 'vendor-1',
    changes: JSON.stringify({ apiKey: 'sk-123456789012345', nested: { password: 'do-not-show', safe: 'ok' }, note: 'Bearer abc.def.ghi' }),
    ipAddress: '127.0.0.1', userAgent: 'fixture', createdAt: new Date('2026-10-16T12:00:00Z'),
  }];
  const prisma = {
    user: { findMany: async ({where}) => {
      if (where.companyId) { calls.companyUsers.push(where); return [{id:'user-a'},{id:'user-b'}]; }
      calls.enrichedUsers.push(where); return [{id:'user-a',name:'Fixture User',email:'fixture@keledon.invalid'}];
    } },
    auditLog: {
      findMany: async args => { calls.audit.push(args); return logs; },
      count: async ({where}) => { calls.countWhere = where; return logs.length; },
    },
  };
  return {service:new CrudAuditService(prisma),calls};
}

test('API and Cloud audit query bounds and date filters reject malformed input before database access', async () => {
  for (const AuditService of [CrudAuditService, CloudCrudAuditService]) {
    const {service,calls}=fixture();
    const instance=new AuditService(service.prisma);
    for (const params of [
      {limit:201}, {limit:0}, {offset:-1}, {offset:1.5}, {offset:1_000_001},
      {action:'x'.repeat(81)}, {userId:' '}, {startDate:'not-a-date'},
      {startDate:'2026-02-30'}, {startDate:'2026-10-17',endDate:'2026-10-16'},
    ]) await assert.rejects(instance.getAuditLogs(params));
    assert.equal(calls.audit.length,0);
  }
});

test('audit viewer intersects company/user filters, paginates stably, and redacts stored details', async () => {
  for (const AuditService of [CrudAuditService, CloudCrudAuditService]) {
    const {service,calls}=fixture();
    const result=await new AuditService(service.prisma).getAuditLogs({companyId:'company-a',userId:'user-a',action:'UPDATE',entity:'vendor',startDate:'2026-10-01',endDate:'2026-10-31',limit:25,offset:50});
    assert.deepEqual(calls.audit[0].where.OR,[
      {companyId:'company-a',userId:'user-a'},
      {companyId:null,userId:{in:['user-a']}},
    ]);
    assert.deepEqual(calls.audit[0].orderBy,[{createdAt:'desc'},{id:'desc'}]);
    assert.equal(calls.audit[0].take,25); assert.equal(calls.audit[0].skip,50);
    assert.equal(calls.audit[0].where.createdAt.gte.toISOString(),'2026-10-01T00:00:00.000Z');
    assert.equal(calls.audit[0].where.createdAt.lte.toISOString(),'2026-10-31T23:59:59.999Z');
    const changes=JSON.parse(result.data[0].changes);
    assert.equal(changes.apiKey,'[REDACTED]');
    assert.equal(changes.nested.password,'[REDACTED]');
    assert.equal(changes.nested.safe,'ok');
    assert.equal(changes.note,'[REDACTED]');
    assert.deepEqual(result.data[0].user,{id:'user-a',name:'Fixture User',email:'fixture@keledon.invalid'});
    assert.equal('ipAddress' in result.data[0],false);
    assert.equal('userAgent' in result.data[0],false);
    assert.equal(result.pagination.hasMore,false);
  }
});

test('malformed historical audit details are omitted instead of returned raw', async () => {
  for (const AuditService of [CrudAuditService, CloudCrudAuditService]) {
    const {service}=fixture();
    service.prisma.auditLog.findMany=async()=>[{id:'old',userId:null,changes:'password=plaintext',createdAt:new Date()}];
    const result=await new AuditService(service.prisma).getAuditLogs();
    assert.equal(result.data[0].changes,'[Audit details omitted: invalid stored format]');
  }
});

test('oversized historical audit payloads are omitted without parsing or disclosure', async () => {
  for (const AuditService of [CrudAuditService, CloudCrudAuditService]) {
    const {service}=fixture();
    service.prisma.auditLog.findMany=async()=>[{id:'large',userId:null,changes:'x'.repeat(50001),createdAt:new Date()}];
    const result=await new AuditService(service.prisma).getAuditLogs();
    assert.equal(result.data[0].changes,'[Audit details omitted: size limit]');
  }
});
