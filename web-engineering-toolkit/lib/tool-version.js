import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function readPackageVersion() {
  try {
    return String(JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8')).version || 'unknown');
  } catch {
    return 'unknown';
  }
}

export const TOOL_VERSION = readPackageVersion();
export const SECURITY_SCANNER_USER_AGENT = `Web-Engineering-Toolkit-Security-Scanner/${TOOL_VERSION}`;
