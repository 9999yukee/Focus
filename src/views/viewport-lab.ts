import { button, element } from '../components/dom';
import { callout } from '../components/settings-controls';
import { AdaptiveViewportEngine } from '../virtualization/AdaptiveViewportEngine';
import type { FrozenView } from '../virtualization/AdaptiveViewportEngine';
import { BoundedLru } from '../media/BoundedLru';
import { FrameSampler } from '../performance/FrameSampler';

const frozen = new BoundedLru<string, FrozenView>(4096);

export function viewportLab(): { node: HTMLElement; dispose: () => void } {
  const root = element('div');
  root.append(callout('Synthetic renderer experiment', 'These numbered rows are generated test data. This engine runs only in the lab; it does not virtualize Discord’s messages or member lists.'));
  const engine = new AdaptiveViewportEngine(30_000, 52);
  const counters = element('div', 'lab-counters'); root.append(counters);
  const toolbar = element('div', 'lab-toolbar');
  const viewport = element('div', 'lab-viewport'); viewport.tabIndex = 0; viewport.setAttribute('aria-label', 'Synthetic virtualized list');
  const spacer = element('div', 'lab-spacer'); spacer.style.height = `${engine.offset(engine.count)}px`;
  const rows = element('div', 'lab-rows'); spacer.append(rows); viewport.append(spacer);
  const frames = new FrameSampler(); const frameLabel = element('span', 'fine-print', 'Frame timing starts when this view is visible.');
  toolbar.append(button('Jump to row 15,000', () => { viewport.scrollTop = engine.offset(14999); }), button('Back to top', () => { viewport.scrollTop = 0; }), frameLabel);
  root.append(toolbar, viewport);
  let frame = 0;
  let settle: ReturnType<typeof setTimeout> | undefined;
  let previousRange = '';
  function render(): void {
    frame = 0;
    const start = performance.now();
    const range = engine.range(viewport.scrollTop, viewport.clientHeight, start);
    const key = `${range.start}:${range.end}:${range.hotStart}:${range.hotEnd}`;
    if (key === previousRange) return;
    previousRange = key;
    const nodes: HTMLElement[] = [];
    for (let i = range.start; i < range.end; i++) {
      const node = element('div', `lab-row ${engine.temperature(i, range).toLowerCase()}`);
      node.append(element('span', 'lab-index', String(i + 1).padStart(5, '0')), element('span', '', `Synthetic viewport row ${i + 1}`), element('span', 'temperature', engine.temperature(i, range)));
      nodes.push(node);
    }
    rows.style.transform = `translateY(${range.offset}px)`; rows.replaceChildren(...nodes);
    counters.textContent = `30,000 rows · ${range.end - range.start} mounted · ${engine.count - (range.end - range.start)} cold · overscan ${range.overscan} · ${(performance.now() - start).toFixed(2)} ms update`;
  }
  function schedule(): void {
    if (!frame) frame = requestAnimationFrame(render);
    if (settle) clearTimeout(settle);
    settle = setTimeout(render, 150);
  }
  viewport.addEventListener('scroll', schedule, { passive: true });
  const resize = new ResizeObserver(schedule); resize.observe(viewport);
  const saved = frozen.get('lab');
  requestAnimationFrame(() => { viewport.scrollTop = saved?.scrollY ?? 0; render(); frames.start(); });
  const timer = setInterval(() => { const timing = frames.take(); frameLabel.textContent = timing.fps === null ? '—' : `${timing.fps.toFixed(1)} FPS · p95 ${timing.frameP95Ms?.toFixed(1)} ms`; }, 2000);
  return { node: root, dispose: () => {
    frozen.set('lab', { channelId: 'lab', scrollY: viewport.scrollTop, draft: '' }, 64);
    cancelAnimationFrame(frame); if (settle) clearTimeout(settle); clearInterval(timer); resize.disconnect(); frames.stop();
  } };
}
