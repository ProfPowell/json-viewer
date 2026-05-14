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
