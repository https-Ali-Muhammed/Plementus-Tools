import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { createConsentGate, declarationAllows, type ConsentState } from './consent';
import { RECORDING_STATUS } from './status';
import './style.css';

export function Popup() {
  const [state, setState] = useState<ConsentState>({ access: 'checking', consent: 'required', reason: 'Checking selected tab.' });
  const [origin, setOrigin] = useState('');
  const [environment, setEnvironment] = useState('unknown');
  const [authorized, setAuthorized] = useState(false);
  const [gate] = useState(() => createConsentGate(async () => {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    return tabs.length === 1 ? tabs[0] : undefined;
  }, setState));

  useEffect(() => {
    const changed = () => gate.invalidate('tab-changed');
    const revoked = () => gate.invalidate('revoked');
    const updated = (id: number) => { if (id === gate.getState().target?.tabId) changed(); };
    browser.tabs.onActivated.addListener(changed);
    browser.tabs.onUpdated.addListener(updated);
    browser.tabs.onRemoved.addListener(updated);
    browser.tabs.onReplaced.addListener(changed);
    browser.windows.onFocusChanged.addListener(changed);
    browser.permissions.onRemoved.addListener(revoked);
    void gate.inspect();
    return () => {
      gate.invalidate('revoked');
      browser.tabs.onActivated.removeListener(changed);
      browser.tabs.onUpdated.removeListener(updated);
      browser.tabs.onRemoved.removeListener(updated);
      browser.tabs.onReplaced.removeListener(changed);
      browser.windows.onFocusChanged.removeListener(changed);
      browser.permissions.onRemoved.removeListener(revoked);
    };
  }, [gate]);

  const canReview = state.access === 'available' && state.consent === 'required';
  return <main>
    <header><small>PHASE 03 · PERMISSIONS & CONSENT</small><h1>Odoo TraceBridge</h1><p>{RECORDING_STATUS}</p></header>
    <section aria-labelledby="target"><h2 id="target">Selected scope</h2>
      {state.target ? <p>Tab {state.target.tabId} · Window {state.target.windowId}<br /><strong>{state.target.origin}</strong></p> : <p>No eligible tab bound.</p>}
      <p role="status">Browser access: {state.access}. Consent: {state.consent}. {state.reason}</p>
    </section>
    <p>Opening the toolbar popup grants temporary browser access through activeTab; it never starts an investigation. No persistent site grant is requested. Browser access may outlast this popup; consent does not.</p>
    <p>Future recording would include minimal action/navigation categories, safe error categories and eligible request outcome metadata. It excludes typed input, passwords, cookies, tokens, headers, request/response bodies, DOM text and business record values. No collection, storage or transmission exists now.</p>
    <p>Environment is user stated. URL names cannot reliably identify production or Odoo. Production, unknown, unauthorized and unrelated sites must be rejected. Only confirm an authorized local development or HTTPS test/staging Odoo site. Local Development allows localhost, 127.0.0.1 and IPv6 loopback at the exact displayed port; other HTTP sites are blocked. No customer use is authorized by this screen.</p>
    <form onSubmit={event => { event.preventDefault(); void gate.approve({ origin, environment, authorized }); }}>
      <fieldset disabled={!canReview}><legend>Separate recording consent</legend>
        <label>Authorized exact origin (scheme + host + port, no path)
          <input value={origin} onChange={event => setOrigin(event.target.value)} autoComplete="off" spellCheck={false} maxLength={2048} required />
        </label>
        <label>Environment
          <select value={environment} onChange={event => setEnvironment(event.target.value)}>
            <option value="unknown">Unknown / unclassified — blocked</option><option value="production">Production — blocked</option>
            <option value="local">Local Development</option>
            <option value="test">Disposable test</option><option value="staging">Staging</option>
          </select>
        </label>
        <label className="confirmation"><input type="checkbox" checked={authorized} onChange={event => setAuthorized(event.target.checked)} />
          I am authorized by the site/data owner to investigate this exact non-production Odoo origin, and understand the categories, exclusions and limitations above.
        </label>
        <button type="submit" disabled={!state.target || !declarationAllows(state.target, { origin, environment, authorized })}>Approve consent only</button>
      </fieldset>
    </form>
    <div className="actions"><button onClick={() => gate.invalidate('denied')}>Deny consent</button><button onClick={() => gate.invalidate('revoked')}>Revoke consent</button><button disabled>Start unavailable — Phase 04</button></div>
    <p className="limit">Revoke clears this popup decision; it does not remove activeTab from Chrome. Close/navigate the tab to end temporary site access, or disable the extension. Reopening requires fresh confirmation. Later capture may miss signals; absent evidence never proves success.</p>
  </main>;
}
