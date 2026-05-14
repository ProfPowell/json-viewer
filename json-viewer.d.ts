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
