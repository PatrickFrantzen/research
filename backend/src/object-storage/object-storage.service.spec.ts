import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendMock = vi.fn();

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(function S3ClientMock() {
    return { send: sendMock };
  }),
  PutObjectCommand: vi.fn().mockImplementation(function PutObjectCommandMock(input: unknown) {
    return input;
  }),
  DeleteObjectCommand: vi.fn().mockImplementation(function DeleteObjectCommandMock(input: unknown) {
    return input;
  }),
}));

process.env['DATABASE_URL'] = 'postgres://user:pass@localhost:5432/db';
process.env['OBJECT_STORAGE_ENDPOINT'] = 'http://localhost:9000';
process.env['OBJECT_STORAGE_ACCESS_KEY_ID'] = 'access';
process.env['OBJECT_STORAGE_SECRET_ACCESS_KEY'] = 'secret';
process.env['OBJECT_STORAGE_BUCKET'] = 'bucket';
process.env['REDIS_URL'] = 'redis://localhost:6379';
process.env['JWT_SECRET'] = 'test-secret';

const { ObjectStorageService } = await import('./object-storage.service.js');

describe('ObjectStorageService', () => {
  beforeEach(() => {
    sendMock.mockReset();
  });

  it('uploads the photo under a generated key and returns the object reference', async () => {
    sendMock.mockResolvedValue({});
    const service = new ObjectStorageService();

    const key = await service.uploadFoto(Buffer.from('foto-bytes'), 'image/jpeg');

    expect(key).toMatch(/^wareneintraege\//);
    expect(sendMock).toHaveBeenCalledOnce();
  });

  it('deletes the photo under the given key', async () => {
    sendMock.mockResolvedValue({});
    const service = new ObjectStorageService();

    await service.deleteFoto('wareneintraege/foto-1');

    expect(sendMock).toHaveBeenCalledOnce();
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ Bucket: 'bucket', Key: 'wareneintraege/foto-1' }),
    );
  });
});
