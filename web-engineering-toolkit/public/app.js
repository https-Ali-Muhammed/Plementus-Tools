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
  linksScope: 'selected',
  linksResult: null,
  linksResultView: 'attention',
  linksResultPage: 1,
  linksResultPageSize: 25,
  linksResultSort: 'priority',
  linksResultFilters: { search: '', outcome: 'all', type: 'all', scope: 'all', status: 'all', source: 'all' },
  linksExpandedOccurrences: new Set(),
  pendingProjectDeleteId: '',
  securityResult: null,
  securityProjectOverride: false,
  securityObservationMode: 'attention'
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
  currentRun: $('#currentRun'), liveSection: $('#liveSection'), liveLogDetails: $('#liveLogDetails'), liveLog: $('#liveLog'), resultSummary: $('#resultSummary'), clearLogsBtn: $('#clearLogsBtn'), toast: $('#toast'), historyList: $('#historyList'),
  selectAllReports: $('#selectAllReports'), selectedReportsCount: $('#selectedReportsCount'), deleteSelectedReportsBtn: $('#deleteSelectedReportsBtn'),
  deleteModal: $('#deleteModal'), deleteModalTitle: $('#deleteModalTitle'), deleteModalMessage: $('#deleteModalMessage'), deleteModalCloseBtn: $('#deleteModalCloseBtn'), cancelDeleteBtn: $('#cancelDeleteBtn'), confirmDeleteBtn: $('#confirmDeleteBtn'),
  securityProjectName: $('#securityProjectName'), securityProjectField: $('#securityProjectField'), securityProjectError: $('#securityProjectError'),
  securityTargetUrl: $('#securityTargetUrl'), securityUrlField: $('#securityUrlField'), securityUrlError: $('#securityUrlError'), securityJurisdiction: $('#securityJurisdiction'),
  securityCrawlEnabled: $('#securityCrawlEnabled'), securityMaxPages: $('#securityMaxPages'), securityAdvancedConsent: $('#securityAdvancedConsent'),
  securityAuthEnabled: $('#securityAuthEnabled'), securityAuthConfig: $('#securityAuthConfig'), securityAuthRole: $('#securityAuthRole'), securityAuthCustomRoleField: $('#securityAuthCustomRoleField'), securityAuthCustomRole: $('#securityAuthCustomRole'), securityLoginUrl: $('#securityLoginUrl'), securitySuccessUrl: $('#securitySuccessUrl'), securityUsernameSelector: $('#securityUsernameSelector'), securityPasswordSelector: $('#securityPasswordSelector'), securitySubmitSelector: $('#securitySubmitSelector'), securityAuthUsername: $('#securityAuthUsername'), securityAuthPassword: $('#securityAuthPassword'), securityReuseSession: $('#securityReuseSession'), securityAuthError: $('#securityAuthError'),
  securityZapMode: $('#securityZapMode'), securityZapConfig: $('#securityZapConfig'), securityZapContextFields: $('#securityZapContextFields'), securityZapContextFile: $('#securityZapContextFile'), securityZapContextUser: $('#securityZapContextUser'), securityZapTimeout: $('#securityZapTimeout'), securityZapError: $('#securityZapError'),
  allSecurityFrameworks: $('#allSecurityFrameworks'), securityFrameworksField: $('#securityFrameworksField'), securityFrameworkError: $('#securityFrameworkError'), securityFrameworkCount: $('#securityFrameworkCount'),
  securityGdprApplicability: $('#securityGdprApplicability'), securityHipaaApplicability: $('#securityHipaaApplicability'), securityPciApplicability: $('#securityPciApplicability'), securityLocalApplicability: $('#securityLocalApplicability'),
  startSecurityScanBtn: $('#startSecurityScanBtn'), securityScanState: $('#securityScanState'), securityResultsCard: $('#securityResultsCard'), securityResults: $('#securityResults'), securityResultActions: $('#securityResultActions'),
  securityConfigPanel: $('#securityConfigPanel'), securityConfigSummary: $('#securityConfigSummary'), securityProjectContext: $('#securityProjectContext'), securityProjectOverrideFields: $('#securityProjectOverrideFields'), securityAdvancedOptions: $('#securityAdvancedOptions'), securityAdvancedSummary: $('#securityAdvancedSummary'), securityRunSummary: $('#securityRunSummary'),
  activeProjectMini: $('#activeProjectMini'), activeProjectCard: $('#activeProjectCard'), projectsList: $('#projectsList'), projectCount: $('#projectCount'), newProjectBtn: $('#newProjectBtn'),
  projectEditorCard: $('#projectEditorCard'), projectEditorTitle: $('#projectEditorTitle'), projectEditId: $('#projectEditId'), sharedProjectName: $('#sharedProjectName'), sharedProjectNameField: $('#sharedProjectNameField'), sharedProjectNameError: $('#sharedProjectNameError'),
  projectTestingUrl: $('#projectTestingUrl'), projectTestingUrlField: $('#projectTestingUrlField'), projectTestingUrlError: $('#projectTestingUrlError'), projectProductionUrl: $('#projectProductionUrl'), projectProductionUrlField: $('#projectProductionUrlField'), projectProductionUrlError: $('#projectProductionUrlError'),
  projectEnvironment: $('#projectEnvironment'), projectDefaultLanguage: $('#projectDefaultLanguage'), projectLangEn: $('#projectLangEn'), projectLangAr: $('#projectLangAr'), projectPaths: $('#projectPaths'), saveProjectBtn: $('#saveProjectBtn'), cancelProjectEditBtn: $('#cancelProjectEditBtn'),
  assetProjectName: $('#assetProjectName'), assetProjectField: $('#assetProjectField'), assetProjectError: $('#assetProjectError'), assetBaseUrl: $('#assetBaseUrl'), assetBaseUrlField: $('#assetBaseUrlField'), assetBaseUrlError: $('#assetBaseUrlError'),
  assetPaths: $('#assetPaths'), assetPathsField: $('#assetPathsField'), assetPathsError: $('#assetPathsError'), assetBrowserSelect: $('#assetBrowserSelect'), startAssetAnalysisBtn: $('#startAssetAnalysisBtn'), assetScanState: $('#assetScanState'), assetResultsCard: $('#assetResultsCard'), assetResults: $('#assetResults'), assetResultActions: $('#assetResultActions'),
  linksProjectName: $('#linksProjectName'), linksProjectField: $('#linksProjectField'), linksProjectError: $('#linksProjectError'), linksBaseUrl: $('#linksBaseUrl'), linksBaseUrlField: $('#linksBaseUrlField'), linksBaseUrlError: $('#linksBaseUrlError'), linksPages: $('#linksPages'), linksPagesField: $('#linksPagesField'), linksPagesMeta: $('#linksPagesMeta'), linksPagesError: $('#linksPagesError'), linksCheckExternal: $('#linksCheckExternal'), linksCheckFragments: $('#linksCheckFragments'), linksCheckResources: $('#linksCheckResources'), linksBrowserSelect: $('#linksBrowserSelect'), linksMaxPages: $('#linksMaxPages'), linksMaxTargets: $('#linksMaxTargets'), linksTimeout: $('#linksTimeout'), linksConcurrency: $('#linksConcurrency'), linksMaxRedirects: $('#linksMaxRedirects'), linksIgnorePatterns: $('#linksIgnorePatterns'), linksAdvancedSummary: $('#linksAdvancedSummary'), linksRunSummary: $('#linksRunSummary'), startLinksCheckBtn: $('#startLinksCheckBtn'), linksCheckState: $('#linksCheckState'), linksResultsCard: $('#linksResultsCard'), linksResults: $('#linksResults'), linksResultActions: $('#linksResultActions'),
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

function autoSizePageList(textarea) {
  if (!textarea) return;
  textarea.style.height = 'auto';
  textarea.style.height = `${textarea.scrollHeight}px`;
}

