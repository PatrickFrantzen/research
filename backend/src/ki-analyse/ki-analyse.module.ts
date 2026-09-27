import { Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';
import { loadEnv } from '../config/env.js';
import { ObjectStorageModule } from '../object-storage/object-storage.module.js';
import { GeminiClient } from './gemini.client.js';
import { KiAnalyseController } from './ki-analyse.controller.js';
import { KI_REDIS, KiAnalyseService } from './ki-analyse.service.js';

@Module({
  imports: [ObjectStorageModule],
  controllers: [KiAnalyseController],
  providers: [
    KiAnalyseService,
    { provide: GeminiClient, useFactory: () => new GeminiClient(loadEnv().gemini) },
    { provide: KI_REDIS, useFactory: () => new Redis(loadEnv().redis.url) },
  ],
})
export class KiAnalyseModule implements OnModuleDestroy {
  constructor(@Inject(KI_REDIS) private readonly redis: Redis) {}

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }
}
