import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const customer = readFileSync(new URL("../fixtures/customer-odoo/apps.html", import.meta.url), "utf8");
const plementus = readFileSync(new URL("../fixtures/plementus/database-info.html", import.meta.url), "utf8");

test("both standalone pages have distinct markers, landmarks and visible fixture warnings", () => {
  for (const html of [customer, plementus]) {
    assert.match(html, /SIMULATED TEST FIXTURE — NOT REAL CUSTOMER SYSTEM/);
    assert.match(html, /<html lang="en">/);
    assert.match(html, /<header>.*<h1>/s);
    assert.match(html, /<main>/);
    assert.match(html, /<section aria-labelledby="[^"]+" data-fixture="[^"]+"/);
  }
  assert.match(customer, /data-fixture="customer-odoo-apps"/);
  assert.match(plementus, /data-fixture="plementus-database-info"/);
});

test("customer Apps distinguishes environments, availability, installed state and approval", () => {
  assert.match(customer, /data-fixture="production-indicator" data-state="selected"/);
  assert.match(customer, /data-fixture="test-indicator" data-state="available"/);
  assert.match(customer, /<table><caption>.*<thead>/s);
  assert.match(customer, /data-fixture="module-pl-auth" data-availability="available" data-installation="not-installed"/);
  assert.match(customer, /data-fixture="module-cedar-labels" data-availability="available" data-installation="installed"/);
  assert.match(customer, /Repository attachment and module availability do not prove installation/);
  assert.match(customer, /independent state verification and approval/);
  assert.match(customer, /data-fixture="module-approval-checkpoint" data-state="awaiting-approval"/);
  assert.match(customer, /data-fixture="install-control" disabled/);
  assert.doesNotMatch(customer, /data-fixture="module-pl-auth"[^>]*data-installation="installed"/);
});

test("candidate Database INFO fields are labeled and Connect checkpoints stay separate", () => {
  for (const [id, marker, label] of [["database-name", "database-name", "Database name"], ["live-url", "live-url", "Live URL"], ["test-url", "test-url", "Test URL"], ["database-user", "database-user", "Database user"]]) {
    assert.match(plementus, new RegExp(`<label for="${id}">${label}</label><input id="${id}" data-fixture="${marker}"[^>]*readonly>`));
  }
  assert.match(plementus, /real Plementus mappings and page structure are unverified/);
  assert.match(plementus, /data-fixture="review-submit-checkpoint" data-state="awaiting-review"/);
  assert.match(plementus, /data-fixture="connect-live-checkpoint" data-state="not-connected"/);
  assert.match(plementus, /data-fixture="connect-test-checkpoint" data-state="not-connected"/);
  assert.match(plementus, /Native pl_auth Connect behavior is unchanged/);
  for (const marker of ["submit-control", "connect-live-control", "connect-test-control"]) {
    assert.match(plementus, new RegExp(`data-fixture="${marker}" disabled`));
  }
});

test("pages contain invented values only and cannot submit or load remote resources", () => {
  for (const html of [customer, plementus]) {
    assert.doesNotMatch(html, /<script\b|<form\b|<link\b|<iframe\b|<img\b|<base\b|\bon\w+\s*=|\b(?:src|href|action|formaction)\s*=/i);
    assert.doesNotMatch(html, /fetch\s*\(|XMLHttpRequest|api\.github\.com|odoo\.sh|plemo\.ai|(?:password|token|secret|credential|private.key)\s*[:=]/i);
    assert.doesNotMatch(html, /<button(?![^>]*\bdisabled\b)[^>]*>/i);
  }
  assert.match(customer, /fixture-customer-db-001/);
  assert.match(plementus, /fixture-plementus-project-001/);
  assert.deepEqual([...plementus.matchAll(/https?:\/\/[^"\s<]+/g)].map(match => match[0]), ["https://cedar-live.invalid", "https://cedar-test.invalid"]);
});
