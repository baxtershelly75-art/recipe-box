# Shelly's Recipe Box

Static, no-login recipe PWA designed for large readable text, warm non-white surfaces, fast local search, recipe scaling, favorites/recently viewed, offline caching, and a one-step-at-a-time **COOK WITH ME** mode with in-step timers.

## Run locally

Serve this folder with any static server. Example:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Checks

```bash
node tests/validate-recipes.mjs
node tests/core-tests.mjs
node tests/library-coverage.mjs
```

## Current library

The current `main` branch contains 283 normalized recipes with broad category coverage. This is still below the 300–500 recipe V1 finish line.

## Hosting target

GitHub Pages from a dedicated public repository containing only this generic recipe-site code/data. No secrets, personal documents, finance data, accounts, analytics, or paid infrastructure.
