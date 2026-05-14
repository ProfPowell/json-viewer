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


const TPL = document.createElement('template');
TPL.innerHTML = `
  <style>
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

    .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: var(--_s1);
      padding: var(--_s2);
      border-bottom: 1px solid var(--_border);
      background: var(--_surface);
      position: sticky;
      top: 0;
      z-index: 2;
    }
    .toolbar button {
      font: inherit;
      font-size: 0.8125rem;
      min-height: 2.25rem;
      min-width: 2.25rem;
      padding: 0 var(--_s2);
      color: var(--_text);
      background: transparent;
      border: 1px solid var(--_border);
      border-radius: calc(var(--_radius) * 0.6);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: var(--_s1);
    }
    .toolbar button:hover, .toolbar button:focus-visible {
      border-color: var(--_accent);
      outline: none;
    }
    .toolbar button[aria-pressed="true"] {
      background: var(--_accent);
      color: var(--_surface);
      border-color: var(--_accent);
    }
    .toolbar .label { display: inline; }
    .toolbar .icon { font-family: var(--_font); font-weight: 700; }

    .search {
      padding: var(--_s2);
      border-bottom: 1px solid var(--_border);
      display: none;
      gap: var(--_s1);
      align-items: center;
    }
    .search[data-open="true"] { display: flex; }
    .search input {
      flex: 1;
      font: inherit;
      min-height: 2.25rem;
      padding: 0 var(--_s2);
      background: var(--_surface);
      color: var(--_text);
      border: 1px solid var(--_border);
      border-radius: calc(var(--_radius) * 0.6);
    }
    .search input:focus-visible { outline: 2px solid var(--_accent); outline-offset: 1px; }
    .search .count { font-size: 0.75rem; color: var(--_muted); min-width: 4ch; text-align: center; }

    .path-bar {
      padding: var(--_s1) var(--_s2);
      border-bottom: 1px solid var(--_border);
      font-size: 0.75rem;
      color: var(--_muted);
      display: none;
      align-items: center;
      gap: var(--_s2);
    }
    .path-bar[data-open="true"] { display: flex; }
    .path-bar code {
      color: var(--_text);
      font-family: var(--_font);
      word-break: break-all;
      flex: 1;
    }

    .body {
      padding: var(--_s2);
      overflow: auto;
      max-height: var(--max-height, none);
    }
    .body[data-mode="raw"] pre {
      margin: 0;
      white-space: pre;
      tab-size: var(--indent, 2);
    }

    ul, li { list-style: none; margin: 0; padding: 0; }
    li { padding-left: 0; }

    details {
      padding-left: 0;
    }
    details > ul {
      padding-left: var(--_indent);
      border-left: 1px dashed transparent;
    }
    details[open] > ul { border-left-color: var(--_border); }

    summary {
      cursor: pointer;
      list-style: none;
      display: flex;
      align-items: baseline;
      gap: 0.25ch;
      padding: 1px 0;
      min-height: 1.55em;
      user-select: text;
    }
    summary::-webkit-details-marker { display: none; }
    summary::marker { display: none; }
    summary::before {
      content: "▸";
      color: var(--_muted);
      font-size: 0.75em;
      width: 1ch;
      display: inline-block;
      transition: transform 120ms ease;
    }
    details[open] > summary::before { transform: rotate(90deg); transform-origin: 30% 50%; }

    .key {
      color: var(--_key);
      cursor: pointer;
      padding: 0 1px;
      border-radius: 2px;
    }
    .key:hover, .key:focus-visible { background: color-mix(in oklch, var(--_accent) 18%, transparent); outline: none; }
    .punct { color: var(--_punct); }
    .colon { color: var(--_punct); margin-right: 0.5ch; }
    .v-string { color: var(--_string); word-break: break-word; }
    .v-number { color: var(--_number); }
    .v-boolean { color: var(--_boolean); }
    .v-null { color: var(--_null); font-style: italic; }
    .v-undefined { color: var(--_muted); font-style: italic; }
    .v-bigint { color: var(--_number); }
    .v-symbol { color: var(--_boolean); font-style: italic; }
    .v-function { color: var(--_muted); font-style: italic; }
    .v-date { color: var(--_string); font-style: italic; }
    .v-regexp { color: var(--_string); }
    .v-ref { color: var(--_muted); font-style: italic; }

    .size, .type {
      color: var(--_muted);
      font-size: 0.75em;
      margin-left: 0.5ch;
    }
    .type {
      padding: 0 0.5ch;
      border: 1px solid var(--_border);
      border-radius: 999px;
      font-variant: tabular-nums;
    }
    .index { color: var(--_muted); margin-right: 0.5ch; user-select: none; }

    .copy {
      opacity: 0;
      margin-left: 0.5ch;
      padding: 0 0.4ch;
      font: inherit;
      font-size: 0.75em;
      background: transparent;
      color: var(--_muted);
      border: 1px solid var(--_border);
      border-radius: 3px;
      cursor: pointer;
    }
    summary:hover .copy, summary:focus-within .copy { opacity: 1; }
    @media (hover: none) { .copy { opacity: 1; } }
    .copy:hover { color: var(--_accent); border-color: var(--_accent); }

    .truncated {
      color: var(--_muted);
      font-size: 0.75em;
      cursor: pointer;
      margin-left: 0.5ch;
      text-decoration: underline dotted;
    }

    a.v-url {
      color: var(--_string);
      text-decoration: underline;
      text-underline-offset: 2px;
    }

    mark {
      background: color-mix(in oklch, var(--_accent) 30%, transparent);
      color: inherit;
      border-radius: 2px;
      padding: 0 1px;
    }
    .match-active mark { background: var(--_accent); color: var(--_surface); }

    .empty {
      padding: var(--_s4);
      color: var(--_muted);
      text-align: center;
      font-style: italic;
    }

    /* Mobile: collapse toolbar labels to icons */
    @container (max-width: 480px) {
      .toolbar .label { display: none; }
      .toolbar button { padding: 0; justify-content: center; }
    }
    @media (prefers-reduced-motion: reduce) {
      details > summary::before { transition: none; }
    }
  </style>
  <div class="toolbar" part="toolbar" role="toolbar" aria-label="JSON viewer controls">
    <button data-act="expand"      title="Expand all"   aria-label="Expand all"><span class="icon">+</span><span class="label">Expand</span></button>
    <button data-act="collapse"    title="Collapse all" aria-label="Collapse all"><span class="icon">−</span><span class="label">Collapse</span></button>
    <button data-act="search-toggle" title="Search (/)" aria-label="Search" aria-pressed="false"><span class="icon">⌕</span><span class="label">Search</span></button>
    <button data-act="mode-toggle" title="Toggle raw / tree" aria-label="Toggle raw mode" aria-pressed="false"><span class="icon">{ }</span><span class="label">Raw</span></button>
    <button data-act="copy"        title="Copy JSON to clipboard" aria-label="Copy JSON"><span class="icon">⧉</span><span class="label">Copy</span></button>
  </div>
  <div class="search" part="search" role="search">
    <input type="search" placeholder="Search keys and values…" aria-label="Search" />
    <span class="count" aria-live="polite">0/0</span>
    <button data-act="search-prev" aria-label="Previous match" title="Previous (⇧⏎)">↑</button>
    <button data-act="search-next" aria-label="Next match" title="Next (⏎)">↓</button>
    <button data-act="search-close" aria-label="Close search">✕</button>
  </div>
  <div class="path-bar" part="path-bar" aria-live="polite">
    <span>path</span><code part="path"></code>
    <button data-act="copy-path" aria-label="Copy path">⧉</button>
  </div>
  <div class="body" part="body" data-mode="tree" role="tree"></div>
`;

