import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page, baseURL }) => {
  await page.goto(`${baseURL}/tests/demo/index.html`);
  await expect(page.locator('solvis-card')).toBeVisible();
});

test('renders header and diagram', async ({ page }) => {
  await expect(page.locator('ha-card')).toBeVisible();
  await expect(page.locator('svg[part="diagram"]')).toBeVisible();
  await expect(page.getByText('Solvis (Demo)')).toBeVisible();
});

test('shows smart grid badge when enabled', async ({ page }) => {
  await expect(page.getByText(/Smart Grid/)).toBeVisible();
});

test('toggle pump updates footer text', async ({ page }) => {
  const footer = page.locator('solvis-card').locator('shadow=.footer');
  await expect(footer).toContainText('Off');
  await page.locator('solvis-card').locator('shadow=.pump').click();
  await expect(footer).toContainText('On');
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
