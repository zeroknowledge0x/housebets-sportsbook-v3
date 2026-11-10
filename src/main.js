import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/instrument-sans';
import './styles.css';
import { MATCHES, TEAMS, COMPS, comp, match, squad, sport } from './data.js';
import { startEngine, onOdds, markets, selection, setOdds, odds as oddsOf, suspendMarket, suspendMatch, SUSP_MATCH, SUSP, setPaused, goal, isSuspended } from './markets.js';
import { state, subscribe, toggleSelection, removeSelection, clearSlip, setStake, acceptChanges, placeBets, dismissStatus, toggleFollow, inSlip, cashOut, resetAll, num, quickStake, postCall, takeCall, resetCalls, clearCalls, callById } from './store.js';
import { writeLine, callStatus } from './ai.js';
import { caller } from './calls.js';
import * as V from './views.js';
import { icon, logo, starFilled } from './icons.js';
import { esc, usdt, fOdds, parseHash } from './util.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const mqDesk = matchMedia('(min-width: 1200px)');
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- shell ----------
document.querySelector('#app').innerHTML = `
  <a class="skip" href="#main">Skip to content</a>
  <header class="top">
    <a class="top__logo" href="#/" aria-label="Housebets sports home">${logo()}</a>
    <div class="top__search">${V.searchBox('q-top')}</div>
    <div class="top__r" data-top-r></div>
  </header>
  <aside class="nav" aria-label="Main" data-nav-side></aside>
  <main id="main" class="main" tabindex="-1"></main>
  <div class="scrim" data-act="sheet-close" aria-hidden="true"></div>
  <aside class="side" id="slip-panel" aria-label="Bet slip and my bets" data-side></aside>
  <div class="mbar" data-mbar></div>
  <nav class="bnav" aria-label="Mobile">
    <button type="button" class="bnav__i" data-open="menu">${icon('menu')}<span>Menu</span></button>
    <a class="bnav__i" href="#/" data-bn="sports">${icon('football')}<span>Sports</span></a>
    <a class="bnav__i" href="#casino">${icon('casino')}<span>Casino</span></a>
    <a class="bnav__i" href="#chat">${icon('chat')}<span>Chat</span></a>
    <button type="button" class="bnav__i" data-open="search">${icon('search')}<span>Search</span></button>
  </nav>
  <dialog class="dlg dlg--menu" id="dlg-menu" aria-label="Menu"></dialog>
  <dialog class="dlg dlg--search" id="dlg-search" aria-label="Search">
    <div class="dlg__h"><h2>Search</h2><button type="button" class="x" data-close aria-label="Close search">${icon('x')}</button></div>
    <div class="dlg__b">${V.searchBox('q-ov')}</div>
  </dialog>
  <dialog class="dlg dlg--demo" id="dlg-demo" aria-labelledby="demo-h"></dialog>
  <dialog class="dlg dlg--post" id="dlg-post" aria-labelledby="cmp-h"></dialog>
  <div class="toast" id="toast" role="status" aria-live="polite"></div>`;

