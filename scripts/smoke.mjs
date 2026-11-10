import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://localhost:4173/housebets-sportsbook-v3/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = []; p.on('console', (m) => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', (e) => errs.push(e.message));
for (const h of ['#/', '#/live', '#/football', '#/match/ars-bha', '#/betslip']) { await p.goto(BASE + h); await p.waitForTimeout(600); }
await p.goto(BASE + '#/'); await p.waitForTimeout(400);
console.log('n', await p.locator('[data-take]').count(), await p.evaluate(() => [document.body.dataset.route, document.querySelectorAll('.call').length, document.querySelector('.cb')?.innerText.slice(0,300), JSON.parse(localStorage.getItem('hb-sportsbook-v3')||'{}').calls?.length]));
await p.click('[data-take] >> visible=true >> nth=0'); await p.waitForTimeout(300);
await p.click('.side [data-post] >> visible=true >> nth=0'); await p.waitForTimeout(300);
await p.click('[data-act="rewrite"]'); await p.click('[data-act="post-confirm"]'); await p.waitForTimeout(300);
await p.click('[data-bview="latest"]'); await p.waitForTimeout(300);
await p.goto(BASE + '#/match/ars-bha'); await p.waitForTimeout(400);
await p.click('.callout >> visible=true >> nth=0'); await p.waitForTimeout(300);
await p.click('.side [data-ptab="bets"]'); await p.click('.side [data-btab="calls"]'); await p.waitForTimeout(300);
await p.waitForTimeout(5000);
console.log('errors', JSON.stringify(errs));
console.log(await p.evaluate(() => document.querySelectorAll('.call').length));
await b.close();
