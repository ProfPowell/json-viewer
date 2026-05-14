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


<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:ca08a54f -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd dolt push
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
<!-- END BEADS INTEGRATION -->
