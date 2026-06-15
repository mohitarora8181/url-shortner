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

const server = express()

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

async function bootstrap(): Promise<void> {
  if (isAppInitialized) return;
  const app = await NestFactory.create(AppModule , new ExpressAdapter(server));

  app.getHttpAdapter().getInstance().disable("x-powered-by");
  app.use(helmet());
  app.enableCors();
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true
      },
      exceptionFactory: (errors) =>
        new BadRequestException({
          message: "Validation failed",
          details: formatValidationErrors(errors)
        })
    })
  );

  // await app.listen(config.port);
  await app.init();
  isAppInitialized = true;
  Logger.log(`URL shortener API listening on ${config.publicBaseUrl}`, "Bootstrap");
}

void bootstrap();

export default server;
