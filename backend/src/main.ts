import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { loadEnv } from './config/env.js';
import { konfiguriereSecurityHeaders } from './security-headers.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(konfiguriereSecurityHeaders(loadEnv()));
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
