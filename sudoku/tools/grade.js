// Grade puzzles the way a person would solve them.
// Usage: node tools/grade.js <81-char puzzle> [more puzzles...]   (0 or . for empty cells)
//        node tools/grade.js --file puzzles.txt                   (one puzzle per line; # comments allowed)
const fs = require('fs');
const E = require('../engine/engine.js');

let inputs = process.argv.slice(2);
if (inputs[0] === '--file') inputs = fs.readFileSync(inputs[1], 'utf8').split(/\r?\n/).map(l => l.replace(/#.*/, '').trim()).filter(Boolean);

for (const src of inputs) {
  const p = E.parse(src);
  if (!p) { console.log('Could not read 81 cells from:', src); continue; }
  const n = E.countSolutions(p, 2);
  console.log('\n' + E.format(p));
  if (n !== 1) { console.log(n === 0 ? '  NO SOLUTION (transcription error?)' : '  MORE THAN ONE SOLUTION (transcription error?)'); continue; }
  const hard = [];
  const g = E.grade(p, s => { if (!s.place) hard.push(`${s.tech.name} (${s.where})`); });
  console.log(`  clues ${g.clues} | level ${g.solved ? g.level : 'beyond engine'} | hardest: ${g.solved ? E.TECHS[g.hardest].id : '-'} | non-single steps ${g.hardSteps} | singles available per move: avg ${g.avgOpp.toFixed(1)}, min ${g.minOpp}`);
  console.log('  uses: ' + E.TECHS.map((t, i) => g.counts[i] ? `${t.id}×${g.counts[i]}` : '').filter(Boolean).join(', '));
  if (hard.length) console.log('  non-single steps in order: ' + hard.join(' → '));
}
