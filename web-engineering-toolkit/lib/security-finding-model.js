import crypto from 'node:crypto';

export const FINDING_SCHEMA_VERSION = '1.0.0';

const FINDING_IDS = {
  https: 'HTTPS_TRANSPORT_MISSING',
  'http-to-https': 'HTTP_TO_HTTPS_REDIRECT_MISSING',
  certificate: 'TLS_CERTIFICATE_VALIDATION_ISSUE',
  tls: 'TLS_CONFIGURATION_WEAK',
  hsts: 'HSTS_POLICY_WEAK',
  csp: 'CSP_POLICY_WEAK',
  clickjacking: 'CLICKJACKING_PROTECTION_MISSING',
  nosniff: 'MIME_SNIFFING_PROTECTION_MISSING',
  'referrer-policy': 'REFERRER_POLICY_WEAK',
  'permissions-policy': 'PERMISSIONS_POLICY_WEAK',
  cookies: 'COOKIE_SECURITY_ATTRIBUTES_MISSING',
  'runtime-cookies': 'RUNTIME_COOKIE_SECURITY_ATTRIBUTES_MISSING',
  cors: 'CORS_POLICY_PERMISSIVE',
  disclosure: 'TECHNOLOGY_DISCLOSURE_PRESENT',
  'mixed-content': 'MIXED_CONTENT_DETECTED',
  'password-transport': 'PASSWORD_TRANSPORT_INSECURE',
  'consent-behavior': 'TRACKING_BEFORE_CONSENT_OBSERVED',
  'access-control-candidates': 'ADMIN_ROUTE_ACCESS_REVIEW_REQUIRED'
};

const IMPACTS = {
  https: 'Traffic can be observed or modified in transit when transport encryption is not enforced.',
  'http-to-https': 'Users following an HTTP link may remain exposed to interception or downgrade before reaching HTTPS.',
  certificate: 'Clients may be unable to authenticate the server or may receive certificate warnings that weaken trust.',
  tls: 'Legacy protocols or weak transport configuration can expose encrypted sessions to known downgrade or cryptographic attacks.',
  hsts: 'Without a durable HSTS policy, first visits and downgrade paths can remain vulnerable to SSL stripping.',
  csp: 'A missing or weak CSP reduces browser-side mitigation against script injection, framing, and unsafe resource loading.',
  clickjacking: 'Another site may be able to frame the application and trick users into unintended interactions.',
  nosniff: 'Browsers may interpret resources as a different content type, increasing script execution risk in some contexts.',
  'referrer-policy': 'Navigation may disclose more URL or origin information than intended to third parties.',
  'permissions-policy': 'Embedded or third-party content may receive browser feature access broader than the application requires.',
  cookies: 'Sensitive cookie values may be exposed to insecure transport, script access, or cross-site request contexts.',
  'runtime-cookies': 'Cookies created during browser execution may lack protections appropriate to their security role.',
  cors: 'An untrusted origin may be able to read responses or make credentialed cross-origin requests outside the intended trust boundary.',
  disclosure: 'Detailed technology information can make targeted reconnaissance easier.',
  'mixed-content': 'Insecure subresources on an HTTPS page can be blocked or modified in transit and can undermine page integrity.',
  'password-transport': 'Credentials submitted over HTTP can be intercepted or modified in transit.',
  'consent-behavior': 'Non-essential tracking initiated before the required user choice may conflict with privacy expectations or applicable consent requirements.',
  'access-control-candidates': 'A non-admin role may be able to reach administration functionality outside its intended authorization boundary.'
};

