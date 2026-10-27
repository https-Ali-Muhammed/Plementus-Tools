import { describe, it, expect, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createSessionController, type Platform } from './controller';
import { LIMITS, checkBounds, parseControl, trustedUI, type Header, type Reply, type View } from './model';
import { identifyTab, type SelectedTab } from '../../entrypoints/popup/consent';

const url = 'chrome-extension://abcdefghijklmnop/popup.html';
const sender = { id: 'abcdefghijklmnop', url, origin: 'chrome-extension://abcdefghijklmnop' };
const original: SelectedTab = { id: 1, windowId: 2, active: true, incognito: false, status: 'complete', url: 'http://localhost:8069/web?token=DO_NOT_STORE#secret' };
function fixture() {
  let rows: unknown[] = [];
  let saved: unknown;
  let now = 100_000;
  const selected = vi.fn<() => Promise<SelectedTab | undefined>>().mockResolvedValue(original);
  const update = vi.fn(async (change: (rows: unknown[]) => Header[]) => {
    const next = change(structuredClone(rows)); checkBounds(next); rows = structuredClone(next); return structuredClone(next);
  });
  const platform: Platform = { extensionId: sender.id, popupUrl: url, selected,
    readBinding: async () => saved, writeBinding: vi.fn(async value => { saved = structuredClone(value); }),
    restrictStorage: vi.fn(async () => {}), badge: vi.fn(async () => {}), now: () => now, id: randomUUID };
  let worker = createSessionController({ update }, platform);
  const handle = (input: unknown, from = sender) => worker.handle(input, from);
  async function inspect() { const result = await handle({ op: 'inspect', requestId: randomUUID() }); expect(result.ok).toBe(true); return (result as { ok: true; view: View }).view; }
  async function auth(op: 'start' | 'resume' = 'start', patch = {}) {
    const view = await inspect();
    const row = view.cases[0];
    return handle({ op, requestId: randomUUID(), challenge: view.challenge,
      ...(op === 'resume' ? { id: row?.id, epoch: row?.epoch } : {}),
      declaration: { origin: view.target?.origin, environment: 'local', authorized: true, ...patch } });
  }
  const control = (op: 'pause' | 'stop' | 'delete', row: Header) => handle({ op, requestId: randomUUID(), id: row.id, epoch: row.epoch });
  return { selected, update, platform, handle, inspect, auth, control,
    rows: () => rows as Header[], saved: () => saved,
    setRows: (value: unknown[]) => { rows = value; }, time: (value: number) => { now = value; },
    restart: () => { worker = createSessionController({ update }, platform); },
    invalidate: () => worker.invalidate(), clearBinding: () => { saved = undefined; } };
}
function view(reply: Reply) { expect(reply.ok).toBe(true); return (reply as { ok: true; view: View }).view; }

