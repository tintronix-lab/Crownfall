#!/usr/bin/env node
// Opens all 21 pages in headless Chromium at 320, 768 and 1440 px and checks that none
// scrolls sideways and that every picture loads once scrolled into view; then checks
// that the 7 index pages are visible and still with reduced motion, and without
// scroll-driven animations.
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
const WIDTHS = [320, 768, 1440];

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
        // the App Store button in the bar, when shown, sits on the logo's line
        getOff: (() => {
          const g = document.querySelector('header .get'), b = document.querySelector('header .brand');
          if (!g || getComputedStyle(g).display === 'none') return false;
          const gr = g.getBoundingClientRect(), br = b.getBoundingClientRect();
          return Math.abs((gr.top + gr.bottom) / 2 - (br.top + br.bottom) / 2) > 4;
        })(),
      }));
      if (r.getOff) problems.push(`${rel} at ${width}px: the header's App Store button is not on the logo's line`);
      if (r.sw > r.cw) problems.push(`${rel} at ${width}px: scrolls sideways (${r.sw} > ${r.cw})`);
      for (const src of r.broken) problems.push(`${rel} at ${width}px: picture does not load: ${src}`);
      checked++;
    }
    await ctx.close();
  }

  // Review Focus 4: for a browser that asks for less motion, or has no scroll-driven
  // animations, every section is fully visible and still from the start.
  const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
  if (!css.includes('@supports (animation-timeline:view())')) problems.push('styles.css: no @supports (animation-timeline:view()) block to switch off');
  const cases = [
    { name: 'reduced motion', reducedMotion: 'reduce', css: null },
    { name: 'no scroll-driven animations', reducedMotion: 'no-preference', css: css.split('@supports (animation-timeline:view())').join('@supports (animation-timeline:no-such-thing())') },
  ];
  for (const c of cases) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, reducedMotion: c.reducedMotion });
    const page = await ctx.newPage();
    for (const lang of LANGS) {
      const rel = path.join(lang === 'en' ? '' : lang, 'index.html');
      await page.goto('file://' + path.join(ROOT, rel), { waitUntil: 'load' });
      if (c.css) {
        await page.evaluate(text => {
          document.querySelector('link[rel=stylesheet]').remove();
          const st = document.createElement('style'); st.textContent = text; document.head.append(st);
        }, c.css);
      }
      const moving = await page.evaluate(() => [...document.querySelectorAll('main, main *')].filter(e => {
        if (e.closest('svg') && e.tagName.toLowerCase() !== 'svg') return false;
        const cs = getComputedStyle(e);
        return cs.opacity !== '1' || cs.transform !== 'none' || e.getAnimations().length > 0;
      }).map(e => e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ').join('.') : '')));
      for (const m of [...new Set(moving)]) problems.push(`${rel} with ${c.name}: ${m} is not fully visible and still`);
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
  console.log(`layout ok: ${checked} page views; no sideways scroll at ${WIDTHS.join(', ')} px, the bar's button on one line, every picture loads, and with less motion or no scroll animations every section is visible and still`);
})().catch(e => { console.error(e); process.exit(1); });
