const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const state = {
  mode: 'public',
  targetLanguage: 'en',
  environment: null,
  browser: null,
  activeRunId: null,
  eventSource: null,
  selectedReports: new Set(),
  pendingDeleteReports: [],
  projects: [],
  activeProjectId: '',
  assetDevice: 'desktop',
  pendingProjectDeleteId: ''
};

const refs = {
  projectName: $('#projectName'), projectNameField: $('#projectNameField'), projectNameError: $('#projectNameError'),
  baseUrl: $('#baseUrl'), baseUrlField: $('#baseUrlField'), baseUrlError: $('#baseUrlError'), defaultLanguage: $('#defaultLanguage'),
  runsPerPage: $('#runsPerPage'), runsPerPageField: $('#runsPerPageField'), runsPerPageError: $('#runsPerPageError'),
  routingPreview: $('#routingPreview'), routingExplanation: $('#routingExplanation'),
  urls: $('#urls'), urlsField: $('#urlsField'), urlsError: $('#urlsError'), mobileDevice: $('#mobileDevice'), desktopDevice: $('#desktopDevice'), devicesField: $('#devicesField'), devicesError: $('#devicesError'),
  allCategories: $('#allCategories'), categoriesField: $('#categoriesField'), categoriesError: $('#categoriesError'),
  flowEnabled: $('#flowEnabled'), flowScript: $('#flowScript'), flowScriptError: $('#flowScriptError'), flowPanel: $('#flowPanel'),
  urlCount: $('#urlCount'), auditCount: $('#auditCount'), browserSelect: $('#browserSelect'), checkEnvironmentBtn: $('#checkEnvironmentBtn'),
  launchBrowserBtn: $('#launchBrowserBtn'), stopBrowserBtn: $('#stopBrowserBtn'), startRunBtn: $('#startRunBtn'), cancelRunBtn: $('#cancelRunBtn'),
  environmentDot: $('#environmentDot'), environmentSummary: $('#environmentSummary'), healthMini: $('#healthMini'), healthDetails: $('#healthDetails'), healthActionSummary: $('#healthActionSummary'), copyAllFixesBtn: $('#copyAllFixesBtn'), browserBadge: $('#browserBadge'), browserBadgeText: $('#browserBadgeText'),
  runState: $('#runState'), progressPercent: $('#progressPercent'), progressBar: $('#progressBar'), validCount: $('#validCount'), redirectCount: $('#redirectCount'), failedCount: $('#failedCount'),
  currentRun: $('#currentRun'), liveSection: $('#liveSection'), liveLog: $('#liveLog'), resultSummary: $('#resultSummary'), clearLogsBtn: $('#clearLogsBtn'), toast: $('#toast'), historyList: $('#historyList'),
  selectAllReports: $('#selectAllReports'), selectedReportsCount: $('#selectedReportsCount'), deleteSelectedReportsBtn: $('#deleteSelectedReportsBtn'),
  deleteModal: $('#deleteModal'), deleteModalTitle: $('#deleteModalTitle'), deleteModalMessage: $('#deleteModalMessage'), deleteModalCloseBtn: $('#deleteModalCloseBtn'), cancelDeleteBtn: $('#cancelDeleteBtn'), confirmDeleteBtn: $('#confirmDeleteBtn'),
  securityProjectName: $('#securityProjectName'), securityProjectField: $('#securityProjectField'), securityProjectError: $('#securityProjectError'),
  securityTargetUrl: $('#securityTargetUrl'), securityUrlField: $('#securityUrlField'), securityUrlError: $('#securityUrlError'), securityJurisdiction: $('#securityJurisdiction'),
  securityCrawlEnabled: $('#securityCrawlEnabled'), securityMaxPages: $('#securityMaxPages'),
  allSecurityFrameworks: $('#allSecurityFrameworks'), securityFrameworksField: $('#securityFrameworksField'), securityFrameworkError: $('#securityFrameworkError'), securityFrameworkCount: $('#securityFrameworkCount'),
  startSecurityScanBtn: $('#startSecurityScanBtn'), securityScanState: $('#securityScanState'), securityResultsCard: $('#securityResultsCard'), securityResults: $('#securityResults'), securityResultActions: $('#securityResultActions'),
  activeProjectMini: $('#activeProjectMini'), activeProjectCard: $('#activeProjectCard'), projectsList: $('#projectsList'), projectCount: $('#projectCount'), newProjectBtn: $('#newProjectBtn'),
  projectEditorCard: $('#projectEditorCard'), projectEditorTitle: $('#projectEditorTitle'), projectEditId: $('#projectEditId'), sharedProjectName: $('#sharedProjectName'), sharedProjectNameField: $('#sharedProjectNameField'), sharedProjectNameError: $('#sharedProjectNameError'),
  projectTestingUrl: $('#projectTestingUrl'), projectTestingUrlField: $('#projectTestingUrlField'), projectTestingUrlError: $('#projectTestingUrlError'), projectProductionUrl: $('#projectProductionUrl'), projectProductionUrlField: $('#projectProductionUrlField'), projectProductionUrlError: $('#projectProductionUrlError'),
  projectEnvironment: $('#projectEnvironment'), projectDefaultLanguage: $('#projectDefaultLanguage'), projectLangEn: $('#projectLangEn'), projectLangAr: $('#projectLangAr'), projectPaths: $('#projectPaths'), saveProjectBtn: $('#saveProjectBtn'), cancelProjectEditBtn: $('#cancelProjectEditBtn'),
  assetProjectName: $('#assetProjectName'), assetProjectField: $('#assetProjectField'), assetProjectError: $('#assetProjectError'), assetBaseUrl: $('#assetBaseUrl'), assetBaseUrlField: $('#assetBaseUrlField'), assetBaseUrlError: $('#assetBaseUrlError'),
  assetPaths: $('#assetPaths'), assetPathsField: $('#assetPathsField'), assetPathsError: $('#assetPathsError'), assetBrowserSelect: $('#assetBrowserSelect'), startAssetAnalysisBtn: $('#startAssetAnalysisBtn'), assetScanState: $('#assetScanState'), assetResultsCard: $('#assetResultsCard'), assetResults: $('#assetResults'), assetResultActions: $('#assetResultActions'),
  projectDeleteModal: $('#projectDeleteModal'), projectDeleteModalCloseBtn: $('#projectDeleteModalCloseBtn'), projectDeleteModalMessage: $('#projectDeleteModalMessage'), cancelProjectDeleteBtn: $('#cancelProjectDeleteBtn'), confirmProjectDeleteBtn: $('#confirmProjectDeleteBtn')
};

function toast(message, error = false) {
  refs.toast.textContent = message;
  refs.toast.className = `toast show${error ? ' error' : ''}`;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => refs.toast.className = 'toast', 3200);
}

