import { describe, expect, it, vi } from 'vitest';
import { AvvController } from './avv.controller.js';

describe('AvvController', () => {
  it('lists AVV-Codes without a filter when no search term is given', async () => {
    const prisma = { avvCode: { findMany: vi.fn().mockResolvedValue([]) } };
    const controller = new AvvController(prisma as never);

    await controller.findAll(undefined);

    expect(prisma.avvCode.findMany).toHaveBeenCalledWith({
      where: undefined,
      orderBy: { code: 'asc' },
      take: 50,
    });
  });

  it('filters by code or Bezeichnung when a search term is given', async () => {
    const prisma = { avvCode: { findMany: vi.fn().mockResolvedValue([]) } };
    const controller = new AvvController(prisma as never);

    await controller.findAll('Bauschutt');

    expect(prisma.avvCode.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { code: { contains: 'Bauschutt', mode: 'insensitive' } },
          { bezeichnung: { contains: 'Bauschutt', mode: 'insensitive' } },
        ],
      },
      orderBy: { code: 'asc' },
      take: 50,
    });
  });
});
