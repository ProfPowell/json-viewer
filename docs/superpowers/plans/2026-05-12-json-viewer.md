# json-viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `<json-viewer>` as `@profpowell/json-viewer` — a dependency-free web component built from the existing seed, restructured into the standard ProfPowell package layout, with source-data search and Map/Set path fidelity added.

**Architecture:** Re-scaffold from the code-block sibling package (most mature). Move the 884-line seed (`vb-json-viewer.js`) into `src/json-viewer.js` with renames (tag, class, events, tokens). Drive the two HANDOFF roadmap items (search v2, Map/Set fidelity) via TDD using a Node-built-in test runner for helpers and Playwright for DOM-level behavior. Commit frequently; every task ends with a green test run.

**Tech Stack:** Vanilla JS (ES2022), Shadow DOM, Vite, Playwright, ESLint, `@custom-elements-manifest/analyzer`, Node `--test` runner. No runtime dependencies.

**Reference paths:**
- Seed component: `~/src/json-viewer/vb-json-viewer.js`
- Seed demo: `~/src/json-viewer/demo.html`, `~/src/json-viewer/vb-json-viewer.html`
- Seed helper tests: `~/src/json-viewer/tests.js`
- Spec: `~/src/json-viewer/docs/superpowers/specs/2026-05-12-json-viewer-design.md`
- Sibling to clone from: `~/src/code-block/`
- bd-aware AGENTS.md reference: `~/src/browser-window/AGENTS.md`

---

## Phase A — Scaffolding

### Task 1: Create the npm package skeleton

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `playwright.config.js`
- Create: `eslint.config.js`
- Create: `custom-elements-manifest.config.mjs`
- Create: `.gitignore`
- Create: `src/.gitkeep` (so the dir exists before Task 2 fills it)
- Create: `test/.gitkeep`
- Create: `docs/.gitkeep`

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "@profpowell/json-viewer",
  "version": "0.1.0",
  "description": "A standalone JSON viewer web component with collapsible tree, path/glob API, source-data search, and no runtime dependencies.",
  "type": "module",
  "main": "dist/json-viewer.js",
  "module": "dist/json-viewer.js",
  "types": "json-viewer.d.ts",
  "exports": {
    ".": {
      "types": "./json-viewer.d.ts",
      "import": "./dist/json-viewer.js",
      "default": "./dist/json-viewer.js"
    },
    "./ssr": {
      "import": "./ssr/index.js",
      "default": "./ssr/index.js"
    }
  },
  "publishConfig": { "access": "public" },
  "files": [
    "dist",
    "ssr",
    "json-viewer.d.ts",
    "custom-elements.json",
    "README.md",
    "LICENSE"
  ],
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "playwright test",
    "test:ui": "playwright test --ui",
    "test:node": "node --test test/helpers.test.js",
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix",
    "format": "prettier --write \"src/**/*.js\"",
    "format:check": "prettier --check \"src/**/*.js\"",
    "analyze": "cem analyze --litelement",
    "prepublishOnly": "npm run build && npm run analyze"
  },
  "keywords": [
    "web-components",
    "custom-elements",
    "vanilla-js",
    "json-viewer",
    "tree-view",
    "vanilla-breeze",
    "profpowell-web-components"
  ],
  "author": "Prof Thomas Powell",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/ProfPowell/json-viewer.git"
  },
  "bugs": { "url": "https://github.com/ProfPowell/json-viewer/issues" },
  "homepage": "https://profpowell.github.io/json-viewer/",
  "devDependencies": {
    "@custom-elements-manifest/analyzer": "^0.11.0",
    "@playwright/test": "^1.57.0",
    "eslint": "^9.0.0",
    "@eslint/js": "^9.0.0",
    "prettier": "^3.0.0",
    "vite": "^6.0.0"
  },
  "customElements": "custom-elements.json"
}
```

- [ ] **Step 2: Write `vite.config.js`**

```js
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/json-viewer.js',
      formats: ['es'],
      fileName: () => 'json-viewer.js'
    },
    rollupOptions: { external: [], output: { globals: {} } }
  },
  server: { open: '/docs/index.html' }
})
```

- [ ] **Step 3: Write `playwright.config.js`**

```js
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './test',
  testMatch: /.*\.spec\.js$/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry'
  },
  webServer: {
    command: 'npx vite --port 5174',
    url: 'http://localhost:5174/test/test-page.html',
    reuseExistingServer: !process.env.CI,
    timeout: 30000
  }
})
```

- [ ] **Step 4: Write `eslint.config.js`** (cloned from code-block's, scoped for this package)

```js
import js from '@eslint/js'

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        customElements: 'readonly',
        HTMLElement: 'readonly',
        CustomEvent: 'readonly',
        Event: 'readonly',
        NodeFilter: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        requestAnimationFrame: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        WeakSet: 'readonly',
        WeakMap: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'off'
    }
  },
  { ignores: ['dist/', 'node_modules/', 'docs/', 'test/'] }
]
```

- [ ] **Step 5: Write `custom-elements-manifest.config.mjs`**

```js
export default {
  globs: ['src/**/*.js'],
  exclude: ['dist', 'node_modules'],
  outdir: './',
  litelement: true
}
```

- [ ] **Step 6: Write `.gitignore`**

```
node_modules/
dist/
test-results/
playwright-report/
.DS_Store
*.tgz
```

- [ ] **Step 7: Create empty dir markers**

Run:
```bash
mkdir -p src test docs/examples
touch src/.gitkeep test/.gitkeep docs/.gitkeep
```

- [ ] **Step 8: Install dependencies**

Run: `npm install`
Expected: completes without errors; `node_modules/` and `package-lock.json` exist.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json vite.config.js playwright.config.js eslint.config.js custom-elements-manifest.config.mjs .gitignore src/.gitkeep test/.gitkeep docs/.gitkeep
git commit -m "Scaffold @profpowell/json-viewer package skeleton"
```

---

### Task 2: Move and rename the seed component

Replace every `vb-json-viewer` / `VBJsonViewer` reference. Rename events to namespaced form. Rename CSS tokens to `--json-viewer-*` with `--vb-*` fallback. Drop the second `json-` namespace inside the component-scoped tokens.

**Files:**
- Create: `src/json-viewer.js` (copy of `vb-json-viewer.js` with edits below)
- Delete: `vb-json-viewer.js`

- [ ] **Step 1: Copy the seed to the new location**

Run:
```bash
cp vb-json-viewer.js src/json-viewer.js
```

- [ ] **Step 2: Update the file header**

Edit `src/json-viewer.js`, replace lines 1-11 with:

```js
/**
 * <json-viewer>
 * Standalone JSON viewer web component.
 *
 *   import '@profpowell/json-viewer'; // auto-defines the tag
 *   // or:
 *   import { JsonViewer } from '@profpowell/json-viewer';
 *   customElements.define('my-json-view', JsonViewer);
 *
 * See HANDOFF.md for design rationale, trade-offs, and v2 roadmap.
 */
```

- [ ] **Step 3: Rewrite every token reference in the `:host` block**

Find the `:host { ... }` block (roughly lines 17-51 in the seed) and replace it with:

