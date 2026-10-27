import './ui/styles.css';
import './scene/shaders';
import { Engine } from '@babylonjs/core/Engines/engine';
import { ResultsStore } from './app/resultsStore';
import { comparabilityKey, parseSettings, settingsToSearch, type DemoSettings } from './app/settings';
import { formatAbReport, summarizeMode, type AbEnvironment } from './bench/abReport';
import { RunValidityGuard, runAbStep } from './bench/abRunner';
import {
  AbSessionStore,
  createAbState,
  currentMode,
  isFinished,
  recordFailure,
  recordRun,
  runsOf,
  type AbState
} from './bench/abSession';
import { describeBrowser } from './env/browserInfo';
import { FrameRecorder } from './metrics/frameRecorder';
import { createEnvironment } from './scene/environment';
import { guestOrdinal, type GuestId } from './scene/guestCatalog';
import { useLocalKtx2Decoder } from './scene/ktx2';
import { createRunToken, uniquifyShaders } from './scene/shaderUniquifier';
import type { TextureFormat } from './scene/textureFormat';
import { FrameGraph } from './ui/frameGraph';
import { Panel } from './ui/panel';
import { PeaksTable } from './ui/peaksTable';
import { AppearController } from './warmup/appearController';
import type { AppearStrategy, WarmupMode } from './warmup/appearStrategy';
import { compiledEffectCount } from './warmup/effectCounter';
import { EagerAppearStrategy } from './warmup/eagerAppearStrategy';
import { LazyAppearStrategy } from './warmup/lazyAppearStrategy';

const FRAMES_IN_GRAPH = 300;
const PEAK_WINDOW_MS = 500;
const MODES: readonly WarmupMode[] = ['off', 'on'];

function showUnsupported(reason: string): void {
  document.getElementById('splash')?.remove();
  const message = document.createElement('div');
  message.className = 'unsupported';
  message.textContent = reason;
  document.body.append(message);
}

const nextRenderedFrame = (scene: { onAfterRenderObservable: { addOnce(callback: () => void): unknown } }) =>
  new Promise<void>((resolve) => scene.onAfterRenderObservable.addOnce(() => resolve()));

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

