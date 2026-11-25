import { verifyPreparedNativeBranchForm } from '../popup/workspace-branch-preparation.mjs';
import { submitFixturePreparedBranch } from '../github/native-branch-submission.mjs';

// Explicit fixture boundary. This is not an approval and cannot activate real GitHub.
export const FIXTURE_SCOPE = Object.freeze({ evidenceTier: 'CONTROLLED_FIXTURE',
  repository: 'fixture-owner/disposable-repo', sourceBranch: 'main', newBranch: 'plementus-mvp-check',
  effect: 'CREATE_BRANCH', maxAttempts: 1 });
const origin = { origins: ['https://github.com/*'] };
const shaPattern = /^[0-9a-f]{40}$/;
const exact = (value, keys) => value && Object.getPrototypeOf(value) === Object.prototype &&
  Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const approvalKeys = [...Object.keys(FIXTURE_SCOPE), 'operationId', 'approvalReference', 'sourceSha', 'expiresAt'];
const idPattern = /^fixture-operation-[a-z0-9-]{1,48}$/;
const refPattern = /^fixture-approval-[a-z0-9-]{1,48}$/;
function validApproval(value, time) {
  return exact(value, approvalKeys) && Object.entries(FIXTURE_SCOPE).every(([k,v]) => value[k] === v) &&
    typeof value.operationId === 'string' && idPattern.test(value.operationId) &&
    typeof value.approvalReference === 'string' && refPattern.test(value.approvalReference) &&
    typeof value.sourceSha === 'string' && shaPattern.test(value.sourceSha) && Number.isSafeInteger(time) &&
    Number.isSafeInteger(value.expiresAt) && value.expiresAt > time && value.expiresAt - time <= 300000;
}
function validTarget(value, operation) {
  return exact(value, ['operationId','tabId','documentId','state']) && value.operationId === operation.operationId &&
    Number.isInteger(value.tabId) && value.tabId >= 0 && typeof value.documentId === 'string' &&
    /^[a-zA-Z0-9-]{1,128}$/.test(value.documentId) && value.state === 'FORM_PREPARED';
}
function snapshotMatches(value, operation, after, time) {
  if (!exact(value, ['repository','complete','observedAt','heads']) || value.repository !== operation.repository ||
      value.complete !== true || !Number.isSafeInteger(value.observedAt) || value.observedAt > time ||
      time - value.observedAt > 2000 || !Array.isArray(value.heads) || value.heads.length !== (after ? 2 : 1)) return false;
  const expected = new Set([`refs/heads/${operation.sourceBranch}`]);
  if (after) expected.add(`refs/heads/${operation.newBranch}`);
  return value.heads.every(head => exact(head,['ref','sha']) && head.sha === operation.sourceSha && expected.delete(head.ref)) &&
    expected.size === 0;
}
const timeout = Symbol('timeout');

/** Offline candidate for the future controller submission boundary.
 * readRefs must be a separate complete fixture snapshot reader, not DOM success text.
 * authorize and claimAttempt are injected fixture services. No actual authority or durable
 * cross-restart claim mechanism is supplied here. Production integration remains gated.
 */
