const blockedRepositories = new Set(["microsoft/vscode", "https-ali-muhammed/plementus-tools"]);
const repositoryPattern = /^([a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?)\/([a-z0-9._-]{1,100})$/i;
const sourcePattern = /^[a-z0-9_](?:[a-z0-9._/-]{0,98}[a-z0-9_])?$/i;
const newBranchPattern = /^plementus-mvp-[a-z0-9](?:[a-z0-9-]{0,47}[a-z0-9])?$/;

export function validateSandboxBranchRequest({ repository, sourceBranch, newBranch, acknowledged } = {}) {
  const match = typeof repository === "string" && repositoryPattern.exec(repository);
  const validRepository = match && ![".", ".."].includes(match[2]) &&
    !match[2].toLowerCase().endsWith(".git") &&
    !blockedRepositories.has(repository.toLowerCase());
  const validSource = typeof sourceBranch === "string" && sourcePattern.test(sourceBranch) &&
    !sourceBranch.includes("..") && !sourceBranch.includes("//") &&
    sourceBranch.split("/").every(part => part && !part.startsWith(".") && !part.endsWith(".lock"));
  if (!validRepository || !validSource || typeof newBranch !== "string" ||
      newBranch.length > 64 || !newBranchPattern.test(newBranch) ||
      sourceBranch === newBranch || acknowledged !== true) return { state: "NOT_CONFIGURED" };
  return { state: "PREVIEW_READY", repository, sourceBranch, newBranch,
    destination: `https://github.com/${repository}/branches` };
}

export function matchesSandboxBranchesTab(tab, repository) {
  if (!tab || !Number.isInteger(tab.id) || tab.id < 0 ||
      !Number.isInteger(tab.windowId) || tab.windowId < 0 || tab.active !== true ||
      tab.incognito !== false || tab.status !== "complete" || tab.pendingUrl != null ||
      typeof tab.url !== "string") return false;
  const target = validateSandboxBranchRequest({ repository, sourceBranch: "main",
    newBranch: "plementus-mvp-check", acknowledged: true });
  return target.state === "PREVIEW_READY" && tab.url === target.destination;
}

// Chrome serializes this into the active page; keep it self-contained and return no page data.
export function prepareNativeBranchForm(repository, sourceBranch, newBranch) {
  try {
    if (location.origin !== "https://github.com" ||
        location.pathname !== `/${repository}/branches` || location.search || location.hash ||
        !/^[a-z0-9-]+\/[a-z0-9._-]+$/i.test(repository) ||
        !/^plementus-mvp-[a-z0-9][a-z0-9-]*$/.test(newBranch) ||
        sourceBranch === newBranch) return "UNSUPPORTED_PAGE";

    const visible = element => element.getClientRects().length > 0 &&
      getComputedStyle(element).visibility === "visible" &&
      getComputedStyle(element).display !== "none";
    const dialogs = [...document.querySelectorAll('dialog[open], [role="dialog"][aria-modal="true"]')]
      .filter(visible);
    if (dialogs.length !== 1) return "MANUAL_ACTION_REQUIRED";
    const dialog = dialogs[0];
    const eligible = control => control.isConnected && dialog.contains(control) && visible(control) &&
      !control.matches(":disabled") && !control.readOnly &&
      !control.closest('[inert], [aria-disabled="true"]');
    const normalized = node => node.textContent.trim().replace(/\s+/g, " ");
    const recognizedHeadings = () => [...dialog.querySelectorAll("h1, h2, h3, [role=heading]")]
      .filter(visible).filter(node => ["New branch", "Create a branch"].includes(normalized(node)));
    const headings = recognizedHeadings();
    if (headings.length !== 1) return "MANUAL_ACTION_REQUIRED";
    const headingText = normalized(headings[0]);
    const sourceIsPicker = headingText === "Create a branch";
    const labels = text => [...dialog.querySelectorAll("label")]
      .filter(node => visible(node) && normalized(node) === text);
    const controls = label => labels(label)
      .map(node => node.control).filter(node => node && visible(node));
    const pickers = () => [...dialog.querySelectorAll('button[id^="ref-picker-"]')].filter(visible);
    const names = controls("New branch name");
    const targetValid = () => eligible(names[0]) && names[0].tagName === "INPUT" && names[0].type === "text";
    const sources = sourceIsPicker ? pickers() : controls("Source branch");
    const sourceValid = () => sources.length === 1 && eligible(sources[0]) &&
      (sourceIsPicker
        ? labels("Source").length === 1 && pickers().length === 1 && pickers()[0] === sources[0] &&
          sources[0].tagName === "BUTTON" && sources[0].type === "button" &&
          sources[0].getAttribute("aria-haspopup") === "true" &&
          normalized(sources[0]) === sourceBranch &&
          sources[0].getAttribute("aria-label")?.trim().replace(/\s+/g, " ") === `${sourceBranch} branch`
        : controls("Source branch").length === 1 && controls("Source branch")[0] === sources[0] &&
          ["INPUT", "SELECT"].includes(sources[0].tagName) && sources[0].value === sourceBranch);
    if (names.length !== 1 || !dialog.isConnected ||
        names[0] === sources[0] || !targetValid() || !sourceValid() ||
        names[0].value) return "MANUAL_ACTION_REQUIRED";

    // Recheck the page and dialog immediately before the only form interaction.
    if (location.origin !== "https://github.com" ||
        location.pathname !== `/${repository}/branches` || location.search || location.hash ||
        !dialog.isConnected || !visible(dialog) || !targetValid() || !sourceValid()) return "UNSUPPORTED_PAGE";
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(names[0], newBranch);
    names[0].dispatchEvent(new Event("input", { bubbles: true }));
    if (location.origin !== "https://github.com" ||
        location.pathname !== `/${repository}/branches` || location.search || location.hash) return "UNSUPPORTED_PAGE";
    const currentDialogs = [...document.querySelectorAll('dialog[open], [role="dialog"][aria-modal="true"]')]
      .filter(visible);
    const currentHeadings = recognizedHeadings();
    if (currentDialogs.length !== 1 || currentDialogs[0] !== dialog || !targetValid() ||
        !sourceValid() || controls("New branch name").length !== 1 ||
        controls("New branch name")[0] !== names[0] || names[0].value !== newBranch ||
        currentHeadings.length !== 1 || currentHeadings[0] !== headings[0] ||
        normalized(currentHeadings[0]) !== headingText) {
      return "MANUAL_ACTION_REQUIRED";
    }
    return "FORM_PREPARED";
  } catch {
    return "MANUAL_ACTION_REQUIRED";
  }
}