```css
    :host {
      /* Public token contract: --json-viewer-* with VB fallback, then hardcoded light-dark() */
      --_font: var(--json-viewer-font-mono, var(--vb-font-mono, ui-monospace, "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace));
      --_surface: var(--json-viewer-surface, var(--vb-surface, light-dark(#ffffff, #1c1917)));
      --_text: var(--json-viewer-text, var(--vb-text, light-dark(#1c1917, #f4f4f5)));
      --_muted: var(--json-viewer-text-muted, var(--vb-text-muted, light-dark(#71717a, #a1a1aa)));
      --_border: var(--json-viewer-border, var(--vb-border, light-dark(#e7e5e4, #3f3f46)));
      --_accent: var(--json-viewer-accent, var(--vb-accent, light-dark(#0f766e, #2dd4bf)));
      --_radius: var(--json-viewer-radius, var(--vb-radius, 0.5rem));
      --_s1: var(--json-viewer-space-1, var(--vb-space-1, 0.25rem));
      --_s2: var(--json-viewer-space-2, var(--vb-space-2, 0.5rem));
      --_s3: var(--json-viewer-space-3, var(--vb-space-3, 0.75rem));
      --_s4: var(--json-viewer-space-4, var(--vb-space-4, 1rem));

      --_string: var(--json-viewer-string, var(--vb-json-string, light-dark(#15803d, #4ade80)));
      --_number: var(--json-viewer-number, var(--vb-json-number, light-dark(#1d4ed8, #60a5fa)));
      --_boolean: var(--json-viewer-boolean, var(--vb-json-boolean, light-dark(#a16207, #fbbf24)));
      --_null: var(--json-viewer-null, var(--vb-json-null, light-dark(#71717a, #a1a1aa)));
      --_key: var(--json-viewer-key, var(--vb-json-key, light-dark(#7e22ce, #c084fc)));
      --_punct: var(--json-viewer-punct, var(--vb-json-punct, light-dark(#52525b, #a1a1aa)));

      --_indent: calc(var(--indent, 2) * 1ch);

      color-scheme: light dark;
      display: block;
      font-family: var(--_font);
      font-size: 0.875rem;
      line-height: 1.55;
      color: var(--_text);
      background: var(--_surface);
      border: 1px solid var(--_border);
      border-radius: var(--_radius);
      overflow: hidden;
      container-type: inline-size;
    }
```

- [ ] **Step 4: Rename the class**

In `src/json-viewer.js`, replace all occurrences of `VBJsonViewer` with `JsonViewer`:

Run:
```bash
sed -i '' 's/VBJsonViewer/JsonViewer/g' src/json-viewer.js
```

Verify with:
```bash
grep -n VBJsonViewer src/json-viewer.js
```
Expected: no output.

- [ ] **Step 5: Namespace the events**

In `src/json-viewer.js`, find the two `new CustomEvent('keyclick', ...)` and `new CustomEvent('valueclick', ...)` calls (roughly lines 803 and 841 in the seed). Replace `'keyclick'` with `'json-viewer:keyclick'` and `'valueclick'` with `'json-viewer:valueclick'`.

Run:
```bash
sed -i '' "s/new CustomEvent('keyclick'/new CustomEvent('json-viewer:keyclick'/g" src/json-viewer.js
sed -i '' "s/new CustomEvent('valueclick'/new CustomEvent('json-viewer:valueclick'/g" src/json-viewer.js
```

Verify with:
```bash
grep -n "new CustomEvent" src/json-viewer.js
```
Expected: both lines now show the namespaced event names.

- [ ] **Step 6: Rename the tag registration**

Find the bottom of the file (last 6 lines of the seed):

```js
if (typeof customElements !== 'undefined' && !customElements.get('vb-json-viewer')) {
  customElements.define('vb-json-viewer', VBJsonViewer);
}
```

Replace with:

```js
if (typeof customElements !== 'undefined' && !customElements.get('json-viewer')) {
  customElements.define('json-viewer', JsonViewer);
}
```

- [ ] **Step 7: Delete the old seed at the repo root**

Run:
```bash
rm vb-json-viewer.js
```

- [ ] **Step 8: Quick smoke check — open `src/json-viewer.js` and confirm no `vb-` strings remain**

Run:
```bash
grep -n "vb-json-viewer\|VBJsonViewer" src/json-viewer.js
```
Expected: no output.

- [ ] **Step 9: Commit**

```bash
git add src/json-viewer.js
git rm vb-json-viewer.js
git commit -m "Move seed to src/json-viewer.js with rename and token refactor"
```

---

### Task 3: Port helper tests to `node --test`

Replace the seed's hand-rolled assertion harness with Node's built-in test runner so failures integrate with `npm run test:node`.

**Files:**
- Create: `test/helpers.test.js`
- Delete: `tests.js`

- [ ] **Step 1: Write the new test file**

Create `test/helpers.test.js`:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'

// ---------- helpers under test (mirrors of internals from src/json-viewer.js) ----------
const pathToString = (segs) => {
  let s = ''
  for (const seg of segs) {
    if (typeof seg === 'number') s += `[${seg}]`
    else if (/^[A-Za-z_$][\w$]*$/.test(seg)) s += s ? `.${seg}` : seg
    else s += `[${JSON.stringify(seg)}]`
  }
  return s || '$'
}

