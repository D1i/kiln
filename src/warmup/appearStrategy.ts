import type { GuestId } from '../scene/guestCatalog';

export type WarmupMode = 'off' | 'on';

/**
 * What differs between the two modes: when a guest is built and what has been done to its materials and
 * textures before the user sees it. The appearance controller, the metrics and the UI do not know which one runs.
 */
export interface AppearStrategy {
  readonly mode: WarmupMode;
  /** Loading-screen work. Resolves when the scene is ready to start showing guests. */
  prepare(onProgress: (message: string) => void): Promise<void>;
  /** Makes the guest visible. Synchronous: whatever it costs lands in the next frame, which is what we measure. */
  reveal(guestId: GuestId): void;
}