async function api(url, options = {}) {
  const response = await fetch(url, { headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

function parseUrls() {
  return refs.urls.value.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
    try {
      const base = new URL(refs.baseUrl.value);
      const parsed = new URL(line, base);
      if (parsed.origin === base.origin) return `${parsed.pathname}${parsed.search}`;
      return parsed.href;
    } catch {
      return line;
    }
  });
}

function selectedDevices() {
  return [refs.mobileDevice.checked && 'mobile', refs.desktopDevice.checked && 'desktop'].filter(Boolean);
}

function selectedCategories() {
  return $$('.categoryCheck').filter((input) => input.checked).map((input) => input.value);
}

function syncCategorySelectAll() {
  const checks = $$('.categoryCheck');
  const selected = checks.filter((input) => input.checked).length;
  refs.allCategories.checked = selected === checks.length;
  refs.allCategories.indeterminate = selected > 0 && selected < checks.length;
}


function languagePrefix(code) {
  return String(code || 'en').split(/[_-]/)[0].toLowerCase();
}

function previewLanguagePath(path = '/about-us') {
  const target = languagePrefix(state.targetLanguage);
  const siteDefault = languagePrefix(refs.defaultLanguage.value);
  const normalized = path.startsWith('/') ? path : `/${path}`;

  if (target === siteDefault) return normalized;
  if (normalized === '/') return `/${target}`;
  return `/${target}${normalized}`;
}

function updateRoutingPreview() {
  if (!refs.routingPreview || !refs.routingExplanation) return;

  const target = languagePrefix(state.targetLanguage);
  const siteDefault = languagePrefix(refs.defaultLanguage.value);
  const firstPath = parseUrls().find((value) => !/^https?:\/\//i.test(value));

  refs.routingPreview.textContent = firstPath ? previewLanguagePath(firstPath) : 'Add a target URL to preview routing';

  if (target === siteDefault) {
    refs.routingExplanation.textContent =
      `${target.toUpperCase()} is the website default, so no /${target} prefix will be added.`;
  } else {
    refs.routingExplanation.textContent =
      `${siteDefault.toUpperCase()} is the website default, so ${target.toUpperCase()} pages use the /${target} prefix.`;
  }
}

function updateEstimate() {
  const urls = parseUrls();
  const devices = selectedDevices();
  const runs = Math.max(1, Number(refs.runsPerPage.value) || 1);
  refs.urlCount.textContent = `${urls.length} URL${urls.length === 1 ? '' : 's'}`;
  refs.auditCount.textContent = urls.length * devices.length * runs;
  syncCategorySelectAll();
  updateRoutingPreview();
}

function setFieldError(field, errorElement, message = '') {
  if (!field || !errorElement) return;
  field.classList.toggle('has-error', Boolean(message));
  errorElement.textContent = message;
}

function validateProjectName() {
  const value = refs.projectName.value.trim();
  const message = !value ? 'Project name is required.' : value.length < 2 ? 'Project name must contain at least 2 characters.' : '';
  setFieldError(refs.projectNameField, refs.projectNameError, message);
  return !message;
}

function validateBaseUrl({ allowEmpty = false } = {}) {
  const value = refs.baseUrl.value.trim();
  let message = '';
  if (!value) {
    message = allowEmpty ? '' : 'Base URL is required.';
  } else {
    try {
      const parsed = new URL(value);
      if (!['http:', 'https:'].includes(parsed.protocol)) message = 'Base URL must use http:// or https://.';
    } catch {
      message = 'Enter a valid URL, for example https://example.com.';
    }
  }
  setFieldError(refs.baseUrlField, refs.baseUrlError, message);
  return !message;
}

function validateRunsPerPage() {
  const raw = refs.runsPerPage.value.trim();
  const value = Number(raw);
  const message = !raw
    ? 'Runs per page is required.'
    : !Number.isInteger(value) || value < 1 || value > 10
      ? 'Runs per page must be a whole number from 1 to 10.'
      : '';
  setFieldError(refs.runsPerPageField, refs.runsPerPageError, message);
  return !message;
}

function validateUrls() {
  const lines = refs.urls.value.split('\n').map((line) => line.trim()).filter(Boolean);
  let message = '';
  if (!lines.length) {
    message = 'Add at least one target URL or path.';
  } else {
    const invalidIndex = lines.findIndex((line) => {
      if (line.startsWith('/')) return false;
      try {
        const parsed = new URL(line);
        return !['http:', 'https:'].includes(parsed.protocol);
      } catch {
        return true;
      }
    });
    if (invalidIndex >= 0) message = `Line ${invalidIndex + 1} must start with / or be a full http(s) URL.`;
  }
  setFieldError(refs.urlsField, refs.urlsError, message);
  return !message;
}

function validateDevices() {
  const valid = selectedDevices().length > 0;
  refs.devicesField.classList.toggle('has-error', !valid);
  refs.devicesError.textContent = valid ? '' : 'Select at least one device.';
  return valid;
}

function validateCategories() {
  const valid = selectedCategories().length > 0;
  refs.categoriesField.classList.toggle('has-error', !valid);
  refs.categoriesError.textContent = valid ? '' : 'Select at least one Lighthouse category.';
  return valid;
}

function validateFlowScript() {
  const message = refs.flowEnabled.checked && !refs.flowScript.value.trim() ? 'Add Playwright setup code or disable the setup flow.' : '';
  const field = refs.flowScript.closest('.field');
  setFieldError(field, refs.flowScriptError, message);
  return !message;
}

function focusFirstInvalid() {
  const invalid = document.querySelector('.field.has-error input, .field.has-error textarea, .field.has-error select, #devicesField.has-error input');
  invalid?.focus();
}

function validateProjectSetup() {
  const valid = [validateProjectName(), validateBaseUrl()].every(Boolean);
  if (!valid) focusFirstInvalid();
  return valid;
}

function validateRunForm() {
  const results = [validateProjectName(), validateBaseUrl(), validateRunsPerPage(), validateUrls(), validateDevices(), validateCategories(), validateFlowScript()];
  const valid = results.every(Boolean);
  if (!valid) focusFirstInvalid();
  return valid;
}

function setSegment(selector, value, callback) {
  $$(selector).forEach((button) => {
    button.classList.toggle('active', button.dataset.value === value);
    button.addEventListener('click', () => {
      $$(selector).forEach((b) => b.classList.remove('active'));
      button.classList.add('active');
      callback(button.dataset.value);
    });
  });
}

function setHealthMini(key, text, status = '') {
  const cells = [...refs.healthMini.children];
  const cell = cells.find((item) => item.querySelector('span')?.textContent.toLowerCase() === key.toLowerCase());
  if (!cell) return;
  const strong = cell.querySelector('strong');
  strong.textContent = text;
  strong.className = status;
}


function healthStatusIcon(status) {
  if (status === 'ready') return '✓';
  if (status === 'warning') return '!';
  return '×';
}

function renderEnvironmentDetails(data) {
  const checks = data?.checks || [];
  const errors = data?.summary?.errors ?? checks.filter((item) => item.status === 'error').length;
  const warnings = data?.summary?.warnings ?? checks.filter((item) => item.status === 'warning').length;
  const commands = [...new Set(checks.flatMap((item) => item.action?.commands || []).map((item) => item.command).filter(Boolean))];

  if (errors) {
    refs.healthActionSummary.textContent = `${errors} required fix${errors === 1 ? '' : 'es'}${warnings ? ` · ${warnings} warning${warnings === 1 ? '' : 's'}` : ''}`;
  } else if (warnings) {
    refs.healthActionSummary.textContent = `Ready to run · ${warnings} warning${warnings === 1 ? '' : 's'}`;
  } else {
    refs.healthActionSummary.textContent = 'Everything required is ready.';
  }

  refs.copyAllFixesBtn.classList.toggle('hidden', !commands.length);
  refs.copyAllFixesBtn.dataset.commands = commands.join('\n');

  refs.healthDetails.innerHTML = checks.map((check) => {
    const action = check.action;
    const commandsHtml = (action?.commands || []).map((entry) => `
      <div class="health-command-row">
        <div class="health-command-copy">
          <span>${escapeHtml(entry.label || 'Command')}</span>
          <code>${escapeHtml(entry.command)}</code>
        </div>
        <button class="copy-command-btn" type="button" data-command="${escapeHtml(entry.command)}" title="Copy command" aria-label="Copy command">⧉</button>
      </div>`).join('');

    return `<div class="health-check-row ${escapeHtml(check.status)}">
      <div class="health-check-main">
        <span class="health-check-icon">${healthStatusIcon(check.status)}</span>
        <div class="health-check-copy">
          <div class="health-check-title"><strong>${escapeHtml(check.label)}</strong><span class="health-status-badge ${escapeHtml(check.status)}">${escapeHtml(check.status)}</span></div>
          <span>${escapeHtml(check.detail || '')}</span>
        </div>
      </div>
      ${action ? `<div class="health-fix-box">
        <div class="health-fix-title">What to do</div>
        <strong>${escapeHtml(action.title || 'Action required')}</strong>
        <p>${escapeHtml(action.description || '')}</p>
        ${commandsHtml || '<span class="health-no-command">No terminal command is required. Follow the instruction above, then run the health check again.</span>'}
      </div>` : ''}
    </div>`;
  }).join('');
}

async function copyText(value, successMessage = 'Copied.') {
  try {
    await navigator.clipboard.writeText(value);
    toast(successMessage);
  } catch {
    const area = document.createElement('textarea');
    area.value = value;
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
    toast(successMessage);
  }
}

async function checkEnvironment() {
  if (refs.baseUrl.value.trim() && !validateBaseUrl({ allowEmpty: true })) {
    toast('Fix the Base URL before checking the target website.', true);
    refs.baseUrl.focus();
    return;
  }
  refs.checkEnvironmentBtn.disabled = true;
  refs.checkEnvironmentBtn.textContent = 'Checking…';
  try {
    const data = await api(`/api/health?target=${encodeURIComponent(refs.baseUrl.value)}`);
    state.environment = data;
    const errors = data.summary?.errors ?? data.checks.filter((item) => item.status === 'error').length;
    const warnings = data.summary?.warnings ?? data.checks.filter((item) => item.status === 'warning').length;
    refs.environmentDot.className = `status-dot ${errors ? 'error' : 'ready'}`;
    refs.environmentSummary.textContent = errors ? `${errors} action${errors === 1 ? '' : 's'} required` : warnings ? `Ready · ${warnings} warning${warnings === 1 ? '' : 's'}` : 'Ready';

    const byKey = Object.fromEntries(data.checks.map((item) => [item.key, item]));
    setHealthMini('Node', byKey.node?.detail || '—', byKey.node?.status);
    setHealthMini('Lighthouse', byKey.lighthouse?.detail || '—', byKey.lighthouse?.status);
    setHealthMini('Browser', byKey.browser?.detail || '—', byKey.browser?.status);
    setHealthMini('Target', byKey.target?.detail || '—', byKey.target?.status);

    renderEnvironmentDetails(data);
    const browserOptions = '<option value="">Auto-detect</option>' + data.browsers.map((browser) => `<option value="${escapeHtml(browser.path)}">${escapeHtml(browser.name)} — ${escapeHtml(browser.version)}</option>`).join('');
    refs.browserSelect.innerHTML = browserOptions;
    if (refs.assetBrowserSelect) refs.assetBrowserSelect.innerHTML = browserOptions;
    toast(data.ready ? (warnings ? `Environment is ready with ${warnings} warning${warnings === 1 ? '' : 's'}.` : 'Environment is ready.') : `Environment needs ${errors} required fix${errors === 1 ? '' : 'es'}.`, !data.ready);
  } catch (error) {
    refs.environmentDot.className = 'status-dot error';
    refs.environmentSummary.textContent = 'Check failed';
    refs.healthActionSummary.textContent = 'The health check could not complete.';
    refs.healthDetails.innerHTML = `<div class="health-check-row error"><div class="health-check-main"><span class="health-check-icon">×</span><div class="health-check-copy"><div class="health-check-title"><strong>Health check failed</strong><span class="health-status-badge error">error</span></div><span>${escapeHtml(error.message)}</span></div></div></div>`;
    refs.copyAllFixesBtn.classList.add('hidden');
    toast(error.message, true);
  } finally {
    refs.checkEnvironmentBtn.disabled = false;
    refs.checkEnvironmentBtn.textContent = 'Run health check';
  }
}

function updateBrowserUi(browser) {
  state.browser = browser;
  const running = Boolean(browser?.running);
  refs.browserBadge.classList.toggle('online', running);
  refs.browserBadge.classList.toggle('offline', !running);
  refs.browserBadgeText.textContent = running ? `${browser.browserName} · port ${browser.port}` : 'Browser offline';
  refs.launchBrowserBtn.disabled = running;
  refs.stopBrowserBtn.disabled = !running;
  refs.startRunBtn.disabled = !running || Boolean(state.activeRunId);
  refs.runState.textContent = running ? (state.mode === 'session' ? 'Session browser ready' : 'Public browser ready') : 'Ready when browser is launched';
}

async function refreshBrowserStatus() {
  try { updateBrowserUi(await api('/api/browser/status')); } catch {}
}

async function launchBrowser() {
  if (!validateProjectSetup()) {
    toast('Complete the required project fields before launching the browser.', true);
    return;
  }
  refs.launchBrowserBtn.disabled = true;
  refs.launchBrowserBtn.textContent = 'Launching…';
  try {
    const browser = await api('/api/browser/start', {
      method: 'POST',
      body: JSON.stringify({
        mode: state.mode,
        projectName: refs.projectName.value,
        baseUrl: refs.baseUrl.value,
        preferredBrowserPath: refs.browserSelect.value || undefined,
        preferredPort: 9222
      })
    });
    updateBrowserUi(browser);
    toast(state.mode === 'session' ? 'Session browser launched. Prepare the required state, then start the report.' : 'Public browser launched.');
  } catch (error) {
    toast(error.message, true);
    await refreshBrowserStatus();
  } finally {
    refs.launchBrowserBtn.textContent = 'Launch browser';
  }
}

async function stopBrowser() {
  try {
    await api('/api/browser/stop', { method: 'POST', body: '{}' });
    updateBrowserUi({ running: false });
    toast('Browser stopped.');
  } catch (error) { toast(error.message, true); }
}

function runConfig() {
  return {
    projectName: refs.projectName.value.trim(),
    baseUrl: refs.baseUrl.value.trim(),
    mode: state.mode,
    targetLanguage: state.targetLanguage,
    defaultLanguage: refs.defaultLanguage.value,
    runsPerPage: Number(refs.runsPerPage.value),
    devices: selectedDevices(),
    categories: selectedCategories(),
    urls: parseUrls(),
    flowScript: refs.flowEnabled.checked ? refs.flowScript.value : ''
  };
}

function resetRunUi() {
  refs.progressBar.style.width = '0%';
  refs.progressPercent.textContent = '0%';
  refs.validCount.textContent = '0';
  refs.redirectCount.textContent = '0';
  refs.failedCount.textContent = '0';
  refs.currentRun.textContent = 'Preparing…';
  refs.resultSummary.classList.add('hidden');
  refs.resultSummary.innerHTML = '';
  refs.liveLog.innerHTML = '';
}

function addLog(message, type = '') {
  if (!message) return;
  const line = document.createElement('div');
  line.className = `log-line ${type}`;
  line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  refs.liveLog.appendChild(line);
  if (refs.liveLog.childElementCount > 800) refs.liveLog.firstElementChild.remove();
  refs.liveLog.scrollTop = refs.liveLog.scrollHeight;
}

function setProgress(current, total) {
  const percent = total ? Math.round((current / total) * 100) : 0;
  refs.progressBar.style.width = `${percent}%`;
  refs.progressPercent.textContent = `${percent}%`;
}

function scoreClass(score) {
  if (score === '' || score == null || !Number.isFinite(Number(score))) return 'na';
  const number = Number(score);
  if (number >= 90) return 'good';
  if (number >= 50) return 'mid';
  return 'low';
}

function formatScore(value) {
  if (value === '' || value == null || !Number.isFinite(Number(value))) return '—';
  return String(Math.round(Number(value) * 100) / 100);
}

function formatMs(value) {
  if (value === '' || value == null || !Number.isFinite(Number(value))) return '—';
  return `${Math.round(Number(value))} ms`;
}

function formatBytes(value) {
  if (value === '' || value == null || !Number.isFinite(Number(value))) return '—';
  const bytes = Number(value);
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${Math.round(bytes)} B`;
}

function reportAssetUrl(reportName, relativeFile) {
  if (!reportName || !relativeFile) return '';
  const encodedFile = String(relativeFile).split('/').map(encodeURIComponent).join('/');
  return `/reports/${encodeURIComponent(reportName)}/${encodedFile}`;
}

function externalLinkIcon() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M19 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6"/></svg>`;
}

const CATEGORY_META = {
  performance: { label: 'Performance', key: 'performance' },
  accessibility: { label: 'Accessibility', key: 'accessibility' },
  'best-practices': { label: 'Best Practices', key: 'bestPractices' },
  seo: { label: 'SEO', key: 'seo' }
};

function humanize(value) {
  return String(value || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function findingStatusLabel(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'issue' || normalized === 'error') return 'Needs attention';
  if (normalized === 'warning') return 'Review';
  if (normalized === 'info') return 'Info';
  if (normalized === 'manual') return 'Manual review';
  return humanize(status);
}

function accordionChevron() {
  return `<span class="accordion-chevron" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="m7 5 5 5-5 5"/></svg></span>`;
}

function renderInsights(insights = {}) {
  const categories = insights.categories || [];
  if (!categories.length) return '';
  return `<div class="insights-section">
    <div class="page-results-head insights-head">
      <div><h4>Important Lighthouse findings</h4><span>Grouped using the same category and audit groups found in the Lighthouse report.</span></div>
    </div>
    <div class="insight-category-list">${categories.map((category) => `
      <section class="insight-category-card">
        <div class="insight-category-title">
          <div><span class="report-type-badge lighthouse">Lighthouse</span><strong>${escapeHtml(category.title)}</strong></div>
          <span class="finding-total ${category.totalFindings ? 'has-findings' : ''}">${category.totalFindings || 0} finding${category.totalFindings === 1 ? '' : 's'}</span>
        </div>
        <div class="insight-group-list">${(category.groups || []).map((group) => `<details class="insight-group-card">
          <summary>
            <div><strong>${escapeHtml(group.title)}</strong><span>${escapeHtml(group.description || `${group.totalChecks || 0} checks`)}</span></div>
            <div class="accordion-summary-actions"><span class="finding-total ${group.findingCount ? 'has-findings' : ''}">${group.findingCount || 0} finding${group.findingCount === 1 ? '' : 's'}</span>${accordionChevron()}</div>
          </summary>
          <div class="insight-findings">${group.findings?.length ? group.findings.map((finding) => `<div class="insight-finding-row">
            <span class="finding-status ${escapeHtml(finding.status)}"><span class="finding-status-dot"></span>${escapeHtml(findingStatusLabel(finding.status))}</span>
            <div>
              <strong>${escapeHtml(finding.title)}</strong>
              <span>${escapeHtml([finding.displayValue, finding.explanation].filter(Boolean).join(' — ') || finding.description || 'Open the full Lighthouse report for the complete audit details.')}</span>
              <small>Affects ${finding.affected.length} page/device result${finding.affected.length === 1 ? '' : 's'}${finding.affected.length ? ` · ${escapeHtml(finding.affected.slice(0, 5).map((item) => `${item.path} (${humanize(item.device)})`).join(', '))}${finding.affected.length > 5 ? '…' : ''}` : ''}</small>
            </div>
          </div>`).join('') : '<div class="insight-empty">No important findings in this group.</div>'}</div>
        </details>`).join('')}</div>
      </section>`).join('')}</div>
  </div>`;
}

function renderSummary(summary, reportName) {
  const normalized = Array.isArray(summary)
    ? { overview: { pageDeviceRows: summary.length }, rows: summary, insights: { categories: [] } }
    : (summary || { overview: {}, rows: [], insights: { categories: [] } });
  const overview = normalized.overview || {};
  const rows = normalized.rows || [];
  const categories = overview.categories?.length ? overview.categories : ['performance', 'accessibility', 'best-practices', 'seo'];
  const base = `/reports/${encodeURIComponent(reportName)}`;
  const scoreCard = (id) => {
    const meta = CATEGORY_META[id];
    if (!meta) return '';
    const value = overview[meta.key];
    return `<div class="final-score-card"><span>${escapeHtml(meta.label)}</span><strong class="score ${scoreClass(value)}">${escapeHtml(formatScore(value))}</strong></div>`;
  };
  const metricCard = (label, value) => `<div class="final-metric-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
  const scoreHeaders = categories.map((id) => `<th>${escapeHtml(CATEGORY_META[id]?.label || humanize(id))}</th>`).join('');
  const scoreCells = (row) => categories.map((id) => {
    const key = CATEGORY_META[id]?.key;
    const value = key ? row[key] : '';
    return `<td class="score ${scoreClass(value)}">${escapeHtml(formatScore(value))}</td>`;
  }).join('');
  const performanceHeaders = categories.includes('performance') ? '<th>LCP</th><th>CLS</th>' : '';
  const performanceCells = (row) => categories.includes('performance')
    ? `<td>${escapeHtml(formatMs(row.lcpMs))}</td><td>${escapeHtml(row.cls === '' || row.cls == null ? '—' : row.cls)}</td>`
    : '';

  refs.resultSummary.innerHTML = `
    <div class="result-header enhanced">
      <div>
        <div class="eyebrow mini">Final Lighthouse summary</div>
        <h4>${escapeHtml(overview.projectName || 'Report completed')}</h4>
        <div class="muted">${escapeHtml(reportName || '')} · ${escapeHtml(categories.map((id) => CATEGORY_META[id]?.label || humanize(id)).join(', '))}</div>
      </div>
      <div class="summary-actions">
        <a class="button button-ghost small" href="${base}/summary.html" target="_blank" rel="noopener">View full summary ${externalLinkIcon()}</a>
        <a class="button button-ghost small" href="${base}/summary.csv" download>Download CSV</a>
        ${overview.exports?.xlsx ? `<a class="button button-secondary small" href="${base}/summary.xlsx" download>Download Excel</a>` : ''}
      </div>
    </div>

    <div class="final-score-grid dynamic" style="--score-columns:${Math.min(categories.length, 4)}">${categories.map(scoreCard).join('')}</div>

    <div class="final-status-grid">
      ${metricCard('Pages', overview.pages ?? '—')}
      ${metricCard('Audits', overview.totalAudits ?? '—')}
      ${metricCard('Valid', overview.validAudits ?? '—')}
      ${metricCard('Redirected', overview.redirectedAudits ?? '—')}
      ${metricCard('Failed', overview.failedAudits ?? '—')}
      ${metricCard('Findings', overview.totalFindings ?? '—')}
    </div>

    ${categories.includes('performance') ? `<div class="final-tech-grid">
      ${metricCard('FCP', formatMs(overview.fcpMs))}
      ${metricCard('LCP', formatMs(overview.lcpMs))}
      ${metricCard('Speed Index', formatMs(overview.speedIndexMs))}
      ${metricCard('TBT', formatMs(overview.tbtMs))}
      ${metricCard('CLS', overview.cls === '' || overview.cls == null ? '—' : overview.cls)}
      ${metricCard('Transfer', formatBytes(overview.totalBytes))}
      ${metricCard('DOM', overview.domElements === '' || overview.domElements == null ? '—' : overview.domElements)}
    </div>` : ''}

    ${renderInsights(normalized.insights)}

    <div class="page-results-head">
      <div><h4>Page results</h4><span>Scores are medians from valid runs. Each page/device row opens a representative full Lighthouse report.</span></div>
    </div>
    <div class="summary-table-wrap">
      <table class="summary-table detailed">
        <thead><tr><th>Page</th><th>Device</th><th>Status</th><th>Runs</th>${scoreHeaders}${performanceHeaders}<th>Findings</th><th>Report</th></tr></thead>
        <tbody>${rows.map((row) => {
          const reportHref = reportAssetUrl(reportName, row.reportFile);
          return `<tr>
            <td><strong class="page-path">${escapeHtml(row.path)}</strong><span class="tested-path">${escapeHtml(row.testedPath || '')}</span></td>
            <td><span class="device-pill">${escapeHtml(row.device)}</span></td>
            <td><span class="run-status ${escapeHtml(row.status || 'no-data')}">${escapeHtml(row.status || 'no-data')}</span></td>
            <td>${escapeHtml(`${row.validRuns ?? 0}/${row.totalRuns ?? 0}`)} <span class="muted">valid</span></td>
            ${scoreCells(row)}${performanceCells(row)}
            <td><span class="finding-count-cell ${row.findingCount ? 'has-findings' : ''}">${row.findingCount || 0}</span></td>
            <td>${reportHref
              ? `<a class="report-open-btn" href="${reportHref}" target="_blank" rel="noopener" title="Open full Lighthouse report">${externalLinkIcon()}<span>Open</span></a>`
              : `<span class="report-open-btn disabled">${externalLinkIcon()}<span>No report</span></span>`}</td>
          </tr>`;
        }).join('')}</tbody>
      </table>
    </div>`;
  refs.resultSummary.classList.remove('hidden');
}
function connectEvents(runId) {
  state.eventSource?.close();
  const source = new EventSource(`/api/runs/${runId}/events`);
  state.eventSource = source;
  source.onmessage = (message) => {
    const event = JSON.parse(message.data);
    if (event.type === 'snapshot') return;
    if (event.type === 'started') {
      addLog(`Started ${event.totalRuns} Lighthouse audits.`, 'event');
      refs.runState.textContent = 'Running';
    } else if (event.type === 'phase') {
      addLog(event.message, 'event');
      refs.currentRun.textContent = event.message;
    } else if (event.type === 'run-start') {
      refs.currentRun.textContent = `${event.device.toUpperCase()} · ${event.path} · run ${event.iteration}`;
      addLog(`Run ${event.current}/${event.total}: ${event.device} ${event.path} (${event.iteration})`, 'event');
      setProgress(event.current - 1, event.total);
    } else if (event.type === 'run-complete') {
      refs.validCount.textContent = event.valid;
      refs.redirectCount.textContent = event.redirected;
      refs.failedCount.textContent = event.failed;
      setProgress(event.current, event.total);
      const type = event.record.status === 'valid' ? 'success' : event.record.status === 'redirected' ? 'warning' : 'error';
      addLog(`${event.record.status.toUpperCase()}: ${event.record.device} ${event.record.path}${event.record.finalUrl ? ` → ${event.record.finalUrl}` : ''}`, type);
    } else if (event.type === 'log') {
      const lines = String(event.message || '').split('\n').filter(Boolean);
      lines.slice(-4).forEach((line) => addLog(line));
    } else if (event.type === 'finished') {
      state.activeRunId = null;
      refs.cancelRunBtn.classList.add('hidden');
      refs.startRunBtn.disabled = !state.browser?.running;
      refs.runState.textContent = event.status === 'completed' ? 'Completed' : 'Cancelled';
      setProgress(1, 1);
      addLog(`Run ${event.status}.`, event.status === 'completed' ? 'success' : 'warning');
      if (event.summary) renderSummary(event.summary, event.reportName);
      source.close();
      loadHistory();
    } else if (event.type === 'error') {
      state.activeRunId = null;
      refs.cancelRunBtn.classList.add('hidden');
      refs.startRunBtn.disabled = !state.browser?.running;
      refs.runState.textContent = 'Failed';
      addLog(event.message, 'error');
      toast(event.message, true);
      source.close();
    }
  };
  source.onerror = () => {};
}

async function startRun() {
  if (!validateRunForm()) {
    toast('Fix the highlighted fields before starting the report.', true);
    return;
  }
  const config = runConfig();
  resetRunUi();
  refs.liveSection.classList.remove('hidden');
  refs.startRunBtn.disabled = true;
  try {
    const job = await api('/api/runs', { method: 'POST', body: JSON.stringify(config) });
    state.activeRunId = job.id;
    refs.cancelRunBtn.classList.remove('hidden');
    connectEvents(job.id);
    toast('Lighthouse run started.');
  } catch (error) {
    refs.startRunBtn.disabled = !state.browser?.running;
    toast(error.message, true);
  }
}

async function cancelRun() {
  if (!state.activeRunId) return;
  try {
    await api(`/api/runs/${state.activeRunId}/cancel`, { method: 'POST', body: '{}' });
    refs.runState.textContent = 'Cancelling…';
    addLog('Cancellation requested.', 'warning');
  } catch (error) { toast(error.message, true); }
}

function updateHistorySelectionUi() {
  const checkboxes = $$('.history-report-check');
  const availableNames = new Set(checkboxes.map((input) => input.value));
  state.selectedReports = new Set([...state.selectedReports].filter((name) => availableNames.has(name)));
  checkboxes.forEach((input) => { input.checked = state.selectedReports.has(input.value); });
  const selected = state.selectedReports.size;
  refs.selectedReportsCount.textContent = `${selected} selected`;
  refs.deleteSelectedReportsBtn.disabled = selected === 0;
  refs.selectAllReports.checked = checkboxes.length > 0 && selected === checkboxes.length;
  refs.selectAllReports.indeterminate = selected > 0 && selected < checkboxes.length;
}

function closeDeleteModal() {
  state.pendingDeleteReports = [];
  refs.deleteModal.classList.remove('show');
  refs.deleteModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  refs.confirmDeleteBtn.disabled = false;
  refs.confirmDeleteBtn.textContent = 'Delete report';
}

function requestDeleteReports(names) {
  const unique = [...new Set(names)].filter(Boolean);
  if (!unique.length) return;
  state.pendingDeleteReports = unique;
  const many = unique.length > 1;
  refs.deleteModalTitle.textContent = many ? `Delete ${unique.length} reports?` : 'Delete this report?';
  refs.deleteModalMessage.textContent = many
    ? `${unique.length} complete report folders will be permanently removed.`
    : 'The complete report folder will be permanently removed.';
  refs.confirmDeleteBtn.textContent = many ? `Delete ${unique.length} reports` : 'Delete report';
  refs.deleteModal.classList.add('show');
  refs.deleteModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  setTimeout(() => refs.cancelDeleteBtn.focus(), 20);
}

async function confirmDeleteReports() {
  const unique = [...state.pendingDeleteReports];
  if (!unique.length) return closeDeleteModal();
  refs.confirmDeleteBtn.disabled = true;
  refs.confirmDeleteBtn.textContent = 'Deleting…';
  try {
    const result = await api('/api/reports/delete', { method: 'POST', body: JSON.stringify({ names: unique }) });
    result.deleted?.forEach((name) => state.selectedReports.delete(name));
    closeDeleteModal();
    toast(`${result.deleted?.length || 0} report folder${result.deleted?.length === 1 ? '' : 's'} deleted.`);
    await loadHistory();
  } catch (error) {
    refs.confirmDeleteBtn.disabled = false;
    refs.confirmDeleteBtn.textContent = unique.length > 1 ? `Delete ${unique.length} reports` : 'Delete report';
    toast(error.message, true);
  }
}

async function loadHistory() {
  try {
    const reports = await api('/api/reports');
    refs.historyList.innerHTML = reports.length ? reports.map((report) => {
      const overview = report.overview || {};
      const reportType = report.reportType || 'unknown';
      const scoreParts = [];
      if (overview.performance !== '' && overview.performance != null) scoreParts.push(`Performance ${formatScore(overview.performance)}`);
      if (overview.accessibility !== '' && overview.accessibility != null) scoreParts.push(`Accessibility ${formatScore(overview.accessibility)}`);
      if (overview.seo !== '' && overview.seo != null) scoreParts.push(`SEO ${formatScore(overview.seo)}`);
      if (reportType === 'security-compliance') {
        if (overview.securityAttention != null) scoreParts.push(`${overview.securityAttention} attention`);
        if (overview.securityPassed != null) scoreParts.push(`${overview.securityPassed} passed`);
      }
      if (reportType === 'asset-page-weight') {
        if (overview.pages != null) scoreParts.push(`${overview.pages} page${overview.pages === 1 ? '' : 's'}`);
        if (overview.assetAverageBytes != null) scoreParts.push(`Avg ${formatBytes(overview.assetAverageBytes)}`);
        if (overview.assetAverageRequests != null) scoreParts.push(`${Math.round(Number(overview.assetAverageRequests))} req/page`);
      }
      const scoreText = scoreParts.join(' · ');
      return `
        <div class="history-item upgraded" data-report-name="${escapeHtml(report.name)}">
          <label class="history-check-wrap" title="Select report"><input class="history-report-check" type="checkbox" value="${escapeHtml(report.name)}" /><span class="ui-checkbox" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="m5 10 3 3 7-7"/></svg></span></label>
          <div class="history-info">
            <div class="history-title-line"><span class="report-type-badge ${escapeHtml(reportType)}">${escapeHtml(humanize(reportType))}</span><strong>${escapeHtml(report.name)}</strong></div>
            <span>${new Date(report.modifiedAt).toLocaleString()}${scoreText ? ` · ${escapeHtml(scoreText)}` : ''}</span>
          </div>
          <div class="history-actions">
            ${report.summaryHref ? `<a href="${report.summaryHref}" target="_blank" rel="noopener">View report ${externalLinkIcon()}</a>` : ''}
            ${report.csvHref ? `<a href="${report.csvHref}" download>CSV</a>` : ''}
            ${report.xlsxHref ? `<a class="primary" href="${report.xlsxHref}" download>Excel</a>` : ''}
            <button class="history-delete-btn" type="button" data-delete-report="${escapeHtml(report.name)}" title="Delete report folder">Delete</button>
          </div>
        </div>`;
    }).join('') : '<div class="empty-state">No reports have been generated yet.</div>';
    updateHistorySelectionUi();
  } catch (error) {
    refs.historyList.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
  }
}


function projectEnvironmentUrl(project) {
  if (!project) return '';
  if (project.activeEnvironment === 'production') return project.productionUrl || project.testingUrl || '';
  return project.testingUrl || project.productionUrl || '';
}

function currentProject() {
  return state.projects.find((project) => project.id === state.activeProjectId) || null;
}

function syncSharedProjectToTools(project, { overwrite = true } = {}) {
  if (!project) return;
  const baseUrl = projectEnvironmentUrl(project);
  const paths = (project.paths || []).join('\n');
  const set = (ref, value) => { if (ref && (overwrite || !String(ref.value || '').trim())) ref.value = value || ''; };

  set(refs.projectName, project.name);
  set(refs.baseUrl, baseUrl);
  if (project.defaultLanguage && refs.defaultLanguage) refs.defaultLanguage.value = project.defaultLanguage;
  if (overwrite || paths) set(refs.urls, paths);

  set(refs.securityProjectName, project.name);
  set(refs.securityTargetUrl, baseUrl);

  set(refs.assetProjectName, project.name);
  set(refs.assetBaseUrl, baseUrl);
  if (overwrite || paths) set(refs.assetPaths, paths);

  updateEstimate();
  updateRoutingPreview();
}

function renderProjectWorkspace() {
  const active = currentProject();
  refs.projectCount.textContent = `${state.projects.length} project${state.projects.length === 1 ? '' : 's'}`;

  if (active) {
    const baseUrl = projectEnvironmentUrl(active);
    refs.activeProjectMini.className = 'active-project-mini ready';
    refs.activeProjectMini.innerHTML = `<span>${escapeHtml(active.name)}</span><small>${escapeHtml(humanize(active.activeEnvironment))} · ${escapeHtml(baseUrl || 'No URL')}</small>`;
    refs.activeProjectCard.className = 'active-project-card';
    refs.activeProjectCard.innerHTML = `
      <div><strong>${escapeHtml(active.name)}</strong><span>${escapeHtml(baseUrl || 'No active environment URL')}</span></div>
      <div class="active-project-details">
        <span class="project-chip primary">${escapeHtml(humanize(active.activeEnvironment))}</span>
        <span class="project-chip">Default ${escapeHtml(String(active.defaultLanguage || 'en').toUpperCase())}</span>
        <span class="project-chip">${(active.paths || []).length} shared page${(active.paths || []).length === 1 ? '' : 's'}</span>
      </div>`;
  } else {
    refs.activeProjectMini.className = 'active-project-mini';
    refs.activeProjectMini.innerHTML = '<span>No active project</span><small>Create or select a shared project</small>';
    refs.activeProjectCard.className = 'active-project-card empty';
    refs.activeProjectCard.innerHTML = '<div><strong>No active project</strong><span>Create a project profile or select one from the list below.</span></div>';
  }

  refs.projectsList.innerHTML = state.projects.length ? state.projects.map((project) => {
    const baseUrl = projectEnvironmentUrl(project);
    const activeBadge = project.id === state.activeProjectId ? '<span class="project-active-badge">Active</span>' : '';
    return `<article class="project-list-item ${project.id === state.activeProjectId ? 'active' : ''}" data-project-id="${escapeHtml(project.id)}">
      <div class="project-list-copy">
        <div class="project-list-title"><strong>${escapeHtml(project.name)}</strong>${activeBadge}</div>
        <span>${escapeHtml(humanize(project.activeEnvironment))}: ${escapeHtml(baseUrl || '—')} · ${(project.languages || []).map((lang) => String(lang).toUpperCase()).join(', ')} · ${(project.paths || []).length} shared pages</span>
      </div>
      <div class="project-list-actions">
        ${project.id === state.activeProjectId ? '' : `<button class="button button-secondary small" type="button" data-use-project="${escapeHtml(project.id)}">Use project</button>`}
        <button class="button button-ghost small" type="button" data-edit-project="${escapeHtml(project.id)}">Edit</button>
        <button class="history-delete-btn" type="button" data-delete-project="${escapeHtml(project.id)}">Delete</button>
      </div>
    </article>`;
  }).join('') : '<div class="empty-state">No projects yet. Create the first shared project profile.</div>';
}

async function loadProjects({ sync = false } = {}) {
  try {
    const data = await api('/api/projects');
    state.projects = data.projects || [];
    state.activeProjectId = data.activeProjectId || '';
    renderProjectWorkspace();
    if (sync && currentProject()) syncSharedProjectToTools(currentProject(), { overwrite: false });
  } catch (error) {
    refs.projectsList.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
  }
}

function clearProjectEditor() {
  refs.projectEditId.value = '';
  refs.projectEditorTitle.textContent = 'Create project';
  refs.sharedProjectName.value = '';
  refs.projectTestingUrl.value = '';
  refs.projectProductionUrl.value = '';
  refs.projectEnvironment.value = 'testing';
  refs.projectDefaultLanguage.value = 'en';
  refs.projectLangEn.checked = true;
  refs.projectLangAr.checked = false;
  refs.projectPaths.value = '';
  refs.saveProjectBtn.textContent = 'Save project';
  refs.cancelProjectEditBtn.classList.add('hidden');
  setFieldError(refs.sharedProjectNameField, refs.sharedProjectNameError, '');
  setFieldError(refs.projectTestingUrlField, refs.projectTestingUrlError, '');
  setFieldError(refs.projectProductionUrlField, refs.projectProductionUrlError, '');
}

function editProject(id) {
  const project = state.projects.find((item) => item.id === id);
  if (!project) return;
  refs.projectEditId.value = project.id;
  refs.projectEditorTitle.textContent = 'Edit project';
  refs.sharedProjectName.value = project.name || '';
  refs.projectTestingUrl.value = project.testingUrl || '';
  refs.projectProductionUrl.value = project.productionUrl || '';
  refs.projectEnvironment.value = project.activeEnvironment || 'testing';
  refs.projectDefaultLanguage.value = project.defaultLanguage || 'en';
  refs.projectLangEn.checked = (project.languages || []).includes('en');
  refs.projectLangAr.checked = (project.languages || []).includes('ar');
  refs.projectPaths.value = (project.paths || []).join('\n');
  refs.saveProjectBtn.textContent = 'Update project';
  refs.cancelProjectEditBtn.classList.remove('hidden');
  refs.projectEditorCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function validateProjectEditor() {
  const name = refs.sharedProjectName.value.trim();
  let testingError = '', productionError = '';
  const validateOptionalUrl = (value) => {
    if (!value.trim()) return '';
    try { const parsed = new URL(value.trim()); return ['http:', 'https:'].includes(parsed.protocol) ? '' : 'Use http:// or https://.'; }
    catch { return 'Enter a valid URL.'; }
  };
  testingError = validateOptionalUrl(refs.projectTestingUrl.value);
  productionError = validateOptionalUrl(refs.projectProductionUrl.value);
  const nameError = !name ? 'Project name is required.' : name.length < 2 ? 'Project name must contain at least 2 characters.' : '';
  if (!refs.projectTestingUrl.value.trim() && !refs.projectProductionUrl.value.trim()) testingError = 'Add a Testing URL or Production URL.';
  setFieldError(refs.sharedProjectNameField, refs.sharedProjectNameError, nameError);
  setFieldError(refs.projectTestingUrlField, refs.projectTestingUrlError, testingError);
  setFieldError(refs.projectProductionUrlField, refs.projectProductionUrlError, productionError);
  if (!refs.projectLangEn.checked && !refs.projectLangAr.checked) {
    toast('Select at least one project language.', true);
    return false;
  }
  return !nameError && !testingError && !productionError;
}

async function saveProject() {
  if (!validateProjectEditor()) return;
  const body = {
    name: refs.sharedProjectName.value.trim(),
    testingUrl: refs.projectTestingUrl.value.trim(),
    productionUrl: refs.projectProductionUrl.value.trim(),
    activeEnvironment: refs.projectEnvironment.value,
    defaultLanguage: refs.projectDefaultLanguage.value,
    languages: [refs.projectLangEn.checked && 'en', refs.projectLangAr.checked && 'ar'].filter(Boolean),
    paths: refs.projectPaths.value.split('\n').map((value) => value.trim()).filter(Boolean)
  };
  refs.saveProjectBtn.disabled = true;
  try {
    const id = refs.projectEditId.value;
    const project = await api(id ? `/api/projects/${encodeURIComponent(id)}` : '/api/projects', { method: id ? 'PUT' : 'POST', body: JSON.stringify(body) });
    if (!id || state.activeProjectId === id) await api('/api/projects/active', { method: 'POST', body: JSON.stringify({ id: project.id }) });
    clearProjectEditor();
    await loadProjects();
    if (currentProject()) syncSharedProjectToTools(currentProject());
    toast(id ? 'Project updated.' : 'Project created and activated.');
  } catch (error) { toast(error.message, true); }
  finally { refs.saveProjectBtn.disabled = false; }
}

async function setActiveProject(id) {
  try {
    const data = await api('/api/projects/active', { method: 'POST', body: JSON.stringify({ id }) });
    state.projects = data.projects || [];
    state.activeProjectId = data.activeProjectId || '';
    renderProjectWorkspace();
    syncSharedProjectToTools(currentProject());
    toast('Active project applied across tools.');
  } catch (error) { toast(error.message, true); }
}

function requestDeleteProject(id) {
  const project = state.projects.find((item) => item.id === id);
  if (!project) return;
  state.pendingProjectDeleteId = id;
  refs.projectDeleteModalMessage.textContent = `Delete the saved project profile "${project.name}"?`;
  refs.projectDeleteModal.classList.add('show');
  refs.projectDeleteModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  setTimeout(() => refs.cancelProjectDeleteBtn.focus(), 20);
}

function closeProjectDeleteModal() {
  state.pendingProjectDeleteId = '';
  refs.projectDeleteModal.classList.remove('show');
  refs.projectDeleteModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  refs.confirmProjectDeleteBtn.disabled = false;
  refs.confirmProjectDeleteBtn.textContent = 'Delete project';
}

async function confirmDeleteProject() {
  const id = state.pendingProjectDeleteId;
  const project = state.projects.find((item) => item.id === id);
  if (!id || !project) return closeProjectDeleteModal();
  refs.confirmProjectDeleteBtn.disabled = true;
  refs.confirmProjectDeleteBtn.textContent = 'Deleting…';
  try {
    await api(`/api/projects/${encodeURIComponent(id)}`, { method: 'DELETE' });
    closeProjectDeleteModal();
    await loadProjects();
    if (currentProject()) syncSharedProjectToTools(currentProject());
    toast(`Project "${project.name}" deleted.`);
  } catch (error) {
    refs.confirmProjectDeleteBtn.disabled = false;
    refs.confirmProjectDeleteBtn.textContent = 'Delete project';
    toast(error.message, true);
  }
}

function validateAssetForm() {
  const project = refs.assetProjectName.value.trim();
  const base = refs.assetBaseUrl.value.trim();
  const paths = refs.assetPaths.value.split('\n').map((value) => value.trim()).filter(Boolean);
  const projectMessage = !project ? 'Project name is required.' : project.length < 2 ? 'Project name must contain at least 2 characters.' : '';
  let baseMessage = '';
  if (!base) baseMessage = 'Base URL is required.';
  else { try { const parsed = new URL(base); if (!['http:', 'https:'].includes(parsed.protocol)) baseMessage = 'Use http:// or https://.'; } catch { baseMessage = 'Enter a valid Base URL.'; } }
  let pathMessage = '';
  if (!paths.length) pathMessage = 'Add at least one page to analyze.';
  else if (paths.length > 30) pathMessage = 'Analyze up to 30 pages per report.';
  else {
    const bad = paths.findIndex((value) => !value.startsWith('/') && !/^https?:\/\//i.test(value));
    if (bad >= 0) pathMessage = `Line ${bad + 1} must start with / or be a full http(s) URL.`;
  }
  setFieldError(refs.assetProjectField, refs.assetProjectError, projectMessage);
  setFieldError(refs.assetBaseUrlField, refs.assetBaseUrlError, baseMessage);
  setFieldError(refs.assetPathsField, refs.assetPathsError, pathMessage);
  return !projectMessage && !baseMessage && !pathMessage;
}

function renderAssetResults(result) {
  const summary = result.summary || {};
  const breakdown = Object.entries(summary.breakdown || {}).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...breakdown.map(([, value]) => Number(value) || 0), 1);
  const pages = result.pages || [];
  const findings = result.findings || [];
  const largest = result.largestAssets || [];
  const highCount = findings.filter((finding) => finding.severity === 'high').length;

  refs.assetResults.innerHTML = `
    <div class="asset-result-header">
      <div><span class="eyebrow mini">Asset & Page-Weight Analyzer</span><h4>${escapeHtml(result.projectName)}</h4><span>${escapeHtml(result.baseUrl)} · ${escapeHtml(humanize(result.device))}</span></div>
      <span class="asset-health-badge ${highCount ? '' : 'good'}">${highCount ? `${highCount} high-priority finding${highCount === 1 ? '' : 's'}` : 'No high-priority thresholds'}</span>
    </div>
    <div class="asset-summary-grid">
      <div class="asset-summary-card"><span>Pages analyzed</span><strong>${summary.pageCount || 0}</strong><small>Fresh context per page</small></div>
      <div class="asset-summary-card"><span>Average page weight</span><strong>${formatBytes(summary.averageBytes)}</strong><small>${formatBytes(summary.totalBytes)} total transfer</small></div>
      <div class="asset-summary-card"><span>Average requests</span><strong>${Math.round(Number(summary.averageRequests) || 0)}</strong><small>${summary.totalRequests || 0} total requests</small></div>
      <div class="asset-summary-card"><span>Third-party transfer</span><strong>${formatBytes(summary.thirdPartyBytes)}</strong><small>${summary.totalBytes ? Math.round(summary.thirdPartyBytes / summary.totalBytes * 100) : 0}% of transfer</small></div>
    </div>
    <div class="asset-section-title"><div><h4>Resource breakdown</h4><span>Total transferred bytes across analyzed pages.</span></div></div>
    <div class="asset-breakdown">${breakdown.map(([type, bytes]) => `<div class="asset-breakdown-row"><span>${escapeHtml(humanize(type))}</span><div class="asset-breakdown-track"><i style="width:${Math.max(2, Number(bytes) / max * 100)}%"></i></div><strong>${escapeHtml(formatBytes(bytes))}</strong></div>`).join('')}</div>
    <div class="asset-section-title"><div><h4>Page results</h4><span>Compare page weight and the resource categories that contribute most.</span></div></div>
    <div class="asset-table-wrap"><table class="asset-table"><thead><tr><th>Page</th><th>Status</th><th>Weight</th><th>Requests</th><th>JavaScript</th><th>Images</th><th>Third-party</th><th>Findings</th></tr></thead><tbody>${pages.map((page) => `<tr><td><strong>${escapeHtml(new URL(page.finalUrl).pathname || '/')}</strong><span title="${escapeHtml(page.finalUrl)}">${escapeHtml(page.finalUrl)}</span></td><td>${escapeHtml(String(page.status || '—'))}</td><td><strong>${escapeHtml(formatBytes(page.totalTransferBytes))}</strong></td><td>${page.requestCount}</td><td>${escapeHtml(formatBytes(page.breakdown?.script))}</td><td>${escapeHtml(formatBytes(page.breakdown?.image))}</td><td>${escapeHtml(formatBytes(page.thirdPartyBytes))}</td><td>${page.findings?.length || 0}</td></tr>`).join('')}</tbody></table></div>
    <div class="asset-section-title"><div><h4>Optimization findings</h4><span>Practical thresholds highlight the areas most worth reviewing first.</span></div></div>
    <div class="asset-findings">${findings.length ? findings.map((finding) => `<article class="asset-finding"><span class="asset-priority ${escapeHtml(finding.severity)}">${escapeHtml(finding.severity === 'high' ? 'High priority' : finding.severity === 'medium' ? 'Review' : 'Opportunity')}</span><div class="asset-finding-copy"><strong>${escapeHtml(finding.title)}</strong><p>${escapeHtml(finding.detail)}</p><small>${escapeHtml(finding.recommendation)}</small></div></article>`).join('') : '<div class="asset-empty">No page-weight thresholds were triggered by this scan.</div>'}</div>
    <div class="asset-section-title"><div><h4>Largest transferred assets</h4><span>The heaviest individual resources across all analyzed pages.</span></div></div>
    <div class="asset-table-wrap"><table class="asset-table"><thead><tr><th>Type</th><th>Asset</th><th>Size</th><th>Host</th><th>Page</th></tr></thead><tbody>${largest.slice(0, 15).map((asset) => `<tr><td><span class="asset-type-pill">${escapeHtml(humanize(asset.category))}</span></td><td><strong title="${escapeHtml(asset.url)}">${escapeHtml(asset.url.split('/').pop() || asset.url)}</strong><span title="${escapeHtml(asset.url)}">${escapeHtml(asset.url)}</span></td><td><strong>${escapeHtml(formatBytes(asset.transferBytes))}</strong></td><td>${escapeHtml(asset.host)}</td><td><span title="${escapeHtml(asset.pageUrl)}">${escapeHtml(new URL(asset.pageUrl).pathname || '/')}</span></td></tr>`).join('')}</tbody></table></div>`;

  refs.assetResultActions.innerHTML = `
    <a class="button button-ghost small" href="${result.summaryHref}" target="_blank" rel="noopener">Open report ↗</a>
    <a class="button button-ghost small" href="${result.csvHref}" download>CSV</a>
    <a class="button button-secondary small" href="${result.xlsxHref}" download>Excel</a>`;
  refs.assetResultsCard.classList.remove('hidden');
  refs.assetResultsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function runAssetAnalysis() {
  if (!validateAssetForm()) { toast('Fix the highlighted fields before running the analysis.', true); return; }
  refs.startAssetAnalysisBtn.disabled = true;
  refs.startAssetAnalysisBtn.textContent = 'Analyzing…';
  refs.assetScanState.className = 'security-scan-state running';
  refs.assetScanState.innerHTML = '<span class="security-spinner"></span><div><strong>Loading pages…</strong><small>Measuring network transfer with cache disabled.</small></div>';
  try {
    const result = await api('/api/assets/analyze', {
      method: 'POST',
      body: JSON.stringify({
        projectName: refs.assetProjectName.value.trim(),
        baseUrl: refs.assetBaseUrl.value.trim(),
        paths: refs.assetPaths.value.split('\n').map((value) => value.trim()).filter(Boolean),
        device: state.assetDevice,
        preferredBrowserPath: refs.assetBrowserSelect.value || undefined
      })
    });
    renderAssetResults(result);
    refs.assetScanState.className = 'security-scan-state success';
    refs.assetScanState.innerHTML = `<span class="security-state-dot"></span><div><strong>Analysis completed</strong><small>${result.summary?.pageCount || 0} pages · ${escapeHtml(formatBytes(result.summary?.totalBytes))} transferred.</small></div>`;
    toast('Asset & page-weight report generated.');
    loadHistory();
  } catch (error) {
    refs.assetScanState.className = 'security-scan-state error';
    refs.assetScanState.innerHTML = `<span class="security-state-dot"></span><div><strong>Analysis failed</strong><small>${escapeHtml(error.message)}</small></div>`;
    toast(error.message, true);
  } finally {
    refs.startAssetAnalysisBtn.disabled = false;
    refs.startAssetAnalysisBtn.textContent = 'Analyze page weight';
  }
}

function selectedSecurityFrameworks() {
  return $$('.securityFrameworkCheck').filter((input) => input.checked).map((input) => input.value);
}

function syncSecurityFrameworks() {
  const checks = $$('.securityFrameworkCheck');
  const count = checks.filter((input) => input.checked).length;
  if (refs.allSecurityFrameworks) {
    refs.allSecurityFrameworks.checked = count === checks.length;
    refs.allSecurityFrameworks.indeterminate = count > 0 && count < checks.length;
  }
  if (refs.securityFrameworkCount) refs.securityFrameworkCount.textContent = `${count} selected`;
}

function setSecurityFieldError(field, errorRef, message = '') {
  field?.classList.toggle('has-error', Boolean(message));
  if (errorRef) errorRef.textContent = message;
  return !message;
}

function validateSecurityScan() {
  const project = refs.securityProjectName?.value.trim() || '';
  const target = refs.securityTargetUrl?.value.trim() || '';
  const projectOk = setSecurityFieldError(refs.securityProjectField, refs.securityProjectError,
    !project ? 'Project name is required.' : project.length < 2 ? 'Project name must contain at least 2 characters.' : '');
  let urlMessage = '';
  if (!target) urlMessage = 'Website URL is required.';
  else {
    try {
      const parsed = new URL(target);
      if (!['http:', 'https:'].includes(parsed.protocol)) urlMessage = 'Use an http:// or https:// URL.';
    } catch { urlMessage = 'Enter a valid website URL, for example https://example.com.'; }
  }
  const urlOk = setSecurityFieldError(refs.securityUrlField, refs.securityUrlError, urlMessage);
  const frameworkCount = selectedSecurityFrameworks().length;
  if (refs.securityFrameworkError) refs.securityFrameworkError.textContent = frameworkCount ? '' : 'Select at least one compliance framework.';
  refs.securityFrameworksField?.classList.toggle('has-error', !frameworkCount);
  return projectOk && urlOk && frameworkCount > 0;
}

function securityStatusLabel(status) {
  return ({ pass: 'Passed', warning: 'Review', fail: 'Needs attention', manual: 'Manual review', info: 'Info' })[status] || humanize(status);
}

function renderSecurityResults(result) {
  const totals = result.totals || {};
  const frameworks = (result.frameworkResults || []).map((framework) => `
    <div class="security-framework-result">
      <div class="framework-result-head"><span>${escapeHtml(framework.label)}</span><strong>${framework.applicable === false ? 'Not indicated' : 'Evidence'}</strong></div>
      <small>${escapeHtml(framework.note || '')}</small>
      <ul>
        ${(framework.publicEvidence || []).slice(0, 4).map((item) => `<li class="observed">✓ ${escapeHtml(item)}</li>`).join('')}
        ${(framework.technicalControls || []).slice(0, 4).map((item) => `<li class="observed">✓ ${escapeHtml(item)}</li>`).join('')}
        ${(framework.missingEvidence || []).slice(0, 5).map((item) => `<li class="missing">⚠ ${escapeHtml(item)}</li>`).join('')}
      </ul>
      <small>${escapeHtml(framework.certification || 'No public certification proof was verified by this website scan.')}</small>
    </div>`).join('');

  const grouped = new Map();
  for (const check of result.checks || []) {
    if (!grouped.has(check.category)) grouped.set(check.category, []);
    grouped.get(check.category).push(check);
  }
  const groups = [...grouped.entries()].map(([category, checks]) => {
    const attention = checks.filter((item) => ['fail', 'warning'].includes(item.status)).length;
    return `<details class="security-finding-group">
      <summary>
        <div><strong>${escapeHtml(category)}</strong><span>${checks.length} checks${attention ? ` · ${attention} need review` : ''}</span></div>
        <span class="security-chevron"><svg viewBox="0 0 20 20"><path d="m6 8 4 4 4-4"/></svg></span>
      </summary>
      <div class="security-finding-list">${checks.map((check) => `
        <article class="security-finding">
          <span class="security-status ${escapeHtml(check.status)}"><i></i>${escapeHtml(securityStatusLabel(check.status))}</span>
          <div class="security-finding-copy">
            <h5>${escapeHtml(check.title)}</h5>
            <p>${escapeHtml(check.summary)}</p>
            <small>${escapeHtml(check.severity ? `Severity: ${check.severity}` : 'Severity: informational')}${check.affectedUrl ? ` · ${escapeHtml(check.affectedUrl)}` : ''}</small>
            ${check.details ? `<small>${escapeHtml(check.details)}</small>` : ''}
            ${check.evidence ? `<small>${escapeHtml(check.evidence)}</small>` : ''}
            ${(check.evidenceItems || []).map((item) => `<small><strong>Evidence:</strong> ${escapeHtml(item.sourceUrl)} · ${escapeHtml(item.evidenceText)}</small>`).join('')}
            ${check.recommendation ? `<div class="security-recommendation"><strong>Recommendation</strong><span>${escapeHtml(check.recommendation)}</span></div>` : ''}
            ${(check.references || []).length ? `<div class="security-recommendation"><strong>References</strong><span>${(check.references || []).map((ref) => `<a href="${escapeHtml(ref)}" target="_blank" rel="noopener">${escapeHtml(ref)}</a>`).join('<br>')}</span></div>` : ''}
          </div>
        </article>`).join('')}</div>
    </details>`;
  }).join('');

  const crawl = result.crawl;
  const crawlSection = crawl && Array.isArray(crawl.pages) && crawl.pages.length ? `
    <div class="security-section-title"><div><h4>Crawled evidence pages</h4><span>${crawl.pages.filter((p) => p.found).length} of ${crawl.pages.length} candidate page(s) found while looking for privacy, security and compliance pages.</span></div></div>
    <details class="security-finding-group">
      <summary>
        <div><strong>Crawl results</strong><span>${crawl.pages.length} URLs checked</span></div>
        <span class="security-chevron"><svg viewBox="0 0 20 20"><path d="m6 8 4 4 4-4"/></svg></span>
      </summary>
      <div class="security-finding-list">${crawl.pages.map((p) => `
        <article class="security-finding">
          <span class="security-status ${p.found ? 'pass' : 'manual'}"><i></i>${p.found ? `HTTP ${p.status}` : 'Not found'}</span>
          <div class="security-finding-copy">
            <h5>${escapeHtml(p.url)}</h5>
            ${p.groups && p.groups.length ? `<small>${escapeHtml(p.groups.join(', '))}</small>` : ''}
            ${p.error ? `<small>${escapeHtml(p.error)}</small>` : ''}
          </div>
        </article>`).join('')}</div>
    </details>` : (crawl && crawl.error ? `<div class="security-disclaimer"><strong>Evidence crawl:</strong> ${escapeHtml(crawl.error)}</div>` : '');

  refs.securityResults.innerHTML = `
    <div class="security-result-header">
      <div><div class="eyebrow mini">${escapeHtml(result.projectName)}</div><h4>${escapeHtml(result.finalUrl)}</h4><span>HTTP ${escapeHtml(result.responseStatus)} · ${new Date(result.generatedAt).toLocaleString()}</span></div>
      <span class="security-overall ${escapeHtml(result.overallStatus)}">${result.riskCount ? `${result.riskCount} item${result.riskCount === 1 ? '' : 's'} need attention` : 'No automated issues detected'}</span>
    </div>
    <div class="security-score-grid">
      <div class="security-score-card pass"><span>Passed</span><strong>${totals.pass || 0}</strong></div>
      <div class="security-score-card warning"><span>Review</span><strong>${totals.warning || 0}</strong></div>
      <div class="security-score-card fail"><span>Needs attention</span><strong>${totals.fail || 0}</strong></div>
      <div class="security-score-card manual"><span>Manual review</span><strong>${totals.manual || 0}</strong></div>
    </div>
    <div class="security-disclaimer"><strong>Scope:</strong> ${escapeHtml(result.disclaimer)}</div>
    <div class="security-section-title"><div><h4>Compliance evidence</h4><span>Public website evidence and technical controls only. No compliance percentages or certification claims are produced.</span></div></div>
    <div class="security-framework-results">${frameworks}</div>
    <div class="security-section-title"><div><h4>Technical findings</h4><span>Groups are closed by default. Open a group to review evidence and recommendations.</span></div></div>
    <div class="security-findings">${groups}</div>
    ${crawlSection}`;

  refs.securityResultActions.innerHTML = `
    <a class="button button-ghost small" href="${result.summaryHref}" target="_blank" rel="noopener">Open report ↗</a>
    <a class="button button-ghost small" href="${result.csvHref}" download>CSV</a>
    <a class="button button-secondary small" href="${result.xlsxHref}" download>Excel</a>`;
  refs.securityResultsCard.classList.remove('hidden');
  refs.securityResultsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function runSecurityScan() {
  if (!validateSecurityScan()) {
    toast('Fix the highlighted fields before running the scan.', true);
    return;
  }
  refs.startSecurityScanBtn.disabled = true;
  refs.startSecurityScanBtn.textContent = 'Scanning…';
  refs.securityScanState.className = 'security-scan-state running';
  refs.securityScanState.innerHTML = '<span class="security-spinner"></span><div><strong>Scanning website…</strong><small>Checking transport, headers, cookies and page signals.</small></div>';
  try {
    const result = await api('/api/security/scan', {
      method: 'POST',
      body: JSON.stringify({
        projectName: refs.securityProjectName.value.trim(),
        targetUrl: refs.securityTargetUrl.value.trim(),
        jurisdiction: refs.securityJurisdiction.value.trim(),
        frameworks: selectedSecurityFrameworks(),
        crawl: refs.securityCrawlEnabled ? refs.securityCrawlEnabled.checked : true,
        maxCrawlPages: refs.securityMaxPages ? Number(refs.securityMaxPages.value) || 10 : 10
      })
    });
    renderSecurityResults(result);
    refs.securityScanState.className = 'security-scan-state success';
    refs.securityScanState.innerHTML = `<span class="security-state-dot"></span><div><strong>Scan completed</strong><small>${result.totals?.pass || 0} passed · ${(result.totals?.fail || 0) + (result.totals?.warning || 0)} need attention/review.</small></div>`;
    toast('Security & compliance report generated.');
    loadHistory();
  } catch (error) {
    refs.securityScanState.className = 'security-scan-state error';
    refs.securityScanState.innerHTML = `<span class="security-state-dot"></span><div><strong>Scan failed</strong><small>${escapeHtml(error.message)}</small></div>`;
    toast(error.message, true);
  } finally {
    refs.startSecurityScanBtn.disabled = false;
    refs.startSecurityScanBtn.textContent = 'Run security scan';
  }
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[char]));
}

setSegment('#modeSelector .segment', 'public', (value) => {
  state.mode = value;
  updateEstimate();
});
setSegment('#languageSelector .segment', 'en', (value) => {
  state.targetLanguage = value;
  updateRoutingPreview();
});
setSegment('#assetDeviceSelector .segment', 'desktop', (value) => {
  state.assetDevice = value;
});

const savedDefaultLanguage = localStorage.getItem('lighthouseReporter.websiteDefaultLanguage');
if (savedDefaultLanguage && ['en', 'ar'].includes(savedDefaultLanguage)) {
  refs.defaultLanguage.value = savedDefaultLanguage;
}

refs.defaultLanguage.addEventListener('change', () => {
  localStorage.setItem('lighthouseReporter.websiteDefaultLanguage', refs.defaultLanguage.value);
  updateRoutingPreview();
});

[refs.urls, refs.runsPerPage, refs.mobileDevice, refs.desktopDevice].forEach((element) => element.addEventListener('input', updateEstimate));

refs.projectName.addEventListener('blur', validateProjectName);
refs.projectName.addEventListener('input', () => { if (refs.projectNameField.classList.contains('has-error')) validateProjectName(); });
refs.baseUrl.addEventListener('blur', () => validateBaseUrl());
refs.baseUrl.addEventListener('input', () => { if (refs.baseUrlField.classList.contains('has-error')) validateBaseUrl(); });
refs.runsPerPage.addEventListener('blur', validateRunsPerPage);
refs.runsPerPage.addEventListener('input', () => { if (refs.runsPerPageField.classList.contains('has-error')) validateRunsPerPage(); });
refs.urls.addEventListener('blur', validateUrls);
refs.urls.addEventListener('input', () => { if (refs.urlsField.classList.contains('has-error')) validateUrls(); });
[refs.mobileDevice, refs.desktopDevice].forEach((element) => element.addEventListener('change', () => { if (refs.devicesField.classList.contains('has-error')) validateDevices(); }));
refs.allCategories.addEventListener('change', () => {
  $$('.categoryCheck').forEach((input) => { input.checked = refs.allCategories.checked; });
  refs.allCategories.indeterminate = false;
  validateCategories();
  updateEstimate();
});
$$('.categoryCheck').forEach((input) => input.addEventListener('change', () => {
  syncCategorySelectAll();
  if (refs.categoriesField.classList.contains('has-error')) validateCategories();
  updateEstimate();
}));
refs.flowScript.addEventListener('input', () => { if (refs.flowScript.closest('.field')?.classList.contains('has-error')) validateFlowScript(); });
refs.flowEnabled.addEventListener('change', () => {
  refs.flowScript.disabled = !refs.flowEnabled.checked;
  refs.flowPanel.classList.toggle('disabled', !refs.flowEnabled.checked);
  validateFlowScript();
});
refs.allSecurityFrameworks?.addEventListener('change', () => {
  $$('.securityFrameworkCheck').forEach((input) => { input.checked = refs.allSecurityFrameworks.checked; });
  refs.allSecurityFrameworks.indeterminate = false;
  syncSecurityFrameworks();
  validateSecurityScan();
});
$$('.securityFrameworkCheck').forEach((input) => input.addEventListener('change', () => {
  syncSecurityFrameworks();
  if (refs.securityFrameworksField?.classList.contains('has-error')) validateSecurityScan();
}));
refs.securityProjectName?.addEventListener('input', () => { if (refs.securityProjectField?.classList.contains('has-error')) validateSecurityScan(); });
refs.securityTargetUrl?.addEventListener('input', () => { if (refs.securityUrlField?.classList.contains('has-error')) validateSecurityScan(); });
refs.securityProjectName?.addEventListener('blur', validateSecurityScan);
refs.securityTargetUrl?.addEventListener('blur', validateSecurityScan);
refs.startSecurityScanBtn?.addEventListener('click', runSecurityScan);

refs.newProjectBtn?.addEventListener('click', () => { clearProjectEditor(); refs.projectEditorCard.scrollIntoView({ behavior: 'smooth', block: 'start' }); refs.sharedProjectName.focus(); });
refs.saveProjectBtn?.addEventListener('click', saveProject);
refs.cancelProjectEditBtn?.addEventListener('click', clearProjectEditor);
refs.projectsList?.addEventListener('click', (event) => {
  const useButton = event.target.closest('[data-use-project]');
  if (useButton) return setActiveProject(useButton.dataset.useProject);
  const editButton = event.target.closest('[data-edit-project]');
  if (editButton) return editProject(editButton.dataset.editProject);
  const deleteButton = event.target.closest('[data-delete-project]');
  if (deleteButton) return requestDeleteProject(deleteButton.dataset.deleteProject);
});
refs.projectDeleteModalCloseBtn?.addEventListener('click', closeProjectDeleteModal);
refs.cancelProjectDeleteBtn?.addEventListener('click', closeProjectDeleteModal);
refs.confirmProjectDeleteBtn?.addEventListener('click', confirmDeleteProject);
refs.projectDeleteModal?.addEventListener('click', (event) => { if (event.target === refs.projectDeleteModal) closeProjectDeleteModal(); });
refs.startAssetAnalysisBtn?.addEventListener('click', runAssetAnalysis);
refs.assetProjectName?.addEventListener('blur', validateAssetForm);
refs.assetBaseUrl?.addEventListener('blur', validateAssetForm);
refs.assetPaths?.addEventListener('blur', validateAssetForm);

refs.healthDetails.addEventListener('click', (event) => {
  const button = event.target.closest('.copy-command-btn');
  if (!button) return;
  copyText(button.dataset.command || '', 'Command copied.');
});
refs.copyAllFixesBtn.addEventListener('click', () => copyText(refs.copyAllFixesBtn.dataset.commands || '', 'Fix commands copied.'));
refs.checkEnvironmentBtn.addEventListener('click', checkEnvironment);
refs.launchBrowserBtn.addEventListener('click', launchBrowser);
refs.stopBrowserBtn.addEventListener('click', stopBrowser);
refs.startRunBtn.addEventListener('click', startRun);
refs.cancelRunBtn.addEventListener('click', cancelRun);
refs.clearLogsBtn.addEventListener('click', () => refs.liveLog.innerHTML = '');
$('#refreshHistoryBtn').addEventListener('click', loadHistory);
refs.historyList.addEventListener('change', (event) => {
  const input = event.target.closest('.history-report-check');
  if (!input) return;
  if (input.checked) state.selectedReports.add(input.value);
  else state.selectedReports.delete(input.value);
  updateHistorySelectionUi();
});
refs.historyList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-delete-report]');
  if (!button) return;
  requestDeleteReports([button.dataset.deleteReport]);
});
refs.selectAllReports.addEventListener('change', () => {
  const checks = $$('.history-report-check');
  state.selectedReports = refs.selectAllReports.checked ? new Set(checks.map((input) => input.value)) : new Set();
  updateHistorySelectionUi();
});
refs.deleteSelectedReportsBtn.addEventListener('click', () => requestDeleteReports([...state.selectedReports]));
refs.cancelDeleteBtn.addEventListener('click', closeDeleteModal);
refs.deleteModalCloseBtn.addEventListener('click', closeDeleteModal);
refs.confirmDeleteBtn.addEventListener('click', confirmDeleteReports);
refs.deleteModal.addEventListener('click', (event) => { if (event.target === refs.deleteModal) closeDeleteModal(); });
document.addEventListener('keydown', (event) => { if (event.key !== 'Escape') return; if (refs.deleteModal.classList.contains('show')) closeDeleteModal(); if (refs.projectDeleteModal?.classList.contains('show')) closeProjectDeleteModal(); });

$$('.nav-item').forEach((button) => button.addEventListener('click', () => {
  $$('.nav-item').forEach((item) => item.classList.remove('active'));
  button.classList.add('active');
  $$('.page-section').forEach((section) => section.classList.remove('active'));
  $(`#${button.dataset.section}Section`).classList.add('active');
  const active = currentProject();
  if (active && ['runner', 'security', 'assets'].includes(button.dataset.section)) syncSharedProjectToTools(active, { overwrite: false });
  if (button.dataset.section === 'security') {
    if (!refs.securityProjectName.value.trim() && refs.projectName.value.trim()) refs.securityProjectName.value = refs.projectName.value.trim();
    if (!refs.securityTargetUrl.value.trim() && refs.baseUrl.value.trim()) refs.securityTargetUrl.value = refs.baseUrl.value.trim();
  }
  if (button.dataset.section === 'assets') {
    if (!refs.assetProjectName.value.trim() && refs.projectName.value.trim()) refs.assetProjectName.value = refs.projectName.value.trim();
    if (!refs.assetBaseUrl.value.trim() && refs.baseUrl.value.trim()) refs.assetBaseUrl.value = refs.baseUrl.value.trim();
    if (!refs.assetPaths.value.trim() && refs.urls.value.trim()) refs.assetPaths.value = refs.urls.value.trim();
  }
  if (button.dataset.section === 'projects') loadProjects();
  if (button.dataset.section === 'history') loadHistory();
}));

syncSecurityFrameworks();
updateEstimate();
refreshBrowserStatus();
loadProjects({ sync: true });
loadHistory();
setTimeout(checkEnvironment, 300);
setInterval(refreshBrowserStatus, 5000);


// v1.3 responsive sidebar drawer
(() => {
  const sidebar = document.querySelector('.sidebar');
  const toggle = document.querySelector('#mobileMenuToggle');
  const overlay = document.querySelector('#menuOverlay');

  if (!sidebar || !toggle || !overlay) return;

  const closeMenu = () => {
    sidebar.classList.remove('mobile-open');
    overlay.classList.remove('active');
    document.body.classList.remove('menu-open');
  };

  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('mobile-open');
    overlay.classList.toggle('active');
    document.body.classList.toggle('menu-open');
  });

  overlay.addEventListener('click', closeMenu);

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      if (window.innerWidth <= 900) closeMenu();
    });
  });
})();
