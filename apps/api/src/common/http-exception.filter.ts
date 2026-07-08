import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

interface HttpResponse {
  status(code: number): HttpResponse;
  json(body: unknown): void;
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<HttpResponse>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const body =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const errors = this.extractErrors(body);
    const message =
      status === HttpStatus.INTERNAL_SERVER_ERROR
        ? 'Internal server error'
        : this.extractMessage(body, exception);

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(exception);
    }

    response.status(status).json({
      errors,
      message,
      success: false,
    });
  }

  private extractErrors(body: unknown): unknown[] {
    if (typeof body === 'object' && body !== null && 'message' in body) {
      const message = body.message;
      return Array.isArray(message) ? message : [];
    }

    return [];
  }

  private extractMessage(body: unknown, exception: unknown): string {
    if (typeof body === 'string') {
      return body;
    }

    if (
      typeof body === 'object' &&
      body !== null &&
      'message' in body &&
      typeof body.message === 'string'
    ) {
      return body.message;
    }

    return exception instanceof Error ? exception.message : 'Request failed';
  }
}
