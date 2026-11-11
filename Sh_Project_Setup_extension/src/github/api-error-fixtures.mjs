/**
 * Isolated mock API: evaluateFixtureApiFailure(text) -> frozen flat summary.
 * Input: primitive canonical ASCII JSON, <=128 bytes, exactly three fields:
 * { status: null | integer 100..599, hint, transport }
 * hint: none | permission-denied | rate-limited | not-found | hidden-resource.
 * transport: none | timeout | connection-failure | interrupted.
 * No caller objects/coercion, duplicate keys, alternate encoding or payloads.
 *
 * Precedence: invalid schema/encoding -> UNKNOWN/invalid_fixture; HTTP plus
 * transport or null status plus a hint -> UNKNOWN/contradictory_fixture.
 * Null status/none hint: none transport -> missing_failure; other transports
 * -> fixture_timeout/fixture_connection_failure/fixture_interrupted, UNKNOWN.
 * Unsupported numeric status -> UNKNOWN/unsupported_status, regardless of hint.
 * Supported HTTP combinations (transport must be none):
 * 401/none -> AUTHENTICATION_FAILURE; 403/permission-denied -> PERMISSION_DENIED;
 * 403/rate-limited, 429/none or rate-limited -> RATE_LIMITED;
 * 403/none -> UNKNOWN/fixture_ambiguous_403;
 * 404/none, not-found, hidden-resource -> UNKNOWN with distinct unverified reasons;
 * 400/none, 422/none -> REQUEST_ERROR; 409/none -> CONFLICT;
 * 500/502/503/504 with none -> PROVIDER_FAILURE.
 * Any other hint for a supported status -> UNKNOWN/contradictory_fixture.
 *
 * Output is <=512 ASCII bytes, fixed category/reason strings and the invariant
 * SIMULATED/fixtureOnly envelope below. readOutcome is ALWAYS UNKNOWN; nextStep
 * is ALWAYS manual; four authority flags are ALWAYS false. No result verifies
 * nonexistence, actual rights, availability, successful reads or rate limits.
 * No retry assessment, execution, headers, quotas, reset times or live API schema.
 * Assumes pristine native intrinsics. Bounded parsing produces inert data;
 * shallow validation precedes reserialization. No caller hooks are inspected.
 */
const hints = ['none', 'permission-denied', 'rate-limited', 'not-found', 'hidden-resource'];
const transports = ['none', 'timeout', 'connection-failure', 'interrupted'];
const httpOutcomes = {
  400: ['REQUEST_ERROR', 'fixture_bad_request'],
  401: ['AUTHENTICATION_FAILURE', 'fixture_authentication_failure'],
  409: ['CONFLICT', 'fixture_conflict'],
  422: ['REQUEST_ERROR', 'fixture_validation_error'],
  500: ['PROVIDER_FAILURE', 'fixture_provider_failure'],
  502: ['PROVIDER_FAILURE', 'fixture_provider_failure'],
  503: ['PROVIDER_FAILURE', 'fixture_provider_failure'],
  504: ['PROVIDER_FAILURE', 'fixture_provider_failure'],
};
function result(category, reason) {
  return Object.freeze({
    evidenceTier: 'SIMULATED', fixtureOnly: true,
    accountVerified: false, executionAuthorized: false,
    approvalGranted: false, trustedContinuingContext: false,
    nextStep: 'manual', readOutcome: 'UNKNOWN', category, reason,
  });
}
function unknown(reason) { return result('UNKNOWN', reason); }

export function evaluateFixtureApiFailure(text) {
  if (typeof text !== 'string' || text.length > 128 || !/^[\x20-\x7e]*$/.test(text)) {
    return unknown('invalid_fixture');
  }
  let input;
  try { input = JSON.parse(text); } catch { return unknown('invalid_fixture'); }
  if (input === null || typeof input !== 'object' || Array.isArray(input) ||
      Object.keys(input).length !== 3 || !['status', 'hint', 'transport'].every(key => Object.hasOwn(input, key)) ||
      !(input.status === null || (Number.isInteger(input.status) && input.status >= 100 && input.status <= 599)) ||
      !hints.includes(input.hint) || !transports.includes(input.transport) || JSON.stringify(input) !== text) {
    return unknown('invalid_fixture');
  }
  const { status, hint, transport } = input;
  if ((status !== null && transport !== 'none') || (status === null && hint !== 'none')) {
    return unknown('contradictory_fixture');
  }
  if (status === null) {
    if (transport === 'none') return unknown('missing_failure');
    return unknown(transport === 'connection-failure' ? 'fixture_connection_failure' : `fixture_${transport}`);
  }
  if (status === 403) {
    if (hint === 'none') return unknown('fixture_ambiguous_403');
    if (hint === 'permission-denied') return result('PERMISSION_DENIED', 'fixture_permission_denied');
    if (hint === 'rate-limited') return result('RATE_LIMITED', 'fixture_rate_limited');
    return unknown('contradictory_fixture');
  }
  if (status === 404) {
    if (hint === 'none') return unknown('fixture_absent_or_hidden');
    if (hint === 'not-found') return unknown('fixture_not_found_unverified');
    if (hint === 'hidden-resource') return unknown('fixture_hidden_resource');
    return unknown('contradictory_fixture');
  }
  if (status === 429) {
    return hint === 'none' || hint === 'rate-limited' ?
      result('RATE_LIMITED', 'fixture_rate_limited') : unknown('contradictory_fixture');
  }
  if (!Object.hasOwn(httpOutcomes, status)) return unknown('unsupported_status');
  return hint === 'none' ? result(...httpOutcomes[status]) : unknown('contradictory_fixture');
}