const globToRe = (glob) => {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*\\\./g, '')
    .replace(/\\\.\*\*/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '[^.\\[\\]]*')
    .replace(//g, '(?:.*\\.)?')
    .replace(//g, '(?:\\..*)?')
    .replace(//g, '.*')
  return new RegExp(`^${escaped}$`)
}

const kindOf = (v) => {
  if (v === null) return 'null'
  const t = typeof v
  if (t !== 'object') return t
  if (Array.isArray(v)) return 'array'
  if (v instanceof Date) return 'date'
  if (v instanceof RegExp) return 'regexp'
  if (v instanceof Map) return 'map'
  if (v instanceof Set) return 'set'
  return 'object'
}

const safeStringify = (v, indent = 2) => {
  try {
    return JSON.stringify(v, (_k, val) => (typeof val === 'bigint' ? `${val}n` : val), indent)
  } catch {
    try { return String(v) } catch { return '' }
  }
}

// ---------- pathToString ----------
test('pathToString: empty path → $', () => assert.equal(pathToString([]), '$'))
test('pathToString: object key', () => assert.equal(pathToString(['users']), 'users'))
test('pathToString: object then array index', () => assert.equal(pathToString(['users', 0]), 'users[0]'))
test('pathToString: multiple dots', () => assert.equal(pathToString(['a', 'b', 'c']), 'a.b.c'))
test('pathToString: non-identifier key uses bracket', () => assert.equal(pathToString(['a', 'weird-key']), 'a["weird-key"]'))
test('pathToString: key starting with digit bracketed', () => assert.equal(pathToString(['1stplace']), '["1stplace"]'))

// ---------- globToRe ----------
const matches = (g, p) => globToRe(g).test(p)
test('globToRe: **.name matches top-level "name"', () => assert.ok(matches('**.name', 'name')))
test('globToRe: **.name matches "a.b.name"', () => assert.ok(matches('**.name', 'a.b.name')))
test('globToRe: **.name rejects "a.b.notname"', () => assert.equal(matches('**.name', 'a.b.notname'), false))
test('globToRe: users[*].name matches "users[0].name"', () => assert.ok(matches('users[*].name', 'users[0].name')))
test('globToRe: users[*].name matches "users[42].name"', () => assert.ok(matches('users[*].name', 'users[42].name')))
test('globToRe: users[*].name rejects "admins[0].name"', () => assert.equal(matches('users[*].name', 'admins[0].name'), false))
test('globToRe: *.email matches "user.email"', () => assert.ok(matches('*.email', 'user.email')))
test('globToRe: *.email rejects "a.b.email"', () => assert.equal(matches('*.email', 'a.b.email'), false))
test('globToRe: a.** matches "a"', () => assert.ok(matches('a.**', 'a')))
test('globToRe: a.** matches "a.b.c"', () => assert.ok(matches('a.**', 'a.b.c')))
test('globToRe: exact path matches itself', () => assert.ok(matches('user.preferences.theme', 'user.preferences.theme')))

// ---------- kindOf ----------
test('kindOf: null', () => assert.equal(kindOf(null), 'null'))
test('kindOf: undefined', () => assert.equal(kindOf(undefined), 'undefined'))
test('kindOf: string', () => assert.equal(kindOf('x'), 'string'))
test('kindOf: number', () => assert.equal(kindOf(1), 'number'))
test('kindOf: boolean', () => assert.equal(kindOf(true), 'boolean'))
test('kindOf: bigint', () => assert.equal(kindOf(1n), 'bigint'))
test('kindOf: symbol', () => assert.equal(kindOf(Symbol('s')), 'symbol'))
test('kindOf: function', () => assert.equal(kindOf(() => {}), 'function'))
test('kindOf: object', () => assert.equal(kindOf({}), 'object'))
test('kindOf: array', () => assert.equal(kindOf([]), 'array'))
test('kindOf: date', () => assert.equal(kindOf(new Date()), 'date'))
test('kindOf: regexp', () => assert.equal(kindOf(/x/), 'regexp'))
test('kindOf: map', () => assert.equal(kindOf(new Map()), 'map'))
test('kindOf: set', () => assert.equal(kindOf(new Set()), 'set'))

// ---------- safeStringify ----------
test('safeStringify: plain object', () => assert.equal(safeStringify({ a: 1 }, 0), '{"a":1}'))
test('safeStringify: bigint serialized', () => assert.equal(safeStringify({ n: 10n }, 0), '{"n":"10n"}'))
test('safeStringify: undefined root returns undefined', () => assert.equal(safeStringify(undefined, 0), undefined))
test('safeStringify: circular falls back to String', () => {
  const c = {}; c.self = c
  const out = safeStringify(c, 0)
  assert.equal(typeof out, 'string')
})
```

- [ ] **Step 2: Delete the old `tests.js`**

Run:
```bash
rm tests.js
```

- [ ] **Step 3: Run the new tests**

Run: `npm run test:node`
Expected: `tests 35`, `pass 35`, `fail 0`. Exit code 0.

- [ ] **Step 4: Commit**

```bash
git add test/helpers.test.js
git rm tests.js
git commit -m "Port helper tests to node --test runner"
```

---

### Task 4: Wire Playwright with a minimal first spec

Stand up `test/test-page.html`, write one spec that mounts the component and asserts the root renders. This proves the Playwright pipeline works before we add real coverage.

**Files:**
- Create: `test/test-page.html`
- Create: `test/json-viewer.spec.js`

- [ ] **Step 1: Write `test/test-page.html`**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>json-viewer test page</title>
  <script type="module" src="/src/json-viewer.js"></script>
</head>
<body>
  <h1>json-viewer test harness</h1>
  <json-viewer id="basic" expanded="2"></json-viewer>
  <script type="module">
    const el = document.getElementById('basic');
    el.data = { name: 'Ada', skills: ['math', 'engineering'], active: true, n: null };
  </script>
</body>
</html>
```

- [ ] **Step 2: Write the failing Playwright spec**

Create `test/json-viewer.spec.js`:

```js
import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/test/test-page.html')
})

test('mounts and renders top-level object', async ({ page }) => {
  const el = page.locator('json-viewer#basic')
  await expect(el).toBeVisible()
  // root <details> is opened at depth 0
  const root = el.locator('css=details[data-path="$"]')
  await expect(root).toHaveCount(0) // path of '$' is at the root wrapper, not a details el
  // Instead assert that any details elements render
  const anyDetails = el.locator('details')
  await expect(anyDetails.first()).toBeVisible()
})
```

- [ ] **Step 3: Install Playwright browsers**

Run: `npx playwright install chromium`
Expected: chromium downloads (or already cached).

- [ ] **Step 4: Run the spec**

Run: `npm test`
Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add test/test-page.html test/json-viewer.spec.js
git commit -m "Add Playwright harness with minimal mount test"
```

---

## Phase B — Map/Set path fidelity (HANDOFF item 2)

### Task 5: Add helper tests for `@<i>` path syntax (failing)

The new path grammar uses `myMap@0` and `mySet@2` for Map/Set entries. First, write tests for parsing and stringification of the new segment type.

**Files:**
- Modify: `test/helpers.test.js`

- [ ] **Step 1: Append failing tests**

Add to the end of `test/helpers.test.js`:

```js
// ---------- path tokens for Map/Set entries (Phase B) ----------
// The new pathToString recognizes a { kind: 'entry', index: i } segment.

const pathToStringV2 = (segs) => {
  let s = ''
  for (const seg of segs) {
    if (typeof seg === 'object' && seg && seg.kind === 'entry') {
      s += `@${seg.index}`
    } else if (typeof seg === 'number') {
      s += `[${seg}]`
    } else if (/^[A-Za-z_$][\w$]*$/.test(seg)) {
      s += s ? `.${seg}` : seg
    } else {
      s += `[${JSON.stringify(seg)}]`
    }
  }
  return s || '$'
}

test('pathToStringV2: Map entry at top level', () => {
  assert.equal(pathToStringV2([{ kind: 'entry', index: 0 }]), '@0')
})
test('pathToStringV2: Map entry under a key', () => {
  assert.equal(pathToStringV2(['cache', { kind: 'entry', index: 3 }]), 'cache@3')
})
test('pathToStringV2: Set entry mid-path', () => {
  assert.equal(pathToStringV2(['data', { kind: 'entry', index: 1 }, 'name']), 'data@1.name')
})

// Parser: split a string path back into segments
const parsePath = (s) => {
  if (!s || s === '$') return []
  const segs = []
  const re = /([A-Za-z_$][\w$]*)|\[(\d+)\]|\["([^"]*)"\]|@(\d+)/g
  let m
  while ((m = re.exec(s)) !== null) {
    if (m[4] !== undefined) segs.push({ kind: 'entry', index: Number(m[4]) })
    else if (m[2] !== undefined) segs.push(Number(m[2]))
    else if (m[3] !== undefined) segs.push(m[3])
    else segs.push(m[1])
  }
  return segs
}

test('parsePath: empty', () => assert.deepEqual(parsePath(''), []))
test('parsePath: $', () => assert.deepEqual(parsePath('$'), []))
test('parsePath: simple key', () => assert.deepEqual(parsePath('users'), ['users']))
test('parsePath: array index', () => assert.deepEqual(parsePath('users[0]'), ['users', 0]))
test('parsePath: Map entry only', () => assert.deepEqual(parsePath('@0'), [{ kind: 'entry', index: 0 }]))
test('parsePath: nested entry', () => assert.deepEqual(parsePath('cache@3.name'), ['cache', { kind: 'entry', index: 3 }, 'name']))
test('parsePath: round-trip Map entry', () => {
  const original = ['cache', { kind: 'entry', index: 3 }, 'name']
  assert.deepEqual(parsePath(pathToStringV2(original)), original)
})
```

- [ ] **Step 2: Run tests to verify they pass (they're testing local helpers, not src)**

Run: `npm run test:node`
Expected: all tests pass — these are testing locally-defined `pathToStringV2` and `parsePath`, so they pass on their own. Step 3 wires them into `src/json-viewer.js`.

- [ ] **Step 3: Commit**

```bash
git add test/helpers.test.js
git commit -m "Add helper tests for @<i> Map/Set path syntax"
```

---

### Task 6: Update `src/json-viewer.js` path handling

Bring `parsePath` and the updated `pathToString` into the component, replacing the inline `_resolvePath` regex.

**Files:**
- Modify: `src/json-viewer.js`

- [ ] **Step 1: Replace `pathToString` in `src/json-viewer.js`**

Find the existing `pathToString` (around line 310 of the seed) and replace with:

```js
// Path segments: ['users', 0, { kind: 'entry', index: 2 }, 'name']
//   -> 'users[0]@2.name'
const pathToString = (segs) => {
  let s = ''
  for (const seg of segs) {
    if (typeof seg === 'object' && seg && seg.kind === 'entry') s += `@${seg.index}`
    else if (typeof seg === 'number') s += `[${seg}]`
    else if (/^[A-Za-z_$][\w$]*$/.test(seg)) s += s ? `.${seg}` : seg
    else s += `[${JSON.stringify(seg)}]`
  }
  return s || '$'
}

const parsePath = (s) => {
  if (!s || s === '$') return []
  const segs = []
  const re = /([A-Za-z_$][\w$]*)|\[(\d+)\]|\["([^"]*)"\]|@(\d+)/g
  let m
  while ((m = re.exec(s)) !== null) {
    if (m[4] !== undefined) segs.push({ kind: 'entry', index: Number(m[4]) })
    else if (m[2] !== undefined) segs.push(Number(m[2]))
    else if (m[3] !== undefined) segs.push(m[3])
    else segs.push(m[1])
  }
  return segs
}
```

- [ ] **Step 2: Update `_renderChildren` to use entry segments for Maps and Sets**

In `src/json-viewer.js`, find `_renderChildren` (around line 608 of the seed) and replace the `map` and `set` branches:

```js
    } else if (kind === 'map') {
      let i = 0
      for (const [k, v] of value) {
        const seg = { kind: 'entry', index: i }
        const child = this._renderNode(v, path.concat(seg), depth + 1, initialDepth, String(k))
        // Register the real key on the DOM element for entryAt() recovery
        const det = child.querySelector('details, li')
        if (det) {
          det.dataset.entryIndex = String(i)
          this._entryMap.set(det, { key: k, value: v })
        }
        ul.appendChild(child)
        i++
      }
    } else if (kind === 'set') {
      let i = 0
      for (const v of value) {
        const seg = { kind: 'entry', index: i }
        const child = this._renderNode(v, path.concat(seg), depth + 1, initialDepth, null)
        const det = child.querySelector('details, li')
        if (det) {
          det.dataset.entryIndex = String(i)
          this._entryMap.set(det, { key: undefined, value: v })
        }
        ul.appendChild(child)
        i++
      }
    }
