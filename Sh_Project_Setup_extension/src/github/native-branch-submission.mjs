/** Controlled fixture only. Not imported by the installed extension runtime.
 * Keep self-contained: Chrome serializes functions passed to executeScript.
 * The synthetic repository and fixture marker deliberately prevent use on live GitHub.
 * The final button's type/form contract has not been verified on the live provider.
 */
export function submitFixturePreparedBranch(repository, sourceBranch, newBranch, deadlineEpoch) {
  try {
    const normalized = node => node.textContent.trim().replace(/\s+/g, ' ');
    const pageMatches = () => window.top === window && location.origin === 'https://github.com' &&
      repository === 'fixture-owner/disposable-repo' && sourceBranch === 'main' &&
      newBranch === 'plementus-mvp-check' && location.pathname === `/${repository}/branches` &&
      !location.search && !location.hash &&
      document.documentElement.getAttribute('data-plementus-test-fixture') === 'branch-submission-v1' &&
      Number.isSafeInteger(deadlineEpoch) && Date.now() < deadlineEpoch;
    if (!pageMatches()) return 'NOT_READY';
    const visible = node => node.isConnected && node.getClientRects().length > 0 &&
      getComputedStyle(node).visibility === 'visible' && getComputedStyle(node).display !== 'none' &&
      !node.closest('[hidden], [aria-hidden="true"]');
    const dialogs = [...document.querySelectorAll('dialog[open], [role="dialog"][aria-modal="true"]')].filter(visible);
    if (dialogs.length !== 1) return 'NOT_READY';
    const dialog = dialogs[0];
    const eligible = node => node && dialog.contains(node) && visible(node) && !node.matches(':disabled') &&
      !node.readOnly && !node.closest('[inert], [aria-disabled="true"], [aria-busy="true"]');
    const headings = [...dialog.querySelectorAll('h1,h2,h3,[role="heading"]')].filter(visible)
      .filter(node => ['New branch', 'Create a branch'].includes(normalized(node)));
    if (headings.length !== 1) return 'NOT_READY';
    const labels = text => [...dialog.querySelectorAll('label')].filter(node => visible(node) && normalized(node) === text);
    const controls = text => labels(text).map(node => node.control).filter(Boolean);
    const names = controls('New branch name');
    if (names.length !== 1 || !eligible(names[0]) || names[0].tagName !== 'INPUT' ||
        names[0].type !== 'text' || names[0].value !== newBranch) return 'NOT_READY';
    let source;
    if (normalized(headings[0]) === 'New branch') {
      const sources = controls('Source branch');
      if (sources.length !== 1 || !eligible(sources[0]) || !['INPUT','SELECT'].includes(sources[0].tagName) ||
          sources[0].value !== sourceBranch) return 'NOT_READY';
      source = sources[0];
    } else {
      const pickers = [...dialog.querySelectorAll('button[id^="ref-picker-"]')].filter(visible);
      if (labels('Source').length !== 1 || pickers.length !== 1 || !eligible(pickers[0]) ||
          pickers[0].type !== 'button' || pickers[0].getAttribute('aria-haspopup') !== 'true' ||
          normalized(pickers[0]) !== sourceBranch ||
          pickers[0].getAttribute('aria-label')?.trim().replace(/\s+/g, ' ') !== `${sourceBranch} branch`) return 'NOT_READY';
      source = pickers[0];
    }
    if (source === names[0]) return 'NOT_READY';
    // Ambiguous visible controls are rejected even if one is disabled.
    const candidates = [...dialog.querySelectorAll('button')].filter(visible)
      .filter(node => normalized(node) === 'Create new branch' || node.getAttribute('aria-label') === 'Create new branch');
    if (candidates.length !== 1) return 'NOT_READY';
    const button = candidates[0];
    if (!eligible(button) || normalized(button) !== 'Create new branch' ||
        (button.hasAttribute('aria-label') && button.getAttribute('aria-label') !== 'Create new branch') ||
        !['button','submit'].includes(button.getAttribute('type')) ||
        ['form','formaction','formmethod','formtarget','formenctype','formnovalidate','aria-haspopup']
          .some(attr => button.hasAttribute(attr))) return 'NOT_READY';
    // Only a same-dialog, explicitly POST fixture form, never an arbitrary associated form.
    if (button.form && (!dialog.contains(button.form) || names[0].form !== button.form || source.form !== button.form ||
        button.form.method !== 'post' || button.form.action !== location.href ||
        !['','_self'].includes(button.form.target))) return 'NOT_READY';
    if (button.type === 'submit' && !button.form) return 'NOT_READY';
    if (!pageMatches() || !eligible(button) || !eligible(names[0]) || !eligible(source)) return 'NOT_READY';
    // No await between the final DOM checks and the only possible click.
    button.click();
    return 'CLICK_DISPATCHED'; // Not proof of a ref, success, or even a provider request.
  } catch { return 'UNKNOWN'; }
}
