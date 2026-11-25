import { createSandboxPreparationController } from "./background/sandbox-preparation-controller.mjs";
import { createReviewedSandboxExecution } from "./background/reviewed-sandbox-execution.mjs";
import { createReviewedAttemptLedger } from "./background/reviewed-attempt-ledger.mjs";

const sandboxPreparation = createSandboxPreparationController(chrome);
// The installed route deliberately supplies no authority or authenticated ref
// reader. The coordinator fails closed before any reservation, permission check,
// navigation or injection. A future reviewed activation must supply both and
// enforce mutual exclusion with ordinary preparation; messages cannot supply them.
const reviewedExecution = createReviewedSandboxExecution({
  api: chrome,
  ledger: createReviewedAttemptLedger(globalThis.indexedDB),
});
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "REVIEWED_SANDBOX_CREATE") {
    void reviewedExecution.run(message, sender).then(sendResponse, () =>
      sendResponse({ state: "BLOCKED", reason: "RUNTIME_UNAVAILABLE", reserved: false,
        dispatched: false, clickConfirmed: false, postcondition: "NOT_CHECKED" }));
    return true;
  }
  void sandboxPreparation.handle(message, sender).then(sendResponse, () =>
    sendResponse({ ok: false, reason: "SESSION_UNAVAILABLE" }));
  return true;
});
chrome.runtime.onInstalled.addListener(() => {});
