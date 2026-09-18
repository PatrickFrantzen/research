import { randomUUID } from 'node:crypto';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { loadEnv } from '../config/env.js';

// S3-kompatible Objektspeicher-Abstraktion für Fotos, siehe ADR-0003.
// Lokal/Docker: MinIO; beim Kunden austauschbar gegen echten S3-Zugang, ohne
// Code-Änderung (reine Umgebungsvariablen-Konfiguration).
@Injectable()
export class ObjectStorageService {
  private readonly env = loadEnv();
  private readonly s3 = new S3Client({
    endpoint: this.env.objectStorage.endpoint,
    region: this.env.objectStorage.region,
    credentials: {
      accessKeyId: this.env.objectStorage.accessKeyId,
      secretAccessKey: this.env.objectStorage.secretAccessKey,
    },
    forcePathStyle: true,
  });

  async uploadFoto(buffer: Buffer, mimeType: string): Promise<string> {
    const key = `wareneintraege/${randomUUID()}`;
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.env.objectStorage.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }),
    );
    return key;
  }

  async deleteFoto(key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.env.objectStorage.bucket, Key: key }));
  }
}
