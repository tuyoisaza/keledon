import { BadRequestException } from '@nestjs/common';
import type { AiUsageInput } from './ai-admin.service';
export async function recordAiUsage(db: any, input: AiUsageInput): Promise<void> {
    if (input.prepared.id !== input.feature)
      throw new BadRequestException('AI usage definition mismatch');
    if (
      input.errorCode !== undefined &&
      !/^[A-Z0-9_]{1,64}$/.test(input.errorCode)
    )
      throw new BadRequestException('AI errors must use safe codes');
    const counter = (value: unknown) =>
      Number.isInteger(value) &&
      Number(value) >= 0 &&
      Number(value) <= 2147483647;
    if (
      !counter(input.latencyMs) ||
      [input.inputTokens, input.outputTokens].some(
        (value) => value !== undefined && !counter(value),
      )
    )
      throw new BadRequestException('Invalid measured AI usage');
    for (const value of [
      input.provider,
      input.requestedModel,
      input.responseModel,
      input.errorCode,
      input.teamId,
    ]) {
      if (
        value !== undefined &&
        (typeof value !== 'string' || value.length > 200)
      )
        throw new BadRequestException('Invalid AI usage metadata');
    }
    // No input/output payloads or secrets persisted; no guessed provider pricing.
    await db.aiCallUsage.create({
      data: {
        promptId: input.prepared.id,
        promptRevision: input.prepared.revision,
        feature: input.feature,
        teamId: input.teamId || null,
        provider: input.provider,
        requestedModel: input.requestedModel,
        responseModel: input.responseModel || null,
        inputTokens: input.inputTokens ?? null,
        outputTokens: input.outputTokens ?? null,
        latencyMs: input.latencyMs,
        costUsd: null,
        pricingMetadata: { status: 'unavailable', source: 'not-configured' },
        errorCode: input.errorCode || null,
      },
    });
  }

export async function aiConsumption(db: any, rawLimit?: string) {
    const limit = rawLimit === undefined ? 100 : Number(rawLimit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 200)
      throw new BadRequestException('Limit must be between 1 and 200');
    const items = await db.aiCallUsage.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    const total = (field: string) =>
      items.length &&
      items.every((item: any) => typeof item[field] === 'number')
        ? items.reduce((sum: number, item: any) => sum + item[field], 0)
        : null;
    return {
      items,
      totals: {
        calls: items.length,
        inputTokens: total('inputTokens'),
        outputTokens: total('outputTokens'),
        costUsd: total('costUsd'),
      },
      pricingStatus: 'unavailable',
      window: { latestRecords: limit },
    };
  }