/* ----------------------- safe stringify ---------------------------- */
// JSON.stringify with BigInt support and a fallback that won't throw.
const safeStringify = (v, indent = 2) => {
  try {
    return JSON.stringify(v, (_k, val) => (typeof val === 'bigint' ? `${val}n` : val), indent);
  } catch {
    try { return String(v); } catch { return ''; }
  }
};

/* ----------------------- value classification ---------------------- */
const kindOf = (v) => {
  if (v === null) return 'null';
  const t = typeof v;
  if (t !== 'object') return t; // string, number, boolean, undefined, bigint, symbol, function
  if (Array.isArray(v)) return 'array';
  if (v instanceof Date) return 'date';
  if (v instanceof RegExp) return 'regexp';
  if (v instanceof Map) return 'map';
  if (v instanceof Set) return 'set';
  return 'object';
};

const isContainer = (k) => k === 'object' || k === 'array' || k === 'map' || k === 'set';

/* ----------------------- path matching ----------------------------- */
// Path segments: ['users', 0, { kind: 'entry', index: 2 }, 'name']
//   -> 'users[0]@2.name'
const pathToString = (segs) => {
  let s = '';
  for (const seg of segs) {
    if (typeof seg === 'object' && seg && seg.kind === 'entry') s += `@${seg.index}`;
    else if (typeof seg === 'number') s += `[${seg}]`;
    else if (/^[A-Za-z_$][\w$]*$/.test(seg)) s += s ? `.${seg}` : seg;
    else s += `[${JSON.stringify(seg)}]`;
  }
  return s || '$';
};

