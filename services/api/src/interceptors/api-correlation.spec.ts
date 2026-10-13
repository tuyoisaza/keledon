import { BadRequestException } from '@nestjs/common';
import {
  ApiCorrelationExceptionFilter,
  ApiCorrelationMiddleware,
} from './api-correlation';

describe('API correlation diagnostics', () => {
  it('sets a response correlation header for every request and rejects unsafe inbound identifiers', () => {
    const middleware = new ApiCorrelationMiddleware();
    const request: any = {
      headers: { 'x-correlation-id': 'customer@example.org' },
    };
    const response = { setHeader: jest.fn() };
    const next = jest.fn();
    middleware.use(request, response as any, next);
    expect(request.correlationId).toMatch(/^req_[a-f0-9]{32}$/);
    expect(response.setHeader).toHaveBeenCalledWith(
      'x-correlation-id',
      request.correlationId,
    );
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('preserves a generated-safe correlation id in sanitized client errors', () => {
    const request = { correlationId: 'req_0123456789abcdef0123456789abcdef' };
    const response: any = {
      setHeader: jest.fn(),
      status: jest.fn(),
      json: jest.fn(),
    };
    response.status.mockReturnValue(response);
    const host: any = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    };
    new ApiCorrelationExceptionFilter().catch(
      new BadRequestException({
        message: ['Invalid customer@example.org https://private.example/path'],
        error: 'Bad Request',
      }),
      host,
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      'x-correlation-id',
      request.correlationId,
    );
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 400,
      message: ['Invalid [redacted] [url]'],
      error: 'Bad Request',
      correlationId: request.correlationId,
    });
  });

  it('does not return internal exception messages or stack data', () => {
    const request = { correlationId: 'req_0123456789abcdef0123456789abcdef' };
    const response: any = {
      setHeader: jest.fn(),
      status: jest.fn(),
      json: jest.fn(),
    };
    response.status.mockReturnValue(response);
    const host: any = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    };
    new ApiCorrelationExceptionFilter().catch(
      new Error('postgres://secret:password@private/db'),
      host,
    );
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 500,
      message: 'Internal server error',
      error: 'Internal Server Error',
      correlationId: request.correlationId,
    });
  });
});
