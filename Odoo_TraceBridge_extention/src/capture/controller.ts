import { exact, LIMITS, type Header } from '../session/model';
import type { Target } from '../../entrypoints/popup/consent';

export const CAPTURE = { buffer: 128, limit: 512, setupTimeout: 3000 } as const;
export type Category = 'button_click' | 'link_click' | 'navigation_signal' | 'document_navigation';
export interface Evidence { category: Category; sequence: number; elapsedMs: number }
export interface Summary { count: number; dropped: number; events: Evidence[] }
export interface CaptureSender {
  id?: string; frameId?: number; documentId?: string; documentLifecycle?: string; origin?: string; url?: string;
  tab?: { id?: number; windowId?: number; incognito?: boolean };
}
export interface CapturePort {
  name: string; sender?: CaptureSender;
  postMessage(message: string): void; disconnect(): void;
  onMessage: { addListener(listener: (message: unknown) => void): void };
  onDisconnect: { addListener(listener: () => void): void };
}
export interface CapturePlatform {
  extensionId: string;
  now(): number; token(): string;
  probe(target: Target, documentId?: string): Promise<string>;
  inject(target: Target, documentId: string, config: { token: string; deadline: number; limit: number }): Promise<void>;
  validate(target: Target, documentId: string): Promise<boolean>;
  invalidate(): void;
}
export interface Capture {
  start(row: Header, target: Target, current: () => boolean): Promise<void>;
  stop(): void; forget(id: string): void; summary(id: string): Summary;
}
export function createCapture(platform: CapturePlatform) {
  let run: { row: Header; target: Target; documentId: string; token: string; current: () => boolean; port?: CapturePort; sequence: number; busy: boolean; ready: () => void } | undefined;
  let evidenceId: string | undefined;
  let events: Evidence[] = [];
  let count = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const live = (item: NonNullable<typeof run>) => run === item && item.current() && platform.now() >= item.row.createdAt && platform.now() < item.row.createdAt + LIMITS.duration;
  function stop() {
    const previous = run; run = undefined;
    clearTimeout(timer);
    previous?.port?.disconnect();
  }
  function invalidate() { stop(); platform.invalidate(); }
  function append(category: Category, row: Header) {
    events.push({ category, sequence: ++count, elapsedMs: Math.max(0, Math.floor((platform.now() - row.createdAt) / 100) * 100) });
    if (events.length > CAPTURE.buffer) events.shift();
  }
  return {
    stop,
    forget(id: string) { if (id === evidenceId) { stop(); evidenceId = undefined; events = []; count = 0; } },
    summary(id: string): Summary { return id === evidenceId ? { count, dropped: count - events.length, events: events.map(event => ({ ...event })) } : { count: 0, dropped: 0, events: [] }; },
    async start(row: Header, target: Target, current: () => boolean) {
      stop();
      evidenceId = row.id; events = []; count = 0;
      const documentId = await platform.probe(target);
      if (!current()) throw new Error('Capture invalidated.');
      let ready!: () => void;
      const connected = new Promise<void>(resolve => { ready = resolve; });
      const item = { row, target, documentId, token: platform.token(), current, sequence: 0, busy: false, ready };
      run = item;
      timer = setTimeout(invalidate, Math.max(0, row.createdAt + LIMITS.duration - platform.now()));
      let setup: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          (async () => {
            await platform.inject(target, documentId, { token: item.token, deadline: row.createdAt + LIMITS.duration, limit: CAPTURE.limit });
            await connected;
          })(),
          new Promise<never>((_resolve, reject) => { setup = setTimeout(() => reject(new Error('Collector unavailable.')), CAPTURE.setupTimeout); }),
        ]);
        if (!live(item)) throw new Error('Capture invalidated.');
      } catch (error) { stop(); throw error; }
      finally { clearTimeout(setup); }
    },
    connect(port: CapturePort) {
      const item = run;
      const sender = port.sender;
      let origin: string | undefined;
      try { origin = new URL(sender?.url ?? '').origin; } catch { /* Missing identity is denied. */ }
      if (!item || !live(item) || item.port || port.name !== item.token || sender?.id !== platform.extensionId ||
          sender.frameId !== 0 || sender.documentId !== item.documentId || sender.documentLifecycle !== 'active' ||
          sender.origin !== item.target.origin || origin !== item.target.origin || sender.tab?.id !== item.target.tabId ||
          sender.tab.windowId !== item.target.windowId || sender.tab.incognito !== false) { port.disconnect(); return; }
      item.port = port;
      port.onDisconnect.addListener(() => { if (run === item) invalidate(); });
      port.onMessage.addListener(message => {
        if (!live(item) || item.busy || !exact(message, ['sequence', 'category']) ||
            message.sequence !== item.sequence + 1 || !['button_click', 'link_click', 'navigation_signal'].includes(message.category as string) ||
            item.sequence >= CAPTURE.limit) { if (run === item) invalidate(); return; }
        item.busy = true;
        void (async () => {
          try {
            if (!await platform.validate(item.target, item.documentId) || !live(item)) { if (run === item) invalidate(); return; }
            item.sequence++;
            append(message.category as Category, item.row);
            item.busy = false;
            port.postMessage('accepted');
            if (message.category === 'navigation_signal' || item.sequence >= CAPTURE.limit) invalidate();
          } catch { if (run === item) invalidate(); }
        })();
      });
      try { port.postMessage('ready'); item.ready(); } catch { invalidate(); }
    },
    navigation(tabId: number) {
      if (run?.target.tabId === tabId && live(run)) append('document_navigation', run.row);
      if (run?.target.tabId === tabId) invalidate();
    },
  };
}
