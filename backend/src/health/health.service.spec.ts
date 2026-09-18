import { beforeEach, describe, expect, it, vi } from 'vitest';

const queryMock = vi.fn();
const endMock = vi.fn();
const sendMock = vi.fn();

vi.mock('pg', () => ({
  Pool: vi.fn().mockImplementation(function PoolMock() {
    return { query: queryMock, end: endMock };
  }),
}));

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(function S3ClientMock() {
    return { send: sendMock };
  }),
  HeadBucketCommand: vi.fn(),
}));

process.env['DATABASE_URL'] = 'postgres://user:pass@localhost:5432/db';
process.env['OBJECT_STORAGE_ENDPOINT'] = 'http://localhost:9000';
process.env['OBJECT_STORAGE_ACCESS_KEY_ID'] = 'access';
process.env['OBJECT_STORAGE_SECRET_ACCESS_KEY'] = 'secret';
process.env['OBJECT_STORAGE_BUCKET'] = 'bucket';
process.env['JWT_SECRET'] = 'test-secret';

const { HealthService } = await import('./health.service.js');

describe('HealthService', () => {
  beforeEach(() => {
    queryMock.mockReset();
    sendMock.mockReset();
  });

  it('reports ok when database and object storage are reachable', async () => {
    queryMock.mockResolvedValue({ rows: [] });
    sendMock.mockResolvedValue({});

    const service = new HealthService();
    await expect(service.check()).resolves.toEqual({
      status: 'ok',
      database: 'ok',
      objectStorage: 'ok',
    });
  });

  it('reports error when the database is unreachable', async () => {
    queryMock.mockRejectedValue(new Error('connection refused'));
    sendMock.mockResolvedValue({});

    const service = new HealthService();
    await expect(service.check()).resolves.toEqual({
      status: 'error',
      database: 'error',
      objectStorage: 'ok',
    });
  });

  it('reports error when the object storage is unreachable', async () => {
    queryMock.mockResolvedValue({ rows: [] });
    sendMock.mockRejectedValue(new Error('bucket not found'));

    const service = new HealthService();
    await expect(service.check()).resolves.toEqual({
      status: 'error',
      database: 'ok',
      objectStorage: 'error',
    });
  });
});
