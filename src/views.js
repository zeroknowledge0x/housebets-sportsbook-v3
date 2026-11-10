import { MATCHES, COMPS, SPORTS, TEAMS, comp, sport, match } from './data.js';
import { markets, groupsOf, mainMarket, odds, ODDS, isSuspended, marketSuspended, liveInfo, SUSP_MATCH, selection } from './markets.js';
import { state, inSlip, isFollowing, slipSummary, changed, gone, num, cashOutValue, eventName, MIN_STAKE, MAX_STAKE, openCallsOn, myCallOn, callById } from './store.js';
import { caller } from './calls.js';
import { callStatus, rankScore, rankReason, cluster, clusterLine, explain } from './ai.js';
import { icon, starFilled, crest, logo } from './icons.js';
import { esc, usdt, money, fOdds, time, dayLabel, startsIn, ago } from './util.js';

export const FOOTBALL_COMPS = ['epl', 'ucl', 'lal', 'sea', 'bun'];
export const liveMatches = () => (state.demo.nothingLive ? [] : MATCHES.filter((m) => m.live));
export const soonMatches = (n = 6, sp) => MATCHES.filter((m) => !m.live && (!sp || m.sport === sp)).sort((a, b) => a.start - b.start).slice(0, n);
export const title = (mt) => `${TEAMS[mt.home].name} v ${TEAMS[mt.away].name}`;
const nick = (id) => TEAMS[id].nick;
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

// ---------- atoms ----------
export const livePill = () => '<span class="live" translate="no">Live</span>';
const clockText = (mt, long) => { const li = liveInfo(mt); return li ? (long ? li.long : li.short) : ''; };
export const clock = (mt, long = false) => `<span class="clock" data-clock="${mt.id}" data-fmt="${long ? 'long' : 'short'}">${clockText(mt, long)}</span>`;
export function patchClocks(root = document) {
  root.querySelectorAll('[data-clock]').forEach((el) => {
    const t = clockText(match(el.dataset.clock), el.dataset.fmt === 'long');
    if (el.textContent !== t) el.textContent = t;
  });
}
export const aiTag = () => `<span class="ai" title="Written by Housebets AI">${icon('spark', 'ic--xs')}<span>AI</span></span>`;
export const avatar = (by, big = false) => { const c = caller(by); return `<span class="av${big ? ' av--lg' : ''}${c.me ? ' av--me' : ''}" style="--h:${c.hue}" aria-hidden="true">${c.init}</span>`; };

export function cell(o, { label = o.short || o.label, showLabel = true } = {}) {
  const v = odds(o.selId);
  const susp = isSuspended(o.selId);
  const on = inSlip(o.selId);
  const st = ODDS.get(o.selId);
  const recent = st && st.dir && Date.now() - st.ts < 2400 ? st.dir : '';
  return `<button type="button" class="pc${on ? ' is-on' : ''}${susp ? ' is-susp' : ''}${recent ? ' is-' + recent : ''}${showLabel ? '' : ' pc--bare'}" data-sel="${o.selId}" aria-pressed="${on}" ${susp ? 'aria-disabled="true"' : ''} aria-label="${esc(o.label)}, ${susp ? 'suspended' : 'odds ' + fOdds(v)}">
    ${showLabel ? `<span class="pc__l">${esc(label)}</span>` : ''}<span class="pc__v">${susp ? icon('lock', 'ic--xs') : `${recent ? icon(recent, 'pc__dir') : ''}<span class="pc__n">${fOdds(v)}</span>`}</span>
  </button>`;
}
export function patchOdd(btn) {
  const sel = selection(btn.dataset.sel);
  if (!sel) return;
  const tmp = document.createElement('div');
  const bare = btn.classList.contains('pc--bare');
  tmp.innerHTML = cell(sel.outcome, { label: btn.querySelector('.pc__l')?.textContent, showLabel: !bare });
  const nb = tmp.firstElementChild;
  btn.className = nb.className;
  for (const a of ['aria-pressed', 'aria-label']) btn.setAttribute(a, nb.getAttribute(a));
  if (nb.hasAttribute('aria-disabled')) btn.setAttribute('aria-disabled', 'true'); else btn.removeAttribute('aria-disabled');
  btn.querySelector('.pc__v').innerHTML = nb.querySelector('.pc__v').innerHTML;
}
const bar = (mk, opts = {}) => `<div class="pbar n${Math.min(mk.outcomes.length, 3)}" data-market="${mk.matchId}|${mk.id}">${mk.outcomes.map((o) => cell(o, opts)).join('')}</div>`;

function followBtn(kind, id, name, { label = true } = {}) {
  const on = isFollowing(kind, id);
  return `<button type="button" class="fol${on ? ' is-on' : ''}${label ? '' : ' fol--icon'}" data-follow="${kind}:${id}" aria-pressed="${on}" aria-label="${on ? 'Unfollow' : 'Follow'} ${esc(name)}">${on ? starFilled('ic--xs') : icon('star', 'ic--xs')}${label ? `<span>${on ? 'Following' : 'Follow'}</span>` : ''}</button>`;
}
const callsOnMatch = (id) => state.calls.filter((c) => c.matchId === id && !c.result).length;
const callChip = (mt) => { const n = callsOnMatch(mt.id); return n ? `<a class="cchip" href="#/match/${mt.id}?to=calls" aria-label="${plural(n, 'call')} on ${esc(title(mt))}">${icon('call', 'ic--xs')}${n}</a>` : ''; };

// ---------- search ----------
export function searchBox(id = 'q') {
  return `<div class="search" data-search>
    <label class="search__box" for="${id}">${icon('search', 'ic--sm')}<span class="sr">Search sports</span>
      <input id="${id}" name="${id}" type="search" role="combobox" aria-expanded="false" aria-controls="${id}-list" aria-autocomplete="list" autocomplete="off" spellcheck="false" placeholder="Search teams, players, competitions, markets…" />
      <kbd class="search__kbd" aria-hidden="true">/</kbd>
    </label>
    <div class="search__pop" id="${id}-list" role="listbox" aria-label="Search results" hidden></div>
  </div>`;
}
export function sportsNav(active, cls = '') {
  const items = [['home', '#/', 'Home', 'home'], ['live', '#/live', 'Live', 'live', liveMatches().length], ['football', '#/football', 'Football', 'football'],
    ...SPORTS.filter((s) => s.id !== 'football').map((s) => [s.id, `#/sport/${s.id}`, s.id === 'icehockey' ? 'Hockey' : s.name, s.icon, liveMatches().filter((m) => m.sport === s.id).length || null])];
  return `<nav class="snav ${cls}" aria-label="Sports"><ul>${items.map(([id, href, name, ic, n]) => `<li><a href="${href}" class="snav__i${active === id ? ' is-on' : ''}" data-nav="${id}"${active === id ? ' aria-current="page"' : ''}>${icon(ic, 'ic--sm')}<span>${name}</span>${n ? `<b aria-label="${n} live">${n}</b>` : ''}</a></li>`).join('')}</ul></nav>`;
}

