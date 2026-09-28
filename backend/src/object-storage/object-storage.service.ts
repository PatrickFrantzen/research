import { randomUUID } from 'node:crypto';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { loadEnv } from '../config/env.js';

// Wie lange eine über getSignedUrl() ausgestellte Foto-URL abrufbar bleibt,
// bevor sie erneut generiert werden muss. Lang genug für eine Session in der
// Wareneintrag-Liste, aber nicht dauerhaft/unbegrenzt gültig (Issue #45).
const SIGNIERTE_URL_GUELTIGKEIT_SEKUNDEN = 15 * 60;

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

  // Signiert mit dem öffentlich erreichbaren Endpoint, da der Browser (nicht
  // das Backend) die URL aufruft. Lokal/Docker weicht das vom internen
  // Endpoint oben ab (siehe OBJECT_STORAGE_PUBLIC_ENDPOINT).
  private readonly s3Public = new S3Client({
    endpoint: this.env.objectStorage.publicEndpoint,
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

  // Für die KI-Analyse: Foto samt gespeichertem Content-Type ins Backend holen.
  async ladeFoto(key: string): Promise<{ daten: Buffer; mimeType: string }> {
    const antwort = await this.s3.send(
      new GetObjectCommand({ Bucket: this.env.objectStorage.bucket, Key: key }),
    );
    const daten = Buffer.from(
      (await antwort.Body?.transformToByteArray()) ?? [],
    );
    return { daten, mimeType: antwort.ContentType ?? 'image/jpeg' };
  }

  // Größe in Bytes aus den Metadaten, ohne das Foto herunterzuladen.
  async fotoGroesse(key: string): Promise<number> {
    const antwort = await this.s3.send(
      new HeadObjectCommand({
        Bucket: this.env.objectStorage.bucket,
        Key: key,
      }),
    );
    return antwort.ContentLength ?? 0;
  }

  async deleteFoto(key: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.env.objectStorage.bucket,
        Key: key,
      }),
    );
  }

  // Liefert eine zeitlich begrenzt gültige GET-URL für den gegebenen Key,
  // statt den Bucket öffentlich lesbar zu machen (Issue #45).
  async getSignedUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.env.objectStorage.bucket,
      Key: key,
    });
    return getSignedUrl(this.s3Public, command, {
      expiresIn: SIGNIERTE_URL_GUELTIGKEIT_SEKUNDEN,
    });
  }
}
