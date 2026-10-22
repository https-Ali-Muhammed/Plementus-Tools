import { test, expect } from './fixtures';

test('direct popup: actual MV3 renders fail-closed without toolbar invocation', async ({ popup }) => {
  const manifest = await popup.evaluate<Record<string, unknown>>('chrome.runtime.getManifest()');
  expect(manifest.manifest_version).toBe(3);
  expect(manifest.permissions).toEqual(['activeTab']);
  expect(manifest.host_permissions).toBeUndefined();
  expect(manifest.background).toBeUndefined();
  expect(manifest.content_scripts).toBeUndefined();
  expect(manifest.incognito).toBe('not_allowed');
  const permissions = await popup.evaluate<Record<string, unknown>>('chrome.permissions.getAll()');
  expect(permissions.permissions).toEqual(['activeTab']);
  expect(permissions.origins).toEqual([]);
  await expect(popup.getByRole('heading', { name: 'Odoo TraceBridge' })).toBeVisible();
  await expect(popup.getByRole('status')).toContainText('Browser access: unavailable');
  await expect(popup.getByRole('button', { name: 'Approve consent only' })).toBeDisabled();
  await expect(popup.getByRole('button', { name: 'Start unavailable' })).toBeDisabled();
  await expect(popup.getByRole('option', { name: 'Local Development', exact: true })).toHaveCount(1);
  await popup.getByRole('button', { name: 'Deny consent' }).click();
  await expect(popup.getByRole('status')).toContainText('Consent: denied');
  await popup.getByRole('button', { name: 'Revoke consent' }).click();
  await expect(popup.getByRole('status')).toContainText('Consent: revoked');
});

test('browser toolbar: real activeTab, local approval, deny/revoke/reopen and disabled Start', async ({ context, fixture, invoke }, info) => {
  test.skip(process.env.TRACEBRIDGE_HEADED !== '1', 'Authentic native toolbar invocation requires headed display and xdotool; direct-popup tests do not cover activeTab.');
  const target = await context.newPage();
  await target.goto(fixture.origin);
  const popup = await invoke(target);
  await expect(popup.getByRole('status')).toContainText('Browser access: available. Consent: required');
  await expect(popup.locator('strong')).toHaveText(fixture.origin);
  const approve = popup.getByRole('button', { name: 'Approve consent only' });
  const origin = popup.getByLabel('Authorized exact origin');
  const environment = popup.getByRole('combobox');
  const authorization = popup.getByRole('checkbox');
  await expect(approve).toBeDisabled();
  await origin.fill(fixture.origin);
  await authorization.check();
  for (const value of ['production', 'unknown', 'test', 'staging']) {
    await environment.selectOption(value); await expect(approve).toBeDisabled();
  }
  await environment.selectOption('local');
  await authorization.uncheck(); await expect(approve).toBeDisabled(); await authorization.check();
  for (const wrong of [fixture.secondOrigin, fixture.origin.replace('127.0.0.1', 'localhost'), `${fixture.origin}/`, fixture.origin.replace('http:', 'https:')]) {
    await origin.fill(wrong); await expect(approve).toBeDisabled();
  }
  await origin.fill(fixture.origin); await approve.click();
  await expect(popup.getByRole('status')).toContainText('Consent: approved');
  await expect(popup.getByRole('button', { name: 'Start unavailable' })).toBeDisabled();
  await popup.locator('header').scrollIntoViewIfNeeded();
  await popup.screenshot({ path: info.outputPath('approved.png') });
  await popup.getByRole('button', { name: 'Start unavailable' }).scrollIntoViewIfNeeded();
  await popup.screenshot({ path: info.outputPath('approved-controls.png') });
  await popup.getByRole('button', { name: 'Deny consent' }).click();
  await expect(popup.getByRole('status')).toContainText('Consent: denied');
  await popup.close();
  const reopened = await invoke(target);
  await expect(reopened.getByRole('status')).toContainText('Consent: required');
  await reopened.getByLabel('Authorized exact origin').fill(fixture.origin);
  await reopened.getByRole('combobox').selectOption('local');
  await reopened.getByRole('checkbox').check();
  await reopened.getByRole('button', { name: 'Approve consent only' }).click();
  await expect(reopened.getByRole('status')).toContainText('Consent: approved');
  await reopened.getByRole('button', { name: 'Revoke consent' }).click();
  await expect(reopened.getByRole('status')).toContainText('Consent: revoked');
});