// ---------- calls ----------
function takeBtn(c, st) {
  if (c.mine) return `<span class="tk tk--mine">${icon('call', 'ic--xs')} Your call</span>`;
  if (st.k === 'settled') return `<span class="tag tag--${c.result}">${st.label}</span>`;
  if (st.k === 'closed') return `<button type="button" class="tk" disabled>Closed</button>`;
  if (st.k === 'locked') return `<button type="button" class="tk" data-take="${c.id}" aria-disabled="true">${icon('lock', 'ic--xs')} Locked</button>`;
  if (inSlip(c.selId)) return `<a class="tk tk--in" href="#/betslip" data-open-slip>${icon('check', 'ic--xs')} In your slip</a>`;
  return `<button type="button" class="tk tk--go" data-take="${c.id}">Take call <b>${fOdds(st.now)}</b></button>`;
}
function priceLine(c, st) {
  if (st.k === 'settled' || st.k === 'closed') return `<span class="cpx"><span>Posted at</span> <b>${fOdds(c.odds)}</b></span>`;
  if (st.k === 'locked') return `<span class="cpx"><span>Posted</span> <b>${fOdds(c.odds)}</b> <span class="cpx__now">${icon('lock', 'ic--xs')} suspended</span></span>`;
  const up = st.now > c.odds;
  return `<span class="cpx"><span>Posted</span> <b>${fOdds(c.odds)}</b>${st.now !== c.odds ? ` <span class="cpx__now ${up ? 'pos' : 'neg'}">${icon(up ? 'up' : 'down', 'ic--xs')} now ${fOdds(st.now)}</span>` : ' <span class="cpx__now">same now</span>'}</span>`;
}
export function callCard(c, { lead = true, others = [], takes = null, reason = '', pinned = false } = {}) {
  const st = callStatus(c);
  const mt = c.matchId && match(c.matchId);
  const who = caller(c.by);
  const live = c.live ? `${c.live.clock}, ${c.live.score.join('–')}` : '';
  const why = st.k === 'open' ? (reason ? `${reason}. ${st.reason}` : st.reason) : st.reason;
  const n = takes ?? c.takes ?? 0;
  return `<article class="call call--${st.k}${pinned ? ' is-pin' : ''}" data-call="${c.id}" aria-label="Call by ${esc(who.name)}: ${esc(c.pick)}">
    <div class="call__bub">
      <header class="call__top">
        ${mt ? `<a class="call__ev" href="#/match/${mt.id}">${mt.live ? livePill() : ''}<span>${esc(title(mt))}</span></a>` : `<span class="call__ev"><span>${esc(c.event)}</span></span>`}
        ${pinned ? `<span class="call__pin">${icon('pin', 'ic--xs')} Pinned</span>` : `<span class="call__st call__st--${st.k}">${st.label}</span>`}
      </header>
      <p class="call__line">${esc(c.line)}</p>
      <div class="call__pick"><span class="call__sel"><b>${esc(c.pick)}</b><span>${esc(c.market)}</span></span>${priceLine(c, st)}</div>
      ${lead && st.k !== 'settled' ? `<p class="call__why" data-call-why="${c.id}" data-pre="${esc(reason)}">${aiTag()}<span>${esc(why)}</span></p>` : ''}
    </div>
    <footer class="call__by">
      ${others.length ? `<span class="avs">${[c.by, ...others.map((o) => o.by)].slice(0, 4).map((b) => avatar(b)).join('')}</span>` : avatar(c.by)}
      <span class="call__who"><b>${esc(who.name)}${others.length ? ` <span>+${others.length}</span>` : ''}</b><small>${live ? `Called at ${esc(live)}` : ago(c.at)}${others.length ? '' : ''}</small></span>
      <span class="call__n" data-takes="${c.id}">${icon('users', 'ic--xs')}${others.length ? `${others.length + 1} called, ${n} took it` : `${n} took this call`}</span>
      <span class="call__act" data-take-slot="${c.id}">${takeBtn(c, st)}</span>
    </footer>
    ${others.length ? `<details class="call__more"><summary>See all ${others.length + 1} calls on ${esc(c.pick)}</summary><ul>${[c, ...others].map((o) => { const s2 = callStatus(o); return `<li>${avatar(o.by)}<span class="cm__t"><b>${esc(caller(o.by).name)}</b><small>${esc(o.line)}</small></span><span class="cm__p">${fOdds(o.odds)}<small>${o.takes} took</small></span><span data-take-slot="${o.id}">${takeBtn(o, s2)}</span></li>`; }).join('')}</ul></details>` : ''}
  </article>`;
}
export function patchCalls(root = document) {
  root.querySelectorAll('[data-call]').forEach((el) => {
    const c = callById(el.dataset.call);
    if (!c) return;
    const st = callStatus(c);
    const k = [...el.classList].find((x) => x.startsWith('call--'));
    if (k !== 'call--' + st.k) { el.classList.remove(k); el.classList.add('call--' + st.k); }
    const s = el.querySelector('.call__st'); if (s) { s.className = `call__st call__st--${st.k}`; s.textContent = st.label; }
    const px = el.querySelector('.cpx'); const ph = priceLine(c, st); if (px && el._ph !== ph) { el._ph = ph; px.outerHTML = ph; }
    const wp = el.querySelector(`[data-call-why="${c.id}"]`);
    if (wp) { const pre = wp.dataset.pre; const t = st.k === 'open' && pre ? `${pre}. ${st.reason}` : st.reason; const sp = wp.lastElementChild; if (sp.textContent !== t) sp.textContent = t; }
  });
  root.querySelectorAll('[data-take-slot]').forEach((el) => { const c = callById(el.dataset.takeSlot); if (!c) return; const f = el.contains(document.activeElement); const h = takeBtn(c, callStatus(c)); if (el._h !== h) { el._h = h; el.innerHTML = h; if (f) el.querySelector('button,a')?.focus(); } });
}

