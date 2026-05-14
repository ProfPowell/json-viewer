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

## What it does

A custom element `<json-viewer>` that renders any JS value as a collapsible
tree. Shadow DOM for isolation, CSS custom properties for theming, native
`<details>` for every collapsible node, lazy child rendering on first expand,
programmatic path API for expand / collapse / search with glob support.

```html
<json-viewer expanded="2" show-sizes></json-viewer>
<script type="module">
  import './json-viewer.js';
  document.querySelector('json-viewer').data = await fetch('/api').then(r => r.json());
</script>
```

## Research summary (so we don't re-search)

Compared against:

| Component                          | Stack | Notable strength                                | Notable gap                          |
| ---------------------------------- | ----- | ----------------------------------------------- | ------------------------------------ |
| `react-json-view` (mac-s-g)        | React | Editing, copy hover, type chips                 | Unmaintained, React-only             |
| `@uiw/react-json-view`             | React | Modern, zero deps, ~20 KB gz                    | React-only                           |
| `react-json-view-lite`             | React | Perf-focused, tiny                              | No search, no path API               |
| `vue-json-pretty` (leezng)         | Vue 3 | Big-data + virtualization, selection            | Vue-only                             |
| `alenaksu/json-viewer`             | WC    | **Path-based programmatic API, search iterator**| No toolbar/UI, sparse value handling |
| `@andypf/json-viewer`              | WC    | Toolbar, expand-by-one, attribute API           | Mediocre mobile UX                   |
| `jsonhero.io`                      | App   | Schema inference, multiple view modes           | Not embeddable                       |

**What we borrowed**
- alenaksu's path-glob API surface (`.expand('**.name')`, `.search()` iterator).
- @andypf's attribute-driven config (`expanded`, `show-types`, `show-sizes`, `indent`).
- react-json-view's per-node copy buttons + type/size chips.

**What we deliberately rejected**
- **Editing.** Triples surface area (validation, undo, type coercion). Use Monaco/CodeMirror for that use case.
- **Base-16 theme JSON objects.** CSS custom properties are the platform answer; theme files become CSS.
- **Custom collapse widget.** `<details>/<summary>` ships with keyboard focus, ARIA, and (in some browsers) browser-find auto-expand. The minor styling annoyance with `::marker` is dodged via `::before`.
- **React/Vue wrappers as primary API.** Web component works in both; framework wrappers are a thin shim if needed later.
- **Bundling / build step.** Single ES module, drop in.

## Design decisions

1. **Shadow DOM + CSS custom properties for the styling API.** Tokens cascade through the shadow boundary, so VB tokens defined on `:root` (or on the host) Just Work. Token contract is documented in the readme block below.

2. **Native `<details>` for every collapsible node.** Keyboard, ARIA, and copy-paste-from-tree all free. Cost: less control over the exact toggle UX, accepted.

3. **Lazy child rendering.** First N levels render up-front (configurable via `expanded`). Deeper levels render on the first `toggle` event of their `<details>` and are tracked in a `WeakSet` to avoid duplicate work. This is what makes the 2000-key sample open instantly.

4. **Path API, glob support.** Paths are strings: `users[0].name`, `data.items[3].tags[0]`. Globs use `*` (one segment) and `**` (zero or more segments). RegExp and function matchers also accepted. See `tests.js` for the matrix.

5. **In-component search, not browser-find.** Browser find can't navigate matches across collapsed branches reliably. We `.expandAll()` before searching, walk text nodes via `TreeWalker`, wrap hits in `<mark>`, and provide next/prev navigation. The expand-on-search is a deliberate simplicity choice — see "Known limitations".

6. **VB-token-compatible with fallbacks.** Every styling hook is `var(--vb-foo, sensible-default)`, where the default uses `light-dark()`. Works standalone today, themes automatically when dropped into a VB page.

7. **Mobile-first toolbar.** Container query (`@container (max-width: 480px)`) hides toolbar labels under 480px. 44px minimum tap targets. Search bar is sticky. Tap-key surfaces a copyable path strip.

## API reference

### Attributes
| Attr            | Type                          | Default  | Notes                                              |
| --------------- | ----------------------------- | -------- | -------------------------------------------------- |
| `data`          | JSON string                   | —        | Prefer `.data` property for objects.               |
| `src`           | URL                           | —        | Fetched as JSON on connect / attribute change.     |
| `expanded`      | int \| `true` \| `false`      | `1`      | Initial expansion depth.                           |
| `mode`          | `tree` \| `raw`               | `tree`   | Raw mode pretty-prints.                            |
| `show-types`    | boolean                       | false    | Type chips next to values.                         |
| `show-sizes`    | boolean                       | false    | Item counts on arrays/objects.                     |
| `show-indices`  | boolean                       | false    | Array indices.                                     |
| `indent`        | int (ch units)                | `2`      | Indentation + raw-mode spacing.                    |

### Properties
- `.data` — the value to render. Setting triggers re-render.

