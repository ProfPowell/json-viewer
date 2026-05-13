import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/test/test-page.html')
})

test('mounts and renders top-level object', async ({ page }) => {
  const el = page.locator('json-viewer#basic')
  await expect(el).toBeVisible()
  // At least one <details> renders (the root container)
  await expect(el.locator('details').first()).toBeVisible()
  // The `skills` key is visible in the rendered tree
  await expect(el.getByText('"skills"')).toBeVisible()
})
