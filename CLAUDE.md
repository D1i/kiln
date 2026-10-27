# CLAUDE.md

Warm-up demo: a Babylon.js page that shows the same 12 objects appearing with and without texture/shader warm-up, with a frame-time graph. Architecture: see `ARCHITECTURE.md`. The TZ lives in the main checkout under `docs/` (local only, gitignored).

## Language

Code, comments, UI, README and commit messages are in English (same as Tessera).

## Commands

| Task                                               | Command                                                                                                        |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Dev server                                         | `npm run dev` (port 5173)                                                                                      |
| Build (typecheck + Vite)                           | `npm run build`                                                                                                |
| Preview build                                      | `npm run preview` (port 4173)                                                                                  |
| Typecheck                                          | `npm run typecheck`                                                                                            |
| Lint                                               | `npm run lint`                                                                                                 |
| Format                                             | `npm run format` / `npm run format:check`                                                                      |
| Unit tests (Jest)                                  | `npm test`                                                                                                     |
| E2E (Playwright, headless Chromium on SwiftShader) | `npm run test:e2e`                                                                                             |
| Regenerate textures                                | `npm run gen:textures` (needs `toktx` from KTX-Software on PATH; writes the PNGs and the KTX2)                 |
| Refresh the KTX2 decoder files                     | `npm run fetch:ktx2-decoder` (copies the files of the installed Babylon version from the CDN to `public/ktx2`) |

Full set before handing over a task: typecheck, lint, format:check, test, build, test:e2e.

## Test split

- Jest (`tests/`): pure logic only (ring buffer, peak window, A/B report, schedule, registry). No WebGL.
- Playwright (`e2e/`): page flow on SwiftShader. Checks that things work, never the milliseconds. Cypress and Vitest are not used.
- Visual checks (scene, graph, screenshots for the post): Claude in Chrome.

## Conventions

- TypeScript strict, `noUncheckedIndexedAccess`. Babylon imports are `@babylonjs/core/...` side-effect imports of what is used, never the UMD `babylonjs` package.
- Every Babylon shader module a guest needs is imported statically in `src/scene/shaders.ts`; add to it when a new guest brings a new shader family, otherwise warm-up off measures a chunk download. Texture loaders (KTX2) follow the same rule.
- The panel is plain DOM (no React). Babylon objects do not leak into `src/ui/`.
- Each task goes in its own `git worktree`. Never push.
- Commit style follows the other projects: `scope: summary`, a prose body.

## Regression log

| What            | Last done |
| --------------- | --------- |
| Full regression | never     |
| Junk cleanup    | never     |
| Codebase review | never     |
