import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://localhost:4173/housebets-sportsbook-v3/';
const OUT = process.env.OUT || '/workspace/sportsbook/shots-v3';
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const errs = [];
const report = [];
async function mk(vp, dpr, mobile) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror ' + e.message));
  await page.goto(BASE + '#/'); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(400);
  return page;
}
const ov = async (p, n) => { const o = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]); if (o[0] > o[1]) report.push(`overflow ${n} ${o}`); };
const shot = async (p, n) => { await ov(p, n); await p.screenshot({ path: `${OUT}/state-${n}.png` }); };
async function tall(p, n) { const vp = p.viewportSize(); const h = await p.evaluate(() => document.documentElement.scrollHeight); await p.setViewportSize({ width: vp.width, height: Math.min(h, 6000) }); await p.waitForTimeout(250); await shot(p, n); await p.setViewportSize(vp); }
const demo = async (p, sel) => { await p.click('[data-open="demo"] >> visible=true'); await p.waitForTimeout(150); await p.click(sel); await p.waitForTimeout(350); };
const closeDemo = async (p) => { if (await p.$('#dlg-demo[open]')) await p.keyboard.press('Escape'); await p.waitForTimeout(150); };
const step = async (name, fn) => { try { await fn(); } catch (e) { errs.push(`flow ${name}: ${e.message.split('\n')[0]}`); } };
const pause = async (p, on) => { await p.click('[data-open="demo"] >> visible=true'); await p.waitForTimeout(100); if (on) await p.check('[data-demo="paused"]', { force: true }); else await p.uncheck('[data-demo="paused"]', { force: true }); await closeDemo(p); };

