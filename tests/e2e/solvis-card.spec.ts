// Version: 0.1.1 — 2025-12-28
import {expect, test} from '@playwright/test';

test.beforeEach(async ({ page, baseURL }) => {
  await page.goto(`${baseURL}/tests/demo/index.html`);
  await expect(page.locator('solvis-card').first()).toBeVisible();
});

test('renders header and diagram', async ({ page }) => {
  await expect(page.locator('ha-card').first()).toBeVisible();
  await expect(page.locator('svg[part="diagram"]').first()).toBeVisible();
  // Check for one of the titles in the demo
  await expect(page.getByText('SOLVIS HEATING')).toBeVisible();
});

test('shows smart grid badge when enabled', async ({ page }) => {
  // Smart Grid is enabled in the demo cards
  await expect(page.getByText('Smart Grid', { exact: false }).first()).toBeVisible();
});

test('toggle pump updates footer text', async ({ page }) => {
  const card = page.locator('solvis-card').first();
  const footer = card.locator('.footer');
  await expect(footer).toContainText('Bereit');
  await card.locator('#btn-pump').click();
  await expect(footer).toContainText('Aktiv');
});

test('editor emits config-changed on changes', async ({ page }) => {
  await page.evaluate(() => {
    const editor = document.createElement('solvis-card-editor');
    editor.setConfig({ title: 'X' });
    document.body.appendChild(editor);
  });
  const editor = page.locator('solvis-card-editor');
  await expect(editor).toBeVisible();
  const changes = await page.evaluate(() => new Promise<number>((resolve) => {
    let n = 0;
    const ed = document.querySelector('solvis-card-editor');
    ed.addEventListener('config-changed', () => { n++; resolve(n); }, { once: true });
    (ed.shadowRoot.getElementById('title') as HTMLInputElement).value = 'New';
    ed.shadowRoot.getElementById('title').dispatchEvent(new Event('input', { bubbles: true }));
  }));
  expect(changes).toBe(1);
});
