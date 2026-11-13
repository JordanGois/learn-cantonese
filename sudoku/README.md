# Sudoku

A personal sudoku app with ten difficulty levels. Level 5 matches sudoku.com's Extreme; levels 6–10 go on to X-wings, wings, colouring and chains. The hint button names the technique you need instead of giving the answer.

The whole app is one file: `docs/index.html`. Open it in a browser to play.

## Levels

A puzzle sits at a level when the hardest technique it needs is in that row.

| Level | Name | Hardest technique needed | Clues |
|---|---|---|---|
| 1 | Easy | Hidden single in a box | 36–41 |
| 2 | Medium | Hidden single in a box | 30–35 |
| 3 | Hard | Hidden single in a row or column | 26–32 |
| 4 | Expert | Naked single | 23–30 |
| 5 | Extreme | Pointing pair, box-line reduction, naked pair, hidden pair | 22–26 |
| 6 | Fiendish | Naked triple, hidden triple, X-wing | 22–26 |
| 7 | Diabolical | Skyscraper, 2-string kite, swordfish, turbot fish | 22–26 |
| 8 | Nightmare | XY-wing, XYZ-wing | 22–26 |
| 9 | Inhuman | Simple colouring, unique rectangle | 22–26 |
| 10 | Impossible | X-chain, XY-chain | 22–26 |

Level 5 was set by grading five real sudoku.com Extreme puzzles (`calibration/sudoku-com-extreme.txt`).

## Layout

| Path | What it is |
|---|---|
| `engine/engine.js` | Solver, technique finders and grader. Runs in Node and in the browser. |
| `src/` | The app: `game.js` (rules), `hints.js`, `ui.js`, `audio.js`, `storage.js`, `guide.js`, styles and HTML shell. |
| `src/bank.json` | 2,000 pre-graded puzzles, 200 per level. Generated. |
| `src/guide-examples.js` | Board positions for the technique guide diagrams. Generated. |
| `tools/` | Generators and tests. |
| `build.js` | Inlines everything into `docs/index.html`, plus icons, manifest and service worker. |
| `docs/` | Build output. This is what gets hosted. |

## Commands

```
node build.js                      # rebuild docs/index.html after changing anything in src/ or engine/
node tools/grade.js <puzzle>       # grade an 81-character puzzle (0 or . for blanks)
node tools/generate-bank.js 200    # regenerate the puzzle bank (about 90 seconds)
node tools/make-guide-examples.js  # regenerate guide diagrams (run after regenerating the bank)

node tools/test-engine.js 5000     # every engine step checked against the true solution
node tools/test-game.js            # rules, hints, stats flags, save/restore
node tools/test-browser.js         # drives the built app in headless Chrome and takes screenshots
```

To move a level's difficulty, change `level` on the technique in `TECHS` (engine) or the `ACCEPT` rules in `tools/generate-bank.js`, then regenerate the bank, the guide examples, and rebuild.
