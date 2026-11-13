// The hint ladder. Each tap on Hint reveals one more layer; only the last one touches the board.
//   wrong digit on the board  ->  say so, then show where
//   a note that rules out the real digit  ->  say so, then show which cell (never which digit)
//   otherwise the easiest technique that makes progress:  name -> where -> exact cells -> apply it
(function (root) {
  'use strict';
  const E = root.SudokuEngine, G = root.SudokuGame;

  const BLURB = {
    full_house: 'A row, column or box has only one empty cell left.',
    hidden_single_box: 'In some box, a digit has only one cell it can go in.',
    hidden_single_line: 'In some row or column, a digit has only one cell it can go in.',
    naked_single: 'Some cell has only one digit left that fits.',
    pointing: 'In a box, a digit is confined to one row or column, so it can be removed from the rest of that line.',
    claiming: 'In a row or column, a digit is confined to one box, so it can be removed from the rest of that box.',
    naked_pair: 'Two cells in a unit hold the same two candidates and nothing else.',
    hidden_pair: 'Two digits in a unit can only go in the same two cells.',
    naked_triple: 'Three cells in a unit share just three candidates between them.',
    hidden_triple: 'Three digits in a unit can only go in the same three cells.',
    x_wing: 'A digit sits in the same two positions of two rows (or columns), forming a rectangle.',
    skyscraper: 'Two rows (or columns) each hold a digit twice, lined up at one end but not the other.',
    two_string_kite: 'A row and a column each hold a digit twice, joined through a shared box.',
    swordfish: 'An X-wing stretched over three rows and three columns.',
    turbot_fish: 'A short chain on one digit: two pairs joined by a cell that sees one end of each.',
    xy_wing: 'A two-candidate pivot sees two other two-candidate cells, and the three share digits in a ring.',
    xyz_wing: 'Like an XY-wing, but the pivot holds all three digits.',
    simple_colouring: 'Follow one digit through the units where it has exactly two spots, colouring them alternately.',
    unique_rectangle: 'Four cells in two boxes would form a swappable rectangle, which a puzzle with one solution cannot allow.',
    x_chain: 'A longer chain on one digit, alternating "one of these two" links with "not both" links.',
    xy_chain: 'A chain of two-candidate cells, each passing a digit to the next.',
  };

  // Candidates the engine reasons from: what the board allows, narrowed by the player's own (verified) notes.
  function workingCandidates(g) {
    const base = E.candidates(g.vals), c = base.slice();
    for (let i = 0; i < 81; i++) if (!g.vals[i] && g.notes[i]) c[i] = base[i] & g.notes[i];
    return { base, c };
  }

  function compute(g) {
    const wrong = [], bad = [];
    for (let i = 0; i < 81; i++) {
      if (G.isWrong(g, i)) wrong.push(i);
      else if (!g.vals[i] && g.notes[i] && !(g.notes[i] & E.bit(g.solution[i]))) bad.push(i);
    }
    if (wrong.length) return { kind: 'wrong', cells: wrong, stage: 1, max: 2, rev: g.rev };
    if (bad.length) return { kind: 'notes', cells: bad, stage: 1, max: 2, rev: g.rev };
    const { base, c } = workingCandidates(g);
    const step = E.findStep(g.vals, c);
    if (step) return { kind: 'step', step, base, stage: 1, max: 4, rev: g.rev };
    let cell = -1; // nothing named fits: fall back to offering one cell
    for (let i = 0; i < 81; i++) if (!g.vals[i] && (cell < 0 || E.POP[base[i]] < E.POP[base[cell]])) cell = i;
    return { kind: 'stuck', cells: [cell], stage: 1, max: 2, rev: g.rev };
  }

  // What to show for the hint's current stage: text plus which cells to light up.
  function view(h) {
    const out = { title: '', body: '', region: [], cells: [], targets: [], strikes: [], techId: null, applied: false };
    if (h.kind === 'wrong') {
      out.title = 'Fix the red digit first';
      out.body = h.stage === 1 ? (h.cells.length > 1 ? 'There are wrong digits on the board.' : 'There is a wrong digit on the board.') : 'Highlighted now. Erase it or replace it.';
      if (h.stage >= 2) out.targets = h.cells;
    } else if (h.kind === 'notes') {
      out.title = 'Your notes have a mistake';
      out.body = h.stage === 1 ? 'A cell has had its real digit removed from its notes.' : (h.cells.length > 1 ? 'These cells are each missing their real digit.' : 'This cell is missing its real digit.');
      if (h.stage >= 2) out.targets = h.cells;
    } else if (h.kind === 'stuck') {
      out.title = 'No named technique fits here';
      out.body = h.stage === 1 ? 'Tap Hint again and one cell will be filled in for you.' : 'Filled in one cell. This game is now marked assisted.';
      out.applied = h.stage === 2; out.cells = h.stage === 2 ? h.cells : [];
    } else {
      const s = h.step;
      out.techId = s.tech.id;
      out.title = 'Look for: ' + s.tech.name;
      if (h.stage === 1) out.body = BLURB[s.tech.id];
      if (h.stage >= 2) { out.body = s.where + '.'; out.region = s.region; }
      if (h.stage >= 3) {
        out.cells = s.cells; out.region = [];
        if (s.place) out.body = s.where + '. The highlighted cell can be filled in.';
        else { out.targets = s.elims.map(e => e.cell); out.strikes = s.elims; out.body = s.where + '. Green cells form the pattern; the red candidates can be removed.'; }
      }
      if (h.stage === 4) {
        out.applied = true; out.strikes = []; out.targets = [];
        out.body = (s.place ? 'Placed the ' + s.place.digit + '.' : 'Removed the candidates.') + ' This game is now marked assisted.';
      }
    }
    return out;
  }

  // The final tap: do the step on the board. Returns the result of the placement, if there was one.
  function apply(g, h) {
    g.assisted = true;
    if (h.kind === 'stuck') return G.place(g, h.cells[0], g.solution[h.cells[0]]);
    const s = h.step;
    if (s.place) return G.place(g, s.place.cell, s.place.digit);
    // Elimination: make sure the cells involved carry notes, then strike the eliminated digits.
    const next = new Map();
    const noteOf = i => next.has(i) ? next.get(i) : (g.notes[i] ? (g.notes[i] & h.base[i]) : h.base[i]);
    for (const i of s.cells) if (!g.vals[i]) next.set(i, noteOf(i));
    for (const e of s.elims) next.set(e.cell, noteOf(e.cell) & ~E.bit(e.digit));
    G.setNotes(g, [...next]);
    return null;
  }

  const api = { BLURB, compute, view, apply, workingCandidates };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SudokuHints = api;
})(typeof self !== 'undefined' ? self : globalThis);