export function callsBoard({ matchId = null, limit = 0, id = 'calls-h', headTag = 'h2' } = {}) {
  let calls = state.calls.filter((c) => !matchId || c.matchId === matchId);
  if (matchId && state.callFilter) calls = calls.filter((c) => c.selId === state.callFilter);
  const view = state.boardView;
  const fsel = matchId && state.callFilter && selection(state.callFilter);
  const head = `<header class="cb__h">
      <${headTag} id="${id}" tabindex="-1">${matchId ? 'Calls on this match' : 'Calls board'} <span class="cb__n">${plural(calls.filter((c) => !c.result).length, 'open call')}</span></${headTag}>
      <div class="seg" role="group" aria-label="Order calls"><button type="button" data-bview="ranked" aria-pressed="${view === 'ranked'}">Ranked</button><button type="button" data-bview="latest" aria-pressed="${view === 'latest'}">Latest</button></div>
    </header>
    <p class="cb__ai">${aiTag()}<span>${view === 'ranked' ? 'Ranked: calls you can take now come first, then calls on teams you follow, then live, then newest. Same picks are grouped.' : 'Every call in the order it was posted, newest first.'}</span></p>
    ${fsel ? `<p class="cb__f">${icon('call', 'ic--xs')}<span>Showing calls on <b>${esc(fsel.outcome.label)}</b>, ${esc(fsel.market.name)}</span><button type="button" class="lnk" data-callfilter="">Show all</button></p>` : ''}`;
  if (!calls.length) {
    return `<section class="cb" aria-labelledby="${id}" data-board="${matchId || 'home'}">${head}<div class="cb__empty">${icon('call')}<div><h3>${matchId ? 'No calls on this match yet' : 'No calls yet'}</h3><p>Put a single on your slip and tap <b>Post as a Call</b>. It shows here with your price and the live score.</p>${matchId ? '' : '<button type="button" class="btn btn--line btn--sm" data-act="seed-calls">Load sample calls</button>'}</div></div></section>`;
  }
  let items;
  if (view === 'latest') {
    items = [...calls].sort((a, b) => b.at - a.at).map((c) => ({ html: callCard(c, { lead: !c.result }) }));
  } else {
    items = cluster(calls).map((cl) => {
      const best = cl.list.map((c) => ({ c, r: rankScore(c, state.follows) })).sort((a, b) => a.r.s - b.r.s)[0];
      const mt = best.c.matchId && match(best.c.matchId);
      const others = cl.list.filter((x) => x !== best.c);
      return { s: best.r.s, html: callCard(best.c, { others, takes: cl.takes, pinned: best.r.pinned, reason: rankReason(best.r.st, best.r.pinned, mt?.live) }) };
    }).sort((a, b) => a.s - b.s);
  }
  const total = items.length;
  const shown = limit && !state.boardAll ? items.slice(0, limit) : items;
  return `<section class="cb" aria-labelledby="${id}" data-board="${matchId || 'home'}">${head}
    <div class="cb__l">${shown.map((x) => x.html).join('')}</div>
    ${limit && total > limit ? `<button type="button" class="btn btn--line btn--block" data-act="board-more" aria-expanded="${!!state.boardAll}">${state.boardAll ? 'Show fewer' : `Show all ${total} ${view === 'ranked' ? 'call groups' : 'calls'}`}</button>` : ''}
  </section>`;
}

// ---------- live cards + rows ----------
function liveCard(mt) {
  const li = liveInfo(mt);
  const mk = mainMarket(mt.id);
  const H = TEAMS[mt.home], A = TEAMS[mt.away];
  return `<article class="lc" data-match="${mt.id}">
    <a class="lc__m" href="#/match/${mt.id}" aria-label="${esc(title(mt))}, ${li.score.join(' to ')}, ${clockText(mt)}. Open match">
      <span class="lc__top"><span>${esc(comp(mt.comp).name)}</span>${clock(mt)}</span>
      <span class="lc__t">${crest(H, 20)}<span>${esc(H.nick)}</span><b>${li.score[0]}</b></span>
      <span class="lc__t">${crest(A, 20)}<span>${esc(A.nick)}</span><b>${li.score[1]}</b></span>
    </a>
    ${bar(mk, { showLabel: false })}
    <div class="lc__f"><a href="#/match/${mt.id}">+${markets(mt.id).length - 1} markets</a>${callChip(mt)}</div>
  </article>`;
}
function row(mt, { showComp = false } = {}) {
  const li = liveInfo(mt);
  const mk = mainMarket(mt.id);
  const team = (id, side) => `<span class="rw__t">${crest(TEAMS[id], 16)}<span class="rw__n">${esc(nick(id))}</span>${isFollowing('teams', id) ? starFilled('ic--xs rw__fav') : ''}${li ? `<b>${li.score[side]}</b>` : ''}</span>`;
  return `<li class="rw${li ? ' rw--live' : ''}" data-match="${mt.id}">
    <a class="rw__m" href="#/match/${mt.id}" aria-label="${esc(title(mt))}. ${li ? 'Live, ' + clockText(mt) : 'Starts ' + dayLabel(mt.start) + ' ' + time(mt.start)}. Open match">
      <span class="rw__w">${li ? `${clock(mt)}${livePill()}` : `<b>${time(mt.start)}</b><small>${startsIn(mt.start).startsWith('In ') ? startsIn(mt.start) : dayLabel(mt.start)}</small>`}</span>
      <span class="rw__ts">${team(mt.home, 0)}${team(mt.away, 1)}${showComp ? `<small>${esc(comp(mt.comp).name)}</small>` : ''}</span>
    </a>
    ${bar(mk, { showLabel: false })}
    <span class="rw__c">${callChip(mt)}</span>
  </li>`;
}
const rows = (list, o) => `<ul class="rws">${list.map((m) => row(m, o)).join('')}</ul>`;

