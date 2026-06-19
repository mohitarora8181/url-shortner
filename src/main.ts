import "reflect-metadata";
import { BadRequestException, Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { ValidationError } from "class-validator";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { config } from "./config/env";
import express from "express";
import { ExpressAdapter } from "@nestjs/platform-express";

const server = express();

type ValidationErrorDetail = {
  property: string;
  constraints?: Record<string, string>;
  children?: ValidationErrorDetail[];
};

const formatValidationErrors = (errors: ValidationError[]): ValidationErrorDetail[] =>
  errors.map((error) => ({
    property: error.property,
    constraints: error.constraints,
    children: error.children?.length ? formatValidationErrors(error.children) : undefined
  }));

let isAppInitialized = false;
let nestApp: any;

async function bootstrap(): Promise<any> {
  if (isAppInitialized) return server;
  
  // Create NestJS app instance tied to Express
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));

  app.getHttpAdapter().getInstance().disable("x-powered-by");
  app.use(helmet());
  app.enableCors();
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: (errors) =>
        new BadRequestException({
          message: "Validation failed",
          details: formatValidationErrors(errors)
        })
    })
  );

  await app.init();
  isAppInitialized = true;
  Logger.log(`URL shortener API context initialized safely`, "Bootstrap");

  // Only bind ports directly if we are running standard local node development
  if (process.env.NODE_ENV !== 'production') {
    await app.listen(config.port);
    Logger.log(`URL shortener API listening on http://localhost:${config.port}`, "Bootstrap");
  }

  return server;
}

// Local Environment Auto-Start
if (process.env.NODE_ENV !== 'production') {
  bootstrap().catch((err) => {
    Logger.error("Local Bootstrap failed", err, "Bootstrap");
  });
}

// CRITICAL FOR VERCEL: Export a function handler that awaits initialization on every serverless execution trigger
export default async (req: any, res: any) => {
  await bootstrap(); // This guarantees app.init() is 100% complete before request processing
  return server(req, res);
};