function renderTop() {
  $('[data-top-r]').innerHTML = `
    <button type="button" class="demo" data-open="demo" aria-haspopup="dialog">${icon('sliders', 'ic--sm')}<span>Demo states</span></button>
    ${state.demo.signedOut
      ? `<button type="button" class="btn btn--line btn--sm" data-act="login">Log in</button><button type="button" class="btn btn--sm" data-act="login">Register</button>`
      : `<a class="wal" href="#wallet" aria-label="Wallet, demo balance ${state.balance.toFixed(2)} USDT"><span class="wal__c" aria-hidden="true">₮</span><b>${state.balance.toFixed(2)}</b><small>USDT</small><span class="wal__b" aria-hidden="true">${icon('wallet', 'ic--sm')}</span></a>`}`;
}
function navItems(active) {
  const openCalls = state.calls.filter((c) => !c.result).length;
  return `${V.sportsNav(active, 'snav--side')}
    <hr />
    <a class="snav__i" href="#/?to=calls">${icon('call', 'ic--sm')}<span>Calls</span>${openCalls ? `<b class="b--call">${openCalls}</b>` : ''}</a>
    <a class="snav__i${active === 'betslip' ? ' is-on' : ''}" href="#/betslip"${active === 'betslip' ? ' aria-current="page"' : ''}>${icon('ticket', 'ic--sm')}<span>Slip</span>${state.slip.length ? `<b class="b--slip">${state.slip.length}</b>` : ''}</a>
    <a class="snav__i" href="#casino">${icon('casino', 'ic--sm')}<span>Casino</span></a>`;
}
function renderNav(active) { $('[data-nav-side]').innerHTML = navItems(active); }
function renderMenu() {
  $('#dlg-menu').innerHTML = `<div class="dlg__h">${logo(true)}<button type="button" class="x" data-close aria-label="Close menu">${icon('x')}</button></div>
    <div class="dlg__b">${navItems(route.name === 'match' ? match(route.id)?.sport : route.name)}<button type="button" class="btn btn--line btn--block" data-open="demo">${icon('sliders', 'ic--sm')} Demo states</button><p class="hint">Sample data. Demo USDT, no real money.</p></div>`;
}
function renderDemo() {
  const d = state.demo;
  const slipN = state.slip.length;
  const tg = (k, label, hint) => `<label class="tg"><input type="checkbox" data-demo="${k}" ${d[k] ? 'checked' : ''} /><span class="tg__sw" aria-hidden="true"></span><span><b>${label}</b><small>${hint}</small></span></label>`;
  const slipSusp = state.slip.some((s) => SUSP.has(s.selId.split('|').slice(0, 2).join('|')));
  $('#dlg-demo').innerHTML = `<div class="dlg__h"><h2 id="demo-h">${icon('sliders', 'ic--sm')} Demo states</h2><button type="button" class="x" data-close aria-label="Close demo states">${icon('x')}</button></div>
    <div class="dlg__b demo-p">
      <p class="hint">Trigger every state on demand. Sample data, demo USDT.</p>
      ${tg('nothingLive', 'Nothing live', 'Live and Sports home switch to Starting soon')}
      ${tg('failNext', 'Next bet fails', 'Place once to see the failed state')}
      ${tg('signedOut', 'Signed out', 'Shell shows Log in and Register')}
      ${tg('paused', 'Pause live updates', 'Freezes clocks and price moves')}
      <h3 class="demo-p__h">Slip and match</h3>
      <div class="demo-p__g">
        <button type="button" class="btn btn--line btn--sm" data-demo-act="odds" ${slipN ? '' : 'disabled'}>Change odds in slip</button>
        <button type="button" class="btn btn--line btn--sm" data-demo-act="suspend-sel" ${slipN ? '' : 'disabled'}>${slipSusp ? 'Reopen slip pick' : 'Suspend a slip pick'}</button>
        <button type="button" class="btn btn--line btn--sm" data-demo-act="suspend-match">${SUSP_MATCH.has('ars-bha') ? 'Reopen' : 'Suspend'} Arsenal v Brighton</button>
        <button type="button" class="btn btn--line btn--sm" data-demo-act="goal">Goal for Brighton</button>
      </div>
      ${slipN ? '' : '<p class="hint">Add a price to the slip to unlock the slip states.</p>'}
      <h3 class="demo-p__h">Calls</h3>
      <div class="demo-p__g">
        <button type="button" class="btn btn--line btn--sm" data-demo-act="seed-calls">Reset sample calls</button>
        <button type="button" class="btn btn--line btn--sm" data-demo-act="clear-calls">Clear all calls</button>
        <button type="button" class="btn btn--line btn--sm" data-demo-act="move-calls">Move prices on calls</button>
      </div>
      <button type="button" class="lnk" data-demo-act="reset">${icon('refresh', 'ic--xs')} Reset prototype</button>
    </div>`;
}

