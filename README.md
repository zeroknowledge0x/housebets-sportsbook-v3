# Housebets Calls · Sportsbook prototype v3

**Live:** https://zeroknowledge0x.github.io/housebets-sportsbook-v3/

This is a clickable, front-end-only prototype of a sportsbook inside the Housebets shell. Variant 3 is built around **Calls**. It uses sample data and demo USDT only: no real money, no backend and no real players. Real club names are used, but the crests are original SVGs and the players are fictional.

## The idea

You put a single on your slip and tap **Post as a Call**. Everyone then sees a public card showing:

- your pick
- the decimal price when you posted it
- the live score and clock
- your display name
- one line written by Housebets AI

Other players tap **Take call** to put the same single on their own slip. If the price has moved, the usual "accept new price" step appears. If the market is suspended, the call is locked until it reopens.

Credit is only your name and a visible take-count ("12 took this call"). Nobody earns a cut, there is no payout to the caller, and there are no boosts or free bets.

## Pages

| Page | Link |
|---|---|
| Sports home (Live now, Calls board, Starting soon, Top competitions, Favourites, search) | `#/` |
| Live (sport + competition filters, ticking clocks, nothing-live state) | `#/live` |
| Football (PL, UCL, LaLiga, Serie A, Bundesliga, 1X2 rows, follow team/competition) | `#/football` |
| Match: Arsenal v Brighton (scoreboard, 6 market groups, price callouts, calls rail) | `#/match/ars-bha` |
| Bet slip + My bets (Open, Settled, My calls) | `#/betslip` |

## What Housebets AI does here

The AI is simulated with rules in the browser (`src/ai.js`); there is no model call. It:

1. Writes the one-line call.
2. Marks a call stale (price moved 5% or more) or locked (market suspended) and gives a plain reason.
3. Ranks the Calls board: calls you can take now first, then followed teams (pinned), then live, then newest.
4. Groups identical picks into one card ("3 called, 24 took it").
5. Explains each slip state in one line: odds changed, suspended, placed, failed, and cash out.

Search is ordinary search over teams, players, competitions and markets. There is no AI search.

## Demo states

Open **Demo states** in the top bar to use these controls:

- nothing live
- next bet fails
- pause updates
- change odds in the slip
- suspend a slip selection
- suspend the match
- Brighton goal (suspends, then reprices)
- load or clear sample Calls
- move prices on open calls (to show stale calls)
- reset everything

State is saved in `localStorage` under the key `hb-sportsbook-v3`.

## Run

```bash
npm ci
npm run dev       # http://localhost:5173/housebets-sportsbook-v3/
npm run build && npx vite preview --port 4173
BASE=http://localhost:4173/housebets-sportsbook-v3/ node scripts/shoot.mjs   # page shots
BASE=http://localhost:4173/housebets-sportsbook-v3/ node scripts/flows.mjs   # Call flows + states
```

GitHub Pages deploys through `.github/workflows/pages.yml` on every push to `main`.

## Tools and credits

- [Vite](https://github.com/vitejs/vite) for the build, with vanilla JS and CSS.
- Type: Bricolage Grotesque and Instrument Sans, under the SIL OFL, via [Fontsource](https://github.com/fontsource/fontsource).
- Icons, crests and the wordmark wave are hand-written SVG.
- [Playwright](https://github.com/microsoft/playwright) with Google Chrome for screenshots and flow checks.
- GitHub Pages and GitHub Actions for hosting.

Design skills were used as instructions only. None of their files, scripts or assets are in this repo.

- frontend-design: https://github.com/anthropics/skills
- ui-ux-pro-max: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- impeccable: https://github.com/pbakaus/impeccable
- web-design-guidelines: https://github.com/vercel-labs/agent-skills
- taste-skill: https://github.com/Leonxlnx/taste-skill

The Housebets shell (top bar, icon rail, side panel, navy and teal, aqua wordmark) was recreated from the contest wireframes. The official brand pack was not available.
