import { GUEST_CATALOG, guestSlot } from '../src/scene/guestCatalog';

describe('guest catalog', () => {
  it('has exactly 12 guests with unique ids and labels', () => {
    expect(GUEST_CATALOG).toHaveLength(12);
    expect(new Set(GUEST_CATALOG.map((guest) => guest.id)).size).toBe(12);
    expect(new Set(GUEST_CATALOG.map((guest) => guest.label)).size).toBe(12);
  });

  it('puts every guest in its own cell of a grid centred on the origin', () => {
    const cells = GUEST_CATALOG.map((_, index) => guestSlot(index));
    expect(new Set(cells.map(({ x, z }) => `${x.toFixed(2)}:${z.toFixed(2)}`)).size).toBe(12);

    const meanX = cells.reduce((sum, cell) => sum + cell.x, 0) / cells.length;
    const meanZ = cells.reduce((sum, cell) => sum + cell.z, 0) / cells.length;
    expect(meanX).toBeCloseTo(0);
    expect(meanZ).toBeCloseTo(0);
  });
});