// ---------- routing ----------
let route = { name: 'home' };
let navigated = false;
function currentRoute() {
  const { parts, q } = parseHash();
  const [a, b] = parts;
  if (!a) return { name: 'home', q };
  if (a === 'live') return { name: 'live', q };
  if (a === 'football') return { name: 'football', q };
  if (a === 'sport' && sport(b)) return { name: b === 'football' ? 'football' : b, q };
  if (a === 'match') return { name: 'match', id: b, q };
  if (a === 'betslip') return { name: 'betslip', q };
  return null;
}
function renderMain({ keepScroll = false, keepFocus = false } = {}) {
  const r = currentRoute();
  if (!r) return;
  const sameView = r.name === route.name && r.id === route.id;
  if (!sameView) { state.callFilter = null; state.boardAll = false; }
  route = r;
  const main = $('#main');
  const y = scrollY;
  const f = keepFocus && captureFocus(main);
  const openDetails = sameView ? $$('details[open]', main).map((d) => d.id || d.closest('[data-call]')?.dataset.call).filter(Boolean) : [];
  let html, t;
  switch (r.name) {
    case 'home': html = V.pageHome(); t = 'Sports home'; break;
    case 'live': html = V.pageLive(r.q); t = 'Live'; break;
    case 'football': html = V.pageSport('football', r.q); t = 'Football'; break;
    case 'match': { const mt = match(r.id); if (!sameView) state.mq = ''; html = V.pageMatch(r.id, r.q); t = mt ? V.title(mt) : 'Match'; break; }
    case 'betslip': html = V.betslipPage(); t = 'Bet slip & My bets'; break;
    default: html = V.pageSport(r.name, r.q); t = sport(r.name).name;
  }
  main.innerHTML = html;
  openDetails.forEach((id) => { const d = document.getElementById(id) || $(`[data-call="${id}"] details`, main); if (d) d.open = true; });
  document.title = `${t} · Housebets Calls (prototype v3)`;
  document.body.dataset.route = r.name;
  renderNav(r.name === 'match' ? match(r.id)?.sport : r.name);
  $$('[data-bn]').forEach((el) => el.classList.toggle('is-on', r.name !== 'betslip'));
  wireSearch(main);
  const to = r.q.get('to');
  const league = r.q.get('league');
  if (to === 'calls' && !sameView && $('#calls')) requestAnimationFrame(() => { $('#calls').scrollIntoView({ block: 'start' }); });
  else if (keepScroll || sameView) scrollTo(0, y);
  else scrollTo(0, 0);
  if (f) restoreFocus(main, f);
  else if (!sameView && !keepScroll && navigated) (to === 'calls' ? $('#calls h2', main) : $('h1', main))?.focus({ preventScroll: true });
  void league;
}
function renderSlips({ keepFocus = true } = {}) {
  const side = $('[data-side]');
  const fs = keepFocus && captureFocus(side);
  side.innerHTML = V.slipPanel();
  if (fs) restoreFocus(side, fs);
  if (route.name === 'betslip') renderMain({ keepScroll: true, keepFocus: true });
  renderBar();
  renderTop();
  renderNav(route.name === 'match' ? match(route.id)?.sport : route.name);
}
function renderBar() {
  const n = state.slip.length;
  const sm = (() => { let st = 0, rt = 0, ready = 0, warn = 0; for (const s of state.slip) { const v = num(s.stake); const su = !selection(s.selId) || isSuspended(s.selId); if (su || (selection(s.selId) && oddsOf(s.selId) !== s.accepted)) warn++; if (v && !su) { st += v; rt += v * oddsOf(s.selId); ready++; } } return { st, rt, ready, warn }; })();
  const bar = $('[data-mbar]');
  bar.hidden = route.name === 'betslip';
  const openN = state.bets.filter((b) => b.status === 'open').length;
  const exp = document.body.classList.contains('sheet-on');
  bar.innerHTML = `<button type="button" class="mbar__a${n ? '' : ' mbar__a--e'}${sm.warn ? ' is-warn' : ''}" data-act="sheet" aria-expanded="${exp}" aria-controls="slip-panel">${n
    ? `<span class="mbar__n">${n}</span><span class="mbar__t"><b>Bet slip</b><small>${sm.warn ? 'Check your picks' : sm.ready ? `Returns ${usdt(sm.rt)}` : 'Enter a stake'}</small></span><span class="mbar__go">${sm.ready ? usdt(sm.st) : 'Open'} ${icon('chevUp', 'ic--sm')}</span>`
    : `${icon('ticket', 'ic--sm')}<span class="mbar__t"><b>Bet slip</b><small>Tap a price or take a call</small></span><span class="mbar__go">My bets ${openN} ${icon('chevUp', 'ic--sm')}</span>`}</button>`;
}
function sheet(on) {
  if (mqDesk.matches) { if (on) { state.panelTab = state.panelTab || 'slip'; } return; }
  document.body.classList.toggle('sheet-on', on);
  renderBar();
  if (on) $('[data-side] [data-ptab]')?.focus({ preventScroll: true });
}
function captureFocus(root) {
  const a = document.activeElement;
  if (!a || !root.contains(a)) return null;
  for (const attr of ['data-stake', 'data-mq', 'data-ptab', 'data-btab', 'data-ctab', 'data-bview', 'data-act', 'data-cash', 'data-cash-yes', 'data-cash-no', 'data-sel', 'data-follow', 'data-remove', 'data-quick', 'data-toggle-mk', 'data-collapse-all', 'data-take', 'data-post', 'data-callfilter']) {
    if (a.hasAttribute(attr)) return { sel: `[${attr}="${CSS.escape(a.getAttribute(attr))}"]`, s: a.selectionStart, e: a.selectionEnd };
  }
  return null;
}
function restoreFocus(root, f) {
  const el = $$(f.sel, root).find((x) => x.offsetParent !== null) || $(f.sel, root);
  if (!el) return;
  el.focus({ preventScroll: true });
  if (f.s != null && el.setSelectionRange) try { el.setSelectionRange(f.s, f.e); } catch {}
}
function patchSlip() {
  for (const s of state.slip) {
    const k = CSS.escape(s.selId);
    $$(`[data-slip-odds="${k}"]`).forEach((el) => (el.innerHTML = V.slipOdds(s)));
    $$(`[data-slip-msg="${k}"]`).forEach((el) => (el.innerHTML = V.slipMsg(s)));
    $$(`[data-ret="${k}"]`).forEach((el) => (el.innerHTML = V.retText(s)));
    $$(`[data-stake-err="${k}"]`).forEach((el) => (el.textContent = V.stakeErr(s)));
    $$(`[data-stake="${k}"]`).forEach((el) => { if (el !== document.activeElement && el.value !== s.stake) el.value = s.stake; });
  }
  $$('[data-slip-foot]').forEach((el) => { const f = captureFocus(el); el.innerHTML = V.slipFoot(); if (f) restoreFocus(el, f); });
  renderBar();
}
function patchCashouts() {
  for (const b of state.bets) if (b.status === 'open') $$(`[data-co="${b.id}"]`).forEach((el) => { const f = captureFocus(el); el.innerHTML = V.cashOutUI(b); if (f) restoreFocus(el, f); });
}
function rerenderBoards() {
  const y = scrollY;
  const f = captureFocus($('#main'));
  if (route.name === 'match') { const a = $('[data-mcalls]'); if (a) a.innerHTML = V.callsBoard({ matchId: route.id, id: 'mc-h' }); $$('[data-callouts]').forEach((el) => { const [mid, mk] = el.dataset.callouts.split('|'); const m = markets(mid).find((x) => x.id === mk); if (m) el.outerHTML = V.callouts(m) || '<span hidden></span>'; }); }
  else if (route.name === 'home') { const h = $('.home__calls'); if (h) h.innerHTML = V.callsBoard({ limit: 6 }); }
  if (f) restoreFocus($('#main'), f);
  scrollTo(0, y);
}

