import { REPEAT_CHOICES, DEFAULT_REPEATS } from '../bench/abSession';
import type { AppearState } from '../warmup/appearController';
import type { WarmupMode } from '../warmup/appearStrategy';
import { button, el } from './dom';
import type { FrameGraph } from './frameGraph';
import type { PeaksTable } from './peaksTable';

export interface PanelHandlers {
  appearNext(): void;
  toggleAuto(): void;
  reset(): void;
  setWarmupOn(on: boolean): void;
  setParallelCompile(on: boolean): void;
  runAb(repeats: number): void;
  cancelAb(): void;
  copyReport(): void;
}

export interface PanelOptions {
  mode: WarmupMode;
  parallelCompile: boolean;
  /** False when the browser has no KHR_parallel_shader_compile: the checkbox is then disabled. */
  parallelCompileAvailable: boolean;
  gpu: string;
  browser: string;
  /** What the shader uniquifier did, shown as proof that a reload is a cold start. */
  shaderSeed: string;
}

/** The left-hand HUD. Plain DOM; knows nothing about Babylon, only about numbers, strings and callbacks. */
export class Panel {
  private readonly appearButton: HTMLButtonElement;
  private readonly autoButton: HTMLButtonElement;
  private readonly resetButton: HTMLButtonElement;
  private readonly warmupSwitch: HTMLInputElement;
  private readonly parallelCheckbox: HTMLInputElement;
  private readonly repeatsSelect: HTMLSelectElement;
  private readonly runAbButton: HTMLButtonElement;
  private readonly cancelAbButton: HTMLButtonElement;
  private readonly copyButton: HTMLButtonElement;
  private readonly loadOff = el('b', undefined, '—');
  private readonly loadOn = el('b', undefined, '—');
  private readonly progressValue = el('b', undefined, '0 / 12');
  private readonly compiledValue = el('b', undefined, '—');
  private readonly status = el('div', 'hud-status');
  private readonly abStatus = el('div', 'hud-status');
  private readonly report = el('pre', 'report');
  private locked = false;
  private readonly parallelAvailable: boolean;

  constructor(
    host: HTMLElement,
    handlers: PanelHandlers,
    options: PanelOptions,
    table: PeaksTable,
    graph: FrameGraph
  ) {
    host.classList.add('hud');
    this.parallelAvailable = options.parallelCompileAvailable;

    const head = el('div', 'hud-head');
    head.append(el('span', 'hud-title', 'Warm-up demo'));

    const switchLabel = el('label', `switch${options.mode === 'on' ? '' : ' off'}`);
    this.warmupSwitch = el('input');
    this.warmupSwitch.type = 'checkbox';
    this.warmupSwitch.checked = options.mode === 'on';
    this.warmupSwitch.addEventListener('change', () => handlers.setWarmupOn(this.warmupSwitch.checked));
    const switchText = el('span', 'switch-text');
    switchText.append(
      el('b', undefined, options.mode === 'on' ? 'Warm-up on' : 'Warm-up off'),
      el(
        'small',
        undefined,
        options.mode === 'on'
          ? 'Everything is compiled and drawn once on the loading screen'
          : 'Each object is created, compiled and uploaded when it appears'
      )
    );
    switchLabel.append(this.warmupSwitch, el('span', 'track'), switchText);

    const rows = el('div', 'hud-rows');
    rows.append(
      this.row('Loading, off', this.loadOff),
      this.row('Loading, on', this.loadOn),
      this.row('Appeared', this.progressValue),
      this.row('Compiled', this.compiledValue)
    );

    this.appearButton = button('Appear next', 'btn', handlers.appearNext);
    this.autoButton = button('Auto', 'btn ghost', handlers.toggleAuto);
    this.resetButton = button('Reset', 'btn ghost', handlers.reset);
    this.resetButton.title = 'Clears this mode’s numbers and reloads the page, so the next run starts cold';
    const controls = el('div', 'row');
    controls.append(this.appearButton, this.autoButton, this.resetButton);

    this.status.setAttribute('role', 'status');
    this.status.setAttribute('aria-live', 'polite');

    const parallelLabel = el('label', 'check');
    this.parallelCheckbox = el('input');
    this.parallelCheckbox.type = 'checkbox';
    this.parallelCheckbox.checked = options.parallelCompile && options.parallelCompileAvailable;
    this.parallelCheckbox.disabled = !options.parallelCompileAvailable;
    this.parallelCheckbox.addEventListener('change', () =>
      handlers.setParallelCompile(this.parallelCheckbox.checked)
    );
    parallelLabel.append(
      this.parallelCheckbox,
      document.createTextNode(
        options.parallelCompileAvailable
          ? 'KHR_parallel_shader_compile'
          : 'KHR_parallel_shader_compile (not available here)'
      )
    );

    const abSection = el('div', 'hud-controls');
    this.repeatsSelect = el('select');
    for (const repeats of REPEAT_CHOICES) {
      const option = el('option', undefined, `${repeats} ${repeats === 1 ? 'run' : 'runs'} per mode`);
      option.value = String(repeats);
      option.selected = repeats === DEFAULT_REPEATS;
      this.repeatsSelect.append(option);
    }
    this.repeatsSelect.setAttribute('aria-label', 'Runs per mode');
    this.runAbButton = button('Run A/B', 'btn', () => handlers.runAb(Number(this.repeatsSelect.value)));
    this.cancelAbButton = button('Cancel', 'btn ghost', handlers.cancelAb);
    this.cancelAbButton.hidden = true;
    const abRow = el('div', 'row');
    abRow.append(this.runAbButton, this.cancelAbButton);
    this.abStatus.setAttribute('role', 'status');
    this.abStatus.setAttribute('aria-live', 'polite');
    this.copyButton = button('Copy result', 'btn ghost', handlers.copyReport);
    this.copyButton.hidden = true;
    this.report.hidden = true;
    abSection.append(
      el('div', 'hud-sub', 'Reloads the page for every run, off and on in turn, 12 objects at 500 ms each.'),
      this.repeatsSelect,
      abRow,
      this.abStatus,
      this.report,
      this.copyButton
    );

    const legend = el('div', 'hud-sub legend');
    legend.append(
      this.legendItem('cpu', 'frame work (beginFrame → endFrame)'),
      this.legendItem('interval', 'time between frames')
    );

    const caption = el('div', 'hud-sub');
    caption.append(
      el('div', undefined, options.gpu),
      el('div', undefined, options.browser),
      el('div', undefined, options.shaderSeed)
    );

    const help = el(
      'div',
      'hud-help',
      'Each object needs a shader or texture the scene has not seen yet. The numbers on the graph are the order of appearance; the peak is the worst frame within half a second of it. “Compiled” counts the shader programs built after loading finished.'
    );

    host.append(
      head,
      switchLabel,
      rows,
      controls,
      this.status,
      table.element,
      graph.element,
      legend,
      parallelLabel,
      abSection,
      caption,
      help
    );
  }

