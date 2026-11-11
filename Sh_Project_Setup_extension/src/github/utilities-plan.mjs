import { validateUtilities } from '../popup/validation.mjs';

/**
 * Offline syntax plan from canonical printable-ASCII JSON: [{url, path}].
 * At most 8192 input bytes, 16 entries and 200 characters per field.
 * Output contains indexes/codes only, never input identifiers or paths.
 * Native intrinsics are assumed pristine. No result authorizes execution.
 */
function result(selectionState, entries = [], conflicts = []) {
  return Object.freeze({
    evidenceTier: 'SIMULATED', fixtureOnly: true,
    accountVerified: false, permissionsVerified: false, executionAuthorized: false,
    approvalGranted: false, trustedContinuingContext: false, effectsEnabled: false,
    repositoryMutationAuthorized: false, moduleInstalled: false,
    nextStep: 'manual', selectionState,
    outcome: selectionState === 'empty_optional' ? 'NO_ACTION' :
      selectionState.startsWith('invalid_') ? 'BLOCKED' : 'MANUAL_REVIEW',
    reviewRequired: Object.freeze(['repository_identity', 'permissions', 'revision', 'paths']),
    repositoryFacts: Object.freeze({
      existence: 'unknown', visibility: 'unknown', ownership: 'unknown', access: 'unknown',
      revision: 'unknown', branchAvailability: 'unknown',
    }),
    commitSha: null, gitlinks: null, gitmodules: null,
    entries: Object.freeze(entries.map(entry => Object.freeze({
      ...entry, reasons: Object.freeze(entry.reasons),
    }))),
    conflicts: Object.freeze(conflicts.map(conflict => Object.freeze({
      indexes: Object.freeze(conflict.indexes), reasons: Object.freeze(conflict.reasons),
    }))),
  });
}

function boundedText(value) {
  return typeof value === 'string' && value.length <= 200 && value === value.trim();
}

export function planFixtureUtilities(text) {
  if (typeof text !== 'string' || text.length > 8192 || !/^[\x20-\x7e]*$/.test(text)) {
    return result('invalid_input');
  }
  let input;
  try {
    input = JSON.parse(text);
    if (!Array.isArray(input) || input.length > 16 || JSON.stringify(input) !== text) {
      return result('invalid_input');
    }
  } catch {
    return result('invalid_input');
  }
  if (input.length === 0) return result('empty_optional');

  const identities = [];
  const paths = [];
  const entries = input.map((entry, index) => {
    const reasons = [];
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry) ||
        Object.keys(entry).length !== 2 || !Object.hasOwn(entry, 'url') || !Object.hasOwn(entry, 'path')) {
      return { index, state: 'invalid', reasons: ['invalid_entry'] };
    }
    const url = boundedText(entry.url) ? entry.url : '';
    const path = boundedText(entry.path) ? entry.path : '';
    // Reuse accepted validation only on bounded inert strings; never mutate popup rules.
    const errors = validateUtilities([{ url, path }])[0];
    if (errors.url) reasons.push('invalid_url');
    else identities[index] = url.toLowerCase()
      .replace(/^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)/, '')
      .replace(/([^/]+)\.git$/, '$1');
    if (errors.path) reasons.push('invalid_path');
    else paths[index] = path.toLowerCase();
    return { index, state: reasons.length ? 'invalid' : 'valid', reasons };
  });

  const conflicts = [];
  for (let left = 0; left < entries.length; left++) {
    for (let right = left + 1; right < entries.length; right++) {
      const reasons = [];
      if (identities[left] && identities[left] === identities[right]) reasons.push('duplicate_repository');
      if (paths[left] && paths[right]) {
        if (paths[left] === paths[right]) reasons.push('path_collision');
        else if (paths[left].startsWith(`${paths[right]}/`) || paths[right].startsWith(`${paths[left]}/`)) {
          reasons.push('path_overlap');
        }
      }
      if (reasons.length) {
        conflicts.push({ indexes: [left, right], reasons });
        for (const index of [left, right]) {
          if (entries[index].state === 'valid') entries[index].state = 'conflict';
          for (const reason of reasons) {
            if (!entries[index].reasons.includes(reason)) entries[index].reasons.push(reason);
          }
        }
      }
    }
  }
  const selectionState = entries.some(entry => entry.state === 'invalid') ? 'invalid_entries' :
    conflicts.length ? 'conflicts' : 'valid';
  return result(selectionState, entries, conflicts);
}