// ---------- toast ----------
let toastT;
function toast(html, kind = '') {
  const t = $('#toast');
  t.className = `toast is-on ${kind}`;
  const i = html.indexOf('</svg>');
  t.innerHTML = i > 0 ? `${html.slice(0, i + 6)}<span>${html.slice(i + 6).trim()}</span>` : `<span>${html}</span>`;
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('is-on'), 3000);
}
const bump = () => { const b = $('[data-mbar] .mbar__a'); if (!b) return; b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); };

// ---------- search (teams, players, competitions, markets) ----------
const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const INDEX = (() => {
  const out = [];
  const firstMatchOf = (tid) => MATCHES.filter((m) => m.home === tid || m.away === tid).sort((a, b) => (b.live ? 1 : 0) - (a.live ? 1 : 0))[0];
  for (const t of Object.values(TEAMS)) {
    const m = firstMatchOf(t.id);
    if (!m) continue;
    const isPlayer = t.pattern === 'player';
    out.push({ type: isPlayer ? 'Players' : 'Teams', title: t.name, sub: `${m.live ? 'Live now · ' : ''}${V.title(m)}`, href: m.sport === 'football' && !m.live ? `#/football?team=${t.id}` : `#/match/${m.id}` });
  }
  const done = new Set();
  for (const m of MATCHES.filter((x) => x.sport === 'football')) for (const tid of [m.home, m.away]) {
    if (done.has(tid)) continue; done.add(tid);
    squad(tid).forEach((n) => out.push({ type: 'Players', title: n, sub: `${TEAMS[tid].name} · goalscorer markets`, href: `#/match/${m.id}?g=Goalscorers` }));
  }
  for (const c of COMPS) out.push({ type: 'Competitions', title: c.name, sub: `${sport(c.sport).name} · ${c.region}`, href: c.sport === 'football' ? (V.FOOTBALL_COMPS.includes(c.id) ? `#/football?league=${c.id}` : `#/live?sport=football&comp=${c.id}`) : `#/sport/${c.sport}` });
  for (const mk of markets('ars-bha')) out.push({ type: 'Markets', title: mk.name, sub: `Arsenal v Brighton & Hove Albion · ${mk.group}`, href: `#/match/ars-bha?g=${encodeURIComponent(mk.group)}` });
  out.forEach((o) => (o.key = norm(`${o.title} ${o.sub}`)));
  return out;
})();
function searchResults(q) {
  const toks = norm(q).trim().split(/\s+/).filter(Boolean);
  if (!toks.length) return null;
  const hits = INDEX.filter((o) => toks.every((t) => o.key.includes(t))).map((o) => {
    const tt = norm(o.title); const inTitle = toks.every((t) => tt.includes(t));
    return { o, inTitle, s: (tt.startsWith(toks[0]) ? 0 : 1) + (inTitle ? 0 : 2) };
  }).filter((h) => h.inTitle || h.o.type !== 'Players').sort((a, b) => a.s - b.s);
  return ['Teams', 'Players', 'Competitions', 'Markets'].map((g) => [g, hits.filter((h) => h.o.type === g).slice(0, 4).map((h) => h.o)]).filter(([, l]) => l.length);
}
const hl = (text, q) => {
  const tok = norm(q).trim().split(/\s+/)[0]; const i = tok ? norm(text).indexOf(tok) : -1;
  return i < 0 ? esc(text) : `${esc(text.slice(0, i))}<mark>${esc(text.slice(i, i + tok.length))}</mark>${esc(text.slice(i + tok.length))}`;
};
function wireSearch(root) {
  $$('[data-search]', root).forEach((box) => {
    if (box.dataset.wired) return;
    box.dataset.wired = '1';
    const input = $('input', box), pop = $('.search__pop', box);
    let active = -1;
    const items = () => $$('[role="option"]', pop);
    const close = () => { pop.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); active = -1; };
    const draw = () => {
      const q = input.value; const res = searchResults(q); let html;
      if (!res) {
        const sug = [['Teams', 'Arsenal', '#/match/ars-bha'], ['Players', squad('bha')[0], '#/match/ars-bha?g=Goalscorers'], ['Competitions', 'Champions League', '#/football?league=ucl'], ['Markets', 'Total corners', '#/match/ars-bha?g=Corners%20%26%20cards']];
        html = `<p class="search__g">Try</p><div class="search__sug">${sug.map(([g, t, h], i) => `<a role="option" id="${input.id}-o${i}" class="search__o search__o--chip" href="${h}"><small>${g}</small>${esc(t)}</a>`).join('')}</div>`;
      } else if (!res.length) html = `<div class="search__none"><b>No results for “${esc(q)}”</b><p>Search a team, a player, a competition or a market such as “corners”.</p></div>`;
      else { let i = 0; html = res.map(([g, l]) => `<p class="search__g">${g}</p>${l.map((o) => `<a role="option" id="${input.id}-o${i++}" class="search__o" href="${o.href}"><span>${hl(o.title, q)}</span><small>${esc(o.sub)}</small></a>`).join('')}`).join(''); }
      pop.innerHTML = html; pop.hidden = false; input.setAttribute('aria-expanded', 'true'); active = -1;
    };
    input.addEventListener('input', draw);
    input.addEventListener('focus', draw);
    input.addEventListener('keydown', (e) => {
      const it = items();
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault(); if (pop.hidden) draw();
        active = (active + (e.key === 'ArrowDown' ? 1 : -1) + it.length) % it.length;
        it.forEach((x, j) => x.classList.toggle('is-act', j === active));
        if (it[active]) { input.setAttribute('aria-activedescendant', it[active].id); it[active].scrollIntoView({ block: 'nearest' }); }
      } else if (e.key === 'Enter' && it[active >= 0 ? active : 0]) { e.preventDefault(); navigated = true; location.hash = it[active >= 0 ? active : 0].getAttribute('href'); close(); input.blur(); }
      else if (e.key === 'Escape' && !pop.hidden) { e.stopPropagation(); e.preventDefault(); close(); }
    });
    box.addEventListener('focusout', (e) => { if (!box.contains(e.relatedTarget)) setTimeout(close, 120); });
    pop.addEventListener('click', () => { close(); navigated = true; $('#dlg-search').open && $('#dlg-search').close(); });
  });
}
wireSearch(document.querySelector('.top'));

