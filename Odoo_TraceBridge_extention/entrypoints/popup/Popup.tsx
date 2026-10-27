import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { declarationAllows } from './consent';
import type { Control, Reply, View } from '../../src/session/model';
import { RECORDING_STATUS } from './status';
import './style.css';

export function Popup() {
  const [view, setView] = useState<View>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [caseId, setCaseId] = useState('');
  const [origin, setOrigin] = useState('');
  const [environment, setEnvironment] = useState('unknown');
  const [authorized, setAuthorized] = useState(false);
  function clearConsent() { setOrigin(''); setEnvironment('unknown'); setAuthorized(false); }
  async function send(control: Control) {
    setBusy(true); setError(''); clearConsent();
    try {
      const reply = await browser.runtime.sendMessage(control) as Reply;
      if (!reply?.ok) { setView(undefined); setError(reply?.error ?? 'Worker unavailable. No signals collected.'); }
      else { setView(reply.view); setCaseId(previous => reply.view.cases.some(row => row.id === previous) ? previous : reply.view.cases.find(row => ['recording', 'paused'].includes(row.state))?.id ?? reply.view.cases[0]?.id ?? ''); }
    } catch { setView(undefined); setError('Worker unavailable. No signals collected. Refresh to retry.'); }
    finally { setBusy(false); }
  }
  const inspect = () => send({ op: 'inspect', requestId: crypto.randomUUID() });
  useEffect(() => {
    const changed = () => { void inspect(); };
    browser.tabs.onActivated.addListener(changed);
    browser.tabs.onUpdated.addListener(changed);
    browser.tabs.onRemoved.addListener(changed);
    browser.windows.onFocusChanged.addListener(changed);
    browser.permissions.onRemoved.addListener(changed);
    void inspect();
    return () => {
      browser.tabs.onActivated.removeListener(changed);
      browser.tabs.onUpdated.removeListener(changed);
      browser.tabs.onRemoved.removeListener(changed);
      browser.windows.onFocusChanged.removeListener(changed);
      browser.permissions.onRemoved.removeListener(changed);
    };
    // The worker owns authority; this effect only refreshes the displayed snapshot.
  }, []);
  const row = view?.cases.find(row => row.id === caseId);
  const active = view?.cases.find(row => ['recording', 'paused'].includes(row.state));
  const resume = row?.state === 'paused';
  const canReview = !!view?.target && !!view.challenge && !busy && (!active || resume && view.boundIds.includes(caseId));
  const valid = canReview && declarationAllows(view!.target!, { origin, environment, authorized });
  function control(op: 'pause' | 'stop' | 'delete') {
    if (row) void send({ op, requestId: crypto.randomUUID(), id: row.id, epoch: row.epoch });
  }
  function revoke() {
    clearConsent();
    setView(current => current ? { ...current, challenge: undefined } : current);
    if (active?.state === 'recording') void send({ op: 'pause', requestId: crypto.randomUUID(), id: active.id, epoch: active.epoch });
  }
  return <main>
    <header><small>PHASE 04 · SESSION LIFECYCLE</small><h1>Odoo TraceBridge</h1><p>{RECORDING_STATUS}</p></header>
    <section aria-labelledby="target"><h2 id="target">Selected scope</h2>
      {view?.target ? <p>Tab {view.target.tabId} · Window {view.target.windowId}<br /><strong>{view.target.origin}</strong></p> : <p>No eligible tab bound.</p>}
      <p role="status">Browser access: {view?.target ? 'available' : 'unavailable'}. Session: {view?.state ?? (error ? 'error' : 'checking')}. {error}</p>
    </section>
    <p>Recording is a lifecycle state only. No user-action, navigation, RPC, client-error, network or diagnostic signals are collected until later approved phases. Only generated case IDs, timestamps, state and revision are retained.</p>
    <p>Browser activeTab access is separate from consent. Start and Resume require a fresh exact-origin declaration and site/data-owner confirmation. Local Development permits only localhost, 127.0.0.1 and IPv6 loopback at the displayed port. Remote HTTPS requires Test/Staging. Production and Unknown are blocked. Environment and authority are user stated; this does not prove Odoo identity or authorize customer use.</p>
    <form onSubmit={event => {
      event.preventDefault();
      if (!valid || !view?.challenge) return;
      const auth = { requestId: crypto.randomUUID(), challenge: view.challenge, declaration: { origin, environment, authorized } };
      void send(resume ? { op: 'resume', ...auth, id: row!.id, epoch: row!.epoch } : { op: 'start', ...auth });
    }}>
      <fieldset disabled={!canReview}><legend>Fresh recording consent</legend>
        <label>Authorized exact origin (scheme + host + port, no path)
          <input value={origin} onChange={event => setOrigin(event.target.value)} autoComplete="off" spellCheck={false} maxLength={2048} required />
        </label>
        <label>Environment<select value={environment} onChange={event => setEnvironment(event.target.value)}>
          <option value="unknown">Unknown / unclassified — blocked</option><option value="production">Production — blocked</option>
          <option value="local">Local Development</option><option value="test">Disposable test</option><option value="staging">Staging</option>
        </select></label>
        <label className="confirmation"><input type="checkbox" checked={authorized} onChange={event => setAuthorized(event.target.checked)} />
          I am authorized by the site/data owner to investigate this exact non-production Odoo origin, and understand these limits.
        </label>
        <button type="submit" disabled={!valid}>{resume ? 'Resume' : 'Start'}</button>
      </fieldset>
    </form>
    <label>Retained case<select value={caseId} disabled={busy || !view?.cases.length} onChange={event => { setCaseId(event.target.value); clearConsent(); }}>
      <option value="">Select a case</option>{view?.cases.map(item => <option key={item.id} value={item.id}>{item.id} · {item.state}</option>)}
    </select></label>
    {row && <p>Selected case: {row.id}<br />Case state: {row.state}. Created: {new Date(row.createdAt).toLocaleString()}. No diagnostic events.</p>}
    <div className="actions">
      <button disabled={busy || row?.state !== 'recording'} onClick={() => control('pause')}>Pause</button>
      <button disabled={busy || !row || !['recording', 'paused'].includes(row.state)} onClick={() => control('stop')}>Stop</button>
      <button disabled={busy || !row} onClick={() => control('delete')}>Delete selected case</button>
      <button disabled={busy} onClick={revoke}>Deny consent</button><button disabled={busy} onClick={revoke}>Revoke consent</button>
      <button disabled={busy} onClick={() => { void inspect(); }}>Refresh scope / status</button>
    </div>
    <p className="limit">Pause invalidates authorization; refresh before explicit Resume. Restart recovers paused. Navigation, reload, tab/window changes and access loss pause conservatively. One open session; Stop/Delete it before Start. Proposed limits: 30 minutes from creation, 10 headers, 24-hour TTL; cleanup on access/wake, never an exact deadline while closed. Sensitive evidence storage policy is unresolved. No encryption claim. Delete removes the selected local header and binding; physical disk/backups are outside this guarantee. Revoke does not remove Chrome activeTab.</p>
  </main>;
}
