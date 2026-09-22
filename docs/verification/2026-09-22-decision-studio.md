# Decision Studio UI verification

Implemented locally on 2026-09-22; not committed, tagged, or published. No paid API calls were made.

The approved reference direction is adapted to real Jev functionality: slim context bar, workspace navigation, configuration panel, and results canvas. Playground, Evidence, and Learn are functional views. Preview, live responses, and recorded evidence remain distinct; the trace describes application policy, not hidden model reasoning.

## Checks

- `npm test`: 41 passing tests, including session-key validation, same-origin enforcement, non-disclosure, live use, and clearing without environment fallback.
- Session-key browser check used a dummy key: save, blank input, reload, clear, Live still off, and mobile containment passed. No provider request was made. The native disclosure and controls follow the installed Impeccable design guidance.
- `node --check web/app.js`: passed.
- Browser smoke: preview, three saved reports (16/144/144 attempts), disputed-reference filtering, keyboard threshold changes and reset, navigation state retention, and skip-link focus passed.
- Desktop 1440x1000 and mobile 390x844 screenshots inspected. Mobile has no document-level horizontal overflow; wide tables scroll within their own region.
- Independent visual review cleared the final hierarchy, larger working text, and mobile result views. Evidence summaries precede collapsed provenance, with a synthetic-data caveat always visible.
- Mechanical UI detector returned no findings. Native controls, keyboard focus styling, and reduced-motion support remain in place.

## Repeat the browser smoke

Start a keyless server with `node server.mjs` (without loading `.env`). Open a Playwright CLI session, then run the repository's smoke expression. In PowerShell:

```powershell
npx --yes --package @playwright/cli playwright-cli --session jev-studio open http://127.0.0.1:3000
$smokeCode = ((Get-Content scripts/browser-smoke.js | Where-Object { $_ -notmatch '^\s*//' }) -join ' ')
npx --yes --package @playwright/cli playwright-cli --session jev-studio run-code $smokeCode
```

The smoke never enables live mode. Tests use isolated fixtures and mock transport. Screenshots remain ignored scratch files under `output/playwright/`, not release assets. Chromium was checked; cross-browser and screen-reader certification are not claimed. No new runtime dependencies, chat interface, or unsupported model controls were added.
