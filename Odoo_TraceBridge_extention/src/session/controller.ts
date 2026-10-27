import { declarationAllows, identifyTab, type SelectedTab, type Target } from '../../entrypoints/popup/consent';
import { exact, LIMITS, parseControl, trustedUI, uuid, validHeader, type Header, type Reply, type Sender, type View } from './model';
import type { HeaderStore } from './store';

interface Binding { id: string; target: Target }
export interface Platform {
  extensionId: string;
  popupUrl: string;
  selected(): Promise<SelectedTab | undefined>;
  readBinding(): Promise<unknown>;
  writeBinding(binding?: Binding): Promise<void>;
  restrictStorage(): Promise<void>;
  badge(state: View['state']): Promise<void>;
  now(): number;
  id(): string;
}
class Rejected extends Error {}
const same = (a?: Target, b?: Target) => !!a && !!b && a.tabId === b.tabId && a.windowId === b.windowId && a.origin === b.origin;

export function createSessionController(store: HeaderStore, platform: Platform) {
  let queue = Promise.resolve();
  let initialized = false;
  let failed = false;
  let generation = 0;
  let binding: Binding | undefined;
  let review: { challenge: string; target: Target; generation: number } | undefined;

  function clean(rows: unknown[]): Header[] {
    const now = platform.now();
    return rows.filter(validHeader).filter(row => row.createdAt <= now && row.updatedAt <= now && now - row.createdAt < LIMITS.ttl)
      .map(row => ['recording', 'paused'].includes(row.state) && now - row.createdAt >= LIMITS.duration ?
        { ...row, state: 'stopped', epoch: platform.id(), updatedAt: now } : row);
  }
  async function update(change: (rows: Header[]) => Header[] = rows => rows) {
    const rows = await store.update(raw => change(clean(raw)));
    if (binding && !rows.some(row => row.id === binding!.id && ['paused', 'recording'].includes(row.state))) {
      binding = undefined;
      await platform.writeBinding();
    }
    return rows;
  }
  async function initialize() {
    if (failed) throw new Error('Unavailable');
    if (initialized) return;
    await platform.restrictStorage();
    const saved = await platform.readBinding();
    if (exact(saved, ['id', 'target']) && uuid(saved.id) && exact(saved.target, ['tabId', 'windowId', 'origin'])) {
      const target = saved.target;
      const verified = identifyTab({ id: target.tabId as number, windowId: target.windowId as number,
        url: target.origin as string, active: true, status: 'complete', incognito: false });
      if (verified && same(verified, target as unknown as Target)) binding = { id: saved.id, target: verified };
    }
    const rows = await update(rows => rows.map(row => ['recording', 'paused'].includes(row.state) ?
      { ...row, state: 'paused', epoch: platform.id(), updatedAt: platform.now() } : row));
    if (!binding) await platform.writeBinding();
    await platform.badge(rows.some(row => row.state === 'paused') ? 'paused' : 'idle');
    initialized = true;
  }
  function serialize(action: () => Promise<Reply>): Promise<Reply> {
    const result = queue.then(async () => {
      try { await initialize(); return await action(); }
      catch (error) {
        review = undefined;
        if (error instanceof Rejected) return { ok: false as const, error: 'Control rejected. Refresh and confirm the selected case and authorization again.' };
        failed = true;
        generation++;
        await platform.badge('error').catch(() => {});
        return { ok: false as const, error: 'Storage or initialization unavailable. Lifecycle is disabled; no signals are collected. Reopen after resolving browser storage.' };
      }
    });
    queue = result.then(() => {});
    return result;
  }
  async function view(rows: Header[], inspect = false): Promise<Reply> {
    const target = identifyTab(await platform.selected());
    if (inspect) review = target ? { challenge: platform.id(), target, generation } : undefined;
    const active = rows.find(row => ['recording', 'paused'].includes(row.state));
    const state = active?.state ?? (target && review ? 'permission_pending' : 'idle');
    await platform.badge(active?.state ?? 'idle');
    return { ok: true, view: { state, cases: rows, target, challenge: review?.challenge,
      boundIds: binding && same(binding.target, target) ? [binding.id] : [] } };
  }
  async function pause(rotatePaused = false) {
    return update(rows => rows.map(row => row.state === 'recording' || rotatePaused && row.state === 'paused' ?
      { ...row, state: 'paused', epoch: platform.id(), updatedAt: platform.now() } : row));
  }
  return {
    // Invalidate synchronously, before any pending browser/storage work can complete.
    invalidate(tabId?: number) {
      if (tabId !== undefined && binding && binding.target.tabId !== tabId && review?.target.tabId !== tabId) return Promise.resolve<Reply>({ ok: true, view: { state: 'idle', cases: [], boundIds: [] } });
      generation++;
      review = undefined;
      return serialize(async () => view(await pause(true)));
    },
    wake() { return serialize(async () => view(await update())); },
    handle(input: unknown, sender: Sender): Promise<Reply> {
      if (!trustedUI(sender, platform.extensionId, platform.popupUrl)) return Promise.resolve({ ok: false, error: 'Untrusted control sender.' });
      const request = parseControl(input);
      if (!request) return Promise.resolve({ ok: false, error: 'Invalid control message.' });
      if (['pause', 'stop', 'delete'].includes(request.op)) { generation++; review = undefined; }
      const admitted = generation;
      return serialize(async () => {
        let rows = await update();
        if (request.op === 'inspect') return view(rows, true);
        const row = 'id' in request ? rows.find(row => row.id === request.id && row.epoch === request.epoch) : undefined;
        if ('id' in request && !row) throw new Rejected();
        if (request.op === 'start' || request.op === 'resume') {
          const consent = review;
          review = undefined;
          const guard = () => admitted === generation && consent?.generation === generation;
          const live = identifyTab(await platform.selected());
          if (!consent || consent.challenge !== request.challenge || !guard() || !same(live, consent.target) ||
              !declarationAllows(consent.target, request.declaration) ||
              (request.op === 'start' ? rows.some(row => ['recording', 'paused'].includes(row.state)) || rows.length >= LIMITS.cases :
                row?.state !== 'paused' || binding?.id !== row.id || !same(binding.target, live))) {
            await pause(guard());
            throw new Rejected();
          }
          const id = row?.id ?? platform.id();
          binding = { id, target: consent.target };
          await platform.writeBinding(binding);
          const checked = identifyTab(await platform.selected());
          if (!guard() || !same(checked, consent.target)) { await pause(guard()); throw new Rejected(); }
          rows = await update(rows => {
            if (!guard()) return rows;
            const now = platform.now();
            if (request.op === 'resume' && !rows.some(item => item.id === row!.id && item.epoch === row!.epoch && item.state === 'paused')) return rows;
            return [...rows.filter(item => item.id !== id), { schema: 1, id, epoch: platform.id(),
              state: 'recording', createdAt: row?.createdAt ?? now, updatedAt: now }];
          });
          if (!guard() || !rows.some(item => item.id === id && item.state === 'recording')) { await pause(); throw new Rejected(); }
        } else {
          if (request.op === 'pause' && row!.state !== 'recording' ||
              request.op === 'stop' && !['recording', 'paused'].includes(row!.state)) throw new Rejected();
          rows = await update(rows => rows.flatMap(item => item.id !== row!.id ? [item] : request.op === 'delete' ? [] :
            [{ ...item, state: request.op === 'pause' ? 'paused' : 'stopped', epoch: platform.id(), updatedAt: platform.now() }]));
        }
        return view(rows);
      });
    },
  };
}
