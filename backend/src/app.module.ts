import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { HealthModule } from './health/health.module.js';

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
    HealthModule,
  ],
})
export class AppModule {}
