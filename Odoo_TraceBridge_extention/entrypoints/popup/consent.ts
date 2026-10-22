export interface SelectedTab {
  id?: number;
  windowId: number;
  active: boolean;
  incognito?: boolean;
  url?: string;
  pendingUrl?: string;
  status?: string;
}

export interface Target { tabId: number; windowId: number; origin: string }
export interface Declaration { origin: string; environment: string; authorized: boolean }
export type ConsentState = {
  access: 'checking' | 'available' | 'unavailable' | 'revoked';
  consent: 'required' | 'approved' | 'denied' | 'tab-changed' | 'revoked';
  target?: Target;
  reason: string;
};

function isLoopback(url: URL): boolean {
  return ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
}

function eligibleUrl(url: URL): boolean {
  const host = url.hostname;
  const [first, second] = host.split('.').map(Number);
  const privateAddress = (/^\d+\.\d+\.\d+\.\d+$/.test(host) && (first === 0 || first === 10 || first === 127 ||
    (first === 172 && second! >= 16 && second! <= 31) ||
    (first === 192 && second === 168) || (first === 169 && second === 254) ||
    (first === 100 && second! >= 64 && second! <= 127))) ||
    /^\[(f[cd]|fe[89ab]|::ffff:)/.test(host) || host === '[::]';
  const localName = !host.includes('.') && !host.startsWith('[') ||
    host.split('.').includes('localhost') || /\.(local|lan|internal|home\.arpa)$/.test(host);
  if (!isLoopback(url) && (privateAddress || localName)) return false;
  return !url.username && !url.password &&
    (url.protocol === 'https:' || (url.protocol === 'http:' && isLoopback(url))) &&
    !['chromewebstore.google.com', 'chrome.google.com', 'microsoftedge.microsoft.com'].includes(url.hostname);
}

export function identifyTab(tab?: SelectedTab): Target | undefined {
  if (!tab || !Number.isInteger(tab.id) || tab.id! < 0 || !Number.isInteger(tab.windowId) ||
      tab.windowId < 0 || !tab.active || tab.incognito !== false || !tab.url ||
      tab.pendingUrl || tab.status !== 'complete') return;
  try {
    const url = new URL(tab.url);
    if (!eligibleUrl(url)) return;
    return { tabId: tab.id!, windowId: tab.windowId, origin: url.origin };
  } catch { return; }
}

export function declarationAllows(target: Target, declaration: Declaration): boolean {
  try {
    const url = new URL(target.origin);
    return eligibleUrl(url) && target.origin === url.origin &&
      declaration.origin === url.origin && declaration.authorized === true &&
      (isLoopback(url) ? declaration.environment === 'local' :
        ['test', 'staging'].includes(declaration.environment));
  } catch { return false; }
}

// Popup-local decisions only. No session, capture authority or persisted consent exists in Phase 03.
export function createConsentGate(readTab: () => Promise<SelectedTab | undefined>,
  notify: (state: ConsentState) => void) {
  let revision = 0;
  let state: ConsentState = { access: 'checking', consent: 'required', reason: 'Checking selected tab.' };
  function publish(next: ConsentState) { state = next; notify(state); }
  function invalidate(consent: 'denied' | 'tab-changed' | 'revoked') {
    revision++;
    publish({ access: consent === 'revoked' ? 'revoked' : 'unavailable', consent,
      reason: consent === 'denied' ? 'Consent denied. Nothing is recorded.' :
        consent === 'revoked' ? 'Access or consent revoked. Reopen the toolbar popup to review again.' :
          'Tab, window or document changed. Reopen the toolbar popup and confirm again.' });
  }
  return {
    invalidate,
    async inspect() {
      const current = ++revision;
      try {
        const target = identifyTab(await readTab());
        if (current !== revision) return;
        publish(target ? { access: 'available', consent: 'required', target,
          reason: 'Selected-tab URL access is available. Recording consent is still required.' } :
          { access: 'unavailable', consent: 'required',
            reason: 'Selected tab unavailable: missing access, restricted/unsupported URL, incognito or loading page.' });
      } catch {
        if (current === revision) publish({ access: 'unavailable', consent: 'required', reason: 'Browser access check failed. Nothing is recorded.' });
      }
    },
    async approve(declaration: Declaration) {
      if (state.access !== 'available' || state.consent !== 'required' || !state.target) return;
      const target = state.target;
      if (!declarationAllows(target, declaration)) { invalidate('denied'); return; }
      const current = ++revision;
      try {
        const live = identifyTab(await readTab());
        if (current !== revision) return;
        if (!live) { invalidate('revoked'); return; }
        if (live.tabId !== target.tabId || live.windowId !== target.windowId || live.origin !== target.origin) {
          invalidate('tab-changed'); return;
        }
        publish({ access: 'available', consent: 'approved', target,
          reason: 'Consent approved for this tab/origin in this popup only. Nothing is recording; Start is unavailable until Phase 04.' });
      } catch { if (current === revision) invalidate('revoked'); }
    },
    getState: () => state,
  };
}