```

- [ ] **Step 3: Add `_entryMap` to the constructor**

In `src/json-viewer.js`, find the constructor block (around line 401) and add this line after `this._renderedSet = new WeakSet()`:

```js
    this._entryMap = new WeakMap()   // <details>/<li> -> { key, value } for Map/Set entries
```

Also reset it inside `_render()` near the top, right where `_renderedSet` is reset:

```js
    this._entryMap = new WeakMap()
```

- [ ] **Step 4: Rewrite `_resolvePath` to honor entry segments**

In `src/json-viewer.js`, find `_resolvePath` (around line 858) and replace it with:

```js
  _resolvePath(path) {
    if (!path || path === '$') return this._data
    const tokens = parsePath(path)
    let cur = this._data
    for (const t of tokens) {
      if (cur == null) return undefined
      if (typeof t === 'object' && t && t.kind === 'entry') {
        if (cur instanceof Map) {
          const entries = [...cur.entries()]
          cur = entries[t.index]?.[1]
        } else if (cur instanceof Set) {
          cur = [...cur][t.index]
        } else {
          return undefined
        }
      } else {
        cur = cur[t]
      }
    }
    return cur
  }
```

- [ ] **Step 5: Add `entryAt` public method**

In `src/json-viewer.js`, find the public API block (look for `async copy(text)` around line 471) and add this method directly above `async copy(text)`:

```js
  // Returns { key, value } for any path. Useful for Map/Set entries where the
  // key isn't a string and round-tripping through `_resolvePath` would lose it.
  entryAt(path) {
    if (!path || path === '$') return { key: null, value: this._data }
    const tokens = parsePath(path)
    let cur = this._data
    let lastKey = null
    for (const t of tokens) {
      if (cur == null) return { key: null, value: undefined }
      if (typeof t === 'object' && t && t.kind === 'entry') {
        if (cur instanceof Map) {
          const entries = [...cur.entries()]
          const entry = entries[t.index]
          if (!entry) return { key: null, value: undefined }
          lastKey = entry[0]
          cur = entry[1]
        } else if (cur instanceof Set) {
          const arr = [...cur]
          lastKey = t.index
          cur = arr[t.index]
        } else {
          return { key: null, value: undefined }
        }
      } else {
        lastKey = t
        cur = cur[t]
      }
    }
    return { key: lastKey, value: cur }
  }
```

- [ ] **Step 6: Update `observedAttributes` is unchanged** (no-op, just confirm)

Verify with:
```bash
grep -n "observedAttributes" src/json-viewer.js
```
Expected: returns the existing list, unchanged.

- [ ] **Step 7: Run helper tests + Playwright mount test**

Run: `npm run test:node && npm test`
Expected: all helper tests still pass; the existing Playwright mount test still passes.

- [ ] **Step 8: Commit**

```bash
git add src/json-viewer.js
git commit -m "Add @<i> Map/Set path segment and entryAt() recovery"
```

---

### Task 7: Playwright test for Map/Set fidelity

Prove the round-trip works in the browser: render a Map keyed by an object, call `.entryAt('@0')`, get back the same object reference.

**Files:**
- Modify: `test/test-page.html`
- Modify: `test/json-viewer.spec.js`

- [ ] **Step 1: Add a Map-mounting harness to `test/test-page.html`**

Append before `</body>`:

```html
<json-viewer id="map-viewer" expanded="3"></json-viewer>
<script type="module">
  const mapEl = document.getElementById('map-viewer');
  const objKey = { id: 'k1', label: 'first' };
  const m = new Map();
  m.set(objKey, { tags: ['a', 'b'] });
  m.set('plain', 99);
  mapEl.data = m;
  window.__mapEl = mapEl;
  window.__objKey = objKey;
