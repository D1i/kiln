/**
 * Delay before step `stepIndex` of a schedule that started at `startMs`.
 * The target of every step is `startMs + stepIndex * intervalMs`, not "previous step + interval",
 * so timer jitter and slow frames do not accumulate into drift.
 */
export function delayUntilStep(
  startMs: number,
  stepIndex: number,
  intervalMs: number,
  nowMs: number
): number {
  return Math.max(0, startMs + stepIndex * intervalMs - nowMs);
}
