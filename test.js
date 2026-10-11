/* Node unit tests for Bangla Calendar BD.
 * Extracts the <script> from index.html and runs it in a VM sandbox,
 * so the tests exercise the EXACT code shipped to the browser. */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) { console.error("FAIL: no <script> block found in index.html"); process.exit(1); }

const sandbox = { console, module: { exports: {} } };
vm.createContext(sandbox);
vm.runInContext(m[1], sandbox, { filename: "index-inline.js" });
const BC = sandbox.module.exports;
if (!BC || !BC.gregorianToBangla) { console.error("FAIL: BC_API not exported"); process.exit(1); }

let pass = 0, fail = 0;
function eq(actual, expected, label) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; }
  else { fail++; console.error("FAIL:", label, "\n  expected:", e, "\n  actual:  ", a); }
}
function throws(fn, label) {
  try { fn(); fail++; console.error("FAIL (no throw):", label); }
  catch (e) { pass++; }
}
function bstr(b) { return b.day + " " + BC.MONTHS_EN[b.month] + " " + b.year; }

/* ---- 1. All required anchors ---- */
const ANCHORS = [
  ["2026-02-21", "8 Falgun 1432"],
  ["1952-02-21", "8 Falgun 1358"],   // historic Language Movement day
  ["2026-03-17", "3 Choitro 1432"],
  ["2026-03-26", "12 Choitro 1432"],
  ["2026-04-14", "1 Boishakh 1433"],
  ["2026-01-01", "17 Poush 1432"],
  ["2025-12-16", "1 Poush 1432"],
  ["2026-01-15", "1 Magh 1432"],
  ["2026-02-14", "1 Falgun 1432"],
  ["2026-03-14", "29 Falgun 1432"],  // last day, 2026 not leap
  ["2026-03-15", "1 Choitro 1432"],
  ["2028-03-14", "30 Falgun 1434"],  // 2028 leap -> 30-day Falgun
  ["2028-03-15", "1 Choitro 1434"],
  ["2026-10-11", "26 Ashwin 1433"]
];
for (const [iso, want] of ANCHORS) {
  const p = BC.parseISODate(iso);
  eq(bstr(BC.gregorianToBangla(p.y, p.m, p.d)), want, "anchor " + iso);
}

/* ---- 2. Round-trip G->B->G for 300 spread dates 1950..2030 ---- */
let rt = 0;
const seen = new Set();
for (let i = 0; i < 300; i++) {
  // deterministic spread: stride across the whole range
  const base = Date.UTC(1950, 0, 1);
  const spanDays = Math.round((Date.UTC(2030, 11, 31) - base) / 86400000);
  const off = Math.round((i * 7919) % spanDays); // 7919 prime -> good spread
  const t = new Date(base + off * 86400000);
  const y = t.getUTCFullYear(), mo = t.getUTCMonth() + 1, d = t.getUTCDate();
  const key = y + "-" + mo + "-" + d;
  if (seen.has(key)) continue;
  seen.add(key);
  const b = BC.gregorianToBangla(y, mo, d);
  const g2 = BC.banglaToGregorian(b.year, b.month, b.day);
  eq(BC.isoOf(g2.y, g2.m, g2.d), BC.isoOf(y, mo, d), "roundtrip " + key);
  rt++;
}
// boundary dates: Apr 13/14, Feb 28/29, Mar 14/15 around leap years
for (const iso of ["2019-04-13","2019-04-14","2020-02-29","2020-03-14","2020-03-15",
                   "2024-02-29","2028-02-29","2028-03-14","2027-03-14","2000-02-29",
                   "2100-02-28","1950-04-14","2030-04-13","2030-04-14"]) {
  const p = BC.parseISODate(iso);
  const b = BC.gregorianToBangla(p.y, p.m, p.d);
  const g2 = BC.banglaToGregorian(b.year, b.month, b.day);
  eq(BC.isoOf(g2.y, g2.m, g2.d), iso, "boundary roundtrip " + iso);
}

