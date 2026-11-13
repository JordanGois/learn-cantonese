// Soundness test: every step the engine proposes must agree with the true solution.
// Usage: node tools/test-engine.js [count]
const E = require('../engine/engine.js');
const { fullGrid, dig } = require('./gen.js');

const N = +process.argv[2] || 3000;
const uses = new Array(E.TECHS.length).fill(0), levels = new Array(12).fill(0);
let bad = 0;
const t0 = Date.now();
for (let n = 0; n < N; n++) {
  const sol = fullGrid(), puz = dig(sol);
  const g = E.grade(puz, s => {
    uses[s.t]++;
    if (s.place && sol[s.place.cell] !== s.place.digit) { bad++; console.log('WRONG PLACEMENT', s.tech.id, E.format(puz)); }
    for (const e of s.elims) if (sol[e.cell] === e.digit) { bad++; console.log('WRONG ELIMINATION', s.tech.id, E.format(puz)); }
    if (!s.place && !s.elims.length) { bad++; console.log('EMPTY STEP', s.tech.id); }
  });
  levels[g.level]++;
}
console.log(`${N} puzzles in ${((Date.now() - t0) / 1000).toFixed(1)}s, unsound steps: ${bad}`);
console.log('\nsteps taken per technique:');
E.TECHS.forEach((t, i) => console.log(`  ${t.id.padEnd(20)} ${uses[i]}`));
console.log('\nlevel distribution (11 = beyond the engine):');
for (let l = 1; l <= 11; l++) console.log(`  ${String(l).padStart(2)}  ${(levels[l] / N * 100).toFixed(2)}%`);
process.exit(bad ? 1 : 0);
