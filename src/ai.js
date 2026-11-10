// "Housebets AI" for Calls. In this prototype it is a rule-based stand-in for a language model:
// it writes the one-line call, flags stale or locked calls with a plain reason, ranks the Calls board,
// groups identical picks and explains slip states. No search, no chat, no network calls.
import { TEAMS, match } from './data.js';
import { selection, odds, isSuspended, liveInfo, SUSP_MATCH, marketSuspended } from './markets.js';
import { fOdds } from './util.js';

const pick = (arr, n) => arr[((n % arr.length) + arr.length) % arr.length];

// 1. Write the one-line call
export function writeLine(selId, variant = 0) {
  const sel = selection(selId);
  if (!sel) return '';
  const { match: mt, market: mk, outcome: o } = sel;
  const li = liveInfo(mt);
  const H = TEAMS[mt.home], A = TEAMS[mt.away];
  const p = fOdds(odds(selId));
  const label = o.short || o.label;
  const left = li && li.min != null ? Math.max(1, 90 - li.min) : null;
  const sc = li && li.score ? `${li.score[0]}–${li.score[1]}` : '';
  const id = mk.id;
  let lines;
  if (['mr', 'h1r', 'h2r', 'cmb', 'ml', 'sw', 'mw'].includes(id)) {
    if (/^(Draw|Tie)$/.test(o.label)) {
      lines = li ? [`Neither side is pulling away at ${sc}. Level at full time, ${p}.`, `This one feels stuck. Draw at ${p} with ${left ?? 'plenty of'} minutes left.`, `Two sides cancelling out. I'm on the draw at ${p}.`]
        : [`Evenly matched on paper. Draw at ${p} before kick-off.`, `Tight one coming. Draw at ${p}.`, `Nobody blinks. Draw at ${p}.`];
    } else {
      const side = o.label === H.name ? 0 : 1;
      const T = side ? A : H;
      const nick = T.nick;
      const lead = li && li.score ? li.score[side] - li.score[1 - side] : null;
      if (lead > 0) lines = [`${nick} lead ${sc} and look in control. Backing them to see it out at ${p}.`, `${nick} are ahead and the clock helps them. ${nick} win at ${p}.`, `${nick} to finish the job${left ? `, ${left} minutes to hold on` : ''}. ${p}.`];
      else if (lead < 0) lines = [`${nick} are behind but pushing. A comeback at ${p} is worth a shout.`, `Long way to go for ${nick}, and ${p} pays for the nerve.`, `${nick} turn this around. Big call at ${p}.`];
      else if (lead === 0) lines = [`Level at ${sc}, but ${nick} look the sharper side. ${nick} win at ${p}.`, `${nick} have more in them. Win at ${p}.`, `Someone has to break it. I think it's ${nick}, at ${p}.`];
      else lines = [`${nick} to win, getting in before kick-off at ${p}.`, `Simple one: ${nick} win at ${p}.`, `${nick} at ${p}. Early call before the price moves.`];
    }
  } else if (id === 'btts') {
    lines = o.label === 'Yes' ? [`Both sides are getting forward. Both teams score at ${p}.`, `Chances at both ends. BTTS yes at ${p}.`, `Nobody keeps a clean sheet here. ${p}.`] : [`One side looks blunt today. BTTS no at ${p}.`, `A clean sheet holds. BTTS no at ${p}.`, `Not seeing goals at both ends. No at ${p}.`];
  } else if (id === 'ng' || id === 'fs' || id === 'nc') {
    const what = id === 'nc' ? 'corner' : 'goal';
    lines = o.label === 'No goal' ? [`It goes quiet from here. No more goals at ${p}.`, `Game settles down. No goal at ${p}.`, `Shutters down. No goal at ${p}.`]
      : [`${label} get the next ${what}. ${p}.`, `${label} are the side pushing. Next ${what} at ${p}.`, `Next ${what}: ${label}, ${p}.`];
  } else if (id === 'gs') {
    lines = [`${o.player} is getting into the right spots. ${o.col} scorer at ${p}.`, `${o.player} to score, ${o.col.toLowerCase()}. ${p}.`, `Feels like a ${o.player} goal. ${p}.`];
  } else if (/^(tg|hg|ag|tc|tk|h2t|tgm|tp|tm)/.test(id)) {
    const over = /^Over/.test(o.label);
    const noun = id === 'tc' ? 'corners' : id === 'tk' ? 'cards' : id === 'tp' ? 'points' : id === 'tgm' ? 'games' : id === 'tm' ? 'maps' : 'goals';
    lines = over ? [`Open game with space on both sides. ${o.label} ${noun} at ${p}.`, `This one has more ${noun} in it. ${o.label} at ${p}.`, `${o.label} ${noun}. ${p} and I'm happy with it.`]
      : [`Both sides are careful. ${o.label} ${noun} at ${p}.`, `Not many more ${noun} coming. ${o.label} at ${p}.`, `Quiet one. ${o.label} ${noun}, ${p}.`];
  } else if (/^(ah|eh)/.test(id)) {
    lines = [`${o.label} on the handicap at ${p}. Covers a close result.`, `Handicap call: ${o.label} at ${p}.`, `${o.label}, ${p}. The line looks generous.`];
  } else {
    lines = [`${o.label}, ${mk.name.toLowerCase()}, at ${p}.`, `Calling ${o.label} at ${p}.`, `${o.label} at ${p}.`];
  }
  return pick(lines, variant);
}

