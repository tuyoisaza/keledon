import { Injectable, SetMetadata } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import {
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { IS_PUBLIC_KEY } from '../guards/public.decorator';
import { ROLES_KEY } from '../guards/roles.guard';
import type { DiagnosticProbeMode, EndpointDiagnostic } from './health.service';

const API_OPERATION_METADATA = 'swagger/apiOperation';
const API_RESPONSE_METADATA = 'swagger/apiResponse';

const ENDPOINT_DIAGNOSTIC_KEY = 'keledon:endpoint-diagnostic';

export type EndpointDiagnosticDefinition = {
  id?: string;
  purpose: string;
  probeMode?: DiagnosticProbeMode;
  expectedStatuses?: number[];
  sanitizedRequestExample?: Record<string, unknown> | null;
  sanitizedSuccessExample?: Record<string, unknown>;
  sanitizedErrorExamples?: Array<Record<string, unknown>>;
};

/** Add explicit safety and safe-example metadata beside the route declaration. */
export const DiagnosticEndpoint = (definition: EndpointDiagnosticDefinition) =>
  SetMetadata(ENDPOINT_DIAGNOSTIC_KEY, definition);

const methods: Record<number, string> = {
  0: 'GET',
  1: 'POST',
  2: 'PUT',
  3: 'DELETE',
  4: 'PATCH',
  5: 'ALL',
  6: 'OPTIONS',
  7: 'HEAD',
};
const values = (value: unknown): string[] =>
  (Array.isArray(value) ? value : [value]).filter(
    (item): item is string => typeof item === 'string',
  );

@Injectable()
export class EndpointDiagnosticsRegistry {
  constructor(private readonly discovery: DiscoveryService) {}

  list(): EndpointDiagnostic[] {
    const endpoints: EndpointDiagnostic[] = [];
    for (const wrapper of this.discovery.getControllers()) {
      const controller = wrapper.metatype;
      if (!controller?.prototype) continue;
      const prefixes = values(Reflect.getMetadata(PATH_METADATA, controller));
      const prototype = controller.prototype as Record<string, unknown>;
      for (const name of Object.getOwnPropertyNames(prototype)) {
        if (name === 'constructor') continue;
        const handler = prototype[name];
        if (typeof handler !== 'function') continue;
        const routePath = Reflect.getMetadata(PATH_METADATA, handler);
        const requestMethod = Reflect.getMetadata(METHOD_METADATA, handler);
        if (
          routePath === undefined ||
          requestMethod === undefined ||
          !methods[requestMethod]
        )
          continue;

        const definition = Reflect.getMetadata(
          ENDPOINT_DIAGNOSTIC_KEY,
          handler,
        ) as EndpointDiagnosticDefinition | undefined;
        const roles = (Reflect.getMetadata(ROLES_KEY, handler) ||
          Reflect.getMetadata(ROLES_KEY, controller) ||
          []) as string[];
        const isPublic =
          Reflect.getMetadata(IS_PUBLIC_KEY, handler) === true ||
          Reflect.getMetadata(IS_PUBLIC_KEY, controller) === true;
        const swagger = Reflect.getMetadata(API_OPERATION_METADATA, handler) as
          | { summary?: string }
          | undefined;
        const documentedResponses = Reflect.getMetadata(
          API_RESPONSE_METADATA,
          handler,
        ) as Record<string, unknown> | undefined;
        const documentedStatuses = documentedResponses
          ? Object.keys(documentedResponses)
              .map(Number)
              .filter(
                (status) =>
                  Number.isInteger(status) && status >= 100 && status <= 599,
              )
          : [];
        const explicitStatus = Reflect.getMetadata(
          HTTP_CODE_METADATA,
          handler,
        ) as number | undefined;
        const defaultStatus = methods[requestMethod] === 'POST' ? 201 : 200;
        const expectedStatuses =
          definition?.expectedStatuses ||
          (documentedStatuses.length
            ? documentedStatuses
            : [explicitStatus || defaultStatus]);
        for (const prefix of prefixes.length ? prefixes : ['']) {
          for (const path of values(routePath)) {
            const normalizedPath =
              `/${[prefix, path].filter(Boolean).join('/')}`.replace(
                /\/+/g,
                '/',
              );
            const id = definition?.id || `${controller.name}.${name}`;
            endpoints.push({
              id,
              method: methods[requestMethod],
              path: normalizedPath,
              purpose:
                definition?.purpose ||
                swagger?.summary ||
                `${controller.name}.${name}`,
              authRequired: !isPublic,
              requiredRoles: [...roles],
              probeMode: definition?.probeMode || 'manual_only',
              expectedStatuses: [...expectedStatuses],
              sanitizedRequestExample: definition?.sanitizedRequestExample
                ? { ...definition.sanitizedRequestExample }
                : null,
              sanitizedSuccessExample: {
                ...(definition?.sanitizedSuccessExample || {
                  status: 'redacted',
                }),
              },
              sanitizedErrorExamples: (
                definition?.sanitizedErrorExamples || []
              ).map((example) => ({ ...example })),
            });
          }
        }
      }
    }
    return endpoints.sort(
      (a, b) =>
        a.path.localeCompare(b.path) || a.method.localeCompare(b.method),
    );
  }
}
