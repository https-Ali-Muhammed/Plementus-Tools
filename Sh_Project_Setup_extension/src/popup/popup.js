import { validateProjectSubscription } from "./validation.mjs";

const form = document.querySelector("#project-subscription-form");
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
