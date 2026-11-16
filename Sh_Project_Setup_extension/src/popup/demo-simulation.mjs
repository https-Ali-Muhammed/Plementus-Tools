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

export function createDemoRunner(plan, onUpdate, pause = ms => new Promise(resolve => setTimeout(resolve, ms))) {
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
  let started = false;
  let steps = details.map(([id, name]) => Object.freeze({ id, name, state: "PENDING", detail: "" }));

  function snapshot(summary = "") {
    return Object.freeze({
      scope: "LOCAL_SIMULATION", externalActions: false,
      completed: steps.filter(step => ["SIMULATED", "NOT_CONFIGURED"].includes(step.state)).length,
      steps: Object.freeze([...steps]), summary,
    });
  }

  function update(index, state, detail = "") {
    steps = steps.map((step, position) => position === index
      ? Object.freeze({ ...step, state, detail }) : step);
    const current = snapshot();
    onUpdate(current);
    return current;
  }

  return Object.freeze({
    async start() {
      if (started) return false;
      started = true;
      onUpdate(snapshot());
      for (let index = 0; index < steps.length; index++) {
        update(index, "RUNNING", "Local demonstration in progress.");
        await pause(220);
        update(index, index === 3 && !plan.utilities.length ? "NOT_CONFIGURED" : "SIMULATED", details[index][2]);
      }
      const final = snapshot("Local simulation finished. No external provisioning was performed.");
      onUpdate(final);
      return final;
    },
  });
}