const CONTROL_MAP = {
  https: ['ISO27001:2022-A.8.24', 'SOC2-CC6.7', 'GDPR-ART-32', 'HIPAA-164.312(e)(1)', 'PCI-DSS-v4.0.1-4.2.1'],
  'http-to-https': ['ISO27001:2022-A.8.24', 'SOC2-CC6.7', 'GDPR-ART-32', 'HIPAA-164.312(e)(1)', 'PCI-DSS-v4.0.1-4.2.1'],
  certificate: ['ISO27001:2022-A.8.24', 'SOC2-CC6.7', 'GDPR-ART-32', 'HIPAA-164.312(e)(1)', 'PCI-DSS-v4.0.1-4.2.1'],
  tls: ['ISO27001:2022-A.8.24', 'SOC2-CC6.7', 'GDPR-ART-32', 'HIPAA-164.312(e)(1)', 'PCI-DSS-v4.0.1-4.2.1'],
  hsts: ['ISO27001:2022-A.8.24', 'SOC2-CC6.7', 'GDPR-ART-32', 'HIPAA-164.312(e)(1)', 'PCI-DSS-v4.0.1-4.2.1'],
  csp: ['ISO27001:2022-A.8.28', 'SOC2-CC7.1', 'PCI-DSS-v4.0.1-6.2.4'],
  clickjacking: ['ISO27001:2022-A.8.28', 'SOC2-CC7.1', 'PCI-DSS-v4.0.1-6.2.4'],
  nosniff: ['ISO27001:2022-A.8.28', 'SOC2-CC7.1', 'PCI-DSS-v4.0.1-6.2.4'],
  cookies: ['ISO27001:2022-A.8.5', 'SOC2-CC6.1', 'GDPR-ART-32', 'HIPAA-164.312(d)', 'PCI-DSS-v4.0.1-6.2.4'],
  'runtime-cookies': ['ISO27001:2022-A.8.5', 'SOC2-CC6.1', 'GDPR-ART-32', 'HIPAA-164.312(d)', 'PCI-DSS-v4.0.1-6.2.4'],
  cors: ['ISO27001:2022-A.8.20', 'SOC2-CC6.6', 'HIPAA-164.312(a)(1)', 'PCI-DSS-v4.0.1-6.2.4'],
  'mixed-content': ['ISO27001:2022-A.8.24', 'SOC2-CC6.7', 'GDPR-ART-32', 'HIPAA-164.312(e)(1)', 'PCI-DSS-v4.0.1-4.2.1'],
  'password-transport': ['ISO27001:2022-A.8.5', 'SOC2-CC6.1', 'GDPR-ART-32', 'HIPAA-164.312(e)(1)', 'PCI-DSS-v4.0.1-8.3.1'],
  'consent-behavior': ['GDPR-ART-5', 'GDPR-ART-6'],
  'access-control-candidates': ['ISO27001:2022-A.5.15', 'SOC2-CC6.1', 'GDPR-ART-32', 'HIPAA-164.312(a)(1)', 'PCI-DSS-v4.0.1-7.2.1']
};

const FRAMEWORK_PREFIX = {
  'iso-27001': 'ISO27001:',
  gdpr: 'GDPR-',
  'soc-2': 'SOC2-',
  hipaa: 'HIPAA-',
  'pci-dss': 'PCI-DSS-'
};

function evidenceType(checkId) {
  if (['certificate', 'tls'].includes(checkId)) return 'tls_observation';
  if (['hsts', 'csp', 'clickjacking', 'nosniff', 'referrer-policy', 'permissions-policy', 'cors', 'disclosure'].includes(checkId)) return 'http_header';
  if (checkId === 'cookies') return 'set_cookie_header';
  if (checkId === 'runtime-cookies') return 'browser_cookie_snapshot';
  if (['mixed-content', 'password-transport'].includes(checkId)) return 'browser_or_document_observation';
  return 'scan_observation';
}

function artifactId(checkId) {
  if (['certificate', 'tls'].includes(checkId)) return 'tls-analysis';
  if (checkId === 'runtime-cookies') return 'browser-cookies';
  if (checkId === 'mixed-content') return 'browser-network';
  if (checkId === 'consent-behavior') return 'browser-network';
  return 'initial-http-response';
}

function controlsFor(checkId, selectedFrameworks = []) {
  const allowedPrefixes = selectedFrameworks.map((id) => FRAMEWORK_PREFIX[id]).filter(Boolean);
  return (CONTROL_MAP[checkId] || []).filter((control) => allowedPrefixes.some((prefix) => control.startsWith(prefix)));
}

function fingerprintFor(parts) {
  return crypto.createHash('sha256').update(parts.filter(Boolean).join('|')).digest('hex');
}

function findingEvidence(check) {
  const raw = [check.evidence, check.details].filter(Boolean).join(' | ') || check.summary;
  return {
    type: evidenceType(check.id),
    raw,
    artifactId: artifactId(check.id)
  };
}

function defaultMethod(check) {
  if (check.testMethod) return check.testMethod;
  if (['certificate', 'tls'].includes(check.id)) return 'TLS handshake and protocol probes';
  if (check.id === 'runtime-cookies') return 'Headless browser cookie snapshot';
  if (check.id === 'mixed-content') return 'Static HTML and headless browser network analysis';
  return 'HTTP response analysis';
}

