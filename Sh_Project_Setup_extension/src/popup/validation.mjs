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

const organizationPattern = /^(?=.{1,39}$)[a-z\d]+(?:-[a-z\d]+)*$/i;
const repositoryPattern = /^(?!\.{1,2}$)[a-z\d_.-]{1,100}$/i;

export function validateGithub({ organization = "", repository = "", mode = "" } = {}) {
  return {
    organization: organizationPattern.test(organization.trim()) ? "" : "Enter a valid GitHub organization.",
    repository: repositoryPattern.test(repository.trim()) && !repository.trim().toLowerCase().endsWith(".git")
      ? "" : "Enter a valid repository name.",
    mode: ["new", "existing"].includes(mode) ? "" : "Choose a repository selection.",
  };
}

function repositoryKey(value) {
  const match = /^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)([a-z\d-]+)\/([a-z\d_.-]+?)(?:\.git)?$/i.exec(value.trim());
  if (!match || !organizationPattern.test(match[1]) || !repositoryPattern.test(match[2])) return "";
  return `${match[1]}/${match[2]}`.toLowerCase();
}

function safePath(value) {
  const path = value.trim();
  return path.length <= 200 && path.split("/").every(part =>
    /^[a-z\d_-][a-z\d_.-]*$/i.test(part) &&
    !part.endsWith(".") && !part.toLowerCase().endsWith(".lock") &&
    !/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part),
  );
}

export function validateUtilities(entries) {
  const keys = entries.map(entry => repositoryKey(entry.url));
  const paths = entries.map(entry => entry.path.trim().toLowerCase());
  return entries.map((entry, index) => ({
    url: !keys[index] ? "Enter a valid GitHub HTTPS or SSH repository URL." :
      keys.indexOf(keys[index]) !== keys.lastIndexOf(keys[index]) ? "Duplicate Utilities repository." : "",
    path: !safePath(entry.path) ? "Enter a safe relative submodule path." :
      paths.indexOf(paths[index]) !== paths.lastIndexOf(paths[index]) ? "Duplicate submodule path." : "",
  }));
}

function validBranch(value) {
  return value.length <= 200 && /^[a-zA-Z0-9_][a-zA-Z0-9._/-]*$/.test(value) &&
    !value.includes("..") && !value.includes("//") && !value.endsWith("/") &&
    !value.endsWith(".") && value.split("/").every(part => part && !part.startsWith(".") && !part.endsWith(".lock"));
}

function validHostname(value) {
  return value.length <= 253 && value.includes(".") && value.split(".").every(label =>
    label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label)) &&
    /[a-z]/i.test(value.split(".").at(-1));
}

export function validateEnvironment({ production = "", staging = "", domainMode = "", productionDomain = "", stagingDomain = "" } = {}) {
  return {
    production: validBranch(production.trim()) ? "" : "Enter a valid Production branch.",
    staging: validBranch(staging.trim()) ? "" : "Enter a valid Staging branch.",
    domainMode: ["default", "custom"].includes(domainMode) ? "" : "Choose a domain preference.",
    productionDomain: domainMode !== "custom" || validHostname(productionDomain.trim()) ? "" : "Enter a valid Production hostname.",
    stagingDomain: domainMode !== "custom" || validHostname(stagingDomain.trim()) ? "" : "Enter a valid Staging hostname.",
  };
}
