# Architecture

A single static page (no backend) that renders one Babylon.js scene in two modes, **warm-up off** and **warm-up on**, and records frame times while 12 objects ("guests") appear one by one. The difference between the modes is the point of the demo.

```mermaid
flowchart LR
  UI[ui: panel, graph, table] -->|commands| App[main: app state]
  App --> Scene[scene: environment + guests]
  App --> Warmup[warmup: runner + appear controller]
  Warmup --> Scene
  Scene -->|begin/end frame| Metrics[metrics: recorder, peaks]
  Metrics -->|events| UI
  Bench[bench: A/B runner] --> App
  Bench -->|reload cycle| Storage[(sessionStorage)]
```

## Modes

```mermaid
sequenceDiagram
  participant U as User
  participant L as Loading screen
  participant S as Scene
  Note over U,S: warm-up off
  L->>S: create environment only
  U->>S: Appear next: create mesh, material, textures and show
  Note over U,S: warm-up on
  L->>S: create all 12 guests, setEnabled(false)
  L->>S: compile each material, draw each texture once into a 1x1 target
  U->>S: Appear next: setEnabled(true)
```

## Directories

| Path            | Purpose                                                            |
| --------------- | ------------------------------------------------------------------ |
| `src/scene`     | Environment (floor, camera, base light) and the 12 guest factories |
| `src/warmup`    | Material compilation, texture warm-up, appearance control          |
| `src/metrics`   | Frame recorder, ring buffer, peak windows, A/B report              |
| `src/bench`     | Run A/B orchestration across page reloads                          |
| `src/ui`        | DOM panel, canvas-2D frame graph, peaks table, styles              |
| `src/env`       | GPU and browser detection                                          |
| `scripts`       | Offline texture generation (PNG, KTX2 through `toktx`)             |
| `public`        | Generated textures and the KTX2 transcoder                         |
| `tests` / `e2e` | Jest unit tests / Playwright page-flow tests                       |

## Boundaries

- `ui/` talks to the engine side only through typed events and app state; it never touches Babylon objects.
- Guests are isolated: extra lights and shadows apply only to their own meshes, so one guest never changes another guest's shader variant.
- One `Engine` per page life. Switching parallel compile and every A/B run reload the page; shaders are made unique per run so the driver's program cache cannot make the cold path look warm.