// ---------- dialogs ----------
function openDlg(name) {
  if (name === 'menu') { renderMenu(); $('#dlg-menu').showModal(); }
  if (name === 'search') {
    const top = $('#q-top');
    if (top && top.offsetParent) { top.focus(); return; }
    const d = $('#dlg-search'); wireSearch(d); d.showModal(); $('input', d).focus();
  }
  if (name === 'demo') { $$('dialog[open]').forEach((d) => d.close()); sheet(false); renderDemo(); $('#dlg-demo').showModal(); }
}
$$('dialog').forEach((d) => d.addEventListener('click', (e) => { if (e.target === d) d.close(); }));
let cmpLine = '';
// Housebets AI avoids repeating a line someone already posted on the same pick
function freshLine(selId, v) {
  const used = state.calls.filter((c) => c.selId === selId).map((c) => c.line.slice(0, 24));
  for (let i = 0; i < 8; i++) { const l = writeLine(selId, v + i); if (!used.includes(l.slice(0, 24))) return [l, v + i]; }
  return [writeLine(selId, v), v];
}
function openComposer(selId, betId) {
  state.composer = { selId, variant: 0, betId: betId || null };
  [cmpLine, state.composer.variant] = freshLine(selId, 0);
  const d = $('#dlg-post');
  d.innerHTML = V.composer(state.composer, cmpLine);
  d.showModal();
  $('[data-act="post-confirm"]', d).focus();
}
function refreshPostSlots() {
  $$('[data-post-slot]').forEach((el) => { const b = el.querySelector('[data-post-bet]')?.dataset.postBet || el.querySelector('[data-post]')?.dataset.postBet || ''; el.innerHTML = V.postSlot(el.dataset.postSlot, b); });
}

