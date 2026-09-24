import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let exceptionResponse: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      exceptionResponse = exception.getResponse();
    } else if (exception instanceof AppError) {
      status = exception.status;
      exceptionResponse = exception.message;
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      exceptionResponse = 'Internal server error';
    }

    let message: string;
    let errors: Record<string, string[]> | undefined;

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const resp = exceptionResponse as Record<string, unknown>;
      message = (resp.message as string) || 'Error en la solicitud';
      if (resp.errors) {
        errors = resp.errors as Record<string, string[]>;
      }
    } else {
      message = 'Internal server error';
    }

    if (status >= 500 && process.env.NODE_ENV === 'production') {
      message = 'Internal server error';
    }

    response.status(status).json({
      success: false,
      message,
      ...(errors && { errors }),
    });
  }
}
