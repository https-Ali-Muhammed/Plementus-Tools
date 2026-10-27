import { browser } from 'wxt/browser';
import { createSessionController } from '../src/session/controller';
import { createHeaderStore } from '../src/session/store';
import { createCapture } from '../src/capture/controller';
import { collect } from '../src/capture/collector';
import { identifyTab, type Target } from './popup/consent';

export default defineBackground(() => {
  async function selected() {
    const tabs = await browser.tabs.query({ active: true, lastFocusedWindow: true });
    if (tabs.length === 1) return tabs[0];
  }
  async function probe(target: Target, documentId?: string) {
    const tab = identifyTab(await selected());
    if (!tab || tab.tabId !== target.tabId || tab.windowId !== target.windowId || tab.origin !== target.origin) throw new Error('Scope unavailable.');
    const results = await browser.scripting.executeScript({
      target: { tabId: target.tabId, ...(documentId ? { documentIds: [documentId] } : { frameIds: [0] }) },
      world: 'ISOLATED', func: () => ({ origin: location.origin, top: window === window.top }),
    });
    const result = results[0];
    if (results.length !== 1 || result?.frameId !== 0 || !result.documentId || result.result?.origin !== target.origin || result.result?.top !== true ||
        documentId && result.documentId !== documentId) throw new Error('Document unavailable.');
    return result.documentId;
  }
  const capture = createCapture({
    extensionId: browser.runtime.id, now: Date.now, token: () => crypto.randomUUID(), probe,
    async inject(target, documentId, config) {
      await browser.scripting.executeScript({ target: { tabId: target.tabId, documentIds: [documentId] }, world: 'ISOLATED', func: collect, args: [config] });
    },
    async validate(target, documentId) { try { return await probe(target, documentId) === documentId; } catch { return false; } },
    invalidate() { void controller.invalidate(); },
  });
  const controller = createSessionController(createHeaderStore(), {
    extensionId: browser.runtime.id,
    popupUrl: browser.runtime.getURL('/popup.html'),
    selected, capture,
    async restrictStorage() { await browser.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' }); },
    async readBinding() { return (await browser.storage.session.get('binding')).binding; },
    async writeBinding(binding) {
      if (binding) await browser.storage.session.set({ binding });
      else await browser.storage.session.remove('binding');
    },
    async badge(state) {
      await browser.action.setBadgeText({ text: state === 'recording' ? 'ON' : state === 'paused' ? 'II' : state === 'error' ? 'ERR' : '' });
      await browser.action.setTitle({ title: `TraceBridge: ${state}. Limited volatile categories (Phase 05).` });
    },
    now: Date.now,
    id: () => crypto.randomUUID(),
  });
  browser.runtime.onMessage.addListener((message, sender) => controller.handle(message, sender));
  browser.runtime.onConnect.addListener(port => capture.connect(port));
  browser.tabs.onUpdated.addListener((id, change) => {
    if (change.status === 'loading' || change.url !== undefined) capture.navigation(id);
    if (change.status === 'loading' || change.url !== undefined || change.discarded === true) void controller.invalidate(id);
  });
  browser.tabs.onRemoved.addListener(id => { void controller.invalidate(id); });
  browser.tabs.onReplaced.addListener((_added, removed) => { void controller.invalidate(removed); });
  browser.tabs.onActivated.addListener(() => { void controller.invalidate(); });
  browser.tabs.onDetached.addListener(id => { void controller.invalidate(id); });
  browser.windows.onFocusChanged.addListener(id => { void controller.focusChanged(id); });
  browser.permissions.onRemoved.addListener(() => { void controller.invalidate(); });
  browser.runtime.onStartup.addListener(() => { void controller.invalidate(); });
  void controller.wake();
});
