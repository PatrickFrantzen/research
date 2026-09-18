import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import { loadEnv } from '../config/env.js';

export interface HealthStatus {
  status: 'ok' | 'error';
  database: 'ok' | 'error';
  objectStorage: 'ok' | 'error';
}

@Injectable()
export class HealthService implements OnModuleDestroy {
  private readonly env = loadEnv();
  private readonly pool = new Pool({ connectionString: this.env.databaseUrl });
  private readonly s3 = new S3Client({
    endpoint: this.env.objectStorage.endpoint,
    region: this.env.objectStorage.region,
    credentials: {
      accessKeyId: this.env.objectStorage.accessKeyId,
      secretAccessKey: this.env.objectStorage.secretAccessKey,
    },
    forcePathStyle: true,
  });

  async check(): Promise<HealthStatus> {
    const [database, objectStorage] = await Promise.all([this.checkDatabase(), this.checkObjectStorage()]);
    return {
      status: database === 'ok' && objectStorage === 'ok' ? 'ok' : 'error',
      database,
      objectStorage,
    };
  }

  private async checkDatabase(): Promise<'ok' | 'error'> {
    try {
      await this.pool.query('SELECT 1');
      return 'ok';
    } catch {
      return 'error';
    }
  }

  private async checkObjectStorage(): Promise<'ok' | 'error'> {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.env.objectStorage.bucket }));
      return 'ok';
    } catch {
      return 'error';
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
