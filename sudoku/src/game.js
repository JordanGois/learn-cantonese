// Game state and rules. No DOM in here, so tools/test-game.js can drive it from Node.
(function (root) {
  'use strict';
  const E = root.SudokuEngine;
  const UNDO_LIMIT = 400;
  const MISTAKE_LIMIT = 3;

  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  // Same puzzle, different face: relabel digits, permute bands/stacks and the lines inside them, maybe transpose.
  // None of these change which techniques the puzzle needs.
  function scramble(str) {
    const p = E.parse(str), out = new Int8Array(81);
    const lines = () => { const m = []; for (const b of shuffle([0, 1, 2])) for (const k of shuffle([0, 1, 2])) m.push(b * 3 + k); return m; };
    const rows = lines(), cols = lines(), dig = [0].concat(shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])), flip = Math.random() < 0.5;
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
      const src = flip ? cols[c] * 9 + rows[r] : rows[r] * 9 + cols[c];
      out[r * 9 + c] = dig[p[src]];
    }
    return out;
  }

  function create(level, puzzle) {
    const solution = E.solve(puzzle);
    return {
      level, given: Uint8Array.from(puzzle, x => x ? 1 : 0), solution,
      vals: Int8Array.from(puzzle), notes: new Int16Array(81),
      mistakes: 0, elapsed: 0, hints: 0, assisted: false, done: false, undo: [], rev: 0,
    };
  }
  function newGame(level, bank) {
    const pool = bank[level];
    return create(level, scramble(pool[(Math.random() * pool.length) | 0]));
  }

  const isWrong = (g, i) => g.vals[i] !== 0 && g.vals[i] !== g.solution[i];
  const isLocked = (g, i) => g.vals[i] !== 0 && g.vals[i] === g.solution[i]; // givens and correct entries can't be changed
  const failed = g => g.mistakes >= MISTAKE_LIMIT;
  const status = g => failed(g) ? 'fail' : g.assisted ? 'assisted' : 'pass';
  function remaining(g, d) { let n = 9; for (let i = 0; i < 81; i++) if (g.vals[i] === d && g.solution[i] === d) n--; return n; }

  // Undo entries are diffs: [cell, previous value, previous notes] for each cell an action touched.
  function commit(g, vals0, notes0) {
    const diff = [];
    for (let i = 0; i < 81; i++) if (vals0[i] !== g.vals[i] || notes0[i] !== g.notes[i]) diff.push([i, vals0[i], notes0[i]]);
    if (!diff.length) return false;
    g.undo.push(diff); if (g.undo.length > UNDO_LIMIT) g.undo.shift();
    g.rev++;
    return true;
  }
  function undo(g) {
    if (g.done || !g.undo.length) return false;
    for (const [i, v, n] of g.undo.pop()) { g.vals[i] = v; g.notes[i] = n; }
    g.rev++;
    return true;
  }

  // Put a digit in a cell. Returns what happened so the UI can react.
  function place(g, cell, digit) {
    const res = { changed: false, correct: false, wrong: false, erased: false, units: [], digitDone: false, win: false };
    if (g.done || isLocked(g, cell)) return res;
    const v0 = g.vals.slice(), n0 = g.notes.slice();
    if (g.vals[cell] === digit) { g.vals[cell] = 0; res.erased = true; res.changed = commit(g, v0, n0); return res; } // same wrong digit again: take it back
    g.vals[cell] = digit; g.notes[cell] = 0;
    if (digit === g.solution[cell]) {
      res.correct = true;
      const b = E.bit(digit);
      for (const p of E.PEERS[cell]) g.notes[p] &= ~b;
      for (const u of [E.ROW[cell], 9 + E.COL[cell], 18 + E.BOX[cell]]) if (E.UNITS[u].every(i => g.vals[i] === g.solution[i])) res.units.push(u);
      res.digitDone = remaining(g, digit) === 0;
      let all = true; for (let i = 0; i < 81; i++) if (g.vals[i] !== g.solution[i]) { all = false; break; }
      if (all) { g.done = true; res.win = true; }
    } else { res.wrong = true; g.mistakes++; }
    res.changed = commit(g, v0, n0);
    return res;
  }
  function toggleNote(g, cell, digit) {
    const res = { changed: false, on: false };
    if (g.done || isLocked(g, cell)) return res;
    const v0 = g.vals.slice(), n0 = g.notes.slice();
    g.vals[cell] = 0; // a note replaces a wrong digit
    g.notes[cell] ^= E.bit(digit);
    res.on = (g.notes[cell] & E.bit(digit)) !== 0;
    res.changed = commit(g, v0, n0);
    return res;
  }
  function erase(g, cell) {
    if (g.done || isLocked(g, cell)) return false;
    const v0 = g.vals.slice(), n0 = g.notes.slice();
    if (g.vals[cell]) g.vals[cell] = 0; else g.notes[cell] = 0;
    return commit(g, v0, n0);
  }
  // Used by the hint reveal: overwrite the notes of several cells in one undoable action.
  function setNotes(g, changes) {
    if (g.done) return false;
    const v0 = g.vals.slice(), n0 = g.notes.slice();
    for (const [cell, mask] of changes) if (!g.vals[cell]) g.notes[cell] = mask;
    return commit(g, v0, n0);
  }

  function serialize(g) {
    return {
      v: 1, level: g.level, given: Array.from(g.given).join(''), solution: Array.from(g.solution).join(''),
      vals: Array.from(g.vals).join(''), notes: Array.from(g.notes),
      mistakes: g.mistakes, elapsed: Math.round(g.elapsed), hints: g.hints, assisted: g.assisted, done: g.done, undo: g.undo,
    };
  }
  function deserialize(o) {
    if (!o || o.v !== 1 || !o.solution || o.solution.length !== 81 || !o.vals || o.vals.length !== 81) return null;
    const num = s => Int8Array.from(s, ch => +ch);
    return {
      level: o.level, given: Uint8Array.from(o.given, ch => +ch), solution: num(o.solution), vals: num(o.vals), notes: Int16Array.from(o.notes),
      mistakes: o.mistakes | 0, elapsed: +o.elapsed || 0, hints: o.hints | 0, assisted: !!o.assisted, done: !!o.done, undo: o.undo || [], rev: 0,
    };
  }

  const api = { MISTAKE_LIMIT, scramble, create, newGame, isWrong, isLocked, failed, status, remaining, undo, place, toggleNote, erase, setNotes, serialize, deserialize };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SudokuGame = api;
})(typeof self !== 'undefined' ? self : globalThis);