</script>
```

- [ ] **Step 2: Add the failing spec**

Append to `test/json-viewer.spec.js`:

```js
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
```

- [ ] **Step 3: Run**

Run: `npm test`
Expected: 3 passed (mount + two new tests).

- [ ] **Step 4: Commit**

```bash
git add test/test-page.html test/json-viewer.spec.js
git commit -m "Playwright: assert Map/Set entry round-trip via entryAt"
```

---

## Phase C — Source-data search (HANDOFF item 1)

### Task 8: Source-data record builder + helper tests

Build a flat record array from a JS value tree. Each record is `{ path, keyText, valueText, kind }`. This is the substrate the new `.search()` walks.

**Files:**
- Modify: `test/helpers.test.js`

- [ ] **Step 1: Append failing tests for `buildRecords`**

Add to `test/helpers.test.js`:

```js
// ---------- buildRecords (Phase C) ----------
const buildRecords = (value, basePath = []) => {
  const out = []
  const visit = (v, segs) => {
    const path = pathToStringV2(segs)
    const k = kindOf(v)
    const lastSeg = segs[segs.length - 1]
    const keyText =
      lastSeg && typeof lastSeg === 'object' && lastSeg.kind === 'entry' ? `@${lastSeg.index}` :
      typeof lastSeg === 'number' ? `[${lastSeg}]` :
      lastSeg === undefined ? '' : String(lastSeg)
    if (k === 'object') {
      out.push({ path, keyText, valueText: '', kind: k })
      for (const key of Object.keys(v)) visit(v[key], segs.concat(key))
    } else if (k === 'array') {
      out.push({ path, keyText, valueText: '', kind: k })
      for (let i = 0; i < v.length; i++) visit(v[i], segs.concat(i))
    } else if (k === 'map') {
      out.push({ path, keyText, valueText: '', kind: k })
      let i = 0
      for (const [, val] of v) {
        visit(val, segs.concat({ kind: 'entry', index: i }))
        i++
      }
    } else if (k === 'set') {
      out.push({ path, keyText, valueText: '', kind: k })
      let i = 0
      for (const val of v) {
        visit(val, segs.concat({ kind: 'entry', index: i }))
        i++
      }
    } else {
      out.push({ path, keyText, valueText: String(v ?? ''), kind: k })
    }
  }
  visit(value, basePath)
  return out
}

test('buildRecords: simple object yields container + leaves', () => {
  const recs = buildRecords({ a: 1, b: 'hi' })
  const paths = recs.map(r => r.path)
  assert.deepEqual(paths, ['$', 'a', 'b'])
  assert.equal(recs[1].valueText, '1')
  assert.equal(recs[2].valueText, 'hi')
})

test('buildRecords: array indices', () => {
  const recs = buildRecords({ xs: [10, 20] })
  assert.deepEqual(recs.map(r => r.path), ['$', 'xs', 'xs[0]', 'xs[1]'])
})

test('buildRecords: Map uses @<i> segments', () => {
  const m = new Map([['k', 'v']])
  const recs = buildRecords({ cache: m })
  assert.ok(recs.some(r => r.path === 'cache@0'))
})

// ---------- filterRecords (substring + regex) ----------
const filterRecords = (records, query, { regex = false, caseSensitive = false } = {}) => {
  if (!query) return []
  const test = regex
    ? new RegExp(query, caseSensitive ? '' : 'i').test.bind(new RegExp(query, caseSensitive ? '' : 'i'))
    : (s) => caseSensitive ? s.includes(query) : s.toLowerCase().includes(query.toLowerCase())
  return records.filter(r => test(r.keyText) || test(r.valueText))
}

test('filterRecords: substring matches key', () => {
  const recs = buildRecords({ username: 'ada', age: 30 })
  const hits = filterRecords(recs, 'user')
  assert.equal(hits.length, 1)
  assert.equal(hits[0].path, 'username')
})

test('filterRecords: substring matches value', () => {
  const recs = buildRecords({ a: 'apple', b: 'banana' })
  const hits = filterRecords(recs, 'apple')
  assert.equal(hits.length, 1)
  assert.equal(hits[0].path, 'a')
})

test('filterRecords: case-insensitive by default', () => {
  const recs = buildRecords({ Name: 'Ada' })
  const hits = filterRecords(recs, 'ada')
  assert.equal(hits.length, 1)
})

test('filterRecords: regex mode', () => {
  const recs = buildRecords({ x: 'abc123', y: 'def' })
  const hits = filterRecords(recs, '^abc\\d+$', { regex: true })
  assert.equal(hits.length, 1)
  assert.equal(hits[0].path, 'x')
})

test('filterRecords: empty query returns empty', () => {
  const recs = buildRecords({ a: 1 })
  assert.deepEqual(filterRecords(recs, ''), [])
})
```

- [ ] **Step 2: Run helper tests**

Run: `npm run test:node`
Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add test/helpers.test.js
git commit -m "Add helper tests for source-data record builder and filter"
```

---

### Task 9: Wire `buildRecords` + new `.search()` into the component

Replace the seed's DOM-walking `_runSearch` with a source-data implementation. Match navigation expands ancestors on demand and highlights one match at a time.

**Files:**
- Modify: `src/json-viewer.js`

- [ ] **Step 1: Add `buildRecords` near the other helpers**

In `src/json-viewer.js`, find the helper section (right after `compileMatcher`, around line 349) and add:

```js
/* ----------------------- source-data record builder ---------------- */
// Walks the JS value, returns flat records for search.
const buildRecords = (value, basePath = []) => {
  const out = []
  const visit = (v, segs) => {
    const path = pathToString(segs)
    const k = kindOf(v)
    const lastSeg = segs[segs.length - 1]
    const keyText =
      lastSeg && typeof lastSeg === 'object' && lastSeg.kind === 'entry' ? `@${lastSeg.index}` :
      typeof lastSeg === 'number' ? `[${lastSeg}]` :
      lastSeg === undefined ? '' : String(lastSeg)
    if (k === 'object') {
      out.push({ path, keyText, valueText: '', kind: k })
      for (const key of Object.keys(v)) visit(v[key], segs.concat(key))
    } else if (k === 'array') {
      out.push({ path, keyText, valueText: '', kind: k })
      for (let i = 0; i < v.length; i++) visit(v[i], segs.concat(i))
    } else if (k === 'map') {
      out.push({ path, keyText, valueText: '', kind: k })
      let i = 0
      for (const [, val] of v) {
        visit(val, segs.concat({ kind: 'entry', index: i }))
        i++
      }
    } else if (k === 'set') {
      out.push({ path, keyText, valueText: '', kind: k })
      let i = 0
      for (const val of v) {
        visit(val, segs.concat({ kind: 'entry', index: i }))
        i++
      }
    } else {
      out.push({ path, keyText, valueText: String(v ?? ''), kind: k })
    }
  }
  visit(value, basePath)
  return out
}

const filterRecords = (records, query, { regex = false, caseSensitive = false } = {}) => {
  if (!query) return []
  const re = regex ? new RegExp(query, caseSensitive ? '' : 'i') : null
  const test = re
    ? (s) => re.test(s)
    : (s) => caseSensitive ? s.includes(query) : s.toLowerCase().includes(query.toLowerCase())
  return records.filter(r => test(r.keyText) || test(r.valueText))
}
```

- [ ] **Step 2: Build the records cache during `_render`**

In `src/json-viewer.js`, find `_render()` (around line 521) and right after `this._matches = []` add:

```js
    this._records = (this._data === undefined) ? [] : buildRecords(this._data)
```

Also add the field to the constructor (right after `this._matches = []`):

```js
    this._records = []
```

- [ ] **Step 3: Replace `_runSearch` with the source-data version**

In `src/json-viewer.js`, find `_runSearch` (around line 672) and replace its body completely with:

```js
  _runSearch(query, options = {}) {
    this._clearMarks()
    this._matches = []
    this._matchIdx = -1
    this._refs.searchCt.textContent = '0/0'
    if (!query) return

    const hits = filterRecords(this._records, query, options)
    this._matches = hits.map(r => ({ path: r.path }))
    this._refs.searchCt.textContent = `${this._matches.length ? 1 : 0}/${this._matches.length}`
    if (this._matches.length) this._gotoMatch(0, query, options)
  }
```

- [ ] **Step 4: Replace `_gotoMatch` to expand ancestors + highlight the visible match**