// ---------- desktop 1440 ----------
let p = await mk({ width: 1440, height: 900 }, 1, false);
await step('home-calls', async () => { await p.locator('#calls').scrollIntoViewIfNeeded(); await p.evaluate(() => scrollTo(0, document.querySelector('#calls').getBoundingClientRect().top + scrollY - 80)); await p.waitForTimeout(300); await shot(p, 'd-calls-board-ranked'); });
await step('grouping', async () => { await p.click('.call__more summary >> nth=0'); await p.waitForTimeout(250); await shot(p, 'd-calls-grouped'); });
await step('latest', async () => { await p.click('[data-bview="latest"]'); await p.waitForTimeout(250); await shot(p, 'd-calls-latest'); await p.click('[data-bview="ranked"]'); });
await step('take', async () => {
  await pause(p, true);
  await p.click('.home__calls [data-take="C-118"] >> visible=true'); await p.waitForTimeout(400); await shot(p, 'd-take-call');
});
await step('stale-take', async () => {
  await demo(p, '[data-demo-act="move-calls"]'); await p.waitForTimeout(400);
  await p.evaluate(() => scrollTo(0, document.querySelector('#calls').getBoundingClientRect().top + scrollY - 80)); await p.waitForTimeout(200);
  await shot(p, 'd-stale-call');
  const b = p.locator('.home__calls .call--stale [data-take] >> visible=true').first();
  await b.click(); await p.waitForTimeout(400); await shot(p, 'd-take-stale-accept');
});
await step('post', async () => {
  await p.click('.side [data-act="accept"]'); await p.waitForTimeout(200);
  await p.fill('.side [data-stake] >> nth=0', '10'); await p.fill('.side [data-stake] >> nth=1', '5'); await p.waitForTimeout(200);
  await p.click('.side [data-post] >> nth=0'); await p.waitForTimeout(300); await shot(p, 'd-post-composer');
  await p.click('[data-act="rewrite"]'); await p.waitForTimeout(150);
  await p.click('[data-act="post-confirm"]'); await p.waitForTimeout(400);
  await p.evaluate(() => scrollTo(0, document.querySelector('#calls').getBoundingClientRect().top + scrollY - 80)); await p.click('[data-bview="latest"]'); await p.waitForTimeout(250);
  await shot(p, 'd-post-call'); await p.click('[data-bview="ranked"]');
});
await step('odds-changed', async () => { await pause(p, false); await demo(p, '[data-demo-act="odds"]'); await closeDemo(p); await p.waitForTimeout(200); await shot(p, 'd-odds-changed'); await p.click('.side [data-act="accept"]'); });
await step('susp-sel', async () => { await pause(p, true); await demo(p, '[data-demo-act="suspend-sel"]'); await closeDemo(p); await shot(p, 'd-selection-suspended'); await demo(p, '[data-demo-act="suspend-sel"]'); await closeDemo(p); });
await step('fail', async () => {
  await p.click('[data-open="demo"] >> visible=true'); await p.check('[data-demo="failNext"]', { force: true }); await closeDemo(p);
  const acc = await p.$('.side [data-act="accept"]'); if (acc) await acc.click();
  await p.click('.side [data-act="place"]'); await p.waitForTimeout(250); await shot(p, 'd-placing');
  await p.waitForTimeout(1400); await shot(p, 'd-bet-failed');
});
await step('placed', async () => {
  const acc = await p.$('.side [data-act="accept"]'); if (acc) await acc.click();
  await p.click('.side [data-act="place"]'); await p.waitForTimeout(1600); await shot(p, 'd-bet-placed');
});
await step('cashout', async () => {
  await p.click('.side [data-act="view-bets"]'); await p.waitForTimeout(200);
  await p.click('.side [data-cash] >> nth=0'); await p.waitForTimeout(150); await shot(p, 'd-cashout-confirm');
  await p.click('.side [data-cash-yes]'); await p.waitForTimeout(300); await shot(p, 'd-mybets-settled');
});
await step('mycalls', async () => {
  await p.click('.side [data-btab="calls"]'); await p.waitForTimeout(200); await shot(p, 'd-my-calls-posted');
  await p.click('.side [data-ctab="taken"]'); await p.waitForTimeout(200); await shot(p, 'd-my-calls-taken');
});
await step('match', async () => {
  await p.goto(BASE + '#/match/ars-bha'); await p.waitForTimeout(500); await shot(p, 'd-match');
  await p.click('.callout >> nth=0'); await p.waitForTimeout(400); await shot(p, 'd-match-callout-filter');
  await demo(p, '[data-demo-act="suspend-match"]'); await closeDemo(p); await p.waitForTimeout(300); await p.evaluate(() => scrollTo(0, 0)); await shot(p, 'd-match-suspended-locked-calls');
  await demo(p, '[data-demo-act="suspend-match"]'); await closeDemo(p);
  await p.goto(BASE + '#/match/ars-bha?g=Goalscorers'); await p.waitForTimeout(300); await shot(p, 'd-match-goalscorers');
  await p.goto(BASE + '#/match/ars-bha?g=Corners%20%26%20cards'); await p.waitForTimeout(300); await shot(p, 'd-match-corners');
  await pause(p, false); await p.goto(BASE + '#/match/ars-bha'); await p.waitForTimeout(4500); await shot(p, 'd-match-odds-moving');
  await demo(p, '[data-demo-act="goal"]'); await closeDemo(p); await p.waitForTimeout(600); await shot(p, 'd-goal-suspended'); await p.waitForTimeout(4500); await shot(p, 'd-goal-repriced');
});
await step('search', async () => {
  await p.goto(BASE + '#/'); await p.waitForTimeout(300);
  await p.fill('#q-top', 'bri'); await p.waitForTimeout(200); await shot(p, 'd-search');
  await p.fill('#q-top', 'corners'); await p.waitForTimeout(200); await shot(p, 'd-search-markets');
  await p.fill('#q-top', 'zzzq'); await p.waitForTimeout(200); await shot(p, 'd-search-none'); await p.fill('#q-top', ''); await p.keyboard.press('Escape');
});
await step('follow', async () => {
  await p.goto(BASE + '#/football?league=lal'); await p.waitForTimeout(400);
  await p.click('[data-follow="comps:lal"] >> visible=true'); await p.waitForTimeout(200);
  await p.click('#tf-lal summary'); await p.click('[data-follow="teams:rma"]'); await p.waitForTimeout(200); await shot(p, 'd-football-follow');
  await p.goto(BASE + '#/football?show=following'); await p.waitForTimeout(300); await shot(p, 'd-football-following');
  await p.goto(BASE + '#/'); await p.waitForTimeout(300); await p.evaluate(() => scrollTo(0, document.querySelector('#calls').getBoundingClientRect().top + scrollY - 80)); await p.waitForTimeout(200); await shot(p, 'd-home-pinned-follows');
});
await step('demo', async () => {
  await p.goto(BASE + '#/'); await p.click('[data-open="demo"] >> visible=true'); await p.waitForTimeout(200); await shot(p, 'd-demo-panel');
  await p.check('[data-demo="nothingLive"]', { force: true }); await closeDemo(p);
  await p.goto(BASE + '#/live'); await p.waitForTimeout(300); await shot(p, 'd-nothing-live');
  await p.goto(BASE + '#/'); await p.waitForTimeout(300); await shot(p, 'd-home-nothing-live');
  await p.click('[data-open="demo"] >> visible=true'); await p.uncheck('[data-demo="nothingLive"]', { force: true }); await closeDemo(p);
  await p.goto(BASE + '#/live?sport=football'); await p.waitForTimeout(300); await shot(p, 'd-live-filter-football');
  await demo(p, '[data-demo-act="clear-calls"]'); await p.goto(BASE + '#/'); await p.waitForTimeout(300); await p.evaluate(() => scrollTo(0, document.querySelector('#calls').getBoundingClientRect().top + scrollY - 80)); await shot(p, 'd-calls-empty');
  await demo(p, '[data-demo-act="seed-calls"]');
  await p.goto(BASE + '#/betslip'); await p.waitForTimeout(300); await tall(p, 'd-betslip-page');
});
await p.context().close();