for (const host of ['localhost', 'ipv6', 'second-port']) {
  test(`browser action: explicit local approval on ${host}`, async ({ context, fixture, invoke }, info) => {
    test.skip(process.env.TRACEBRIDGE_HEADED !== '1', 'Native action needs an X11 display and xdotool.');
    test.skip(host === 'ipv6' && !fixture.ipv6Origin, 'IPv6 loopback unavailable on this host.');
    const origin = host === 'ipv6' ? fixture.ipv6Origin! : host === 'second-port' ? fixture.secondOrigin : fixture.origin.replace('127.0.0.1', 'localhost');
    const target = await context.newPage(); await target.goto(origin);
    const popup = await invoke(target);
    await expect(popup.locator('strong')).toHaveText(origin);
    await expect(popup.getByRole('status')).toContainText('Consent: required');
    await popup.getByLabel('Authorized exact origin').fill(origin);
    await popup.getByRole('combobox').selectOption('local');
    await popup.getByRole('checkbox').check();
    await popup.getByRole('button', { name: 'Approve consent only' }).click();
    await expect(popup.getByRole('status')).toContainText('Consent: approved');
    await expect(popup.getByRole('button', { name: 'Start unavailable' })).toBeDisabled();
    await popup.locator('header').scrollIntoViewIfNeeded();
  await popup.screenshot({ path: info.outputPath('approved.png') });
  await popup.getByRole('button', { name: 'Start unavailable' }).scrollIntoViewIfNeeded();
  await popup.screenshot({ path: info.outputPath('approved-controls.png') });
  });
}

for (const change of ['tab-switch', 'same-origin-navigation', 'cross-port-navigation', 'cross-host-navigation']) {
  test(`browser action: invalidates consent after ${change}`, async ({ context, fixture, invoke }) => {
    test.skip(process.env.TRACEBRIDGE_HEADED !== '1', 'Native action needs an X11 display and xdotool.');
    const target = await context.newPage(); await target.goto(fixture.origin);
    const popup = await invoke(target);
    await popup.getByLabel('Authorized exact origin').fill(fixture.origin);
    await popup.getByRole('combobox').selectOption('local');
    await popup.getByRole('checkbox').check();
    await popup.getByRole('button', { name: 'Approve consent only' }).click();
    await expect(popup.getByRole('status')).toContainText('Consent: approved');
    let next = target;
    const nextOrigin = change === 'cross-port-navigation' ? fixture.secondOrigin : change === 'cross-host-navigation' ? fixture.origin.replace('127.0.0.1', 'localhost') : fixture.origin;
    if (change === 'tab-switch') { next = await context.newPage(); await next.goto(fixture.origin); }
    else await target.goto(`${nextOrigin}/next-document`);
    await expect.poll(async () => popup.isClosed() ? 'closed' : await popup.getByRole('status').textContent()).toMatch(/closed|Consent: tab-changed/);
    if (!popup.isClosed()) await popup.close();
    const reopened = await invoke(next);
    await expect(reopened.getByRole('status')).toContainText('Consent: required');
    await expect(reopened.locator('strong')).toHaveText(nextOrigin);
    await expect(reopened.getByLabel('Authorized exact origin')).toBeEmpty();
    await expect(reopened.getByRole('checkbox')).not.toBeChecked();
  });
}

test('browser action: restricted browser URLs fail closed', async ({ context, fixture, invoke }) => {
  test.skip(process.env.TRACEBRIDGE_HEADED !== '1', 'Native action needs an X11 display and xdotool.');
  const target = await context.newPage(); await target.goto(fixture.origin);
  const first = await invoke(target); await first.close();
  await target.goto('chrome://settings');
  const popup = await invoke(target);
  await expect(popup.getByRole('status')).toContainText('Browser access: unavailable');
  await expect(popup.getByRole('button', { name: 'Approve consent only' })).toBeDisabled();
  await expect(popup.getByRole('button', { name: 'Start unavailable' })).toBeDisabled();
});
