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

test('Map entry round-trip via entryAt preserves the original key reference', async ({ page }) => {
  const result = await page.evaluate(() => {
    const el = window.__mapEl
    const entry = el.entryAt('@0')
    return {
      keyIsOriginal: entry.key === window.__objKey,
      valueHasTags: Array.isArray(entry.value?.tags),
      secondEntryKey: el.entryAt('@1').key
    }
  })
  expect(result.keyIsOriginal).toBe(true)
  expect(result.valueHasTags).toBe(true)
  expect(result.secondEntryKey).toBe('plain')
})

test('Set entry resolves by @<i>', async ({ page }) => {
  await page.evaluate(() => {
    const el = document.createElement('json-viewer')
    el.id = 'set-viewer'
    document.body.appendChild(el)
    el.data = new Set(['alpha', 'beta', 'gamma'])
    window.__setEl = el
  })
  const v = await page.evaluate(() => window.__setEl.entryAt('@2').value)
  expect(v).toBe('gamma')
})

test('search finds matches across keys and values', async ({ page }) => {
  const result = await page.evaluate(() => {
    const it = window.__sv.search('ada')
    return { count: it.count, current: it.current?.path }
  })
  expect(result.count).toBeGreaterThanOrEqual(3) // users[0].name, config.adaMode, notes
  expect(result.current).toBeDefined()
})

test('search does not expandAll', async ({ page }) => {
  const before = await page.evaluate(() => {
    return window.__sv.shadowRoot.querySelectorAll('details[open]').length
  })
  const after = await page.evaluate(() => {
    window.__sv.search('Linus')
    return window.__sv.shadowRoot.querySelectorAll('details[open]').length
  })
  // After searching for one needle we should have opened only the ancestors of
  // that one match — bounded by tree depth, not by total <details> count.
  expect(after - before).toBeLessThanOrEqual(3)
})

test('search next/prev cycles', async ({ page }) => {
  const sequence = await page.evaluate(() => {
    const it = window.__sv.search('ada')
    const first = it.current?.path
    it.next()
    const second = it.current?.path
    it.prev()
    const third = it.current?.path
    return { first, second, third, count: it.count }
  })
  expect(sequence.first).toBe(sequence.third)
  expect(sequence.second).not.toBe(sequence.first)
})

test('search toolbar buttons advance past the first match (json-viewer-b0r)', async ({ page }) => {
  // Type in the search input, wait for debounced search to populate matches,
  // then click ↓ twice. The visible match index should reach 3/N, not stay at 2/N.
  const visited = await page.evaluate(async () => {
    const el = window.__sv
    // Open the search panel and type the query
    el.shadowRoot.querySelector('[data-act="search-toggle"]').click()
    const input = el.shadowRoot.querySelector('.search input')
    input.value = 'ada'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await new Promise(r => setTimeout(r, 200))   // wait past the 120ms debounce

    const readCounter = () => el.shadowRoot.querySelector('.search .count').textContent
    const start = readCounter()
    el.shadowRoot.querySelector('[data-act="search-next"]').click()
    const after1 = readCounter()
    el.shadowRoot.querySelector('[data-act="search-next"]').click()
    const after2 = readCounter()
    return { start, after1, after2, matchCount: el._matches.length }
  })
  // With 3 'ada' matches the counter format is "i/3". After two ↓ clicks we
  // should have advanced through three positions (1/3 → 2/3 → 3/3), not
  // gotten stuck at 2/3.
  expect(visited.matchCount).toBeGreaterThanOrEqual(3)
  expect(visited.after1).not.toBe(visited.after2)
})