describe('worker lifecycle with synthetic browser/storage ports', () => {
  it('requires worker review and explicit consent, then valid Start/Pause/Resume/Stop/Delete', async () => {
    const f = fixture();
    expect((await f.handle({ op: 'start', requestId: randomUUID(), challenge: randomUUID(), declaration: { origin: 'http://localhost:8069', environment: 'local', authorized: true } })).ok).toBe(false);
    expect((await f.inspect()).state).toBe('permission_pending');
    const first = view(await f.auth()).cases[0]!;
    expect(first.state).toBe('recording');
    const paused = view(await f.control('pause', first)).cases[0]!;
    expect(paused.state).toBe('paused'); expect(paused.epoch).not.toBe(first.epoch);
    const resumed = view(await f.auth('resume')).cases[0]!;
    expect(resumed.state).toBe('recording'); expect(resumed.id).toBe(first.id);
    const stopped = view(await f.control('stop', resumed)).cases[0]!;
    expect(stopped.state).toBe('stopped'); expect(f.saved()).toBeUndefined();
    expect(view(await f.control('delete', stopped)).cases).toEqual([]);
  });
  it.each([{ authorized: false }, { environment: 'production' }, { environment: 'unknown' }, { origin: 'http://localhost:8070' }, { environment: 'test' }])('denies invalid Start authorization %j', async patch => {
    const f = fixture(); expect((await f.auth('start', patch)).ok).toBe(false); expect(f.rows()).toEqual([]);
  });
  it.each(['test', 'staging'])('accepts explicit remote HTTPS %s only', async environment => {
    const f = fixture(); f.selected.mockResolvedValue({ ...original, url: 'https://staging.example:8443/private?token=NO' });
    expect((await f.auth('start', { environment })).ok).toBe(true);
  });
  it.each(['http://localhost:8069', 'http://127.0.0.1:1234', 'http://[::1]:8070'])('keeps loopback regression %s', async url => {
    const f = fixture(); f.selected.mockResolvedValue({ ...original, url }); expect((await f.auth()).ok).toBe(true);
  });
  it.each([{ id: 9 }, { windowId: 9 }, { url: 'http://localhost:8070' }, { url: undefined }, { incognito: true }, { pendingUrl: 'http://localhost:8069/next' }])('revalidates selected identity/access %j', async patch => {
    const f = fixture(); const review = await f.inspect(); f.selected.mockResolvedValue({ ...original, ...patch });
    expect((await f.handle({ op: 'start', requestId: randomUUID(), challenge: review.challenge, declaration: { origin: 'http://localhost:8069', environment: 'local', authorized: true } })).ok).toBe(false);
    expect(f.rows()).toEqual([]);
  });
  it('rejects a second open session globally', async () => {
    const f = fixture(); await f.auth(); expect((await f.auth()).ok).toBe(false); expect(f.rows()).toHaveLength(1);
  });
  it('requires fresh consent on Resume, and cannot resume stopped cases', async () => {
    const f = fixture(); const first = view(await f.auth()).cases[0]!; await f.control('pause', first);
    expect((await f.auth('resume', { authorized: false })).ok).toBe(false); expect(f.rows()[0]!.state).toBe('paused');
    const stopped = view(await f.control('stop', f.rows()[0]!)).cases[0]!;
    expect((await f.control('pause', stopped)).ok).toBe(false); expect((await f.auth('resume')).ok).toBe(false);
  });
  it('recovers recording and paused epochs conservatively; lost extension binding cannot Resume', async () => {
    const f = fixture(); const first = view(await f.auth()).cases[0]!; f.restart();
    const recovered = (await f.inspect()).cases[0]!;
    expect(recovered.state).toBe('paused'); expect(recovered.epoch).not.toBe(first.epoch);
    expect((await f.control('stop', first)).ok).toBe(false);
    f.restart(); f.clearBinding(); expect((await f.auth('resume')).ok).toBe(false);
    expect((await f.control('delete', f.rows()[0]!)).ok).toBe(true);
  });
  it('rotates the paused epoch after failed authorization', async () => {
    const f = fixture(); const first = view(await f.auth()).cases[0]!;
    const paused = view(await f.control('pause', first)).cases[0]!;
    expect((await f.auth('resume', { authorized: false })).ok).toBe(false);
    expect(f.rows()[0]!.epoch).not.toBe(paused.epoch);
    expect((await f.control('delete', paused)).ok).toBe(false);
  });
  it('restart between ephemeral binding and case commit cannot create a case', async () => {
    const f = fixture(); await f.inspect();
    const write = f.platform.writeBinding;
    f.platform.writeBinding = async binding => { await write(binding); if (binding) throw new Error('Synthetic worker interruption'); };
    expect((await f.auth()).ok).toBe(false); expect(f.rows()).toEqual([]);
    f.platform.writeBinding = write; f.restart();
    expect((await f.inspect()).cases).toEqual([]); expect(f.saved()).toBeUndefined();
  });
  it('committed deletion survives restart even if temporary-binding cleanup failed', async () => {
    const f = fixture(); const first = view(await f.auth()).cases[0]!;
    const write = f.platform.writeBinding;
    f.platform.writeBinding = async binding => { if (!binding) throw new Error('Synthetic session-storage failure'); await write(binding); };
    expect((await f.control('delete', first)).ok).toBe(false); expect(f.rows()).toEqual([]);
    f.platform.writeBinding = write; f.restart();
    expect((await f.inspect()).cases).toEqual([]); expect(f.saved()).toBeUndefined();
    expect((await f.control('stop', first)).ok).toBe(false);
  });
  it('rechecks browser access after awaiting temporary storage, before recording commit', async () => {
    const f = fixture(); await f.inspect();
    const write = f.platform.writeBinding;
    f.platform.writeBinding = async binding => { await write(binding); f.selected.mockResolvedValue({ ...original, url: undefined }); };
    expect((await f.auth()).ok).toBe(false); expect(f.rows()).toEqual([]);
  });
  it('rejects Resume when the lifetime expires during temporary storage', async () => {
    const f = fixture(); const first = view(await f.auth()).cases[0]!;
    await f.control('pause', first);
    const write = f.platform.writeBinding;
    f.platform.writeBinding = async binding => { await write(binding); if (binding) f.time(first.createdAt + LIMITS.duration); };
    expect((await f.auth('resume')).ok).toBe(false); expect(f.rows()[0]!.state).toBe('stopped');
  });
  it('invalidates navigation/revocation before a delayed Start lookup finishes', async () => {
    const f = fixture(); const review = await f.inspect();
    let finish!: (tab: SelectedTab) => void;
    f.selected.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const pending = f.handle({ op: 'start', requestId: randomUUID(), challenge: review.challenge, declaration: { origin: 'http://localhost:8069', environment: 'local', authorized: true } });
    await vi.waitFor(() => expect(f.selected).toHaveBeenCalledTimes(2));
    const invalidation = f.invalidate(); finish(original); expect((await pending).ok).toBe(false); await invalidation;
    expect(f.rows()).toEqual([]);
  });
  it.each(['pause', 'stop', 'delete'] as const)('a concurrent %s cancels delayed Resume; replay never resurrects', async op => {
    const f = fixture(); const first = view(await f.auth()).cases[0]!;
    const paused = view(await f.control('pause', first)).cases[0]!;
    const review = await f.inspect();
    let finish!: (tab: SelectedTab) => void;
    f.selected.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const pending = f.handle({ op: 'resume', requestId: randomUUID(), id: paused.id, epoch: paused.epoch, challenge: review.challenge,
      declaration: { origin: 'http://localhost:8069', environment: 'local', authorized: true } });
    await vi.waitFor(() => expect(f.selected.mock.results.at(-1)?.value).toBeInstanceOf(Promise));
    // Flush queue admission to the blocked selected() call.
    await new Promise(resolve => setTimeout(resolve, 0));
    const later = f.control(op, paused); finish(original); expect((await pending).ok).toBe(false); await later;
    expect(f.rows().some(row => row.state === 'recording')).toBe(false);
    expect((await f.control('stop', first)).ok).toBe(false);
  });
  it('consumes review once and creates unique case IDs/epochs', async () => {
    const f = fixture(); const ids = new Set<string>();
    for (let i = 0; i < 5; i++) {
      const first = view(await f.auth()).cases.find(row => row.state === 'recording')!;
      expect(ids.has(first.id)).toBe(false); ids.add(first.id); expect(first.epoch).not.toBe(first.id);
      const stopped = view(await f.control('stop', first)).cases.find(row => row.id === first.id)!;
      expect((await f.control('stop', first)).ok).toBe(false); await f.control('delete', stopped);
    }
  });
  it('never redirects a selected case operation to another tab or case', async () => {
    const f = fixture(); const first = view(await f.auth()).cases[0]!; f.selected.mockResolvedValue({ ...original, id: 99 });
    expect((await f.auth('resume')).ok).toBe(false);
    expect((await f.handle({ op: 'delete', requestId: randomUUID(), id: randomUUID(), epoch: first.epoch })).ok).toBe(false);
    expect(f.rows()).toHaveLength(1); expect((await f.control('delete', f.rows()[0]!)).ok).toBe(true);
  });
  it('expires duration before writes, TTL on access and worker wake; clock rollback fails closed', async () => {
    const f = fixture(); const first = view(await f.auth()).cases[0]!;
    f.time(first.createdAt + LIMITS.duration); expect((await f.inspect()).cases[0]!.state).toBe('stopped');
    f.time(first.createdAt + LIMITS.ttl); f.restart(); expect((await f.inspect()).cases).toEqual([]);
    f.time(first.createdAt); await f.auth(); f.time(first.createdAt - 1); expect((await f.inspect()).cases).toEqual([]);
  });
  it('enforces 10 cases before write, rejects extra keys and purges invalid records', async () => {
    const f = fixture();
    for (let i = 0; i < LIMITS.cases; i++) { const row = view(await f.auth()).cases.find(row => row.state === 'recording')!; await f.control('stop', row); }
    expect((await f.auth()).ok).toBe(false); expect(f.rows()).toHaveLength(10);
    f.setRows([{ ...f.rows()[0], rawUrl: 'DO_NOT_STORE' }]); f.restart(); expect((await f.inspect()).cases).toEqual([]);
  });
  it.each(['read', 'write', 'restrict', 'transaction'] as const)('fails closed on %s failure without logging raw errors', async fault => {
    const f = fixture();
    if (fault === 'read') f.platform.readBinding = async () => { throw new Error('DO_NOT_EXPOSE'); };
    if (fault === 'restrict') f.platform.restrictStorage = async () => { throw new Error('DO_NOT_EXPOSE'); };
    if (fault === 'transaction') f.update.mockRejectedValue(new Error('DO_NOT_EXPOSE'));
    if (fault === 'write') f.platform.writeBinding = async () => { throw new Error('DO_NOT_EXPOSE'); };
    const reply = await f.handle({ op: 'inspect', requestId: randomUUID() });
    expect(reply.ok).toBe(false); expect(JSON.stringify(reply)).not.toContain('DO_NOT_EXPOSE');
    expect((await f.handle({ op: 'inspect', requestId: randomUUID() })).ok).toBe(false);
  });
  it('persists only exact headers, and ephemeral normalized binding without consent or URL data', async () => {
    const f = fixture(); await f.auth();
    expect(Object.keys(f.rows()[0]!).sort()).toEqual(['schema', 'id', 'epoch', 'state', 'createdAt', 'updatedAt'].sort());
    expect(f.saved()).toEqual({ id: f.rows()[0]!.id, target: identifyTab(original) });
    expect(JSON.stringify([f.rows(), f.saved()])).not.toMatch(/token|DO_NOT_STORE|secret|authorized|environment|\/web|cookie|body/i);
  });
});

