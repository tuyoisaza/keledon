import type { CreateCallEventDto } from './dto/calls.dto';
import type { Logger } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import type { DecisionEngineService } from '../services/decision-engine.service';
import type { EscalationService } from '../services/escalation.service';
import type {
  ActorContext,
  AuthenticatedActor,
  CallSessionMetadata,
} from './calls.types';

export interface CallsServiceContext {
  prisma: PrismaService;
  decisionEngineService: DecisionEngineService;
  escalationService: EscalationService;
  logger: Logger;
  assertNonEmptyString(value: string | undefined, fieldName: string): void;
  assertOptionalString(value: string | undefined, fieldName: string): void;
  assertOptionalRecord(
    value: Record<string, unknown> | undefined,
    fieldName: string,
  ): void;
  assertSessionAccess(
    session: any,
    actor?: AuthenticatedActor,
  ): Promise<void> | void;
  assertAllowedEventType(type: string): void;
  assertAllowedEventSource(source: string): void;
  assertAllowedState(state: string, fieldName: string): void;
  validateStateTransition(from: string, to: string): void;
  resolveActorContext(actor?: AuthenticatedActor): Promise<ActorContext>;
  resolveUserId(
    dtoUserId: string | undefined,
    actor: ActorContext,
  ): string | undefined;
  resolveTeamId(
    dtoTeamId: string | undefined,
    actor: ActorContext,
    deviceUserId?: string,
  ): Promise<string | undefined>;
  requireAccessibleDevice(deviceId: string, actor: ActorContext): Promise<any>;
  requireSession(sessionId: string): Promise<any>;
  getCall(sessionId: string, actor?: AuthenticatedActor): Promise<any>;
  appendCallEvent(
    sessionId: string,
    dto: CreateCallEventDto,
    actor?: AuthenticatedActor,
  ): Promise<any>;
  parseMetadata(metadata: string | null | undefined): CallSessionMetadata;
  parseJson(value: string | null | undefined): Record<string, any>;
  updateSessionState(
    sessionId: string,
    state: string,
    options?: { metadata?: CallSessionMetadata },
  ): Promise<void>;
}