async function start(): Promise<void> {
  const loadStartMs = performance.now();
  const canvas = document.getElementById('view') as HTMLCanvasElement;
  const splash = document.getElementById('splash') as HTMLElement;
  const host = document.getElementById('hud') as HTMLElement;

  if (!Engine.isSupported()) return showUnsupported('WebGL is not available in this browser.');

  const abSession = new AbSessionStore(sessionStorage);
  const abState: AbState | null = abSession.loadActive(Date.now());
  const settings: DemoSettings = abState
    ? {
        mode: currentMode(abState),
        parallelCompile: abState.parallelCompile,
        textureFormat: abState.textureFormat
      }
    : parseSettings(location.search);

  // Before the first material is created: every page load gets shaders no cache has seen.
  const shaderToken = createRunToken();
  const uniquified = uniquifyShaders(shaderToken);

  const engine = new Engine(canvas, true, { powerPreference: 'high-performance', stencil: false }, false);
  if (engine.webGLVersion < 2) return showUnsupported('This demo needs WebGL 2.');

  const parallelCompileAvailable = engine.getCaps().parallelShaderCompile !== undefined;
  // Babylon asks the capability on every program it links, so dropping it turns the extension off for this page.
  if (!settings.parallelCompile) engine.getCaps().parallelShaderCompile = undefined;

  const { scene } = createEnvironment(engine, canvas);

  const recorder = new FrameRecorder(FRAMES_IN_GRAPH, PEAK_WINDOW_MS);
  engine.onBeginFrameObservable.add(() => recorder.beginFrame(performance.now()));
  engine.onEndFrameObservable.add(() => recorder.endFrame(performance.now()));

  useLocalKtx2Decoder(import.meta.env.BASE_URL);
  const textureUrl = (fileName: string) => `${import.meta.env.BASE_URL}textures/${fileName}`;
  const strategy: AppearStrategy =
    settings.mode === 'on'
      ? new EagerAppearStrategy(scene, textureUrl, settings.textureFormat)
      : new LazyAppearStrategy(scene, textureUrl, settings.textureFormat);
  const controller = new AppearController(strategy, {
    beforeAppear: (entry) =>
      recorder.markAppearance(entry.id, String(guestOrdinal(entry.id)), performance.now()),
    now: () => performance.now()
  });

  const results = new ResultsStore(sessionStorage, comparabilityKey(settings));
  const table = new PeaksTable();
  for (const mode of MODES) {
    for (const [guestId, peakMs] of Object.entries(results.get(mode).peaks)) {
      table.setPeak(mode, guestId as GuestId, peakMs);
    }
  }

  // Subscribed after the recorder, so drawing the graph is not part of the frame it describes.
  const graph = new FrameGraph(recorder.buffer, () => recorder.markers);
  engine.onEndFrameObservable.add(() => graph.draw());

  let effectsAtReady = 0;
  const environmentOfRun = (): AbEnvironment => ({
    gpu: engine.getGlInfo().renderer,
    browser: describeBrowser(navigator.userAgent),
    resolution: `${window.innerWidth}×${window.innerHeight}`,
    parallelCompile: !parallelCompileAvailable ? 'unavailable' : settings.parallelCompile ? 'on' : 'off',
    textureFormat: settings.textureFormat,
    repeats: abState?.repeats ?? 0
  });

  const navigateTo = (next: DemoSettings) => location.assign(`${location.pathname}${settingsToSearch(next)}`);

  const panel = new Panel(
    host,
    {
      appearNext: () => controller.appearNext(),
      toggleAuto: () => (controller.state.autoRunning ? controller.stopAuto() : controller.startAuto()),
      reset: () => {
        results.clearMode(settings.mode);
        location.reload();
      },
      setWarmupOn: (on) => navigateTo({ ...settings, mode: on ? 'on' : 'off' }),
      setParallelCompile: (on) => navigateTo({ ...settings, parallelCompile: on }),
      setTextureFormat: (format: TextureFormat) => navigateTo({ ...settings, textureFormat: format }),
      runAb: (repeats) => {
        abSession.clearReport();
        abSession.saveActive(createAbState(repeats, settings, Date.now()));
        location.reload();
      },
      cancelAb: () => {
        abSession.clearActive();
        navigateTo({ ...settings, mode: 'off' });
      },
      copyReport: async () => {
        const report = abSession.loadReport();
        if (report === null) return;
        if (await copyToClipboard(report)) panel.setCopyFeedback('Copied');
        else {
          panel.selectReportText();
          panel.setCopyFeedback('Press Ctrl+C');
        }
      }
    },
    {
      mode: settings.mode,
      parallelCompile: settings.parallelCompile,
      textureFormat: settings.textureFormat,
      parallelCompileAvailable,
      gpu: engine.getGlInfo().renderer,
      browser: describeBrowser(navigator.userAgent),
      shaderSeed: `shader seed ${shaderToken}, ${uniquified} shaders made unique for this page load`
    },
    table,
    graph
  );

  const refreshLoadTimes = () =>
    panel.setLoadTimes({ off: results.get('off').loadMs, on: results.get('on').loadMs });
  const refreshCompiled = () => panel.setCompiledAfterLoading(compiledEffectCount(engine) - effectsAtReady);
  refreshLoadTimes();
  panel.showReport(abState ? null : abSession.loadReport());

  recorder.peaks.subscribe((peak) => {
    table.setPeak(settings.mode, peak.subjectId as GuestId, peak.peakMs);
    if (!abState) results.setPeak(settings.mode, peak.subjectId as GuestId, peak.peakMs);
    refreshCompiled();
  });
  controller.changes.subscribe((state) => {
    panel.setAppearState(state);
    table.setAppearedCount(state.appearedCount);
    refreshCompiled();
  });
  panel.setAppearState(controller.state);
  table.setAppearedCount(0);
  // Locked until loading is over: in warm-up mode a click before the end would show an object that is not warm yet.
  if (abState) panel.setAbRunning(true, 'A/B run: loading…');
  else panel.setLocked(true);

  window.addEventListener('resize', () => engine.resize());
  engine.runRenderLoop(() => scene.render());

  splash.textContent = settings.mode === 'on' ? 'warming up…' : 'loading…';
  try {
    await strategy.prepare((message) => (splash.textContent = `warming up: ${message}`));
  } catch (error) {
    panel.setStatus(`Warm-up failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  await new Promise<void>((resolve) => scene.executeWhenReady(resolve));
  await nextRenderedFrame(scene);

  const loadMs = performance.now() - loadStartMs;
  recorder.reset();
  effectsAtReady = compiledEffectCount(engine);
  if (!abState) results.setLoadMs(settings.mode, loadMs);
  refreshLoadTimes();
  refreshCompiled();
  splash.classList.add('hidden');
  if (!abState) panel.setLocked(false);

  if (abState) await continueAb(abState, loadMs);

  async function continueAb(state: AbState, loadedInMs: number): Promise<void> {
    const mode = currentMode(state);
    const stepNumber = state.step + 1;
    panel.setAbRunning(
      true,
      `A/B ${stepNumber}/${state.plan.length}: warm-up ${mode}, run ${Math.floor(state.step / 2) + 1} of ${state.repeats}` +
        (state.failedAttempts > 0 ? ` (retry ${state.failedAttempts})` : '')
    );
    const outcome = await runAbStep(mode, loadedInMs, controller, recorder, new RunValidityGuard(canvas));

    if (!outcome.run) {
      const retry = recordFailure(state);
      if (retry) {
        abSession.saveActive(retry);
        return location.reload();
      }
      abSession.clearActive();
      abSession.saveReport(`A/B run aborted: ${outcome.problem}.`);
      return navigateTo({ ...settings, mode: 'off' });
    }

    const next = recordRun(state, outcome.run);
    if (!isFinished(next)) {
      abSession.saveActive(next);
      return location.reload();
    }

    const off = summarizeMode(runsOf(next, 'off'));
    const on = summarizeMode(runsOf(next, 'on'));
    abSession.saveReport(formatAbReport(environmentOfRun(), off, on));
    results.replaceMode('off', { loadMs: off.loadMs, peaks: off.peaksByGuest });
    results.replaceMode('on', { loadMs: on.loadMs, peaks: on.peaksByGuest });
    abSession.clearActive();
    navigateTo({ ...settings, mode: 'off' });
  }
}

void start();
