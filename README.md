# FortDex 2.0

Fortnite collection tracker PWA.

## Files
- `index.html` — app shell
- `styles.css` — UI styling
- `src/app.js` — app logic and versioned save migration
- `src/data/sprites.js` — sprite database
- `manifest.webmanifest` — installable app metadata
- `sw.js` — offline cache
- `icon.svg` — app icon

## Update workflow
1. Copy these files into the repo root.
2. Commit changes in GitHub Desktop.
3. Push to GitHub.
4. GitHub Pages redeploys automatically.

## Save safety
Save data uses `localStorage` key `fortdex.save.v2` and includes a migration path from earlier keys.
Use Export Save before major updates.
