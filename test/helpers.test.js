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
    .replace(new RegExp('', 'g'), '(?:.*\\.)?')
    .replace(new RegExp('', 'g'), '(?:\\..*)?')
    .replace(new RegExp('', 'g'), '.*')
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

// ---------- buildRecords (Phase C) ----------
const buildRecords = (value, basePath = []) => {
  const out = []
  const seen = new WeakSet()
  const visit = (v, segs) => {
    const path = pathToStringV2(segs)
    const k = kindOf(v)
    const lastSeg = segs[segs.length - 1]
    const keyText =
      lastSeg && typeof lastSeg === 'object' && lastSeg.kind === 'entry' ? `@${lastSeg.index}` :
      typeof lastSeg === 'number' ? `[${lastSeg}]` :
      lastSeg === undefined ? '' : String(lastSeg)
    if (k === 'object' || k === 'array' || k === 'map' || k === 'set') {
      if (seen.has(v)) { out.push({ path, keyText, valueText: '[circular]', kind: k }); return }
      seen.add(v)
    }
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

test('buildRecords: terminates on circular references', () => {
  const a = { name: 'a' }
  a.self = a
  // Without the seen-guard this would stack-overflow. We just assert it returns.
  const recs = buildRecords(a)
  assert.ok(recs.some(r => r.valueText === '[circular]'))
})

// ---------- filterRecords (substring + regex) ----------
const filterRecords = (records, query, { regex = false, caseSensitive = false } = {}) => {
  if (!query) return []
  const re = regex ? new RegExp(query, caseSensitive ? '' : 'i') : null
  const match = re
    ? (s) => re.test(s)
    : (s) => caseSensitive ? s.includes(query) : s.toLowerCase().includes(query.toLowerCase())
  return records.filter(r => match(r.keyText) || match(r.valueText))
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
