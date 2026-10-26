import './ui/styles.css';
import './scene/shaders';
import { Engine } from '@babylonjs/core/Engines/engine';
import { describeBrowser } from './env/browserInfo';
import { FrameRecorder } from './metrics/frameRecorder';
import { createEnvironment } from './scene/environment';
import { guestOrdinal, type GuestId } from './scene/guestCatalog';
import { FrameGraph } from './ui/frameGraph';
import { Panel } from './ui/panel';
import { PeaksTable } from './ui/peaksTable';
import { AppearController } from './warmup/appearController';
import { LazyAppearStrategy } from './warmup/lazyAppearStrategy';

const FRAMES_IN_GRAPH = 300;
const PEAK_WINDOW_MS = 500;

const pageStartMs = performance.now();

function showUnsupported(reason: string): void {
  document.getElementById('splash')?.remove();
  const message = document.createElement('div');
  message.className = 'unsupported';
  message.textContent = reason;
  document.body.append(message);
}

function start(): void {
  const canvas = document.getElementById('view') as HTMLCanvasElement;
  const splash = document.getElementById('splash') as HTMLElement;
  const host = document.getElementById('hud') as HTMLElement;

  if (!Engine.isSupported()) return showUnsupported('WebGL is not available in this browser.');
  const engine = new Engine(canvas, true, { powerPreference: 'high-performance', stencil: false }, false);
  if (engine.webGLVersion < 2) return showUnsupported('This demo needs WebGL 2.');

  const { scene } = createEnvironment(engine, canvas);

  const recorder = new FrameRecorder(FRAMES_IN_GRAPH, PEAK_WINDOW_MS);
  engine.onBeginFrameObservable.add(() => recorder.beginFrame(performance.now()));
  engine.onEndFrameObservable.add(() => recorder.endFrame(performance.now()));

  const strategy = new LazyAppearStrategy(scene, `${import.meta.env.BASE_URL}textures/`);
  const controller = new AppearController(strategy, {
    beforeAppear: (entry) =>
      recorder.markAppearance(entry.id, String(guestOrdinal(entry.id)), performance.now()),
    now: () => performance.now()
  });

  const table = new PeaksTable();
  recorder.peaks.subscribe((peak) => table.setPeak(strategy.mode, peak.subjectId as GuestId, peak.peakMs));

  // Subscribed after the recorder, so drawing the graph is not part of the frame it describes.
  const graph = new FrameGraph(recorder.buffer, () => recorder.markers);
  engine.onEndFrameObservable.add(() => graph.draw());

  const panel = new Panel(
    host,
    {
      appearNext: () => controller.appearNext(),
      toggleAuto: () => (controller.state.autoRunning ? controller.stopAuto() : controller.startAuto()),
      reset: () => {
        recorder.finishWindow();
        table.clearMode(strategy.mode);
        controller.reset();
      }
    },
    { gpu: engine.getGlInfo().renderer, browser: describeBrowser(navigator.userAgent) },
    table,
    graph
  );
  controller.changes.subscribe((state) => {
    panel.setAppearState(state);
    table.setAppearedCount(state.appearedCount);
  });
  panel.setAppearState(controller.state);
  table.setAppearedCount(0);

  window.addEventListener('resize', () => engine.resize());
  engine.runRenderLoop(() => scene.render());

  void strategy.prepare().then(() => {
    scene.executeWhenReady(() => {
      panel.setLoadMs(performance.now() - pageStartMs);
      splash.classList.add('hidden');
    });
  });
}

start();
