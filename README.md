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
