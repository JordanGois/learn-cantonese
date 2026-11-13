// Builds the puzzle bank: generate, grade with the engine, keep what fits each level.
// Usage: node tools/generate-bank.js [perLevel=200]
const fs = require('fs');
const path = require('path');
const E = require('../engine/engine.js');
const { fullGrid, dig } = require('./gen.js');

const QUOTA = +process.argv[2] || 200;
const rnd = (a, b) => a + ((Math.random() * (b - a + 1)) | 0);

// What a graded puzzle must look like to be banked at each level.
// Levels 1-2 are dug only part-way (more clues); 3-4 until no symmetric pair can go;
// 5-10 are trimmed further to 22-25 clues to match sudoku.com Extreme (see calibration/).
const ACCEPT = {
  1: g => g.level === 1 && g.clues >= 36,
  2: g => g.level === 1 && g.clues >= 30 && g.clues <= 35,
  3: g => g.level === 3 && g.clues >= 26 && g.clues <= 32,
  4: g => g.level === 4 && g.clues <= 30,
  5: g => g.level === 5 && g.clues <= 26 && g.hardSteps >= 2,
  6: g => g.level === 6 && g.clues <= 26,
  7: g => g.level === 7 && g.clues <= 26 && g.hardSteps >= 2,
  8: g => g.level === 8 && g.clues <= 26 && g.hardSteps >= 2,
  9: g => g.level === 9 && g.clues <= 26 && g.hardSteps >= 2,
  10: g => g.level === 10 && g.clues <= 26 && g.hardSteps >= 2,
};

const bank = {}, meta = {};
for (let l = 1; l <= 10; l++) { bank[l] = []; meta[l] = { clues: [], hard: [], opp: [], tech: {} }; }
const seen = new Set();
const full = l => bank[l].length >= QUOTA;
const t0 = Date.now(); let made = 0;

function offer(puz, lo, hi) {
  const g = E.grade(puz); made++;
  if (!g.solved) return;
  for (let l = lo; l <= hi; l++) {
    if (full(l) || !ACCEPT[l](g)) continue;
    const s = E.format(puz); if (seen.has(s)) return; seen.add(s);
    bank[l].push(s);
    const m = meta[l]; m.clues.push(g.clues); m.hard.push(g.hardSteps); m.opp.push(g.avgOpp);
    const id = E.TECHS[g.hardest].id; m.tech[id] = (m.tech[id] || 0) + 1;
    return;
  }
}

while (!full(1)) offer(dig(fullGrid(), rnd(36, 40)), 1, 1);
while (!full(2)) offer(dig(fullGrid(), rnd(30, 35)), 2, 2);
while (!full(3) || !full(4)) offer(dig(fullGrid()), 3, 4);
while ([5, 6, 7, 8, 9, 10].some(l => !full(l))) {
  offer(dig(fullGrid(), 0, rnd(22, 25)), 5, 10);
  if (made % 20000 === 0) process.stderr.write(`  ${made} graded: ${[...Array(10)].map((_, i) => bank[i + 1].length).join(' ')}\n`);
}

// Final check: every banked puzzle has exactly one solution and still grades to its level.
let bad = 0;
for (let l = 1; l <= 10; l++) for (const s of bank[l]) {
  const p = E.parse(s), g = E.grade(p);
  if (E.countSolutions(p, 2) !== 1 || !ACCEPT[l](g)) bad++;
  if (l <= 4) for (let i = 0; i < 81; i++) if (!!p[i] !== !!p[80 - i]) { bad++; break; }
}

const avg = a => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1);
console.log(`graded ${made} puzzles in ${((Date.now() - t0) / 1000).toFixed(0)}s; failed final check: ${bad}`);
console.log('level name         n   clues(min-avg-max)  hard steps  singles/move  hardest technique');
for (let l = 1; l <= 10; l++) {
  const m = meta[l];
  console.log(`${String(l).padStart(3)}   ${E.LEVEL_NAMES[l].padEnd(11)} ${String(bank[l].length).padStart(3)}   ${Math.min(...m.clues)}-${avg(m.clues)}-${Math.max(...m.clues)}`.padEnd(44) +
    `${avg(m.hard).padStart(5)}       ${avg(m.opp).padStart(5)}      ${Object.entries(m.tech).map(([k, v]) => k + ' ' + v).join(', ')}`);
}
if (bad) process.exit(1);
const out = path.join(__dirname, '..', 'src', 'bank.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(bank));
console.log(`wrote ${out} (${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
