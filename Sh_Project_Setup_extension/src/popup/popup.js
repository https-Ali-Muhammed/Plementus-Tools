import { validateProjectSubscription, validateGithub, validateUtilities, validateEnvironment } from "./validation.mjs";
import { createDemoPlan, createDemoRunner } from "./demo-simulation.mjs";

const workspaceLaunch = document.querySelector("#workspace-launch");
const workspaceMode = new URL(location.href).searchParams.get("workspace") === "1";
document.body.classList.toggle("workspace", workspaceMode);
workspaceLaunch.hidden = workspaceMode;
document.querySelector("#open-workspace").addEventListener("click", async event => {
  const button = event.currentTarget;
  const error = document.querySelector("#workspace-error");
  error.hidden = true;
  button.disabled = true;
  try {
    await chrome.tabs.create({ url: chrome.runtime.getURL("src/popup/popup.html?workspace=1") });
  } catch {
    error.textContent = "Could not open the workspace. Please try again.";
    error.hidden = false;
  } finally {
    button.disabled = false;
  }
});

const form = document.querySelector("#project-subscription-form");
form.addEventListener("submit", event => event.preventDefault());
const fields = {
  projectName: form.elements.projectName,
  subscriptionMode: form.elements.subscriptionMode,
  subscriptionReference: form.elements.subscriptionReference,
};
const errors = {
  projectName: document.querySelector("#customer-name-error"),
  subscriptionMode: document.querySelector("#subscription-error"),
  subscriptionReference: document.querySelector("#subscription-reference-error"),
};
const touchedFields = new Set();

function currentValues() {
  return Object.fromEntries(
    Object.entries(fields).map(([name, field]) => [name, field.value]),
  );
}

const githubFields = {
  organization: document.querySelector("#github-organization"),
  mode: document.querySelector("#repository-mode"),
  repository: document.querySelector("#repository"),
};
const githubErrors = {
  organization: document.querySelector("#github-organization-error"),
  repository: document.querySelector("#repository-error"),
  mode: document.querySelector("#repository-mode-error"),
};
const githubTouched = new Set();

function showError(field, error, message) {
  error.textContent = message;
  error.hidden = !message;
  if (message) field.setAttribute("aria-invalid", "true");
  else field.removeAttribute("aria-invalid");
}

function validateGithubFields() {
  const values = Object.fromEntries(Object.entries(githubFields).map(([name, field]) => [name, field.value]));
  const validation = validateGithub(values);
  for (const name of githubTouched) showError(githubFields[name], githubErrors[name], validation[name]);
}

for (const [name, field] of Object.entries(githubFields)) {
  field.addEventListener("blur", () => {
    field.value = field.value.trim();
    githubTouched.add(name);
    validateGithubFields();
  });
  field.addEventListener("input", validateGithubFields);
  field.addEventListener("change", validateGithubFields);
}

const utilityList = document.querySelector("#utilities-list");
let nextUtilityId = 0;

function validateUtilityFields() {
  const rows = [...utilityList.querySelectorAll("fieldset")];
  const validation = validateUtilities(rows.map(row => ({
    url: row.querySelector(".utility-url").value,
    path: row.querySelector(".utility-path").value,
  })));
  rows.forEach((row, index) => {
    for (const name of ["url", "path"]) {
      const field = row.querySelector(`.utility-${name}`);
      if (field.dataset.touched) showError(field, row.querySelector(`.utility-${name}-error`), validation[index][name]);
    }
  });
}

document.querySelector("#add-utility").addEventListener("click", () => {
  const row = document.querySelector("#utility-template").content.cloneNode(true).querySelector("fieldset");
  const id = ++nextUtilityId;
  row.querySelector("legend").textContent = `Utilities repository ${id}`;
  for (const name of ["url", "path"]) {
    const field = row.querySelector(`.utility-${name}`);
    const error = row.querySelector(`.utility-${name}-error`);
    error.id = `utility-${id}-${name}-error`;
    field.setAttribute("aria-describedby", error.id);
    field.addEventListener("blur", () => {
      field.value = field.value.trim();
      field.dataset.touched = "true";
      validateUtilityFields();
    });
    field.addEventListener("input", validateUtilityFields);
  }
  const removeUtility = () => {
    row.remove();
    validateUtilityFields();
    document.querySelector("#add-utility").focus();
  };
  const removeButton = row.querySelector(".remove-utility");
  // Remove before blur validation can move the button away from a pointer click.
  removeButton.addEventListener("pointerdown", removeUtility);
  removeButton.addEventListener("click", removeUtility);
  utilityList.append(row);
  row.querySelector(".utility-url").focus();
});