const parsePath = (s) => {
  if (!s || s === '$') return [];
  const segs = [];
  const re = /([A-Za-z_$][\w$]*)|\[(\d+)\]|\["([^"]*)"\]|@(\d+)/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    if (m[4] !== undefined) segs.push({ kind: 'entry', index: Number(m[4]) });
    else if (m[2] !== undefined) segs.push(Number(m[2]));
    else if (m[3] !== undefined) segs.push(m[3]);
    else segs.push(m[1]);
  }
  return segs;
};

// Glob -> RegExp. ** matches zero or more segments (including none),
// * matches a single segment (no dots or brackets).
// After regex-escaping (which adds \\ before . and other specials),
// we rewrite the `**` patterns using placeholder characters so we can
// process them without interference from later replacements.
const globToRe = (glob) => {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')   // escape regex specials (dot becomes \.)
    .replace(/\*\*\\\./g, '\u0001')         // `**.` (escaped form: **\.)
    .replace(/\\\.\*\*/g, '\u0002')         // `.**` (escaped form: \.**)
    .replace(/\*\*/g, '\u0003')             // standalone `**`
    .replace(/\*/g, '[^.\\[\\]]*')          // single-segment wildcard
    .replace(/\u0001/g, '(?:.*\\.)?')       // **. → optional ".*\."
    .replace(/\u0002/g, '(?:\\..*)?')       // .** → optional "\..*"
    .replace(/\u0003/g, '.*');              // **  → ".*"
  return new RegExp(`^${escaped}$`);
};

const compileMatcher = (matcher) => {
  if (matcher instanceof RegExp) return (p) => matcher.test(p);
  if (typeof matcher === 'function') return matcher;
  if (typeof matcher === 'string') {
    if (!matcher.includes('*') && !matcher.includes('?')) {
      return (p) => p === matcher || p.endsWith('.' + matcher) || p.endsWith(']' + matcher);
    }
    const re = globToRe(matcher);
    return (p) => re.test(p);
  }
  return () => false;
};

/* ----------------------- source-data record builder ---------------- */
// Walks the JS value, returns flat records for search.
const buildRecords = (value, basePath = []) => {
  const out = [];
  const visit = (v, segs) => {
    const path = pathToString(segs);
    const k = kindOf(v);
    const lastSeg = segs[segs.length - 1];
    const keyText =
      lastSeg && typeof lastSeg === 'object' && lastSeg.kind === 'entry' ? `@${lastSeg.index}` :
      typeof lastSeg === 'number' ? `[${lastSeg}]` :
      lastSeg === undefined ? '' : String(lastSeg);
    if (k === 'object') {
      out.push({ path, keyText, valueText: '', kind: k });
      for (const key of Object.keys(v)) visit(v[key], segs.concat(key));
    } else if (k === 'array') {
      out.push({ path, keyText, valueText: '', kind: k });
      for (let i = 0; i < v.length; i++) visit(v[i], segs.concat(i));
    } else if (k === 'map') {
      out.push({ path, keyText, valueText: '', kind: k });
      let i = 0;
      for (const [, val] of v) {
        visit(val, segs.concat({ kind: 'entry', index: i }));
        i++;
      }
    } else if (k === 'set') {
      out.push({ path, keyText, valueText: '', kind: k });
      let i = 0;
      for (const val of v) {
        visit(val, segs.concat({ kind: 'entry', index: i }));
        i++;
      }
    } else {
      out.push({ path, keyText, valueText: String(v ?? ''), kind: k });
    }
  };
  visit(value, basePath);
  return out;
};

const filterRecords = (records, query, { regex = false, caseSensitive = false } = {}) => {
  if (!query) return [];
  const re = regex ? new RegExp(query, caseSensitive ? '' : 'i') : null;
  const match = re
    ? (s) => re.test(s)
    : (s) => caseSensitive ? s.includes(query) : s.toLowerCase().includes(query.toLowerCase());
  return records.filter(r => match(r.keyText) || match(r.valueText));
};

