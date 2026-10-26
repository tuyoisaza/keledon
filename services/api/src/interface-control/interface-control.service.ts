import { BadRequestException, ConflictException, ForbiddenException, GoneException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { getVendorAllowedOrigins } from '../vendor-url-policy';
import { isAccountActive } from '../auth-local/account-lifecycle.policy';

export type SurfaceAction = { type: 'read' | 'focus' | 'fill' | 'activate' | 'scroll'; ref: string; value?: string; expected: string; effect: 'read' | 'navigate' | 'search' };
export type SurfaceObservation = { revision: string; text: string; elements: { ref: string; role: string; name: string; value?: string; actions: string[] }[]; capabilities: string[] };
export type Target = { id: string; name: string; kind: 'web' | 'native'; origin?: string; url?: string; executable?: string };
export type Control = { id: string; ownerId: string; ownerRole: string; ownerCompany: string | null; ownerTeam: string | null; teamId: string; companyId: string; target: Target; deviceId?: string; deviceFingerprint?: string; expires: number; generation: number; actions: number; allowInteraction: boolean; observation?: SurfaceObservation; plan?: { id: string; revision: string; action: SurfaceAction }; command?: { id: string; operation: string; payload: any; claimed: boolean; expires: number; result?: any }; transport: 'extension' | 'device' };
const ACTIONS = ['read', 'focus', 'fill', 'activate', 'scroll'];
const ID = /^[a-zA-Z0-9_-]{1,128}$/;

/** Ephemeral control/observations only. Audit stores metadata, never page text or action values. */
@Injectable()
export class InterfaceControlService {
  private readonly controls = new Map<string, Control>();
  constructor(private readonly prisma: PrismaService) {}
  async targets(teamId: string, companyId: string): Promise<Target[]> {
    const [vendors, assignments] = await Promise.all([
      this.prisma.vendor.findMany({ where: { teamId, isActive: true }, select: { id: true, name: true, baseUrl: true, config: true } }),
      this.prisma.teamInterface.findMany({ where: { teamId }, select: { managedInterface: { select: { id: true, name: true, companyId: true, baseUrl: true, providerKey: true, capabilities: true } } } }),
    ]);
    const result: Target[] = [];
    for (const vendor of vendors) for (const origin of getVendorAllowedOrigins(vendor.baseUrl, (vendor.config as any)?.allowedOrigins)) {
      if (!/^https?:\/\//.test(origin)) continue;
      result.push({ id: `v_${vendor.id}_${createHash('sha256').update(origin).digest('hex').slice(0, 12)}`, name: vendor.name, kind: 'web', origin, url: vendor.baseUrl && new URL(vendor.baseUrl).origin === origin ? vendor.baseUrl : `${origin}/` });
    }
    for (const { managedInterface: entry } of assignments) {
      if (entry.companyId !== companyId) continue;
      if (entry.providerKey === 'windows-uia') {
        let capabilities: any; try { capabilities = JSON.parse(entry.capabilities || '{}'); } catch { continue; }
        const executable = capabilities?.nativeExecutable;
        if (typeof executable === 'string' && /^[A-Za-z]:\\[^\r\n<>"|?*]+\.exe$/i.test(executable) && executable.length <= 260)
          result.push({ id: `i_${entry.id}`, name: entry.name, kind: 'native', executable });
      } else try {
        const url = new URL(entry.baseUrl);
        if (['https:', 'http:'].includes(url.protocol) && !url.username && !url.password && !url.search && !url.hash)
          result.push({ id: `i_${entry.id}`, name: entry.name, kind: 'web', origin: url.origin, url: url.href });
      } catch { /* Invalid persisted destinations never expand scope. */ }
    }
    return result.slice(0, 100);
  }
  async devices(teamId: string, companyId: string) {
    const devices = await this.prisma.device.findMany({ where: { status: 'paired', organizationId: companyId }, select: { id: true, name: true, platform: true, version: true, keledonId: true } });
    const agents = await this.prisma.keledon.findMany({ where: { teamId, isActive: true }, select: { id: true } });
    return devices.filter(d => agents.some(a => a.id === d.keledonId)).map(({ keledonId: _, ...d }) => d);
  }
  private prune() { for (const [id, s] of this.controls) if (Date.now() >= s.expires) this.controls.delete(id); }
  async open(req: any, body: any) {
    this.prune();
    if (!body || body.syntheticOnly !== true || typeof body.targetId !== 'string' || !['extension', 'device'].includes(body.transport) || typeof body.allowInteraction !== 'boolean') throw new BadRequestException('Select authorized surface and fictitious-data scope');
    if ([...this.controls.values()].filter(s => s.ownerId === req.runtimeIdentity.userId).length >= 3 || this.controls.size >= 200) throw new ConflictException('Control session limit reached');
    const target = (await this.targets(req.runtimeIdentity.teamId, req.runtimeIdentity.companyId)).find(t => t.id === body.targetId);
    if (!target) throw new ForbiddenException('Surface is not assigned to selected team');
    if (target.kind === 'native' && body.transport !== 'device') throw new BadRequestException('Native Windows interface requires a paired Windows executor');
    const owner = await this.prisma.user.findUnique({ where: { id: req.runtimeIdentity.userId }, select: { id: true, role: true, companyId: true, teamId: true } });
    if (!owner) throw new ForbiddenException('Current actor required');
    const s: Control = { id: randomUUID(), ownerId: owner.id, ownerRole: owner.role, ownerCompany: owner.companyId, ownerTeam: owner.teamId, teamId: req.runtimeIdentity.teamId, companyId: req.runtimeIdentity.companyId, target, transport: body.transport, allowInteraction: body.allowInteraction, expires: Date.now() + 120000, generation: 1, actions: 0 };
    if (body.transport === 'device') {
      if (typeof body.deviceId !== 'string' || !ID.test(body.deviceId)) throw new BadRequestException('Paired device required');
      const device = await this.boundDevice(body.deviceId, s);
      if (target.kind === 'native' && device.platform !== 'win32') throw new BadRequestException('Windows executor required');
      s.deviceId = device.id; s.deviceFingerprint = createHash('sha256').update(device.authToken).digest('hex');
    }
    try { const claims = JSON.parse(Buffer.from((req.headers.authorization || '').split(' ')[1].split('.')[0], 'base64').toString('utf8')); if (Number.isFinite(claims.expiresAt)) s.expires = Math.min(s.expires, claims.expiresAt); } catch { /* paired device token has no local-session claims */ }
    this.controls.set(s.id, s); await this.audit(s, 'OPEN'); return this.public(s);
  }
  private async boundDevice(id: string, s: Control) {
    const device = await this.prisma.device.findUnique({ where: { id }, include: { user: true } });
    const agent = device?.keledonId && await this.prisma.keledon.findUnique({ where: { id: device.keledonId } });
    if (!device?.authToken || device.status !== 'paired' || !isAccountActive(device.user) || !agent?.isActive || agent.teamId !== s.teamId || device.organizationId !== s.companyId || device.user.companyId !== s.companyId || (device.user.teamId && device.user.teamId !== s.teamId) || (agent.userId && agent.userId !== device.userId)) throw new ForbiddenException('Device binding is not current for selected team');
    return device;
  }
  private async current(s: Control) {
    const generation = s.generation;
    if (Date.now() >= s.expires) { this.controls.delete(s.id); throw new GoneException('Control session expired'); }
    const owner = await this.prisma.user.findUnique({ where: { id: s.ownerId } });
    if (!isAccountActive(owner) || owner.role !== s.ownerRole || owner.companyId !== s.ownerCompany || owner.teamId !== s.ownerTeam) throw new ForbiddenException('Control actor changed');
    const target = (await this.targets(s.teamId, s.companyId)).find(t => t.id === s.target.id);
    if (!target || JSON.stringify(target) !== JSON.stringify(s.target)) throw new ForbiddenException('Surface authorization changed');
    if (s.deviceId) { const device = await this.boundDevice(s.deviceId, s); if (createHash('sha256').update(device.authToken).digest('hex') !== s.deviceFingerprint) throw new ForbiddenException('Device session changed'); }
    if (this.controls.get(s.id) !== s || s.generation !== generation) throw new ConflictException('Control cancelled during authorization');
  }
  async get(req: any, id: string) {
    const s = this.controls.get(id);
    if (!s || s.ownerId !== req.runtimeIdentity.userId || s.teamId !== req.runtimeIdentity.teamId || s.companyId !== req.runtimeIdentity.companyId) throw new NotFoundException('Control session not found');
    await this.current(s); return s;
  }
  public(s: Control) { return { id: s.id, teamId: s.teamId, target: s.target, transport: s.transport, deviceId: s.deviceId, expires: s.expires, generation: s.generation, actions: s.actions, allowInteraction: s.allowInteraction, observation: s.observation, plan: s.plan }; }
  sanitizeObservation(value: any): SurfaceObservation {
    if (!value || typeof value.revision !== 'string' || !/^[a-f0-9-]{36}$/.test(value.revision) || typeof value.text !== 'string' || value.text.length > 4000 || !Array.isArray(value.elements) || value.elements.length > 120 || !Array.isArray(value.capabilities) || value.capabilities.length > 12) throw new BadRequestException('Bounded interface observation required');
    const seen = new Set<string>();
    const elements = value.elements.map((e: any) => {
      if (!e || typeof e.ref !== 'string' || !/^e\d{1,4}$/.test(e.ref) || seen.has(e.ref) || typeof e.role !== 'string' || e.role.length > 40 || typeof e.name !== 'string' || e.name.length > 160 || (e.value !== undefined && (typeof e.value !== 'string' || e.value.length > 500)) || !Array.isArray(e.actions) || e.actions.length > 5 || e.actions.some((a: any) => !ACTIONS.includes(a))) throw new BadRequestException('Invalid observed element');
      seen.add(e.ref); return { ref: e.ref, role: e.role, name: e.name, ...(e.value !== undefined ? { value: e.value } : {}), actions: [...new Set<string>(e.actions)] };
    });
    return { revision: value.revision, text: value.text, elements, capabilities: value.capabilities.filter((x: any) => typeof x === 'string' && /^[a-z-]{1,30}$/.test(x)) };
  }
  async observe(s: Control, value: any) { s.observation = this.sanitizeObservation(value); s.plan = undefined; await this.audit(s, 'OBSERVE'); return this.public(s); }
  validateAction(s: Control, value: any): SurfaceAction {
    const element = s.observation?.elements.find(e => e.ref === value?.ref);
    if (!element || !ACTIONS.includes(value?.type) || !element.actions.includes(value.type) || !['read', 'navigate', 'search'].includes(value.effect) || typeof value.expected !== 'string' || value.expected.length > 300 || (value.value !== undefined && (typeof value.value !== 'string' || value.value.length > 500 || /[\x00-\x08\x0b-\x1f]/.test(value.value)))) throw new BadRequestException('Action must reference a current observed capability');
    if (!s.allowInteraction && ['fill', 'activate'].includes(value.type)) throw new ForbiddenException('Interaction not authorized for this session');
    return { type: value.type, ref: value.ref, effect: value.effect, expected: value.expected, ...(value.value !== undefined ? { value: value.value } : {}) };
  }
  async propose(s: Control, action: any) { s.plan = { id: randomUUID(), revision: s.observation.revision, action: this.validateAction(s, action) }; await this.audit(s, 'PLAN'); return this.public(s); }
  async issue(s: Control, operation: 'open' | 'observe' | 'act', planId?: string) {
    await this.current(s);
    if (s.command && !s.command.result && Date.now() < s.command.expires) throw new ConflictException('An executor command is still pending');
    let payload: any = {};
    if (operation === 'act') {
      if (!s.plan || s.plan.id !== planId || s.plan.revision !== s.observation?.revision) throw new ConflictException('Observe and authorize the current plan');
      if (++s.actions > 12) throw new GoneException('Twelve-action session limit reached');
      payload = { revision: s.plan.revision, action: this.validateAction(s, s.plan.action) }; s.plan = undefined;
    }
    s.command = { id: `ui_${randomUUID()}`, operation, payload, claimed: false, expires: Math.min(s.expires, Date.now() + 25000) };
    await this.audit(s, operation.toUpperCase()); return { commandId: s.command.id, generation: s.generation, operation, ...payload };
  }
  async cancel(s: Control, close = false) { s.generation++; s.plan = undefined; s.command = undefined; s.observation = undefined; if (close) this.controls.delete(s.id); await this.audit(s, close ? 'CLOSE' : 'CANCEL'); return this.public(s); }
  async next(deviceId: string, identity: any) {
    this.prune();
    const s = [...this.controls.values()].find(s => s.deviceId === deviceId && s.teamId === identity.teamId && s.command && !s.command.claimed && !s.command.result && Date.now() < s.command.expires);
    if (!s) return null;
    const command = s.command, generation = s.generation;
    await this.current(s);
    if (s.generation !== generation || s.command !== command || command.claimed || command.result || Date.now() >= command.expires) return null;
    command.claimed = true;
    return { deviceId, command: { id: s.command.id, type: 'interface_control', payload: { controlId: s.id, generation: s.generation }, expiresAt: new Date(s.command.expires).toISOString() } };
  }
  async authorizeDevice(deviceId: string, identity: any, commandId: string) {
    const s = [...this.controls.values()].find(s => s.deviceId === deviceId && s.teamId === identity.teamId && s.command?.id === commandId);
    if (!s || !s.command.claimed || s.command.result || Date.now() >= s.command.expires) throw new GoneException('Executor command cancelled or expired');
    await this.current(s); return { controlId: s.id, generation: s.generation, teamId: s.teamId, target: s.target, expires: s.command.expires, sessionExpires: s.expires, allowInteraction: s.allowInteraction, operation: s.command.operation, ...s.command.payload };
  }
  async completeDevice(deviceId: string, identity: any, commandId: string, result: any) {
    const grant = await this.authorizeDevice(deviceId, identity, commandId);
    const s = this.controls.get(grant.controlId); return this.complete(s, commandId, s.generation, result);
  }
  async complete(s: Control, commandId: string, generation: number, result: any) {
    await this.current(s);
    if (!s.command || s.command.id !== commandId || generation !== s.generation || Date.now() >= s.command.expires) throw new ConflictException('Stale executor result');
    if (s.command.result) return s.command.result;
    const observation = result?.observation ? this.sanitizeObservation(result.observation) : undefined;
    const code = typeof result?.code === 'string' && /^[A-Z_]{1,48}$/.test(result.code) ? result.code : 'EXECUTOR_UNAVAILABLE';
    const expected = s.command.payload?.action?.expected;
    const flatten = (o?: SurfaceObservation) => o ? [o.text, ...o.elements.map(e => `${e.name} ${e.value || ''}`)].join('\n') : '';
    const verified = ['OBSERVED', 'OBSERVED_AFTER_ACTION'].includes(code) && s.command.operation === 'act' && !!observation && observation.revision !== s.observation?.revision && typeof expected === 'string' && !!expected.trim() && flatten(observation).includes(expected) && !flatten(s.observation).includes(expected);
    s.command.result = { code, ...(observation ? { observation } : {}), verified };
    if (observation) { s.observation = observation; s.plan = undefined; }
    await this.audit(s, 'RESULT', code); return s.command.result;
  }
  async audit(s: Control, event: string, code?: string) {
    await this.prisma.auditLog.create({ data: { userId: s.ownerId, entity: 'INTERFACE_CONTROL', entityId: s.id, action: `INTERFACE_${event}`, changes: JSON.stringify({ teamId: s.teamId, kind: s.target.kind, transport: s.transport, generation: s.generation, ...(code ? { code } : {}) }) } });
  }
}
