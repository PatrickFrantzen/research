import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { AuthModule } from './auth/auth.module.js';
import { AvvModule } from './avv/avv.module.js';
import { HealthModule } from './health/health.module.js';
import { NutzerModule } from './nutzer/nutzer.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { StandortModule } from './standort/standort.module.js';
import { WareneintragModule } from './wareneintrag/wareneintrag.module.js';

const frontendDistPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../frontend/dist/frontend/browser',
);

@Module({
  imports: [
    // Globales Rate-Limit gegen Brute-Force/Credential-Stuffing (Issue #31).
    // Einzelne Auth-Endpunkte verschärfen dies per @Throttle(...).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    ServeStaticModule.forRoot({
      rootPath: frontendDistPath,
      exclude: ['/api/{*splat}'],
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    NutzerModule,
    StandortModule,
    AvvModule,
    WareneintragModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
