import { createSandboxPreparationController } from "./background/sandbox-preparation-controller.mjs";

const sandboxPreparation = createSandboxPreparationController(chrome);
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  void sandboxPreparation.handle(message, sender).then(sendResponse, () =>
    sendResponse({ ok: false, reason: "SESSION_UNAVAILABLE" }));
  return true;
});
chrome.runtime.onInstalled.addListener(() => {});
