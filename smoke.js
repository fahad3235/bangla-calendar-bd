/* Headless-Chrome smoke tests for Bangla Calendar BD (puppeteer-core + system Chromium).
 * Uses ?asof=2026-10-11 for deterministic "today". */
"use strict";
const puppeteer = require("puppeteer-core");

const FILE = "file:///home/hatch/workspace/muse-project-factory/builds/bangla-calendar-bd/index.html?asof=2026-10-11";
let pass = 0, fail = 0;
function eq(actual, expected, label) {
  if (actual === expected) { pass++; console.log("  ok:", label); }
  else { fail++; console.error("FAIL:", label, "\n  expected:", JSON.stringify(expected), "\n  actual:  ", JSON.stringify(actual)); }
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "/opt/meta-chromium/chrome",
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--allow-file-access-from-files"]
  });
  const errors = [];
  try {
    const page = await browser.newPage();
    page.on("console", m => { if (m.type() === "error") errors.push("console: " + m.text()); });
    page.on("pageerror", e => errors.push("pageerror: " + e.message));
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(FILE, { waitUntil: "load", timeout: 30000 });
    await page.waitForFunction(() => document.getElementById("hero-bangla-date").textContent !== "…", { timeout: 5000 });

    // 1. hero date (default lang = bn)
    eq(await page.$eval("#hero-bangla-date", el => el.textContent), "২৬ আশ্বিন ১৪৩৩", "hero bangla date (bn)");
    // 2. hero season
    const seasonTxt = await page.$eval("#hero-season", el => el.textContent);
    eq(seasonTxt.includes("শরৎ"), true, "hero season contains শরৎ");
    eq(await page.$eval("#hero-season", el => el.getAttribute("data-season-en")), "Shorot", "hero season en attr");
    // 3. converter G->B
    await page.$eval("#g-date", el => { el.value = "2026-02-21"; });
    await page.click("#g2b-btn");
    await page.waitForFunction(() => document.getElementById("g2b-result").hasAttribute("data-bangla"));
    eq(await page.$eval("#g2b-result", el => el.getAttribute("data-bangla")), "8 Falgun 1432", "converter 2026-02-21 -> 8 Falgun 1432");
    // 4. converter B->G reverse
    await page.select("#b-month", "0");
    await page.$eval("#b-day", el => { el.value = "1"; });
    await page.$eval("#b-year", el => { el.value = "1433"; });
    await page.click("#b2g-btn");
    await page.waitForFunction(() => document.getElementById("b2g-result").hasAttribute("data-iso"));
    eq(await page.$eval("#b2g-result", el => el.getAttribute("data-iso")), "2026-04-14", "reverse 1 Boishakh 1433 -> 2026-04-14");
    // 5. calendar grid: Ashwin 1433 (default view) -> 31 days, first weekday Wed = 3 blanks
    const dayCount = await page.$$eval("#cal-grid .cell.day", els => els.length);
    eq(dayCount, 31, "Ashwin 1433 grid has 31 day cells");
    const blanks = await page.$$eval("#cal-grid .cell.blank", els => els.length);
    eq(blanks, 3, "Ashwin 1433 first weekday offset = 3 (Wednesday)");
    const firstDayWd = await page.evaluate(() => {
      const cells = [...document.querySelectorAll("#cal-grid .cell")].filter(c => !c.classList.contains("wd"));
      return cells.findIndex(c => c.classList.contains("day"));
    });
    eq(firstDayWd, 3, "first day cell index after blanks");
    // Friday highlight present in this month view
    const friCount = await page.$$eval("#cal-grid .cell.day.fri", els => els.length);
    eq(friCount > 0, true, "Friday cells highlighted (" + friCount + ")");
    // 6. holidays: Eid ul-Fitr row shows computed Bangla date 7 Choitro 1432
    const eidBangla = await page.$eval('[data-holiday-en="Eid ul-Fitr"]', el => el.getAttribute("data-bangla"));
    eq(eidBangla, "7 Choitro 1432", "Eid ul-Fitr Bangla date");
    const holRows = await page.$$eval("#hol-list .hol-row", els => els.length);
    eq(holRows, 28, "28 holiday rows listed");
    // 7. next-holiday countdown for asof 2026-10-11
    eq(await page.$eval("#next-holiday", el => el.getAttribute("data-next-date")), "2026-10-20", "next holiday date");
    eq(await page.$eval("#next-holiday", el => el.getAttribute("data-days")), "9", "next holiday 9 days away");
    // 8. EN/বাংলা toggle flips hero
    await page.click("#lang-toggle");
    await page.waitForFunction(() => document.getElementById("hero-bangla-date").textContent === "26 Ashwin 1433", { timeout: 5000 });
    eq(await page.$eval("#hero-bangla-date", el => el.textContent), "26 Ashwin 1433", "toggle -> EN hero");
    eq(await page.$eval("#hero-season", el => el.textContent.includes("Shorot")), true, "toggle -> EN season");
    // toggle back to bn (persist check on reload)
    await page.click("#lang-toggle");
    await page.waitForFunction(() => document.getElementById("hero-bangla-date").textContent === "২৬ আশ্বিন ১৪৩৩", { timeout: 5000 });
    await page.reload({ waitUntil: "load" });
    await page.waitForFunction(() => document.getElementById("hero-bangla-date").textContent !== "…", { timeout: 5000 });
    eq(await page.$eval("#hero-bangla-date", el => el.textContent), "২৬ আশ্বিন ১৪৩৩", "lang persists via localStorage");
    // 9. 390px mobile: no horizontal overflow
    await page.setViewport({ width: 390, height: 844, isMobile: true });
    await new Promise(r => setTimeout(r, 400));
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    eq(sw <= 391, true, "390px no horizontal overflow (scrollWidth=" + sw + ")");
    // 10. zero console/page errors
    eq(errors.length, 0, "zero console/page errors" + (errors.length ? ": " + errors.join(" | ") : ""));
  } catch (e) {
    fail++;
    console.error("FAIL: exception during smoke test:", e.message);
  } finally {
    await browser.close();
  }
  console.log("\nheadless chrome smoke: " + pass + " passed, " + fail + " failed (" + (pass + fail) + " total)");
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("fatal", e); process.exit(1); });
