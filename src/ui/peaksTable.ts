import { GUEST_CATALOG, guestOrdinal, type GuestId } from '../scene/guestCatalog';
import type { WarmupMode } from '../warmup/appearStrategy';
import { el } from './dom';

const SLOW_FRAME_MS = 33.3;

interface Row {
  name: HTMLElement;
  cells: Record<WarmupMode, HTMLElement>;
}

/** "object → peak off / peak on". A cell stays "—" until that mode has measured the object. */
export class PeaksTable {
  readonly element = el('div', 'peaks');
  private readonly rows = new Map<GuestId, Row>();

  constructor() {
    this.element.setAttribute('role', 'table');
    this.element.setAttribute('aria-label', 'Frame time peak per object, warm-up off and on');
    const header = el('div', 'peaks-row peaks-head');
    header.append(
      el('span', undefined, 'object'),
      el('span', undefined, 'off, ms'),
      el('span', undefined, 'on, ms')
    );
    this.element.append(header);

    for (const guest of GUEST_CATALOG) {
      const row = el('div', 'peaks-row pending');
      const name = el('span', undefined, `${guestOrdinal(guest.id)}. ${guest.label}`);
      const off = el('b', undefined, '—');
      const on = el('b', undefined, '—');
      row.append(name, off, on);
      this.element.append(row);
      this.rows.set(guest.id, { name, cells: { off, on } });
    }
  }

  setPeak(mode: WarmupMode, guestId: GuestId, peakMs: number): void {
    const cell = this.rows.get(guestId)?.cells[mode];
    if (!cell) return;
    cell.textContent = peakMs.toFixed(1);
    cell.classList.toggle('slow', peakMs > SLOW_FRAME_MS);
  }

  clearMode(mode: WarmupMode): void {
    for (const row of this.rows.values()) {
      row.cells[mode].textContent = '—';
      row.cells[mode].classList.remove('slow');
    }
  }

  /** Greys out the objects that have not appeared yet. */
  setAppearedCount(count: number): void {
    GUEST_CATALOG.forEach((guest, index) => {
      this.rows.get(guest.id)?.name.parentElement?.classList.toggle('pending', index >= count);
    });
  }
}