/* ---- 3. Season derivation ---- */
const SEASON_CASES = [
  ["2026-04-14", "Grishmo"], ["2026-06-14", "Grishmo"],
  ["2026-07-01", "Borsha"], ["2026-10-11", "Shorot"],
  ["2026-11-01", "Hemonto"], ["2026-12-25", "Sheet"],
  ["2026-01-20", "Sheet"],  ["2026-03-01", "Boshonto"]
];
for (const [iso, want] of SEASON_CASES) {
  const p = BC.parseISODate(iso);
  const b = BC.gregorianToBangla(p.y, p.m, p.d);
  eq(BC.seasonOfBanglaMonth(b.month).en, want, "season " + iso);
}
// every month index maps to exactly one season, each season exactly 2 months
const counts = {};
for (let i = 0; i < 12; i++) {
  const s = BC.seasonOfBanglaMonth(i).en;
  counts[s] = (counts[s] || 0) + 1;
}
eq(Object.keys(counts).length, 6, "six seasons cover 12 months");
eq(Object.values(counts).every(c => c === 2), true, "each season = 2 months");

/* ---- 4. Falgun leap edges ---- */
eq(BC.monthLengths(1432)[10], 29, "Falgun 1432 = 29 (2026 not leap)");
eq(BC.monthLengths(1434)[10], 30, "Falgun 1434 = 30 (2028 leap)");
eq(BC.monthLengths(1426)[10], 30, "Falgun 1426 = 30 (2020 leap)");
throws(() => BC.banglaToGregorian(1432, 10, 30), "30 Falgun 1432 rejected");
eq(BC.isoOf(...Object.values(BC.banglaToGregorian(1434, 10, 30))), "2028-03-14", "30 Falgun 1434 -> 2028-03-14");
throws(() => BC.banglaToGregorian(1433, 0, 32), "32 Boishakh rejected");
throws(() => BC.banglaToGregorian(1200, 0, 1), "year 1200 rejected");
throws(() => BC.banglaToGregorian(1600, 0, 1), "year 1600 rejected");
throws(() => BC.gregorianToBangla(1899, 1, 1), "year 1899 rejected");
throws(() => BC.gregorianToBangla(2026, 2, 30), "Feb 30 rejected");

/* ---- 5. Bengali digits ---- */
eq(BC.toBnDigits("2026-10-11"), "২০২৬-১০-১১", "bn digits full");
eq(BC.toBnDigits(1433), "১৪৩৩", "bn digits number");
eq(BC.toBnDigits("0123456789"), "০১২৩৪৫৬৭৮৯", "bn digits 0-9");
eq(BC.fmtNum(26, "bn"), "২৬", "fmtNum bn");
eq(BC.fmtNum(26, "en"), "26", "fmtNum en");

/* ---- 6. Weekdays sanity (2026-10-11 is a Sunday) ---- */
eq(BC.gregorianWeekday(2026, 10, 11), 0, "2026-10-11 = Sunday");
eq(BC.WD_BN[5], "শুক্রবার", "Friday in Bangla");
eq(BC.MONTHS_BN[5], "আশ্বিন", "Ashwin in Bangla");
eq(BC.HOLIDAYS.length, 28, "28 holiday entries for 2026");
// every holiday converts without throwing, and Eid ul-Fitr lands on 7 Choitro 1432
for (const h of BC.HOLIDAYS) {
  const b = BC.holidayBangla(h);
  if (!(b.day >= 1 && b.day <= 31)) { fail++; console.error("FAIL: bad holiday bangla date", h.g); }
  else pass++;
}
const eid = BC.HOLIDAYS.find(h => h.g === "2026-03-21" && h.en === "Eid ul-Fitr");
eq(bstr(BC.holidayBangla(eid)), "7 Choitro 1432", "Eid ul-Fitr 2026 = 7 Choitro 1432");

console.log("\nnode unit tests: " + pass + " passed, " + fail + " failed (" + (pass + fail) + " total, incl. " + rt + " spread round-trips)");
process.exit(fail ? 1 : 0);