/* ----------------------- rendering --------------------------------- */
const MAX_STRING = 200;

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const cssEscape = (s) => (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape(s) : s.replace(/([\]"\\[:.()])/g, '\\$1');

const renderPrimitive = (v, kind) => {
  switch (kind) {
    case 'string': {
      const s = String(v);
      const isUrl = /^https?:\/\//.test(s);
      if (isUrl) return `<a class="v-string v-url" href="${escapeHtml(s)}" target="_blank" rel="noopener noreferrer">"${escapeHtml(s)}"</a>`;
      if (s.length > MAX_STRING) {
        const short = escapeHtml(s.slice(0, MAX_STRING));
        return `<span class="v-string" data-full="${escapeHtml(s)}">"${short}…<button class="truncated" data-act="expand-string">show ${s.length - MAX_STRING} more</button>"</span>`;
      }
      return `<span class="v-string">"${escapeHtml(s)}"</span>`;
    }
    case 'number':    return `<span class="v-number">${Number.isFinite(v) ? v : String(v)}</span>`;
    case 'boolean':   return `<span class="v-boolean">${v}</span>`;
    case 'null':      return `<span class="v-null">null</span>`;
    case 'undefined': return `<span class="v-undefined">undefined</span>`;
    case 'bigint':    return `<span class="v-bigint">${v}n</span>`;
    case 'symbol':    return `<span class="v-symbol">${escapeHtml(String(v))}</span>`;
    case 'function':  return `<span class="v-function">ƒ ${escapeHtml(v.name || 'anonymous')}()</span>`;
    case 'date':      return `<span class="v-date">${escapeHtml(v.toISOString())}</span>`;
    case 'regexp':    return `<span class="v-regexp">${escapeHtml(String(v))}</span>`;
    default:          return `<span class="v-undefined">${escapeHtml(String(v))}</span>`;
  }
};

const containerPreview = (v, kind) => {
  if (kind === 'array') return `<span class="punct">[</span><span class="size">${v.length}</span><span class="punct">]</span>`;
  if (kind === 'object') {
    const n = Object.keys(v).length;
    return `<span class="punct">{</span><span class="size">${n}</span><span class="punct">}</span>`;
  }
  if (kind === 'map') return `<span class="punct">Map(</span><span class="size">${v.size}</span><span class="punct">)</span>`;
  if (kind === 'set') return `<span class="punct">Set(</span><span class="size">${v.size}</span><span class="punct">)</span>`;
  return '';
};

/* ============================================================
 * Element
 * ============================================================ */
class JsonViewer extends HTMLElement {
  static get observedAttributes() {
    return ['data', 'src', 'expanded', 'mode', 'show-types', 'show-sizes', 'show-indices', 'indent'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).appendChild(TPL.content.cloneNode(true));
    this._data = undefined;
    this._refs = {
      body:     this.shadowRoot.querySelector('.body'),
      toolbar:  this.shadowRoot.querySelector('.toolbar'),
      search:   this.shadowRoot.querySelector('.search'),
      searchIn: this.shadowRoot.querySelector('.search input'),
      searchCt: this.shadowRoot.querySelector('.search .count'),
      pathBar:  this.shadowRoot.querySelector('.path-bar'),
      pathOut:  this.shadowRoot.querySelector('.path-bar code'),
    };
    this._renderedSet = new WeakSet(); // <details> elements that have rendered children
    this._entryMap = new WeakMap();    // <details>/<li> -> { key, value } for Map/Set entries
    this._matches = [];                // array of { path } for current search
    this._records = [];                // flat array of { path, keyText, valueText, kind }
    this._matchIdx = -1;
    this._seen = null;                 // circular ref detection during render
    this._bindEvents();
  }

  /* ---------- public properties ---------- */
  get data() { return this._data; }
  set data(v) {
    this._data = v;
    this.removeAttribute('data'); // property wins over attribute
    this._render();
  }

  /* ---------- attribute reactivity ---------- */
  connectedCallback() {
    if (this.hasAttribute('src')) this._loadSrc(this.getAttribute('src'));
    else if (this._data === undefined && this.hasAttribute('data')) {
      this._parseFromAttr(this.getAttribute('data'));
    } else if (this._data === undefined) {
      // try textContent as JSON literal (lets people embed JSON between tags)
      const txt = this.textContent.trim();
      if (txt) this._parseFromAttr(txt);
    }
    this._render();
  }
  attributeChangedCallback(name, _o, v) {
    if (name === 'data') this._parseFromAttr(v);
    else if (name === 'src') this._loadSrc(v);
    else this._render();
  }

  _parseFromAttr(v) {
    if (!v) { this._data = undefined; return; }
    try { this._data = JSON.parse(v); }
    catch { this._data = v; /* render as a string */ }
  }

  async _loadSrc(url) {
    if (!url) return;
    try {
      const r = await fetch(url);
      this._data = await r.json();
      this._render();
    } catch (e) {
      this._data = { error: e.message };
      this._render();
    }
  }

  /* ---------- programmatic API ---------- */
  expandAll()   { this._walkDetails((el) => { this._ensureRendered(el); el.open = true; }); }
  collapseAll() { this._walkDetails((el) => { el.open = false; }); }
  expand(matcher)   { this._matchPaths(matcher, (el) => { this._ensureRendered(el); el.open = true; }); }
  collapse(matcher) { this._matchPaths(matcher, (el) => { el.open = false; }); }

  // Returns { key, value } for any path. Useful for Map/Set entries where the
  // key isn't a string and round-tripping through `_resolvePath` would lose it.
  entryAt(path) {
    if (!path || path === '$') return { key: null, value: this._data };
    const tokens = parsePath(path);
    let cur = this._data;
    let lastKey = null;
    for (const t of tokens) {
      if (cur == null) return { key: null, value: undefined };
      if (typeof t === 'object' && t && t.kind === 'entry') {
        if (cur instanceof Map) {
          const entries = [...cur.entries()];
          const entry = entries[t.index];
          if (!entry) return { key: null, value: undefined };
          lastKey = entry[0];
          cur = entry[1];
        } else if (cur instanceof Set) {
          const arr = [...cur];
          lastKey = t.index;
          cur = arr[t.index];
        } else {
          return { key: null, value: undefined };
        }
      } else {
        lastKey = t;
        cur = cur[t];
      }
    }
    return { key: lastKey, value: cur };
  }

  async copy(text) {
    const v = text ?? safeStringify(this._data, this._indent());
    try { await navigator.clipboard.writeText(v); }
    catch { /* clipboard may be denied; fail silently */ }
  }

  // Iterable / iterator for search hits.
  search(query, options = {}) {
    this._runSearch(query, options);
    const self = this;
    return {
      next: () => {
        if (!self._matches.length) return { value: undefined, done: true };
        self._gotoMatch((self._matchIdx + 1) % self._matches.length, query, options);
        return { value: self._matches[self._matchIdx], done: false };
      },
      prev: () => {
        if (!self._matches.length) return { value: undefined, done: true };
        self._gotoMatch((self._matchIdx - 1 + self._matches.length) % self._matches.length, query, options);
        return { value: self._matches[self._matchIdx], done: false };
      },
      get current() { return self._matches[self._matchIdx]; },
      get count() { return self._matches.length; },
      [Symbol.iterator]() { return this; }
    };
  }

  /* ---------- internals ---------- */
  _indent() { return Math.max(0, parseInt(this.getAttribute('indent') ?? '2', 10) || 2); }
  _initialDepth() {
    const a = this.getAttribute('expanded');
    if (a === null) return 1;
    if (a === 'true' || a === '') return Infinity;
    if (a === 'false') return 0;
    const n = parseInt(a, 10);
    return Number.isFinite(n) ? n : 1;
  }
  _showTypes()   { return this.hasAttribute('show-types'); }
  _showSizes()   { return this.hasAttribute('show-sizes'); }
  _showIndices() { return this.hasAttribute('show-indices'); }

  _walkDetails(fn) {
    const all = this._refs.body.querySelectorAll('details');
    all.forEach(fn);
  }

  _matchPaths(matcher, fn) {
    const m = compileMatcher(matcher);
    const all = this._refs.body.querySelectorAll('details[data-path]');
    all.forEach((el) => { if (m(el.dataset.path)) fn(el); });
  }

  _render() {
    this.style.setProperty('--indent', String(this._indent()));
    const body = this._refs.body;
    const mode = this.getAttribute('mode') === 'raw' ? 'raw' : 'tree';
    body.dataset.mode = mode;
    body.innerHTML = '';
    this._renderedSet = new WeakSet();
    this._entryMap = new WeakMap();
    this._matches = [];
    this._matchIdx = -1;
    this._records = (this._data === undefined) ? [] : buildRecords(this._data);
    this._refs.pathBar.dataset.open = 'false';

    if (this._data === undefined) {
      body.innerHTML = `<div class="empty">No data. Set <code>.data</code> or attributes <code>data</code> / <code>src</code>.</div>`;
      return;
    }

    if (mode === 'raw') {
      const txt = safeStringify(this._data, this._indent());
      body.innerHTML = `<pre>${escapeHtml(txt || 'undefined')}</pre>`;
      return;
    }

    this._seen = new WeakSet();
    const initialDepth = this._initialDepth();
    const root = this._renderNode(this._data, [], 0, initialDepth, null);
    body.appendChild(root);
    this._seen = null;
  }

  // Returns an HTMLElement for one node (li or wrapper).
  // For containers, expands children up to `initialDepth`; deeper nodes
  // are rendered on demand when the <details> opens.
  _renderNode(value, path, depth, initialDepth, keyForLabel) {
    const kind = kindOf(value);

    if (!isContainer(kind)) {
      return this._renderLeaf(value, kind, path, keyForLabel);
    }

    // circular check for plain objects/arrays
    if ((kind === 'object' || kind === 'array') && this._seen.has(value)) {
      const li = document.createElement('li');
      li.innerHTML = `${this._keyLabel(keyForLabel, kind)}<span class="v-ref">[circular]</span>`;
      return li;
    }
    if (kind === 'object' || kind === 'array') this._seen.add(value);

    const det = document.createElement('details');
    det.dataset.path = pathToString(path);
    det.dataset.kind = kind;
    det.setAttribute('role', 'treeitem');

    const sum = document.createElement('summary');
    sum.innerHTML = `${this._keyLabel(keyForLabel, kind)}${containerPreview(value, kind)}${this._typeChip(kind)}<button class="copy" data-act="copy-subtree" aria-label="Copy this subtree" tabindex="-1">copy</button>`;
    det.appendChild(sum);

    const ul = document.createElement('ul');
    ul.setAttribute('role', 'group');
    det.appendChild(ul);

    const shouldOpen = depth < initialDepth;
    det.open = shouldOpen;

    if (shouldOpen) {
      this._renderChildren(value, kind, path, depth, initialDepth, ul);
      this._renderedSet.add(det);
    } else {
      // Defer: render children the first time the <details> opens. The
      // `once: true` option auto-removes the listener after it fires, so
      // N lazy nodes don't leave N permanent listeners on the tree. The
      // _renderedSet guard remains as a safety net against re-entry.
      det.addEventListener('toggle', () => {
        if (det.open && !this._renderedSet.has(det)) {
          this._renderChildren(value, kind, path, depth, initialDepth, ul);
          this._renderedSet.add(det);
        }
      }, { once: true });
    }

    // wrap top-level details into a li-equivalent so callers can append uniformly
    if (depth === 0) {
      const wrap = document.createElement('div');
      wrap.appendChild(det);
      return wrap;
    }
    const li = document.createElement('li');
    li.appendChild(det);
    return li;
  }

  _renderChildren(value, kind, path, depth, initialDepth, ul) {
    if (kind === 'array') {
      for (let i = 0; i < value.length; i++) {
        ul.appendChild(this._renderNode(value[i], path.concat(i), depth + 1, initialDepth, i));
      }
    } else if (kind === 'object') {
      for (const k of Object.keys(value)) {
        ul.appendChild(this._renderNode(value[k], path.concat(k), depth + 1, initialDepth, k));
      }
    } else if (kind === 'map') {
      let i = 0;
      for (const [k, v] of value) {
        const seg = { kind: 'entry', index: i };
        const child = this._renderNode(v, path.concat(seg), depth + 1, initialDepth, String(k));
        // Register the real key on the DOM element for entryAt() recovery
        const det = child.querySelector('details') || child.querySelector('li') || child;
        if (det) {
          det.dataset.entryIndex = String(i);
          this._entryMap.set(det, { key: k, value: v });
        }
        ul.appendChild(child);
        i++;
      }
    } else if (kind === 'set') {
      let i = 0;
      for (const v of value) {
        const seg = { kind: 'entry', index: i };
        const child = this._renderNode(v, path.concat(seg), depth + 1, initialDepth, null);
        const det = child.querySelector('details') || child.querySelector('li') || child;
        if (det) {
          det.dataset.entryIndex = String(i);
          this._entryMap.set(det, { key: undefined, value: v });
        }
        ul.appendChild(child);
        i++;
      }
    }
  }

  _renderLeaf(value, kind, path, keyForLabel) {
    const li = document.createElement('li');
    li.dataset.path = pathToString(path);
    li.setAttribute('role', 'treeitem');
    li.innerHTML = `${this._keyLabel(keyForLabel, kind)}${renderPrimitive(value, kind)}${this._typeChip(kind)}<button class="copy" data-act="copy-leaf" aria-label="Copy value" tabindex="-1">copy</button>`;
    return li;
  }

  _keyLabel(keyForLabel, _kind) {
    if (keyForLabel === null || keyForLabel === undefined) return '';
    const isIndex = typeof keyForLabel === 'number';
    if (isIndex) {
      if (!this._showIndices()) return '';
      return `<span class="index">${keyForLabel}</span><span class="colon">:</span>`;
    }
    return `<button class="key" data-act="select-key">"${escapeHtml(keyForLabel)}"</button><span class="colon">:</span>`;
  }

  _typeChip(kind) {
    if (!this._showTypes()) return '';
    return `<span class="type">${kind}</span>`;
  }

  _ensureRendered(detailsEl) {
    if (this._renderedSet.has(detailsEl)) return;
    // Force a toggle-driven render by opening, but children are rendered
    // by the toggle handler. As a shortcut, just open it: the handler will
    // populate the ul. (Idempotent because we use _renderedSet.)
    const wasOpen = detailsEl.open;
    detailsEl.open = true;
    if (!this._renderedSet.has(detailsEl)) {
      // toggle event is async in some envs; trigger sync by walking ancestors
      detailsEl.dispatchEvent(new Event('toggle'));
    }
    if (!wasOpen) {
      // leave it open since caller is typically expand()
    }
  }

  /* ---------- search ---------- */
  _runSearch(query, options = {}) {
    this._clearMarks();
    this._matches = [];
    this._matchIdx = -1;
    this._lastQuery = query;
    this._lastOptions = options;
    this._refs.searchCt.textContent = '0/0';
    if (!query) return;

    const hits = filterRecords(this._records, query, options);
    this._matches = hits.map(r => ({ path: r.path }));
    this._refs.searchCt.textContent = `${this._matches.length ? 1 : 0}/${this._matches.length}`;
    if (this._matches.length) this._gotoMatch(0, query, options);
  }

  // Advance through existing matches without re-running the search. Re-runs
  // the search when the input query has changed since the last run; otherwise
  // just steps the current match index. direction: +1 next, -1 prev.
  _stepMatch(direction) {
    const query = this._refs.searchIn.value;
    const optsChanged = query !== this._lastQuery;
    if (optsChanged || !this._matches.length) {
      this._runSearch(query, this._lastOptions || {});
      // _runSearch already focused match 0; for "prev" from a cold start the
      // user expects to land on the LAST match, so wrap if direction === -1.
      if (direction === -1 && this._matches.length > 1) {
        this._gotoMatch(this._matches.length - 1, query, this._lastOptions || {});
      }
      return;
    }
    const n = this._matches.length;
    const next = (this._matchIdx + direction + n) % n;
    this._gotoMatch(next, query, this._lastOptions || {});
  }

  _gotoMatch(i, query, options = {}) {
    if (!this._matches.length) return;
    this._clearMarks();
    this._matchIdx = i;
    const m = this._matches[i];

    // Expand ancestors so the path is visible
    this._expandAncestors(m.path);

    // Locate the DOM node carrying this path and highlight the substring within it
    const carrier = this._refs.body.querySelector(`[data-path="${cssEscape(m.path)}"]`);
    if (carrier && query) this._highlightInNode(carrier, query, options);
    if (carrier) carrier.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

    this._refs.searchCt.textContent = `${this._matchIdx + 1}/${this._matches.length}`;
  }

  _expandAncestors(path) {
    if (!path || path === '$') return;
    const segs = parsePath(path);
    for (let i = 1; i <= segs.length; i++) {
      const partial = pathToString(segs.slice(0, i));
      const det = this._refs.body.querySelector(`details[data-path="${cssEscape(partial)}"]`);
      if (det) {
        this._ensureRendered(det);
        det.open = true;
      }
    }
  }

  _highlightInNode(node, query, { regex = false, caseSensitive = false } = {}) {
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => {
        const p = n.parentElement;
        if (!p || p.classList.contains('size') || p.classList.contains('type') || p.classList.contains('copy') || p.classList.contains('truncated')) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const escapedQuery = query.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    const re = regex
      ? new RegExp(query, caseSensitive ? 'g' : 'gi')
      : new RegExp(escapedQuery, caseSensitive ? 'g' : 'gi');
    let textNode;
    while ((textNode = walker.nextNode())) {
      const text = textNode.nodeValue;
      re.lastIndex = 0;
      if (!re.test(text)) { continue; }
      re.lastIndex = 0;
      const frag = document.createDocumentFragment();
      let last = 0;
      let mm;
      while ((mm = re.exec(text)) !== null) {
        if (mm.index > last) frag.appendChild(document.createTextNode(text.slice(last, mm.index)));
        const mark = document.createElement('mark');
        mark.className = 'match-active';
        mark.textContent = mm[0];
        frag.appendChild(mark);
        last = mm.index + mm[0].length;
        if (mm.index === re.lastIndex) re.lastIndex++;  // safety for zero-width
      }
      if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
      textNode.parentNode.replaceChild(frag, textNode);
    }
  }

  _clearMarks() {
    const marks = this._refs.body.querySelectorAll('mark');
    marks.forEach((mk) => {
      const parent = mk.parentNode;
      parent.replaceChild(document.createTextNode(mk.textContent), mk);
      parent.normalize();
    });
  }

  /* ---------- events ---------- */
  _bindEvents() {
    const root = this.shadowRoot;

    root.addEventListener('click', (e) => {
      const t = e.target.closest('[data-act]');
      if (!t) return;
      const act = t.dataset.act;

      if (act === 'expand')         { this.expandAll(); }
      else if (act === 'collapse')  { this.collapseAll(); }
      else if (act === 'mode-toggle') {
        const next = (this.getAttribute('mode') === 'raw') ? 'tree' : 'raw';
        t.setAttribute('aria-pressed', String(next === 'raw'));
        this.setAttribute('mode', next);
      }
      else if (act === 'copy')      { this.copy(); }
      else if (act === 'search-toggle') {
        const open = this._refs.search.dataset.open !== 'true';
        this._refs.search.dataset.open = String(open);
        t.setAttribute('aria-pressed', String(open));
        if (open) requestAnimationFrame(() => this._refs.searchIn.focus());
        else { this._refs.searchIn.value = ''; this._clearMarks(); this._matches = []; this._refs.searchCt.textContent = '0/0'; }
      }
      else if (act === 'search-prev') { this._stepMatch(-1); }
      else if (act === 'search-next') { this._stepMatch(+1); }
      else if (act === 'search-close') { this._refs.search.dataset.open = 'false'; this._clearMarks(); this._matches = []; this._refs.searchCt.textContent = '0/0'; root.querySelector('[data-act="search-toggle"]').setAttribute('aria-pressed', 'false'); }
      else if (act === 'copy-path') { this.copy(this._refs.pathOut.textContent); }
      else if (act === 'copy-subtree') {
        e.stopPropagation();
        const det = t.closest('details');
        const path = det?.dataset.path || '$';
        const val = this._resolvePath(path);
        this.copy(safeStringify(val, this._indent()));
      }
      else if (act === 'copy-leaf') {
        e.stopPropagation();
        const li = t.closest('li');
        const val = this._resolvePath(li?.dataset.path || '$');
        const text = (typeof val === 'string') ? val : safeStringify(val);
        this.copy(text);
      }
      else if (act === 'select-key') {
        e.stopPropagation();
        const li = t.closest('li, details');
        const path = li?.dataset.path || '$';
        this._refs.pathBar.dataset.open = 'true';
        this._refs.pathOut.textContent = path;
        this.dispatchEvent(new CustomEvent('json-viewer:keyclick', {
          bubbles: true, composed: true,
          detail: { path, key: t.textContent.replace(/^"|"$/g, ''), value: this._resolvePath(path) }
        }));
      }
      else if (act === 'expand-string') {
        e.stopPropagation();
        const span = t.closest('.v-string');
        if (span?.dataset.full) span.innerHTML = `"${escapeHtml(span.dataset.full)}"`;
      }
    });

    // Search input
    let debounce;
    this._refs.searchIn.addEventListener('input', (e) => {
      clearTimeout(debounce);
      debounce = setTimeout(() => this._runSearch(e.target.value), 120);
    });
    this._refs.searchIn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this._stepMatch(e.shiftKey ? -1 : +1);
      } else if (e.key === 'Escape') {
        this._refs.search.dataset.open = 'false';
        this._clearMarks(); this._matches = [];
        root.querySelector('[data-act="search-toggle"]').setAttribute('aria-pressed', 'false');
      }
    });

    // value click event
    root.addEventListener('click', (e) => {
      const leaf = e.target.closest('[class^="v-"], [class*=" v-"]');
      if (!leaf) return;
      const host = leaf.closest('li, summary');
      if (!host) return;
      const carrier = host.closest('details, li');
      const path = carrier?.dataset.path || '$';
      this.dispatchEvent(new CustomEvent('json-viewer:valueclick', {
        bubbles: true, composed: true,
        detail: { path, value: this._resolvePath(path), type: kindOf(this._resolvePath(path)) }
      }));
    });

    // keyboard shortcut: '/' to open search when focus is inside component
    this.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement !== this._refs.searchIn && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        this._refs.search.dataset.open = 'true';
        this._refs.searchIn.focus();
        root.querySelector('[data-act="search-toggle"]').setAttribute('aria-pressed', 'true');
      }
    });
  }

  _resolvePath(path) {
    if (!path || path === '$') return this._data;
    const tokens = parsePath(path);
    let cur = this._data;
    for (const t of tokens) {
      if (cur == null) return undefined;
      if (typeof t === 'object' && t && t.kind === 'entry') {
        if (cur instanceof Map) {
          const entries = [...cur.entries()];
          cur = entries[t.index]?.[1];
        } else if (cur instanceof Set) {
          cur = [...cur][t.index];
        } else {
          return undefined;
        }
      } else {
        cur = cur[t];
      }
    }
    return cur;
  }
}

// Auto-define on import. Safe against double-registration.
if (typeof customElements !== 'undefined' && !customElements.get('json-viewer')) {
  customElements.define('json-viewer', JsonViewer);
}

export { JsonViewer };
export default JsonViewer;
