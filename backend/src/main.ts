import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { loadEnv } from './config/env.js';
import { vertraueReverseProxy } from './reverse-proxy.js';
import { konfiguriereSecurityHeaders } from './security-headers.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  vertraueReverseProxy(app);
  app.use(konfiguriereSecurityHeaders(loadEnv()));
  // Nötig, damit JwtStrategy/CsrfGuard den Access-Token bzw. das
  // CSRF-Cookie aus dem Request lesen können (Issue #24).
  app.use(cookieParser());
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
