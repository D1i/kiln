import type { AppearanceMarker } from '../metrics/frameRecorder';
import type { FrameRingBuffer } from '../metrics/ringBuffer';

const Y_SCALE_STEPS_MS = [50, 100, 200, 400, 800, 1600];
const FRAME_BUDGET_MS = 16.7;
const SLOW_FRAME_MS = 33.3;
const MARKER_LABEL_ROWS = 3;

const COLOR = {
  grid: 'rgba(139, 147, 163, 0.25)',
  label: '#8b93a3',
  interval: 'rgba(139, 147, 163, 0.75)',
  cpu: '#8098f9',
  slow: '#fbbf24',
  marker: 'rgba(74, 222, 128, 0.55)',
  markerLabel: '#4ade80'
};

const AXIS_PADDING = { left: 30, top: 6, bottom: 4 };

/** Canvas-2D graph of the last frames: cpu time, frame interval, and a marker where each object appeared. */
export class FrameGraph {
  readonly element = document.createElement('canvas');
  private readonly context: CanvasRenderingContext2D;
  private cssWidth = 0;
  private cssHeight = 0;

  constructor(
    private readonly buffer: FrameRingBuffer,
    private readonly markers: () => readonly AppearanceMarker[]
  ) {
    this.element.className = 'graph';
    this.element.setAttribute('role', 'img');
    this.element.setAttribute('aria-label', 'Frame time of the last 300 frames');
    const context = this.element.getContext('2d');
    if (!context) throw new Error('2D canvas is not available');
    this.context = context;
    // Sizes come from the observer, never from clientWidth in draw(): reading layout every frame can force a reflow.
    new ResizeObserver(([entry]) => {
      if (entry) this.fitTo(entry.contentRect.width, entry.contentRect.height);
    }).observe(this.element);
  }

  draw(): void {
    const { context, buffer } = this;
    const width = this.cssWidth;
    const height = this.cssHeight;
    context.clearRect(0, 0, width, height);
    if (width === 0 || buffer.length === 0) return;

    const plotLeft = AXIS_PADDING.left;
    const plotTop = AXIS_PADDING.top;
    const plotWidth = width - plotLeft;
    const plotHeight = height - plotTop - AXIS_PADDING.bottom;

    let visibleMax = 0;
    for (let index = 0; index < buffer.length; index++) {
      visibleMax = Math.max(visibleMax, buffer.cpuAt(index), buffer.intervalAt(index));
    }
    const yMax = Y_SCALE_STEPS_MS.find((step) => step >= visibleMax) ?? visibleMax;
    const xStep = plotWidth / (buffer.capacity - 1);
    const xOf = (index: number) => width - (buffer.length - 1 - index) * xStep;
    const yOf = (ms: number) => plotTop + plotHeight * (1 - Math.min(ms, yMax) / yMax);

    context.font = '10px "IBM Plex Mono", monospace';
    context.textBaseline = 'middle';
    for (const guide of [FRAME_BUDGET_MS, SLOW_FRAME_MS]) {
      if (guide >= yMax) continue;
      context.strokeStyle = COLOR.grid;
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(plotLeft, yOf(guide));
      context.lineTo(width, yOf(guide));
      context.stroke();
      context.fillStyle = COLOR.label;
      context.textAlign = 'right';
      context.fillText(guide.toFixed(1), plotLeft - 4, yOf(guide));
    }
    context.fillStyle = COLOR.label;
    context.textAlign = 'right';
    context.fillText(`${yMax}`, plotLeft - 4, plotTop + 4);

    this.drawSeries((index) => buffer.intervalAt(index), COLOR.interval, 1, xOf, yOf);
    this.drawSeries((index) => buffer.cpuAt(index), COLOR.cpu, 1.5, xOf, yOf);

    context.fillStyle = COLOR.slow;
    for (let index = 0; index < buffer.length; index++) {
      const value = Math.max(buffer.cpuAt(index), buffer.intervalAt(index));
      if (value > SLOW_FRAME_MS) context.fillRect(xOf(index) - 1.5, yOf(value) - 1.5, 3, 3);
    }

    this.drawMarkers(xOf, plotTop, plotHeight);
  }

  private drawSeries(
    valueAt: (index: number) => number,
    color: string,
    lineWidth: number,
    xOf: (index: number) => number,
    yOf: (ms: number) => number
  ): void {
    const { context, buffer } = this;
    context.strokeStyle = color;
    context.lineWidth = lineWidth;
    context.lineJoin = 'round';
    context.beginPath();
    for (let index = 0; index < buffer.length; index++) {
      if (index === 0) context.moveTo(xOf(index), yOf(valueAt(index)));
      else context.lineTo(xOf(index), yOf(valueAt(index)));
    }
    context.stroke();
  }

  private drawMarkers(xOf: (index: number) => number, plotTop: number, plotHeight: number): void {
    const { context, buffer } = this;
    context.textBaseline = 'top';
    this.markers().forEach((marker, order) => {
      const index = marker.sequence - buffer.firstSequence;
      if (index < 0 || index >= buffer.length + 1) return;
      const x = Math.min(xOf(Math.min(index, buffer.length - 1)), this.cssWidth - 1);
      context.strokeStyle = COLOR.marker;
      context.lineWidth = 1;
      context.setLineDash([3, 3]);
      context.beginPath();
      context.moveTo(x, plotTop);
      context.lineTo(x, plotTop + plotHeight);
      context.stroke();
      context.setLineDash([]);
      context.fillStyle = COLOR.markerLabel;
      context.textAlign = x > this.cssWidth - 70 ? 'right' : 'left';
      context.fillText(
        marker.label,
        x + (context.textAlign === 'left' ? 3 : -3),
        plotTop + (order % MARKER_LABEL_ROWS) * 11
      );
    });
  }

  private fitTo(width: number, height: number): void {
    const ratio = window.devicePixelRatio || 1;
    this.cssWidth = width;
    this.cssHeight = height;
    this.element.width = Math.round(width * ratio);
    this.element.height = Math.round(height * ratio);
    this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
}
