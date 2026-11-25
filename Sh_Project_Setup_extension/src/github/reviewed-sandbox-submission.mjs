/** Native button contract for the exact reviewed disposable sandbox.
 * NOT connected to runtime messaging or the installed worker. This is a DOM
 * adapter, not an authority, source-SHA verifier or durable attempt ledger.
 * A future trusted caller must enforce those gates and bind the injection to
 * the previously verified document. Inspect is non-mutating; dispatch is not.
 * Keep self-contained for Chrome executeScript serialization.
 */
export function reviewedSandboxBranchButton(repository, sourceBranch, newBranch, deadlineEpoch, mode = 'inspect') {
  try {
    const normalized = node => node.textContent.trim().replace(/\s+/g, ' ');
    const pageMatches = () => {
      const now = Date.now();
      return window.top === window && location.origin === 'https://github.com' &&
        repository === 'https-Ali-Muhammed/plementus-mvp-sandbox' && sourceBranch === 'main' &&
        newBranch === 'plementus-mvp-test01' && location.pathname === `/${repository}/branches` &&
        !location.search && !location.hash && Number.isSafeInteger(deadlineEpoch) &&
        deadlineEpoch > now && deadlineEpoch - now <= 15000 && ['inspect', 'dispatch'].includes(mode);
    };
    if (!pageMatches()) return 'NOT_READY';
    const visible = node => node?.isConnected && node.getClientRects().length > 0 &&
      getComputedStyle(node).visibility === 'visible' && getComputedStyle(node).display !== 'none' &&
      !node.closest('[hidden], [aria-hidden="true"]');
    const dialogs = [...document.querySelectorAll('dialog[open], [role="dialog"][aria-modal="true"]')].filter(visible);
    if (dialogs.length !== 1) return 'NOT_READY';
    const dialog = dialogs[0];
    const eligible = node => node && dialog.contains(node) && visible(node) && !node.matches(':disabled') &&
      !node.readOnly && !node.closest('[inert], [aria-disabled="true"], [aria-busy="true"]');
    const headings = [...dialog.querySelectorAll('h1,h2,h3,[role="heading"]')].filter(visible)
      .filter(node => ['New branch', 'Create a branch'].includes(normalized(node)));
    if (headings.length !== 1 || normalized(headings[0]) !== 'Create a branch') return 'NOT_READY';
    const labels = text => [...dialog.querySelectorAll('label')].filter(node => visible(node) && normalized(node) === text);
    const names = labels('New branch name');
    const input = names.length === 1 ? names[0].control : null;
    if (!eligible(input) || input.tagName !== 'INPUT' || input.type !== 'text' || input.value !== newBranch) return 'NOT_READY';
    const pickers = [...dialog.querySelectorAll('button[id^="ref-picker-"]')].filter(visible);
    const source = pickers.length === 1 ? pickers[0] : null;
    if (labels('Source').length !== 1 || !eligible(source) || source.type !== 'button' ||
        source.getAttribute('aria-haspopup') !== 'true' || normalized(source) !== sourceBranch ||
        source.getAttribute('aria-label')?.trim().replace(/\s+/g, ' ') !== `${sourceBranch} branch`) return 'NOT_READY';
    const buttons = [...dialog.querySelectorAll('button')].filter(visible)
      .filter(node => normalized(node) === 'Create new branch' || node.getAttribute('aria-label') === 'Create new branch');
    if (buttons.length !== 1) return 'NOT_READY';
    const button = buttons[0];
    const buttonMatches = () => eligible(button) && normalized(button) === 'Create new branch' &&
      button.type === 'button' && button.getAttribute('type') === 'button' && !button.form && !button.closest('form') &&
      !['aria-label', 'aria-haspopup', 'form', 'formaction', 'formmethod', 'formtarget', 'formenctype', 'formnovalidate']
        .some(attr => button.hasAttribute(attr));
    if (!pageMatches() || !buttonMatches() || !eligible(input) || input.value !== newBranch || !eligible(source)) return 'NOT_READY';
    if (mode === 'inspect') return 'READY';
    // Synchronous native click only. The caller must already have committed a
    // one-use attempt claim; this return value is not proof of a provider write.
    button.click();
    return 'CLICK_DISPATCHED';
  } catch { return 'UNKNOWN'; }
}
