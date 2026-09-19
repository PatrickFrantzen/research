import { ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard.js';
import { RolesGuard } from '../src/auth/roles.guard.js';
import { Rolle } from '../src/generated/prisma/enums.js';
import { ObjectStorageService } from '../src/object-storage/object-storage.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { WareneintragController } from '../src/wareneintrag/wareneintrag.controller.js';
import { WareneintragService } from '../src/wareneintrag/wareneintrag.service.js';

// Guards werden überschrieben, um ausschließlich die Upload-Härtung
// (Größenlimit im Stream, Magic-Number-Whitelist) end-to-end zu prüfen –
// Auth/Rollen sind bereits in anderen Tests abgedeckt (Issue #32).
class AlsMitarbeiterAngemeldet {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    req.user = { id: 'nutzer-1', rolle: Rolle.MITARBEITER };
    return true;
  }
}

describe('Wareneintrag-Foto-Upload: Härtung', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [WareneintragController],
      providers: [
        WareneintragService,
        {
          provide: PrismaService,
          useValue: { nutzer: { findUniqueOrThrow: async () => ({ standortId: 'standort-1' }) }, wareneintrag: { create: async (args: unknown) => args } },
        },
        { provide: ObjectStorageService, useValue: { uploadFoto: async () => 'wareneintraege/foto-1' } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(AlsMitarbeiterAngemeldet)
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('accepts a real PNG image', async () => {
    // Minimaler gültiger PNG-Header + IHDR-Chunk-Anfang reicht der Magic-Number-Erkennung.
    const pngBytes = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00,
      0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89,
    ]);

    const response = await request(app.getHttpServer())
      .post('/wareneintraege')
      .field('avvCodeId', 'f8a3632d-6b2c-4843-b223-85a711b4a9a7')
      .field('freitext', 'Testeintrag')
      .attach('foto', pngBytes, { filename: 'foto.png', contentType: 'image/png' });

    expect(response.status).toBe(201);
  });

  it('rejects a file whose real bytes are not an allowed image type, even with a spoofed image/png Content-Type', async () => {
    const htmlAlsBildGetarnt = Buffer.from('<script>alert(1)</script>');

    const response = await request(app.getHttpServer())
      .post('/wareneintraege')
      .field('avvCodeId', 'f8a3632d-6b2c-4843-b223-85a711b4a9a7')
      .field('freitext', 'Testeintrag')
      .attach('foto', htmlAlsBildGetarnt, { filename: 'foto.png', contentType: 'image/png' });

    expect(response.status).toBe(400);
  });

  it('rejects an SVG (can contain script), even though it matches /^image\\//', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

    const response = await request(app.getHttpServer())
      .post('/wareneintraege')
      .field('avvCodeId', 'f8a3632d-6b2c-4843-b223-85a711b4a9a7')
      .field('freitext', 'Testeintrag')
      .attach('foto', svg, { filename: 'foto.svg', contentType: 'image/svg+xml' });

    expect(response.status).toBe(400);
  });

  it('aborts uploads larger than the configured limit before fully buffering them', async () => {
    const zuGross = Buffer.alloc(11 * 1024 * 1024, 1); // > 10 MB Limit

    const response = await request(app.getHttpServer())
      .post('/wareneintraege')
      .field('avvCodeId', 'f8a3632d-6b2c-4843-b223-85a711b4a9a7')
      .field('freitext', 'Testeintrag')
      .attach('foto', zuGross, { filename: 'foto.png', contentType: 'image/png' });

    expect([413, 422]).toContain(response.status);
  });
});
