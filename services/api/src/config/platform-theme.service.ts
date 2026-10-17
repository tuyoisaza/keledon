import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const colors = [
  'background',
  'foreground',
  'primary',
  'primaryForeground',
  'accent',
  'accentForeground',
  'muted',
  'mutedForeground',
  'border',
  'ring',
  'popover',
  'card',
  'cardForeground',
  'sidebar',
  'sidebarForeground',
  'sidebarActive',
] as const;
type Palette = Record<(typeof colors)[number], string>;
export interface ThemeConfig {
  corporateEnabled: boolean;
  presets: Record<'light' | 'dark' | 'corporate', Palette>;
}
const palette = (values: string[]): Palette =>
  Object.fromEntries(colors.map((key, i) => [key, values[i]])) as Palette;
export const DEFAULT_THEME: ThemeConfig = {
  corporateEnabled: true,
  presets: {
    light: palette([
      '#f8fafc',
      '#0f172a',
      '#0f766e',
      '#ffffff',
      '#0f766e',
      '#ffffff',
      '#e2e8f0',
      '#475569',
      '#cbd5e1',
      '#0f766e',
      '#ffffff',
      '#ffffff',
      '#0f172a',
      '#ffffff',
      '#334155',
      '#0f766e',
    ]),
    dark: palette([
      '#0b1220',
      '#f8fafc',
      '#14b8a6',
      '#0b1220',
      '#14b8a6',
      '#0b1220',
      '#171f2e',
      '#a1aab8',
      '#273244',
      '#14b8a6',
      '#171f2e',
      '#171f2e',
      '#f8fafc',
      '#101a2c',
      '#a1aab8',
      '#14b8a6',
    ]),
    corporate: palette([
      '#f3f6fc',
      '#102a43',
      '#194185',
      '#ffffff',
      '#194185',
      '#ffffff',
      '#d9e2ec',
      '#486581',
      '#bcccdc',
      '#194185',
      '#ffffff',
      '#ffffff',
      '#102a43',
      '#ffffff',
      '#334e68',
      '#194185',
    ]),
  },
};
const validColor = /^#[0-9a-fA-F]{6}$/;

@Injectable()
export class PlatformThemeService {
  constructor(private readonly prisma: PrismaService) {}

  private async authorized(userId?: string) {
    if (!userId)
      throw new ForbiddenException('Theme administration access denied');
    const actor = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!actor || actor.role !== 'superadmin')
      throw new ForbiddenException('Theme administration access denied');
    return actor.id;
  }

  private row() {
    return (this.prisma as any).platformSetting.findUnique({
      where: { key: 'theme.templates' },
    });
  }

  async read() {
    const record = await this.row();
    return {
      ...DEFAULT_THEME,
      ...(record?.value ?? {}),
      revision: record?.revision ?? 0,
    };
  }

  async readAdmin(userId?: string) {
    await this.authorized(userId);
    return this.read();
  }

  async update(userId: string | undefined, input: unknown) {
    const actorId = await this.authorized(userId);
    if (!input || typeof input !== 'object' || Array.isArray(input))
      throw new BadRequestException('Invalid theme settings');
    const candidate = input as Record<string, unknown>;
    if (
      !Number.isInteger(candidate.expectedRevision) ||
      typeof candidate.corporateEnabled !== 'boolean' ||
      !candidate.presets ||
      typeof candidate.presets !== 'object'
    )
      throw new BadRequestException('Invalid theme settings');
    const presets: ThemeConfig['presets'] = {} as ThemeConfig['presets'];
    for (const name of ['light', 'dark', 'corporate'] as const) {
      const values = (candidate.presets as Record<string, unknown>)[name];
      if (!values || typeof values !== 'object' || Array.isArray(values))
        throw new BadRequestException('All three theme presets are required');
      const entries = values as Record<string, unknown>;
      if (
        Object.keys(entries).length !== colors.length ||
        colors.some(
          (key) =>
            typeof entries[key] !== 'string' || !validColor.test(entries[key]),
        )
      )
        throw new BadRequestException(
          'Theme colors must be six-digit hexadecimal values',
        );
      presets[name] = Object.fromEntries(
        colors.map((key) => [key, (entries[key] as string).toLowerCase()]),
      ) as Palette;
    }
    const expected = candidate.expectedRevision as number;
    const db = this.prisma as any;
    return db.$transaction(
      async (tx: any) => {
        const current = await tx.platformSetting.findUnique({
          where: { key: 'theme.templates' },
        });
        const revision = current?.revision ?? 0;
        if (revision !== expected)
          throw new ConflictException(
            'Theme settings changed; reload before saving',
          );
        const value = { corporateEnabled: candidate.corporateEnabled, presets };
        // Serializable isolation protects both the first insert and revision checks
        // from concurrent superadmin saves. The audit write remains in the same transaction.
        const row = current
          ? await tx.platformSetting.update({
              where: { key: 'theme.templates' },
              data: { value, revision: { increment: 1 }, updatedBy: actorId },
            })
          : await tx.platformSetting.create({
              data: {
                key: 'theme.templates',
                value,
                revision: 1,
                updatedBy: actorId,
              },
            });
        await tx.auditLog.create({
          data: {
            userId: actorId,
            action: 'UPDATE',
            entity: 'PlatformSetting',
            entityId: 'theme.templates',
            changes: JSON.stringify({
              revision: row.revision,
              corporateEnabled: candidate.corporateEnabled,
            }),
          },
        });
        return { ...value, revision: row.revision };
      },
      { isolationLevel: 'Serializable' },
    );
  }
}
