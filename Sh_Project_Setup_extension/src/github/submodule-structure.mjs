import { validateUtilities } from '../popup/validation.mjs';

/**
 * Canonical JSON fixture: {gitmodulesText: string|null, tree: [{path, mode, oid}]|null}.
 * Omitted text/tree or entry mode/oid is unknown; null text explicitly means absent.
 * 32768 envelope characters, 8192 text characters, 256 lines of 512 characters,
 * 16 sections, 128 tree entries, 200 characters per path/name/URL. Pristine intrinsics.
 * Tree paths are root-relative, expanded across directories, never inside Gitlinks.
 * No output verifies real Git objects, access, installation or permission to act.
 */
export function validateFixtureSubmoduleStructure(text) {
  const reasons = new Set();
  let blocked = false;
  const counts = { sections: 0, treeEntries: 0, gitlinks: 0, matched: 0 };
  const issue = (reason, invalid = true) => { reasons.add(reason); blocked ||= invalid; };
  const finish = () => {
    const outcome = blocked ? 'BLOCKED' : reasons.size ? 'MANUAL_REVIEW' :
      counts.sections || counts.gitlinks ? 'MANUAL_REVIEW' : 'NO_ACTION';
    const structureState = blocked ? 'invalid' : reasons.size ? 'review_required' :
      outcome === 'NO_ACTION' ? 'empty' : 'matched';
    if (!reasons.size) reasons.add(outcome === 'NO_ACTION' ? 'empty_structure' : 'synthetic_match_unverified');
    return Object.freeze({
      evidenceTier: 'SIMULATED', fixtureOnly: true, outcome, structureState,
      reasons: Object.freeze([...reasons].sort()), counts: Object.freeze(counts),
      accountVerified: false, permissionsVerified: false, approvalGranted: false,
      executionAuthorized: false, repositoryMutationAuthorized: false, effectsEnabled: false,
      moduleInstalled: false, trustedContinuingContext: false,
      realTreeVerified: false, commitReachabilityVerified: false, nextStep: 'manual',
    });
  };
  let input;
  try {
    if (typeof text !== 'string' || text.length > 32768) throw new Error();
    input = JSON.parse(text);
    if (!input || Array.isArray(input) || typeof input !== 'object' || JSON.stringify(input) !== text ||
        Object.keys(input).some(key => !['gitmodulesText', 'tree'].includes(key))) throw new Error();
  } catch {
    issue('invalid_input'); return finish();
  }

  const modules = [];
  let parsed = true;
  const content = input.gitmodulesText;
  if (content === undefined) {
    issue('missing_gitmodules_text', false); parsed = false;
  } else if (content !== null) {
    if (typeof content !== 'string' || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]|\r(?!\n)/.test(content)) {
      issue('invalid_gitmodules_text'); parsed = false;
    } else if (content.length > 8192) {
      issue('input_limit'); parsed = false;
    } else {
      const lines = content.split('\n');
      if (lines.length > 256 || lines.some(line => line.length > 512)) {
        issue('input_limit'); parsed = false;
      } else if (/[^\x09\x0a\x0d\x20-\x7e]/.test(content)) {
        issue('unsupported_syntax', false); parsed = false;
      } else {
        let current;
        const names = new Set();
        for (const raw of lines) {
          const line = raw.trim();
          if (!line || /^[#;]/.test(line)) continue;
          if (line.startsWith('[')) {
            const match = /^\[submodule "([a-z\d_./-]{1,200})"\]$/i.exec(line);
            if (!match) {
              if (!line.includes(']') || /^\[submodule\]$/i.test(line)) issue('malformed_section');
              else issue('unsupported_syntax', false);
              parsed = false; break;
            }
            if (modules.length === 16) { issue('input_limit'); parsed = false; break; }
            if (names.has(match[1])) issue('duplicate_section');
            names.add(match[1]);
            current = {}; modules.push(current);
            continue;
          }
          if (!current) { issue('key_outside_section'); parsed = false; break; }
          const match = /^(path|url)[\t ]*=[\t ]*(.*)$/i.exec(line);
          // shortcut: only literal single-token values, expand syntax only with reviewed Git-config fixtures.
          if (!match || /[\s"\\#;]/.test(match[2])) {
            issue('unsupported_syntax', false); parsed = false; break;
          }
          const key = match[1].toLowerCase();
          if (Object.hasOwn(current, key)) issue('duplicate_key');
          else current[key] = match[2];
        }
      }
    }
  }
  counts.sections = modules.length;
  const paths = [];
  if (parsed) {
    for (const module of modules) {
      if (!Object.hasOwn(module, 'path')) issue('missing_path');
      else if (module.path.length > 200 || validateUtilities([{ url: '', path: module.path }])[0].path) issue('invalid_path');
      else paths.push(module.path);
      if (!Object.hasOwn(module, 'url')) issue('missing_url');
      else if (!module.url || module.url.length > 200) issue('invalid_url');
      else if (/^\.\.?\//.test(module.url)) issue('relative_url', false);
      else if (validateUtilities([{ url: module.url, path: 'safe' }])[0].url) issue('unsupported_url', false);
    }
    for (let i = 0; i < paths.length; i++) for (let j = i + 1; j < paths.length; j++) {
      if (paths[i] === paths[j]) issue('duplicate_path');
      else if (overlap(paths[i], paths[j])) issue('path_overlap');
      else if (paths[i].toLowerCase() === paths[j].toLowerCase() || overlap(paths[i].toLowerCase(), paths[j].toLowerCase())) issue('case_ambiguity', false);
    }
  }

  const tree = input.tree;
  if (tree === undefined || tree === null) {
    issue('missing_tree_metadata', false); return finish();
  }
  if (!Array.isArray(tree)) { issue('invalid_tree_metadata'); return finish(); }
  if (tree.length > 128) { issue('input_limit'); return finish(); }
  counts.treeEntries = tree.length;
  const entries = [];
  const formats = new Set();
  for (const row of tree) {
    if (!row || typeof row !== 'object' || Array.isArray(row) ||
        Object.keys(row).some(key => !['path', 'mode', 'oid'].includes(key)) || !treePath(row.path)) {
      issue('invalid_tree_entry'); continue;
    }
    let valid = true;
    if (!Object.hasOwn(row, 'mode')) { issue('missing_tree_metadata', false); valid = false; }
    else if (!['100644', '100755', '120000', '040000', '160000'].includes(row.mode)) {
      issue('invalid_tree_mode'); valid = false;
    }
    if (!Object.hasOwn(row, 'oid')) { issue('missing_tree_metadata', false); valid = false; }
    else if (typeof row.oid !== 'string' || !/^(?:[a-f\d]{40}|[a-f\d]{64})$/i.test(row.oid)) {
      issue('invalid_object_id'); valid = false;
    } else formats.add(row.oid.length);
    if (row.mode === '160000') counts.gitlinks++;
    if (row.path.startsWith('.gitmodules/')) issue('gitmodules_type_conflict');
    if (row.path.split('/')[0] !== '.gitmodules' && row.path.split('/')[0].toLowerCase() === '.gitmodules') {
      issue('case_ambiguity', false);
    }
    if (row.path === '.gitmodules') {
      if (row.mode === '120000') issue('gitmodules_symlink');
      else if (Object.hasOwn(row, 'mode') && !['100644', '100755'].includes(row.mode)) issue('gitmodules_type_conflict');
    }
    entries.push({ ...row, valid });
  }
  if (formats.size > 1) issue('mixed_object_formats', false);
  for (let i = 0; i < entries.length; i++) for (let j = i + 1; j < entries.length; j++) {
    const a = entries[i], b = entries[j];
    if (a.path === b.path) issue('duplicate_tree_entry');
    else if ((b.path.startsWith(a.path + '/') && a.mode !== undefined && a.mode !== '040000') ||
             (a.path.startsWith(b.path + '/') && b.mode !== undefined && b.mode !== '040000')) issue('tree_path_conflict');
    else if (a.path.toLowerCase() === b.path.toLowerCase() ||
      (overlap(a.path.toLowerCase(), b.path.toLowerCase()) && !overlap(a.path, b.path))) issue('case_ambiguity', false);
  }
  if (content !== undefined && (content === null) === entries.some(row => row.path === '.gitmodules')) {
    issue('gitmodules_presence_conflict');
  }
  // Incomplete configuration cannot establish declarations, absence or orphan status.
  if (parsed) {
    for (const path of paths) {
      const matches = entries.filter(row => row.path === path);
      if (!matches.length) issue('missing_gitlink');
      else if (matches.some(row => row.mode !== undefined && row.mode !== '160000')) issue('path_type_conflict');
      else if (matches.length === 1 && matches[0].valid) counts.matched++;
      for (const row of entries) {
        if (row.path.startsWith(path + '/') ||
            (path.startsWith(row.path + '/') && row.mode !== undefined && row.mode !== '040000')) issue('path_type_conflict');
        if (row.path !== path && row.path.toLowerCase() === path.toLowerCase()) issue('case_ambiguity', false);
      }
    }
    for (const row of entries) if (row.mode === '160000' && !paths.includes(row.path)) issue('orphan_gitlink');
  }
  return finish();
}

function overlap(a, b) {
  return a.startsWith(b + '/') || b.startsWith(a + '/');
}

function treePath(path) {
  return typeof path === 'string' && path.length > 0 && path.length <= 200 &&
    path.split('/').every(part => /^[a-z\d_.-]+$/i.test(part) &&
      !['.', '..', '.git'].includes(part.toLowerCase()) && !part.endsWith('.'));
}
