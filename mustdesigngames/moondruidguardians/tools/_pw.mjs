// _pw.mjs — resolve Playwright's chromium in both a CI runner (local `npm i playwright`)
// and this cloud session (global install at a fixed path). Bakers import chromium from here.
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs')); }
export { chromium };