export function createFixtureBranchSubmission({ api, readRefs, authorize, claimAttempt, fresh,
  now = Date.now, timeoutMs = 15000 } = {}) {
  let used = false;
  return Object.freeze({ async run(approval, preparedTarget) {
    let submissionDispatched = false, clickConfirmed = false, postcondition = 'NOT_CHECKED', claimStatus = 'NOT_CLAIMED';
    let operation, target;
    const report = (state, reason) => Object.freeze({ state, reason, evidenceTier: 'CONTROLLED_FIXTURE',
      liveExecutionAuthorized: false, submissionDispatched, clickConfirmed, postcondition, claimStatus,
      ...(operation ? { operationId: operation.operationId, repository: operation.repository,
        sourceBranch: operation.sourceBranch, newBranch: operation.newBranch, expectedSourceSha: operation.sourceSha,
        observedDestinationSha: postcondition === 'MATCHED' ? operation.sourceSha : null } : {}) });
    if (used) return report('BLOCKED','ALREADY_ATTEMPTED');
    used = true;
    try {
      if (!validApproval(approval, now()) || !validTarget(preparedTarget, approval) ||
          ![readRefs,authorize,claimAttempt,fresh].every(fn=>typeof fn === 'function') ||
          !Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 15000) return report('BLOCKED','INVALID_SCOPE');
      operation = Object.freeze({ ...approval }); target = Object.freeze({ ...preparedTarget });
    } catch { return report('BLOCKED','INVALID_SCOPE'); }
    const deadline = performance.now() + timeoutMs;
    const remaining = () => deadline - performance.now();
    const current = () => remaining() > 0 && fresh() === true && validApproval(operation, now());
    async function bounded(call) {
      const ms = remaining();
      if (ms <= 0) return timeout;
      let timer;
      try {
        const value = await Promise.race([call(), new Promise(resolve => {timer=setTimeout(()=>resolve(timeout),ms)})]);
        return remaining() > 0 ? value : timeout;
      } finally { clearTimeout(timer); }
    }
    const destination = `https://github.com/${operation.repository}/branches`;
    const args = [operation.repository, operation.sourceBranch, operation.newBranch];
    const injectionTarget = () => ({ tabId: target.tabId, documentIds: [target.documentId] });
    const resultFor = values => Array.isArray(values) && values.length === 1 && values[0]?.frameId === 0 &&
      values[0].documentId === target.documentId ? values[0].result : undefined;
    async function authorized() {
      return current() && await bounded(()=>authorize(operation)) === true && current();
    }
    async function context() {
      if (!current()) return false;
      const tab = await bounded(()=>api.tabs.get(target.tabId));
      if (!current() || tab?.id !== target.tabId || !Number.isInteger(tab.windowId) || tab.windowId < 0 ||
          tab.incognito !== false || tab.status !== 'complete' || tab.pendingUrl != null || tab.url !== destination) return false;
      return await bounded(()=>api.permissions.contains(origin)) === true && current();
    }
    async function refsMatch(after) {
      const snapshot = await bounded(()=>readRefs(operation.repository));
      return snapshot !== timeout && snapshotMatches(snapshot, operation, after, now());
    }
    try {
      if (!await authorized()) return report('BLOCKED','AUTHORIZATION_UNAVAILABLE');
      if (!await refsMatch(false) || !current()) return report('BLOCKED','PREFLIGHT_REFS_MISMATCH');
      if (!await context()) return report('BLOCKED','CONTEXT_UNAVAILABLE');
      const inspected = await bounded(()=>api.scripting.executeScript({target:injectionTarget(),
        func:verifyPreparedNativeBranchForm,args}));
      if (resultFor(inspected) !== true || !current()) return report('BLOCKED','FORM_NOT_VERIFIED');
      // Claim before possible dispatch. A timed-out claim is not canceled or reusable.
      claimStatus = 'UNKNOWN';
      const claimed = await bounded(()=>claimAttempt(operation));
      if (claimed !== true) {
        if (claimed === false) claimStatus = 'REJECTED';
        return report('BLOCKED','CLAIM_UNAVAILABLE');
      }
      claimStatus = 'CLAIMED';
      if (!await refsMatch(false) || !await authorized() || !await context() || !current())
        return report('BLOCKED','POST_CLAIM_REVALIDATION_FAILED');
      const deadlineEpoch = Date.now() + Math.floor(Math.min(remaining(), operation.expiresAt - now()));
      // Browser dispatch occurs exactly once, and the page rechecks the full form synchronously.
      let submitted;
      try {
        submitted = await bounded(()=> {
          if (!current() || Date.now() >= deadlineEpoch) return undefined;
          submissionDispatched = true;
          return api.scripting.executeScript({target:injectionTarget(),func:submitFixturePreparedBranch,
            args:[...args,deadlineEpoch]});
        });
      } catch { /* Dispatched work may still have taken effect. Reconcile by independent read. */ }
      if (!submissionDispatched) return report('BLOCKED','DEADLINE_EXPIRED');
      clickConfirmed = resultFor(submitted) === 'CLICK_DISPATCHED';
      // No retry, even after a malformed response or a timeout. Independent read may show a
      // matching postcondition without proving attribution to this particular injection.
      try { postcondition = await refsMatch(true) ? 'MATCHED' : 'NOT_CONFIRMED'; }
      catch { postcondition = 'NOT_CONFIRMED'; }
      return clickConfirmed && postcondition === 'MATCHED'
        ? report('FIXTURE_VERIFIED','EXPECTED_REFS_CONFIRMED')
        : report('OUTCOME_UNKNOWN','RECONCILIATION_REQUIRED');
    } catch {
      return submissionDispatched ? report('OUTCOME_UNKNOWN','RECONCILIATION_REQUIRED') : report('BLOCKED','PRE_DISPATCH_FAILURE');
    }
  } });
}
