import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Injectable,
  NestMiddleware,
} from '@nestjs/common';
import { randomUUID } from 'crypto';

type CorrelatedRequest = {
  headers?: Record<string, string | string[] | undefined>;
  correlationId?: string;
};
type CorrelatedResponse = {
  setHeader(name: string, value: string): void;
  status(code: number): CorrelatedResponse;
  json(body: unknown): void;
};

function sanitizeCorrelationId(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length < 8 || value.length > 128)
    return undefined;
  return /^(?:req|diag)_[a-f0-9]{32}$/i.test(value) ? value : undefined;
}

@Injectable()
export class ApiCorrelationMiddleware implements NestMiddleware {
  use(
    request: CorrelatedRequest,
    response: CorrelatedResponse,
    next: () => void,
  ): void {
    const header = request.headers?.['x-correlation-id'];
    const correlationId =
      sanitizeCorrelationId(Array.isArray(header) ? header[0] : header) ||
      `req_${randomUUID().replace(/-/g, '')}`;
    request.correlationId = correlationId;
    response.setHeader('x-correlation-id', correlationId);
    next();
  }
}

function safeMessage(value: unknown): string | string[] {
  const clean = (message: string) =>
    message
      .replace(/(?:https?|wss?):\/\/[^\s"'<>]+/gi, '[url]')
      .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[redacted]')
      .replace(/\bBearer\s+\S+/gi, 'Bearer [redacted]')
      .replace(/\beyJ[\w-]*\.[\w-]+\.[\w-]+\b/g, '[redacted]')
      .slice(0, 500);
  if (typeof value === 'string') return clean(value);
  if (Array.isArray(value))
    return value
      .filter((item): item is string => typeof item === 'string')
      .slice(0, 20)
      .map(clean);
  return 'Request failed';
}

@Catch()
@Injectable()
export class ApiCorrelationExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<CorrelatedRequest>();
    const response = http.getResponse<CorrelatedResponse>();
    const correlationId =
      request.correlationId || `req_${randomUUID().replace(/-/g, '')}`;
    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;
    const original =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const originalData =
      original && typeof original === 'object'
        ? (original as Record<string, unknown>)
        : {};
    const message =
      status >= 500
        ? 'Internal server error'
        : safeMessage(
            typeof original === 'string' ? original : originalData.message,
          );
    const error =
      status >= 500
        ? 'Internal Server Error'
        : typeof originalData.error === 'string'
          ? originalData.error.slice(0, 100)
          : undefined;

    response.setHeader('x-correlation-id', correlationId);
    response.status(status).json({
      statusCode: status,
      message,
      ...(error ? { error } : {}),
      correlationId,
    });
  }
}
