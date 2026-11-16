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

function controlledDelay() {
  const gates = [];
  return {
    gates,
    delay: () => new Promise((resolve, reject) => gates.push({ resolve, reject })),
  };
}

async function tick() { await Promise.resolve(); await Promise.resolve(); }

test("pause blocks advancement and resume continues at the same step", async () => {
  const { gates, delay } = controlledDelay();
  const updates = [];
  const runner = createDemoRunner(createDemoPlan(input), value => updates.push(value), delay);
  const run = runner.start();
  assert.equal(runner.pause(), true);
  assert.equal(runner.pause(), false);
  await tick();
  gates[0].resolve();
  await tick();
  assert.equal(updates.at(-1).runState, "PAUSED");
  assert.equal(updates.at(-1).steps[0].state, "RUNNING");
  assert.equal(gates.length, 1);
  assert.equal(runner.resume(), true);
  assert.equal(runner.resume(), false);
  await tick();
  assert.equal(updates.at(-1).steps[1].state, "RUNNING");
  assert.equal(gates.length, 2);
  assert.equal(runner.cancel(), true);
  const final = await run;
  assert.equal(final.runState, "CANCELLED");
  assert.equal(final.steps[1].state, "RUNNING");
  gates[1].resolve();
  await tick();
  assert.equal(updates.at(-1), final);
  assert.equal(runner.cancel(), false);
  assert.equal(runner.resume(), false);
  assert.equal(await runner.start(), false);
});

test("cancel while paused leaves later steps pending and ignores late rejection", async () => {
  const { gates, delay } = controlledDelay();
  const updates = [];
  const runner = createDemoRunner(createDemoPlan(input), value => updates.push(value), delay);
  const run = runner.start();
  await tick();
  assert.equal(runner.pause(), true);
  assert.equal(runner.cancel(), true);
  const final = await run;
  gates[0].reject(new Error("secret-123 raw provider error"));
  await tick();
  assert.equal(final.runState, "CANCELLED");
  assert.equal(final.steps.slice(1).every(step => step.state === "PENDING"), true);
  assert.equal(updates.at(-1), final);
  assert.equal(JSON.stringify(final).includes("raw provider error"), false);
});

test("failure and unknown scenarios stop at their selected step", async () => {
  for (const [scenario, state, index] of [
    ["production-failure", "FAILED", 2], ["staging-unknown", "OUTCOME_UNKNOWN", 4],
  ]) {
    const final = await createDemoRunner(createDemoPlan(input), () => {}, async () => {}, scenario).start();
    assert.equal(final.scope, "LOCAL_SIMULATION");
    assert.equal(final.scenario, scenario);
    assert.equal(final.runState, state);
    assert.equal(final.steps[index].state, "RUNNING");
    assert.equal(final.steps.slice(index + 1).every(step => step.state === "PENDING"), true);
    assert.equal(final.report.simulatedCount, index);
    assert.equal(final.report.pendingSteps.length, 5 - index);
    assert.match(final.summary, /No external provisioning was performed/);
  }
});

test("rejected delay becomes a sanitized local failure with frozen report", async () => {
  const runner = createDemoRunner(createDemoPlan(input), () => {}, () =>
    Promise.reject(new Error("secret-123 raw exception")));
  const final = await runner.start();
  assert.equal(final.runState, "FAILED");
  assert.equal(final.report.simulatedCount, 0);
  assert.equal(final.report.pendingSteps.length, 5);
  assert.equal(final.report.manualHandoffs.includes("Native Connect — MANUAL_NOT_RUN"), true);
  assert.equal(final.externalActions, false);
  assert.equal(JSON.stringify(final).includes("secret-123"), false);
  assert.equal(JSON.stringify(final).includes("raw exception"), false);
  assert.ok(Object.isFrozen(final.report) && Object.isFrozen(final.report.pendingSteps));
  assert.equal(/(?:created successfully|installed successfully|verified externally)/i.test(JSON.stringify(final)), false);
});

test("cancel in initial RUNNING notification emits only the terminal snapshot", async () => {
  const updates = [];
  let delayCalls = 0;
  let runner;
  runner = createDemoRunner(createDemoPlan(input), snapshot => {
    updates.push(snapshot);
    if (snapshot.runState === "RUNNING" && snapshot.steps.every(step => step.state === "PENDING")) {
      assert.equal(runner.cancel(), true);
    }
  }, () => { delayCalls++; return Promise.resolve(); });
  const final = await runner.start();
  await tick();
  assert.equal(final.runState, "CANCELLED");
  assert.equal(final, updates.at(-1));
  assert.equal(updates.length, 2);
  assert.equal(final.steps.every(step => step.state === "PENDING"), true);
  assert.equal(delayCalls, 0);
});

test("pause in first SIMULATED notification blocks the next step until resume", async () => {
  let releaseFirst;
  const firstDelay = new Promise(resolve => { releaseFirst = resolve; });
  let delayCalls = 0;
  let paused;
  const pausedSignal = new Promise(resolve => { paused = resolve; });
  const updates = [];
  let didPause = false;
  let runner;
  runner = createDemoRunner(createDemoPlan(input), snapshot => {
    updates.push(snapshot);
    if (!didPause && snapshot.steps[0].state === "SIMULATED" && snapshot.runState === "RUNNING") {
      didPause = true;
      assert.equal(runner.pause(), true);
      paused();
    }
  }, () => ++delayCalls === 1 ? firstDelay : Promise.resolve());
  const run = runner.start();
  releaseFirst();
  await pausedSignal;
  try {
    await tick();
    assert.equal(updates.at(-1).runState, "PAUSED");
    assert.equal(updates.at(-1).steps[1].state, "PENDING");
    assert.equal(delayCalls, 1);
  } finally {
    runner.resume();
  }
  const final = await run;
  assert.equal(final.runState, "COMPLETED");
  assert.equal(final.steps.every(step => step.state === "SIMULATED"), true);
  assert.equal(final, updates.at(-1));
});

test("cancel in first SIMULATED notification prevents all later updates", async () => {
  const { gates, delay } = controlledDelay();
  const updates = [];
  let runner;
  runner = createDemoRunner(createDemoPlan(input), snapshot => {
    updates.push(snapshot);
    if (snapshot.steps[0].state === "SIMULATED" && snapshot.runState === "RUNNING") {
      assert.equal(runner.cancel(), true);
    }
  }, delay);
  const run = runner.start();
  await tick();
  gates[0].resolve();
  const final = await run;
  for (const gate of gates.slice(1)) gate.resolve();
  await tick();
  assert.equal(final.runState, "CANCELLED");
  assert.equal(final, updates.at(-1));
  assert.equal(final.steps[0].state, "SIMULATED");
  assert.equal(final.steps.slice(1).every(step => step.state === "PENDING"), true);
  assert.equal(updates.length, 4);
  assert.equal(gates.length, 1);
});

test("cancel in final SIMULATED notification cannot be replaced by completion", async () => {
  const updates = [];
  let runner;
  runner = createDemoRunner(createDemoPlan(input), snapshot => {
    updates.push(snapshot);
    if (snapshot.steps[5].state === "SIMULATED" && snapshot.runState === "RUNNING") {
      assert.equal(runner.cancel(), true);
    }
  }, async () => {});
  const final = await runner.start();
  assert.equal(final.runState, "CANCELLED");
  assert.equal(final, updates.at(-1));
  assert.equal(updates.filter(snapshot => snapshot.runState === "COMPLETED").length, 0);
});