// ---------- events ----------
function doTake(id) {
  const c = callById(id);
  const r = takeCall(id);
  if (r.res === 'locked') { toast(`${icon('lock', 'ic--sm')} ${esc(r.st.reason)}`, 'is-warn'); return; }
  if (r.res === 'closed' || r.res === 'settled') { toast(`${icon('info', 'ic--sm')} ${esc(r.st.reason)}`); return; }
  if (r.res === 'mine') { toast(`${icon('call', 'ic--sm')} That’s your own call.`); return; }
  state.panelTab = 'slip';
  if (r.res === 'already') toast(`${icon('check', 'ic--sm')} ${esc(c.pick)} is already in your slip.`);
  else {
    const now = oddsOf(c.selId);
    if (now !== c.odds) toast(`${icon('refresh', 'ic--sm')} Took ${esc(caller(c.by).name)}’s call. Price moved ${fOdds(c.odds)} → ${fOdds(now)}, so accept it in your slip.`, 'is-warn');
    else toast(`${icon('check', 'ic--sm')} Took ${esc(caller(c.by).name)}’s call: ${esc(c.pick)} at ${fOdds(now)} is in your slip.`);
    bump();
  }
  $$(`[data-sel="${CSS.escape(c.selId)}"]`).forEach(V.patchOdd);
  renderSlips({ keepFocus: false });
  rerenderBoards();
}
document.addEventListener('click', (e) => {
  const t = e.target.closest('button, a, input, summary, .scrim');
  if (!t) return;
  const ds = t.dataset;
  if (ds.sel) {
    e.preventDefault();
    if (t.getAttribute('aria-disabled') === 'true') { toast(`${icon('lock', 'ic--sm')} Suspended. Betting is paused on this market and usually reopens in seconds.`, 'is-warn'); return; }
    const res = toggleSelection(ds.sel);
    $$(`[data-sel="${CSS.escape(ds.sel)}"]`).forEach(V.patchOdd);
    if (res === 'added') {
      const sel = selection(ds.sel);
      state.panelTab = 'slip';
      toast(`${icon('check', 'ic--sm')} ${esc(sel.outcome.label)} at ${fOdds(oddsOf(ds.sel))} added to your slip`);
      bump();
    }
    renderSlips({ keepFocus: false });
    return;
  }
  if (ds.take) { e.preventDefault(); if (t.getAttribute('aria-disabled') === 'true') { const c = callById(ds.take); toast(`${icon('lock', 'ic--sm')} ${esc(callStatus(c).reason)}`, 'is-warn'); return; } doTake(ds.take); return; }
  if (ds.post) { e.preventDefault(); openComposer(ds.post, ds.postBet); return; }
  if ('openSlip' in ds) { e.preventDefault(); state.panelTab = 'slip'; if (mqDesk.matches) renderSlips({ keepFocus: false }); else sheet(true); return; }
  if (ds.callfilter != null && t.matches('button')) {
    state.callFilter = ds.callfilter || null;
    rerenderBoards();
    const a = $('#calls');
    if (a && state.callFilter) { a.scrollIntoView({ behavior: reduce() ? 'auto' : 'smooth', block: 'start' }); $('#mc-h')?.focus({ preventScroll: true }); }
    return;
  }
  if (ds.bview) { state.boardView = ds.bview; rerenderBoards(); return; }
  if (ds.follow) {
    e.preventDefault();
    const [k, id] = ds.follow.split(':');
    const name = k === 'teams' ? TEAMS[id].name : comp(id).name;
    const on = toggleFollow(k, id);
    toast(on ? `${starFilled('ic--sm')} Following ${esc(name)}. Pinned to Favourites${k === 'teams' ? ', and its calls are pinned on the Calls board' : ''}.` : `${icon('star', 'ic--sm')} Unfollowed ${esc(name)}.`);
    renderMain({ keepScroll: true, keepFocus: true });
    return;
  }
  if (ds.quick) {
    const [selId, v] = ds.quick.split('::');
    const s = quickStake(selId, v === 'max' ? 'max' : +v);
    if (s) { patchSlip(); $$(`[data-stake="${CSS.escape(selId)}"]`).forEach((i) => (i.value = s.stake)); }
    return;
  }
  if (ds.toggleMk) {
    const id = ds.toggleMk;
    if (state.collapsed.has(id)) state.collapsed.delete(id); else state.collapsed.add(id);
    const sec = t.closest('.mk');
    const open = !state.collapsed.has(id);
    sec.classList.toggle('is-col', !open); t.setAttribute('aria-expanded', open); sec.querySelector('.mk__b').hidden = !open;
    return;
  }
  if (ds.collapseAll) {
    const ids = markets(ds.collapseAll).map((m) => m.id);
    if (state.collapsed.size) state.collapsed.clear(); else ids.forEach((i) => state.collapsed.add(i));
    renderMain({ keepScroll: true, keepFocus: true });
    return;
  }
  if (ds.ptab) { state.panelTab = ds.ptab; renderSlips(); return; }
  if (ds.btab) { state.betsTab = ds.btab; renderSlips(); return; }
  if (ds.ctab) { state.callsTab = ds.ctab; renderSlips(); return; }
  if (ds.remove) { removeSelection(ds.remove); $$(`[data-sel="${CSS.escape(ds.remove)}"]`).forEach(V.patchOdd); renderSlips({ keepFocus: false }); return; }
  if (ds.cash) { state.cashing = ds.cash; patchCashouts(); $(`[data-co="${ds.cash}"] [data-cash-yes]`)?.focus(); return; }
  if (ds.cashNo) { state.cashing = null; patchCashouts(); return; }
  if (ds.cashYes) {
    const v = cashOut(ds.cashYes);
    if (v === false) toast(`${icon('lock', 'ic--sm')} Cash out is suspended right now. Try again in a moment.`, 'is-warn');
    else { toast(`${icon('check', 'ic--sm')} Cashed out ${usdt(v)}. It’s in your balance.`); state.betsTab = 'settled'; renderSlips({ keepFocus: false }); }
    return;
  }
  if (ds.open) { e.preventDefault(); openDlg(ds.open); return; }
  if ('close' in ds) { t.closest('dialog').close(); return; }
  if (ds.demoAct) { demoAct(ds.demoAct); return; }
  if (ds.act) {
    const a = ds.act;
    if (a === 'sheet') { sheet(!document.body.classList.contains('sheet-on')); return; }
    if (a === 'sheet-close') { sheet(false); $('[data-mbar] button')?.focus(); return; }
    if (a === 'place') placeBets();
    if (a === 'accept') { acceptChanges(); toast(`${icon('check', 'ic--sm')} New prices accepted. Check returns, then place.`); }
    if (a === 'dismiss') dismissStatus();
    if (a === 'view-bets') { dismissStatus(); state.panelTab = 'bets'; state.betsTab = 'open'; renderSlips({ keepFocus: false }); }
    if (a === 'login') toast(`${icon('user', 'ic--sm')} Log in is outside this prototype. Turn off “Signed out” in Demo states to keep betting.`);
    if (a === 'sample') {
      for (const [id, st] of [['ars-bha|mr|0', '10'], ['liv-mun|mr|1', '5']]) { if (!inSlip(id)) toggleSelection(id); setStake(id, st); }
      $$('[data-sel]').forEach(V.patchOdd); renderSlips({ keepFocus: false });
      toast(`${icon('check', 'ic--sm')} Added 2 sample picks with stakes.`);
    }
    if (a === 'seed-calls') { resetCalls(); toast(`${icon('call', 'ic--sm')} Sample calls loaded.`); }
    if (a === 'board-more') { state.boardAll = !state.boardAll; rerenderBoards(); }
    if (a === 'rewrite' && state.composer) { [cmpLine, state.composer.variant] = freshLine(state.composer.selId, state.composer.variant + 1); $('[data-cmp-line]').textContent = cmpLine; }
    if (a === 'post-confirm' && state.composer) {
      const c = postCall(state.composer.selId, cmpLine, state.composer.betId);
      $('#dlg-post').close();
      state.composer = null;
      if (c) toast(`${icon('call', 'ic--sm')} Call posted at ${fOdds(c.odds)}. It’s on the Calls board.`);
      refreshPostSlots(); rerenderBoards(); renderNav(route.name === 'match' ? match(route.id)?.sport : route.name);
    }
    if (a === 'clear') {
      if (!t.classList.contains('is-arm')) { t.classList.add('is-arm'); t.textContent = 'Tap again to remove all'; setTimeout(() => { if (t.isConnected) { t.classList.remove('is-arm'); t.textContent = 'Remove all'; } }, 3000); return; }
      clearSlip();
    }
    return;
  }
  if (t.matches('a[href="#casino"], a[href="#chat"], a[href="#wallet"]')) { e.preventDefault(); toast(`${icon('info', 'ic--sm')} That lives on the main Housebets site. This prototype covers Sports.`); return; }
  if (t.matches('a[href^="#/"]')) {
    navigated = true;
    if ('keepScroll' in ds) { e.preventDefault(); history.replaceState(null, '', t.getAttribute('href')); renderMain({ keepScroll: true }); }
    else if (t.getAttribute('href') === location.hash) { e.preventDefault(); sheet(false); if (currentRoute().q.get('to') === 'calls') $('#calls')?.scrollIntoView({ block: 'start' }); }
  }
});
document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.dataset.stake != null) {
    let v = t.value.replace(',', '.').replace(/[^\d.]/g, '');
    const parts = v.split('.');
    if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('');
    if (v.includes('.')) v = v.slice(0, v.indexOf('.') + 3);
    if (v !== t.value) { const p = Math.max(0, t.selectionStart - (t.value.length - v.length)); t.value = v; t.setSelectionRange(p, p); }
    setStake(t.dataset.stake, v);
    patchSlip();
  }
  if (t.dataset.mq != null) {
    state.mq = t.value;
    const ml = $('[data-mlist]');
    const g = currentRoute().q.get('g');
    if (ml) ml.innerHTML = V.marketList(ml.dataset.mlist, g && g !== 'All' ? g : 'All');
  }
});
document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.compSelect != null) {
    const p = new URLSearchParams(); if (t.dataset.compSelect !== 'all') p.set('sport', t.dataset.compSelect); if (t.value !== 'all') p.set('comp', t.value);
    navigated = true; location.hash = `#/live${p.toString() ? '?' + p : ''}`; return;
  }
  const k = t.dataset.demo;
  if (!k) return;
  state.demo[k] = t.checked;
  if (k === 'paused') setPaused(t.checked);
  if (k === 'nothingLive' && t.checked) toast(`${icon('clock', 'ic--sm')} Nothing live: see Live and Sports home.`);
  renderMain({ keepScroll: true }); renderSlips({ keepFocus: false });
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.body.classList.contains('sheet-on') && !$('dialog[open]')) { sheet(false); $('[data-mbar] button')?.focus(); return; }
  if (e.key === '/' && !e.target.closest('input, textarea, select')) {
    e.preventDefault();
    const inPage = $('#main [data-search] input');
    if (inPage && inPage.offsetParent && inPage.getBoundingClientRect().top < innerHeight && inPage.getBoundingClientRect().bottom > 0) inPage.focus();
    else openDlg('search');
  }
});

