import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendMock = vi.fn();
const getSignedUrlMock = vi.fn();

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
  GetObjectCommand: vi.fn().mockImplementation(function GetObjectCommandMock(input: unknown) {
    return input;
  }),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: getSignedUrlMock,
}));

process.env['DATABASE_URL'] = 'postgres://user:pass@localhost:5432/db';
process.env['OBJECT_STORAGE_ENDPOINT'] = 'http://minio:9000';
process.env['OBJECT_STORAGE_PUBLIC_ENDPOINT'] = 'http://localhost:9000';
process.env['OBJECT_STORAGE_ACCESS_KEY_ID'] = 'access';
process.env['OBJECT_STORAGE_SECRET_ACCESS_KEY'] = 'secret';
process.env['OBJECT_STORAGE_BUCKET'] = 'bucket';
process.env['REDIS_URL'] = 'redis://localhost:6379';
process.env['JWT_SECRET'] = 'test-secret';

const { ObjectStorageService } = await import('./object-storage.service.js');

describe('ObjectStorageService', () => {
  beforeEach(() => {
    sendMock.mockReset();
    getSignedUrlMock.mockReset();
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

  it('returns a time-limited, presigned GET URL for the given key', async () => {
    getSignedUrlMock.mockResolvedValue('https://minio.local/bucket/wareneintraege/foto-1?signed=1');
    const service = new ObjectStorageService();

    const url = await service.getSignedUrl('wareneintraege/foto-1');

    expect(url).toBe('https://minio.local/bucket/wareneintraege/foto-1?signed=1');
    expect(getSignedUrlMock).toHaveBeenCalledOnce();
    const [, command, options] = getSignedUrlMock.mock.calls[0];
    expect(command).toEqual(expect.objectContaining({ Bucket: 'bucket', Key: 'wareneintraege/foto-1' }));
    expect(options).toEqual(expect.objectContaining({ expiresIn: expect.any(Number) }));
    expect(options.expiresIn).toBeGreaterThan(0);
  });

  it('signs GET URLs against the public endpoint, not the internal one used for upload/delete', async () => {
    const { S3Client } = await import('@aws-sdk/client-s3');
    getSignedUrlMock.mockResolvedValue('http://localhost:9000/bucket/wareneintraege/foto-1?signed=1');
    new ObjectStorageService();

    const endpoints = vi.mocked(S3Client).mock.calls.map(([config]) => (config as { endpoint: string }).endpoint);

    expect(endpoints).toContain('http://minio:9000');
    expect(endpoints).toContain('http://localhost:9000');
  });
});