function renderError(name, message) {
  const field = fields[name];
  const error = errors[name];

  error.textContent = message;
  error.hidden = !message;
  field.toggleAttribute("aria-invalid", Boolean(message));
}

function validateTouchedFields() {
  const validation = validateProjectSubscription(currentValues());

  for (const name of touchedFields) {
    renderError(name, validation[name]);
  }
}

for (const [name, field] of Object.entries(fields)) {
  field.addEventListener("blur", () => {
    if (field.type !== "select-one") {
      field.value = field.value.trim();
    }
    touchedFields.add(name);
    validateTouchedFields();
  });

  field.addEventListener("input", () => {
    if (touchedFields.has(name)) {
      validateTouchedFields();
    }
  });

  field.addEventListener("change", () => {
    if (touchedFields.has(name)) {
      validateTouchedFields();
    }
  });
}

const environmentFields = Object.fromEntries([
  ["production", "production"], ["staging", "staging"], ["domainMode", "domain-mode"],
  ["productionDomain", "production-domain"], ["stagingDomain", "staging-domain"],
].map(([name, id]) => [name, document.getElementById(id)]));
const environmentTouched = new Set();
function updateEnvironment() {
  const values = Object.fromEntries(Object.entries(environmentFields).map(([name, field]) => [name, field.value]));
  const validation = validateEnvironment(values);
  document.querySelector("#custom-domains").hidden = values.domainMode !== "custom";
  for (const name of environmentTouched) {
    const field = environmentFields[name];
    showError(field, document.getElementById(`${field.id}-error`), validation[name]);
  }
}
for (const [name, field] of Object.entries(environmentFields)) {
  field.addEventListener("blur", () => {
    if (field.type !== "select-one") field.value = field.value.trim();
    environmentTouched.add(name);
    updateEnvironment();
    renderSummary();
  });
  field.addEventListener("input", updateEnvironment);
  field.addEventListener("change", updateEnvironment);
}
function renderSummary() {
  const summary = document.querySelector("#review-summary");
  const entries = [
    ["Customer or project", fields.projectName.value],
    ["Subscription type", fields.subscriptionMode.selectedOptions[0]?.textContent],
    ["Subscription reference", fields.subscriptionReference.value ? "Provided (hidden)" : "Not provided"],
    ["GitHub organization", githubFields.organization.value],
    ["Repository selection", githubFields.mode.selectedOptions[0]?.textContent],
    ["Repository", githubFields.repository.value],
    ...[...utilityList.querySelectorAll("fieldset")].map((row, index) => [
      `Utilities ${index + 1}`, `${row.querySelector(".utility-url").value} — ${row.querySelector(".utility-path").value}`,
    ]),
    ["Production branch", environmentFields.production.value],
    ["Staging branch", environmentFields.staging.value],
    ["Domain preference", environmentFields.domainMode.selectedOptions[0]?.textContent],
    ["Modules", "Unavailable"],
    ...(environmentFields.domainMode.value === "custom" ? [
      ["Production hostname", environmentFields.productionDomain.value],
      ["Staging hostname", environmentFields.stagingDomain.value],
    ] : []),
  ];
  summary.replaceChildren();
  for (const [label, value] of entries) {
    const term = document.createElement("dt");
    const detail = document.createElement("dd");
    term.textContent = label;
    detail.textContent = value || "Not provided";
    summary.append(term, detail);
  }
}
form.addEventListener("input", renderSummary);
form.addEventListener("change", renderSummary);
utilityList.addEventListener("click", renderSummary);
document.querySelector("#add-utility").addEventListener("click", renderSummary);
updateEnvironment();
renderSummary();

