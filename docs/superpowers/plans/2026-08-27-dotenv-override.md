# Dotenv Override Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make project `.env` values override inherited environment variables at bot startup.

**Architecture:** Keep the existing `loadConfig(process.env)` flow and change only dotenv initialization in `src/index.ts` to call `config({ override: true })`. Add a focused test that mocks dotenv and verifies startup requests the override option.

**Tech Stack:** Node.js, TypeScript, dotenv, Vitest.

---

### Task 1: Enable dotenv override at startup

**Files:**
- Modify: `src/index.ts:1`
- Test: `tests/config.test.ts`

- [ ] **Step 1: Add a regression test**

Mock `dotenv` before importing the entrypoint and assert that its `config` function receives `{ override: true }`. Keep the test isolated from Discord login by mocking the other startup dependencies or by testing a small exported startup configuration helper if the current entrypoint structure requires it.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- tests/config.test.ts`

Expected: the new assertion fails because `src/index.ts` currently imports `dotenv/config` without an explicit override option.

- [ ] **Step 3: Implement the minimal startup change**

Replace the side-effect import in `src/index.ts`:

```ts
import 'dotenv/config';
```

with:

```ts
import { config as loadDotenv } from 'dotenv';

loadDotenv({ override: true });
```

Leave `loadConfig(process.env)` unchanged.

- [ ] **Step 4: Run focused and full verification**

Run: `npm test -- tests/config.test.ts`

Expected: PASS.

Run: `npm test && npm run typecheck && npm run build`

Expected: all tests pass, type-check succeeds, and TypeScript emits `dist/index.js`.

- [ ] **Step 5: Inspect and commit the implementation**

Run:

```bash
git diff --check
```

Expected: clean diff check and a successful implementation commit.
