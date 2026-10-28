import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_PROJECT_NAME_LENGTH,
  MAX_SUBSCRIPTION_REFERENCE_LENGTH,
  validateProjectSubscription,
  validateGithub,
  validateUtilities,
  validateEnvironment,
} from "../src/popup/validation.mjs";

const validReference = "subscription-reference";

test("rejects empty project, mode, and reference without exposing the reference", () => {
  assert.deepEqual(validateProjectSubscription({}), {
    projectName: "Enter a customer or project name.",
    subscriptionMode: "Choose a subscription type.",
    subscriptionReference: "Enter a subscription reference.",
  });
});

test("validates organization, repository and repository selection", () => {
  for (const mode of ["new", "existing"]) {
    assert.deepEqual(validateGithub({ organization: "My-Org", repository: "my.repo_1", mode }),
      { organization: "", repository: "", mode: "" });
  }
  for (const organization of ["", "-org", "org--name", "org/name", "a".repeat(40)]) {
    assert.ok(validateGithub({ organization }).organization);
  }
  for (const repository of ["", "..", "name/path", "name.git", "a".repeat(101)]) {
    assert.ok(validateGithub({ repository }).repository);
  }
  assert.ok(validateGithub({ mode: "public" }).mode);
});

test("accepts GitHub HTTPS and SSH URLs and safe paths", () => {
  for (const url of ["https://github.com/Org/repo.git", "git@github.com:Org/repo.git", "ssh://git@github.com/Org/repo"]) {
    assert.deepEqual(validateUtilities([{ url, path: "addons/utilities-v2" }]), [{ url: "", path: "" }]);
  }
  assert.deepEqual(validateUtilities([]), []);
});

test("rejects malformed URLs, credentials, and unsafe paths", () => {
  for (const url of ["", "https://token@github.com/org/repo", "https://user:pass@github.com/org/repo", "https://github.com.evil/org/repo", "http://github.com/org/repo", "git@github.com:org/repo/extra", "https://github.com/org/repo?token=x"]) {
    assert.ok(validateUtilities([{ url, path: "addons/util" }])[0].url);
  }
  for (const path of ["", "/absolute", "../outside", "foo/../bar", "foo//bar", ".git/config", "foo/.git", "foo\\bar", "foo/CON", "foo/bar.lock", "foo/bar."]) {
    assert.ok(validateUtilities([{ url: "https://github.com/org/repo", path }])[0].path);
  }
});

test("detects duplicate repositories across URL forms and duplicate paths", () => {
  const errors = validateUtilities([
    { url: "https://github.com/Org/Repo.git", path: "addons/utility" },
    { url: "git@github.com:org/repo", path: "ADDONS/UTILITY" },
  ]);
  assert.ok(errors.every(error => error.url && error.path));
});

test("rejects whitespace-only project and subscription reference", () => {
  const errors = validateProjectSubscription({
    projectName: "   ",
    subscriptionMode: "customer",
    subscriptionReference: "   ",
  });

  assert.equal(errors.projectName, "Enter a customer or project name.");
  assert.equal(errors.subscriptionMode, "");
  assert.equal(errors.subscriptionReference, "Enter a subscription reference.");
});

test("accepts trimmed values for customer and partner trial modes", () => {
  for (const subscriptionMode of ["customer", "partner-trial"]) {
    assert.deepEqual(
      validateProjectSubscription({
        projectName: "  Customer Project  ",
        subscriptionMode,
        subscriptionReference: `  ${validReference}  `,
      }),
      { projectName: "", subscriptionMode: "", subscriptionReference: "" },
    );
  }
});

test("rejects invalid mode and overlong values", () => {
  const reference = "r".repeat(MAX_SUBSCRIPTION_REFERENCE_LENGTH + 1);
  const errors = validateProjectSubscription({
    projectName: "p".repeat(MAX_PROJECT_NAME_LENGTH + 1),
    subscriptionMode: "other",
    subscriptionReference: reference,
  });

  assert.equal(errors.projectName, `Must be ${MAX_PROJECT_NAME_LENGTH} characters or fewer.`);
  assert.equal(errors.subscriptionMode, "Choose a subscription type.");
  assert.equal(
    errors.subscriptionReference,
    `Must be ${MAX_SUBSCRIPTION_REFERENCE_LENGTH} characters or fewer.`,
  );
  assert.equal(JSON.stringify(errors).includes(reference), false);
});

test("validates branch names and domain preferences locally", () => {
  for (const branch of ["main", "master", "develop", "feature/release-1"]) {
    assert.equal(validateEnvironment({ production: branch, staging: branch, domainMode: "default" }).production, "");
  }
  for (const branch of ["", "-bad", "a..b", "a//b", "a/.hidden", "a.lock", "a/", "a.", "a b", "a@{b", "a~b", "a\\b", "a".repeat(201)]) {
    assert.ok(validateEnvironment({ production: branch }).production);
    assert.ok(validateEnvironment({ staging: branch }).staging);
  }
  assert.deepEqual(validateEnvironment({ production: "main", staging: "develop", domainMode: "custom", productionDomain: "live.example.com", stagingDomain: "test.example.com" }),
    { production: "", staging: "", domainMode: "", productionDomain: "", stagingDomain: "" });
  for (const host of ["", "localhost", "-bad.example", "bad-.example", "a..example", "https://example.com", "example.com:443", "127.0.0.1", "a".repeat(64) + ".com"]) {
    assert.ok(validateEnvironment({ domainMode: "custom", productionDomain: host, stagingDomain: host }).productionDomain);
    assert.ok(validateEnvironment({ domainMode: "custom", productionDomain: host, stagingDomain: host }).stagingDomain);
  }
  assert.ok(validateEnvironment({ domainMode: "other" }).domainMode);
  assert.equal(validateEnvironment({ domainMode: "default" }).productionDomain, "");
});