function demoAct(a) {
  if (a === 'reset') { resetAll(); return; }
  if (a === 'odds') { state.slip.forEach((s, i) => { if (!isSuspended(s.selId) && selection(s.selId)) setOdds(s.selId, oddsOf(s.selId) * (i % 2 ? 0.9 : 1.12)); }); toast(`${icon('refresh', 'ic--sm')} Prices moved in your slip. The player must accept.`, 'is-warn'); }
  if (a === 'suspend-sel') {
    const any = state.slip.find((x) => SUSP.has(x.selId.split('|').slice(0, 2).join('|')));
    const [m, mk] = (any || state.slip[0]).selId.split('|');
    suspendMarket(m, mk, !any);
  }
  if (a === 'suspend-match') suspendMatch('ars-bha', SUSP_MATCH.has('ars-bha') ? null : 'Possible goal under review.');
  if (a === 'goal') { goal('ars-bha', 1); toast(`${icon('football', 'ic--sm')} Goal, Brighton. Markets and calls lock while prices update.`, 'is-warn'); }
  if (a === 'seed-calls') { resetCalls(); toast(`${icon('call', 'ic--sm')} Sample calls reset.`); }
  if (a === 'clear-calls') { clearCalls(); toast(`${icon('call', 'ic--sm')} All calls cleared. The Calls board shows its empty state.`); }
  if (a === 'move-calls') {
    const seen = new Set();
    state.calls.filter((c) => !c.result && !c.mine && selection(c.selId) && !isSuspended(c.selId)).forEach((c, i) => { if (seen.has(c.selId)) return; seen.add(c.selId); setOdds(c.selId, c.odds * (i % 2 ? 0.86 : 1.15)); });
    toast(`${icon('refresh', 'ic--sm')} Prices moved on open calls. Housebets AI marks them stale.`, 'is-warn');
  }
  $('#dlg-demo').close();
  if ((a === 'goal' || a === 'suspend-match') && !(route.name === 'match' && route.id === 'ars-bha')) { navigated = true; location.hash = '#/match/ars-bha'; }
  if (a === 'odds' || a === 'suspend-sel') { state.panelTab = 'slip'; renderSlips({ keepFocus: false }); if (!mqDesk.matches && route.name !== 'betslip') sheet(true); }
  if (a === 'seed-calls' || a === 'clear-calls' || a === 'move-calls') { rerenderBoards(); renderSlips({ keepFocus: false }); }
}