// ---------- 1 · Sports home ----------
export function pageHome() {
  const live = liveMatches();
  const fav = [...state.follows.comps.map((c) => ['comps', c, comp(c).name]), ...state.follows.teams.map((t) => ['teams', t, TEAMS[t].name])];
  return `<h1 class="sr" tabindex="-1">Sports home</h1>
    <div class="home-search">${searchBox('q-home')}</div>
    ${sportsNav('home', 'snav--chips')}
    <section class="ln" aria-labelledby="h-live">
      <header class="sec-h"><h2 id="h-live">Live now</h2>${live.length ? `<a class="sec-h__a" href="#/live">All ${live.length} in play</a>` : ''}</header>
      ${live.length ? `<div class="ln__s">${live.filter((m) => m.sport === 'football').slice(0, 6).map(liveCard).join('')}</div>` : `<div class="none none--sm">${icon('clock')}<div><h3>Nothing live right now</h3><p>Starting soon is below. Prices are open now.</p></div></div>`}
    </section>
    <div class="home__g">
      <div class="home__calls" id="calls">${callsBoard({ limit: 6 })}</div>
      <aside class="home__side" aria-label="Starting soon and competitions">
        <section aria-labelledby="h-soon"><header class="sec-h"><h2 id="h-soon">Starting soon</h2></header>${rows(soonMatches(5), { showComp: true })}</section>
        <section class="topc" aria-labelledby="h-topc"><header class="sec-h"><h2 id="h-topc">Top competitions</h2></header>
          <ul>${FOOTBALL_COMPS.map((id) => { const c = comp(id); const ln = live.filter((m) => m.comp === id).length; return `<li><a href="#/football?league=${id}"><span class="topc__n">${esc(c.name)}</span><small>${esc(c.region)}${ln ? `, <em>${ln} live</em>` : ''}</small></a>${followBtn('comps', id, c.name, { label: false })}</li>`; }).join('')}</ul>
        </section>
        <section class="favs" aria-labelledby="h-fav"><header class="sec-h"><h2 id="h-fav">Favourites</h2><a class="sec-h__a" href="#/football">Follow more</a></header>
          ${fav.length ? `<ul class="favs__chips">${fav.map(([k, id, name]) => `<li>${k === 'teams' ? crest(TEAMS[id], 16) : starFilled('ic--xs favs__star')}<a href="${k === 'teams' ? `#/football?team=${id}` : `#/football?league=${id}`}">${esc(name)}</a><button type="button" data-follow="${k}:${id}" aria-label="Unfollow ${esc(name)}">${icon('x', 'ic--xs')}</button></li>`).join('')}</ul><p class="hint">${icon('pin', 'ic--xs')} Calls on teams you follow are pinned on the Calls board.</p>` : `<p class="hint">${icon('star', 'ic--xs')} Star a team or competition on Football to pin it here.</p>`}
        </section>
      </aside>
    </div>`;
}

// ---------- 2 · Live ----------
export function pageLive(q) {
  const sp = q.get('sport') || 'all';
  const cp = q.get('comp') || 'all';
  const all = liveMatches();
  const bySport = sp === 'all' ? all : all.filter((m) => m.sport === sp);
  const list = cp === 'all' ? bySport : bySport.filter((m) => m.comp === cp);
  const compsHere = [...new Set(bySport.map((m) => m.comp))];
  const href = (s, c) => { const p = new URLSearchParams(); if (s !== 'all') p.set('sport', s); if (c !== 'all') p.set('comp', c); return `#/live${p.toString() ? '?' + p : ''}`; };
  const groups = [...new Set(list.map((m) => m.comp))];
  const soon = soonMatches(6, sp === 'all' ? null : sp);
  return `<header class="ph"><h1 tabindex="-1">Live</h1><p>${plural(all.length, 'match')} in play. Scores, clocks and prices update as they happen.</p></header>
    <div class="fbar">
      <nav class="chips" aria-label="Filter by sport">${[['all', 'All sports', 'live', all.length], ...SPORTS.map((s) => [s.id, s.name, s.icon, all.filter((m) => m.sport === s.id).length])].map(([id, n, ic, c]) => `<a href="${href(id, 'all')}" class="chip${sp === id ? ' is-on' : ''}"${sp === id ? ' aria-current="true"' : ''}>${icon(ic, 'ic--xs')}<span>${n}</span><b>${c}</b></a>`).join('')}</nav>
      <label class="sel"><span>Competition</span><select data-comp-select="${sp}" name="comp">${['all', ...compsHere].map((c) => `<option value="${c}"${cp === c ? ' selected' : ''}>${c === 'all' ? `All competitions (${bySport.length})` : `${esc(comp(c).name)} (${bySport.filter((m) => m.comp === c).length})`}</option>`).join('')}</select></label>
    </div>
    ${list.length ? groups.map((g) => { const c = comp(g); return `<section class="lg" aria-labelledby="lv-${g}"><h2 class="lg__h" id="lv-${g}">${icon(sport(c.sport).icon, 'ic--xs')} ${esc(c.name)} <small>${esc(c.region)}</small></h2><div class="lcg">${list.filter((m) => m.comp === g).map(liveCard).join('')}</div></section>`; }).join('')
      : `<div class="none">${icon('clock')}<div><h2>Nothing live${sp === 'all' ? '' : ' in ' + esc(sport(sp).name.toLowerCase())} right now</h2><p>These start soon, and you can bet on them now.</p></div></div>
         ${soon.length ? `<section class="lg" aria-labelledby="lv-soon"><h2 class="lg__h" id="lv-soon">Starting soon</h2>${rows(soon, { showComp: true })}</section>` : `<p class="hint">No matches in the next few hours. <a href="#/live">Show all sports</a></p>`}`}`;
}

// ---------- 3 · Football (and other sports) ----------
export function pageSport(id, q) {
  const isF = id === 'football';
  const s = sport(id);
  const comps = isF ? FOOTBALL_COMPS : COMPS.filter((c) => c.sport === id).map((c) => c.id);
  const team = q.get('team');
  const league = q.get('league');
  const onlyFollowed = q.get('show') === 'following';
  const shownComps = league && comps.includes(league) ? [league] : comps;
  const sections = shownComps.map((cid) => {
    const c = comp(cid);
    let list = MATCHES.filter((m) => m.comp === cid && !(state.demo.nothingLive && m.live));
    if (team) list = list.filter((m) => m.home === team || m.away === team);
    if (onlyFollowed && !isFollowing('comps', cid)) list = list.filter((m) => isFollowing('teams', m.home) || isFollowing('teams', m.away));
    if (!list.length && (team || onlyFollowed)) return '';
    list.sort((a, b) => (b.live ? 1 : 0) - (a.live ? 1 : 0) || (a.start || 0) - (b.start || 0));
    const teamsIn = [...new Set(MATCHES.filter((m) => m.comp === cid).flatMap((m) => [m.home, m.away]))];
    const n = list[0] ? mainMarket(list[0].id).outcomes.length : 3;
    return `<section class="lg" id="${cid}" aria-labelledby="lg-${cid}">
      <header class="lg__hd"><h2 class="lg__h" id="lg-${cid}">${esc(c.name)} <small>${esc(c.region)}</small></h2>${followBtn('comps', cid, c.name)}<span class="cols n${n}" aria-hidden="true">${n === 3 ? '<span>1</span><span>X</span><span>2</span>' : '<span>1</span><span>2</span>'}</span></header>
      ${rows(list)}
      ${isF ? `<details class="tfol" id="tf-${cid}"><summary>${icon('star', 'ic--xs')} Follow a team in ${esc(c.name)}</summary><ul>${teamsIn.map((t) => { const on = isFollowing('teams', t); return `<li><button type="button" class="tfol__b${on ? ' is-on' : ''}" data-follow="teams:${t}" aria-pressed="${on}">${crest(TEAMS[t], 16)}${esc(TEAMS[t].name)}${on ? starFilled('ic--xs') : icon('star', 'ic--xs')}</button></li>`; }).join('')}</ul></details>` : ''}
    </section>`;
  }).join('');
  const tab = (key, label, hrefQ, on) => `<a href="#/${isF ? 'football' : 'sport/' + id}${hrefQ}" class="chip${on ? ' is-on' : ''}"${on ? ' aria-current="true"' : ''}>${label}</a>`;
  return `<header class="ph"><h1 tabindex="-1">${esc(s.name)}</h1><p>${isF ? 'Premier League, Champions League, LaLiga, Serie A and Bundesliga. Match result odds on every row.' : 'Winner odds on every row.'}</p></header>
    ${isF ? `<nav class="chips chips--tabs" aria-label="Leagues">${tab('all', 'All leagues', '', !league && !onlyFollowed && !team)}${FOOTBALL_COMPS.map((c) => tab(c, esc(comp(c).name), `?league=${c}`, league === c)).join('')}${tab('f', `${starFilled('ic--xs')} Following`, '?show=following', onlyFollowed)}</nav>` : ''}
    ${team && TEAMS[team] ? `<div class="note">${crest(TEAMS[team], 18)}<span>Matches for <b>${esc(TEAMS[team].name)}</b></span>${followBtn('teams', team, TEAMS[team].name)}<a href="#/football" aria-label="Clear team filter">${icon('x', 'ic--xs')}</a></div>` : ''}
    ${sections || `<div class="none">${icon('star')}<div><h2>Nothing followed yet</h2><p>Tap Follow on a league or star a team. It shows here and in Favourites on Sports home.</p></div></div>`}`;
}

// ---------- 4 · Match page ----------
export function pageMatch(id, q) {
  const mt = match(id);
  if (!mt) return `<div class="none">${icon('alert')}<div><h2>Match not found</h2><p>It may have finished. <a href="#/live">Go to Live</a></p></div></div>`;
  const groups = groupsOf(id);
  const g = q.get('g') && groups.includes(q.get('g')) ? q.get('g') : 'All';
  const li = liveInfo(mt);
  const H = TEAMS[mt.home], A = TEAMS[mt.away];
  const susp = SUSP_MATCH.get(id);
  return `<nav class="crumbs" aria-label="Breadcrumb"><a href="${mt.sport === 'football' ? '#/football' : '#/sport/' + mt.sport}">${esc(sport(mt.sport).name)}</a><span aria-hidden="true">/</span><a href="${mt.sport === 'football' ? '#/football?league=' + mt.comp : '#/sport/' + mt.sport}">${esc(comp(mt.comp).name)}</a></nav>
    <section class="sb${li ? ' sb--live' : ''}" aria-labelledby="sb-t">
      <h1 class="sr" id="sb-t" tabindex="-1">${esc(title(mt))}${li ? ', live' : ''}</h1>
      <div class="sb__team">${crest(H, 52)}<h2>${esc(H.name)}</h2>${followBtn('teams', H.id, H.name, { label: false })}</div>
      <div class="sb__mid">${li ? `<div class="sb__score" aria-label="Score ${li.score[0]} to ${li.score[1]}"><b>${li.score[0]}</b><i aria-hidden="true">–</i><b>${li.score[1]}</b></div><div class="sb__clock">${livePill()} ${clock(mt, true)} <span>${esc(li.period)}</span></div>${mt.sport === 'tennis' ? `<div class="sb__sets">${li.sets.map(([a, b]) => `<span>${a}–${b}</span>`).join('')}<span>${esc(li.points.join('–'))}</span></div>` : ''}`
        : `<div class="sb__ko"><b>${time(mt.start)}</b><span>${startsIn(mt.start)}</span></div>`}</div>
      <div class="sb__team sb__team--a">${crest(A, 52)}<h2>${esc(A.name)}</h2>${followBtn('teams', A.id, A.name, { label: false })}</div>
      <div class="sb__susp" data-susp-banner="${id}" role="status"${susp ? '' : ' hidden'}>${icon('lock', 'ic--sm')}<span>${esc(susp || '')}</span></div>
    </section>
    <div class="mp">
      <aside class="mp__calls" id="calls" aria-label="Calls on this match" data-mcalls="${id}">${callsBoard({ matchId: id, id: 'mc-h' })}</aside>
      <div class="mp__mk">
        <div class="mtool">
          <nav class="chips chips--tabs" aria-label="Market groups">${['All', ...groups].map((x) => `<a href="#/match/${id}${x === 'All' ? '' : '?g=' + encodeURIComponent(x)}" class="chip${x === g ? ' is-on' : ''}"${x === g ? ' aria-current="true"' : ''} data-keep-scroll>${esc(x)}</a>`).join('')}</nav>
          <div class="mtool__r">
            <label class="msearch">${icon('search', 'ic--xs')}<span class="sr">Find a market</span><input type="search" name="mq" data-mq placeholder="Find a market, e.g. corners" value="${esc(state.mq)}" autocomplete="off" spellcheck="false" /></label>
            <button type="button" class="tbtn" data-collapse-all="${id}">${state.collapsed.size ? 'Expand all' : 'Collapse all'}</button>
          </div>
        </div>
        <div class="mlist" data-mlist="${id}">${marketList(id, g)}</div>
      </div>
    </div>`;
}
export function marketList(id, g) {
  const q = state.mq.trim().toLowerCase();
  const list = markets(id).filter((m) => (g === 'All' || m.group === g) && (!q || m.name.toLowerCase().includes(q) || m.group.toLowerCase().includes(q) || m.outcomes.some((o) => o.label.toLowerCase().includes(q))));
  if (!list.length) return `<div class="none">${icon('search')}<div><h2>No markets match “${esc(state.mq)}”</h2><p>Try goals, corners, cards, handicap or a player name.</p></div></div>`;
  let lastGroup = '';
  return list.map((mk) => {
    const head = g === 'All' && mk.group !== lastGroup ? `<h3 class="mgrp">${esc(mk.group)}</h3>` : '';
    lastGroup = mk.group;
    return head + marketBlock(mk);
  }).join('');
}
function callout(o) {
  const n = openCallsOn(o.selId).length;
  return n ? `<button type="button" class="callout${state.callFilter === o.selId ? ' is-on' : ''}" data-callfilter="${o.selId}" aria-label="${plural(n, 'call')} on ${esc(o.label)}. Show them">${icon('call', 'ic--xs')}${plural(n, 'call')}</button>` : '<span></span>';
}
export function callouts(mk) {
  if (!mk.outcomes.some((o) => openCallsOn(o.selId).length)) return '';
  return `<div class="callouts n${Math.min(mk.outcomes.length, 3)}" data-callouts="${mk.matchId}|${mk.id}">${mk.outcomes.map(callout).join('')}</div>`;
}
function marketBlock(mk) {
  const susp = marketSuspended(mk.matchId, mk.id);
  const open = !state.collapsed.has(mk.id);
  let body;
  if (mk.closed) body = `<p class="mk__closed">${icon('check', 'ic--xs')} ${esc(mk.closed)}</p>`;
  else if (mk.kind === 'players') {
    const r = [];
    for (let i = 0; i < mk.outcomes.length; i += 2) r.push([mk.outcomes[i], mk.outcomes[i + 1]]);
    body = `<div class="pl"><div class="pl__h"><span>Player</span><span>${esc(mk.outcomes[0].col)}</span><span>${esc(mk.outcomes[1].col)}</span></div>${r.map(([a, b]) => { const ca = openCallsOn(a.selId).length + openCallsOn(b.selId).length; return `<div class="pl__r"><span class="pl__n">${esc(a.player)} <small>${esc(a.team)}</small>${ca ? callout(openCallsOn(b.selId).length ? b : a) : ''}</span><div class="pbar n2">${cell(a, { showLabel: false })}${cell(b, { showLabel: false })}</div></div>`; }).join('')}</div>`;
  } else body = `${mk.outcomes.length > 3 ? `<div class="pgrid" data-market="${mk.matchId}|${mk.id}">${mk.outcomes.map((o) => cell(o)).join('')}</div>` : bar(mk)}${callouts(mk)}`;
  return `<section class="mk${susp ? ' is-susp' : ''}${mk.closed ? ' is-closed' : ''}${open ? '' : ' is-col'}" data-mk="${mk.matchId}|${mk.id}">
    <h4 class="mk__h"><button type="button" data-toggle-mk="${mk.id}" aria-expanded="${open}"><span>${esc(mk.name)}</span><span class="mkt__state" data-mstate="${mk.matchId}|${mk.id}">${susp ? `${icon('lock', 'ic--xs')} Suspended` : ''}</span>${icon('chevUp', 'ic--xs mk__chev')}</button></h4>
    <div class="mk__b"${open ? '' : ' hidden'}>${body}</div>
  </section>`;
}
export function patchMarketStates(root = document) {
  root.querySelectorAll('[data-mk]').forEach((el) => { const [mid, mkid] = el.dataset.mk.split('|'); el.classList.toggle('is-susp', marketSuspended(mid, mkid)); });
  root.querySelectorAll('[data-mstate]').forEach((el) => { const [mid, mkid] = el.dataset.mstate.split('|'); el.innerHTML = marketSuspended(mid, mkid) ? `${icon('lock', 'ic--xs')} Suspended` : ''; });
  root.querySelectorAll('[data-susp-banner]').forEach((el) => { const r = SUSP_MATCH.get(el.dataset.suspBanner); el.hidden = !r; el.querySelector('span').textContent = r || ''; });
}

// ---------- 5 · Bet slip + My bets ----------
const tabs = (cls = '') => {
  const openN = state.bets.filter((b) => b.status === 'open').length;
  return `<div class="bs__sw ${cls}" role="group" aria-label="Bet slip or my bets">
    <button type="button" aria-pressed="${state.panelTab === 'slip'}" data-ptab="slip">Bet slip <b>${state.slip.length}</b></button>
    <button type="button" aria-pressed="${state.panelTab === 'bets'}" data-ptab="bets">My bets <b>${openN}</b></button>
  </div>`;
};
export function slipPanel() {
  return `<div class="bs"><div class="bs__hd"><h2 class="sr">Bet slip and my bets</h2>${tabs()}<button type="button" class="x bs__close" data-act="sheet-close" aria-label="Close bet slip">${icon('x')}</button></div>
    <div class="bs__body">${state.panelTab === 'slip' ? slipBody() : myBets()}</div></div>`;
}
export function betslipPage() {
  const openN = state.bets.filter((b) => b.status === 'open').length;
  return `<header class="ph"><h1 tabindex="-1">Bet slip &amp; My bets</h1><p>Singles, decimal odds, stakes in demo USDT. No real money.</p></header>
    <div class="bsp">
      ${tabs('bsp__sw')}
      <section class="bsp__c${state.panelTab === 'slip' ? ' is-on' : ''}" aria-labelledby="bsp-s"><h2 id="bsp-s" class="bsp__h">Bet slip <span>${state.slip.length}</span></h2>${slipBody()}</section>
      <section class="bsp__c${state.panelTab === 'bets' ? ' is-on' : ''}" aria-labelledby="bsp-b"><h2 id="bsp-b" class="bsp__h">My bets <span>${openN} open</span></h2>${myBets()}</section>
    </div>`;
}
export function slipBody() {
  const st = state.slipStatus;
  if (st && st.ok) return placedView(st);
  if (!state.slip.length) {
    return `<div class="bse">${icon('ticket')}<h3>Your slip is empty</h3><p>Tap any price, or take a call from the Calls board. Every pick is a single.</p>
      <div class="bse__a"><button type="button" class="btn btn--sm" data-act="sample">Add 2 sample picks</button><a class="btn btn--sm btn--line" href="#/?to=calls" data-goto-calls>Open Calls board</a></div></div>`;
  }
  return `<div class="slip">
    ${st && !st.ok ? `<div class="err" role="alert">${icon('alert', 'ic--sm')}<div><b>Bet failed. Your stake was not taken.</b><p>${aiTag()} ${esc(explain.failed())}</p><div class="err__a"><button type="button" class="btn btn--sm" data-act="place">Try again</button><button type="button" class="btn btn--sm btn--line" data-act="dismiss">Dismiss</button></div></div></div>` : ''}
    <p class="slip__n"><span>Singles only. Each pick is its own bet.</span><button type="button" class="lnk" data-act="clear">Remove all</button></p>
    <ul class="slip__l">${state.slip.map(slipItem).join('')}</ul>
  </div>
  <div class="slip__f" data-slip-foot>${slipFoot()}</div>`;
}
function postBtn(selId, betId = '') {
  const mine = myCallOn(selId);
  if (mine) return `<a class="post post--done" href="#/?to=calls" data-goto-calls>${icon('check', 'ic--xs')} Posted as a Call<span>${plural(mine.takes, 'take')}</span></a>`;
  if (!selection(selId)) return '';
  return `<button type="button" class="post" data-post="${selId}"${betId ? ` data-post-bet="${betId}"` : ''}>${icon('call', 'ic--xs')} Post as a Call</button>`;
}
function slipItem(s) {
  const mt = match(s.matchId);
  const li = mt && liveInfo(mt);
  const from = s.fromCall && callById(s.fromCall);
  return `<li class="si" data-slip="${s.selId}">
    <div class="si__h">
      <div class="si__w"><b>${esc(s.label)}</b><span>${esc(s.marketName)}</span><a href="#/match/${s.matchId}">${li ? `${livePill()} ${li.score.join('–')}, ` : ''}${esc(s.event)}</a></div>
      <div data-slip-odds="${s.selId}">${slipOdds(s)}</div>
      <button type="button" class="x" data-remove="${s.selId}" aria-label="Remove ${esc(s.label)}">${icon('x', 'ic--xs')}</button>
    </div>
    ${from ? `<p class="si__from">${avatar(from.by)}<span>From ${esc(caller(from.by).name)}’s call at ${fOdds(from.odds)}</span></p>` : ''}
    <div class="si__msg" data-slip-msg="${s.selId}">${slipMsg(s)}</div>
    <div class="si__s">
      <label class="stake"><span class="stake__l">Stake</span><input type="text" inputmode="decimal" name="stake-${s.selId}" data-stake="${s.selId}" value="${esc(s.stake)}" placeholder="0.00" autocomplete="off" maxlength="9" aria-label="Stake for ${esc(s.label)} in USDT" /><span class="stake__u">USDT</span></label>
      <div class="si__r"><span>Returns</span><b data-ret="${s.selId}">${retText(s)}</b></div>
    </div>
    <div class="qs" role="group" aria-label="Quick stakes for ${esc(s.label)}">${[5, 10, 25, 50, 'max'].map((v) => `<button type="button" data-quick="${s.selId}::${v}">${v === 'max' ? 'Max' : '+' + v}</button>`).join('')}</div>
    <p class="si__e" data-stake-err="${s.selId}" aria-live="polite">${stakeErr(s)}</p>
    <div class="si__post" data-post-slot="${s.selId}">${postBtn(s.selId)}</div>
  </li>`;
}
export const postSlot = postBtn;
export function slipOdds(s) {
  if (gone(s) || isSuspended(s.selId)) return `<span class="so so--s">${icon('lock', 'ic--xs')}<s>${fOdds(s.accepted)}</s></span>`;
  const v = odds(s.selId);
  if (v !== s.accepted) { const up = v > s.accepted; return `<span class="so so--${up ? 'up' : 'dn'}"><s>${fOdds(s.accepted)}</s>${icon(up ? 'up' : 'down', 'ic--xs')}<b>${fOdds(v)}</b></span>`; }
  return `<span class="so"><b>${fOdds(v)}</b></span>`;
}
export function slipMsg(s) {
  const sel = selection(s.selId);
  if (!sel) return `<p class="m m--s">${aiTag()}<span>${esc(explain.closed())}</span></p>`;
  if (isSuspended(s.selId)) return `<p class="m m--s">${aiTag()}<span>${esc(explain.suspended(SUSP_MATCH.get(s.matchId)))}</span></p>`;
  if (changed(s)) return `<p class="m m--c">${aiTag()}<span>${esc(s.fromCall && callById(s.fromCall)?.odds === s.accepted ? explain.fromCall(s.accepted, odds(s.selId)) : explain.changed(s.accepted, odds(s.selId)))}</span></p>`;
  return '';
}
export function retText(s) { const n = num(s.stake); if (!n || gone(s)) return '–'; return usdt(n * (isSuspended(s.selId) ? s.accepted : odds(s.selId))); }
export function stakeErr(s) {
  const n = num(s.stake);
  if (n && n < MIN_STAKE) return `Minimum stake is ${usdt(MIN_STAKE)}.`;
  if (n > MAX_STAKE) return `Maximum stake is ${usdt(MAX_STAKE)} per bet.`;
  return '';
}
export function slipFoot() {
  const sm = slipSummary();
  const st = state.slipStatus;
  let btn;
  if (state.demo.signedOut) btn = `<button type="button" class="btn btn--big" data-act="login">Log in to place bets</button>`;
  else if (st === 'placing') btn = `<button type="button" class="btn btn--big is-busy" aria-disabled="true"><span class="spin" aria-hidden="true"></span>Placing bets…</button>`;
  else if (sm.issues.changed) btn = `<button type="button" class="btn btn--big btn--amber" data-act="accept">${icon('refresh', 'ic--sm')} Accept new prices</button>`;
  else if (sm.issues.suspended && !sm.ready) btn = `<button type="button" class="btn btn--big" disabled>Selection suspended</button>`;
  else if (sm.issues.tooLow || sm.issues.tooHigh) btn = `<button type="button" class="btn btn--big" disabled>Check your stakes</button>`;
  else if (!sm.ready) btn = `<button type="button" class="btn btn--big" disabled>Enter a stake</button>`;
  else if (sm.overBalance) btn = `<button type="button" class="btn btn--big" disabled>Not enough balance</button>`;
  else btn = `<button type="button" class="btn btn--big" data-act="place"><span>Place ${plural(sm.ready, 'bet')}</span><b>${usdt(sm.stake)}</b></button>`;
  const notes = [];
  if (sm.issues.changed) notes.push(`<p class="fn fn--c">${icon('refresh', 'ic--xs')} ${plural(sm.issues.changed, 'price')} changed. Accept to continue.</p>`);
  if (sm.issues.suspended) notes.push(`<p class="fn fn--s">${icon('lock', 'ic--xs')} ${plural(sm.issues.suspended, 'suspended pick')} won’t be placed${sm.ready ? '; the rest will' : ''}.</p>`);
  if (sm.overBalance) notes.push(`<p class="fn fn--e">${icon('alert', 'ic--xs')} Total stake is more than your ${usdt(state.balance)} balance.</p>`);
  return `<div class="ft"><span>Total stake <b>${usdt(sm.stake)}</b></span><span class="ft__r">Potential return <b>${usdt(sm.ret)}</b></span></div>${notes.join('')}${btn}`;
}
function placedView(st) {
  const tot = st.placed.reduce((a, p) => a + p.stake, 0);
  const ret = st.placed.reduce((a, p) => a + p.stake * p.odds, 0);
  return `<div class="done" role="status">
    <div class="done__h">${icon('check')}<div><h3>${st.placed.length === 1 ? 'Bet placed' : 'Bets placed'}</h3><p>${aiTag()} ${esc(explain.placed(st.placed.length, `${money(tot)} USDT`))}</p></div></div>
    <ul class="done__l">${st.placed.map((p) => `<li><div class="done__r"><span><b>${esc(p.pick)}</b><small>${esc(p.event)}</small><small>${p.id}</small></span><span class="done__n">${usdt(p.stake)} at ${fOdds(p.odds)}<b>${usdt(p.stake * p.odds)}</b></span></div><div data-post-slot="${p.selId}">${postBtn(p.selId, p.id)}</div></li>`).join('')}</ul>
    <dl class="done__t"><div><dt>Total stake</dt><dd>${usdt(tot)}</dd></div><div><dt>Potential return</dt><dd>${usdt(ret)}</dd></div><div><dt>Balance</dt><dd>${usdt(state.balance)}</dd></div></dl>
    <p class="hint">${icon('call', 'ic--xs')} Post a bet as a Call so others can take the same single. Nobody pays or earns from a call.</p>
    <div class="done__a"><button type="button" class="btn btn--line" data-act="view-bets">Track in My bets</button><button type="button" class="btn" data-act="dismiss">Done</button></div>
  </div>`;
}
export function myBets() {
  const tab = state.betsTab;
  const open = state.bets.filter((b) => b.status === 'open');
  const settled = state.bets.filter((b) => b.status !== 'open');
  const myCalls = state.calls.filter((c) => c.mine || c.taken);
  const t = (k, l, n) => `<button type="button" aria-pressed="${tab === k}" data-btab="${k}">${l} <b>${n}</b></button>`;
  let body;
  if (tab === 'calls') body = myCallsView();
  else {
    const list = tab === 'open' ? open : settled;
    body = list.length ? `<ul class="mb__l">${list.map(betCard).join('')}</ul>` : `<div class="bse"><h3>${tab === 'open' ? 'No open bets' : 'Nothing settled yet'}</h3><p>${tab === 'open' ? 'Bets you place show here with a live cash-out value.' : 'Won, lost and cashed-out bets land here.'}</p></div>`;
  }
  return `<div class="mb"><div class="seg seg--3" role="group" aria-label="My bets view">${t('open', 'Open', open.length)}${t('settled', 'Settled', settled.length)}${t('calls', 'My calls', myCalls.length)}</div>${body}</div>`;
}
function myCallsView() {
  const sub = state.callsTab;
  const posted = state.calls.filter((c) => c.mine).sort((a, b) => b.at - a.at);
  const taken = state.calls.filter((c) => c.taken && !c.mine).sort((a, b) => b.at - a.at);
  const list = sub === 'posted' ? posted : taken;
  return `<div class="mc">
    <div class="seg seg--sm" role="group" aria-label="Posted or taken calls"><button type="button" aria-pressed="${sub === 'posted'}" data-ctab="posted">Posted <b>${posted.length}</b></button><button type="button" aria-pressed="${sub === 'taken'}" data-ctab="taken">Taken <b>${taken.length}</b></button></div>
    <p class="hint">${icon('info', 'ic--xs')} Calls carry your name and a take-count. No money moves between players.</p>
    ${list.length ? `<ul class="mc__l">${list.map(myCallCard).join('')}</ul>` : `<div class="bse"><h3>${sub === 'posted' ? 'You haven’t posted a call' : 'You haven’t taken a call'}</h3><p>${sub === 'posted' ? 'Add a single to your slip and tap Post as a Call.' : 'Tap Take call on the Calls board to put the same single on your slip.'}</p></div>`}
  </div>`;
}
function myCallCard(c) {
  const st = callStatus(c);
  const bet = c.bet && state.bets.find((b) => b.id === c.bet);
  const betTxt = bet ? (bet.status === 'open' ? `Your bet ${bet.id}: ${usdt(bet.stake)} at ${fOdds(bet.odds)}, open` : `Your bet ${bet.id}: ${{ won: 'won', lost: 'lost', cashed: 'cashed out' }[bet.status]}, returned ${usdt(bet.ret)}`) : (c.mine ? 'Posted from your slip, no bet placed' : 'Taken into your slip, not placed');
  return `<li class="mcc mcc--${st.k}" data-call="${c.id}">
    <div class="mcc__h"><span><b>${esc(c.pick)}</b><small>${esc(c.market)}, ${esc(c.event)}</small></span><span class="call__st call__st--${st.k}">${st.label}</span></div>
    <p class="mcc__line">“${esc(c.line)}”</p>
    <div class="mcc__f"><span>${c.mine ? `${icon('users', 'ic--xs')} ${c.takes} took your call` : `${avatar(c.by)} Called by ${esc(caller(c.by).name)}`}</span><span>Posted at <b>${fOdds(c.odds)}</b></span></div>
    <p class="mcc__bet">${esc(betTxt).replace(/&amp;nbsp;/g, '&nbsp;')}</p>
  </li>`;
}
function betCard(b) {
  const mt = b.matchId && match(b.matchId);
  const li = mt && b.status === 'open' && liveInfo(mt);
  const pill = { won: 'Won', lost: 'Lost', cashed: 'Cashed out' }[b.status];
  const from = state.calls.find((c) => c.bet === b.id && c.taken && !c.mine);
  const mine = state.calls.find((c) => c.bet === b.id && c.mine);
  return `<li class="bc bc--${b.status}" data-bet="${b.id}">
    <div class="bc__h"><div><b>${esc(b.pick)}</b><span>${esc(b.market)}</span></div><b class="bc__o">${fOdds(b.odds)}</b></div>
    <p class="bc__e">${li ? `${livePill()} <b>${li.score.join('–')}</b> ${clock(mt)}, ` : ''}${esc(eventName(b))}</p>
    ${from ? `<p class="bc__call">${avatar(from.by)} Taken from ${esc(caller(from.by).name)}’s call</p>` : mine ? `<p class="bc__call">${icon('call', 'ic--xs')} You posted this as a Call, ${plural(mine.takes, 'take')}</p>` : ''}
    <div class="bc__n"><span>Stake <b>${usdt(b.stake)}</b></span><span>${b.status === 'open' ? 'To return' : 'Returned'} <b>${usdt(b.status === 'open' ? b.stake * b.odds : b.ret)}</b></span></div>
    ${b.status === 'open' ? `<div data-co="${b.id}">${cashOutUI(b)}</div>` : `<p class="bc__f"><span class="tag tag--${b.status}">${pill}</span><small>${b.id}, ${ago(b.settledAt || b.placed)}</small></p>`}
  </li>`;
}
export function cashOutUI(b) {
  const v = cashOutValue(b);
  if (v == null) return `<p class="co__na">${icon('info', 'ic--xs')} Cash out isn’t offered on this bet.</p>`;
  if (isSuspended(b.selId)) return `<p class="co__ai">${aiTag()} ${esc(explain.cashoutLocked())}</p><button type="button" class="btn btn--co" disabled>${icon('lock', 'ic--xs')} Cash out suspended</button>`;
  if (state.cashing === b.id) return `<div class="co__c" role="group" aria-label="Confirm cash out"><p>${aiTag()} ${esc(explain.cashout(`${money(v)} USDT`, `${money(b.stake)} USDT`))}</p><p><b>Cash out ${usdt(v)} and close this bet?</b></p><div><button type="button" class="btn btn--sm" data-cash-yes="${b.id}">Confirm cash out</button><button type="button" class="btn btn--sm btn--line" data-cash-no="${b.id}">Keep bet</button></div></div>`;
  const diff = v - b.stake;
  return `<button type="button" class="btn btn--co" data-cash="${b.id}"><span>Cash out</span><b>${usdt(v)}</b><small class="${diff >= 0 ? 'pos' : 'neg'}">${diff >= 0 ? '+' : '−'}${money(Math.abs(diff))}</small></button>`;
}
// composer for Post as a Call
export function composer(cp, line) {
  const sel = selection(cp.selId);
  const mt = sel.match;
  const li = liveInfo(mt);
  return `<div class="dlg__h"><h2 id="cmp-h">${icon('call', 'ic--sm')} Post as a Call</h2><button type="button" class="x" data-close aria-label="Close">${icon('x')}</button></div>
    <div class="dlg__b cmp">
      <div class="call call--open call--preview">
        <div class="call__bub">
          <header class="call__top"><span class="call__ev">${li ? livePill() : ''}<span>${esc(title(mt))}${li ? `, ${li.score.join('–')} at ${li.short}` : ''}</span></span></header>
          <p class="call__line" data-cmp-line aria-live="polite">${esc(line)}</p>
          <div class="call__pick"><span class="call__sel"><b>${esc(sel.outcome.label)}</b><span>${esc(sel.market.name)}</span></span><span class="cpx"><span>Posting at</span> <b>${fOdds(odds(cp.selId))}</b></span></div>
          <p class="call__why">${aiTag()}<span>Housebets AI wrote this line from the pick, the price and the score.</span></p>
        </div>
        <footer class="call__by">${avatar('me')}<span class="call__who"><b>You</b><small>Sample display name</small></span></footer>
      </div>
      <p class="hint">${icon('info', 'ic--xs')} Calls are public. Others can take the same single at the price on offer. No one pays or earns from a call.</p>
      <div class="cmp__a"><button type="button" class="btn btn--line" data-act="rewrite">${icon('refresh', 'ic--sm')} Write another</button><button type="button" class="btn" data-act="post-confirm">${icon('send', 'ic--sm')} Post call</button></div>
    </div>`;
}
export { logo, icon, crest };
