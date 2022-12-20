@echo off
setlocal EnableDelayedExpansion

wget https://github.com/puppeteer/puppeteer/archive/refs/tags/puppeteer-core-v19.4.1.tar.gz -P libs
powershell -Command "if (!(Test-Path libs/puppeteer)) { New-Item -ItemType Directory -Path libs/puppeteer }" 2> nul
tar -xkf libs\puppeteer-core-v19.4.1.tar.gz -C libs/puppeteer
del libs\puppeteer-core-v19.4.1.tar.gz
cd libs/puppeteer/puppeteer-puppeteer-core-v19.4.1
powershell -Command "(Get-Content package.json) -replace 'husky install','' | Set-Content package.json" 2> nul
npm install --silent