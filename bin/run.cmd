@echo off
setlocal EnableDelayedExpansion

deno run --config deno.json --unstable --allow-write --allow-env --allow-run bin/run.ts %*