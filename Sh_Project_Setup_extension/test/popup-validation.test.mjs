import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_PROJECT_NAME_LENGTH,
  MAX_SUBSCRIPTION_REFERENCE_LENGTH,
  validateProjectSubscription,
} from "../src/popup/validation.mjs";

const validReference = "subscription-reference";

test("rejects empty project, mode, and reference without exposing the reference", () => {
  assert.deepEqual(validateProjectSubscription({}), {
    projectName: "Enter a customer or project name.",
    subscriptionMode: "Choose a subscription type.",
    subscriptionReference: "Enter a subscription reference.",
  });
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