export function buildFindings(checks = [], { generatedAt, toolVersion, frameworks = [] } = {}) {
  const observedAt = generatedAt || new Date().toISOString();
  const findings = [];
  for (const check of checks) {
    if (['cookies', 'runtime-cookies'].includes(check.id) && (check.instances || []).length) {
      for (const instance of check.instances) {
        for (const missing of instance.missing || []) {
          const normalizedAttribute = missing.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
          const normalizedCategory = instance.category === 'session-or-auth' ? 'SESSION' : instance.category === 'tracking-analytics' ? 'TRACKING' : instance.category === 'functional-preference' ? 'PREFERENCE' : 'UNCLASSIFIED';
          const id = `COOKIE_${normalizedCategory}_${normalizedAttribute}_MISSING`;
          const severity = instance.category === 'session-or-auth'
            ? (missing === 'SameSite/Secure pairing' ? 'medium' : 'high')
            : instance.category === 'tracking-analytics' ? 'low' : 'informational';
          findings.push({
            schemaVersion: FINDING_SCHEMA_VERSION,
            id,
            fingerprint: fingerprintFor([id, check.affectedUrl, instance.name]),
            title: `${instance.name} cookie missing ${missing}`,
            category: check.category,
            severity,
            confidence: check.confidence || (check.testState === 'confirmed' ? 'confirmed' : 'observed'),
            status: 'open',
            affectedUrl: check.affectedUrl || '',
            evidence: { type: check.id === 'cookies' ? 'set_cookie_header' : 'browser_cookie_snapshot', raw: instance.raw, artifactId: artifactId(check.id) },
            impact: IMPACTS[check.id],
            recommendation: `Configure the ${instance.name} cookie with an appropriate ${missing} attribute.`,
            references: [...(check.references || [])],
            controls: controlsFor(check.id, frameworks),
            firstSeen: observedAt,
            lastSeen: observedAt,
            testMethod: defaultMethod(check),
            toolVersion: toolVersion || 'unknown',
            limitations: [`Cookie purpose was inferred as ${instance.category} from its name and attributes; confirm the server-side use manually.`, ...(check.limitations || [])],
            source: 'native',
            sourceCheckId: check.id
          });
        }
      }
      continue;
    }
    if (!['fail', 'warning'].includes(check.status)) continue;
      const id = FINDING_IDS[check.id] || `${String(check.id || 'SCAN').toUpperCase().replace(/[^A-Z0-9]+/g, '_')}_ISSUE`;
      const evidence = findingEvidence(check);
      findings.push({
        schemaVersion: FINDING_SCHEMA_VERSION,
        id,
        fingerprint: fingerprintFor([id, check.affectedUrl, evidence.raw]),
        title: check.title,
        category: check.category,
        severity: check.severity || 'informational',
        confidence: check.confidence || (check.testState === 'confirmed' ? 'confirmed' : 'observed'),
        status: 'open',
        affectedUrl: check.affectedUrl || '',
        evidence,
        impact: IMPACTS[check.id] || 'The observed condition may weaken the security or privacy posture of the assessed target.',
        recommendation: check.recommendation || 'Review the evidence and remediate the underlying condition.',
        references: [...(check.references || [])],
        controls: controlsFor(check.id, frameworks),
        firstSeen: observedAt,
        lastSeen: observedAt,
        testMethod: defaultMethod(check),
        toolVersion: toolVersion || 'unknown',
        limitations: [...(check.limitations || [])],
        source: 'native',
        sourceCheckId: check.id
      });
  }
  return findings;
}

export function buildTestResults(checks = []) {
  return checks.map((check) => ({
    id: check.id,
    title: check.title,
    category: check.category,
    outcome: check.status,
    state: check.testState || 'observed',
    stateLabel: check.testStateLabel || '',
    confidence: check.confidence || 'observed',
    affectedUrl: check.affectedUrl || '',
    summary: check.summary,
    testMethod: defaultMethod(check),
    evidence: findingEvidence(check),
    limitations: [...(check.limitations || [])]
  }));
}

export function buildControlEvaluations(checks = [], findings = [], selectedFrameworks = []) {
  const records = new Map();
  for (const check of checks) {
    for (const controlId of controlsFor(check.id, selectedFrameworks)) {
      if (!records.has(controlId)) records.set(controlId, { controlId, checks: [], findingIds: [] });
      records.get(controlId).checks.push(check);
    }
  }
  for (const finding of findings) {
    for (const controlId of finding.controls || []) {
      if (!records.has(controlId)) records.set(controlId, { controlId, checks: [], findingIds: [] });
      records.get(controlId).findingIds.push(finding.id);
    }
  }
  return [...records.values()].map((record) => {
    const failed = record.checks.some((check) => check.testState === 'failed_to_test');
    const notTested = record.checks.every((check) => ['not_tested', 'failed_to_test'].includes(check.testState));
    const supported = record.checks.some((check) => check.status === 'pass' && check.testState === 'confirmed');
    const state = record.findingIds.length
      ? 'adverse_evidence_observed'
      : failed
        ? 'failed_to_test'
        : notTested
          ? 'not_assessed'
          : supported
            ? 'supported_by_automated_evidence'
            : 'manual_review_required';
    return {
      controlId: record.controlId,
      state,
      automatedEvidence: record.checks.map((check) => ({ checkId: check.id, outcome: check.status, testState: check.testState, artifactId: artifactId(check.id) })),
      linkedFindings: [...new Set(record.findingIds)],
      manualReviewRequired: true,
      limitations: ['Automated public-target evidence supports only the tested technical portion of this control; organizational implementation and operating effectiveness require manual review.']
    };
  });
}
