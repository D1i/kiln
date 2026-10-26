/**
 * Fixed-capacity buffer of frame samples backed by preallocated typed arrays, so recording a frame never allocates.
 * Index 0 is the oldest retained sample. `sequence` counts every sample ever pushed, which lets markers refer to
 * a frame by its absolute number and survive the buffer wrapping around.
 */
export class FrameRingBuffer {
  private readonly cpuMs: Float32Array;
  private readonly intervalMs: Float32Array;
  private pushed = 0;

  constructor(readonly capacity: number) {
    this.cpuMs = new Float32Array(capacity);
    this.intervalMs = new Float32Array(capacity);
  }

  push(cpuFrameMs: number, intervalFrameMs: number): void {
    const slot = this.pushed % this.capacity;
    this.cpuMs[slot] = cpuFrameMs;
    this.intervalMs[slot] = intervalFrameMs;
    this.pushed++;
  }

  get length(): number {
    return Math.min(this.pushed, this.capacity);
  }

  /** Absolute number of the next sample to be pushed. */
  get sequence(): number {
    return this.pushed;
  }

  /** Absolute number of the oldest retained sample. */
  get firstSequence(): number {
    return this.pushed - this.length;
  }

  cpuAt(index: number): number {
    return this.cpuMs[this.slotOf(index)] ?? 0;
  }

  intervalAt(index: number): number {
    return this.intervalMs[this.slotOf(index)] ?? 0;
  }

  clear(): void {
    this.pushed = 0;
  }

  private slotOf(index: number): number {
    if (index < 0 || index >= this.length)
      throw new RangeError(`index ${index} out of range 0..${this.length - 1}`);
    return (this.firstSequence + index) % this.capacity;
  }
}
