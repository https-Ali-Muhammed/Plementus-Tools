export function createDemoPlan(input) {
  return Object.freeze({
    projectName: input.projectName.trim(),
    subscriptionMode: input.subscriptionMode,
    hasSubscriptionReference: Boolean(input.subscriptionReference.trim()),
    github: Object.freeze({
      organization: input.organization.trim(),
      repository: input.repository.trim(),
      mode: input.repositoryMode,
    }),
    utilities: Object.freeze(input.utilities.map(({ url, path }) =>
      Object.freeze({ repository: url.trim(), path: path.trim() }))),
    branches: Object.freeze({ production: input.production.trim(), staging: input.staging.trim() }),
    domains: Object.freeze({
      mode: input.domainMode,
      production: input.domainMode === "custom" ? input.productionDomain.trim() : null,
      staging: input.domainMode === "custom" ? input.stagingDomain.trim() : null,
    }),
  });
}

export function createDemoRunner(plan, onUpdate, delay = ms => new Promise(resolve => setTimeout(resolve, ms)), selectedScenario = "normal") {
  const scenario = ["normal", "production-failure", "staging-unknown"].includes(selectedScenario)
    ? selectedScenario : "normal";
  const details = [
    ["subscription", "Subscription and project preparation", "Invented local preparation outcome."],
    ["repository", "GitHub repository setup or association",
      `Invented local repository ${plan.github.mode === "new" ? "setup" : "association"} outcome.`],
    ["production", "Odoo.sh project and Production readiness", "Invented local readiness outcome; no project was created."],
    ["utilities", "Utilities and module checkpoints", plan.utilities.length
      ? "Invented local Utilities checkpoint; Modules unavailable. No installation occurred."
      : "Utilities NOT_CONFIGURED; Modules unavailable. No installation occurred."],
    ["staging", "Staging environment and copy/neutralization planning",
      "Invented local Staging and copy/neutralization planning outcome."],
    ["plementus", "Plementus Database INFO / native Connect handoff",
      "Invented local Database INFO handoff; native Connect MANUAL_NOT_RUN."],
  ];
  let runState = "IDLE";
  let resumeWaiter;
  let stop;
  const stopped = new Promise(resolve => { stop = resolve; });
  let terminal;
  let steps = details.map(([id, name]) => Object.freeze({ id, name, state: "PENDING", detail: "" }));

  function snapshot(summary = "") {
    const report = ["COMPLETED", "CANCELLED", "FAILED", "OUTCOME_UNKNOWN"].includes(runState)
      ? Object.freeze({
        scenario, runState,
        simulatedCount: steps.filter(step => step.state === "SIMULATED").length,
        simulatedSteps: Object.freeze(steps.filter(step => step.state === "SIMULATED").map(step => step.name)),
        notConfiguredSteps: Object.freeze(steps.filter(step => step.state === "NOT_CONFIGURED").map(step => step.name)),
        pendingSteps: Object.freeze(steps.filter(step => step.state === "PENDING").map(step => step.name)),
        unfinishedStep: steps.find(step => step.state === "RUNNING")?.name || null,
        manualHandoffs: Object.freeze(["Native Connect — MANUAL_NOT_RUN"]),
        externalProvisioning: "No external provisioning was performed.",
      }) : null;
    return Object.freeze({
      scope: "LOCAL_SIMULATION", externalActions: false, scenario, runState,
      completed: steps.filter(step => ["SIMULATED", "NOT_CONFIGURED"].includes(step.state)).length,
      steps: Object.freeze([...steps]), summary, report,
    });
  }

  function update(index, state, detail = "") {
    steps = steps.map((step, position) => position === index
      ? Object.freeze({ ...step, state, detail }) : step);
    const current = snapshot();
    onUpdate(current);
    return current;
  }

  function finish(state, summary) {
    runState = state;
    terminal = snapshot(summary);
    onUpdate(terminal);
    return terminal;
  }

  async function ready() {
    while (runState === "PAUSED") {
      await Promise.race([new Promise(resolve => { resumeWaiter = resolve; }), stopped]);
      resumeWaiter = undefined;
    }
    return runState === "RUNNING";
  }

  return Object.freeze({
    async start() {
      if (runState !== "IDLE") return false;
      runState = "RUNNING";
      onUpdate(snapshot());
      if (runState !== "RUNNING" && !(await ready())) return terminal;
      for (let index = 0; index < steps.length; index++) {
        update(index, "RUNNING", "Local demonstration in progress.");
        if (runState !== "RUNNING" && !(await ready())) return terminal;
        const outcome = await Promise.race([
          Promise.resolve().then(() => delay(220)).then(() => "done", () => "error"),
          stopped.then(() => "cancel"),
        ]);
        if (runState === "CANCELLED") return terminal;
        if (outcome === "error") return finish("FAILED", "Local simulation failed. No external provisioning was performed.");
        if (runState !== "RUNNING" && !(await ready())) return terminal;
        if (scenario === "production-failure" && index === 2) {
          return finish("FAILED", "Simulated local failure at Production. No external provisioning was performed.");
        }
        if (scenario === "staging-unknown" && index === 4) {
          return finish("OUTCOME_UNKNOWN", "Simulated unknown outcome at Staging. No external provisioning was performed.");
        }
        update(index, index === 3 && !plan.utilities.length ? "NOT_CONFIGURED" : "SIMULATED", details[index][2]);
        if (runState !== "RUNNING" && !(await ready())) return terminal;
      }
      return finish("COMPLETED", "Local simulation finished. No external provisioning was performed.");
    },
    pause() {
      if (runState !== "RUNNING") return false;
      runState = "PAUSED";
      onUpdate(snapshot());
      return true;
    },
    resume() {
      if (runState !== "PAUSED") return false;
      runState = "RUNNING";
      onUpdate(snapshot());
      resumeWaiter?.();
      return true;
    },
    cancel() {
      if (!["RUNNING", "PAUSED"].includes(runState)) return false;
      finish("CANCELLED", "Local simulation cancelled. No external provisioning was performed.");
      stop();
      return true;
    },
  });
}
