import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const pages = Object.fromEntries(["project-setup", "production", "staging"].map(name =>
  [name, readFileSync(new URL(`../fixtures/odoo-sh/${name}.html`, import.meta.url), "utf8")]));

test("three standalone pages are visibly simulated and use semantic landmarks", () => {
  for (const [name, html] of Object.entries(pages)) {
    assert.match(html, /SIMULATED TEST FIXTURE — NOT REAL ODOO\.SH/);
    assert.match(html, /<html lang="en">/);
    assert.match(html, /<header>.*<h1>/s);
    assert.match(html, /<main>/);
    assert.match(html, new RegExp(`data-fixture="odoo-sh-${name}"`));
    assert.match(html, /data-project-id="fixture-project-001"/);
  }
});

test("project setup has labeled subscription and repository choices and an inert creation control", () => {
  const html = pages["project-setup"];
  assert.match(html, /<fieldset data-fixture="subscription-mode"><legend>Subscription mode<\/legend>/);
  assert.match(html, /name="subscription-mode" value="customer"/);
  assert.match(html, /name="subscription-mode" value="partner-trial"/);
  assert.match(html, /<label for="repository">Repository<\/label>/);
  assert.match(html, /<select id="repository" data-fixture="repository-selection">/);
  assert.match(html, /value="fixture-repo-001"/);
  assert.match(html, /data-fixture="branch-reference"/);
  assert.match(html, /data-fixture="environment-reference"/);
  assert.match(html, /<button type="button" data-fixture="simulate-project-creation">/);
});

test("Production readiness and checkpoints have distinct stable markers", () => {
  const html = pages.production;
  assert.match(html, /data-environment-id="fixture-production-001"/);
  assert.match(html, /Git branch: main/);
  for (const marker of ["build-readiness", "database-readiness"]) {
    assert.match(html, new RegExp(`data-fixture="${marker}" data-state="ready"`));
  }
  for (const marker of ["utility-access-checkpoint", "module-installation-checkpoint"]) {
    assert.match(html, new RegExp(`aria-labelledby="[^"]+" data-fixture="${marker}"`));
  }
  assert.equal((html.match(/<button type="button" disabled>/g) || []).length, 2);
});

test("Staging branch creation is distinct from an unperformed database copy", () => {
  const html = pages.staging;
  assert.match(html, /data-environment-id="fixture-staging-001"/);
  assert.match(html, /data-fixture="branch-reference" data-state="created">Git branch: develop/);
  assert.match(html, /data-fixture="environment-state" data-state="awaiting-copy"/);
  assert.match(html, /data-fixture="database-copy-checkpoint" data-state="not-copied"/);
  assert.match(html, /Creating a Git branch does not copy a database/);
  assert.match(html, /Neutralized database-copy checkpoint/);
  assert.match(html, /data-fixture="build-readiness" data-state="pending"/);
  assert.match(html, /data-fixture="database-readiness" data-state="pending"/);
  assert.match(html, /<button type="button" disabled>/);
  assert.doesNotMatch(html, /data-fixture="database-copy-checkpoint" data-state="(?:copied|ready)"/);
});

test("pages contain no remote resources, requests, scripts, or sensitive material", () => {
  for (const html of Object.values(pages)) {
    assert.doesNotMatch(html, /<script\b|<form\b|<link\b|<iframe\b|<img\b|<base\b|\bon\w+\s*=|\b(?:src|href|action|formaction)\s*=/i);
    assert.doesNotMatch(html, /https?:|fetch\s*\(|XMLHttpRequest|odoo\.sh\/(?:project|api)|api\.github\.com/i);
    assert.doesNotMatch(html, /(?:password|token|secret|credential|subscription.reference|customer.data|private.key)\s*[:=]/i);
  }
});
