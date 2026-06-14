import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import { MongoServerError } from "mongodb";
import type { Response } from "express";
import { config } from "../../config/env";

type ErrorBody = {
  success: false;
  message: string;
  details?: unknown;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof MongoServerError && exception.code === 11000) {
      response.status(HttpStatus.CONFLICT).json({
        success: false,
        message: "Resource already exists"
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const body: ErrorBody = {
        success: false,
        message: exception.message
      };

      if (typeof exceptionResponse === "object" && exceptionResponse !== null) {
        const responseBody = exceptionResponse as Record<string, unknown>;
        const message = responseBody.message;

        if (typeof message === "string") {
          body.message = message;
        } else if (Array.isArray(message)) {
          body.message = "Validation failed";
          body.details = message;
        }

        if (responseBody.details !== undefined) {
          body.details = responseBody.details;
        }
      }

      response.status(status).json(body);
      return;
    }

    console.error(exception);
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Internal server error",
      ...(config.nodeEnv !== "production" ? { details: exception instanceof Error ? exception.message : exception } : {})
    });
  }
}
