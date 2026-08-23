import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ensureDir, slugify } from './utils.js';

function cleanUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const parsed = new URL(raw);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Project URLs must use http:// or https://.');
  parsed.hash = '';
  return parsed.href.replace(/\/$/, '');
}

function cleanPaths(value) {
  const source = Array.isArray(value) ? value : String(value || '').split(/\r?\n/);
  const unique = [];
  for (const item of source) {
    const pathValue = String(item || '').trim();
    if (!pathValue) continue;
    if (!pathValue.startsWith('/') && !/^https?:\/\//i.test(pathValue)) {
      throw new Error(`Invalid shared target: ${pathValue}. Use /path or a full http(s) URL.`);
    }
    if (!unique.includes(pathValue)) unique.push(pathValue);
  }
  return unique;
}

function normalizeProject(input, existing = {}) {
  const name = String(input.name ?? existing.name ?? '').trim();
  if (name.length < 2) throw new Error('Project name must contain at least 2 characters.');

  let productionUrl = '';
  let testingUrl = '';
  try {
    productionUrl = cleanUrl(input.productionUrl ?? existing.productionUrl ?? '');
    testingUrl = cleanUrl(input.testingUrl ?? existing.testingUrl ?? '');
  } catch (error) {
    throw new Error(error.message || 'Invalid project URL.');
  }
  if (!productionUrl && !testingUrl) throw new Error('Add at least one project URL: Testing or Production.');

  const languages = [...new Set((Array.isArray(input.languages) ? input.languages : existing.languages || ['en'])
    .map((value) => String(value || '').trim().toLowerCase())
    .filter((value) => /^[a-z]{2}([_-][a-z0-9]+)?$/i.test(value)))];
  if (!languages.length) languages.push('en');

  let defaultLanguage = String(input.defaultLanguage ?? existing.defaultLanguage ?? languages[0]).trim().toLowerCase();
  if (!languages.includes(defaultLanguage)) languages.unshift(defaultLanguage);

  let activeEnvironment = String(input.activeEnvironment ?? existing.activeEnvironment ?? (testingUrl ? 'testing' : 'production')).toLowerCase();
  if (!['testing', 'production'].includes(activeEnvironment)) activeEnvironment = testingUrl ? 'testing' : 'production';
  if (activeEnvironment === 'testing' && !testingUrl) activeEnvironment = 'production';
  if (activeEnvironment === 'production' && !productionUrl) activeEnvironment = 'testing';

  return {
    ...existing,
    name,
    productionUrl,
    testingUrl,
    activeEnvironment,
    defaultLanguage,
    languages,
    paths: cleanPaths(input.paths ?? existing.paths ?? []),
    updatedAt: new Date().toISOString()
  };
}

export class ProjectManager {
  constructor({ dataDir }) {
    this.dataDir = ensureDir(dataDir);
    this.file = path.join(this.dataDir, 'projects.json');
    if (!fs.existsSync(this.file)) this.write({ activeProjectId: '', projects: [] });
  }

  read() {
    try {
      const data = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      return {
        activeProjectId: String(data.activeProjectId || ''),
        projects: Array.isArray(data.projects) ? data.projects : []
      };
    } catch {
      return { activeProjectId: '', projects: [] };
    }
  }

  write(data) {
    ensureDir(path.dirname(this.file));
    fs.writeFileSync(this.file, JSON.stringify(data, null, 2));
    return data;
  }

  list() {
    const data = this.read();
    return {
      ...data,
      projects: [...data.projects].sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
    };
  }

  create(input) {
    const data = this.read();
    const base = normalizeProject(input);
    const id = `${slugify(base.name)}-${crypto.randomBytes(3).toString('hex')}`;
    const now = new Date().toISOString();
    const project = { ...base, id, createdAt: now, updatedAt: now };
    data.projects.push(project);
    if (!data.activeProjectId) data.activeProjectId = id;
    this.write(data);
    return project;
  }

  update(id, input) {
    const data = this.read();
    const index = data.projects.findIndex((project) => project.id === id);
    if (index < 0) throw new Error('Project not found.');
    data.projects[index] = normalizeProject(input, data.projects[index]);
    this.write(data);
    return data.projects[index];
  }

  delete(id) {
    const data = this.read();
    const before = data.projects.length;
    data.projects = data.projects.filter((project) => project.id !== id);
    if (data.projects.length === before) throw new Error('Project not found.');
    if (data.activeProjectId === id) data.activeProjectId = data.projects[0]?.id || '';
    this.write(data);
    return { deleted: id, activeProjectId: data.activeProjectId };
  }

  setActive(id) {
    const data = this.read();
    if (id && !data.projects.some((project) => project.id === id)) throw new Error('Project not found.');
    data.activeProjectId = id || '';
    this.write(data);
    return this.list();
  }
}
