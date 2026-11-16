import assert from "node:assert/strict";
import { test } from "node:test";
import { createDemoPlan, createDemoRunner } from "../src/popup/demo-simulation.mjs";

const input = {
  projectName: " Demo project ", subscriptionMode: "customer", subscriptionReference: "secret-123",
  organization: "demo-org", repository: "demo-repo", repositoryMode: "new",
  utilities: [{ url: "https://github.com/demo-org/utilities.git", path: "addons/demo" }],
  production: "main", staging: "develop", domainMode: "custom",
  productionDomain: "www.example.com", stagingDomain: "staging.example.com",
};

test("normalizes and freezes a structured plan without the subscription secret", () => {
  const plan = createDemoPlan(input);
  assert.deepEqual(plan, {
    projectName: "Demo project", subscriptionMode: "customer", hasSubscriptionReference: true,
    github: { organization: "demo-org", repository: "demo-repo", mode: "new" },
    utilities: [{ repository: "https://github.com/demo-org/utilities.git", path: "addons/demo" }],
    branches: { production: "main", staging: "develop" },
    domains: { mode: "custom", production: "www.example.com", staging: "staging.example.com" },
  });
  assert.equal(JSON.stringify(plan).includes("secret-123"), false);
  assert.ok(Object.isFrozen(plan) && Object.isFrozen(plan.github) && Object.isFrozen(plan.utilities));
  assert.ok(Object.isFrozen(plan.utilities[0]) && Object.isFrozen(plan.branches) && Object.isFrozen(plan.domains));
});

test("existing repository, absent Utilities and default domains stay distinct", () => {
  const plan = createDemoPlan({ ...input, repositoryMode: "existing", utilities: [], domainMode: "default",
    productionDomain: "ignored.example.com", stagingDomain: "ignored-stage.example.com" });
  assert.equal(plan.github.mode, "existing");
  assert.deepEqual(plan.utilities, []);
  assert.deepEqual(plan.domains, { mode: "default", production: null, staging: null });
});

test("runner emits ordered PENDING, RUNNING and local terminal states exactly once", async () => {
  const snapshots = [];
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const runner = createDemoRunner(createDemoPlan(input), snapshot => snapshots.push(snapshot), () => gate);
  const first = runner.start();
  assert.equal(await runner.start(), false);
  assert.equal(snapshots[0].steps.length, 6);
  assert.equal(snapshots[0].steps.every(step => step.state === "PENDING"), true);
  release();
  const final = await first;
  assert.deepEqual(final.steps.map(step => step.id), [
    "subscription", "repository", "production", "utilities", "staging", "plementus",
  ]);
  assert.equal(snapshots.some(snapshot => snapshot.steps.some(step => step.state === "RUNNING")), true);
  assert.deepEqual(final.steps.map(step => step.state), Array(6).fill("SIMULATED"));
  assert.equal(final.completed, 6);
  assert.equal(final.summary, "Local simulation finished. No external provisioning was performed.");
  assert.equal(await runner.start(), false);
  assert.ok(Object.isFrozen(final) && Object.isFrozen(final.steps) && final.steps.every(Object.isFrozen));
  assert.equal(JSON.stringify(snapshots).includes("secret-123"), false);
  assert.equal(JSON.stringify(snapshots).includes("MANUAL_NOT_RUN"), true);
  assert.equal(JSON.stringify(snapshots).includes("module installation completed"), false);
  assert.equal(final.externalActions, false);
  assert.equal(final.scope, "LOCAL_SIMULATION");
  assert.equal(final.steps.every(step => /Invented local/.test(step.detail)), true);
  assert.equal(/(?:created successfully|installed successfully|verified externally)/i.test(JSON.stringify(final)), false);
});

test("missing Utilities are NOT_CONFIGURED and modules remain unavailable", async () => {
  const plan = createDemoPlan({ ...input, utilities: [] });
  const final = await createDemoRunner(plan, () => {}, async () => {}).start();
  assert.equal(final.steps[3].state, "NOT_CONFIGURED");
  assert.match(final.steps[3].detail, /Modules unavailable/);
  assert.match(final.steps[5].detail, /MANUAL_NOT_RUN/);
  assert.match(final.steps[1].detail, /setup/);
  const existing = await createDemoRunner(createDemoPlan({ ...input, repositoryMode: "existing" }), () => {}, async () => {}).start();
  assert.match(existing.steps[1].detail, /association/);
});
