// Sample callers and calls. All names are invented. No money moves between players.
import { match, TEAMS } from './data.js';
import { selection, odds, liveInfo } from './markets.js';

export const CALLERS = {
  nia: { name: 'Nia Okafor', init: 'NO', hue: 188 },
  rafi: { name: 'Rafi Duarte', init: 'RD', hue: 252 },
  mara: { name: 'Mara Lindqvist', init: 'ML', hue: 158 },
  theo: { name: 'Theo Brandt', init: 'TB', hue: 32 },
  sana: { name: 'Sana Prakash', init: 'SP', hue: 330 },
  jun: { name: 'Jun Watanabe', init: 'JW', hue: 210 },
  ines: { name: 'Ines Varga', init: 'IV', hue: 280 },
  dayo: { name: 'Dayo Adeyemi', init: 'DA', hue: 12 },
  me: { name: 'You', init: 'YO', hue: 186, me: true },
};

const MIN = 60000;
// [id, selId, by, minutes ago, price factor vs current (1 = same), takes, line, extra]
const LIVE_SEED = [
  ['C-118', 'ars-bha|mr|0', 'nia', 9, 1, 14, 'Arsenal lead and look in control. Backing them to see it out.'],
  ['C-109', 'ars-bha|mr|0', 'rafi', 22, 1.16, 6, 'Arsenal to win before the lead grows and the price drops.'],
  ['C-121', 'ars-bha|mr|0', 'mara', 3, 1, 3, 'One up with Brighton chasing. Arsenal win is the calm pick.'],
  ['C-116', 'ars-bha|tg25|0', 'theo', 6, 1, 9, 'Both sides are trading chances. Two more goals before full time.'],
  ['C-104', 'ars-bha|tg25|0', 'sana', 15, 1.14, 4, 'Open game and tired legs late on. Over 2.5 goals.'],
  ['C-112', 'ars-bha|btts|0', 'jun', 12, 1, 7, 'Brighton will push for an equaliser and leave space. Both teams score.'],
  ['C-120', 'ars-bha|ng|2', 'ines', 4, 1, 2, 'Brighton have to come forward now. They nick the next goal.'],
  ['C-107', 'ars-bha|tc|0', 'dayo', 18, 1, 5, 'Brighton chasing means corners. Over on total corners.'],
  ['C-111', 'ars-bha|gs|1', 'theo', 11, 1, 3, 'He keeps arriving at the back post. Anytime scorer.'],
  ['C-115', 'che-new|mr|1', 'rafi', 7, 1, 3, 'Tight and careful so far. Level at full time.'],
  ['C-098', 'rma-sev|mr|0', 'nia', 34, null, 11, 'Real Madrid are ahead and rarely give leads away. Home win.', { odds: 1.62 }],
  ['C-102', 'int-nap|tg25|0', 'me', 28, null, 2, 'Napoli lead early but this one has goals in it. Over 2.5.', { odds: 2.05, mine: true }],
  ['C-095', 'liv-mun|mr|0', 'mara', 40, 1, 18, 'Liverpool at home in a big one. Home win before kick-off.'],
  ['C-091', 'liv-mun|mr|0', 'jun', 55, 1.07, 5, 'Liverpool to win. Getting in before the price shortens.'],
  ['C-100', 'mci-tot|mr|0', 'sana', 25, 1, 4, 'City at home. Simple call: City win.'],
  ['C-093', 'atm-rso|tg25|1', 'ines', 47, 1, 2, 'Two careful sides. Under 2.5 goals.'],
];
// settled yesterday (snapshots: the matches are no longer on the board)
const SETTLED_SEED = [
  { id: 'C-061', selId: 'x|nev|0', by: 'nia', event: 'Newcastle United v Aston Villa', market: 'Match result', pick: 'Newcastle United', odds: 2.4, takes: 21, line: 'Newcastle are strong at home. Win at 2.40.', result: 'won', ago: 26 * 60 + 20, taken: true, bet: 'HB-47950' },
  { id: 'C-057', selId: 'x|lr|1', by: 'me', event: 'Lazio v Roma', market: 'Both teams to score', pick: 'No', odds: 2.1, takes: 3, line: 'One side looks blunt today. BTTS no at 2.10.', result: 'lost', ago: 27 * 60 + 10, mine: true, bet: 'HB-47911' },
  { id: 'C-049', selId: 'x|cp|0', by: 'dayo', event: 'Celtic v Porto', market: 'Total goals · Over/Under 2.5', pick: 'Over 2.5', odds: 1.85, takes: 9, line: 'Both teams attack. Over 2.5 goals.', result: 'cashed', ago: 50 * 60 + 15, taken: true, bet: 'HB-47860' },
  { id: 'C-052', selId: 'x|fp|1', by: 'theo', event: 'Feyenoord v PSV', market: 'Match result', pick: 'Draw', odds: 3.6, takes: 6, line: 'Two sides cancelling out. Draw at 3.60.', result: 'lost', ago: 30 * 60 },
];

export function seedCalls() {
  const now = Date.now();
  const out = [];
  for (const [id, selId, by, ago, f, takes, line, extra = {}] of LIVE_SEED) {
    const sel = selection(selId);
    if (!sel) continue;
    const mt = sel.match;
    const li = liveInfo(mt);
    const cur = odds(selId);
    const o = extra.odds ?? Math.max(1.01, Math.round(cur * (f || 1) * 100) / 100);
    let snap = null;
    if (li && li.min != null) snap = { score: [...li.score], clock: `${Math.max(1, li.min + 1 - ago)}’` };
    else if (li) snap = { score: [...li.score], clock: li.short };
    out.push({ id, selId, matchId: mt.id, by, at: now - ago * MIN, odds: o, takes, line, live: snap, pick: sel.outcome.label, market: sel.market.name, event: `${TEAMS[mt.home].name} v ${TEAMS[mt.away].name}`, mine: !!extra.mine, taken: id === 'C-098', bet: id === 'C-098' ? 'HB-48213' : extra.mine ? 'HB-48207' : null });
  }
  for (const s of SETTLED_SEED) out.push({ ...s, matchId: null, at: now - s.ago * MIN, live: null, mine: !!s.mine, taken: !!s.taken });
  return out;
}
export const caller = (id) => CALLERS[id] || CALLERS.me;
export const callMatch = (c) => c.matchId && match(c.matchId);
