# Dotenv Override Design

## Goal

Ensure values in the project `.env` file take precedence over inherited shell
environment variables, including a stale `OLLAMA_HOST` export.

## Design

Replace the `dotenv/config` side-effect import in `src/index.ts` with an
explicit `config({ override: true })` call from `dotenv`. Configuration loading
then continues through the existing `loadConfig(process.env)` path; no Ollama
configuration or deployment behavior changes.

## Verification

Add a focused test that proves dotenv's override option is enabled at startup,
then run the complete test suite, type-check, and build. The pull request will
contain only the startup configuration change, its regression coverage, and
this design record.
