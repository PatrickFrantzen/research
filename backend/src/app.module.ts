import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { AuthModule } from './auth/auth.module.js';
import { HealthModule } from './health/health.module.js';
import { NutzerModule } from './nutzer/nutzer.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { StandortModule } from './standort/standort.module.js';

const frontendDistPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../frontend/dist/frontend/browser',
);

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: frontendDistPath,
      exclude: ['/api/{*splat}'],
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    NutzerModule,
    StandortModule,
  ],
})
export class AppModule {}
