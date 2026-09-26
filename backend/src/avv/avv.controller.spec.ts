import { describe, expect, it, vi } from 'vitest';
import { AvvController } from './avv.controller.js';

// Nur die AVV-Kapitel, die im Betrieb vorkommen (15, 16, 17, 19, 20).
const NUR_ERLAUBTE_KAPITEL = {
  OR: [
    { code: { startsWith: '15 ' } },
    { code: { startsWith: '16 ' } },
    { code: { startsWith: '17 ' } },
    { code: { startsWith: '19 ' } },
    { code: { startsWith: '20 ' } },
  ],
};

describe('AvvController', () => {
  it('lists only AVV-Codes from the allowed chapters when no search term is given', async () => {
    const prisma = { avvCode: { findMany: vi.fn().mockResolvedValue([]) } };
    const controller = new AvvController(prisma as never);

    await controller.findAll(undefined);

    expect(prisma.avvCode.findMany).toHaveBeenCalledWith({
      where: { AND: [NUR_ERLAUBTE_KAPITEL] },
      orderBy: { code: 'asc' },
      take: 50,
    });
  });

  it('filters by code or Bezeichnung within the allowed chapters when a search term is given', async () => {
    const prisma = { avvCode: { findMany: vi.fn().mockResolvedValue([]) } };
    const controller = new AvvController(prisma as never);

    await controller.findAll('Bauschutt');

    expect(prisma.avvCode.findMany).toHaveBeenCalledWith({
      where: {
        AND: [
          NUR_ERLAUBTE_KAPITEL,
          {
            OR: [
              { code: { contains: 'Bauschutt', mode: 'insensitive' } },
              { bezeichnung: { contains: 'Bauschutt', mode: 'insensitive' } },
            ],
          },
        ],
      },
      orderBy: { code: 'asc' },
      take: 50,
    });
  });
});