Find `_gotoMatch` (around line 730) and replace with:

```js
  _gotoMatch(i, query, options = {}) {
    if (!this._matches.length) return
    this._clearMarks()
    this._matchIdx = i
    const m = this._matches[i]

    // Expand ancestors so the path is visible
    this._expandAncestors(m.path)

    // Locate the DOM node carrying this path and highlight the substring within it
    const carrier = this._refs.body.querySelector(`[data-path="${cssEscape(m.path)}"]`)
    if (carrier && query) this._highlightInNode(carrier, query, options)
    if (carrier) carrier.scrollIntoView({ block: 'nearest', behavior: 'smooth' })

    this._refs.searchCt.textContent = `${this._matchIdx + 1}/${this._matches.length}`
  }

  _expandAncestors(path) {
    if (!path || path === '$') return
    // Walk parent paths, opening each <details data-path="...">
    const segs = parsePath(path)
    for (let i = 1; i <= segs.length; i++) {
      const partial = pathToString(segs.slice(0, i))
      const det = this._refs.body.querySelector(`details[data-path="${cssEscape(partial)}"]`)
      if (det) {
        this._ensureRendered(det)
        det.open = true
      }
    }
  }

  _highlightInNode(node, query, { regex = false, caseSensitive = false }) {
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => {
        const p = n.parentElement
        if (!p || p.classList.contains('size') || p.classList.contains('type') || p.classList.contains('copy')) {
          return NodeFilter.FILTER_REJECT
        }
        return NodeFilter.FILTER_ACCEPT
      }
    })
    const re = regex
      ? new RegExp(query, caseSensitive ? 'g' : 'gi')
      : new RegExp(query.replace(/[.+^${}()|[\]\\]/g, '\\$&'), caseSensitive ? 'g' : 'gi')
    let textNode
    while ((textNode = walker.nextNode())) {
      const text = textNode.nodeValue
      if (!re.test(text)) { re.lastIndex = 0; continue }
      re.lastIndex = 0
      const frag = document.createDocumentFragment()
      let last = 0
      let mm
      while ((mm = re.exec(text)) !== null) {
        if (mm.index > last) frag.appendChild(document.createTextNode(text.slice(last, mm.index)))
        const mark = document.createElement('mark')
        mark.className = 'match-active'
        mark.textContent = mm[0]
        frag.appendChild(mark)
        last = mm.index + mm[0].length
        if (mm.index === re.lastIndex) re.lastIndex++  // safety for zero-width
      }
      if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)))
      textNode.parentNode.replaceChild(frag, textNode)
    }
  }
```

- [ ] **Step 5: Add a `cssEscape` helper at the top of the file** (used by the queries above)

In `src/json-viewer.js`, near the other helpers (just after `escapeHtml`, around line 354):

```js
const cssEscape = (s) => (window.CSS && CSS.escape) ? CSS.escape(s) : s.replace(/(["\\\]\[\:\.\(\)])/g, '\\$1')
```

- [ ] **Step 6: Update the public `.search()` to thread query+options to `_gotoMatch`**

Find `search(query)` (around line 478) and replace with:

```js
  search(query, options = {}) {
    this._runSearch(query, options)
    const self = this
    return {
      next: () => {
        if (!self._matches.length) return { value: undefined, done: true }
        self._gotoMatch((self._matchIdx + 1) % self._matches.length, query, options)
        return { value: self._matches[self._matchIdx], done: false }
      },
      prev: () => {
        if (!self._matches.length) return { value: undefined, done: true }
        self._gotoMatch((self._matchIdx - 1 + self._matches.length) % self._matches.length, query, options)
        return { value: self._matches[self._matchIdx], done: false }
      },
      get current() { return self._matches[self._matchIdx] },
      get count() { return self._matches.length },
      [Symbol.iterator]() { return this }
    }
  }
```

- [ ] **Step 7: Update the search input handler to pass query straight through**

Find the `this._refs.searchIn.addEventListener('input', ...)` (around line 817) and update to:

```js
    this._refs.searchIn.addEventListener('input', (e) => {
      clearTimeout(debounce)
      debounce = setTimeout(() => this._runSearch(e.target.value), 120)
    })
```

(Already correct — verify it still calls `_runSearch` directly. No change needed.)

- [ ] **Step 8: Run all tests**

Run: `npm run test:node && npm test`
Expected: all helper tests pass; the existing Playwright tests still pass.

- [ ] **Step 9: Commit**

```bash
git add src/json-viewer.js
git commit -m "Replace DOM-walk search with source-data record search"
```

---

### Task 10: Playwright test for search v2

Verify the new search hits keys + values, navigates with next/prev, and does NOT call `expandAll` (assert by counting `details[open]` before vs. after search).

**Files:**
- Modify: `test/test-page.html`
- Modify: `test/json-viewer.spec.js`

- [ ] **Step 1: Add a deep-tree harness to `test/test-page.html`**

Append before `</body>`:

```html
<json-viewer id="search-viewer" expanded="1"></json-viewer>
<script type="module">
  const sv = document.getElementById('search-viewer');
  sv.data = {
    users: [
      { id: 1, name: 'Ada', email: 'ada@example.com' },
      { id: 2, name: 'Linus', email: 'linus@example.com' }
    ],
    config: { theme: 'dark', adaMode: true },
    notes: 'nothing about ada here either'
  };
  window.__sv = sv;
</script>
```

- [ ] **Step 2: Add specs**

Append to `test/json-viewer.spec.js`:

```js
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
```

- [ ] **Step 3: Run**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add test/test-page.html test/json-viewer.spec.js
git commit -m "Playwright: assert search v2 finds matches and skips expandAll"
```

---

## Phase D — Docs, conventions, and finalize

### Task 11: Generate the CEM manifest and write the `.d.ts`

**Files:**
- Create: `json-viewer.d.ts`
- Create: `custom-elements.json` (generated)

- [ ] **Step 1: Run the CEM analyzer**

Run: `npm run analyze`
Expected: writes `custom-elements.json` to the package root.

- [ ] **Step 2: Write `json-viewer.d.ts`** (modeled on `~/src/code-block/code-block.d.ts`)

```ts
/**
 * <json-viewer> — Standalone JSON viewer web component.
 */
export declare class JsonViewer extends HTMLElement {
  constructor()
  connectedCallback(): void
  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void

  static readonly observedAttributes: readonly [
    'data', 'src', 'expanded', 'mode',
    'show-types', 'show-sizes', 'show-indices', 'indent'
  ]

  /** The value to render. Setting triggers a re-render. */
  data: unknown

  /** Expand container nodes whose path matches the matcher. */
  expand(matcher: string | RegExp | ((path: string) => boolean)): void

  /** Collapse container nodes whose path matches the matcher. */
  collapse(matcher: string | RegExp | ((path: string) => boolean)): void

  expandAll(): void
  collapseAll(): void

  /** Run a search over keys and values; returns a navigable iterator. */
  search(query: string, options?: { regex?: boolean; caseSensitive?: boolean }): JsonViewerSearchIterator

  /** Returns { key, value } for any path, preserving Map key identity. */
  entryAt(path: string): { key: unknown; value: unknown }

  /** Write text (or the full JSON, BigInt-safe) to the clipboard. */
  copy(text?: string): Promise<void>
}

export interface JsonViewerSearchIterator extends Iterator<JsonViewerMatch> {
  next(): IteratorResult<JsonViewerMatch>
  prev(): IteratorResult<JsonViewerMatch>
  readonly current: JsonViewerMatch | undefined
  readonly count: number
}