// ---------- live wiring ----------
const flashT = new Map();
let callsPatchQueued = false;
const queueCalls = () => { if (callsPatchQueued) return; callsPatchQueued = true; requestAnimationFrame(() => { callsPatchQueued = false; V.patchCalls(); }); };
onOdds((ev) => {
  if (ev.type === 'odds') {
    const k = CSS.escape(ev.selId);
    $$(`[data-sel="${k}"]`).forEach(V.patchOdd);
    clearTimeout(flashT.get(ev.selId));
    flashT.set(ev.selId, setTimeout(() => $$(`[data-sel="${k}"]`).forEach(V.patchOdd), 2500));
    if (inSlip(ev.selId)) patchSlip();
    if (state.bets.some((b) => b.selId === ev.selId && b.status === 'open')) patchCashouts();
    if (state.calls.some((c) => c.selId === ev.selId)) queueCalls();
  } else if (ev.type === 'susp') {
    $$(`[data-sel^="${CSS.escape(ev.matchId)}|"]`).forEach(V.patchOdd);
    V.patchMarketStates();
    if (state.slip.some((s) => s.selId.startsWith(ev.matchId + '|'))) patchSlip();
    patchCashouts();
    queueCalls();
  } else if (ev.type === 'score' || ev.type === 'reprice') {
    renderMain({ keepScroll: true, keepFocus: true }); renderSlips();
  }
});
subscribe((what) => {
  if (what === 'slip' || what === 'all') { renderSlips(); $$('[data-sel]').forEach(V.patchOdd); }
  if (what === 'calls' || what === 'all') { rerenderBoards(); }
});
setInterval(() => { if (!state.demo.paused) V.patchClocks(); }, 1000);
window.addEventListener('hashchange', () => { $$('dialog[open]').forEach((d) => d.close()); document.body.classList.remove('sheet-on'); if (!currentRoute()) return; renderMain(); renderBar(); });
mqDesk.addEventListener('change', () => { document.body.classList.remove('sheet-on'); renderBar(); });

renderTop();
renderMain();
renderSlips();
startEngine();
