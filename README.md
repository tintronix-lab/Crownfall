# Crownfall — public site

Product page, privacy policy and support page for Crownfall. Static HTML/CSS, no build step; served by GitHub Pages.

- `index.html` — product page
- `privacy.html` — privacy policy (App Store privacy URL)
- `support.html` — support page (App Store support URL)
- `styles.css` — shared styles; colours and glass follow the game's HUD
- `de/`, `fr/`, `es/`, `pt-BR/`, `it/`, `sv/` — the same three pages translated, using the game's own terms (its `docs/words/GLOSSARY.md`). The English pages are the originals: change a translation whenever its English page changes, and keep the hreflang links and the footer language row the same on all 21 pages
- `images/` — the game's own screenshots, cropped and compressed to WebP. No stock photos or external images; keep the page under 3 MB

The page says only what the game does today. Check it against the game's `docs/STATUS.md` when the game changes, and when it reaches the App Store or TestFlight, or gets a price or date, update the first screen, "Where things stand" and the FAQ.

**Check before you push:** `python3 .github/scripts/check_site.py` (21 pages in step, links, canonical, weight) and `node .github/scripts/check_layout.js` (no sideways scroll at 320 and 1440 px, every picture loads; needs Playwright with Chromium).
Both run on every pull request and push to `main` (`.github/workflows/site.yml`).

**Publish:** Settings → Pages → Deploy from branch → `main` / root.

**Before App Store submission:** add a support email on your own domain to `support.html` and `privacy.html`, and keep the privacy policy in sync with the game's actual data use. Never commit game code, builds or design documents here.
