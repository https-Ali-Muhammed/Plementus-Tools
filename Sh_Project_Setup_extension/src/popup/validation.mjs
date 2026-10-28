export const MAX_PROJECT_NAME_LENGTH = 100;
export const MAX_SUBSCRIPTION_REFERENCE_LENGTH = 160;

const SUBSCRIPTION_MODES = new Set(["customer", "partner-trial"]);

function validateText(value, requiredMessage, maximumLength) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return requiredMessage;
  }

  if (trimmedValue.length > maximumLength) {
    return `Must be ${maximumLength} characters or fewer.`;
  }

  return "";
}

export function validateProjectSubscription({
  projectName = "",
  subscriptionMode = "",
  subscriptionReference = "",
} = {}) {
  return {
    projectName: validateText(
      projectName,
      "Enter a customer or project name.",
      MAX_PROJECT_NAME_LENGTH,
    ),
    subscriptionMode: SUBSCRIPTION_MODES.has(subscriptionMode)
      ? ""
      : "Choose a subscription type.",
    subscriptionReference: validateText(
      subscriptionReference,
      "Enter a subscription reference.",
      MAX_SUBSCRIPTION_REFERENCE_LENGTH,
    ),
  };
}