// 2. Stale / locked status with a plain reason
export function callStatus(c) {
  if (c.result) {
    const r = { won: 'Won', lost: 'Lost', cashed: 'Cashed out', void: 'Void' }[c.result];
    return { k: 'settled', label: r, reason: `Settled: ${r.toLowerCase()} at ${fOdds(c.odds)}.` };
  }
  const sel = selection(c.selId);
  if (!sel || sel.market.closed) return { k: 'closed', label: 'Closed', reason: 'This market closed after a goal, so the call can’t be taken.' };
  if (isSuspended(c.selId)) {
    const why = SUSP_MATCH.get(c.matchId);
    return { k: 'locked', label: 'Locked', reason: why ? `Locked. ${why} Take it again when it reopens, at the new price.` : 'Locked. The market is suspended for a moment and reopens with a new price.' };
  }
  const now = odds(c.selId);
  if (now === c.odds) return { k: 'open', label: 'Takeable', reason: `Still at the posted price, ${fOdds(now)}.`, now };
  const pct = (now - c.odds) / c.odds;
  if (Math.abs(pct) >= 0.05) return { k: 'stale', label: 'Stale', reason: `Price moved ${fOdds(c.odds)} → ${fOdds(now)} since this call. Take it at ${fOdds(now)} or leave it.`, now };
  return { k: 'open', label: 'Takeable', reason: `Small move, ${fOdds(c.odds)} → ${fOdds(now)}. You’ll be asked to accept ${fOdds(now)}.`, now };
}

// 3. Rank the board: takeable first, pinned follows, live, then newest
const ORDER = { open: 0, stale: 1, locked: 2, closed: 3, settled: 4 };
export function rankScore(c, follows) {
  const st = callStatus(c);
  const mt = match(c.matchId);
  const pinned = mt && (follows.teams.includes(mt.home) || follows.teams.includes(mt.away)) && ORDER[st.k] <= 1;
  return { st, pinned, s: ORDER[st.k] * 10 - (pinned ? 5 : 0) - (mt?.live ? 2 : 0) - Math.min(1.9, (c.takes || 0) / 20) + (Date.now() - c.at) / 864e5 };
}
export function rankReason(st, pinned, live) {
  if (pinned) return 'Pinned because you follow this team';
  if (st.k === 'open') return live ? 'Live and takeable now' : 'Takeable before kick-off';
  if (st.k === 'stale') return 'Price moved since the call';
  if (st.k === 'locked') return 'Locked while the market is suspended';
  if (st.k === 'closed') return 'Market closed';
  return 'Settled';
}

// 4. Group identical picks into clusters
export function cluster(calls) {
  const m = new Map();
  for (const c of calls) {
    const k = c.selId + (c.result ? '|' + c.result + '|' + c.event : '');
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(c);
  }
  return [...m.values()].map((list) => {
    list.sort((a, b) => b.at - a.at);
    const takes = list.reduce((a, c) => a + (c.takes || 0), 0);
    return { key: list[0].selId, lead: list[0], list, takes };
  });
}
export function clusterLine(cl) {
  const n = cl.list.length;
  if (n === 1) return cl.takes ? `${cl.takes} took this call` : 'No takes yet';
  return `${n} people called this, ${cl.takes} took it`;
}

// 5. One-line explanations of slip states
export const explain = {
  changed: (from, to) => `Price moved ${fOdds(from)} → ${fOdds(to)} since you added it${to > from ? ', so it would pay more' : ', so it would pay less'}. Accept ${fOdds(to)} to place.`,
  fromCall: (from, to) => `The call was posted at ${fOdds(from)}. It’s ${fOdds(to)} now, so accept the new price to take it.`,
  suspended: (reason) => reason ? `Suspended. ${reason}` : 'Suspended for a moment while the price is checked. It usually reopens in seconds.',
  closed: () => 'This market closed after a goal. Remove it to place the others.',
  placed: (n, stake) => `Placed: ${n} single${n === 1 ? '' : 's'}, ${stake} staked. Track returns and cash out in My bets.`,
  failed: () => 'Not placed. The trading service didn’t confirm in time, so no USDT left your balance. Try again.',
  cashout: (v, stake) => `Cash out now pays ${v} against your ${stake} stake. It changes as the price moves.`,
  cashoutLocked: () => 'Cash out is paused while the market is suspended.',
};
export const marketLocked = (mid, mk) => marketSuspended(mid, mk);