const steps = [...form.querySelectorAll(":scope > section")];
const progress = [...document.querySelectorAll(".progress li")];
const backButton = document.querySelector("#back");
const continueButton = document.querySelector("#continue");
const prepareButton = document.querySelector("#prepare");
const startSimulationButton = document.querySelector("#start-simulation");
const scenarioSelect = document.querySelector("#simulation-scenario");
const pauseSimulationButton = document.querySelector("#pause-simulation");
const resumeSimulationButton = document.querySelector("#resume-simulation");
const cancelSimulationButton = document.querySelector("#cancel-simulation");
let stepIndex = 0;
let prepared = false;
let demoRunner;
let demoPlan;

function renderSimulation(snapshot) {
  document.querySelector("#simulation-panel").hidden = false;
  document.querySelector("#simulation-progress").value = snapshot.completed;
  document.querySelector("#simulation-count").textContent = `${snapshot.completed} of ${snapshot.steps.length} steps`;
  const timeline = document.querySelector("#simulation-timeline");
  timeline.replaceChildren(...snapshot.steps.map(step => {
    const item = document.createElement("li");
    const name = document.createElement("strong");
    const state = document.createElement("span");
    const detail = document.createElement("p");
    name.textContent = step.name;
    state.textContent = step.state;
    state.className = `simulation-state state-${step.state.toLowerCase()}`;
    detail.textContent = step.detail;
    item.append(name, state, detail);
    return item;
  }));
  const running = snapshot.steps.find(step => step.state === "RUNNING");
  document.querySelector("#simulation-run-state").textContent = snapshot.runState;
  document.querySelector("#simulation-current").textContent = snapshot.summary ||
    (running ? `${running.name}: RUNNING` : `${snapshot.completed} of ${snapshot.steps.length} steps complete`);
  const finish = document.querySelector("#simulation-finish");
  finish.hidden = !snapshot.summary;
  finish.textContent = snapshot.summary;
  const active = snapshot.runState === "RUNNING" || snapshot.runState === "PAUSED";
  pauseSimulationButton.hidden = snapshot.runState !== "RUNNING";
  resumeSimulationButton.hidden = snapshot.runState !== "PAUSED";
  cancelSimulationButton.hidden = !active;
  scenarioSelect.disabled = snapshot.runState !== "IDLE";
  const report = document.querySelector("#simulation-report");
  report.hidden = !snapshot.report;
  if (snapshot.report) {
    const values = [
      ["Demo scenario", scenarioSelect.selectedOptions[0].textContent],
      ["Terminal run state", snapshot.report.runState],
      ["Locally simulated steps", `${snapshot.report.simulatedCount} locally simulated steps: ${snapshot.report.simulatedSteps.join(", ") || "None"}`],
      ["Not-configured steps", snapshot.report.notConfiguredSteps.join(", ") || "None"],
      ["Pending or unattempted steps", `${snapshot.report.pendingSteps.length} pending or unattempted steps: ${snapshot.report.pendingSteps.join(", ") || "None"}`],
      ["Attempted but unfinished step", snapshot.report.unfinishedStep || "None"],
      ["Manual handoffs", snapshot.report.manualHandoffs.join(", ")],
      ["External provisioning", snapshot.report.externalProvisioning],
    ];
    const details = document.querySelector("#simulation-report-details");
    details.replaceChildren();
    for (const [label, value] of values) {
      const term = document.createElement("dt");
      const detail = document.createElement("dd");
      term.textContent = label;
      detail.textContent = value;
      details.append(term, detail);
    }
  }
}

startSimulationButton.addEventListener("click", () => {
  if (!workspaceMode || !demoPlan || startSimulationButton.disabled) return;
  startSimulationButton.disabled = true;
  demoRunner = createDemoRunner(demoPlan, renderSimulation, undefined, scenarioSelect.value);
  void demoRunner.start();
});
pauseSimulationButton.addEventListener("click", () => demoRunner?.pause());
resumeSimulationButton.addEventListener("click", () => demoRunner?.resume());
cancelSimulationButton.addEventListener("click", () => demoRunner?.cancel());

