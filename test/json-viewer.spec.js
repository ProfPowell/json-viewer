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

test('renders fixture loaded via src attribute and shows type chips', async ({ page }) => {
  const el = page.locator('json-viewer#api-viewer')
  // Wait for fetch + render. The "endpoint" key is visible in the rendered tree.
  await expect(el.getByText('"endpoint"')).toBeVisible()
  // show-types attribute is set on the harness — type chips render alongside values.
  await expect(el.locator('.type').first()).toBeVisible()
})

test('lazy expansion only renders configured depth eagerly', async ({ page }) => {
  // The nested-viewer fixture is 5 levels deep with expanded="1". Only the top
  // <details> should be open; deeper levels render on demand.
  const result = await page.evaluate(() => {
    const el = document.getElementById('nested-viewer')
    const root = el.shadowRoot.querySelector('.body')
    return {
      openCount: root.querySelectorAll('details[open]').length,
      totalDetails: root.querySelectorAll('details').length
    }
  })
  // Only the root details is open at expanded="1". Deeper details exist as
  // shells (the rendering walks the eager prefix) but stay closed.
  expect(result.openCount).toBeLessThanOrEqual(2)
})

test('expand(matcher) opens nodes whose path matches a glob', async ({ page }) => {
  const result = await page.evaluate(() => {
    const el = window.__gv
    el.collapseAll()
    el.expand('users[*]')
    const root = el.shadowRoot.querySelector('.body')
    // After expanding `users[*]`, both users[0] and users[1] details are open.
    const openPaths = Array.from(root.querySelectorAll('details[open]'))
      .map(d => d.dataset.path)
      .filter(p => p === 'users[0]' || p === 'users[1]')
    return openPaths.sort()
  })
  expect(result).toEqual(['users[0]', 'users[1]'])
})

test('json-viewer:keyclick fires with the correct detail and bubbles', async ({ page }) => {
  const detail = await page.evaluate(() => {
    window.__events.length = 0
    const el = window.__eventEl
    // The first key button in the rendered tree corresponds to "greeting"
    const keyBtn = el.shadowRoot.querySelector('button.key')
    keyBtn.click()
    const ev = window.__events.find(e => e.kind === 'keyclick')
    return ev?.detail
  })
  expect(detail).toBeDefined()
  expect(detail.path).toBe('greeting')
  expect(detail.key).toBe('greeting')
  expect(detail.value).toBe('hello')
})

test('json-viewer:valueclick fires with kind information', async ({ page }) => {
  const detail = await page.evaluate(() => {
    window.__events.length = 0
    const el = window.__eventEl
    // Click a primitive value element (the number 42)
    const number = el.shadowRoot.querySelector('.v-number')
    number.click()
    const ev = window.__events.find(e => e.kind === 'valueclick')
    return ev?.detail
  })
  expect(detail).toBeDefined()
  expect(detail.type).toBe('number')
  expect(detail.value).toBe(42)
})

test('attribute changes at runtime trigger a re-render', async ({ page }) => {
  const result = await page.evaluate(() => {
    const el = window.__eventEl
    const before = el.shadowRoot.querySelectorAll('.type').length
    el.setAttribute('show-types', '')
    const afterAdd = el.shadowRoot.querySelectorAll('.type').length
    el.removeAttribute('show-types')
    const afterRemove = el.shadowRoot.querySelectorAll('.type').length
    return { before, afterAdd, afterRemove }
  })
  // event-viewer harness doesn't set show-types initially, so before === 0.
  // After adding the attribute the type chips appear; after removing they vanish.
  expect(result.before).toBe(0)
  expect(result.afterAdd).toBeGreaterThan(0)
  expect(result.afterRemove).toBe(0)
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
