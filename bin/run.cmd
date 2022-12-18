@echo off
setlocal EnableDelayedExpansion

deno run --unstable --allow-write --allow-env --allow-run bin/run.ts %*