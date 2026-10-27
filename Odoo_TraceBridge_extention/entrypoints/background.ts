import { browser } from 'wxt/browser';
import { createSessionController } from '../src/session/controller';
import { createHeaderStore } from '../src/session/store';

export default defineBackground(() => {
  const controller = createSessionController(createHeaderStore(), {
    extensionId: browser.runtime.id,
    popupUrl: browser.runtime.getURL('/popup.html'),
    async selected() {
      const tabs = await browser.tabs.query({ active: true, lastFocusedWindow: true });
      if (tabs.length !== 1) return;
      return tabs[0];
    },
    async restrictStorage() { await browser.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' }); },
    async readBinding() { return (await browser.storage.session.get('binding')).binding; },
    async writeBinding(binding) {
      if (binding) await browser.storage.session.set({ binding });
      else await browser.storage.session.remove('binding');
    },
    async badge(state) {
      await browser.action.setBadgeText({ text: state === 'recording' ? 'ON' : state === 'paused' ? 'II' : state === 'error' ? 'ERR' : '' });
      await browser.action.setTitle({ title: `TraceBridge: ${state}. No diagnostic signals collected (Phase 04).` });
    },
    now: Date.now,
    id: () => crypto.randomUUID(),
  });
  browser.runtime.onMessage.addListener((message, sender) => controller.handle(message, sender));
  browser.tabs.onUpdated.addListener((id, change) => {
    if (change.status === 'loading' || change.url !== undefined || change.discarded === true) void controller.invalidate(id);
  });
  browser.tabs.onRemoved.addListener(id => { void controller.invalidate(id); });
  browser.tabs.onReplaced.addListener((_added, removed) => { void controller.invalidate(removed); });
  browser.tabs.onActivated.addListener(() => { void controller.invalidate(); });
  browser.tabs.onDetached.addListener(id => { void controller.invalidate(id); });
  browser.windows.onFocusChanged.addListener(() => { void controller.invalidate(); });
  browser.permissions.onRemoved.addListener(() => { void controller.invalidate(); });
  browser.runtime.onStartup.addListener(() => { void controller.invalidate(); });
  void controller.wake();
});
