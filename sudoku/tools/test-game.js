// Drives game.js and hints.js without a browser.
// Usage: node tools/test-game.js
const E = require('../engine/engine.js');
const G = require('../src/game.js');
const H = require('../src/hints.js');
const bank = require('../src/bank.json');

let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log('FAIL: ' + msg); } };

// 1. Scrambling keeps the puzzle valid and at the same level.
for (let l = 1; l <= 10; l++) for (let k = 0; k < 40; k++) {
  const src = bank[l][k], p = G.scramble(src);
  const a = E.grade(E.parse(src)), b = E.grade(p);
  ok(E.countSolutions(p, 2) === 1, `scramble broke uniqueness (level ${l})`);
  ok(a.hardSteps === b.hardSteps || a.level === b.level, `scramble changed level ${l}: ${a.level} -> ${b.level}`);
  ok(a.level === b.level, `scramble changed level ${l}: ${a.level} -> ${b.level}`);
}

// 2. Solve whole puzzles using nothing but the Hint button, tapping through to the reveal every time.
let hintTaps = 0, maxSteps = 0;
for (let l = 1; l <= 10; l++) for (let k = 0; k < 60; k++) {
  const g = G.newGame(l, bank);
  let steps = 0;
  while (!g.done && steps < 600) {
    const h = H.compute(g);
    ok(h.kind === 'step', `level ${l}: hint was '${h.kind}' on a clean board`);
    if (h.kind !== 'step') break;
    ok(E.TECHS[h.step.t].level <= l, `level ${l}: hint asked for ${h.step.tech.id}`);
    for (h.stage = 1; h.stage <= h.max; h.stage++) { H.view(h); hintTaps++; }
    const before = g.rev;
    H.apply(g, h);
    ok(g.rev !== before, `level ${l}: applying ${h.step.tech.id} changed nothing`);
    if (g.rev === before) break;
    steps++;
  }
  ok(g.done, `level ${l}: hint-only solve did not finish`);
  ok(g.mistakes === 0, `level ${l}: hint placed a wrong digit`);
  ok(G.status(g) === 'assisted', `level ${l}: revealed game not marked assisted`);
  for (let i = 0; i < 81; i++) if (!g.vals[i] === false && g.notes[i]) ok(false, 'notes left on a filled cell');
  if (steps > maxSteps) maxSteps = steps;
}

// 3. Mistakes, fail flag, erase, undo.
{
  const g = G.newGame(5, bank), empty = [...Array(81).keys()].filter(i => !g.vals[i]);
  const wrongDigit = i => (g.solution[i] % 9) + 1;
  ok(G.status(g) === 'pass', 'fresh game should be a pass');
  let r = G.place(g, empty[0], wrongDigit(empty[0]));
  ok(r.wrong && g.mistakes === 1 && G.isWrong(g, empty[0]), 'wrong digit not flagged');
  ok(H.compute(g).kind === 'wrong', 'hint should point at the wrong digit first');
  r = G.place(g, empty[0], g.solution[empty[0]]);
  ok(r.correct && !G.isWrong(g, empty[0]) && G.isLocked(g, empty[0]), 'correcting a wrong digit');
  ok(!G.place(g, empty[0], wrongDigit(empty[0])).changed, 'correct digit must be locked');
  G.place(g, empty[1], wrongDigit(empty[1])); ok(!G.failed(g), 'two mistakes is not a fail');
  G.erase(g, empty[1]); ok(g.vals[empty[1]] === 0, 'erase wrong digit');
  G.place(g, empty[1], wrongDigit(empty[1])); ok(G.failed(g) && G.status(g) === 'fail', 'three mistakes is a fail');
  ok(!g.done, 'game must continue after three mistakes');
  G.undo(g); ok(g.vals[empty[1]] === 0 && g.mistakes === 3, 'undo removes the digit but not the mistake');
  const givenCell = [...Array(81).keys()].find(i => g.given[i]);
  ok(!G.place(g, givenCell, 1).changed && !G.erase(g, givenCell), 'givens are locked');
}

// 4. Notes: auto-update on placement, notes check in the hint, save/restore.
{
  const g = G.newGame(6, bank), base = E.candidates(g.vals), empty = [...Array(81).keys()].filter(i => !g.vals[i]);
  for (const i of empty) G.setNotes(g, [[i, base[i]]]);
  ok(H.compute(g).kind === 'step', 'correct full notes should give a technique hint');
  const a = empty[0], d = g.solution[a], peer = E.PEERS[a].find(p => !g.vals[p] && (g.notes[p] & E.bit(d)));
  G.place(g, a, d);
  ok(peer === undefined || !(g.notes[peer] & E.bit(d)), 'placing a digit should clear it from peers\' notes');
  const b = empty.find(i => !g.vals[i]);
  G.toggleNote(g, b, g.solution[b]); // remove the real digit
  const h = H.compute(g);
  ok(h.kind === 'notes' && h.cells.length === 1 && h.cells[0] === b, 'hint should flag the cell whose notes lost the real digit');
  ok(!/\d/.test(H.view(h).body) && !/\d/.test(H.view(Object.assign(h, { stage: 2 })).body), 'notes hint must not name a digit');
  G.undo(g); ok(H.compute(g).kind === 'step', 'undo restores the note');
  const back = G.deserialize(JSON.parse(JSON.stringify(G.serialize(g))));
  ok(back && E.format(back.vals) === E.format(g.vals) && back.notes.join() === g.notes.join() && back.undo.length === g.undo.length, 'save/restore round trip');
  G.undo(back); ok(back.rev === 1, 'restored game can still undo');
}

// 5. A clean, unassisted solve is a pass; completion events fire.
{
  const g = G.newGame(3, bank); let units = 0, digits = 0, last;
  for (let i = 0; i < 81; i++) if (!g.vals[i]) { last = G.place(g, i, g.solution[i]); units += last.units.length; if (last.digitDone) digits++; }
  ok(g.done && last.win && G.status(g) === 'pass', 'clean solve should be a pass');
  ok(digits === 9, `expected 9 digit-complete events, got ${digits}`);
  ok(units >= 20 && units <= 27, `expected up to 27 unit-complete events, got ${units}`);
  ok(!G.place(g, 0, 1).changed && !G.undo(g), 'finished game is frozen');
}

console.log(fails ? `${fails} failure(s)` : `all game and hint checks passed (600 hint-only solves, ${hintTaps} hint taps, longest ${maxSteps} steps)`);
process.exit(fails ? 1 : 0);
