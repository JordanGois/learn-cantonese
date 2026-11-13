// Puzzle generation: random full grid, then dig holes while the solution stays unique.
const E = require('../engine/engine.js');

function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }

function fullGrid() { const out = new Int8Array(81); E.countSolutions(new Int8Array(81), 1, out, Math.random); return out; }

// Removes clues in 180-degree pairs. Stops early once `minClues` is reached (used for the easy levels).
// With `trimTo`, single clues are then removed as well until that many remain, which gives the
// sparse 22-25 clue grids sudoku.com uses at its top level (symmetry becomes approximate).
function dig(full, minClues, trimTo) {
  const g = Int8Array.from(full); let clues = 81;
  for (const i of shuffle([...Array(41).keys()])) {
    const j = 80 - i, n = i === j ? 1 : 2;
    if (minClues && clues - n < minClues) continue;
    const a = g[i], b = g[j]; g[i] = 0; g[j] = 0;
    if (E.countSolutions(g, 2) === 1) clues -= n; else { g[i] = a; g[j] = b; }
  }
  if (trimTo) for (const i of shuffle([...Array(81).keys()])) {
    if (clues <= trimTo) break;
    if (!g[i]) continue;
    const a = g[i]; g[i] = 0;
    if (E.countSolutions(g, 2) === 1) clues--; else g[i] = a;
  }
  return g;
}

module.exports = { fullGrid, dig, shuffle };
