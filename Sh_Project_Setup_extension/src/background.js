import { createSandboxPreparationController, isPreparationIdle } from "./background/sandbox-preparation-controller.mjs";
import { createReviewedSandboxExecution, NATIVE_REF_READ_CANDIDATE } from "./background/reviewed-sandbox-execution.mjs";
import { createReviewedAttemptLedger } from "./background/reviewed-attempt-ledger.mjs";
import { createSandboxOperationGate } from "./background/sandbox-operation-gate.mjs";

import { createMainRefCheck, createMainRefReadService } from "./background/reviewed-main-ref-check.mjs";

const refService = createMainRefReadService(chrome);
const mainRefCheck = createMainRefCheck(chrome, refService);
const ledger = createReviewedAttemptLedger(globalThis.indexedDB);
const operationGate = createSandboxOperationGate({
  ordinaryIdle: async sender => isPreparationIdle(await sandboxPreparation.handle({type:"SANDBOX_PREPARATION_STATUS"}, sender)),
  hasReviewedCheckpoint: ledger.hasCheckpoint,
});
const sandboxPreparation = createSandboxPreparationController(chrome, undefined, {operationGate});
// The reviewed native ref service is now wired, but the installed route still
// has no trusted authorization provider. It must fail closed before any read,
// reservation, permission check, navigation or injection. A future reviewed
// activation must supply authority. The shared gate serializes ordinary
// preparation and reviewed execution. Messages cannot provide either service or choose timing profiles.
const reviewedExecution = createReviewedSandboxExecution({
  api: chrome,
  ledger,
  operationGate,
  readRefs: refService.readRefs,
  refReadProfile: NATIVE_REF_READ_CANDIDATE,
});
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "REVIEWED_MAIN_REF_CHECK") {
    void mainRefCheck(message, sender).then(sendResponse, () =>
      sendResponse({ok:false, reason:"READ_UNAVAILABLE"}));
    return true;
  }
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
