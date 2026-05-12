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
