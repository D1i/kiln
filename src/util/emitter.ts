export type Listener<Payload> = (payload: Payload) => void;

/** Minimal typed event emitter: the seam between the engine side and the DOM panel. */
export class Emitter<Payload> {
  private readonly listeners = new Set<Listener<Payload>>();

  subscribe(listener: Listener<Payload>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(payload: Payload): void {
    for (const listener of this.listeners) listener(payload);
  }
}
