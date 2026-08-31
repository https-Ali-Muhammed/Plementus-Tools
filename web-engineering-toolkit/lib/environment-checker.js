import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const REQUIRED_NODE_MAJOR = 20;

const browserCandidates = {
  linux: [
    { name: 'Brave', path: '/usr/bin/brave-browser' },
    { name: 'Google Chrome', path: '/usr/bin/google-chrome' },
    { name: 'Google Chrome Stable', path: '/usr/bin/google-chrome-stable' },
    { name: 'Chromium', path: '/usr/bin/chromium' },
    { name: 'Chromium Browser', path: '/usr/bin/chromium-browser' }
  ],
  darwin: [
    { name: 'Google Chrome', path: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' },
    { name: 'Brave', path: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser' },
    { name: 'Chromium', path: '/Applications/Chromium.app/Contents/MacOS/Chromium' }
  ],
  win32: [
    { name: 'Google Chrome', path: path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe') },
    { name: 'Brave', path: path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe') },
    { name: 'Chromium', path: path.join(process.env.LOCALAPPDATA || '', 'Chromium', 'Application', 'chrome.exe') }
  ]
};

async function getVersion(executable) {
  try {
    const { stdout, stderr } = await execFileAsync(executable, ['--version'], { timeout: 5000 });
    return (stdout || stderr).trim();
  } catch {
    return null;
  }
}

async function commandVersion(command, args = ['--version']) {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, { timeout: 5000 });
    return (stdout || stderr).trim();
  } catch {
    return null;
  }
}

async function executableOnPath(command) {
  const lookup = process.platform === 'win32' ? 'where' : 'which';
  try {
    const { stdout } = await execFileAsync(lookup, [command], { timeout: 3000 });
    return stdout.split(/\r?\n/).map((line) => line.trim()).find(Boolean) || null;
  } catch {
    return null;
  }
}

export async function detectBrowsers() {
  const candidates = [...(browserCandidates[process.platform] || [])];
  const pathCandidates = process.platform === 'win32'
    ? [['chrome', 'Google Chrome'], ['brave', 'Brave'], ['chromium', 'Chromium']]
    : [['google-chrome', 'Google Chrome'], ['google-chrome-stable', 'Google Chrome Stable'], ['brave-browser', 'Brave'], ['chromium', 'Chromium'], ['chromium-browser', 'Chromium Browser']];

  for (const [command, name] of pathCandidates) {
    const detectedPath = await executableOnPath(command);
    if (detectedPath) candidates.push({ name, path: detectedPath });
  }

  const unique = new Map();
  for (const candidate of candidates) {
    if (!candidate.path || !fs.existsSync(candidate.path) || unique.has(candidate.path)) continue;
    const version = await getVersion(candidate.path);
    unique.set(candidate.path, { ...candidate, version: version || 'Detected' });
  }
  return [...unique.values()];
}

function dependencyInstalled(name) {
  try {
    const file = path.join(process.cwd(), 'node_modules', name, 'package.json');
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf8')).version || 'installed';
  } catch {
    return null;
  }
}

function browserInstallAction() {
  if (process.platform === 'win32') {
    return {
      title: 'Install a Chromium-based browser',
      description: 'Install Google Chrome, Chromium, or Brave, then run the health check again.',
      commands: [{ label: 'Windows (winget)', command: 'winget install --id Google.Chrome -e' }]
    };
  }
  if (process.platform === 'darwin') {
    return {
      title: 'Install a Chromium-based browser',
      description: 'Install Google Chrome, Chromium, or Brave, then run the health check again.',
      commands: [{ label: 'macOS (Homebrew)', command: 'brew install --cask google-chrome' }]
    };
  }

  let distro = '';
  try {
    const release = fs.readFileSync('/etc/os-release', 'utf8');
    distro = (release.match(/^ID=(.+)$/m)?.[1] || '').replace(/["']/g, '').toLowerCase();
  } catch {}

  let command = 'sudo apt update && sudo apt install -y chromium';
  let label = 'Debian / Ubuntu';
  if (['fedora', 'rhel', 'centos'].includes(distro)) {
    command = 'sudo dnf install -y chromium';
    label = 'Fedora / RHEL';
  } else if (['arch', 'manjaro'].includes(distro)) {
    command = 'sudo pacman -S chromium';
    label = 'Arch / Manjaro';
  } else if (['opensuse', 'opensuse-leap', 'opensuse-tumbleweed', 'sles'].includes(distro)) {
    command = 'sudo zypper install chromium';
    label = 'openSUSE';
  }

  return {
    title: 'Install a Chromium-based browser',
    description: 'The reporter needs Chrome, Chromium, or Brave to launch Lighthouse. Install one, then run the health check again.',
    commands: [{ label, command }]
  };
}

async function checkTarget(target) {
  if (!target) {
    return {
      status: 'warning',
      detail: 'No target URL supplied.',
      action: {
        title: 'Enter a Base URL',
        description: 'Add the website URL in Project setup, for example https://example.com, then run the health check again.',
        commands: []
      }
    };
  }
  try {
    const response = await fetch(target, { method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(8000) });
    return {
      status: response.status < 500 ? 'ready' : 'warning',
      detail: `HTTP ${response.status}`,
      ...(response.status >= 500 ? {
        action: {
          title: 'Check the target website',
          description: `The website returned HTTP ${response.status}. Confirm the Base URL, server status, VPN, and network access before starting Lighthouse.`,
          commands: []
        }
      } : {})
    };
  } catch (error) {
    return {
      status: 'error',
      detail: error.message,
      action: {
        title: 'Restore access to the target website',
        description: 'Confirm the Base URL is correct and that this computer can open the site. If the site is private, connect to the required VPN/network first.',
        commands: []
      }
    };
  }
}

export async function runEnvironmentCheck({ targetUrl, reportsDir }) {
  const browsers = await detectBrowsers();
  const lighthouse = dependencyInstalled('lighthouse');
  const playwright = dependencyInstalled('playwright-core');
  const npmVersion = await commandVersion(process.platform === 'win32' ? 'npm.cmd' : 'npm');
  const checks = [];

  const nodeMajor = Number(process.versions.node.split('.')[0]);
  const nodeReady = Number.isFinite(nodeMajor) && nodeMajor >= REQUIRED_NODE_MAJOR;
  checks.push({
    key: 'node',
    label: 'Node.js',
    status: nodeReady ? 'ready' : 'error',
    detail: `${process.version}${nodeReady ? '' : ` · Node ${REQUIRED_NODE_MAJOR}+ required`}`,
    ...(!nodeReady ? {
      action: {
        title: `Upgrade Node.js to ${REQUIRED_NODE_MAJOR}+`,
        description: 'Install a supported Node.js version, reopen the terminal, then run npm install again.',
        commands: [{ label: 'If you use nvm', command: `nvm install ${REQUIRED_NODE_MAJOR} && nvm use ${REQUIRED_NODE_MAJOR}` }]
      }
    } : {})
  });

  checks.push({
    key: 'npm',
    label: 'npm',
    status: npmVersion ? 'ready' : 'error',
    detail: npmVersion ? `v${npmVersion.replace(/^v/, '')}` : 'Not detected',
    ...(!npmVersion ? {
      action: {
        title: 'Install npm',
        description: 'Install Node.js with npm included, then reopen the terminal and run npm install in this project.',
        commands: []
      }
    } : {})
  });

  checks.push({ key: 'platform', label: 'Platform', status: 'ready', detail: `${os.platform()} ${os.arch()}` });

  const dependencyAction = {
    title: 'Install project dependencies',
    description: 'Open a terminal in the Lighthouse Reporter project folder and install the packages defined in package.json.',
    commands: [{ label: 'Project folder', command: 'npm install' }]
  };

  checks.push({ key: 'lighthouse', label: 'Lighthouse', status: lighthouse ? 'ready' : 'error', detail: lighthouse ? `v${lighthouse}` : 'Not installed', ...(!lighthouse ? { action: dependencyAction } : {}) });
  checks.push({ key: 'playwright', label: 'Playwright Core', status: playwright ? 'ready' : 'error', detail: playwright ? `v${playwright}` : 'Not installed', ...(!playwright ? { action: dependencyAction } : {}) });
  checks.push({
    key: 'browser',
    label: 'Browser',
    status: browsers.length ? 'ready' : 'error',
    detail: browsers.length ? `${browsers.length} detected · ${browsers.map((browser) => browser.name).join(', ')}` : 'Chrome, Chromium, or Brave not detected',
    ...(!browsers.length ? { action: browserInstallAction() } : {})
  });

  try {
    fs.mkdirSync(reportsDir, { recursive: true });
    const testFile = path.join(reportsDir, `.write-test-${process.pid}`);
    fs.writeFileSync(testFile, 'ok');
    fs.unlinkSync(testFile);
    checks.push({ key: 'filesystem', label: 'Report storage', status: 'ready', detail: reportsDir });
  } catch (error) {
    checks.push({
      key: 'filesystem',
      label: 'Report storage',
      status: 'error',
      detail: error.message,
      action: {
        title: 'Fix report-folder permissions',
        description: `Make sure your user can create and edit files inside: ${reportsDir}`,
        commands: []
      }
    });
  }

  const target = await checkTarget(targetUrl);
  checks.push({ key: 'target', label: 'Target website', ...target });

  const errors = checks.filter((check) => check.status === 'error').length;
  const warnings = checks.filter((check) => check.status === 'warning').length;
  const actionable = checks.filter((check) => check.action).length;

  return {
    ready: errors === 0,
    summary: { errors, warnings, actionable },
    checks,
    browsers
  };
}