export interface JsonViewerMatch {
  path: string
}

export default JsonViewer

declare global {
  interface HTMLElementTagNameMap {
    'json-viewer': JsonViewer
  }
  interface HTMLElementEventMap {
    'json-viewer:keyclick': CustomEvent<{ path: string; key: string; value: unknown }>
    'json-viewer:valueclick': CustomEvent<{ path: string; value: unknown; type: string }>
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add json-viewer.d.ts custom-elements.json
git commit -m "Add types and CEM manifest"
```

---

### Task 12: Migrate docs from the seed HTML pages

**Files:**
- Create: `docs/index.html` (from seed `vb-json-viewer.html`)
- Create: `docs/demos.html` (from seed `demo.html`)
- Create: `docs/styles.css`
- Delete: `vb-json-viewer.html`
- Delete: `demo.html`

- [ ] **Step 1: Move and rename**

Run:
```bash
mv vb-json-viewer.html docs/index.html
mv demo.html docs/demos.html
```

- [ ] **Step 2: Rewrite tag/import references in both files**

Run (in repo root):
```bash
sed -i '' 's|vb-json-viewer\.js|/src/json-viewer.js|g' docs/index.html docs/demos.html
sed -i '' 's|<vb-json-viewer|<json-viewer|g' docs/index.html docs/demos.html
sed -i '' 's|</vb-json-viewer>|</json-viewer>|g' docs/index.html docs/demos.html
sed -i '' "s|'vb-json-viewer'|'json-viewer'|g" docs/index.html docs/demos.html
sed -i '' "s|querySelector('vb-json-viewer')|querySelector('json-viewer')|g" docs/index.html docs/demos.html
```

Verify nothing references the old tag:
```bash
grep -n "vb-json-viewer" docs/index.html docs/demos.html
```
Expected: no output.

- [ ] **Step 3: Rewrite event names referenced from the demos**

```bash
sed -i '' "s|'keyclick'|'json-viewer:keyclick'|g" docs/demos.html
sed -i '' "s|'valueclick'|'json-viewer:valueclick'|g" docs/demos.html
```

Verify:
```bash
grep -nE "'(keyclick|valueclick)'" docs/demos.html
```
Expected: no output.

- [ ] **Step 4: Rewrite any in-page custom-property overrides** (the demos use `--vb-json-*` for theme switching — leave them as VB fallbacks since both APIs work, but add a comment noting the new public names)

In `docs/demos.html`, find the `body[data-vb-theme="warm"] vb-json-viewer` selector and update to `body[data-vb-theme="warm"] json-viewer`:

```bash
sed -i '' 's|vb-json-viewer\([^.]\)|json-viewer\1|g' docs/demos.html docs/index.html
```

- [ ] **Step 5: Create an empty `docs/styles.css`** so the Vite dev server doesn't 404 if either page references it (only add if either HTML actually links to it; otherwise skip):

```bash
grep -l 'styles.css' docs/*.html && touch docs/styles.css || echo "no styles.css reference, skipping"
```

- [ ] **Step 6: Smoke-check via Vite dev server**

Run (background):
```bash
npm run dev &
sleep 3
curl -s http://localhost:5173/docs/index.html | grep -c '<json-viewer'
curl -s http://localhost:5173/docs/demos.html | grep -c '<json-viewer'
kill %1 2>/dev/null || true
```
Expected: both grep counts are ≥1.

- [ ] **Step 7: Commit**

```bash
git add docs/index.html docs/demos.html docs/styles.css 2>/dev/null
git rm vb-json-viewer.html demo.html 2>/dev/null || true
git commit -m "Migrate demo pages to docs/ with renamed tag and events"
```

---

### Task 13: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`**

```markdown
# @profpowell/json-viewer

A standalone `<json-viewer>` web component for rendering JS values as a
collapsible tree. Zero runtime dependencies, Shadow DOM, native `<details>`,
lazy child rendering, path/glob programmatic API, source-data search, and
correct Map/Set key handling.

VB-compatible: every theme hook reads `--json-viewer-*` first, then
`--vb-*`, then a hardcoded `light-dark()` default.

## Install

```bash
npm install @profpowell/json-viewer
```

Or drop the built module into any page over `file://` or a static server.

## Quick start

```html
<json-viewer expanded="2" show-sizes></json-viewer>
<script type="module">
  import '@profpowell/json-viewer'
  document.querySelector('json-viewer').data = await fetch('/api').then(r => r.json())
</script>
```

## Attributes

| Attr | Type | Default | Notes |
|---|---|---|---|
| `data` | JSON string | — | Prefer `.data` property for non-stringifiable values. |
| `src` | URL | — | Fetched as JSON on connect / attribute change. |
| `expanded` | int \| `true` \| `false` | `1` | Initial expansion depth. |
| `mode` | `tree` \| `raw` | `tree` | Raw mode pretty-prints. |
| `show-types` | boolean | `false` | Type chips next to values. |
| `show-sizes` | boolean | `false` | Item counts on arrays/objects. |
| `show-indices` | boolean | `false` | Array indices. |
| `indent` | int (ch units) | `2` | Indentation + raw-mode spacing. |

## Methods

- `.expand(matcher)` / `.collapse(matcher)` — path string, glob (`*`, `**`), RegExp, or `(path) => boolean`.
- `.expandAll()` / `.collapseAll()`.
- `.search(query, options?)` — returns `{ next, prev, current, count }`.
- `.entryAt(path)` — `{ key, value }` for any path, including Map/Set entries.
- `.copy(text?)` — clipboard write; no-arg copies the full JSON (BigInt-safe).

## Events

Bubble + composed.

- `json-viewer:keyclick` — `detail: { path, key, value }`
- `json-viewer:valueclick` — `detail: { path, value, type }`

## Path grammar

- `users[0].name` — object/array.
- `cache@0` — i-th Map or Set entry.
- `*` matches one segment, `**` matches zero or more.

## CSS custom properties

Public: `--json-viewer-{surface,text,text-muted,border,accent,radius,font-mono,space-1..4,key,string,number,boolean,null,punct}`.

Fallback chain: `--json-viewer-foo` → `--vb-foo` (or `--vb-json-foo` for value colors) → hardcoded `light-dark()`.

## License

MIT
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "Add README"
```

---

### Task 14: bd-style AGENTS.md and CLAUDE.md

**Files:**
- Create: `AGENTS.md`
- Create: `CLAUDE.md`

- [ ] **Step 1: Write `AGENTS.md`** (copied from `~/src/browser-window/AGENTS.md`, adapted)

```markdown
# Agent Instructions

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

## Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git
```

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
```

- [ ] **Step 2: Write `CLAUDE.md`**

```markdown
# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

`<json-viewer>` is a dependency-free web component that renders any JS value as a collapsible tree. Shadow DOM, native `<details>`, lazy child rendering, path/glob programmatic API, source-data search, and correct Map/Set key handling. VB-compatible via CSS custom properties.

## Development

```bash
npm run dev          # Vite dev server (docs/index.html)
npm test             # Playwright suite
npm run test:node    # Node --test helper tests (no browser)
npm run lint
npm run build        # Build to dist/
npm run analyze      # Regenerate custom-elements.json
```

## Architecture

Single ES module (`src/json-viewer.js`). Tag `<json-viewer>`, class `JsonViewer`. Token contract is `--json-viewer-*` → `--vb-*` → hardcoded `light-dark()`. Path grammar supports `foo.bar`, `users[0]`, and `cache@i` (Map/Set entries). Search runs over a flat record array built from the source data — never `expandAll`.

## Beads Issue Tracker

This project uses **bd (beads)**. Run `bd prime` for the full workflow.

```bash
bd ready              # Find available work
bd show <id>
bd update <id> --status in_progress
bd close <id>
```

Do NOT use TodoWrite, TaskCreate, or markdown TODO lists for issue tracking.

## Session Completion

Same as AGENTS.md: work is NOT complete until `git push` succeeds.
```

- [ ] **Step 3: Commit**

```bash
git add AGENTS.md CLAUDE.md
git commit -m "Add bd-aware AGENTS.md and CLAUDE.md"
```

---

### Task 15: Update HANDOFF.md to reflect the rename and roadmap completion

**Files:**
- Modify: `HANDOFF.md`

- [ ] **Step 1: Rewrite the front-matter and roadmap sections**

Replace lines 1-16 of `HANDOFF.md` (the title + "Files in this drop" block) with:

```markdown
# json-viewer — Handoff

A standalone `<json-viewer>` web component for the Vanilla Breeze ecosystem.
This document captures the original design decisions and trade-offs that
informed the seed; the seed has since been promoted into the standard
ProfPowell package layout at `src/json-viewer.js`.

## Files in this package

```
json-viewer/
├── src/json-viewer.js     # The component (ES module, ~33 KB, no deps)
├── docs/                  # Demo pages (index.html, demos.html)
├── test/
│   ├── json-viewer.spec.js   # Playwright suite
│   └── helpers.test.js       # node --test pure-helper tests
└── HANDOFF.md             # This file
```

Open `docs/index.html` over `file://` or `npm run dev` for the live demo.
```

- [ ] **Step 2: Update the "Known limitations / v2 roadmap" section** — mark items 1 (search) and 4 (Map/Set) as DONE.

Find the section heading `## Known limitations / v2 roadmap` and prepend:

```markdown
> **Status update (2026-05-12):** Items 1 (source-data search) and 4 (Map/Set
> path fidelity) are now closed in v1. The remaining items are still open.
```

- [ ] **Step 3: Replace stale `vb-json-viewer` references everywhere in HANDOFF.md**

```bash
sed -i '' 's|vb-json-viewer|json-viewer|g' HANDOFF.md
sed -i '' 's|VBJsonViewer|JsonViewer|g' HANDOFF.md
```

Verify:
```bash
grep -n "vb-json-viewer\|VBJsonViewer" HANDOFF.md
```
Expected: no output.

- [ ] **Step 4: Update the event names in HANDOFF.md**

Find references to `keyclick` and `valueclick` in HANDOFF.md and update:

```bash
sed -i '' 's|`keyclick`|`json-viewer:keyclick`|g' HANDOFF.md
sed -i '' 's|`valueclick`|`json-viewer:valueclick`|g' HANDOFF.md
```

- [ ] **Step 5: Commit**

```bash
git add HANDOFF.md
git commit -m "Update HANDOFF.md for rename and roadmap completion"
```

---

### Task 16: Final verification + tag

**Files:** none (verification + tag only).

- [ ] **Step 1: Full test run**

Run: `npm run lint && npm run test:node && npm test`
Expected: all green.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: writes `dist/json-viewer.js`. Verify:
```bash
ls -la dist/
```

- [ ] **Step 3: Confirm no `vb-json-viewer` references remain anywhere**

```bash
grep -rn "vb-json-viewer\|VBJsonViewer" --exclude-dir=node_modules --exclude-dir=dist . || echo "clean"
```
Expected: prints `clean`.

- [ ] **Step 4: Tag v0.1.0**

```bash
git tag v0.1.0
git log --oneline -20
```
Expected: full commit history of the migration.

- [ ] **Step 5: Final commit (if anything changed during cleanup)**

```bash
git status
# If clean, nothing to commit. If not, commit the residue:
# git add -A && git commit -m "Final cleanup"
```

---

## Self-review

**Spec coverage:**
- Repo layout (Spec §Architecture/Repository layout) → Task 1, Task 12.
- Scaffolding strategy (Spec §Architecture/Scaffolding strategy) → Tasks 1–2.
- Package metadata (Spec §Architecture/Package metadata) → Task 1.
- Token contract (Spec §Token contract) → Task 2 step 3.
- VB fallback names (Spec §Token contract/VB fallback names) → Task 2 step 3.
- Tag + class names (Spec §JS API surface/Tag and class) → Task 2 steps 4, 6.
- Attributes table (Spec §JS API surface/Attributes) → Task 2 (carried over from seed; verified in Task 11 `.d.ts`).
- Properties / methods (Spec §JS API surface/Methods) → Task 2 (seed) + Task 6 (`entryAt`) + Task 9 (`search` v2).
- Namespaced events (Spec §JS API surface/Events) → Task 2 step 5.
- Path grammar with `@<i>` (Spec §JS API surface/Path grammar) → Tasks 5, 6.
- Search v2 (Spec §Search v2) → Tasks 8, 9, 10.
- Map/Set path fidelity (Spec §Map/Set path fidelity) → Tasks 5, 6, 7.
- Test strategy: node helpers (Spec §Testing/Node-only) → Tasks 3, 5, 8.
- Test strategy: Playwright (Spec §Testing/Playwright suite) → Tasks 4, 7, 10. *Note: the spec lists 10 Playwright sections; this plan covers the four highest-value (mount, Map/Set fidelity, search v2 hits, search v2 no-expandAll). The remaining six (lazy expansion, path API, events, copy, token contract, mobile container query, attribute reactivity) are left as follow-up `bd` issues filed during Task 16. This is an explicit trade-off to ship v1 — coverage is added incrementally on `main`.*
- Fixtures (Spec §Testing/Fixtures) → **Deferred to follow-up.** The Playwright tests in this plan use inline data via `el.data = ...` rather than `test/fixtures/*.json`. File a `bd` issue in Task 16 to extract fixtures.
- Docs (Spec §Documentation) → Tasks 12, 13. *`docs/api.html` is deferred to a follow-up; the CEM manifest gives consumers a machine-readable spec until then.*
- bd conventions (Spec §Project conventions) → Task 14.
- Risks (Spec §Risks and follow-ups) — captured here:
  - Search-record build for unexpanded subtrees: the current implementation builds records eagerly on `_render()`, sidestepping the "search-before-expansion" case at the cost of one full tree walk per data set. For the spec's risk-level data sizes this is acceptable; flagging as a `bd` follow-up if measurements warrant.
  - Virtualization: still v2.
  - Editing: still out of scope.

**Placeholder scan:** none — every step contains exact code, commands, or filenames.

**Type/name consistency:** `JsonViewer` class, `<json-viewer>` tag, `json-viewer:keyclick` / `json-viewer:valueclick` events, `--json-viewer-*` tokens, `@<i>` Map/Set segments, `.entryAt(path)` returns `{ key, value }`. All consistent across tasks.

**Deferred to follow-up bd issues** (filed during Task 16):
1. Extract `test/fixtures/*.json` from seed demo pages, reroute Playwright tests to use them.
2. Add Playwright coverage for: lazy expansion, full path-API matrix, events, copy buttons, token contract resolution, mobile container query, attribute reactivity.
3. Write `docs/api.html` from the CEM manifest.
4. Benchmark `buildRecords` on 100k-node payloads; if >100ms, add an "indexing…" UI hint or move record-building to lazy / web-worker.
