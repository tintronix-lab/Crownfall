#!/usr/bin/env node
// Opens all 21 pages in headless Chromium at 320 and 1440 px and checks that none
// scrolls sideways and that every picture loads once scrolled into view.
//
//   node .github/scripts/check_layout.js
//
// Prints each problem and exits 1, or prints a summary and exits 0.
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..');
const LANGS = ['en', 'de', 'fr', 'es', 'pt-BR', 'it', 'sv'];
const PAGES = ['index.html', 'support.html', 'privacy.html'];
const WIDTHS = [320, 1440];

(async () => {
  const problems = [];
  const browser = await chromium.launch();
  let checked = 0;
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width, height: 800 } });
    const page = await ctx.newPage();
    for (const lang of LANGS) for (const name of PAGES) {
      const rel = path.join(lang === 'en' ? '' : lang, name);
      const file = path.join(ROOT, rel);
      if (!fs.existsSync(file)) { problems.push(`${rel}: missing`); continue; }
      await page.goto('file://' + file, { waitUntil: 'load' });
      // Walk down the page so lazy pictures load, and look along each sideways rail too.
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < height; y += 500) {
        await page.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), y);
        await page.waitForTimeout(30);
      }
      await page.evaluate(() => document.querySelectorAll('.rail').forEach(r => r.scrollTo({ left: r.scrollWidth, behavior: 'instant' })));
      await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
      await page.waitForLoadState('load');
      await page.evaluate(async () => {
        await Promise.all([...document.images].map(i => i.complete ? null : new Promise(r => { i.onload = i.onerror = r; setTimeout(r, 5000); })));
      });
      const r = await page.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        cw: document.documentElement.clientWidth,
        broken: [...document.images].filter(i => !i.complete || i.naturalWidth === 0).map(i => i.getAttribute('src')),
      }));
      if (r.sw > r.cw) problems.push(`${rel} at ${width}px: scrolls sideways (${r.sw} > ${r.cw})`);
      for (const src of r.broken) problems.push(`${rel} at ${width}px: picture does not load: ${src}`);
      checked++;
    }
    await ctx.close();
  }
  await browser.close();
  if (problems.length) {
    problems.forEach(p => console.log(p));
    console.log(`${problems.length} problem(s)`);
    process.exit(1);
  }
  console.log(`layout ok: ${checked} page views at ${WIDTHS.join(' and ')} px, no sideways scroll, every picture loads`);
})().catch(e => { console.error(e); process.exit(1); });
