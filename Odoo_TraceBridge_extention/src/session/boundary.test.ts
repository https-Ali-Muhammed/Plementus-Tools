import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

describe('Phase 05 shipped source boundary', () => {
  const files = ['entrypoints/background.ts', ...readdirSync('src/session').filter(name => name.endsWith('.ts') && !name.includes('.test.')).map(name => `src/session/${name}`),
    ...readdirSync('src/capture').filter(name => name.endsWith('.ts') && !name.includes('.test.')).map(name => `src/capture/${name}`),
    ...readdirSync('entrypoints/popup').filter(name => /\.(ts|tsx)$/.test(name) && !name.includes('.test.')).map(name => `entrypoints/popup/${name}`)];
  const source = files.map(file => readFileSync(file, 'utf8')).join('\n');
  it('ships no network/RPC, dangerous HTML or page command bridge', () => {
    expect(source).not.toMatch(/\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|captureVisibleTab|MutationObserver)\b|browser\.(webRequest|debugger|cookies)|dangerouslySetInnerHTML|onMessageExternal|setInterval/);
    expect(source).not.toMatch(/world: 'MAIN'|allFrames: true|window\.postMessage|history\.(pushState|replaceState)\s*=/);
    expect(source).toContain("world: 'ISOLATED'");
    expect(source).toContain('documentIds: [documentId]');
    expect(readdirSync('entrypoints').sort()).toEqual(['background.ts', 'popup']);
  });
  it('only the worker imports persistence, with no local/sync settings or diagnostics schema', () => {
    const popup = readFileSync('entrypoints/popup/Popup.tsx', 'utf8');
    expect(popup).not.toMatch(/indexedDB|storage\.|createSessionController|createHeaderStore/);
    expect(source).not.toMatch(/storage\.(local|sync)\.(set|get)|localStorage|sessionStorage/);
    expect(readFileSync('src/session/store.ts', 'utf8')).toContain("createObjectStore('cases'");
  });
  it('keeps only required activeTab/storage/scripting permissions and no host declarations', () => {
    const config = readFileSync('wxt.config.ts', 'utf8');
    expect(config).toContain("permissions: ['activeTab', 'storage', 'scripting']");
    expect(config).not.toMatch(/host_permissions|optional_permissions|<all_urls>|https?:\/\/\*/);
    expect(config).toContain("connect-src 'none'");
  });
  it('registers revocation listeners synchronously and restricts session storage to trusted contexts', () => {
    const worker = readFileSync('entrypoints/background.ts', 'utf8');
    for (const event of ['tabs.onUpdated', 'tabs.onRemoved', 'tabs.onReplaced', 'tabs.onActivated', 'tabs.onDetached', 'windows.onFocusChanged', 'permissions.onRemoved', 'runtime.onStartup']) expect(worker).toContain(`${event}.addListener`);
    expect(worker.indexOf('runtime.onMessage.addListener')).toBeLessThan(worker.indexOf('void controller.wake()'));
    expect(worker).toContain("accessLevel: 'TRUSTED_CONTEXTS'");
  });
});
