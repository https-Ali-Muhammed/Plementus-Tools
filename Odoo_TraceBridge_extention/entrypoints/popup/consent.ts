export interface SelectedTab {
  id?: number;
  windowId: number;
  active: boolean;
  incognito?: boolean;
  url?: string;
  pendingUrl?: string;
  status?: string;
}

export interface Target { tabId: number; windowId: number; origin: string }
export interface Declaration { origin: string; environment: string; authorized: boolean }

function isLoopback(url: URL): boolean {
  return ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
}

function eligibleUrl(url: URL): boolean {
  const host = url.hostname;
  const [first, second] = host.split('.').map(Number);
  const privateAddress = (/^\d+\.\d+\.\d+\.\d+$/.test(host) && (first === 0 || first === 10 || first === 127 ||
    (first === 172 && second! >= 16 && second! <= 31) ||
    (first === 192 && second === 168) || (first === 169 && second === 254) ||
    (first === 100 && second! >= 64 && second! <= 127))) ||
    /^\[(f[cd]|fe[89ab]|::ffff:)/.test(host) || host === '[::]';
  const localName = !host.includes('.') && !host.startsWith('[') ||
    host.split('.').includes('localhost') || /\.(local|lan|internal|home\.arpa)$/.test(host);
  if (!isLoopback(url) && (privateAddress || localName)) return false;
  return !url.username && !url.password &&
    (url.protocol === 'https:' || (url.protocol === 'http:' && isLoopback(url))) &&
    !['chromewebstore.google.com', 'chrome.google.com', 'microsoftedge.microsoft.com'].includes(url.hostname);
}

export function identifyTab(tab?: SelectedTab): Target | undefined {
  if (!tab || !Number.isInteger(tab.id) || tab.id! < 0 || !Number.isInteger(tab.windowId) ||
      tab.windowId < 0 || !tab.active || tab.incognito !== false || !tab.url ||
      tab.pendingUrl || tab.status !== 'complete') return;
  try {
    const url = new URL(tab.url);
    if (!eligibleUrl(url)) return;
    return { tabId: tab.id!, windowId: tab.windowId, origin: url.origin };
  } catch { return; }
}

export function declarationAllows(target: Target, declaration: Declaration): boolean {
  try {
    const url = new URL(target.origin);
    return eligibleUrl(url) && target.origin === url.origin &&
      declaration.origin === url.origin && declaration.authorized === true &&
      (isLoopback(url) ? declaration.environment === 'local' :
        ['test', 'staging'].includes(declaration.environment));
  } catch { return false; }
}
