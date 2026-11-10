import { SEED_BETS, match, TEAMS } from './data.js';
import { odds, selection, isSuspended, ODDS, hist, liveInfo } from './markets.js';
import { seedCalls } from './calls.js';
import { callStatus } from './ai.js';

const KEY = 'hb-sportsbook-v3';
const saved = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } })();

export const state = {
  balance: saved.balance ?? 250,
  slip: saved.slip ?? [], // { selId, accepted, stake }
  bets: saved.bets ?? SEED_BETS.map((b) => ({ ...b })),
  follows: saved.follows ?? { teams: ['ars'], comps: ['epl'] },
  calls: saved.calls ?? seedCalls(),
  boardView: 'ranked', // 'ranked' | 'latest'
  callsTab: 'posted', // My calls: 'posted' | 'taken'
  callFilter: null, // selId filter on the match page calls rail
  sheet: false, // phone slip sheet open
  composer: null, // { selId, variant, betId }
  slipStatus: null, // null | 'placing' | { ok:true, ids:[] } | { ok:false, msg }
  panelTab: 'slip', // 'slip' | 'bets'
  betsTab: 'open', // 'open' | 'settled' | 'calls'
  demo: { nothingLive: false, failNext: false, signedOut: false, paused: false },
  cashing: null, // bet id awaiting confirm
  activeStake: null,
  collapsed: new Set(), // collapsed market ids on the match page
  mq: '', // market search on the match page
};

const subs = new Set();
export const subscribe = (fn) => (subs.add(fn), () => subs.delete(fn));
export function commit(what = 'all') {
  try {
    localStorage.setItem(KEY, JSON.stringify({ balance: state.balance, slip: state.slip, bets: state.bets, follows: state.follows, calls: state.calls }));
  } catch { /* storage full or blocked: prototype keeps working in memory */ }
  subs.forEach((fn) => fn(what));
}
export function resetAll() {
  localStorage.removeItem(KEY);
  location.hash = '#/';
  location.reload();
}

// ---------- follows ----------
export const isFollowing = (kind, id) => state.follows[kind].includes(id);
export function toggleFollow(kind, id) {
  const list = state.follows[kind];
  const i = list.indexOf(id);
  if (i >= 0) list.splice(i, 1); else list.push(id);
  commit('follows');
  return i < 0;
}

// ---------- slip ----------
export const inSlip = (selId) => state.slip.some((s) => s.selId === selId);
export function toggleSelection(selId) {
  if (isSuspended(selId) && !inSlip(selId)) return 'suspended';
  const i = state.slip.findIndex((s) => s.selId === selId);
  if (i >= 0) state.slip.splice(i, 1);
  else {
    const sel = selection(selId);
    const mt = sel.match;
    state.slip.push({ selId, accepted: odds(selId), stake: '', label: sel.outcome.label, marketName: sel.market.name, event: `${TEAMS[mt.home].nick} v ${TEAMS[mt.away].nick}`, matchId: mt.id });
    state.activeStake = selId;
  }
  if (state.slipStatus && state.slipStatus !== 'placing') state.slipStatus = null;
  commit('slip');
  return i >= 0 ? 'removed' : 'added';
}
export function removeSelection(selId) {
  state.slip = state.slip.filter((s) => s.selId !== selId);
  commit('slip');
}
export function clearSlip() { state.slip = []; state.slipStatus = null; commit('slip'); }
export function setStake(selId, v) {
  const s = state.slip.find((x) => x.selId === selId);
  if (s) s.stake = v;
  try { localStorage.setItem(KEY, JSON.stringify({ balance: state.balance, slip: state.slip, bets: state.bets, follows: state.follows, calls: state.calls })); } catch {}
}
export const gone = (s) => !selection(s.selId);
export const changed = (s) => !gone(s) && odds(s.selId) !== s.accepted;
export function acceptChanges() {
  state.slip.forEach((s) => (s.accepted = odds(s.selId)));
  commit('slip');
}
export const MIN_STAKE = 0.1;
export const MAX_STAKE = 1000;
export const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : 0; };
export function slipSummary() {
  let stake = 0, ret = 0, ready = 0;
  const issues = { changed: 0, suspended: 0, noStake: 0, tooLow: 0, tooHigh: 0 };
  for (const s of state.slip) {
    const n = num(s.stake);
    const susp = gone(s) || isSuspended(s.selId);
    if (susp) issues.suspended++;
    else if (changed(s)) issues.changed++;
    if (!n) issues.noStake++;
    else if (n < MIN_STAKE) issues.tooLow++;
    else if (n > MAX_STAKE) issues.tooHigh++;
    if (n && !susp) { stake += n; ret += n * odds(s.selId); ready++; }
  }
  return { stake, ret, ready, issues, overBalance: stake > state.balance };
}

