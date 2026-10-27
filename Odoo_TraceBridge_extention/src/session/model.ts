import type { Declaration, Target } from '../../entrypoints/popup/consent';

export type Lifecycle = 'idle' | 'permission_pending' | 'recording' | 'paused' | 'stopped' | 'error';
export interface Header {
  schema: 1;
  id: string;
  epoch: string;
  state: 'recording' | 'paused' | 'stopped' | 'error';
  createdAt: number;
  updatedAt: number;
}
// Conservative Phase 04 header-only proposals; sensitive evidence policy remains unapproved.
export const LIMITS = { duration: 30 * 60_000, ttl: 24 * 60 * 60_000, cases: 10,
  events: 5000, caseBytes: 5 * 1024 * 1024, totalBytes: 20 * 1024 * 1024 } as const;
export const uuid = (value: unknown): value is string => typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);
export function exact(value: unknown, keys: string[]): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}
export function validHeader(value: unknown): value is Header {
  if (!exact(value, ['schema', 'id', 'epoch', 'state', 'createdAt', 'updatedAt'])) return false;
  return value.schema === 1 && uuid(value.id) && uuid(value.epoch) &&
    ['recording', 'paused', 'stopped', 'error'].includes(value.state as string) &&
    Number.isSafeInteger(value.createdAt) && (value.createdAt as number) >= 0 &&
    Number.isSafeInteger(value.updatedAt) && (value.updatedAt as number) >= (value.createdAt as number);
}
export function checkBounds(rows: Header[]) {
  const bytes = rows.map(row => new TextEncoder().encode(JSON.stringify(row)).byteLength);
  if (rows.length > LIMITS.cases || rows.some(row => !validHeader(row)) ||
      new Set(rows.map(row => row.id)).size !== rows.length ||
      rows.filter(row => ['recording', 'paused'].includes(row.state)).length > 1 ||
      bytes.some(size => size > LIMITS.caseBytes) || bytes.reduce((a, b) => a + b, 0) > LIMITS.totalBytes) {
    throw new Error('Storage bounds or schema rejected.');
  }
}
export type Control = { op: 'inspect'; requestId: string } |
  { op: 'start'; requestId: string; challenge: string; declaration: Declaration } |
  { op: 'resume'; requestId: string; id: string; epoch: string; challenge: string; declaration: Declaration } |
  { op: 'pause' | 'stop' | 'delete'; requestId: string; id: string; epoch: string };
export function parseControl(value: unknown): Control | undefined {
  if (!value || typeof value !== 'object') return;
  const op = (value as Record<string, unknown>).op;
  const auth = op === 'start' || op === 'resume';
  const keys = ['op', 'requestId', ...(op === 'inspect' || op === 'start' ? [] : ['id', 'epoch']),
    ...(auth ? ['challenge', 'declaration'] : [])];
  if (!exact(value, keys) || !['inspect', 'start', 'resume', 'pause', 'stop', 'delete'].includes(op as string) ||
      !uuid(value.requestId) || ('id' in value && (!uuid(value.id) || !uuid(value.epoch)))) return;
  if (auth && (!uuid(value.challenge) || !exact(value.declaration, ['origin', 'environment', 'authorized']) ||
      typeof value.declaration.origin !== 'string' || value.declaration.origin.length > 2048 ||
      typeof value.declaration.environment !== 'string' || value.declaration.environment.length > 16 ||
      typeof value.declaration.authorized !== 'boolean')) return;
  return value as Control;
}
export interface View { state: Lifecycle; cases: Header[]; target?: Target; challenge?: string; boundIds: string[]; evidence?: Record<string, import('../capture/controller').Summary> }
export type Reply = { ok: true; view: View } | { ok: false; error: string };
export interface Sender { id?: string; url?: string; tab?: unknown; frameId?: number; origin?: string }
export function trustedUI(sender: Sender, extensionId: string, popupUrl: string) {
  return sender.id === extensionId && sender.url === popupUrl && (sender.tab === undefined || typeof sender.tab === 'object' && sender.tab !== null &&
      (sender.tab as { url?: string }).url === popupUrl) &&
    (sender.frameId === undefined || sender.frameId === 0) &&
    (sender.origin === undefined || sender.origin === popupUrl.slice(0, -'/popup.html'.length));
}