describe('privileged message boundary and schema', () => {
  it.each([{ id: 'foreign' }, { url: 'https://localhost' }, { url: `${url}?spoof` }, { tab: { id: 1 } }, { frameId: 2 }, { origin: 'https://evil.example' }])('rejects untrusted sender %j', patch => {
    expect(trustedUI({ ...sender, ...patch }, sender.id, url)).toBe(false);
  });
  it.each([null, {}, { op: 'inspect', requestId: 'bad' }, { op: 'capture', requestId: randomUUID() },
    { op: 'inspect', requestId: randomUUID(), tabId: 1 }, { op: 'inspect', requestId: randomUUID(), authorized: true },
    { op: 'start', requestId: randomUUID(), challenge: randomUUID(), declaration: { origin: 'x', authorized: 'true', environment: 'local' } }])('rejects malformed/extra/capture fields %j', input => {
    expect(parseControl(input)).toBeUndefined();
  });
  it('does not initialize storage for a content/page sender', async () => {
    const f = fixture(); await f.handle({ op: 'inspect', requestId: randomUUID() }, { ...sender, tab: { id: 1 } } as typeof sender);
    expect(f.update).not.toHaveBeenCalled();
  });
  it('rejects schema/count/byte abuse before writes; future event/byte values are proposals only', () => {
    expect(LIMITS.events).toBe(5000); expect(LIMITS.caseBytes).toBe(5 * 1024 * 1024); expect(LIMITS.totalBytes).toBe(20 * 1024 * 1024);
    const header: Header = { schema: 1, id: randomUUID(), epoch: randomUUID(), state: 'stopped', createdAt: 1, updatedAt: 1 };
    expect(() => checkBounds(Array.from({ length: 11 }, () => ({ ...header, id: randomUUID() })))).toThrow();
    expect(() => checkBounds([{ ...header, id: 'x'.repeat(LIMITS.caseBytes + 1) }])).toThrow();
    expect(() => checkBounds([{ ...header, createdAt: NaN }])).toThrow();
    expect(() => checkBounds([{ ...header, state: 'recording' }, { ...header, id: randomUUID(), state: 'paused' }])).toThrow();
  });
});
