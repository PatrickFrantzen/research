import {
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard.js';
import { ObjectStorageService } from '../src/object-storage/object-storage.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { WareneintragController } from '../src/wareneintrag/wareneintrag.controller.js';
import { WareneintragService } from '../src/wareneintrag/wareneintrag.service.js';

// Kleines Limit, damit die Grenzfälle ohne 50-MB-Puffer testbar sind (Issue #102).
// Muss vor dem Import des Controllers gesetzt sein, der das Limit beim Laden liest.
vi.hoisted(() => {
  process.env['UPLOAD_MAX_MB'] = '1';
});

// Guard wird überschrieben, um ausschließlich die Upload-Härtung
// (Größenlimit im Stream, Magic-Number-Whitelist) end-to-end zu prüfen –
// Auth ist bereits in anderen Tests abgedeckt (Issue #32).
class AlsNutzerAngemeldet {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    req.user = { id: 'nutzer-1' };
    return true;
  }
}

// Minimaler gültiger PNG-Header + IHDR-Chunk-Anfang reicht der Magic-Number-Erkennung.
const PNG_BYTES = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
  0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06,
  0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89,
]);

// Kleinstes PDF, das die Magic-Number-Erkennung als application/pdf einstuft.
const PDF_BYTES = Buffer.from(
  ['%PDF-1.4', '1 0 obj<<>>endobj', 'trailer<<>>', '%%EOF', ''].join(
    String.fromCharCode(10),
  ),
);

