import { describe, expect, it, vi } from 'vitest';
import { HealthController } from './health.controller.js';

function buildRes() {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
}

describe('HealthController', () => {
  describe('liveness (GET /health)', () => {
    it('returns a minimal ok status without calling dependency checks or leaking infra details', async () => {
      const healthService = { check: vi.fn() };
      const controller = new HealthController(healthService as never);
      const res = buildRes();

      await controller.liveness(res as never);

      expect(healthService.check).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ status: 'ok' });
    });
  });

  describe('details (GET /health/details, authentifiziert)', () => {
    it('returns the full dependency status for authenticated users', async () => {
      const healthService = {
        check: vi.fn().mockResolvedValue({ status: 'ok', database: 'ok', objectStorage: 'ok' }),
      };
      const controller = new HealthController(healthService as never);
      const res = buildRes();

      await controller.details(res as never);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ status: 'ok', database: 'ok', objectStorage: 'ok' });
    });

    it('returns 503 when a dependency is down', async () => {
      const healthService = {
        check: vi.fn().mockResolvedValue({ status: 'error', database: 'error', objectStorage: 'ok' }),
      };
      const controller = new HealthController(healthService as never);
      const res = buildRes();

      await controller.details(res as never);

      expect(res.status).toHaveBeenCalledWith(503);
    });
  });
});
