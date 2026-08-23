import { EventEmitter } from 'node:events';
import crypto from 'node:crypto';
import { runSingleLighthouse } from './lighthouse-runner.js';
import { runSetupFlow } from './flow-runner.js';

export class RunManager {
  constructor({ browserManager, reportManager, flowsDir }) {
    this.browserManager = browserManager;
    this.reportManager = reportManager;
    this.flowsDir = flowsDir;
    this.jobs = new Map();
  }

  get(id) {
    return this.jobs.get(id);
  }

  create(config) {
    const id = crypto.randomUUID();
    const projectName = String(config.projectName || '').trim();
    const baseUrl = String(config.baseUrl || '').trim();
    const devices = Array.isArray(config.devices) ? config.devices.filter((item) => ['mobile', 'desktop'].includes(item)) : [];
    const categories = Array.isArray(config.categories)
      ? [...new Set(config.categories.filter((item) => ['performance', 'accessibility', 'best-practices', 'seo'].includes(item)))]
      : ['performance', 'accessibility', 'best-practices', 'seo'];
    const runsPerPage = Number(config.runsPerPage);
    const urls = (config.urls || []).map((item) => String(item).trim()).filter(Boolean);

    if (!projectName) throw new Error('Project name is required.');
    if (projectName.length < 2) throw new Error('Project name must contain at least 2 characters.');
    if (!baseUrl) throw new Error('Base URL is required.');
    let parsedBase;
    try { parsedBase = new URL(baseUrl); } catch { throw new Error('Base URL must be a valid URL.'); }
    if (!['http:', 'https:'].includes(parsedBase.protocol)) throw new Error('Base URL must use http:// or https://.');
    if (!Number.isInteger(runsPerPage) || runsPerPage < 1 || runsPerPage > 10) throw new Error('Runs per page must be a whole number from 1 to 10.');
    if (!urls.length) throw new Error('Add at least one target URL.');
    if (!devices.length) throw new Error('Select at least one device.');
    if (!categories.length) throw new Error('Select at least one Lighthouse category.');
    for (const [index, target] of urls.entries()) {
      if (target.startsWith('/')) continue;
      try {
        const parsed = new URL(target);
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
      } catch {
        throw new Error(`Target URL on line ${index + 1} must start with / or be a full http(s) URL.`);
      }
    }

    const normalized = { ...config, projectName, baseUrl, devices, categories, runsPerPage, urls };
    const totalRuns = urls.length * devices.length * runsPerPage;
    const job = {
      id,
      config: normalized,
      status: 'queued',
      createdAt: new Date().toISOString(),
      startedAt: null,
      finishedAt: null,
      current: 0,
      totalRuns,
      valid: 0,
      redirected: 0,
      failed: 0,
      cancelled: 0,
      records: [],
      summary: [],
      error: null,
      reportName: null,
      emitter: new EventEmitter(),
      abortController: new AbortController()
    };
    this.jobs.set(id, job);
    queueMicrotask(() => this.execute(job));
    return this.publicJob(job);
  }

  publicJob(job) {
    if (!job) return null;
    const { emitter, abortController, ...data } = job;
    return data;
  }

  emit(job, type, payload = {}) {
    job.emitter.emit('event', { type, at: new Date().toISOString(), ...payload });
  }

  async execute(job) {
    try {
      job.status = 'running';
      job.startedAt = new Date().toISOString();
      const browser = await this.browserManager.status();
      if (!browser.running) throw new Error('Launch the browser before starting Lighthouse.');

      const { root, runName } = this.reportManager.createRunDirectory(job.config);
      job.reportName = runName;
      this.reportManager.writeMetadata(root, job.config, { browser: browser.browserName, debugPort: browser.port });
      this.emit(job, 'started', { totalRuns: job.totalRuns, reportName: runName });

      if (job.config.flowScript?.trim()) {
        this.emit(job, 'phase', { message: 'Running Playwright setup flow…' });
        await runSetupFlow({
          script: job.config.flowScript,
          port: browser.port,
          flowsDir: this.flowsDir,
          onLog: (message) => message && this.emit(job, 'log', { message: `[flow] ${message}` })
        });
        this.emit(job, 'phase', { message: 'Setup flow completed.' });
      }

      outer: for (const logicalPath of job.config.urls) {
        for (const device of job.config.devices) {
          for (let iteration = 1; iteration <= job.config.runsPerPage; iteration += 1) {
            if (job.abortController.signal.aborted) break outer;
            job.current += 1;
            this.emit(job, 'run-start', { current: job.current, total: job.totalRuns, device, path: logicalPath, iteration });
            const record = await runSingleLighthouse({
              config: job.config,
              port: browser.port,
              root,
              device,
              logicalPath,
              iteration,
              signal: job.abortController.signal,
              onLog: (message) => message && this.emit(job, 'log', { message })
            });
            job.records.push(record);
            if (record.status === 'valid') job.valid += 1;
            else if (record.status === 'redirected') job.redirected += 1;
            else if (record.status === 'cancelled') job.cancelled += 1;
            else job.failed += 1;
            this.emit(job, 'run-complete', { record, current: job.current, total: job.totalRuns, valid: job.valid, redirected: job.redirected, failed: job.failed });
          }
        }
      }

      this.reportManager.writeManifest(root, job.records);
      job.summary = await this.reportManager.generateSummary(root, job.records, job.config);
      job.status = job.abortController.signal.aborted ? 'cancelled' : 'completed';
      job.finishedAt = new Date().toISOString();
      this.emit(job, 'finished', { status: job.status, summary: job.summary, reportName: runName });
    } catch (error) {
      job.status = 'failed';
      job.error = error.message;
      job.finishedAt = new Date().toISOString();
      this.emit(job, 'error', { message: error.message });
    }
  }

  activeReportNames() {
    return new Set([...this.jobs.values()]
      .filter((job) => ['queued', 'running'].includes(job.status) && job.reportName)
      .map((job) => job.reportName));
  }

  cancel(id) {
    const job = this.jobs.get(id);
    if (!job) return null;
    job.abortController.abort();
    return this.publicJob(job);
  }
}