### Methods
- `.expand(matcher)` / `.collapse(matcher)` — `matcher` is a path string, glob, RegExp, or `(path) => boolean`.
- `.expandAll()` / `.collapseAll()`.
- `.search(query)` — returns an iterator with `.next()` / `.prev()`; scrolls to and highlights matches.
- `.copy(text?)` — clipboard write. With no arg, copies the full JSON (BigInt-safe).

### Events (bubble, composed)
- `json-viewer:keyclick` — `detail: { path, key, value }`.
- `json-viewer:valueclick` — `detail: { path, value, type }`.

### CSS custom properties (the token contract)
```
--vb-font-mono            font stack
--vb-surface              background
--vb-text                 default text
--vb-text-muted           secondary text
--vb-border               separator color
--vb-accent               selection / active match
--vb-radius               border radius
--vb-space-1 .. -4        spacing scale
--vb-json-key             object keys
--vb-json-string          string values
--vb-json-number          numeric values
--vb-json-boolean         booleans
--vb-json-null            null / undefined
--vb-json-punct           punctuation
```
Every one has a `light-dark()` fallback. Set on `:host`, `:root`, or any ancestor.

## Known limitations / v2 roadmap

> **Status update (2026-05-14):** Items 1 (source-data search) and 4 (Map/Set
> path fidelity) are now closed in v1. The remaining items are still open.

Ranked by importance:

1. **Search expands the whole tree.** Simpler and correct, but for >100k nodes it'll be slow. **Fix:** search the source data structure, then surface paths to expand-on-demand rather than wrap text nodes. ~2 hours.

2. **No virtualization.** Lazy expansion handles up to ~10k visible rows fine. Beyond that the DOM gets heavy. **Fix:** Intersection-Observer-driven windowed rendering for arrays larger than a threshold (say, 500 items). Keep tree semantics for everything else. ~1 day.

3. **No editing.** Out of scope for v1. If/when this comes back: use a content-editable approach for primitive cells, dispatch a `change` event, parse-validate on commit. Don't try to support adding/removing keys in v2 — that's a different component.

4. **Map / Set rendering is approximate.** We render Map/Set as object/array-ish but the path API doesn't dereference Map keys correctly (we stringify them). Fine for display, broken for programmatic round-trip. **Fix:** store actual Map keys in `data-key` rather than serializing into the path.

5. **No JSON Schema awareness.** `jsonhero` does some neat schema-inference. Could be a separate companion component (`<vb-json-schema-inspector>`) rather than bolted onto this one.

6. **No Lit / Stimulus framework wrappers.** Probably never needed — web component IS the wrapper. Add only if a real consumer asks.

7. **Big strings.** We truncate strings >200 chars with a "show N more" button. The full string lives in `dataset.full`, which is fine for kilobytes but not megabytes. If someone needs to dump a 5MB string they should use raw mode.

8. **Tests are helpers-only.** DOM rendering, search navigation, and event dispatching aren't covered. **Fix:** Playwright suite. Likely 30 min to set up + 2 hours of cases.

9. **Toolbar action: copy-path-with-value.** Currently you can copy the path OR the value. A "copy as `path = value`" snippet for pasting into JS would be nice. 10 minutes.

## Engineering notes for the next session

- The `_ensureRendered(detailsEl)` method has a subtle reliance on the `toggle` event firing synchronously when we set `.open = true`. This works in all modern browsers but is technically not guaranteed. If you see "expand by path doesn't show children", that's where to look. Consider extracting the render logic out of the toggle handler into a function we can call directly.

- `_seen` (the circular-reference WeakSet) is created fresh per render. If we add incremental updates in v2, this needs to be rebuilt per render pass, not per component lifetime.

- The placeholder character trick in `globToRe` (`\u0001`/`\u0002`/`\u0003`) is gross but works. If we want a real path grammar later, a small recursive-descent parser would be more honest — though probably slower.

- `json-viewer:valueclick` and `json-viewer:keyclick` are dispatched via two different handlers. They can both fire for a single physical click on a key. If that becomes annoying, consolidate.

## Suggested Claude Code prompts

If picking this up fresh, here are useful starting points:

- **"Add Playwright tests covering tree rendering, search next/prev, and the keyclick event."**
- **"Implement v2 search: search the source data, not the DOM. Expand paths to matches on demand."**
- **"Add a `<json-viewer>` Storybook story file with one story per attribute combination."**
- **"Wire this into Vanilla Breeze's component catalog. The token contract is in HANDOFF.md."**
- **"Add an `editable` attribute that lets primitive leaves be edited, dispatches a `change` event with `{ path, oldValue, newValue }`. Do NOT add key add/remove — separate concern."**

## Verification

```
$ node tests.js
35 passed, 0 failed
```

Component loads and renders the API/config/nested/array/exotic/huge sample sets,
including circular references, BigInts, Dates, Maps, Sets, RegExps, and functions.
Confirmed mobile-narrow rendering via container query.
