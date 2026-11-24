import { validateGithub } from './validation.mjs';

const PROVENANCE = 'previous-read-only-github-page-observation';
const MAX_AGE_MS = 60_000;
const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function normalizeCandidate(value) {
  if (typeof value !== 'string') return null;
  const candidate = value.trim();
  const parts = candidate.split('/');
  if (parts.length !== 2 || parts.some(part => part !== part.trim()) ||
      Object.values(validateGithub({ organization: parts[0], repository: parts[1], mode: 'existing' })).some(Boolean)) return null;
  return candidate;
}

export function handoffKey(id) {
  return typeof id === 'string' && ID_PATTERN.test(id) ? `github-observation-handoff:${id}` : null;
}

export function createHandoff(candidate, id, createdAt) {
  const normalized = normalizeCandidate(candidate);
  return normalized && handoffKey(id) && Number.isSafeInteger(createdAt) && createdAt > 0
    ? { id, candidate: normalized, provenance: PROVENANCE, createdAt } : null;
}

export function validateHandoff(value, id, now = Date.now()) {
  if (!handoffKey(id) || !value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).sort().join(',') !== 'candidate,createdAt,id,provenance' ||
      value.id !== id || value.provenance !== PROVENANCE ||
      !normalizeCandidate(value.candidate) || normalizeCandidate(value.candidate) !== value.candidate ||
      !Number.isSafeInteger(value.createdAt) || value.createdAt <= 0 ||
      !Number.isSafeInteger(now) || value.createdAt > now || now - value.createdAt > MAX_AGE_MS) return null;
  return value;
}

export function repositoryParts(record) {
  const [organization, repository] = record.candidate.split('/');
  return { organization, repository, mode: 'existing' };
}

export async function consumeHandoff(storage, id, now) {
  const key = handoffKey(id);
  if (!key) return null;
  try {
    const stored = await storage.get(key);
    // shortcut: session storage remove is not atomic, upgrade only if concurrent readers must be excluded.
    await storage.remove(key);
    const record = validateHandoff(stored?.[key], id, now === undefined ? Date.now() : now);
    return record ? repositoryParts(record) : null;
  } catch {
    return null;
  }
}
