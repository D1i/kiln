import type { AppearState } from '../warmup/appearController';
import { button, el } from './dom';
import type { FrameGraph } from './frameGraph';
import type { PeaksTable } from './peaksTable';

export interface PanelHandlers {
  appearNext(): void;
  toggleAuto(): void;
  reset(): void;
}

export interface PanelEnvironment {
  gpu: string;
  browser: string;
}

/** The left-hand HUD. Plain DOM; knows nothing about Babylon, only about numbers, strings and callbacks. */
export class Panel {
  private readonly appearButton: HTMLButtonElement;
  private readonly autoButton: HTMLButtonElement;
  private readonly resetButton: HTMLButtonElement;
  private readonly loadValue = el('b', undefined, '…');
  private readonly progressValue = el('b', undefined, '0 / 12');
  private readonly status = el('div', 'hud-status');

  constructor(
    host: HTMLElement,
    handlers: PanelHandlers,
    environment: PanelEnvironment,
    table: PeaksTable,
    graph: FrameGraph
  ) {
    host.classList.add('hud');

    const head = el('div', 'hud-head');
    head.append(el('span', 'hud-title', 'Warm-up demo'));

    const rows = el('div', 'hud-rows');
    rows.append(this.row('Loading', this.loadValue), this.row('Appeared', this.progressValue));

    this.appearButton = button('Appear next', 'btn', handlers.appearNext);
    this.autoButton = button('Auto', 'btn ghost', handlers.toggleAuto);
    this.resetButton = button('Reset', 'btn ghost', handlers.reset);
    const controls = el('div', 'row');
    controls.append(this.appearButton, this.autoButton, this.resetButton);

    this.status.setAttribute('role', 'status');
    this.status.setAttribute('aria-live', 'polite');

    const caption = el('div', 'hud-sub');
    caption.append(el('div', undefined, environment.gpu), el('div', undefined, environment.browser));

    const legend = el('div', 'hud-sub legend');
    legend.append(
      this.legendItem('cpu', 'frame work (beginFrame → endFrame)'),
      this.legendItem('interval', 'time between frames')
    );

    const help = el(
      'div',
      'hud-help',
      'Each object needs a shader or texture the scene has not seen yet. The numbers on the graph are the order of appearance; the peak is the worst frame within half a second of it.'
    );

    host.append(head, rows, controls, this.status, table.element, graph.element, legend, caption, help);
  }

  setLoadMs(milliseconds: number): void {
    this.loadValue.textContent = `${milliseconds.toFixed(0)} ms`;
  }

  setStatus(message: string): void {
    this.status.textContent = message;
  }

  setAppearState(state: AppearState): void {
    this.progressValue.textContent = `${state.appearedCount} / ${state.total}`;
    this.appearButton.disabled = state.next === null;
    this.appearButton.textContent = state.next ? `Appear next: ${state.next.label}` : 'All appeared';
    this.autoButton.textContent = state.autoRunning ? 'Stop' : 'Auto';
    this.autoButton.disabled = state.next === null && !state.autoRunning;
    this.resetButton.disabled = state.appearedCount === 0;
  }

  private row(label: string, value: HTMLElement): HTMLElement {
    const row = el('div');
    row.append(el('span', undefined, label), value);
    return row;
  }

  private legendItem(kind: 'cpu' | 'interval', text: string): HTMLElement {
    const item = el('span', 'legend-item');
    item.append(el('i', `swatch ${kind}`), document.createTextNode(text));
    return item;
  }
}
