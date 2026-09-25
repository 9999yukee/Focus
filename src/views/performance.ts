import { button, element, toast } from '../components/dom';
import { callout, fact, group, row, selectSetting, toggle } from '../components/settings-controls';
import { performanceMonitor as monitor, memory, number } from '../performance/PerformanceMonitor';
import type { Navigation } from './settings';

export function performancePage(navigation: Navigation): { node: HTMLElement; dispose: () => void } {
  const root = element('div');
  const policies = group('Every resource has a purpose');
  policies.append(toggle('pauseOffscreenMedia', 'Pause off-screen video', 'Pause message attachment videos outside the viewport. Calls stay active.'), toggle('autoplayVideo', 'Auto-play attachment video', 'Allow Discord’s attachment videos to start without a click.'), selectSetting('backgroundMode', 'Background activity', 'Minimum also pauses attachment videos when another app has focus.', [{ value: 'minimum', label: 'Minimum' }, { value: 'balanced', label: 'Balanced' }]), fact('Voice continuity', 'Microphone, audio transport, and live streams remain active.', 'Always on'));
  root.append(policies);
  const live = group('Live measurements', 'Focus + its WebView2 processes. Sampling runs only while enabled.');
  const switchRow = row('Performance monitor', 'Show live memory and CPU in the bottom bar.');
  const monitorButton = button('', () => { void monitor.toggle(!monitor.enabled).catch(error => toast(String(error))); }, 'toggle');
  monitorButton.role = 'switch'; monitorButton.setAttribute('aria-label', 'Performance monitor'); monitorButton.innerHTML = '<span></span>'; switchRow.append(monitorButton); live.append(switchRow);
  const cards = element('div', 'metric-cards');
  const metrics = ['Working set', 'CPU', 'Processes']; const values: HTMLElement[] = [];
  for (const label of metrics) { const card = element('div', 'metric-card'); const value = element('strong', '', '—'); values.push(value); card.append(element('span', '', label), value); cards.append(card); }
  live.append(cards);
  const details = element('dl', 'metric-details');
  const keys = ['Private memory', 'WebView2 processes', 'Background CPU estimate', 'Shell startup', 'Discord frame cadence', 'Frame interval / p95', 'Estimated missed 60 Hz frames', 'Long tasks / interval', 'Discord DOM nodes', 'Message DOM elements', 'Images loaded', 'Videos playing', 'GPU / decoded GIFs / cache bytes', 'Messages in Discord memory'];
  const detailValues = new Map<string, HTMLElement>();
  for (const key of keys) { const value = element('dd', '', '—'); details.append(element('dt', '', key), value); detailValues.set(key, value); }
  const disclosure = element('details', 'metrics-disclosure'); disclosure.append(element('summary', '', 'Detailed statistics'), details); live.append(disclosure);
  live.append(element('p', 'fine-print', 'Working sets can count shared pages more than once. CPU is normalized across logical processors. Frame cadence is measured only while Discord is visible and focused; it is not a GPU or JavaScript execution-time measurement. “—” means unavailable.'));
  root.append(live);

  const capture = group('Benchmark capture', 'Capture 30 seconds of your current activity. Choose the scenario you are actually testing.');
  const controls = element('div', 'capture-controls');
  const scenario = element('select'); scenario.setAttribute('aria-label', 'Benchmark scenario');
  for (const [value, label] of [['login-idle', 'Login page · idle'], ['dm-idle', 'Direct messages · idle'], ['server-idle', 'Large server · idle'], ['scroll', 'Scroll 1,000+ messages'], ['gif-picker', 'GIF picker'], ['voice', 'Voice connected'], ['voice-screen-share', 'Voice + screen share'], ['minimized', 'Minimized idle'], ['restore', 'Restore window']]) {
    const option = element('option', '', label); option.value = value; scenario.append(option);
  }
  const record = button('Start capture', () => { void monitor.record(scenario.value).catch(error => toast(String(error))); }, 'button primary');
  const exportButton = button('Export JSON', () => { void monitor.export().catch(error => toast(String(error))); }, 'button secondary');
  controls.append(scenario, record, exportButton); capture.append(controls);
  const captureStatus = element('p', 'fine-print'); capture.append(captureStatus); root.append(capture);

  root.append(callout('Renderer ownership matters', 'Discord manages message virtualization, decoded GIFs, caches, and hardware acceleration. Focus cannot replace those internals from the outside.', { label: 'Open viewport lab', run: () => navigation.page('lab') }));

  function update(): void {
    monitorButton.setAttribute('aria-checked', String(monitor.enabled));
    const sample = monitor.sample;
    values[0].textContent = memory(sample?.workingSetBytes); values[1].textContent = number(sample?.cpuPercent, ' %'); values[2].textContent = number(sample?.processCount, '', 0);
    const renderer = sample?.renderer;
    const recent = renderer && Date.now() - renderer.observedAtMs < 6000;
    const list = [memory(sample?.privateBytes), number(sample?.webviewProcessCount, '', 0), number(sample?.idleCpuEstimate, ' %'), number(sample?.startupMs, ' ms', 0), recent ? number(renderer.fps, ' FPS') : '—', recent ? `${number(renderer.frameTimeMs)} / ${number(renderer.frameP95Ms)} ms` : '—', recent ? number(renderer.estimatedDroppedFrames, '', 0) : '—', recent ? number(renderer.longTasks, '', 0) : '—', recent ? number(renderer.domNodes, '', 0) : '—', recent ? number(renderer.messagesRendered, '', 0) : '—', recent ? number(renderer.imagesLoaded, '', 0) : '—', recent ? number(renderer.videoPlaying, '', 0) : '—', 'Unavailable', 'Unavailable'];
    keys.forEach((key, index) => { detailValues.get(key)!.textContent = list[index]; });
    record.disabled = monitor.recording; scenario.disabled = monitor.recording;
    record.textContent = monitor.recording ? 'Capturing…' : 'Start capture'; exportButton.disabled = !monitor.samples.length || monitor.recording;
    captureStatus.textContent = monitor.recording ? `Recording ${monitor.samples.length} samples. You can return to Discord or minimize this window.` : monitor.samples.length ? `${monitor.samples.length} samples ready · ${monitor.scenario}. Scenario labels are selected manually.` : 'No capture yet. Startup trials are available through the benchmark script.';
  }
  update(); const unsubscribe = monitor.subscribe(update);
  return { node: root, dispose: unsubscribe };
}
