import { afterEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { CAPTURE, createCapture, type CapturePort, type CaptureSender } from './controller';
import { LIMITS, type Header } from '../session/model';

const target = { tabId: 1, windowId: 2, origin: 'http://localhost:8069' };
const sender: CaptureSender = { id: 'extension', tab: { id: 1, windowId: 2, incognito: false },
  frameId: 0, documentId: 'document', documentLifecycle: 'active', origin: target.origin, url: `${target.origin}/private/123?token=SECRET#record` };
function port(name: string, from = sender) {
  let receive!: (message: unknown) => void;
  let disconnect!: () => void;
  const result: CapturePort = { name, sender: from, postMessage: vi.fn(), disconnect: vi.fn(),
    onMessage: { addListener(listener) { receive = listener; } }, onDisconnect: { addListener(listener) { disconnect = listener; } } };
  return { result, send: (message: unknown) => receive(message), lost: () => disconnect() };
}
function fixture() {
  vi.useFakeTimers(); vi.setSystemTime(100_000);
  const row: Header = { schema: 1, id: randomUUID(), epoch: randomUUID(), state: 'recording', createdAt: Date.now(), updatedAt: Date.now() };
  let token = '';
  let current = true;
  let connection: ReturnType<typeof port>;
  const validate = vi.fn(async () => true);
  const invalidate = vi.fn();
  const probe = vi.fn(async () => 'document');
  const inject = vi.fn(async (_target, _document, config) => { token = config.token; connection = port(token); capture.connect(connection.result); });
  const capture = createCapture({ extensionId: 'extension', now: Date.now, token: randomUUID, probe, inject, validate, invalidate });
  return { capture, row, validate, invalidate, probe, inject, start: () => capture.start(row, target, () => current),
    connection: () => connection, token: () => token, stale: () => { current = false; }, summary: () => capture.summary(row.id) };
}
async function flush() { for (let i = 0; i < 8; i++) await Promise.resolve(); }
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

describe('volatile capture worker boundary (synthetic ports)', () => {
  it('denies pre-Start ports and admits exact authorized top document only', async () => {
    const f = fixture(); const early = port('anything'); f.capture.connect(early.result); expect(early.result.disconnect).toHaveBeenCalled();
    await f.start(); expect(f.connection().result.postMessage).toHaveBeenCalledWith('ready');
    f.connection().send({ sequence: 1, category: 'button_click' }); await flush();
    expect(f.summary()).toEqual({ count: 1, dropped: 0, events: [{ category: 'button_click', sequence: 1, elapsedMs: 0 }] });
    expect(JSON.stringify(f.summary())).not.toMatch(/SECRET|private|123|localhost|token|record/);
  });
  it.each([
    { id: 'foreign' }, { tab: { id: 9, windowId: 2, incognito: false } }, { tab: { id: 1, windowId: 9, incognito: false } },
    { tab: { id: 1, windowId: 2, incognito: true } }, { frameId: 1 }, { documentId: 'old-document' }, { documentId: undefined },
    { documentLifecycle: 'cached' }, { origin: 'http://localhost:8070' }, { url: 'http://localhost:8069.evil.example' }, { origin: undefined },
  ])('rejects wrong identity %j before ready', async patch => {
    const f = fixture(); f.inject.mockImplementation(async (_target, _document, config) => {
      const bad = port(config.token, { ...sender, ...patch }); f.capture.connect(bad.result);
      expect(bad.result.disconnect).toHaveBeenCalled(); expect(bad.result.postMessage).not.toHaveBeenCalled();
    });
    const pending = expect(f.start()).rejects.toThrow('Collector unavailable'); await vi.advanceTimersByTimeAsync(CAPTURE.setupTimeout); await pending;
    expect(f.summary().count).toBe(0);
  });
  it('denies wrong token, duplicate connections and old epoch/session token after Resume', async () => {
    const f = fixture(); await f.start(); const old = f.connection(); const oldToken = f.token();
    for (const name of ['wrong', oldToken]) { const bad = port(name); f.capture.connect(bad.result); expect(bad.result.disconnect).toHaveBeenCalled(); }
    f.capture.stop(); f.row.epoch = randomUUID(); await f.start();
    const replay = port(oldToken); f.capture.connect(replay.result); expect(replay.result.disconnect).toHaveBeenCalled();
    old.send({ sequence: 1, category: 'button_click' }); await flush(); expect(f.summary().count).toBe(0);
  });
  it.each([null, {}, { sequence: 0, category: 'button_click' }, { sequence: 2, category: 'button_click' },
    { sequence: 1, category: 'input' }, { sequence: 1, category: 'button_click', text: 'SECRET' },
    { sequence: 1, category: { raw: 'SECRET' } }, { sequence: NaN, category: 'button_click' },
    { sequence: 1, category: 'x'.repeat(20000) }])('rejects malformed/replayed/unknown fields %j', async message => {
    const f = fixture(); await f.start(); f.connection().send(message); await flush();
    expect(f.summary().count).toBe(0); expect(f.invalidate).toHaveBeenCalledOnce();
  });
  it('rejects repeated sequence and concurrent message flood without backlog', async () => {
    const f = fixture(); await f.start(); f.connection().send({ sequence: 1, category: 'button_click' }); await flush();
    f.connection().send({ sequence: 1, category: 'button_click' }); await flush(); expect(f.summary().count).toBe(1);
    await f.start(); f.validate.mockImplementation(() => new Promise(() => {}));
    f.connection().send({ sequence: 1, category: 'button_click' }); f.connection().send({ sequence: 2, category: 'button_click' });
    expect(f.invalidate).toHaveBeenCalledTimes(2); expect(f.summary().count).toBe(0);
  });
  it.each(['access-loss', 'stale', 'stop', 'delete'] as const)('rechecks after async validation: %s', async reason => {
    const f = fixture(); await f.start(); let finish!: (allowed: boolean) => void;
    f.validate.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    f.connection().send({ sequence: 1, category: 'link_click' });
    if (reason === 'stale') f.stale(); if (reason === 'stop') f.capture.stop(); if (reason === 'delete') f.capture.forget(f.row.id);
    finish(reason !== 'access-loss'); await flush(); expect(f.summary().count).toBe(0);
  });
  it('rejects clock rollback before accepting evidence', async () => {
    const f = fixture(); await f.start(); vi.setSystemTime(99_999);
    f.connection().send({ sequence: 1, category: 'button_click' }); await flush();
    expect(f.summary().count).toBe(0); expect(f.invalidate).toHaveBeenCalledOnce();
  });
  it('handles validation errors and port loss safely', async () => {
    const f = fixture(); await f.start(); f.validate.mockRejectedValue(new Error('SECRET'));
    f.connection().send({ sequence: 1, category: 'button_click' }); await flush(); expect(f.invalidate).toHaveBeenCalledOnce();
    await f.start(); f.connection().lost(); expect(f.invalidate).toHaveBeenCalledTimes(2);
  });
  it('expires at the non-renewing session deadline; no five-second expiry or recovery', async () => {
    const f = fixture(); await f.start(); await vi.advanceTimersByTimeAsync(5001); expect(f.invalidate).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(LIMITS.duration - 5001); expect(f.invalidate).toHaveBeenCalledOnce();
    f.connection().send({ sequence: 1, category: 'button_click' }); await flush(); expect(f.summary().count).toBe(0);
  });
  it('bounds ring buffer, coarse time, overflow and total admission; no persistence port', async () => {
    const f = fixture(); await f.start();
    for (let sequence = 1; sequence <= CAPTURE.limit; sequence++) {
      vi.setSystemTime(100_000 + sequence * 101); f.connection().send({ sequence, category: 'button_click' }); await flush();
    }
    const summary = f.summary(); expect(summary.count).toBe(512); expect(summary.events).toHaveLength(128); expect(summary.dropped).toBe(384);
    expect(summary.events[0]!.sequence).toBe(385); expect(summary.events.every(event => event.elapsedMs % 100 === 0)).toBe(true);
    expect(f.invalidate).toHaveBeenCalledOnce();
    f.capture.forget(f.row.id); expect(f.summary().count).toBe(0);
  });
  it('records only generic document navigation, then invalidates, and a new worker is empty', async () => {
    const f = fixture(); await f.start(); f.capture.navigation(9); expect(f.summary().count).toBe(0);
    f.capture.navigation(1); expect(f.summary().events[0]!.category).toBe('document_navigation'); expect(f.invalidate).toHaveBeenCalledOnce();
    expect(fixture().summary()).toEqual({ count: 0, dropped: 0, events: [] });
  });
  it('injection/probe failure and missing handshake cannot leave an authorized collector', async () => {
    const f = fixture(); f.probe.mockRejectedValueOnce(new Error('No access')); await expect(f.start()).rejects.toThrow();
    f.inject.mockRejectedValueOnce(new Error('Denied')); await expect(f.start()).rejects.toThrow();
    f.inject.mockImplementation(async () => {});
    const pending = expect(f.start()).rejects.toThrow('Collector unavailable'); await vi.advanceTimersByTimeAsync(CAPTURE.setupTimeout); await pending;
    const late = port(f.token()); f.capture.connect(late.result); expect(late.result.disconnect).toHaveBeenCalled();
  });
});
