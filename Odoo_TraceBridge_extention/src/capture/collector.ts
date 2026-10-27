// Serialized by scripting.executeScript: keep this function self-contained.
declare const chrome: typeof import('wxt/browser').browser;
export function collect(config: { token: string; deadline: number; limit: number }) {
  if (window !== window.top || Date.now() >= config.deadline) return;
  const port = chrome.runtime.connect({ name: config.token });
  let active = false;
  let stopped = false;
  let pending = false;
  let sequence = 0;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    active = false;
    clearTimeout(timer);
    document.removeEventListener('click', click, true);
    window.removeEventListener('popstate', navigation);
    window.removeEventListener('hashchange', navigation);
    window.removeEventListener('pagehide', stop);
    port.disconnect();
  };
  function emit(category: string) {
    if (!active || Date.now() >= config.deadline) { stop(); return; }
    if (pending) return;
    pending = true;
    try { port.postMessage({ sequence: ++sequence, category }); } catch { stop(); }
  }
  function click(event: MouseEvent) {
    if (!active || Date.now() >= config.deadline) { stop(); return; }
    if (!event.isTrusted || !(event.target instanceof Element)) return;
    // Only tag classification; never inspect text, values, hrefs, labels or identifiers.
    const path = event.composedPath();
    if (path.some(node => node instanceof HTMLElement && (node.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT', 'OPTION'].includes(node.tagName)))) return;
    const target = path.find(node => node instanceof Element && ['BUTTON', 'A'].includes(node.tagName));
    if (target instanceof Element) emit(target.tagName === 'BUTTON' ? 'button_click' : 'link_click');
  }
  function navigation() { emit('navigation_signal'); }
  const timer = setTimeout(stop, Math.max(0, config.deadline - Date.now()));
  port.onDisconnect.addListener(stop);
  port.onMessage.addListener((message: unknown) => {
    if (message === 'ready' && !stopped && !active && sequence === 0 && Date.now() < config.deadline) {
      active = true;
      document.addEventListener('click', click, { capture: true, passive: true });
      window.addEventListener('popstate', navigation);
      window.addEventListener('hashchange', navigation);
      window.addEventListener('pagehide', stop, { once: true });
    } else if (message === 'accepted' && active) {
      pending = false;
      if (sequence >= config.limit) stop();
    } else stop();
  });
}
