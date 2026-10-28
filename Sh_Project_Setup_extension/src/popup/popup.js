import { validateProjectSubscription, validateGithub, validateUtilities } from "./validation.mjs";

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
