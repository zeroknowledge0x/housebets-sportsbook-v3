# Variant 3: "Housebets Calls"

## Subject
A crypto sportsbook where players can post a single as a public **Call**, and other players can **take** it into their own slip. There is no money for callers: no cut, no reward, no promo. Credit comes from the caller's name and the take-count.
The audience is Housebets players on phone and desktop. The main job is to see what people are calling right now, take a call that still holds, and bet singles fast.

## Tokens
| Name | Hex | Use |
| --- | --- | --- |
| Abyss | #071820 | page background |
| Deep | #0c222c | surfaces, rail, slip |
| Shoal | #133140 | raised cells, inputs |
| Kelp | #1f4352 | hairlines |
| Aqua | #1fe0ee | primary, prices, brand wave |
| Foam | #d2fafc | text on aqua hover, call-bubble ink |
| Call | #b6a6ff | calls only: quote mark, take-counts, callouts |
| Live | #e0244a (pill) / #ff6b84 (text) | live state |
| Amber | #ffc35c | stale or needs-accept |
| Up / Down | #45e0a3 / #ff7a8a | price moves |

Type:
- **Bricolage Grotesque** (variable, with optical sizes): headings, call lines, scores. Calls are set in it at 19–22px so they read like something said out loud.
- **Instrument Sans** (variable): UI, labels and prices, with tabular figures.
- Neither face was used in v1 (Outfit) or v2 (Saira Condensed with Schibsted Grotesk).
- Scale: 12 / 13 / 15 / 17 / 20 / 26 / 40 / 64.

Shape: pill buttons and chips. Price cells use a 10px radius. Call bubbles use an 18px radius with a tail pointing at the caller. The radius changes with hierarchy; it is not one value everywhere.

## Layout
Desktop (1440):
```
| logo |        search        | demo | wallet |
|rail | main                              | slip 360 |
|84px | Live now (cards, h-scroll)        | Slip/My bets |
|     | Calls board (ranked/latest) | Soon | (My calls) |
|     |  bubble cards, clusters    | Top  |            |
```
- Match page: markets on the left and a sticky "Calls on this match" rail on the right. Every price with open calls gets a callout under it ("4 calls"). Tapping the callout filters the rail to that pick.

Phone (390):
```
top bar / search / sport chips / Live now / Calls board ...
[ slip bar: tap to expand into a bottom sheet ]
[ Menu | Sports | Casino | Chat | Search ]
```

Alignment: everything is left aligned. Scores are centred only inside the match header.

## Principles
1. The call is the hero. Each one is a speech bubble with the caller under it, the price it was posted at and the price now. That is where the boldness goes; everything else stays quiet.
2. Honest prices. A call never hides that the price moved. The AI says why in one plain line.
3. Housebets shell: top bar, left nav (as a rail), side slip, navy and teal, aqua wordmark and wave.
4. Singles only. Calls never become accas.

## Review against v1, v2 and the generic defaults
- I first sketched a chat-style feed. It looked like a casino social feed, which the brief rules out. Calls are now **cards tied to a price**, ranked by takeability, not a chat stream.
- v1 had a labelled sidebar with lobby tiles, and v2 had a ticker band with condensed stadium boards. v3 has no ticker. It uses a narrow icon rail, horizontal live cards, bubbles and pills.
- The AI is a rule-based stand-in in this prototype (no LLM call). Its output is marked with a small spark icon and the text "AI".