describe('Wareneintrag-Foto-Upload: Härtung', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [WareneintragController],
      providers: [
        WareneintragService,
        {
          provide: PrismaService,
          useValue: {
            nutzer: {
              findUniqueOrThrow: async () => ({ standortId: 'standort-1' }),
            },
            wareneintrag: {
              create: async (args: unknown) => args,
              findUniqueOrThrow: async () => ({
                erfasstVonId: 'nutzer-1',
                fotoFernUrl: 'wareneintraege/fern',
                fotoNahUrl: null,
                fotoDetailUrl: null,
                dokumentUrl: 'wareneintraege/pdf',
              }),
              update: async (args: unknown) => args,
            },
            wareneintragAnalyse: { deleteMany: async () => ({ count: 1 }) },
          },
        },
        {
          provide: ObjectStorageService,
          useValue: {
            uploadFoto: async () => 'wareneintraege/foto-1',
            deleteFoto: async () => undefined,
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(AlsNutzerAngemeldet)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('accepts a real PNG image', async () => {
    const response = await request(app.getHttpServer())
      .post('/wareneintraege')
      .field('avvCodeId', 'f8a3632d-6b2c-4843-b223-85a711b4a9a7')
      .field('freitext', 'Testeintrag')
      .attach('fotoFern', PNG_BYTES, {
        filename: 'foto.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(201);
  });

  it('accepts a Wareneintrag without any photo, since photos are optional', async () => {
    const response = await request(app.getHttpServer())
      .post('/wareneintraege')
      .field('avvCodeId', 'f8a3632d-6b2c-4843-b223-85a711b4a9a7')
      .field('freitext', 'Testeintrag ohne Foto');

    expect(response.status).toBe(201);
  });

  it('rejects a file whose real bytes are not an allowed image type, even with a spoofed image/png Content-Type', async () => {
    const htmlAlsBildGetarnt = Buffer.from('<script>alert(1)</script>');

    const response = await request(app.getHttpServer())
      .post('/wareneintraege')
      .field('avvCodeId', 'f8a3632d-6b2c-4843-b223-85a711b4a9a7')
      .field('freitext', 'Testeintrag')
      .attach('fotoFern', htmlAlsBildGetarnt, {
        filename: 'foto.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(400);
  });

  it('rejects an SVG (can contain script), even though it matches /^image\\//', async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    );

    const response = await request(app.getHttpServer())
      .post('/wareneintraege')
      .field('avvCodeId', 'f8a3632d-6b2c-4843-b223-85a711b4a9a7')
      .field('freitext', 'Testeintrag')
      .attach('fotoFern', svg, {
        filename: 'foto.svg',
        contentType: 'image/svg+xml',
      });

    expect(response.status).toBe(400);
  });

  it('accepts a photo just below the configured UPLOAD_MAX_MB', async () => {
    const knappDarunter = Buffer.concat([
      PNG_BYTES,
      Buffer.alloc(1024 * 1024 - PNG_BYTES.length - 1024),
    ]);

    const response = await request(app.getHttpServer())
      .post('/wareneintraege')
      .field('avvCodeId', 'f8a3632d-6b2c-4843-b223-85a711b4a9a7')
      .field('freitext', 'Testeintrag')
      .attach('fotoFern', knappDarunter, {
        filename: 'foto.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(201);
  });

  it('rejects a photo above UPLOAD_MAX_MB with 413 and a message naming the limit', async () => {
    const zuGross = Buffer.concat([PNG_BYTES, Buffer.alloc(1024 * 1024)]);

    const response = await request(app.getHttpServer())
      .post('/wareneintraege')
      .field('avvCodeId', 'f8a3632d-6b2c-4843-b223-85a711b4a9a7')
      .field('freitext', 'Testeintrag')
      .attach('fotoFern', zuGross, {
        filename: 'foto.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(413);
    expect(response.body.message).toBe('Datei ist größer als 1 MB.');
  });

  it('accepts a real PDF as dokument and stores it with the Wareneintrag', async () => {
    const response = await request(app.getHttpServer())
      .post('/wareneintraege')
      .field('avvCodeId', 'f8a3632d-6b2c-4843-b223-85a711b4a9a7')
      .field('freitext', 'Testeintrag mit Lieferschein')
      .attach('dokument', PDF_BYTES, {
        filename: 'lieferschein.pdf',
        contentType: 'application/pdf',
      });

    expect(response.status).toBe(201);
    expect(response.body.data.dokumentUrl).toBe('wareneintraege/foto-1');
  });

  it('rejects an image renamed to .pdf as dokument, even with a spoofed application/pdf Content-Type', async () => {
    const response = await request(app.getHttpServer())
      .post('/wareneintraege')
      .field('avvCodeId', 'f8a3632d-6b2c-4843-b223-85a711b4a9a7')
      .field('freitext', 'Testeintrag')
      .attach('dokument', PNG_BYTES, {
        filename: 'bild.pdf',
        contentType: 'application/pdf',
      });

    expect(response.status).toBe(400);
  });

  it('rejects a PDF uploaded as a foto', async () => {
    const response = await request(app.getHttpServer())
      .post('/wareneintraege')
      .field('avvCodeId', 'f8a3632d-6b2c-4843-b223-85a711b4a9a7')
      .field('freitext', 'Testeintrag')
      .attach('fotoFern', PDF_BYTES, {
        filename: 'foto.pdf',
        contentType: 'image/png',
      });

    expect(response.status).toBe(400);
  });

  // Alle Textfelder des Bearbeiten-Dialogs plus vier Dateien müssen unter
  // den Multer-Grenzen (fields, parts) bleiben (Issue #104).
  it('accepts an update with analyseLoeschen and all four files', async () => {
    const png = { filename: 'foto.png', contentType: 'image/png' };
    const response = await request(app.getHttpServer())
      .patch('/wareneintraege/wareneintrag-1')
      .field('avvCodeId', 'f8a3632d-6b2c-4843-b223-85a711b4a9a7')
      .field('freitext', 'Testeintrag')
      .field('analyseLoeschen', 'true')
      .attach('fotoFern', PNG_BYTES, png)
      .attach('fotoNah', PNG_BYTES, png)
      .attach('fotoDetail', PNG_BYTES, png)
      .attach('dokument', PDF_BYTES, {
        filename: 'lieferschein.pdf',
        contentType: 'application/pdf',
      });

    expect(response.status).toBe(200);
  });

  it('deletes a single file via DELETE /wareneintraege/:id/dateien/:feld', async () => {
    const response = await request(app.getHttpServer()).delete(
      '/wareneintraege/wareneintrag-1/dateien/dokument?analyseLoeschen=true',
    );

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ dokumentUrl: null });
  });

  it('rejects deleting a field that is not a file', async () => {
    const response = await request(app.getHttpServer()).delete(
      '/wareneintraege/wareneintrag-1/dateien/erfasstVonId',
    );

    expect(response.status).toBe(400);
  });

  it('rejects multipart requests with more text fields than the form has', async () => {
    let anfrage = request(app.getHttpServer())
      .post('/wareneintraege')
      .field('avvCodeId', 'f8a3632d-6b2c-4843-b223-85a711b4a9a7')
      .field('freitext', 'Testeintrag');
    for (let i = 0; i < 20; i++) {
      anfrage = anfrage.field(`zusatz${i}`, 'x');
    }

    const response = await anfrage;

    expect([400, 413]).toContain(response.status);
    expect(response.body.message).toEqual(expect.stringMatching(/field/i));
  });

  it('rejects a text field larger than the per-field limit while parsing', async () => {
    const response = await request(app.getHttpServer())
      .post('/wareneintraege')
      .field('avvCodeId', 'f8a3632d-6b2c-4843-b223-85a711b4a9a7')
      .field('freitext', 'a'.repeat(100 * 1024));

    expect([400, 413]).toContain(response.status);
    expect(response.body.message).toEqual(expect.stringMatching(/field/i));
  });
});
