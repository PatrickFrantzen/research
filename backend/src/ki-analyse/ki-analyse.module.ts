import { Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';
import { loadEnv } from '../config/env.js';
import { ObjectStorageModule } from '../object-storage/object-storage.module.js';
import { GeminiClient } from './gemini.client.js';
import { KiClient } from './ki.client.js';
import { KiZentraleClient } from './ki-zentrale.client.js';
import { KiAnalyseController } from './ki-analyse.controller.js';
import { KI_REDIS, KiAnalyseService } from './ki-analyse.service.js';

@Module({
  imports: [ObjectStorageModule],
  controllers: [KiAnalyseController],
  providers: [
    KiAnalyseService,
    // Mit KI_ZENTRALE_TOKEN die KI-Zentrale, sonst Gemini (Rückweg, E2E-Stub).
    {
      provide: KiClient,
      useFactory: () => {
        const { kiZentrale, gemini } = loadEnv();
        return kiZentrale
          ? new KiZentraleClient(kiZentrale)
          : new GeminiClient(gemini);
      },
    },
    { provide: KI_REDIS, useFactory: () => new Redis(loadEnv().redis.url) },
  ],
})
export class KiAnalyseModule implements OnModuleDestroy {
  constructor(@Inject(KI_REDIS) private readonly redis: Redis) {}

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }
}