function showStep(index, focus = true) {
  stepIndex = index;
  steps.forEach((section, position) => { section.hidden = position !== index; });
  progress.forEach((item, position) => {
    item.classList.toggle("current", position === index);
    if (position === index) item.setAttribute("aria-current", "step");
    else item.removeAttribute("aria-current");
  });
  backButton.disabled = prepared || index === 0;
  continueButton.hidden = index === steps.length - 1;
  prepareButton.hidden = index !== steps.length - 1;
  if (focus) steps[index].querySelector("h2").focus();
}

function firstInvalidField(index) {
  if (index === 0) {
    Object.keys(fields).forEach(name => touchedFields.add(name));
    validateTouchedFields();
    const validation = validateProjectSubscription(currentValues());
    const name = Object.keys(fields).find(key => validation[key]);
    return name ? fields[name] : null;
  }
  if (index === 1) {
    Object.keys(githubFields).forEach(name => githubTouched.add(name));
    validateGithubFields();
    const rows = [...utilityList.querySelectorAll("fieldset")];
    rows.forEach(row => row.querySelectorAll(".utility-url, .utility-path")
      .forEach(field => { field.dataset.touched = "true"; }));
    validateUtilityFields();
    const githubValidation = validateGithub(Object.fromEntries(
      Object.entries(githubFields).map(([name, field]) => [name, field.value]),
    ));
    const githubName = Object.keys(githubFields).find(name => githubValidation[name]);
    if (githubName) return githubFields[githubName];
    const utilitiesValidation = validateUtilities(rows.map(row => ({
      url: row.querySelector(".utility-url").value,
      path: row.querySelector(".utility-path").value,
    })));
    for (const [position, errors] of utilitiesValidation.entries()) {
      for (const name of ["url", "path"]) {
        if (errors[name]) return rows[position].querySelector(`.utility-${name}`);
      }
    }
  }
  if (index === 2) {
    Object.keys(environmentFields).forEach(name => environmentTouched.add(name));
    updateEnvironment();
    const validation = validateEnvironment(Object.fromEntries(
      Object.entries(environmentFields).map(([name, field]) => [name, field.value]),
    ));
    const name = Object.keys(environmentFields).find(key => validation[key]);
    if (name) return environmentFields[name];
  }
  return null;
}

backButton.addEventListener("click", () => {
  if (!prepared && stepIndex > 0) showStep(stepIndex - 1);
});
continueButton.addEventListener("click", () => {
  if (prepared || stepIndex >= steps.length - 1) return;
  const invalid = firstInvalidField(stepIndex);
  if (invalid) return invalid.focus();
  if (stepIndex === steps.length - 2) renderSummary();
  showStep(stepIndex + 1);
});
prepareButton.addEventListener("click", () => {
  if (prepared || stepIndex !== steps.length - 1) return;
  for (let index = 0; index < steps.length - 1; index++) {
    const invalid = firstInvalidField(index);
    if (invalid) {
      showStep(index);
      invalid.focus();
      return;
    }
  }
  renderSummary();
  demoPlan = createDemoPlan({
    ...currentValues(),
    organization: githubFields.organization.value,
    repository: githubFields.repository.value,
    repositoryMode: githubFields.mode.value,
    utilities: [...utilityList.querySelectorAll("fieldset")].map(row => ({
      url: row.querySelector(".utility-url").value,
      path: row.querySelector(".utility-path").value,
    })),
    ...Object.fromEntries(Object.entries(environmentFields).map(([name, field]) => [name, field.value])),
  });
  prepared = true;
  document.querySelector("#plan-status").textContent =
    "Setup plan prepared locally. Provisioning has not started.";
  form.querySelectorAll("input, select, button").forEach(control => {
    if (!control.closest("#simulation-setup, #simulation-controls")) control.disabled = true;
  });
  if (workspaceMode) {
    document.querySelector("#simulation-setup").hidden = false;
    document.querySelector("#simulation-status").hidden = false;
    startSimulationButton.hidden = false;
    startSimulationButton.disabled = false;
  }
});
showStep(0, false);
