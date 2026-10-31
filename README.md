# Crownfall — public site

Product page, privacy policy and support page for Crownfall. Static HTML/CSS, no build step; served by GitHub Pages.

- `index.html` — product page
- `privacy.html` — privacy policy (App Store privacy URL)
- `support.html` — support page (App Store support URL)
- `styles.css` — shared styles; colours and glass follow the game's HUD
- `images/` — the game's own screenshots, cropped and compressed to WebP. No stock photos or external images; keep the page under 3 MB

The page says only what the game does today. Check it against the game's `docs/STATUS.md` when the game changes, and when it reaches the App Store or TestFlight, or gets a price or date, update the first screen, "Where things stand" and the FAQ.

**Publish:** Settings → Pages → Deploy from branch → `main` / root.

**Before App Store submission:** add a support email on your own domain to `support.html` and `privacy.html`, and keep the privacy policy in sync with the game's actual data use. Never commit game code, builds or design documents here.
