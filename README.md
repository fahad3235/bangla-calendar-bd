# Bangla Calendar BD (বাংলা ক্যালেন্ডার বিডি)

A single-file, fully offline web app for the **Bangla (বঙ্গাব্দ) calendar** — bilingual (EN/বাংলা), with a date converter, month calendar grid, 2026 Bangladesh public holidays, and the six Bengali seasons (ঋতু).

## Problem
Bangladesh runs on two calendars at once: the Gregorian calendar for official business and the Bangla calendar for culture, festivals, and everyday life. Existing online converters are ad-heavy, need connectivity, and rarely explain the math. This app is one `index.html` that works offline, shows its work, and converts both ways with verified arithmetic.

## Features
1. **Today hero card** — today's Gregorian + Bangla date, Bangla weekday, and season with emoji. Supports `?asof=YYYY-MM-DD` to pin "today" (used by the test suite).
2. **Date converter** — Gregorian → Bangla and Bangla → Gregorian, with input validation, inline localized error messages, and empty states. Reverse conversions round-trip.
3. **Bangla month calendar grid** — month/year picker, grid aligned to real weekdays (weeks start Sunday), Friday highlighted as the weekly holiday, today ringed, public-holiday dots with names on hover.
4. **2026 BD public holidays & festivals** — 28 entries from the official 2026 government announcement (including executive-order holidays, marked with a badge); every holiday's Bangla date is computed live by the app. "Next holiday — N days away" countdown.
5. **Seasons explorer (ঋতু)** — 6 cards: গ্রীষ্ম, বর্ষা, শরৎ, হেমন্ত, শীত, বসন্ত with months and approximate Gregorian ranges.
6. **EN/বাংলা toggle** — full UI translation + Bengali digit conversion, persisted in `localStorage`. Responsive down to 390px with no horizontal overflow.

Plus a "Did you know?" strip of famous anchors (e.g. ২১ ফেব্রুয়ারি = ৮ ফাল্গুন), each computed by the same conversion math — no hardcoded Bangla dates.

## Conversion math
Implements the **2019 national reform** of the Bangla calendar:
- 1 Boishakh = April 14 every year.
- Month lengths `[31,31,31,31,31,31,30,30,30,30,29,30]`; Falgun is 30 days when the Gregorian year containing it (Bangla year + 594) is a leap year.
- Bangla year = Gregorian year − 593 on/after April 14, else − 594.

## Stack
Vanilla HTML/CSS/JS. No CDN, no build step, no frameworks, no network calls, no secrets. One file: `index.html`.

## Install / dev
No install needed — open `index.html` in any modern browser, or serve it:
```bash
cd builds/bangla-calendar-bd
python3 -m http.server 8000   # then open http://localhost:8000/
```
Tip: `index.html?asof=2026-10-11` pins "today" for demos.

## Testing
Two suites, both testing the exact code shipped in `index.html`:

```bash
node test.js    # unit tests: extracts the inline <script> and runs it in a VM
node smoke.js   # headless-Chrome (puppeteer-core + system Chromium) UI tests
```
`smoke.js` needs `puppeteer-core` and a Chromium binary (used: `/opt/meta-chromium/chrome`).

**Coverage**
- `test.js` — **386 assertions**: all 14 conversion anchors (incl. the historic 1952-02-21 → 8 Falgun 1358), 300 spread round-trips G→B→G across 1950–2030 plus 14 leap/boundary round-trips, season derivation for every month, Falgun 29/30 leap edges and invalid-day rejection, Bengali-digit conversion, weekday sanity, and all 28 holidays converting (Eid ul-Fitr 2026 → 7 Choitro 1432).
- `smoke.js` — **18 assertions** with `?asof=2026-10-11`: hero shows `২৬ আশ্বিন ১৪৩৩` + শরৎ, converter `2026-02-21 → 8 Falgun 1432`, reverse `1 Boishakh 1433 → 2026-04-14`, Ashwin 1433 grid (31 cells, Wednesday alignment), Friday highlighting, 28 holiday rows, next-holiday countdown (Oct 20, 9 days away), EN/বাংলা toggle + `localStorage` persistence, 390px no-overflow, **zero console/page errors**.

## Deployment (GitHub Pages)
Static single file — push `index.html` (plus `README.md`) to a repo and enable Pages. No build, no environment variables.

## Limitations
- The converter implements the **2019 revised national calendar**. Bangla dates long before 2019 may differ by about a day from the older (pre-reform) calendar.
- Holiday list covers **2026 only**, per the official 2026 gazette. Lunar-based dates (Eids, Shab-e-Barat, etc.) follow the announcement and may shift with actual moon sighting.
- Gregorian input range is 1900–2100; Bangla input range is 1300–1510.

## Status
Built and verified 2026-10-11 — node unit 386/386, headless-Chrome smoke 18/18, zero console errors.
