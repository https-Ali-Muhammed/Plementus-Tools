import { validateProjectSubscription, validateGithub, validateUtilities, validateEnvironment } from "./validation.mjs";

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
  repository: document.querySelector("#repository"),
  mode: document.querySelector("#repository-mode"),
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
  row.querySelector(".remove-utility").addEventListener("click", () => {
    row.remove();
    validateUtilityFields();
    document.querySelector("#add-utility").focus();
  });
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
