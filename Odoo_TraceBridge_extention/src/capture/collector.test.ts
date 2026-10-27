import { afterEach, describe, expect, it, vi } from 'vitest';
import { collect } from './collector';

class ElementFixture {
  constructor(readonly tagName: string) {}
  get textContent(): never { throw new Error('Forbidden text read'); }
  get value(): never { throw new Error('Forbidden value read'); }
  get innerHTML(): never { throw new Error('Forbidden HTML read'); }
  get href(): never { throw new Error('Forbidden URL read'); }
  get id(): never { throw new Error('Forbidden identifier read'); }
}
class HtmlFixture extends ElementFixture {
  constructor(tag: string, readonly isContentEditable = false) { super(tag); }
}
function fixture() {
  vi.useFakeTimers(); vi.setSystemTime(100_000);
  const listeners = new Map<string, (event: unknown) => void>();
  let message!: (input: unknown) => void;
  let disconnected!: () => void;
  const postMessage = vi.fn(); const disconnect = vi.fn();
  const surface = { addEventListener(type: string, listener: (event: unknown) => void) { listeners.set(type, listener); },
    removeEventListener(type: string) { listeners.delete(type); } };
  const window = { ...surface, top: undefined as unknown }; window.top = window;
  vi.stubGlobal('window', window); vi.stubGlobal('document', surface);
  vi.stubGlobal('Element', ElementFixture); vi.stubGlobal('HTMLElement', HtmlFixture);
  vi.stubGlobal('chrome', { runtime: { connect: () => ({ postMessage, disconnect,
    onMessage: { addListener(fn: typeof message) { message = fn; } }, onDisconnect: { addListener(fn: typeof disconnected) { disconnected = fn; } } }) } });
  return { listeners, postMessage, disconnect, ready: () => message('ready'), ack: () => message('accepted'),
    lost: () => disconnected(), window,
    click(path: ElementFixture[], trusted = true) { listeners.get('click')?.({ target: path[0], isTrusted: trusted, composedPath: () => path }); } };
}
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('isolated collector self-checks (synthetic DOM/port)', () => {
  it('attaches only after worker readiness; emits categories without reading sensitive getters', () => {
    const f = fixture(); collect({ token: 'token', deadline: Date.now() + 60_000, limit: 512 });
    expect(f.listeners.size).toBe(0); f.ready();
    f.click([new HtmlFixture('SPAN'), new HtmlFixture('BUTTON')]); expect(f.postMessage).toHaveBeenCalledWith({ sequence: 1, category: 'button_click' });
    f.ack(); f.click([new HtmlFixture('A')]); expect(f.postMessage).toHaveBeenLastCalledWith({ sequence: 2, category: 'link_click' });
  });
  it('ignores untrusted/unknown/input/editable targets and never listens to input or keys', () => {
    const f = fixture(); collect({ token: 'token', deadline: Date.now() + 60_000, limit: 512 }); f.ready();
    for (const tag of ['INPUT', 'TEXTAREA', 'SELECT', 'OPTION', 'DIV', 'LABEL']) f.click([new HtmlFixture(tag)]);
    f.click([new HtmlFixture('BUTTON'), new HtmlFixture('DIV', true)]); f.click([new HtmlFixture('BUTTON')], false);
    expect(f.postMessage).not.toHaveBeenCalled();
    expect([...f.listeners.keys()].sort()).toEqual(['click', 'hashchange', 'pagehide', 'popstate']);
  });
  it('drops while awaiting acknowledgement; disconnect/pagehide remove every listener without recovery', () => {
    const f = fixture(); collect({ token: 'token', deadline: Date.now() + 60_000, limit: 512 }); f.ready();
    f.click([new HtmlFixture('BUTTON')]); f.click([new HtmlFixture('BUTTON')]); expect(f.postMessage).toHaveBeenCalledOnce();
    f.lost(); expect(f.listeners.size).toBe(0); f.ready(); expect(f.listeners.size).toBe(0);
  });
  it('enforces absolute expiry before classification even if timer delivery is delayed', () => {
    const f = fixture(); collect({ token: 'token', deadline: Date.now() + 60_000, limit: 512 }); f.ready();
    vi.setSystemTime(160_000); f.click([new HtmlFixture('BUTTON')]); expect(f.postMessage).not.toHaveBeenCalled(); expect(f.listeners.size).toBe(0);
  });
  it('timer, pagehide, emission failure and limit teardown leave no listeners', () => {
    for (const reason of ['timer', 'pagehide', 'failure', 'limit']) {
      const f = fixture(); collect({ token: 'token', deadline: Date.now() + 60_000, limit: 1 }); f.ready();
      if (reason === 'timer') vi.advanceTimersByTime(60_000);
      if (reason === 'pagehide') f.listeners.get('pagehide')?.({});
      if (reason === 'failure') { f.postMessage.mockImplementation(() => { throw new Error('Disconnected'); }); f.click([new HtmlFixture('BUTTON')]); }
      if (reason === 'limit') { f.click([new HtmlFixture('BUTTON')]); f.ack(); }
      expect(f.listeners.size).toBe(0); expect(f.disconnect).toHaveBeenCalled();
    }
  });
  it('refuses child frames/expired setup and categorizes navigation without inspecting URLs', () => {
    const f = fixture(); f.window.top = {}; collect({ token: 'token', deadline: Date.now() + 1, limit: 512 }); expect(f.listeners.size).toBe(0);
    f.window.top = f.window; collect({ token: 'token', deadline: Date.now(), limit: 512 }); expect(f.listeners.size).toBe(0);
    collect({ token: 'token', deadline: Date.now() + 1000, limit: 512 }); f.ready(); f.listeners.get('popstate')?.({});
    expect(f.postMessage).toHaveBeenCalledWith({ sequence: 1, category: 'navigation_signal' });
  });
});