// ---------- phone 390 ----------
p = await mk({ width: 390, height: 844 }, 2, true);
await step('p-home', async () => { await p.evaluate(() => scrollTo(0, document.querySelector('#calls').getBoundingClientRect().top + scrollY - 70)); await p.waitForTimeout(250); await shot(p, 'p-calls-board'); await p.evaluate(() => scrollTo(0, 0)); });
await step('p-take', async () => {
  await pause(p, true);
  await p.tap('.home__calls [data-take="C-118"] >> visible=true'); await p.waitForTimeout(500); await shot(p, 'p-take-call-bar');
  await p.tap('[data-mbar] button'); await p.waitForTimeout(500); await shot(p, 'p-slip-sheet');
  await p.tap('.side [data-quick$="::10"] >> nth=0'); await p.waitForTimeout(150);
  await p.tap('.side [data-post] >> nth=0'); await p.waitForTimeout(400); await shot(p, 'p-post-composer');
  await p.tap('[data-act="post-confirm"]'); await p.waitForTimeout(400); await shot(p, 'p-post-call');
  await p.tap('.side [data-act="place"]'); await p.waitForTimeout(1600); await shot(p, 'p-bet-placed');
  await p.tap('.side [data-act="view-bets"]'); await p.waitForTimeout(200); await p.tap('.side [data-btab="calls"]'); await p.waitForTimeout(200); await shot(p, 'p-my-calls');
  await p.tap('.side [data-act="sheet-close"]'); await p.waitForTimeout(400);
});
await step('p-match', async () => {
  await p.goto(BASE + '#/match/ars-bha'); await p.waitForTimeout(400); await shot(p, 'p-match');
  await p.evaluate(() => scrollTo(0, document.querySelector('.mp__mk').getBoundingClientRect().top + scrollY - 70)); await p.waitForTimeout(200); await shot(p, 'p-match-markets');
  await demo(p, '[data-demo-act="suspend-match"]'); await closeDemo(p); await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(300); await shot(p, 'p-match-locked-calls'); await demo(p, '[data-demo-act="suspend-match"]'); await closeDemo(p);
});
await step('p-misc', async () => {
  await p.goto(BASE + '#/live'); await p.waitForTimeout(300); await shot(p, 'p-live');
  await p.goto(BASE + '#/football'); await p.waitForTimeout(300); await shot(p, 'p-football');
  await p.tap('[data-open="menu"] >> visible=true'); await p.waitForTimeout(300); await shot(p, 'p-menu'); await p.keyboard.press('Escape');
  await p.tap('.bnav [data-open="search"]'); await p.waitForTimeout(200); await p.fill('#q-ov', 'ars'); await p.waitForTimeout(200); await shot(p, 'p-search'); await p.keyboard.press('Escape');
  await p.goto(BASE + '#/betslip'); await p.waitForTimeout(300); await p.tap('#main [data-ptab="bets"]'); await p.waitForTimeout(200); await tall(p, 'p-mybets');
});
await browser.close();
console.log('report:', JSON.stringify(report));
console.log('errors:', JSON.stringify(errs));
