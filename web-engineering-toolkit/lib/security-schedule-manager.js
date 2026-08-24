import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ensureDir } from './utils.js';

export class SecurityScheduleManager {
  constructor({ dataDir, runner, audit = () => {} }) {
    ensureDir(dataDir);
    this.file = path.join(dataDir, 'security-schedules.json');
    this.runner = runner;
    this.audit = audit;
    this.running = new Set();
    if (!fs.existsSync(this.file)) fs.writeFileSync(this.file, `${JSON.stringify({ version: 1, schedules: [] }, null, 2)}\n`);
    this.timer = setInterval(() => this.tick().catch(() => {}), 30_000);
    this.timer.unref();
  }

  read() { try { return JSON.parse(fs.readFileSync(this.file, 'utf8')); } catch { return { version: 1, schedules: [] }; } }
  write(data) { const temporary = `${this.file}.${process.pid}.tmp`; fs.writeFileSync(temporary, `${JSON.stringify(data, null, 2)}\n`); fs.renameSync(temporary, this.file); }
  list() { return this.read().schedules; }

  create(input = {}) {
    const config = structuredClone(input.config || {});
    if (!config.projectName || !config.targetUrl) throw new Error('Scheduled scans require projectName and targetUrl.');
    if (config.authentication?.password || config.authentication?.username) throw new Error('Scheduled scans cannot persist credentials. Use an encrypted reusable role session without credential fields.');
    if (config.authentication?.enabled && !config.authentication?.reuseSession) throw new Error('Scheduled authenticated scans must use an existing encrypted role session.');
    const intervalMinutes = Math.max(15, Math.min(525600, Number(input.intervalMinutes) || 1440));
    const createdAt = new Date().toISOString();
    const schedule = { id: `schedule_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`, projectName: String(config.projectName), intervalMinutes, enabled: input.enabled !== false, createdAt, nextRunAt: new Date(Date.now() + intervalMinutes * 60000).toISOString(), lastRunAt: '', lastStatus: 'not_started', lastError: '', config };
    const data = this.read();
    data.schedules.push(schedule);
    this.write(data);
    this.audit({ action: 'security_schedule_created', actor: String(input.actor || 'local-user'), role: String(input.role || 'security_reviewer'), projectName: schedule.projectName, scheduleId: schedule.id, intervalMinutes });
    return schedule;
  }

  delete(scheduleId, actor = 'local-user') {
    const data = this.read();
    const schedule = data.schedules.find((item) => item.id === scheduleId);
    if (!schedule) throw new Error('Security schedule not found.');
    data.schedules = data.schedules.filter((item) => item.id !== scheduleId);
    this.write(data);
    this.audit({ action: 'security_schedule_deleted', actor, role: 'security_reviewer', projectName: schedule.projectName, scheduleId });
    return { deleted: scheduleId };
  }

  async tick() {
    const data = this.read();
    const due = data.schedules.filter((item) => item.enabled && Date.parse(item.nextRunAt) <= Date.now() && !this.running.has(item.id));
    for (const schedule of due) {
      this.running.add(schedule.id);
      try {
        const result = await this.runner(schedule.config);
        schedule.lastStatus = 'completed';
        schedule.lastReportName = result.reportName || '';
        schedule.lastError = '';
      } catch (error) {
        schedule.lastStatus = 'failed';
        schedule.lastError = error.message;
      } finally {
        schedule.lastRunAt = new Date().toISOString();
        schedule.nextRunAt = new Date(Date.now() + schedule.intervalMinutes * 60000).toISOString();
        this.running.delete(schedule.id);
        this.audit({ action: 'security_schedule_executed', actor: 'scheduler', role: 'security_reviewer', projectName: schedule.projectName, scheduleId: schedule.id, status: schedule.lastStatus, reportName: schedule.lastReportName || '', error: schedule.lastError });
      }
    }
    if (due.length) this.write(data);
  }
}
