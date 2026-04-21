# Pass 1 Checkpoint — Mechanical Copy + Boot

**Date:** 2026-04-21
**Status:** ✅ PASS

## What was done

1. Copied all source files from `pi-kanban-poc/` to `pi-kanban-poc-v2/` via rsync
   - Excluded: `node_modules/`, `.next/`, `package-lock.json`
   - Preserved: `.planning/` (v2's own planning folder)

2. Ran `npm install` — fresh lockfile generated

3. **Issue encountered: corrupt SWC binary**
   - First `npm install` produced a truncated `@next/swc-darwin-arm64` binary (407KB vs expected 121MB)
   - Caused Next.js to fall back to WASM mode, which runs config in ESM context where `__dirname` is undefined
   - **Fix:** deleted `node_modules/` + `package-lock.json` and reinstalled cleanly → binary restored to correct size

4. **Issue encountered: SDK version drift**
   - `package.json` had `"@mariozechner/pi-coding-agent": "latest"` which resolved to `0.68.0` in v2 vs `0.67.68` in v1
   - `0.68.0` requires a new `agentDir` property in `DefaultResourceLoaderOptions`, breaking the build
   - **Fix:** pinned to `"0.67.68"` in v2's `package.json` to match v1 behavior exactly

5. Dev server boots on port 3007, root page returns HTTP 200

6. `npm run build` succeeds — all routes compile

## Files changed from v1 source (so far)

Only two files differ from v1:

- `package.json` — SDK version pinned from `"latest"` to `"0.67.68"`
- `next.config.ts` — unchanged (ESM polyfill was attempted and reverted; file is back to v1 state)

## Exit criteria

- [x] v2 folder has all source files
- [x] `npm install` succeeds
- [x] `npm run dev` boots and `/` renders (HTTP 200)
- [x] `npm run build` succeeds with all routes

## Lessons for later passes

- Always pin SDK versions in v2 to avoid silent contract drift from `"latest"`
- SWC binary corruption can happen on fresh installs — a clean `rm -rf node_modules && npm install` resolves it
- The `next.config.ts` `__dirname` usage is fragile if SWC ever fails; a defensive ESM polyfill is worth considering post-baseline

## Next

Pass 2: Storage isolation + identity changes. **Awaiting signal.**
