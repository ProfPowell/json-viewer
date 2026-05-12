# json-viewer — Design Spec

**Date:** 2026-05-12
**Status:** Draft — pending user approval
**Author:** Prof Thomas Powell (with Claude)

## Summary

Ship `<json-viewer>` as a standalone, dependency-free web component published at
`@profpowell/json-viewer`. It renders any JS value as a collapsible tree,
exposes a path/glob programmatic API, and slots cleanly into the Vanilla Breeze
(VB) and Montane ecosystems through CSS custom properties without taking a
hard dependency on either.

A working seed exists at the repo root (`vb-json-viewer.js`, 884 lines, no
deps, 35/35 helper tests passing). This spec covers the work to (1) rename and
restructure the seed into the standard ProfPowell package layout used by
`browser-window`, `code-block`, and `terminal-window`, and (2) close the top
two limitations called out in `HANDOFF.md` (search performance and Map/Set
path fidelity) before v1 ships.

## Goals

- A `<json-viewer>` custom element that works dropped into any page over
  `file://` or a static server, with no build step required for consumers.
- VB compatibility via tokens — `--json-viewer-*` as the public surface, with
  `--vb-*` honored as a fallback so the component themes automatically inside
  a VB page.
- Programmatic path/glob API for expand, collapse, search, and entry recovery
  (including correct round-trip for Map keys that aren't strings).
- Standard ProfPowell package layout: Vite build, Playwright tests, CEM
  manifest, ESLint+Prettier, `bd` (beads) issue tracking, `.d.ts` types,
  documented under `docs/`.

## Non-goals

- Editing of values or keys. Out of scope for v1 (and probably v2 — that's a
  different component).
- JSON Schema awareness / inference. Could be a sibling component
  (`<json-schema-inspector>`) later.
- Virtualization. Lazy expansion handles up to ~10k visible rows; beyond that
  is a follow-up.
- Framework wrappers (React/Vue/Lit). Web component is the wrapper.
- Visual-regression / screenshot tests.

## Architecture

Single ES module, Shadow DOM, native `<details>`/`<summary>` for every
collapsible node, lazy child rendering tracked via `WeakSet`. Same structural
approach as the seed; the renames and refactors are surface-level except
where the two HANDOFF roadmap items apply.

### Repository layout

```
json-viewer/
├── src/
│   └── json-viewer.js              # the component
├── docs/
│   ├── index.html                  # landing (adapted from vb-json-viewer.html)
│   ├── demos.html                  # exercises every attr/method/event
│   ├── api.html                    # curated from custom-elements.json
│   ├── examples/                   # standalone .html samples
│   └── styles.css
├── test/
│   ├── json-viewer.spec.js         # Playwright suite
│   ├── helpers.test.js             # node --test, ports tests.js
│   └── fixtures/
│       ├── api.json
│       ├── config.json
│       ├── nested.json
│       ├── array.json
│       ├── exotic.json             # BigInt/Date/Map/Set/RegExp/Function/circular
│       └── huge.json               # 2000 keys
├── ssr/
│   └── index.js                    # stub mirroring code-block
├── dist/                           # Vite build output (gitignored)
├── json-viewer.d.ts
├── custom-elements.json
├── custom-elements-manifest.config.mjs
├── vite.config.js
├── playwright.config.js
├── eslint.config.js
├── package.json
├── README.md
├── AGENTS.md                       # bd issue tracking
├── CLAUDE.md                       # bd + session-completion rules
├── HANDOFF.md                      # kept, updated for the rename
└── LICENSE                         # already present
```

### Scaffolding strategy

Re-scaffold from `~/src/code-block/` (the most mature sibling): copy its
configs, scripts, and `docs/` skeleton, strip code-block-specific bits, then
drop the renamed component into `src/`. The existing seed files at the repo
root are consumed by the new layout and deleted from the root in the same
commit. The HANDOFF.md memo stays as design history.

Git history of the seed is not preserved via `git mv` — the user explicitly
chose the clean re-scaffold over history continuity.

### Package metadata

```json
{
  "name": "@profpowell/json-viewer",
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
  }
}
```

No runtime dependencies. Dev dependencies match code-block's set: Vite,
Playwright, CEM analyzer, ESLint, Prettier.

Scripts cloned from code-block: `dev`, `build`, `preview`, `test`, `test:ui`,
`lint`, `lint:fix`, `format`, `format:check`, `analyze`, `prepublishOnly`.
Added: `test:node` (runs `node --test test/helpers.test.js`).

## Token contract

Public API uses `--json-viewer-*`. Internal lookup chain:

```
var(--json-viewer-foo, var(--vb-foo, light-dark(<light>, <dark>)))
```

Consumers can override at any of the three levels. `:host` declares
`color-scheme: light dark` so the hardcoded defaults render correctly in
either mode without any token wiring.

### Public tokens

| Token | Purpose |
|---|---|
| `--json-viewer-font-mono` | Monospace stack |
| `--json-viewer-surface` | Component background |
| `--json-viewer-text` | Default text |
| `--json-viewer-text-muted` | Secondary text (chips, counts) |
| `--json-viewer-border` | Separators, button borders |
| `--json-viewer-accent` | Selection, active match, focus ring |
| `--json-viewer-radius` | Border radius |
| `--json-viewer-space-1` … `-4` | Spacing scale (0.25 / 0.5 / 0.75 / 1 rem defaults) |
| `--json-viewer-key` | Object keys |
| `--json-viewer-string` | String values |
| `--json-viewer-number` | Numbers |
| `--json-viewer-boolean` | Booleans |
| `--json-viewer-null` | null / undefined |
| `--json-viewer-punct` | Brackets, commas, colons |

The component-scoped layer drops the seed's secondary `json-` namespace
(`--vb-json-key` → `--json-viewer-key`, not `--json-viewer-json-key`); the
component name carries the context.

### VB fallback names

The fallback chain uses the seed's existing VB names verbatim:
`--vb-surface`, `--vb-text`, `--vb-text-muted`, `--vb-border`, `--vb-accent`,
`--vb-radius`, `--vb-space-1`..`-4`, `--vb-font-mono`, `--vb-json-key`,
`--vb-json-string`, `--vb-json-number`, `--vb-json-boolean`, `--vb-json-null`,
`--vb-json-punct`. Anyone already styling the seed through VB tokens keeps
working without code change.

### Out of contract

Internal `--_*` aliases are implementation detail and not part of the public
surface. Layout knobs (`indent`, `mode`, `expanded`, etc.) stay as
attributes, not tokens.

## JS API surface

### Tag and class

```js
customElements.define('json-viewer', JsonViewer);
export { JsonViewer };
export default JsonViewer;
```

### Attributes

All reflected, all observed. Behavior is unchanged from the seed.

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

### Properties

- `.data` — read/write; setter triggers re-render. Accepts any JS value.

### Methods

- `.expand(matcher)` / `.collapse(matcher)` — `matcher` is a path string,
  glob (`*` one segment, `**` zero or more), RegExp, or `(path) => boolean`.
- `.expandAll()` / `.collapseAll()`.
- `.search(query, options?)` — returns a navigable iterator
  `{ next(), prev(), current, count }`. New implementation; see "Search v2".
  `options` accepts `{ regex: boolean, caseSensitive: boolean }`.
- `.copy(text?)` — clipboard write. No-arg copies the full JSON, BigInt-safe.
- `.entryAt(path)` — returns `{ key, value }` for any path, including Map/Set
  entries where the key isn't a string.

### Events

Bubble, composed. Renamed from the seed's unprefixed names to namespaced
forms matching browser-window / code-block conventions:

- `json-viewer:keyclick` — `detail: { path, key, value }`
- `json-viewer:valueclick` — `detail: { path, value, type }`

### Path grammar

- Object property: `foo.bar`
- Array index: `users[0]`
- Map/Set entry by index: `myMap@0`, `mySet@2` (new in v1)
- Glob: `*` matches one segment, `**` matches zero or more.

## Search v2 (HANDOFF item 1)

The seed expands the entire tree and walks DOM text nodes via `TreeWalker`,
wrapping hits in `<mark>`. This doesn't scale past ~100k nodes and changes
the visible UI just to query it.

### New approach

1. During the initial render and each lazy expansion, append records to a
   flat array: `{ path, keyText, valueText, kind }`.
2. `.search(query, options)` filters the array — case-insensitive substring
   by default, RegExp when `options.regex` is true.
3. For each match: expand ancestors on demand (no `expandAll`), scroll the
   match into view, swap in `<mark>` only on the currently-visible match.
4. The returned iterator exposes `.next()`, `.prev()`, `.current` (path of
   the currently focused match), and `.count` (total matches).

### Trade-offs

- Memory: one record per node, ~80 bytes/record measured. A 100k-node tree
  consumes ~8 MB — acceptable.
- Records for lazy subtrees are appended on first expansion, not at render
  time. A search before any expansion only sees the eager-rendered prefix;
  the iterator transparently extends as expansion happens. The first
  `.search()` call that misses cached records triggers a one-shot pass over
  unexpanded data to build records without rendering DOM.

## Map / Set path fidelity (HANDOFF item 2)

The seed stringifies Map keys into the path, which silently corrupts
round-trip access for any key that isn't a primitive. The new approach uses
syntactic markers plus a WeakMap-backed registry.

### Path syntax

- `myMap@<i>` — i-th entry of a Map (zero-indexed by insertion order).
- `mySet@<i>` — i-th element of a Set.
- Objects and arrays are unchanged: `users[0].name` still works exactly.

### Storage

- Each `<details>` representing a Map/Set entry carries `data-entry-index="i"`.
- An internal `WeakMap<HTMLElement, { key, value }>` maps element →
  original Map key + value, preserving reference identity.

### Recovery

`.entryAt(path)` walks the path, resolves Map/Set markers through the
WeakMap, and returns `{ key, value }`. For object/array paths it returns
`{ key: lastSegment, value }` for API symmetry.

### Effects on other API

- `.expand('myMap@*')` works as expected (glob over entries).
- `.search()` records for Map entries include the stringified key for display
  text matching, but the path stored in the record uses the `@<i>` form so
  `.entryAt(record.path)` round-trips correctly.

## Testing strategy

### Node-only smoke tests — `test/helpers.test.js`

- Switched to `node --test` (built-in, no framework dep). Run via
  `npm run test:node`. Runs in <1s, gates every commit.
- Ports the 35 existing helper assertions from `tests.js`.
- Adds: `.entryAt()` resolution, Map/Set `@<i>` path parsing, source-data
  record builder, search filter logic.

### Playwright suite — `test/json-viewer.spec.js`

Modeled on `~/src/code-block/test/code-block.spec.js`. One spec file, grouped
sections:

1. **Rendering** — fixture-driven mount tests; types/sizes chips appear when
   their attributes are set. Includes the exotic fixture
   (BigInt/Date/Map/Set/RegExp/Function/circular).
2. **Lazy expansion** — only the configured initial depth renders eagerly;
   expanding renders children; second toggle does not double-render.
3. **Path API** — string, glob, RegExp, function matchers; symmetric
   `.collapse`; `.expandAll`/`.collapseAll`.
4. **Search v2** — match count, `.next()`/`.prev()` navigation, ancestor
   auto-expand on focus, `<mark>` confined to visible match, case-insensitive
   and RegExp modes.
5. **Map/Set fidelity** — render a Map keyed by objects, call
   `.entryAt('myMap@0')`, assert `{ key, value }` are reference-equal to
   originals.
6. **Events** — `json-viewer:keyclick` and `json-viewer:valueclick` fire with
   correct `detail`, bubble through the host, are `composed: true`.
7. **Copy** — `.copy()` writes JSON (BigInt-safe); per-node copy buttons
   copy path, value, and `path = value` snippet.
8. **Token contract** — set `--json-viewer-accent` on the host, assert
   computed style on a hit `<mark>` reflects it. Set `--vb-accent` instead,
   assert fallback chain. Unset both, assert hardcoded default.
9. **Mobile container query** — viewport 360px wide; toolbar labels hide,
   tap targets ≥44px.
10. **Attribute reactivity** — change `expanded`, `mode`, `show-types` at
    runtime; tree responds.

### Fixtures — `test/fixtures/`

Extracted from `vb-json-viewer.html`'s embedded samples:
`api.json`, `config.json`, `nested.json`, `array.json`, `exotic.json`,
`huge.json` (2000 keys).

### Out of scope for v1 tests

- Visual regression / screenshot diffs (maintenance trap).
- Performance benchmarks (the 100k-node target is asserted indirectly by
  "no `expandAll` during search"; a real benchmark is a follow-up).

## Documentation

Three pages under `docs/`, modeled on code-block's:

- `index.html` — landing, runnable hero example, link to demos and API.
  Adapted from the seed's `vb-json-viewer.html`.
- `demos.html` — every attribute, method, and event exercised in isolation.
  Adapted from `demo.html`.
- `api.html` — curated from the generated `custom-elements.json`.

`README.md` covers install, quick start, attributes table, method table,
events table, token contract, and a link to HANDOFF.md for design history.

## Project conventions

- **Issue tracking:** `bd` (beads). `AGENTS.md` and `CLAUDE.md` adopted from
  the browser-window pattern. All work tracked via `bd`, not TodoWrite or
  markdown TODO lists.
- **Session completion:** `git push` is mandatory before declaring work
  done, per the established AGENTS.md workflow.

## Risks and follow-ups

- **Search-record build for unexpanded subtrees.** The "search before
  expansion" case triggers a one-shot pass over the source value tree. For
  truly enormous data (`huge.json` × 100), that pass is O(n) and could be
  perceptible. Mitigation: cache, and an explicit "indexing…" UI hint if it
  takes >100ms. Defer to follow-up.
- **Virtualization.** Still not in v1. Beyond ~10k visible rows the DOM gets
  heavy. Tracked as a v2 follow-up issue in `bd` once the repo is up.
- **Editing.** Explicitly out of scope. If requested later, a sibling
  component is preferred over an `editable` attribute.

## Open questions

None at this point — clarifying questions covered token strategy, v1 scope,
scaffolding approach, npm scope, beads adoption, and Node-test retention.
