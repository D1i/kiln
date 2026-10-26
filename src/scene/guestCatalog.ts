/**
 * The 12 guests, in the order they appear. Pure data (no Babylon), so tests and the UI can use it without a GL
 * context. Every entry needs a shader or texture variant that the scene has not seen before it appears.
 */
export const GUEST_CATALOG = [
  { id: 'plain', label: 'No texture' },
  { id: 'texture-2048', label: 'Diffuse 2048²' },
  { id: 'diffuse-normal', label: 'Diffuse + normal' },
  { id: 'pbr', label: 'PBR metal/rough' },
  { id: 'transparent', label: 'Transparent' },
  { id: 'shadow', label: 'Shadow' },
  { id: 'two-lights', label: '2 lights' },
  { id: 'vertex-colors', label: 'Vertex colors' },
  { id: 'morph', label: 'Morph target' },
  { id: 'skinned', label: 'Skinning' },
  { id: 'ktx2-2048', label: 'KTX2 2048²' },
  { id: 'png-4096', label: 'PNG 4096²' }
] as const;

export type GuestId = (typeof GUEST_CATALOG)[number]['id'];

export interface GuestCatalogEntry {
  id: GuestId;
  label: string;
}

export const GUEST_COLUMNS = 4;
export const GUEST_SPACING = 3.4;

/** Grid cell of the guest on the floor: 4 columns by 3 rows, centred on the origin. */
export function guestSlot(index: number): { x: number; z: number } {
  const column = index % GUEST_COLUMNS;
  const row = Math.floor(index / GUEST_COLUMNS);
  const rows = Math.ceil(GUEST_CATALOG.length / GUEST_COLUMNS);
  return {
    x: (column - (GUEST_COLUMNS - 1) / 2) * GUEST_SPACING,
    z: (row - (rows - 1) / 2) * GUEST_SPACING
  };
}

/** 1-based position in the order of appearance: the short name used on the graph and in the table. */
export function guestOrdinal(id: GuestId): number {
  return GUEST_CATALOG.findIndex((guest) => guest.id === id) + 1;
}