  setLoadTimes(times: Record<WarmupMode, number | null>): void {
    this.loadOff.textContent = times.off === null ? '—' : `${times.off.toFixed(0)} ms`;
    this.loadOn.textContent = times.on === null ? '—' : `${times.on.toFixed(0)} ms`;
  }

  setCompiledAfterLoading(count: number): void {
    this.compiledValue.textContent = String(count);
  }

  setStatus(message: string): void {
    this.status.textContent = message;
  }

  setAppearState(state: AppearState): void {
    this.progressValue.textContent = `${state.appearedCount} / ${state.total}`;
    this.appearButton.dataset.exhausted = String(state.next === null);
    this.appearButton.disabled = this.locked || state.next === null;
    this.appearButton.textContent = state.next ? `Appear next: ${state.next.label}` : 'All appeared';
    this.autoButton.textContent = state.autoRunning ? 'Stop' : 'Auto';
    this.autoButton.disabled = this.locked || (state.next === null && !state.autoRunning);
  }

  /** While a run is in progress the page drives itself: the manual controls are locked. */
  setAbRunning(running: boolean, message = ''): void {
    this.abStatus.textContent = message;
    this.cancelAbButton.hidden = !running;
    this.runAbButton.hidden = running;
    this.repeatsSelect.hidden = running;
    this.setLocked(running);
  }

  setLocked(locked: boolean): void {
    this.locked = locked;
    for (const control of [this.autoButton, this.resetButton, this.warmupSwitch, this.runAbButton]) {
      control.disabled = locked;
    }
    this.parallelCheckbox.disabled = locked || !this.parallelAvailable;
    this.appearButton.disabled = locked || this.appearButton.dataset.exhausted === 'true';
  }

  showReport(text: string | null): void {
    this.report.hidden = text === null;
    this.copyButton.hidden = text === null;
    this.report.textContent = text ?? '';
  }

  setCopyFeedback(message: string): void {
    this.copyButton.textContent = message;
    setTimeout(() => (this.copyButton.textContent = 'Copy result'), 1500);
  }

  selectReportText(): void {
    const range = document.createRange();
    range.selectNodeContents(this.report);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
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