let seq = 48230;
export function placeBets() {
  if (state.slipStatus === 'placing') return; // no double submit
  state.slipStatus = 'placing';
  commit('slip');
  const fail = state.demo.failNext;
  setTimeout(() => {
    if (fail) {
      state.demo.failNext = false;
      state.slipStatus = { ok: false, msg: 'Bets not placed. The trading service did not confirm in time. No USDT was taken from your balance.' };
      commit('all');
      return;
    }
    const placed = [];
    for (const s of state.slip) {
      const n = num(s.stake);
      if (!n || gone(s) || isSuspended(s.selId)) continue;
      const sel = selection(s.selId);
      const mt = sel.match;
      const id = `HB-${++seq}`;
      placed.push({ id, stake: n, odds: odds(s.selId), pick: sel.outcome.label, event: `${TEAMS[mt.home].name} v ${TEAMS[mt.away].name}` });
      state.bets.unshift({ id, matchId: mt.id, selId: s.selId, market: sel.market.name, pick: sel.outcome.label, odds: odds(s.selId), stake: n, placed: Date.now(), status: 'open', callId: s.fromCall || null });
      placed[placed.length - 1].selId = s.selId;
      const taken = s.fromCall && state.calls.find((c) => c.id === s.fromCall);
      if (taken && !taken.bet) taken.bet = id;
      const mine = state.calls.find((c) => c.mine && c.selId === s.selId && !c.bet && !c.result);
      if (mine) mine.bet = id;
      state.balance = Math.round((state.balance - n) * 100) / 100;
    }
    state.slip = state.slip.filter((s) => !num(s.stake) || gone(s) || isSuspended(s.selId));
    state.slipStatus = { ok: true, placed };
    commit('all');
  }, 1100);
}
export function dismissStatus() { state.slipStatus = null; commit('slip'); }

// ---------- my bets ----------
export function cashOutValue(b) {
  if (!b.selId || b.status !== 'open' || !selection(b.selId)) return null;
  const now = odds(b.selId);
  if (!now) return null;
  return Math.max(0.1, Math.round(((b.stake * b.odds) / now) * 0.95 * 100) / 100);
}
export function cashOut(id) {
  const b = state.bets.find((x) => x.id === id);
  if (!b || b.status !== 'open' || isSuspended(b.selId)) return false;
  const v = cashOutValue(b);
  if (v == null) return false;
  b.status = 'cashed';
  b.ret = v;
  b.settledAt = Date.now();
  state.balance = Math.round((state.balance + v) * 100) / 100;
  state.cashing = null;
  commit('all');
  return v;
}
export const eventName = (b) => (b.matchId ? `${TEAMS[match(b.matchId).home].name} v ${TEAMS[match(b.matchId).away].name}` : b.event);

export function cashOutTrend(b) {
  if (!b.selId || !selection(b.selId)) return [];
  return hist(b.selId).slice(-24).map((h) => Math.round(((b.stake * b.odds) / h) * 0.95 * 100) / 100);
}
// quick stake chips add to the stake
export function quickStake(selId, add) {
  const s = state.slip.find((x) => x.selId === selId);
  if (!s) return null;
  const v = add === 'max' ? Math.min(MAX_STAKE, Math.floor(state.balance * 100) / 100) : Math.round((num(s.stake) + add) * 100) / 100;
  setStake(selId, String(v));
  return s;
}

// ---------- calls ----------
let cseq = 200;
export const callById = (id) => state.calls.find((c) => c.id === id);
export const myCallOn = (selId) => state.calls.find((c) => c.mine && c.selId === selId && !c.result);
export function openCallsOn(selId) { return state.calls.filter((c) => c.selId === selId && !c.result); }
export function postCall(selId, line, betId = null) {
  const ex = myCallOn(selId);
  if (ex) return ex;
  const sel = selection(selId);
  if (!sel) return null;
  const mt = sel.match;
  const li = liveInfo(mt);
  const c = { id: `C-${++cseq}`, selId, matchId: mt.id, by: 'me', mine: true, at: Date.now(), odds: odds(selId), takes: 0, line,
    live: li ? { score: [...li.score], clock: li.short } : null, pick: sel.outcome.label, market: sel.market.name, event: `${TEAMS[mt.home].name} v ${TEAMS[mt.away].name}`,
    bet: betId || state.bets.find((b) => b.selId === selId && b.status === 'open')?.id || null, taken: false };
  state.calls.unshift(c);
  commit('calls');
  return c;
}
export function takeCall(id) {
  const c = callById(id);
  if (!c) return { res: 'missing' };
  const st = callStatus(c);
  if (st.k === 'locked' || st.k === 'closed' || st.k === 'settled') return { res: st.k, st };
  if (c.mine) return { res: 'mine' };
  const ex = state.slip.find((s) => s.selId === c.selId);
  if (ex) { ex.fromCall = c.id; commit('slip'); return { res: 'already', c }; }
  const sel = selection(c.selId);
  const mt = sel.match;
  state.slip.push({ selId: c.selId, accepted: c.odds, stake: '', label: sel.outcome.label, marketName: sel.market.name, event: `${TEAMS[mt.home].nick} v ${TEAMS[mt.away].nick}`, matchId: mt.id, fromCall: c.id });
  state.activeStake = c.selId;
  if (!c.taken) { c.taken = true; c.takes = (c.takes || 0) + 1; }
  if (state.slipStatus && state.slipStatus !== 'placing') state.slipStatus = null;
  commit('slip');
  return { res: 'added', c, st };
}
export function resetCalls() { state.calls = seedCalls(); commit('calls'); }
export function clearCalls() { state.calls = []; commit('calls'); }