function autoSizeToolPageLists() {
  autoSizePageList(refs.urls);
  autoSizePageList(refs.assetPaths);
  autoSizePageList(refs.linksPages);
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
  if (!refs.healthMini) return;
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
  if (!refs.healthActionSummary || !refs.copyAllFixesBtn || !refs.healthDetails) return;
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
    if (refs.linksBrowserSelect) refs.linksBrowserSelect.innerHTML = browserOptions;
    toast(data.ready ? (warnings ? `Environment is ready with ${warnings} warning${warnings === 1 ? '' : 's'}.` : 'Environment is ready.') : `Environment needs ${errors} required fix${errors === 1 ? '' : 'es'}.`, !data.ready);
  } catch (error) {
    refs.environmentDot.className = 'status-dot error';
    refs.environmentSummary.textContent = 'Check failed';
    if (refs.healthActionSummary) refs.healthActionSummary.textContent = 'The health check could not complete.';
    if (refs.healthDetails) refs.healthDetails.innerHTML = `<div class="health-check-row error"><div class="health-check-main"><span class="health-check-icon">×</span><div class="health-check-copy"><div class="health-check-title"><strong>Health check failed</strong><span class="health-status-badge error">error</span></div><span>${escapeHtml(error.message)}</span></div></div></div>`;
    refs.copyAllFixesBtn?.classList.add('hidden');
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
  if (refs.liveLogDetails) refs.liveLogDetails.open = true;
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

function reportTypeLabel(reportType) {
  if (reportType === 'security-compliance') return 'Compliance Mapping';
  if (reportType === 'broken-links-resources') return 'Broken Links & Resources';
  return humanize(reportType);
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
        <a class="button button-secondary small" href="/api/reports/${encodeURIComponent(reportName)}/download/pdf" download>Download PDF</a>
        <a class="button button-ghost small" href="/api/reports/${encodeURIComponent(reportName)}/download/csv" download>Download CSV</a>
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
      if (event.status === 'completed' && refs.liveLogDetails) refs.liveLogDetails.open = false;
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
        const attention = overview.attentionFindings ?? overview.securityAttention;
        const withoutAdverse = overview.checksWithoutAdverseObservation ?? overview.securityPassed;
        if (attention != null) scoreParts.push(`${attention} attention`);
        if (withoutAdverse != null) scoreParts.push(`${withoutAdverse} without adverse observation`);
        if (overview.reviewSummary) scoreParts.push(`Review progress ${overview.reviewSummary.reviewedFindings || 0} of ${overview.reviewSummary.totalFindings || 0}`);
      }
      if (reportType === 'asset-page-weight') {
        if (overview.pages != null) scoreParts.push(`${overview.pages} page${overview.pages === 1 ? '' : 's'}`);
        if (overview.assetAverageBytes != null) scoreParts.push(`Avg ${formatBytes(overview.assetAverageBytes)}`);
        if (overview.assetAverageRequests != null) scoreParts.push(`${Math.round(Number(overview.assetAverageRequests))} req/page`);
      }
      if (reportType === 'broken-links-resources') {
        if (overview.pages != null) scoreParts.push(`${overview.pages} page${overview.pages === 1 ? '' : 's'}`);
        if (overview.targets != null) scoreParts.push(`${overview.targets} target${overview.targets === 1 ? '' : 's'}`);
        if (overview.broken != null) scoreParts.push(`${overview.broken} broken`);
        if (overview.redirected != null) scoreParts.push(`${overview.redirected} redirected`);
      }
      const scoreText = scoreParts.join(' · ');
      return `
        <div class="history-item upgraded" data-report-name="${escapeHtml(report.name)}">
          <label class="history-check-wrap" title="Select report"><input class="history-report-check" type="checkbox" value="${escapeHtml(report.name)}" /><span class="ui-checkbox" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="m5 10 3 3 7-7"/></svg></span></label>
          <div class="history-info">
            <div class="history-title-line"><span class="report-type-badge ${escapeHtml(reportType)}">${escapeHtml(reportTypeLabel(reportType))}</span><strong>${escapeHtml(report.name)}</strong></div>
            <span>${reportType === 'security-compliance' && overview.generatedAt ? `Scan ${escapeHtml(new Date(overview.generatedAt).toLocaleString())} · Review revision ${escapeHtml(overview.workflowRevision ?? 0)} updated ${escapeHtml(new Date(overview.workflowUpdatedAt || overview.generatedAt).toLocaleString())}` : new Date(report.modifiedAt).toLocaleString()}${scoreText ? ` · ${escapeHtml(scoreText)}` : ''}</span>
          </div>
          <div class="history-actions">
            ${report.summaryHref ? `<a href="${report.summaryHref}" target="_blank" rel="noopener">View report ${externalLinkIcon()}</a>` : ''}
            ${report.csvHref ? `<a href="${report.csvHref}" download>${reportType === 'security-compliance' ? 'Findings CSV' : 'CSV'}</a>` : ''}
            ${report.pdfHref ? `<a class="primary" href="${report.pdfHref}" download>PDF</a>` : ''}
            ${reportType === 'security-compliance' && report.evidenceManifestHref ? `<a href="${report.evidenceManifestHref}" download>Evidence manifest</a>` : ''}
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

function securityEvidenceModeLabel() {
  const auth = refs.securityAuthEnabled?.checked;
  const consent = refs.securityAdvancedConsent?.checked;
  const zap = refs.securityZapMode?.value || 'none';
  if (auth && zap !== 'none') return 'Authenticated + ZAP';
  if (auth) return 'Authenticated application';
  if (zap !== 'none') return `Public URL + ${humanize(zap)} ZAP`;
  if (consent) return 'Public URL + consent scenarios';
  return 'Public URL';
}

function updateSecuritySetupSummaries() {
  const frameworks = selectedSecurityFrameworks();
  const crawlLimit = Number(refs.securityMaxPages?.value) || 10;
  const authRole = refs.securityAuthRole?.value === 'custom' ? refs.securityAuthCustomRole?.value.trim() : refs.securityAuthRole?.value;
  if (refs.securityAdvancedSummary) {
    refs.securityAdvancedSummary.textContent = `Crawl limit: ${crawlLimit} pages · Authenticated: ${refs.securityAuthEnabled?.checked ? `Enabled${authRole ? ` (${humanize(authRole)})` : ''}` : 'Off'} · Consent scenarios: ${refs.securityAdvancedConsent?.checked ? 'Enabled' : 'Off'} · ZAP: ${humanize(refs.securityZapMode?.value || 'none')}`;
  }
  if (refs.securityRunSummary) {
    refs.securityRunSummary.innerHTML = `<div><span>Target</span><strong>${escapeHtml(refs.securityTargetUrl?.value.trim() || 'Not set')}</strong></div><div><span>Frameworks</span><strong>${frameworks.length} selected</strong></div><div><span>Evidence mode</span><strong>${escapeHtml(securityEvidenceModeLabel())}</strong></div><div><span>Crawl</span><strong>${refs.securityCrawlEnabled?.checked ? `${crawlLimit} pages` : 'Homepage only'}</strong></div>`;
  }
}

function renderSecurityConfigurationContext() {
  const project = currentProject();
  const useProjectContext = Boolean(project && !state.securityProjectOverride);
  refs.securityProjectOverrideFields?.classList.toggle('hidden', useProjectContext);
  refs.securityProjectContext?.classList.toggle('hidden', !useProjectContext);
  if (useProjectContext && refs.securityProjectContext) {
    const target = projectEnvironmentUrl(project);
    refs.securityProjectContext.innerHTML = `<div class="security-project-facts"><div><span>Project</span><strong>${escapeHtml(project.name)}</strong></div><div><span>Environment</span><strong>${escapeHtml(humanize(project.activeEnvironment))}</strong></div><div><span>Target</span><strong>${escapeHtml(target || 'No URL configured')}</strong></div></div><button type="button" class="button button-ghost small" data-security-project-override>Override</button>`;
  } else if (refs.securityProjectContext) {
    refs.securityProjectContext.innerHTML = '';
  }
  updateSecuritySetupSummaries();
}

function setSecurityConfigurationCollapsed(collapsed, result = state.securityResult) {
  refs.securityConfigPanel?.classList.toggle('hidden', collapsed);
  refs.securityConfigSummary?.classList.toggle('hidden', !collapsed);
  if (!collapsed || !refs.securityConfigSummary) return;
  const frameworks = (result?.frameworkResults || []).map((item) => item.label).filter(Boolean);
  refs.securityConfigSummary.innerHTML = `<div class="security-config-summary-copy"><span>Assessment configuration</span><strong>${escapeHtml(result?.projectName || refs.securityProjectName?.value || 'Ad-hoc assessment')}</strong><small>${escapeHtml(result?.finalUrl || refs.securityTargetUrl?.value || '')}</small><small>${escapeHtml(frameworks.join(' · ') || selectedSecurityFrameworks().map(humanize).join(' · '))} · ${escapeHtml(securityEvidenceModeLabel())} · Crawl limit ${Number(refs.securityMaxPages?.value) || 10}</small></div><div class="security-config-summary-actions"><button type="button" class="button button-ghost small" data-security-edit-config>Edit configuration</button><button type="button" class="button button-secondary small" data-security-run-again>Run again</button></div>`;
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
  if (overwrite) state.securityProjectOverride = false;

  set(refs.assetProjectName, project.name);
  set(refs.assetBaseUrl, baseUrl);
  if (overwrite || paths) set(refs.assetPaths, paths);

  set(refs.linksProjectName, project.name);
  set(refs.linksBaseUrl, baseUrl);
  if (refs.linksPages && (overwrite || !refs.linksPages.value.trim() || refs.linksPages.value.trim() === '/')) refs.linksPages.value = paths || '/';

  updateEstimate();
  updateRoutingPreview();
  autoSizeToolPageLists();
  renderSecurityConfigurationContext();
  updateLinksRunSummary();
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
  renderSecurityConfigurationContext();
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
    <a class="button button-secondary small" href="${result.pdfHref}" download>PDF</a>
    <a class="button button-ghost small" href="${result.csvHref}" download>CSV</a>
    `;
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

function linksStartingPages() {
  const pages = refs.linksPages.value.split('\n').map((value) => value.trim()).filter(Boolean);
  return pages.length ? pages : ['/'];
}

function updateLinksRunSummary() {
  if (!refs.linksRunSummary) return;
  const pageCount = linksStartingPages().length;
  const maxPages = Number(refs.linksMaxPages?.value) || 25;
  const maxTargets = Number(refs.linksMaxTargets?.value) || 2000;
  const timeoutMs = Number(refs.linksTimeout?.value) || 10000;
  const checks = [refs.linksCheckExternal?.checked && 'external', refs.linksCheckFragments?.checked && 'fragments', refs.linksCheckResources?.checked && 'resources'].filter(Boolean);
  refs.linksRunSummary.innerHTML = `<div><span>Scope</span><strong>${state.linksScope === 'crawl' ? 'Selected + bounded internal crawl' : 'Selected pages only'} · ${pageCount} start${pageCount === 1 ? '' : 's'}</strong></div><div><span>Bounds</span><strong>${maxPages} pages · ${maxTargets.toLocaleString()} targets · ${Number(refs.linksConcurrency?.value) || 6} concurrent</strong></div><div><span>Checks</span><strong>${checks.length ? checks.map(humanize).join(' · ') : 'Internal links only'}</strong></div>`;
  if (refs.linksPagesMeta) refs.linksPagesMeta.textContent = `${pageCount} starting page${pageCount === 1 ? '' : 's'} · one path or URL per line`;
  if (refs.linksAdvancedSummary) refs.linksAdvancedSummary.textContent = `${maxPages} pages · ${maxTargets.toLocaleString()} targets · ${Math.round(timeoutMs / 100) / 10}s timeout`;
}

function validateLinksForm() {
  const project = refs.linksProjectName.value.trim();
  const base = refs.linksBaseUrl.value.trim();
  const pages = linksStartingPages();
  const projectMessage = !project ? 'Project name is required.' : project.length < 2 ? 'Project name must contain at least 2 characters.' : '';
  let baseMessage = '';
  let parsedBase;
  if (!base) baseMessage = 'Base URL is required.';
  else {
    try {
      parsedBase = new URL(base);
      if (!['http:', 'https:'].includes(parsedBase.protocol)) baseMessage = 'Use http:// or https://.';
      else if (parsedBase.username || parsedBase.password) baseMessage = 'URL credentials are not supported.';
    } catch { baseMessage = 'Enter a valid Base URL.'; }
  }
  let pagesMessage = '';
  if (pages.length > 100) pagesMessage = 'Add up to 100 explicit starting pages.';
  else if (parsedBase) {
    const bad = pages.findIndex((value) => {
      try { const url = new URL(value, parsedBase); return !['http:', 'https:'].includes(url.protocol) || Boolean(url.username || url.password); } catch { return true; }
    });
    if (bad >= 0) pagesMessage = `Line ${bad + 1} must be a credential-free HTTP(S) path or URL.`;
  }
  const bounds = [
    [refs.linksMaxPages, 1, 100, 'Maximum pages'], [refs.linksMaxTargets, 1, 5000, 'Maximum targets'],
    [refs.linksTimeout, 100, 30000, 'Timeout'], [refs.linksConcurrency, 1, 12, 'Concurrency'], [refs.linksMaxRedirects, 0, 12, 'Redirect limit']
  ];
  const invalidBound = bounds.find(([input, minimum, maximum]) => !Number.isInteger(Number(input.value)) || Number(input.value) < minimum || Number(input.value) > maximum);
  const ignorePatterns = refs.linksIgnorePatterns.value.split('\n').map((value) => value.trim()).filter(Boolean);
  const advancedMessage = invalidBound ? `${invalidBound[3]} must be from ${invalidBound[1]} to ${invalidBound[2]}.` : ignorePatterns.length > 20 ? 'Use up to 20 ignore patterns.' : ignorePatterns.some((value) => value.length > 200) ? 'Ignore patterns are limited to 200 characters.' : '';
  setFieldError(refs.linksProjectField, refs.linksProjectError, projectMessage);
  setFieldError(refs.linksBaseUrlField, refs.linksBaseUrlError, baseMessage);
  setFieldError(refs.linksPagesField, refs.linksPagesError, pagesMessage);
  if (advancedMessage) toast(advancedMessage, true);
  return !projectMessage && !baseMessage && !pagesMessage && !advancedMessage;
}

const LINKS_ATTENTION_OUTCOMES = new Set(['broken', 'fragment_missing', 'server_error', 'unreachable', 'failed_to_check', 'client_error']);
const LINKS_REVIEW_OUTCOMES = new Set(['redirected', 'restricted', 'rate_limited']);
const LINKS_PRIORITY = { broken: 0, fragment_missing: 1, server_error: 2, unreachable: 3, failed_to_check: 4, client_error: 5, redirected: 6, restricted: 7, rate_limited: 8, skipped: 9, healthy: 10 };

function linksViewForOutcome(outcome) {
  if (LINKS_ATTENTION_OUTCOMES.has(outcome)) return 'attention';
  if (LINKS_REVIEW_OUTCOMES.has(outcome)) return 'review';
  if (outcome === 'healthy') return 'healthy';
  return 'all';
}

function linksPresentationCounts(targets) {
  return {
    attention: targets.filter((target) => LINKS_ATTENTION_OUTCOMES.has(target.outcome)).length,
    review: targets.filter((target) => LINKS_REVIEW_OUTCOMES.has(target.outcome)).length,
    healthy: targets.filter((target) => target.outcome === 'healthy').length,
    all: targets.length
  };
}

function linksReadableUrl(value) {
  try {
    const url = new URL(value);
    return { primary: `${url.pathname}${url.search}${url.hash}` || '/', secondary: url.host };
  } catch { return { primary: value || 'Unknown target', secondary: '' }; }
}

function linksCanOpen(value) {
  return /^https?:\/\//i.test(value || '') && !/%5Bredacted%5D|\[redacted\]/i.test(value);
}

function linksSearchValue(target) {
  return [target.targetUrl, target.finalUrl, target.httpStatus, target.failureReason, ...(target.referenceTypes || []), ...(target.sourcePages || [])].join(' ').toLowerCase();
}

function linksFilteredTargets() {
  const targets = state.linksResult?.targets || [];
  const filters = state.linksResultFilters;
  const viewed = targets.filter((target) => state.linksResultView === 'all' || linksViewForOutcome(target.outcome) === state.linksResultView);
  const filtered = viewed.filter((target) => (!filters.search || linksSearchValue(target).includes(filters.search))
    && (filters.outcome === 'all' || target.outcome === filters.outcome)
    && (filters.type === 'all' || (target.referenceTypes || []).includes(filters.type))
    && (filters.scope === 'all' || (target.internal ? 'internal' : 'external') === filters.scope)
    && (filters.status === 'all' || String(target.httpStatus || 0) === filters.status)
    && (filters.source === 'all' || (target.sourcePages || []).includes(filters.source)));
  return filtered.sort((left, right) => {
    if (state.linksResultSort === 'outcome') return String(left.outcome).localeCompare(String(right.outcome)) || String(left.targetUrl).localeCompare(String(right.targetUrl));
    if (state.linksResultSort === 'status') return (Number(left.httpStatus) || 9999) - (Number(right.httpStatus) || 9999) || String(left.targetUrl).localeCompare(String(right.targetUrl));
    if (state.linksResultSort === 'target') return String(left.targetUrl).localeCompare(String(right.targetUrl));
    if (state.linksResultSort === 'occurrences') return (right.occurrenceCount || 0) - (left.occurrenceCount || 0) || String(left.targetUrl).localeCompare(String(right.targetUrl));
    return (LINKS_PRIORITY[left.outcome] ?? 99) - (LINKS_PRIORITY[right.outcome] ?? 99) || String(left.targetUrl).localeCompare(String(right.targetUrl));
  });
}

function renderLinksOccurrence(occurrence) {
  return `<div class="links-occurrence-item"><strong>${escapeHtml(occurrence.sourcePageUrl || 'Unknown source')}</strong><span>${escapeHtml(humanize(occurrence.referenceType))} · ${escapeHtml(occurrence.attribute || 'reference')}${occurrence.fragment ? ` · #${escapeHtml(occurrence.fragment)}` : ''}${occurrence.linkText ? ` · ${escapeHtml(occurrence.linkText)}` : ''}</span></div>`;
}

function renderLinksTarget(target) {
  const readable = linksReadableUrl(target.targetUrl);
  const expanded = state.linksExpandedOccurrences.has(target.targetUrl);
  const occurrences = target.occurrences || [];
  const visibleOccurrences = expanded ? occurrences : occurrences.slice(0, 5);
  const redirectChain = (target.redirectChain || []).map((hop) => `<li><span>${hop.status || '—'}</span><strong>${escapeHtml(hop.url || '')}</strong>${hop.location ? `<small>to ${escapeHtml(hop.location)}</small>` : ''}</li>`).join('');
  return `<article class="links-target-card ${escapeHtml(linksViewForOutcome(target.outcome))}" data-links-target>
    <div class="links-target-primary"><div class="links-target-status"><span class="links-outcome ${escapeHtml(target.outcome)}">${escapeHtml(humanize(target.outcome))}</span><strong>${target.httpStatus || '—'}</strong></div><div class="links-target-identity"><strong class="links-target-path" title="${escapeHtml(target.targetUrl)}">${escapeHtml(readable.primary)}</strong><span>${escapeHtml(readable.secondary)}</span></div><div class="links-target-facts"><span>${escapeHtml((target.referenceTypes || []).map(humanize).join(', ') || 'Other resource')}</span><span>${target.internal ? 'Internal' : 'External'}</span><span>Found ${target.occurrenceCount || 0} time${target.occurrenceCount === 1 ? '' : 's'}</span></div></div>
    ${target.failureReason ? `<p class="links-target-reason">${escapeHtml(target.failureReason)}</p>` : ''}
    <details class="links-target-detail"><summary>View details</summary><div class="links-detail-body"><dl><div><dt>Full safe target</dt><dd>${escapeHtml(target.targetUrl)}</dd></div><div><dt>Final URL</dt><dd>${escapeHtml(target.finalUrl || '—')}</dd></div><div><dt>Check method</dt><dd>${escapeHtml(humanize(target.checkMethod))}</dd></div><div><dt>Reference types</dt><dd>${escapeHtml((target.referenceTypes || []).map(humanize).join(', ') || '—')}</dd></div><div><dt>Scope</dt><dd>${target.internal ? 'Internal' : 'External'}</dd></div><div><dt>Fragment</dt><dd>${escapeHtml(target.fragment || '—')}</dd></div></dl>${redirectChain ? `<div class="links-redirect-chain"><strong>Redirect chain</strong><ol>${redirectChain}</ol></div>` : ''}<div class="links-detail-actions"><button class="button button-ghost small" type="button" data-copy-links-target="${escapeHtml(target.targetUrl)}">Copy URL</button>${linksCanOpen(target.targetUrl) ? `<a class="button button-ghost small" href="${escapeHtml(target.targetUrl)}" target="_blank" rel="noopener noreferrer">Open target ↗</a>` : ''}</div><section class="links-occurrence-panel"><h5>Found on ${target.occurrenceCount || 0} occurrence${target.occurrenceCount === 1 ? '' : 's'}</h5><div class="links-occurrence-list">${visibleOccurrences.map(renderLinksOccurrence).join('') || '<span>No source occurrence metadata was retained.</span>'}</div>${!expanded && occurrences.length > 5 ? `<button class="button button-ghost small" type="button" data-show-all-occurrences="${escapeHtml(target.targetUrl)}">Show all ${occurrences.length} occurrences</button>` : ''}</section></div></details>
  </article>`;
}

function renderLinksTargetPage() {
  const filtered = linksFilteredTargets();
  const pageCount = Math.max(1, Math.ceil(filtered.length / state.linksResultPageSize));
  state.linksResultPage = Math.min(Math.max(1, state.linksResultPage), pageCount);
  const start = (state.linksResultPage - 1) * state.linksResultPageSize;
  const pageTargets = filtered.slice(start, start + state.linksResultPageSize);
  const list = $('#linksTargetList');
  if (list) list.innerHTML = pageTargets.map(renderLinksTarget).join('');
  const empty = $('#linksResultEmpty');
  if (empty) {
    empty.classList.toggle('hidden', filtered.length > 0);
    const description = empty.querySelector('p');
    if (description) description.textContent = `No ${state.linksResultView === 'all' ? 'references' : state.linksResultView.replace('_', ' ')} match the current filters.`;
  }
  const visible = $('#linksVisibleCount');
  if (visible) visible.textContent = filtered.length ? `Showing ${start + 1}–${Math.min(start + state.linksResultPageSize, filtered.length)} of ${filtered.length}` : '0 matches';
  const pageStatus = $('#linksResultPageStatus');
  if (pageStatus) pageStatus.textContent = `Page ${state.linksResultPage} of ${pageCount}`;
  const previous = $('#linksResultPrevious');
  const next = $('#linksResultNext');
  if (previous) previous.disabled = state.linksResultPage <= 1;
  if (next) next.disabled = state.linksResultPage >= pageCount;
}

function applyLinksFilters({ resetPage = true } = {}) {
  state.linksResultFilters = {
    search: ($('#linksResultSearch')?.value || '').trim().toLowerCase(),
    outcome: $('#linksResultOutcome')?.value || 'all',
    type: $('#linksResultType')?.value || 'all',
    scope: $('#linksResultScope')?.value || 'all',
    status: $('#linksResultStatus')?.value || 'all',
    source: $('#linksResultSource')?.value || 'all'
  };
  state.linksResultSort = $('#linksResultSort')?.value || 'priority';
  if (resetPage) state.linksResultPage = 1;
  renderLinksTargetPage();
}

function setLinksResultView(view, outcome = 'all') {
  state.linksResultView = view;
  state.linksResultPage = 1;
  state.linksResultFilters.outcome = outcome;
  $$('#linksResults [data-links-view]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.linksView === view)));
  const outcomeSelect = $('#linksResultOutcome');
  if (outcomeSelect) outcomeSelect.value = outcome;
  renderLinksTargetPage();
}

function clearLinksFilters() {
  state.linksResultFilters = { search: '', outcome: 'all', type: 'all', scope: 'all', status: 'all', source: 'all' };
  state.linksResultSort = 'priority';
  for (const [id, value] of [['linksResultSearch', ''], ['linksResultOutcome', 'all'], ['linksResultType', 'all'], ['linksResultScope', 'all'], ['linksResultStatus', 'all'], ['linksResultSource', 'all'], ['linksResultSort', 'priority']]) {
    const control = $(`#${id}`);
    if (control) control.value = value;
  }
  state.linksResultPage = 1;
  renderLinksTargetPage();
}

function renderLinksResults(result) {
  state.linksResult = result;
  state.linksResultPage = 1;
  state.linksResultPageSize = 25;
  state.linksResultSort = 'priority';
  state.linksResultFilters = { search: '', outcome: 'all', type: 'all', scope: 'all', status: 'all', source: 'all' };
  state.linksExpandedOccurrences = new Set();
  const targets = result.targets || [];
  const summary = result.summary || {};
  const counts = linksPresentationCounts(targets);
  state.linksResultView = counts.attention ? 'attention' : counts.review ? 'review' : counts.healthy ? 'healthy' : 'all';
  const outcomeCounts = Object.fromEntries([...new Set(targets.map((target) => target.outcome))].sort().map((outcome) => [outcome, targets.filter((target) => target.outcome === outcome).length]));
  const types = [...new Set(targets.flatMap((target) => target.referenceTypes || []))].sort();
  const statuses = [...new Set(targets.map((target) => Number(target.httpStatus) || 0).filter(Boolean))].sort((a, b) => a - b);
  const sourcePages = [...new Set(targets.flatMap((target) => target.sourcePages || []))].sort();
  refs.linksResults.innerHTML = `<div class="links-result-header"><div><span class="eyebrow mini">Check complete</span><h4>${escapeHtml(result.projectName)}</h4><span>${counts.attention} reference${counts.attention === 1 ? '' : 's'} need attention · ${counts.review} to review · ${counts.healthy} healthy</span><small>${escapeHtml(result.baseUrl)} · ${escapeHtml(humanize(result.scope?.mode))} · ${Math.round(Number(result.durationMs) || 0).toLocaleString()} ms</small></div><span id="linksVisibleCount" class="pill" aria-live="polite"></span></div>
    <div class="links-summary-grid"><div class="links-summary-card info"><span>Pages scanned</span><strong>${summary.pagesScanned || 0}</strong><small>Rendered pages</small></div><div class="links-summary-card info"><span>Targets checked</span><strong>${summary.uniqueTargets || 0}</strong><small>${summary.occurrences || 0} occurrences</small></div><button class="links-summary-card attention" type="button" data-links-view="attention" aria-pressed="${state.linksResultView === 'attention'}"><span>Needs attention</span><strong>${counts.attention}</strong><small>Remediation first</small></button><button class="links-summary-card review" type="button" data-links-view="review" aria-pressed="${state.linksResultView === 'review'}"><span>Review</span><strong>${counts.review}</strong><small>Redirected or restricted</small></button><button class="links-summary-card healthy" type="button" data-links-view="healthy" data-links-summary-outcome="healthy" aria-pressed="${state.linksResultView === 'healthy'}"><span>Healthy</span><strong>${counts.healthy}</strong><small>Direct 2xx inventory</small></button></div>
    <div class="links-outcome-shortcuts" aria-label="Outcome shortcuts">${Object.entries(outcomeCounts).map(([outcome, count]) => `<button type="button" data-links-summary-outcome="${escapeHtml(outcome)}"><span class="links-outcome ${escapeHtml(outcome)}">${escapeHtml(humanize(outcome))}</span><strong>${count}</strong></button>`).join('')}</div>
    <section class="links-result-workspace" aria-label="Checked references"><div class="links-result-toolbar"><div class="links-view-tabs" role="group" aria-label="Result groups">${[['attention', 'Needs attention'], ['review', 'Review'], ['healthy', 'Healthy'], ['all', 'All']].map(([view, label]) => `<button type="button" data-links-view="${view}" aria-pressed="${state.linksResultView === view}"><span>${label}</span><strong>${counts[view]}</strong></button>`).join('')}</div><div class="links-filter-grid"><label class="field links-search-field"><span>Search results</span><input id="linksResultSearch" type="search" placeholder="Target, source, status, type, failure…"></label><label class="field"><span>Outcome</span><select id="linksResultOutcome"><option value="all">All outcomes</option>${Object.entries(outcomeCounts).map(([value, count]) => `<option value="${escapeHtml(value)}">${escapeHtml(humanize(value))} (${count})</option>`).join('')}</select></label><label class="field"><span>Reference type</span><select id="linksResultType"><option value="all">All types</option>${types.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(humanize(value))}</option>`).join('')}</select></label><label class="field"><span>Scope</span><select id="linksResultScope"><option value="all">Internal + external</option><option value="internal">Internal</option><option value="external">External</option></select></label><label class="field"><span>HTTP status</span><select id="linksResultStatus"><option value="all">All statuses</option>${statuses.map((value) => `<option value="${value}">${value}</option>`).join('')}</select></label><label class="field"><span>Source page</span><select id="linksResultSource"><option value="all">All source pages</option>${sourcePages.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('')}</select></label><label class="field"><span>Sort</span><select id="linksResultSort"><option value="priority">Action priority</option><option value="outcome">Outcome</option><option value="status">HTTP status</option><option value="target">Target</option><option value="occurrences">Occurrences</option></select></label><button id="linksClearFilters" class="button button-ghost small" type="button">Clear filters</button></div></div>
      <div id="linksTargetList" class="links-target-list"></div><div id="linksResultEmpty" class="links-empty-state hidden"><strong>No matching references</strong><p>Adjust the result view or clear the current filters.</p><button class="button button-secondary small" type="button" data-links-clear-filters>Clear filters</button></div>
      <div class="links-pagination"><label>Rows per page <select id="linksResultPageSize"><option value="25">25</option><option value="50">50</option><option value="100">100</option></select></label><div><button id="linksResultPrevious" class="button button-ghost small" type="button">Previous</button><span id="linksResultPageStatus">Page 1 of 1</span><button id="linksResultNext" class="button button-ghost small" type="button">Next</button></div></div></section>`;
  refs.linksResultActions.innerHTML = `<a class="button button-ghost small" href="${result.summaryHref}" target="_blank" rel="noopener">Open report ↗</a><a class="button button-secondary small" href="${result.pdfHref}" download>PDF</a><a class="button button-ghost small" href="${result.csvHref}" download>CSV</a>`;
  refs.linksResultsCard.classList.remove('hidden');
  $('#linksSection')?.classList.add('links-has-results');
  renderLinksTargetPage();
  refs.linksResultsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function runLinksCheck() {
  if (!validateLinksForm()) { toast('Fix the highlighted fields before running the checker.', true); return; }
  if (!refs.linksPages.value.trim()) refs.linksPages.value = '/';
  refs.startLinksCheckBtn.disabled = true;
  refs.startLinksCheckBtn.textContent = 'Checking…';
  refs.linksCheckState.className = 'security-scan-state running';
  refs.linksCheckState.innerHTML = '<span class="security-spinner"></span><div><strong>Discovering references…</strong><small>Rendering bounded pages, then checking unique HTTP targets.</small></div>';
  try {
    const result = await api('/api/broken-links/check', { method: 'POST', body: JSON.stringify({ projectName: refs.linksProjectName.value.trim(), baseUrl: refs.linksBaseUrl.value.trim(), startingPages: linksStartingPages(), scanScope: state.linksScope, checkExternal: refs.linksCheckExternal.checked, checkFragments: refs.linksCheckFragments.checked, checkResources: refs.linksCheckResources.checked, preferredBrowserPath: refs.linksBrowserSelect.value || undefined, maxPages: Number(refs.linksMaxPages.value), maxTargets: Number(refs.linksMaxTargets.value), timeoutMs: Number(refs.linksTimeout.value), concurrency: Number(refs.linksConcurrency.value), maxRedirects: Number(refs.linksMaxRedirects.value), ignorePatterns: refs.linksIgnorePatterns.value.split('\n').map((value) => value.trim()).filter(Boolean) }) });
    renderLinksResults(result);
    refs.linksCheckState.className = 'security-scan-state success';
    const counts = linksPresentationCounts(result.targets || []);
    refs.linksCheckState.innerHTML = `<span class="security-state-dot"></span><div><strong>Last check completed</strong><small>${counts.attention} need attention · ${counts.review} to review · ${counts.healthy} healthy.</small></div>`;
    toast('Broken links & resources report generated.');
    loadHistory();
  } catch (error) {
    refs.linksCheckState.className = 'security-scan-state error';
    refs.linksCheckState.innerHTML = `<span class="security-state-dot"></span><div><strong>Check failed</strong><small>${escapeHtml(error.message)}</small></div>`;
    toast(error.message, true);
  } finally {
    refs.startLinksCheckBtn.disabled = false;
    refs.startLinksCheckBtn.textContent = state.linksResult ? 'Run check again' : 'Check links & resources';
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
  checks.forEach((input) => {
    const card = input.closest('[data-framework-card]');
    card?.classList.toggle('is-selected', input.checked);
    card?.querySelector('[data-framework-input]')?.classList.toggle('hidden', !input.checked);
  });
  updateSecuritySetupSummaries();
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
  let authOk = true;
  if (refs.securityAuthEnabled?.checked) {
    const reusableOnly = refs.securityReuseSession?.checked && !refs.securityLoginUrl.value.trim() && !refs.securityAuthUsername.value;
    const required = reusableOnly ? [] : [refs.securityLoginUrl, refs.securityUsernameSelector, refs.securityPasswordSelector, refs.securitySubmitSelector, refs.securityAuthUsername, refs.securityAuthPassword];
    authOk = required.every((input) => input?.value.trim()) && (refs.securityAuthRole.value !== 'custom' || Boolean(refs.securityAuthCustomRole.value.trim()));
    if (refs.securityAuthError) refs.securityAuthError.textContent = authOk ? '' : 'Complete the structured login flow and runtime credentials, or choose reuse with an existing role session.';
  } else if (refs.securityAuthError) refs.securityAuthError.textContent = '';
  const zapMode = refs.securityZapMode?.value || 'none';
  let zapOk = true;
  let zapMessage = '';
  if (zapMode === 'authenticated-passive' && (!refs.securityZapContextFile.value.trim() || !refs.securityZapContextUser.value.trim())) {
    zapOk = false; zapMessage = 'Authenticated passive scanning requires a ZAP context file and context user.';
  }
  if (refs.securityZapError) refs.securityZapError.textContent = zapMessage;
  return projectOk && urlOk && frameworkCount > 0 && authOk && zapOk;
}

function syncSecurityZapFields({ validate = true } = {}) {
  const mode = refs.securityZapMode?.value || 'none';
  refs.securityZapConfig?.classList.toggle('hidden', mode === 'none');
  refs.securityZapContextFields?.classList.toggle('hidden', mode !== 'authenticated-passive');
  if (mode === 'passive') refs.securityZapTimeout.value = '10';
  if (validate) validateSecurityScan();
  updateSecuritySetupSummaries();
}

function securityStatusLabel(status) {
  return ({ pass: 'No adverse observation', warning: 'Review', fail: 'Needs attention', manual: 'Manual review', info: 'Info', confirmed: 'Technical Check Completed', observed: 'Observed', inferred: 'Inferred', not_tested: 'Not Assessed', failed_to_test: 'Failed To Test' })[status] || humanize(status);
}

function securityConfidenceLabel(status) {
  return ({ high: 'High', medium: 'Medium', low: 'Low', asserted_not_verified: 'Asserted, not verified', unknown: 'Unknown', confirmed: 'Legacy confirmed — not normalized', observed: 'Legacy observed — not normalized', inferred: 'Legacy inferred — not normalized', not_assessed: 'Not assessed' })[status] || humanize(status || 'unknown');
}

function coverageLimitationCategory(item) {
  const text = `${item.category || ''} ${item.title || ''} ${item.summary || ''} ${(item.limitations || []).join(' ')}`.toLowerCase();
  if (/payment|card|pci/.test(text)) return 'Payment';
  if (/locale|language|translation/.test(text)) return 'Locale';
  if (/authenticated|login|role|access control/.test(text)) return 'Authenticated evidence';
  if (/consent|cookie preference/.test(text)) return 'Consent';
  if (/scope|applicab|jurisdiction/.test(text)) return 'Scope';
  if (/organiz|contract|procedure|manual/.test(text)) return 'Organizational/manual evidence';
  return 'Public evidence';
}

function crawlSourceLabel(source = '', status = 0) {
  if (status >= 300 && status < 400) return 'Redirected';
  return ({ 'initial-page': 'Direct target', 'homepage-link': 'Linked', 'homepage-locale-link': 'Linked locale', 'well-known-path': 'Probed', 'locale-well-known-path': 'Probed locale' })[source] || humanize(source || 'discovered');
}

function findingFrameworks(finding) {
  const values = new Set();
  for (const mapping of finding.controlMappings || []) values.add(/^EPRIVACY-|^GDPR-EPRIVACY-/i.test(mapping.controlId || '') ? 'eprivacy' : mapping.framework || '');
  for (const control of finding.controls || []) {
    if (/^ISO/i.test(control)) values.add('iso-27001');
    else if (/^EPRIVACY-|^GDPR-EPRIVACY-/i.test(control)) values.add('eprivacy');
    else if (/^GDPR/i.test(control)) values.add('gdpr');
    else if (/^SOC/i.test(control)) values.add('soc-2');
    else if (/^HIPAA/i.test(control)) values.add('hipaa');
    else if (/^PCI/i.test(control)) values.add('pci-dss');
    else if (/^LOCAL/i.test(control)) values.add('local');
  }
  return [...values].filter(Boolean);
}

function securityMappingFrameworkLabel(mapping = {}, frameworkDefinitions = {}) {
  const framework = /^EPRIVACY-|^GDPR-EPRIVACY-/i.test(mapping.controlId || '') ? 'eprivacy' : mapping.framework || '';
  return frameworkDefinitions[framework] || ({ eprivacy: 'ePrivacy Directive', gdpr: 'GDPR', 'iso-27001': 'ISO/IEC 27001', 'soc-2': 'SOC 2', hipaa: 'HIPAA', 'pci-dss': 'PCI DSS', local: 'Local Regulations' })[framework] || humanize(framework);
}

function securityReviewReasonLabels(reasons = [], definitions = {}) {
  return (reasons || []).map((reason) => definitions?.[reason]?.label || humanize(reason));
}

function renderFindingCard(finding, presentation = {}) {
  const severityClass = ['critical', 'high'].includes(finding.severity) ? 'fail' : finding.severity === 'medium' ? 'warning' : 'info';
  const evidence = typeof finding.evidence === 'object' ? finding.evidence : { raw: finding.evidence || finding.details || '', type: '' };
  const evidenceConfidence = finding.evidenceConfidence || evidence.evidenceConfidence || evidence.confidence || 'unknown';
  const decisionOverlay = finding.decision || {};
  const reviewDecision = decisionOverlay.reviewDecision || finding.reviewDecision || '';
  const reviewState = (reviewDecision || decisionOverlay.scopeDecision || decisionOverlay.mappingDecision || finding.findingStatus === 'reviewed') ? 'reviewed' : 'awaiting';
  const frameworks = findingFrameworks(finding);
  const controlById = new Map((presentation.controlEvaluations || []).map((control) => [control.controlId, control]));
  const manualReasons = [...new Set((finding.controls || []).flatMap((controlId) => controlById.get(controlId)?.manualReviewReasons || []))];
  const mappingTargets = [...new Map((finding.controlMappings || []).filter((mapping) => mapping.mappingId).map((mapping) => [mapping.mappingId, mapping])).values()];
  const scopeTargets = [...new Set((finding.controlMappings || []).map((mapping) => mapping.framework).filter(Boolean))];
  const collectionState = evidence.collectionState || finding.collectionState || 'not_tested';
  const searchable = [finding.id, finding.title, finding.category, finding.affectedUrl, finding.impact, evidence.raw, decisionOverlay.reason, decisionOverlay.reviewer, decisionOverlay.mappingId, decisionOverlay.scopeFramework, ...(finding.controls || []), ...(finding.controlMappings || []).map((mapping) => mapping.mappingId), ...manualReasons].join(' ').toLowerCase();
  return `<article class="security-finding-card" data-security-finding data-severity="${escapeHtml(finding.severity || 'informational')}" data-category="${escapeHtml(finding.category || 'Uncategorized')}" data-review="${reviewState}" data-disposition="${escapeHtml(reviewDecision || 'not_reviewed')}" data-collection="${escapeHtml(collectionState)}" data-manual-reasons="${escapeHtml(manualReasons.join(' '))}" data-frameworks="${escapeHtml(frameworks.join(' '))}" data-title="${escapeHtml(String(finding.title || '').toLowerCase())}" data-updated="${escapeHtml(decisionOverlay.updatedAt || '')}" data-search="${escapeHtml(searchable)}" data-fingerprint="${escapeHtml(finding.fingerprint || '')}">
    <div class="security-finding-primary">
      <span class="security-status ${severityClass}"><i></i>${escapeHtml(finding.severity || 'informational')}</span>
      <div class="security-finding-copy">
        <div class="security-finding-title-row"><h5>${escapeHtml(finding.title)}</h5><span class="security-review-badge finding-review-state ${reviewState}">${reviewDecision ? escapeHtml(humanize(reviewDecision)) : 'Awaiting review'}</span></div>
        <div class="security-finding-meta"><span>${escapeHtml(finding.id || '')}</span><span>Evidence confidence: ${escapeHtml(securityConfidenceLabel(evidenceConfidence))}</span>${finding.affectedUrl ? `<span class="security-url">${escapeHtml(finding.affectedUrl)}</span>` : ''}</div>
        <p>${escapeHtml(finding.impact || finding.summary || '')}</p>
        ${finding.recommendation ? `<div class="security-recommendation flat"><strong>Recommendation</strong><span>${escapeHtml(finding.recommendation)}</span></div>` : ''}
        <div class="security-finding-actions">
          <details class="security-inline-details"><summary>Evidence &amp; mappings</summary><div class="security-detail-body">
            ${finding.testMethod ? `<p><strong>Test method</strong>${escapeHtml(finding.testMethod)}</p>` : ''}
            ${evidence.raw ? `<p><strong>Evidence (${escapeHtml(evidence.type || 'observation')})</strong><span class="security-evidence-text">${escapeHtml(evidence.raw)}</span></p>` : ''}
            ${(evidence.collectionMethod || evidence.collectionState || evidence.normalizedEvidenceStrength) ? `<p><strong>Traceability</strong>${[
              evidence.collectionMethod ? `Method: ${humanize(evidence.collectionMethod)}` : '',
              evidence.collectionState ? `Collection: ${humanize(evidence.collectionState)}` : '',
              evidence.confidence ? `Confidence: ${humanize(evidence.confidence)}` : '',
              evidence.normalizedEvidenceStrength ? `Strength: ${humanize(evidence.normalizedEvidenceStrength)}` : '',
              evidence.observedAt ? `Observed: ${evidence.observedAt}` : '',
              ...(evidence.artifactRefs || []).map((ref) => `Artifact: ${ref}`)
            ].filter(Boolean).map(escapeHtml).join('<br>')}</p>` : ''}
            ${(finding.controlMappings || []).length ? `<p><strong>Candidate mappings</strong>${(finding.controlMappings || []).map((mapping) => `${escapeHtml(securityMappingFrameworkLabel(mapping, presentation.frameworkDefinitions || {}))} ${escapeHtml(mapping.controlId || '')} — ${escapeHtml((presentation.relationshipDefinitions || {})[mapping.relationship]?.label || humanize(mapping.relationship || 'contextual'))}`).join('<br>')}</p>` : (finding.controls || []).length ? `<p><strong>Candidate mappings</strong>${escapeHtml(finding.controls.join(', '))}</p>` : ''}
            ${(finding.limitations || []).length ? `<p><strong>Limitations</strong>${escapeHtml(finding.limitations.join(' · '))}</p>` : ''}
            ${manualReasons.length ? `<p><strong>Human review required</strong>${securityReviewReasonLabels(manualReasons, presentation.reviewReasonDefinitions || {}).map(escapeHtml).join('<br>')}</p>` : ''}
            ${(finding.references || []).length ? `<p><strong>References</strong>${finding.references.map((ref) => `<a href="${escapeHtml(ref)}" target="_blank" rel="noopener">${escapeHtml(ref)}</a>`).join('<br>')}</p>` : ''}
          </div></details>
          ${finding.fingerprint ? `<details class="security-inline-details security-review-panel"><summary>${reviewState === 'reviewed' ? 'Add review' : 'Review finding'}</summary><div class="security-review-form"><div class="security-review-form-heading"><strong>Human review</strong><span>Decisions are a separate overlay and do not change the technical observation.</span></div><fieldset class="security-review-group security-review-finding-group"><legend class="security-review-group-title">Finding disposition</legend><label class="field"><span>Reviewer decision</span><select class="security-review-decision" data-fingerprint="${escapeHtml(finding.fingerprint)}" data-previous="${escapeHtml(reviewDecision)}"><option value="">No finding disposition</option>${['accepted_as_observation','false_positive','requires_more_evidence'].map((decision) => `<option value="${decision}" ${decision === reviewDecision ? 'selected' : ''}>${escapeHtml(humanize(decision))}</option>`).join('')}</select></label></fieldset><fieldset class="security-review-group"><legend class="security-review-group-title">Scope review</legend><div class="security-review-field-pair"><label class="field"><span>Framework</span><select class="security-scope-framework"><option value="">Select framework</option>${scopeTargets.map((framework) => `<option value="${escapeHtml(framework)}">${escapeHtml(securityMappingFrameworkLabel({ framework }, presentation.frameworkDefinitions || {}))}</option>`).join('')}</select></label><label class="field"><span>Decision</span><select class="security-scope-decision"><option value="">No scope decision</option><option value="confirmed">Confirmed for review scope</option><option value="not_confirmed">Not confirmed</option></select></label></div></fieldset><fieldset class="security-review-group"><legend class="security-review-group-title">Mapping review</legend><div class="security-review-field-pair"><label class="field"><span>Candidate mapping</span><select class="security-mapping-id"><option value="">Select candidate mapping</option>${mappingTargets.map((mapping) => `<option value="${escapeHtml(mapping.mappingId)}">${escapeHtml(mapping.mappingId)} — ${escapeHtml(mapping.controlId || '')}</option>`).join('')}</select></label><label class="field"><span>Decision</span><select class="security-mapping-decision"><option value="">No mapping decision</option><option value="confirmed">Candidate mapping confirmed</option><option value="rejected">Candidate mapping rejected</option></select></label></div></fieldset><fieldset class="security-review-group security-review-note-group"><legend class="security-review-group-title">Reviewer note</legend><label class="field"><span>Evidence-based rationale</span><textarea class="security-lifecycle-reason" maxlength="4000" rows="3" placeholder="Explain the evidence-based decision"></textarea></label></fieldset><div class="security-review-actions"><small>Review changes are stored only after this explicit action.</small><button type="button" class="button button-secondary small security-lifecycle-save">Save review</button></div></div></details>` : ''}
        </div>
      </div>
    </div>
  </article>`;
}

function updateSecurityReviewProgress() {
  const cards = $$('[data-security-finding]');
  const reviewed = cards.filter((card) => card.dataset.review === 'reviewed');
  const decisions = reviewed.reduce((counts, card) => {
    const value = card.querySelector('.security-review-decision')?.value || '';
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
  const target = $('#securityReviewProgress');
  if (target) target.innerHTML = `<div><span>Total</span><strong>${cards.length}</strong></div><div><span>Reviewed</span><strong>${reviewed.length}</strong></div><div><span>Awaiting</span><strong>${cards.length - reviewed.length}</strong></div><div><span>Accepted observations</span><strong>${decisions.accepted_as_observation || 0}</strong></div><div><span>False positives</span><strong>${decisions.false_positive || 0}</strong></div><div><span>More evidence required</span><strong>${decisions.requires_more_evidence || 0}</strong></div>`;
}

function applySecurityFindingFilters() {
  const search = ($('#securityFindingSearch')?.value || '').trim().toLowerCase();
  const severity = $('#securityFindingSeverity')?.value || 'all';
  const category = $('#securityFindingCategory')?.value || 'all';
  const review = $('#securityFindingReview')?.value || 'all';
  const framework = $('#securityFindingFramework')?.value || 'all';
  const disposition = $('#securityFindingDisposition')?.value || 'all';
  const collection = $('#securityFindingCollection')?.value || 'all';
  const manualReason = $('#securityFindingManualReason')?.value || 'all';
  const sort = $('#securityFindingSort')?.value || 'severity';
  let visible = 0;
  for (const card of $$('[data-security-finding]')) {
    const matches = (!search || card.dataset.search.includes(search)) && (severity === 'all' || card.dataset.severity === severity) && (category === 'all' || card.dataset.category === category) && (review === 'all' || card.dataset.review === review) && (framework === 'all' || card.dataset.frameworks.split(' ').includes(framework)) && (disposition === 'all' || card.dataset.disposition === disposition) && (collection === 'all' || card.dataset.collection === collection) && (manualReason === 'all' || card.dataset.manualReasons.split(' ').includes(manualReason));
    card.classList.toggle('hidden', !matches);
    if (matches) visible += 1;
  }
  const severityRank = { critical: 0, high: 1, medium: 2, low: 3, informational: 4 };
  const container = $('.security-findings');
  const sorted = $$('[data-security-finding]').sort((left, right) => {
    if (sort === 'review') return left.dataset.review.localeCompare(right.dataset.review) || left.dataset.title.localeCompare(right.dataset.title);
    if (sort === 'updated') return (right.dataset.updated || '').localeCompare(left.dataset.updated || '') || left.dataset.title.localeCompare(right.dataset.title);
    if (sort === 'framework') return left.dataset.frameworks.localeCompare(right.dataset.frameworks) || left.dataset.title.localeCompare(right.dataset.title);
    if (sort === 'title') return left.dataset.title.localeCompare(right.dataset.title);
    return (severityRank[left.dataset.severity] ?? 9) - (severityRank[right.dataset.severity] ?? 9) || left.dataset.title.localeCompare(right.dataset.title);
  });
  if (container) sorted.forEach((card) => container.append(card));
  const count = $('#securityFindingVisibleCount');
  if (count) count.textContent = `${visible} shown`;
}

function applySecurityObservationMode(mode = 'attention') {
  state.securityObservationMode = mode;
  for (const card of $$('[data-security-observation]')) {
    const emphasized = ['fail', 'warning', 'manual'].includes(card.dataset.status) || card.dataset.state === 'failed_to_test';
    card.classList.toggle('hidden', mode !== 'all' && !emphasized);
  }
  $$('[data-security-observation-mode]').forEach((button) => button.classList.toggle('active', button.dataset.securityObservationMode === mode));
}

function renderSecurityResults(result) {
  const renderStarted = performance.now();
  state.securityResult = result;
  state.securityObservationMode = 'attention';
  const totals = result.totals || {};
  const findings = result.findings || (result.checks || []).filter((check) => ['fail', 'warning'].includes(check.status));
  const testResults = result.testResults || [];
  const testStateCounts = testResults.reduce((counts, item) => ({ ...counts, [item.state]: (counts[item.state] || 0) + 1 }), {});
  const incompleteTests = testResults.filter((item) => ['observed', 'not_tested', 'failed_to_test'].includes(item.state));
  const limitationGroups = incompleteTests.reduce((groups, item) => {
    const category = coverageLimitationCategory(item);
    (groups[category] ||= []).push(item);
    return groups;
  }, {});
  const relationshipDefinitions = result.relationshipDefinitions || {};
  const reviewReasonDefinitions = result.reviewReasonDefinitions || {};
  const collectionCoverageCards = Object.entries(result.collectionCoverage || {}).map(([collector, item]) => `<div class="security-score-card ${item.state === 'failed_to_test' ? 'fail' : item.state === 'partial' ? 'warning' : item.state === 'not_tested' ? 'manual' : 'pass'}"><span>${escapeHtml(humanize(collector))}</span><strong>${escapeHtml(humanize(item.state || 'not_tested'))}</strong>${(item.limitations || []).length ? `<small>${escapeHtml(item.limitations.join(' · '))}</small>` : ''}</div>`).join('');
  const relationshipLegend = `<div class="security-relationship-legend"><strong>Mapping relationships</strong><div>${['direct', 'supporting', 'contextual'].map((relationship) => { const definition = relationshipDefinitions[relationship]; return definition ? `<p><b>${escapeHtml(definition.label)}</b><span>${escapeHtml(definition.shortDescription)}</span></p>` : ''; }).join('')}</div><small>${escapeHtml(result.relationshipDisclaimer || '')}</small></div>`;
  const frameworkCards = (result.frameworkResults || []).map((framework) => {
    const controls = framework.controlEvaluations || [];
    const evidenceCount = (framework.evidenceStatements || []).length + (framework.technicalEvidenceStatements || []).length;
    return `<article class="security-framework-result compact">
      <div class="framework-result-head"><span>${escapeHtml(result.frameworkDefinitions?.[framework.id] || framework.label)}</span><span class="security-status manual">${escapeHtml(framework.applicabilityLabel || 'Applicability not determined')}</span></div>
      <div class="security-framework-metrics"><div><span>Evidence</span><strong>${evidenceCount ? 'Partial technical evidence' : 'Not assessed'}</strong></div><div><span>Candidate controls</span><strong>${controls.length}</strong></div><div><span>Mapping selection</span><strong>${escapeHtml(framework.selectionLabel || 'Selected for mapping')}</strong></div><div><span>Applicability</span><strong>${escapeHtml(framework.applicabilityLabel || 'Applicability not determined')}</strong></div></div>
      <details class="security-inline-details"><summary>View evidence</summary><div class="security-detail-body"><p><strong>Scope basis</strong>${escapeHtml(humanize(framework.scopeBasis || 'not_determined'))} · Confidence ${escapeHtml(humanize(framework.scopeConfidence || 'not_determined'))}</p><p><strong>Control satisfaction</strong>${escapeHtml(humanize(framework.controlSatisfaction || 'not_determined'))}</p>${(framework.manualReviewReasons || []).length ? `<p><strong>Human review required</strong>${securityReviewReasonLabels(framework.manualReviewReasons, reviewReasonDefinitions).map(escapeHtml).join('<br>')}</p>` : ''}${[...(framework.evidenceStatements || []), ...(framework.technicalEvidenceStatements || [])].length ? `<p><strong>Observed evidence</strong>${[...(framework.evidenceStatements || []), ...(framework.technicalEvidenceStatements || [])].map((item) => escapeHtml(item.statement)).join('<br>')}</p>` : ''}${controls.length ? `<p><strong>Candidate controls</strong>${controls.map((control) => { const sources = control.provenanceSummary?.sourceCheckCount ?? (control.automatedEvidence || []).length; const qualifiers = (control.coverageQualifiers || []).map(humanize).join(', ') || 'coverage complete for listed sources'; const reasons = securityReviewReasonLabels(control.manualReviewReasons || [], reviewReasonDefinitions); return `${escapeHtml(control.controlId)} — ${escapeHtml(humanize(control.state))}<br><small>${sources} technical observation${sources === 1 ? '' : 's'} (provenance breadth, not assurance strength) · ${escapeHtml(qualifiers)}</small>${reasons.length ? `<br><small>Human review required: ${reasons.map(escapeHtml).join(', ')}</small>` : ''}`; }).join('<br>')}</p>` : ''}${(framework.missingEvidence || []).length ? `<p><strong>Limitations</strong>${framework.missingEvidence.map(escapeHtml).join('<br>')}</p>` : ''}</div></details>
    </article>`;
  }).join('');

  const availableLocales = result.localeCoverage?.availableLocales || [];
  const testedLocales = result.localeCoverage?.policyLocalesTested || [];
  const untestedLocales = availableLocales.filter((locale) => !testedLocales.includes(locale));
  const payment = result.paymentFlow || {};
  const gdprMatrix = result.gdprPublicNoticeMatrix || [];
  const gdprAggregate = result.gdprPublicNoticeAggregate || 'not_assessed';
  const gdprCounts = gdprMatrix.reduce((counts, item) => ({ ...counts, [item.state]: (counts[item.state] || 0) + 1 }), {});
  const evidenceArtifacts = result.evidenceManifest?.artifacts || [];
  const evidenceHashes = evidenceArtifacts.filter((item) => /^[a-f0-9]{64}$/i.test(item.sha256 || '')).length;
  const evidenceRestricted = evidenceArtifacts.filter((item) => item.sensitive).length;
  const integrityPresentation = result.integrityPresentation || {
    artifactHashLabel: 'Artifacts with SHA-256 recorded',
    artifactHashValue: `${evidenceHashes} / ${evidenceArtifacts.length}`,
    manifestLabel: 'Manifest hash metadata',
    manifestValue: evidenceArtifacts.length && evidenceHashes === evidenceArtifacts.length ? 'Complete metadata; Not verified in this view' : evidenceArtifacts.length ? 'Incomplete metadata; Not verified in this view' : 'No artifact metadata',
    signatureLabel: 'Signature metadata',
    signatureValue: result.reportManifest?.signature?.algorithm === 'hmac-sha256' ? 'HMAC signature recorded; Not verified in this view' : 'Not configured'
  };

  const categories = [...new Set(findings.map((finding) => finding.category || 'Uncategorized'))].sort();
  const severities = [...new Set(findings.map((finding) => finding.severity || 'informational'))];
  const frameworkOptions = (result.frameworkResults || []).map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.label)}</option>`).join('');
  const observationCards = (result.checks || []).map((check) => `<article class="security-observation-row" data-security-observation data-status="${escapeHtml(check.status || '')}" data-state="${escapeHtml(check.testState || '')}"><span class="security-status ${check.status === 'fail' ? 'fail' : check.status === 'warning' ? 'warning' : check.status === 'manual' ? 'manual' : 'pass'}"><i></i>${escapeHtml(securityStatusLabel(check.status))}</span><div><strong>${escapeHtml(check.title)}</strong><span>${escapeHtml(check.summary || '')}</span></div></article>`).join('');
  const crawlPages = result.crawl?.pages || [];
  const successfulPages = crawlPages.filter((page) => page.found);
  const redirectPages = crawlPages.filter((page) => page.status >= 300 && page.status < 400);
  const unsuccessfulPages = crawlPages.filter((page) => !page.found);
  const notFoundPages = unsuccessfulPages.filter((page) => page.status === 404);
  const failedPages = unsuccessfulPages.filter((page) => page.status !== 404);

  refs.securityResults.innerHTML = `
    <nav class="security-results-nav" aria-label="Assessment sections"><a href="#securityOverview">Overview</a><a href="#securityScope">Scope</a><a href="#securityEvidence">Evidence</a><a href="#securityFindings">Findings</a><a href="#securityMappings">Mappings</a><a href="#securityCrawl">Crawl</a><a href="#securityReview">Review</a></nav>
    <section id="securityOverview" class="security-workspace-section">
      <div class="security-result-header"><div><div class="eyebrow mini">${escapeHtml(result.projectName)}</div><h4>${escapeHtml(result.finalUrl)}</h4><span>HTTP ${escapeHtml(result.responseStatus)} · ${new Date(result.generatedAt).toLocaleString()}</span></div><span class="security-overall ${escapeHtml(result.overallStatus)}">${findings.length ? `${findings.length} finding${findings.length === 1 ? '' : 's'}` : 'No normalized findings in tested scope'}</span></div>
      <div class="security-assessment-boundary"><strong>Technical compliance pre-assessment</strong><span>Compliance conclusion: ${escapeHtml(humanize(result.complianceConclusion || 'not_determined'))} · Coverage: ${escapeHtml(humanize(result.coverage || 'partial'))} · Control satisfaction remains not determined.</span></div>
      <div class="security-section-title"><div><h4>Assessment quality</h4><span>Collection state describes technical test coverage, not compliance confirmation.</span></div></div>
      <div class="security-score-grid security-coverage-grid"><div class="security-score-card pass"><span>Technical checks completed</span><strong>${testStateCounts.confirmed || 0}</strong></div><div class="security-score-card warning"><span>Observed / partial evidence</span><strong>${testStateCounts.observed || 0}</strong></div><div class="security-score-card manual"><span>Not assessed</span><strong>${testStateCounts.not_tested || 0}</strong></div><div class="security-score-card fail"><span>Failed to test</span><strong>${testStateCounts.failed_to_test || 0}</strong></div></div>
      <div class="security-section-title"><div><h4>Collection Coverage</h4><span>Collector states describe bounded execution only; they are not a score or compliance conclusion.</span></div></div>
      <div class="security-score-grid security-coverage-grid">${collectionCoverageCards || '<div class="empty-state">Legacy report: collection-level coverage was not recorded.</div>'}</div>
      <div class="security-section-title"><div><h4>Technical observations</h4><span>Attention-focused by default; all observations remain available.</span></div><div class="security-toggle-group"><button type="button" class="button button-secondary small active" data-security-observation-mode="attention">Needs review</button><button type="button" class="button button-ghost small" data-security-observation-mode="all">Show all checks</button></div></div>
      <div class="security-observation-list">${observationCards || '<div class="empty-state">No technical observations were recorded.</div>'}</div>
    </section>

    <section id="securityScope" class="security-workspace-section">
      <div class="security-section-title"><div><h4>Scope &amp; coverage limitations</h4><span>Incomplete and partial evidence remains available for review.</span></div></div>
      ${incompleteTests.length ? `<details class="security-summary-details"><summary><div><strong>Coverage limitations</strong><span>${incompleteTests.length} areas require review</span></div><div class="security-limitation-counts">${Object.entries(limitationGroups).map(([label, items]) => `<span>${escapeHtml(label)} <b>${items.length}</b></span>`).join('')}</div><span class="security-chevron"><svg viewBox="0 0 20 20"><path d="m6 8 4 4 4-4"/></svg></span></summary><div class="security-detail-list">${Object.entries(limitationGroups).map(([label, items]) => `<section><h5>${escapeHtml(label)}</h5>${items.map((item) => `<article><span class="security-status ${item.state === 'failed_to_test' ? 'fail' : item.state === 'not_tested' ? 'manual' : 'warning'}">${escapeHtml(securityStatusLabel(item.state))}</span><div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.summary || '')}</p>${(item.limitations || []).length ? `<small>${escapeHtml(item.limitations.join(' · '))}</small>` : ''}</div></article>`).join('')}</section>`).join('')}</div></details>` : '<div class="empty-state">No incomplete coverage items were recorded.</div>'}
    </section>

    <section id="securityEvidence" class="security-workspace-section">
      <div class="security-section-title"><div><h4>Structured public evidence</h4><span>Concise states with bounded evidence context.</span></div></div>
      <div class="security-structured-grid">
        <article class="security-evidence-card"><span>Public policy evidence</span><strong>${(result.policyDocumentQuality || []).length} document(s) assessed</strong><div>${(result.policyDocumentQuality || []).slice(0, 4).map((item) => `<p><b>${escapeHtml(item.sourceUrl)}</b><small>Quality: ${escapeHtml(humanize(item.policyDocumentQuality))} · Locale: ${escapeHtml(item.detectedLocale || 'unknown')} · Extraction: ${item.policyDocumentQuality === 'failed_to_extract' ? 'failed' : 'successful'}</small></p>`).join('') || '<p>Not assessed</p>'}</div></article>
        <article class="security-evidence-card"><span>Locale coverage</span><strong>${escapeHtml(humanize(result.localeCoverage?.state || 'locale_parity_not_assessed'))}</strong><dl><div><dt>Detected</dt><dd>${escapeHtml(availableLocales.join(', ') || 'none')}</dd></div><div><dt>Tested</dt><dd>${escapeHtml(testedLocales.join(', ') || 'none')}</dd></div><div><dt>Untested</dt><dd>${escapeHtml(untestedLocales.join(', ') || 'none')}</dd></div></dl></article>
        <article class="security-evidence-card"><span>Payment-flow evidence</span><strong>${payment.paymentFlowObserved ? 'Observed / partial evidence' : 'Not determined'}</strong><dl><div><dt>Terminology</dt><dd>${payment.cardTerminologyObserved ? 'Observed' : 'Not observed'}</dd></div><div><dt>Provider evidence</dt><dd>${escapeHtml(payment.providerHosts?.join(', ') || 'Not observed')}</dd></div><div><dt>Architecture</dt><dd>${escapeHtml(humanize(payment.architecture || 'unknown'))}</dd></div><div><dt>Origin participation</dt><dd>${payment.testedOriginParticipatesInPaymentFlow === true ? 'Observed' : 'Unknown'}</dd></div><div><dt>Card-data handling</dt><dd>Not determined</dd></div></dl></article>
        <details class="security-evidence-card security-gdpr-matrix"><summary><div><span>GDPR public-notice evidence</span><strong>${escapeHtml(humanize(gdprAggregate))}</strong><small>${gdprMatrix.length} elements · Observed ${gdprCounts.observed || 0} · Partial ${gdprCounts.partially_observed || 0} · Not observed ${gdprCounts.not_observed || 0} · Not assessed ${gdprCounts.not_assessed || 0}</small></div><span class="button button-ghost small">View matrix</span></summary><div class="security-gdpr-grid">${gdprMatrix.map((item) => `<article><div><strong>${escapeHtml(humanize(item.element))}</strong><span class="security-status ${item.state === 'observed' ? 'pass' : item.state === 'partially_observed' ? 'warning' : item.state === 'failed_to_assess' ? 'fail' : 'manual'}">${escapeHtml(humanize(item.state))}</span></div>${item.evidenceItems?.[0]?.sourceUrl ? `<p>Source: ${escapeHtml(item.evidenceItems[0].sourceUrl)} · Confidence: ${escapeHtml(humanize(item.confidence))}</p>` : item.state === 'not_observed' ? '<p>No matching public evidence was observed. This does not determine GDPR compliance.</p>' : `<p>${escapeHtml(item.reason || 'No applicable assessment was performed.')}</p>`}${item.evidenceItems?.[0]?.excerpt ? `<details><summary>Evidence excerpt</summary><p>${escapeHtml(item.evidenceItems[0].excerpt)}</p></details>` : ''}</article>`).join('') || '<div class="empty-state">Matrix not assessed.</div>'}</div></details>
      </div>
      ${result.evidenceManifest ? `<div class="security-integrity-summary"><div><span>${escapeHtml(integrityPresentation.artifactHashLabel)}</span><strong>${escapeHtml(integrityPresentation.artifactHashValue)}</strong></div><div><span>${escapeHtml(integrityPresentation.manifestLabel)}</span><strong>${escapeHtml(integrityPresentation.manifestValue)}</strong></div><div><span>Hash algorithm</span><strong>SHA-256 recorded</strong></div><div><span>${escapeHtml(integrityPresentation.signatureLabel)}</span><strong>${escapeHtml(integrityPresentation.signatureValue)}</strong></div><div><span>Restricted</span><strong>${evidenceRestricted}</strong></div><div><span>Metadata-safe</span><strong>${evidenceArtifacts.length - evidenceRestricted}</strong></div></div>` : ''}
    </section>

    <section id="securityFindings" class="security-workspace-section">
      <div class="security-section-title"><div><h4>Technical findings</h4><span>One-column review queue; filters affect this workspace view only.</span></div><span id="securityFindingVisibleCount" class="pill">${findings.length} shown</span></div>
      <div id="securityReview" class="security-review-toolbar"><div class="security-review-context"><label class="field"><span>Reviewing as</span><input id="securityReviewerContext" type="text" maxlength="80" placeholder="Reviewer name or role" autocomplete="off"></label><small>Used for review actions only; not stored in browser persistence.</small></div><div id="securityReviewProgress" class="security-review-progress"></div><small>Review decisions do not change the compliance conclusion or control satisfaction.</small></div>
      <div class="security-finding-filters" role="group" aria-label="Finding filters"><label class="field"><span>Search</span><input id="securityFindingSearch" type="search" placeholder="ID, title, URL, note…"></label><label class="field"><span>Severity</span><select id="securityFindingSeverity"><option value="all">All severities</option>${severities.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(humanize(value))}</option>`).join('')}</select></label><label class="field"><span>Category</span><select id="securityFindingCategory"><option value="all">All categories</option>${categories.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('')}</select></label><label class="field"><span>Review status</span><select id="securityFindingReview"><option value="all">All review states</option><option value="awaiting">Awaiting review</option><option value="reviewed">Reviewed</option></select></label><label class="field"><span>Disposition</span><select id="securityFindingDisposition"><option value="all">All dispositions</option><option value="accepted_as_observation">Accepted observation</option><option value="false_positive">False positive</option><option value="requires_more_evidence">Requires more evidence</option><option value="not_reviewed">Not reviewed</option></select></label><label class="field"><span>Collection state</span><select id="securityFindingCollection"><option value="all">All collection states</option><option value="completed">Completed</option><option value="partial">Partial</option><option value="failed_to_test">Failed to test</option><option value="not_tested">Not assessed</option></select></label><label class="field"><span>Manual review reason</span><select id="securityFindingManualReason"><option value="all">All manual-review reasons</option>${Object.keys(result.reviewReasonDefinitions || {}).map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(securityReviewReasonLabels([value], reviewReasonDefinitions)[0] || humanize(value))}</option>`).join('')}</select></label><label class="field"><span>Framework mapping</span><select id="securityFindingFramework"><option value="all">All frameworks</option>${frameworkOptions}</select></label><label class="field"><span>Sort</span><select id="securityFindingSort"><option value="severity">Severity</option><option value="review">Review status</option><option value="updated">Review updated</option><option value="framework">Framework</option><option value="title">Finding title</option></select></label></div>
      <div class="security-findings">${findings.map((finding) => renderFindingCard(finding, result)).join('') || '<div class="security-disclaimer"><strong>No normalized findings:</strong> No adverse conditions met the scanner finding thresholds. Review test coverage before drawing conclusions.</div>'}</div>
    </section>

    <section id="securityMappings" class="security-workspace-section"><div class="security-section-title"><div><h4>Framework evidence &amp; candidate mappings</h4><span>Compact scope summaries; expand a framework for evidence and control detail.</span></div></div>${relationshipLegend}<div class="security-framework-results">${frameworkCards}</div></section>

    <section id="securityCrawl" class="security-workspace-section"><div class="security-section-title"><div><h4>Crawl results</h4><span>Successful evidence pages first; discovery failures remain available as diagnostics.</span></div></div>${crawlPages.length ? `<div class="security-crawl-metrics"><div><span>Successful pages</span><strong>${successfulPages.length}</strong></div><div><span>Redirects</span><strong>${redirectPages.length}</strong></div><div><span>Candidate paths tested</span><strong>${crawlPages.length}</strong></div><div><span>Not found</span><strong>${notFoundPages.length}</strong></div></div><div class="security-crawl-success">${successfulPages.map((page) => `<article><span class="security-crawl-badge status-${page.status}">${page.status || 200}</span><span class="security-crawl-badge provenance">${escapeHtml(crawlSourceLabel(page.source, page.status))}</span><strong>${escapeHtml(page.url)}</strong></article>`).join('') || '<div class="empty-state">No successful evidence pages were discovered.</div>'}</div>${unsuccessfulPages.length ? `<details class="security-summary-details security-crawl-failures"><summary><div><strong>Show ${unsuccessfulPages.length} unsuccessful discovery attempt${unsuccessfulPages.length === 1 ? '' : 's'}</strong><span>${notFoundPages.length} not found · ${failedPages.length} failed or skipped</span></div><span class="security-chevron"><svg viewBox="0 0 20 20"><path d="m6 8 4 4 4-4"/></svg></span></summary><div class="security-crawl-diagnostics">${unsuccessfulPages.map((page) => `<article><span class="security-crawl-badge ${page.status === 404 ? 'status-404' : 'status-failed'}">${page.status || 'Failed'}</span><span class="security-crawl-badge provenance">${escapeHtml(crawlSourceLabel(page.source, page.status))}</span><div><strong>${escapeHtml(page.url)}</strong>${page.error ? `<small>${escapeHtml(page.error)}</small>` : ''}</div></article>`).join('')}</div></details>` : ''}` : `<div class="empty-state">${escapeHtml(result.crawl?.error || 'Crawl evidence was not collected for this assessment.')}</div>`}</section>`;

  const primaryDownloads = [[result.summaryHref, 'Open Report', false], [result.pdfHref, 'Download PDF', true]].filter(([href]) => Boolean(href));
  const secondaryDownloads = [[result.csvHref, 'Findings CSV', true], [result.evidenceManifestHref, 'Evidence Manifest', true]].filter(([href]) => Boolean(href));
  refs.securityResultActions.innerHTML = `${primaryDownloads.map(([href, label, download, filename]) => `<a class="button ${label === 'Open Report' ? 'button-secondary' : 'button-primary'} small" href="${escapeHtml(href)}" ${download ? 'download' : 'target="_blank" rel="noopener"'}>${label}</a>`).join('')}${secondaryDownloads.length ? `<details class="security-export-menu"><summary class="button button-ghost small">More Exports</summary><div>${secondaryDownloads.map(([href, label]) => `<a href="${escapeHtml(href)}" download>${label}</a>`).join('')}</div></details>` : ''}`;
  refs.securityResultsCard.classList.remove('hidden');
  setSecurityConfigurationCollapsed(true, result);
  updateSecurityReviewProgress();
  applySecurityFindingFilters();
  applySecurityObservationMode('attention');
  refs.securityResultsCard.dataset.renderMs = (performance.now() - renderStarted).toFixed(2);
  refs.securityResultsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function runSecurityScan() {
  if (!validateSecurityScan()) {
    toast('Fix the highlighted fields before generating the compliance map.', true);
    return;
  }
  refs.startSecurityScanBtn.disabled = true;
  refs.startSecurityScanBtn.textContent = 'Mapping evidence…';
  refs.securityScanState.className = 'security-scan-state running';
  refs.securityScanState.innerHTML = '<span class="security-spinner"></span><div><strong>Collecting evidence…</strong><small>Checking transport, headers, cookies and page signals, then mapping controls.</small></div>';
  try {
    const scanConfig = {
      projectName: refs.securityProjectName.value.trim(),
      targetUrl: refs.securityTargetUrl.value.trim(),
      jurisdiction: refs.securityJurisdiction.value.trim(),
      frameworks: selectedSecurityFrameworks(),
      frameworkApplicability: {
        gdpr: refs.securityGdprApplicability?.value || 'unknown',
        hipaa: refs.securityHipaaApplicability?.value || 'unknown',
        'pci-dss': refs.securityPciApplicability?.value || 'unknown',
        local: refs.securityLocalApplicability?.value || 'unknown'
      },
      crawl: refs.securityCrawlEnabled ? refs.securityCrawlEnabled.checked : true,
      maxCrawlPages: refs.securityMaxPages ? Number(refs.securityMaxPages.value) || 10 : 10,
      consentTesting: refs.securityAdvancedConsent?.checked ? { mode: 'advanced', scenarios: ['accept','reject','reopen_preferences','withdraw','reload_persistence','returning_user'] } : { mode: 'basic', scenarios: ['fresh_load'] },
      authentication: refs.securityAuthEnabled?.checked ? {
        enabled: true,
        role: refs.securityAuthRole.value === 'custom' ? refs.securityAuthCustomRole.value.trim() : refs.securityAuthRole.value,
        loginUrl: refs.securityLoginUrl.value.trim(),
        usernameSelector: refs.securityUsernameSelector.value.trim(),
        passwordSelector: refs.securityPasswordSelector.value.trim(),
        submitSelector: refs.securitySubmitSelector.value.trim(),
        successUrlPattern: refs.securitySuccessUrl.value.trim(),
        username: refs.securityAuthUsername.value,
        password: refs.securityAuthPassword.value,
        reuseSession: refs.securityReuseSession.checked
      } : { enabled: false },
      zap: {
        mode: refs.securityZapMode.value,
        contextFile: refs.securityZapContextFile.value.trim(),
        contextUser: refs.securityZapContextUser.value.trim(),
        timeoutMinutes: Number(refs.securityZapTimeout.value) || 10
      }
    };
    const result = await api('/api/security/scan', {
      method: 'POST',
      body: JSON.stringify(scanConfig)
    });
    renderSecurityResults(result);
    refs.securityScanState.className = 'security-scan-state success';
    refs.securityScanState.innerHTML = `<span class="security-state-dot"></span><div><strong>Compliance map generated</strong><small>${result.totals?.pass || 0} supported checks · ${(result.totals?.fail || 0) + (result.totals?.warning || 0)} need attention/review.</small></div>`;
    toast('Compliance mapping report generated.');
    loadHistory();
  } catch (error) {
    refs.securityScanState.className = 'security-scan-state error';
    refs.securityScanState.innerHTML = `<span class="security-state-dot"></span><div><strong>Mapping failed</strong><small>${escapeHtml(error.message)}</small></div>`;
    toast(error.message, true);
  } finally {
    refs.startSecurityScanBtn.disabled = false;
    refs.startSecurityScanBtn.textContent = 'Run technical pre-assessment';
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
setSegment('#linksScopeSelector .segment', 'selected', (value) => {
  state.linksScope = value;
  updateLinksRunSummary();
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
refs.urls.addEventListener('input', () => autoSizePageList(refs.urls));

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
  refs.flowPanel.classList.toggle('hidden', !refs.flowEnabled.checked);
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
refs.securityProjectName?.addEventListener('input', updateSecuritySetupSummaries);
refs.securityTargetUrl?.addEventListener('input', updateSecuritySetupSummaries);
refs.securityProjectName?.addEventListener('blur', validateSecurityScan);
refs.securityTargetUrl?.addEventListener('blur', validateSecurityScan);
refs.securityAuthEnabled?.addEventListener('change', () => {
  refs.securityAuthConfig?.classList.toggle('hidden', !refs.securityAuthEnabled.checked);
  validateSecurityScan();
  updateSecuritySetupSummaries();
});
refs.securityAuthRole?.addEventListener('change', () => {
  refs.securityAuthCustomRoleField?.classList.toggle('hidden', refs.securityAuthRole.value !== 'custom');
  validateSecurityScan();
  updateSecuritySetupSummaries();
});
refs.securityAuthCustomRole?.addEventListener('input', () => { validateSecurityScan(); updateSecuritySetupSummaries(); });
refs.securityAdvancedConsent?.addEventListener('change', updateSecuritySetupSummaries);
refs.securityCrawlEnabled?.addEventListener('change', updateSecuritySetupSummaries);
refs.securityMaxPages?.addEventListener('input', updateSecuritySetupSummaries);
refs.securityZapMode?.addEventListener('change', syncSecurityZapFields);
syncSecurityZapFields({ validate: false });
refs.securityResults?.addEventListener('click', async (event) => {
  const observationButton = event.target.closest('[data-security-observation-mode]');
  if (observationButton) {
    applySecurityObservationMode(observationButton.dataset.securityObservationMode);
    return;
  }
  const decisionButton = event.target.closest('.security-lifecycle-save');
  if (!decisionButton) return;
  const controls = decisionButton.closest('.security-review-panel');
  const select = controls.querySelector('.security-review-decision');
  const scopeDecision = controls.querySelector('.security-scope-decision').value;
  const scopeFramework = controls.querySelector('.security-scope-framework').value;
  const mappingDecision = controls.querySelector('.security-mapping-decision').value;
  const mappingId = controls.querySelector('.security-mapping-id').value;
  const reason = controls.querySelector('.security-lifecycle-reason').value.trim();
  const reviewer = $('#securityReviewerContext')?.value.trim() || 'local-user';
  const previous = select.dataset.previous || '';
  if (!(select.value || scopeDecision || mappingDecision) || !reason) {
    select.value = previous;
    toast('Choose a finding, scope, or mapping decision and add a reason.', true);
    return;
  }
  try {
    decisionButton.disabled = true;
    const saved = await api(`/api/security/findings/${encodeURIComponent(select.dataset.fingerprint)}/reviews`, { method: 'POST', body: JSON.stringify({ projectName: state.securityResult?.projectName || refs.securityProjectName.value.trim(), expectedWorkflowRevision: state.securityResult?.workflow?.revision ?? 0, findingStatus: 'reviewed', reviewDecision: select.value, scopeDecision, scopeFramework, mappingDecision, mappingId, reason, reviewer, role: 'reviewer' }) });
    if (state.securityResult?.workflow) state.securityResult.workflow.revision = saved.workflowRevision;
    select.dataset.previous = select.value;
    const card = controls.closest('[data-security-finding]');
    card.dataset.review = 'reviewed';
    card.dataset.disposition = select.value;
    card.dataset.updated = saved.updatedAt || '';
    const badge = card.querySelector('.finding-review-state');
    if (badge) {
      badge.className = 'security-review-badge finding-review-state reviewed';
      badge.textContent = humanize(select.value || (scopeDecision ? `scope_${scopeDecision}` : `mapping_${mappingDecision}`));
    }
    const finding = state.securityResult?.findings?.find((item) => item.fingerprint === select.dataset.fingerprint);
    if (finding) { finding.reviewDecision = select.value; finding.decision = saved; }
    controls.open = false;
    updateSecurityReviewProgress();
    applySecurityFindingFilters();
    toast(`Review saved explicitly as ${humanize(select.value || (scopeDecision ? `scope_${scopeDecision}` : `mapping_${mappingDecision}`))}; Report History refreshed.`);
  } catch (error) {
    select.value = previous;
    toast(error.message, true);
  } finally {
    decisionButton.disabled = false;
  }
});
refs.securityResults?.addEventListener('input', (event) => {
  if (event.target.matches('#securityFindingSearch')) applySecurityFindingFilters();
});
refs.securityResults?.addEventListener('change', (event) => {
  if (event.target.matches('#securityFindingSeverity, #securityFindingCategory, #securityFindingReview, #securityFindingDisposition, #securityFindingCollection, #securityFindingManualReason, #securityFindingFramework, #securityFindingSort')) applySecurityFindingFilters();
});
refs.securityProjectContext?.addEventListener('click', (event) => {
  if (!event.target.closest('[data-security-project-override]')) return;
  state.securityProjectOverride = true;
  renderSecurityConfigurationContext();
  refs.securityProjectName?.focus();
});
refs.securityConfigSummary?.addEventListener('click', (event) => {
  if (event.target.closest('[data-security-edit-config]')) {
    setSecurityConfigurationCollapsed(false);
    refs.securityConfigPanel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  if (event.target.closest('[data-security-run-again]')) {
    setSecurityConfigurationCollapsed(false);
    runSecurityScan();
  }
});
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
refs.assetPaths?.addEventListener('input', () => autoSizePageList(refs.assetPaths));
refs.linksProjectName?.addEventListener('blur', validateLinksForm);
refs.linksBaseUrl?.addEventListener('blur', validateLinksForm);
refs.linksPages?.addEventListener('blur', () => { if (!refs.linksPages.value.trim()) refs.linksPages.value = '/'; autoSizePageList(refs.linksPages); validateLinksForm(); updateLinksRunSummary(); });
refs.linksPages?.addEventListener('input', () => autoSizePageList(refs.linksPages));
[refs.linksProjectName, refs.linksBaseUrl, refs.linksPages, refs.linksMaxPages, refs.linksMaxTargets, refs.linksTimeout, refs.linksConcurrency, refs.linksMaxRedirects, refs.linksIgnorePatterns].forEach((element) => element?.addEventListener('input', updateLinksRunSummary));
[refs.linksCheckExternal, refs.linksCheckFragments, refs.linksCheckResources].forEach((element) => element?.addEventListener('change', updateLinksRunSummary));
refs.startLinksCheckBtn?.addEventListener('click', runLinksCheck);
refs.linksResults?.addEventListener('input', (event) => { if (event.target.matches('#linksResultSearch')) applyLinksFilters(); });
refs.linksResults?.addEventListener('change', (event) => {
  if (event.target.matches('#linksResultOutcome, #linksResultType, #linksResultScope, #linksResultStatus, #linksResultSource, #linksResultSort')) applyLinksFilters();
  if (event.target.matches('#linksResultPageSize')) { state.linksResultPageSize = Number(event.target.value) || 25; state.linksResultPage = 1; renderLinksTargetPage(); }
});
refs.linksResults?.addEventListener('click', (event) => {
  const view = event.target.closest('[data-links-view]');
  if (view) { setLinksResultView(view.dataset.linksView); return; }
  const shortcut = event.target.closest('[data-links-summary-outcome]');
  if (shortcut) { const outcome = shortcut.dataset.linksSummaryOutcome; setLinksResultView(linksViewForOutcome(outcome), outcome === 'healthy' ? 'all' : outcome); return; }
  if (event.target.closest('#linksClearFilters, [data-links-clear-filters]')) { clearLinksFilters(); return; }
  if (event.target.closest('#linksResultPrevious')) { state.linksResultPage -= 1; renderLinksTargetPage(); return; }
  if (event.target.closest('#linksResultNext')) { state.linksResultPage += 1; renderLinksTargetPage(); return; }
  const showAll = event.target.closest('[data-show-all-occurrences]');
  if (showAll) { state.linksExpandedOccurrences.add(showAll.dataset.showAllOccurrences); renderLinksTargetPage(); return; }
  const copy = event.target.closest('[data-copy-links-target]');
  if (copy) copyText(copy.dataset.copyLinksTarget || '', 'Target URL copied.');
});

refs.healthDetails?.addEventListener('click', (event) => {
  const button = event.target.closest('.copy-command-btn');
  if (!button) return;
  copyText(button.dataset.command || '', 'Command copied.');
});
refs.copyAllFixesBtn?.addEventListener('click', () => copyText(refs.copyAllFixesBtn.dataset.commands || '', 'Fix commands copied.'));
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
  if (active && ['runner', 'security', 'assets', 'links'].includes(button.dataset.section)) syncSharedProjectToTools(active, { overwrite: false });
  if (button.dataset.section === 'security') {
    if (!refs.securityProjectName.value.trim() && refs.projectName.value.trim()) refs.securityProjectName.value = refs.projectName.value.trim();
    if (!refs.securityTargetUrl.value.trim() && refs.baseUrl.value.trim()) refs.securityTargetUrl.value = refs.baseUrl.value.trim();
  }
  if (button.dataset.section === 'assets') {
    if (!refs.assetProjectName.value.trim() && refs.projectName.value.trim()) refs.assetProjectName.value = refs.projectName.value.trim();
    if (!refs.assetBaseUrl.value.trim() && refs.baseUrl.value.trim()) refs.assetBaseUrl.value = refs.baseUrl.value.trim();
    if (!refs.assetPaths.value.trim() && refs.urls.value.trim()) refs.assetPaths.value = refs.urls.value.trim();
    autoSizePageList(refs.assetPaths);
  }
  if (button.dataset.section === 'links') {
    if (!refs.linksProjectName.value.trim() && refs.projectName.value.trim()) refs.linksProjectName.value = refs.projectName.value.trim();
    if (!refs.linksBaseUrl.value.trim() && refs.baseUrl.value.trim()) refs.linksBaseUrl.value = refs.baseUrl.value.trim();
    if ((!refs.linksPages.value.trim() || refs.linksPages.value.trim() === '/') && refs.urls.value.trim()) refs.linksPages.value = refs.urls.value.trim();
    autoSizePageList(refs.linksPages);
    updateLinksRunSummary();
  }
  if (button.dataset.section === 'projects') loadProjects();
  if (button.dataset.section === 'history') loadHistory();
}));

syncSecurityFrameworks();
updateLinksRunSummary();
updateEstimate();
autoSizeToolPageLists();
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
