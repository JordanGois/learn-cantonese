// Sudoku logic engine. Runs unchanged in Node (tools) and in the browser (app).
// Cells are 0..80 row-major. Candidates are 9-bit masks (bit d-1 set => digit d possible).
// Units: 0-8 rows, 9-17 columns, 18-26 boxes.
(function (root) {
  'use strict';

  const ROW = [], COL = [], BOX = [], UNITS = [], PEERS = [];
  for (let i = 0; i < 81; i++) { ROW[i] = (i / 9) | 0; COL[i] = i % 9; BOX[i] = ((ROW[i] / 3) | 0) * 3 + ((COL[i] / 3) | 0); }
  for (let u = 0; u < 27; u++) UNITS.push([]);
  for (let i = 0; i < 81; i++) { UNITS[ROW[i]].push(i); UNITS[9 + COL[i]].push(i); UNITS[18 + BOX[i]].push(i); }
  const SEES = new Uint8Array(81 * 81);
  for (let i = 0; i < 81; i++) {
    const s = new Set();
    for (const u of [ROW[i], 9 + COL[i], 18 + BOX[i]]) for (const c of UNITS[u]) if (c !== i) s.add(c);
    PEERS[i] = [...s];
    for (const p of PEERS[i]) SEES[i * 81 + p] = 1;
  }
  const sees = (a, b) => SEES[a * 81 + b] === 1;

  const POP = new Uint8Array(512), DIGS = [];
  for (let m = 0; m < 512; m++) { const ds = []; for (let d = 0; d < 9; d++) if (m & (1 << d)) ds.push(d + 1); POP[m] = ds.length; DIGS[m] = ds; }
  const bit = d => 1 << (d - 1);

  // Techniques in the order a solver tries them. `level` is the ladder level that first needs it.
  const TECHS = [
    { id: 'full_house', name: 'Last free cell', level: 1 },
    { id: 'hidden_single_box', name: 'Hidden single', level: 1 },
    { id: 'hidden_single_line', name: 'Hidden single', level: 3 },
    { id: 'naked_single', name: 'Naked single', level: 4 },
    { id: 'pointing', name: 'Pointing pair', level: 5 },
    { id: 'claiming', name: 'Box-line reduction', level: 5 },
    { id: 'naked_pair', name: 'Naked pair', level: 5 },
    { id: 'hidden_pair', name: 'Hidden pair', level: 5 },
    { id: 'naked_triple', name: 'Naked triple', level: 6 },
    { id: 'hidden_triple', name: 'Hidden triple', level: 6 },
    { id: 'x_wing', name: 'X-wing', level: 6 },
    { id: 'skyscraper', name: 'Skyscraper', level: 7 },
    { id: 'two_string_kite', name: '2-string kite', level: 7 },
    { id: 'swordfish', name: 'Swordfish', level: 7 },
    { id: 'turbot_fish', name: 'Turbot fish', level: 7 },
    { id: 'xy_wing', name: 'XY-wing', level: 8 },
    { id: 'xyz_wing', name: 'XYZ-wing', level: 8 },
    { id: 'simple_colouring', name: 'Simple colouring', level: 9 },
    { id: 'unique_rectangle', name: 'Unique rectangle', level: 9 },
    { id: 'x_chain', name: 'X-chain', level: 10 },
    { id: 'xy_chain', name: 'XY-chain', level: 10 },
  ];
  const TI = {}; TECHS.forEach((t, i) => { TI[t.id] = i; });

  const unitName = u => u < 9 ? 'row ' + (u + 1) : u < 18 ? 'column ' + (u - 8) : 'box ' + (u - 17);
  const cellName = i => 'row ' + (ROW[i] + 1) + ', column ' + (COL[i] + 1);
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const list = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];

  function parse(s) {
    const g = new Int8Array(81); let n = 0;
    for (const ch of String(s)) {
      if (n >= 81) break;
      if (ch >= '1' && ch <= '9') g[n++] = +ch; else if (ch === '0' || ch === '.' || ch === '_' || ch === '-') g[n++] = 0;
    }
    return n === 81 ? g : null;
  }
  const format = g => Array.from(g).join('');

  // ---- brute force (MRV + bitmasks). Counts solutions up to `limit`; writes the last one found to `out`.
  function countSolutions(g, limit, out, rnd) {
    const r = new Int32Array(9), c = new Int32Array(9), b = new Int32Array(9), grid = Int8Array.from(g);
    for (let i = 0; i < 81; i++) if (grid[i]) {
      const m = bit(grid[i]);
      if ((r[ROW[i]] | c[COL[i]] | b[BOX[i]]) & m) return 0;
      r[ROW[i]] |= m; c[COL[i]] |= m; b[BOX[i]] |= m;
    }
    let count = 0;
    (function rec() {
      let best = -1, bm = 0, bc = 10;
      for (let i = 0; i < 81; i++) if (!grid[i]) {
        const m = 511 & ~(r[ROW[i]] | c[COL[i]] | b[BOX[i]]), p = POP[m];
        if (p === 0) return;
        if (p < bc) { bc = p; best = i; bm = m; if (p === 1) break; }
      }
      if (best < 0) { count++; if (out) out.set(grid); return; }
      const ds = DIGS[bm].slice();
      if (rnd) for (let i = ds.length - 1; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; const t = ds[i]; ds[i] = ds[j]; ds[j] = t; }
      for (const d of ds) {
        const m = bit(d); grid[best] = d; r[ROW[best]] |= m; c[COL[best]] |= m; b[BOX[best]] |= m;
        rec();
        grid[best] = 0; r[ROW[best]] &= ~m; c[COL[best]] &= ~m; b[BOX[best]] &= ~m;
        if (count >= limit) return;
      }
    })();
    return count;
  }
  function solve(g) { const out = new Int8Array(81); return countSolutions(g, 1, out) ? out : null; }

  function candidates(v) {
    const c = new Int32Array(81);
    for (let i = 0; i < 81; i++) {
      if (v[i]) continue;
      let m = 511; for (const p of PEERS[i]) if (v[p]) m &= ~bit(v[p]);
      c[i] = m;
    }
    return c;
  }

  // ---- step construction
  // A step is { t, tech, place: {cell, digit} | null, elims: [{cell, digit}], cells: [pattern cells], where: 'Row 4' }
  function mk(id, o) {
    return { t: TI[id], tech: TECHS[TI[id]], place: o.place || null, elims: o.elims || [], cells: o.cells || [], where: o.where || '', digits: o.digits || [], region: o.region || [] };
  }
  function elimsFor(c, cells, mask, skip) {
    const out = [];
    for (const i of cells) { if (skip && skip.includes(i)) continue; const m = c[i] & mask; if (m) for (const d of DIGS[m]) out.push({ cell: i, digit: d }); }
    return out;
  }
  function combos(arr, k) {
    const res = [], cur = [];
    (function r(s) { if (cur.length === k) { res.push(cur.slice()); return; } for (let i = s; i <= arr.length - (k - cur.length); i++) { cur.push(arr[i]); r(i + 1); cur.pop(); } })(0);
    return res;
  }
  const withDigit = (c, d) => { const out = []; for (let i = 0; i < 81; i++) if (c[i] & bit(d)) out.push(i); return out; };
  const boxOf = i => UNITS[18 + BOX[i]];
  function commonPeers(a, b) { const out = []; for (const p of PEERS[a]) if (p !== b && sees(p, b)) out.push(p); return out; }

  // ---- singles
  function fFullHouse(v) {
    for (let u = 0; u < 27; u++) {
      let e = -1, n = 0, seen = 0;
      for (const i of UNITS[u]) { if (v[i]) seen |= bit(v[i]); else { e = i; n++; } }
      if (n === 1) { const m = 511 & ~seen; if (POP[m] === 1) return mk('full_house', { place: { cell: e, digit: DIGS[m][0] }, cells: [e], where: cap(unitName(u)), region: UNITS[u] }); }
    }
    return null;
  }
  function hiddenSingle(v, c, from, to, id) {
    for (let u = from; u < to; u++) for (let d = 1; d <= 9; d++) {
      let n = 0, at = -1; const b = bit(d);
      for (const i of UNITS[u]) if (c[i] & b) { n++; at = i; if (n > 1) break; }
      if (n === 1) return mk(id, { place: { cell: at, digit: d }, cells: [at], where: cap(unitName(u)), digits: [d], region: UNITS[u] });
    }
    return null;
  }
  const fHiddenBox = (v, c) => hiddenSingle(v, c, 18, 27, 'hidden_single_box');
  const fHiddenLine = (v, c) => hiddenSingle(v, c, 0, 18, 'hidden_single_line');
  function fNakedSingle(v, c) {
    for (let i = 0; i < 81; i++) if (!v[i] && POP[c[i]] === 1) return mk('naked_single', { place: { cell: i, digit: DIGS[c[i]][0] }, cells: [i], where: cap(unitName(18 + BOX[i])), region: boxOf(i) });
    return null;
  }

  // ---- intersections
  function fPointing(v, c) {
    for (let bx = 0; bx < 9; bx++) for (let d = 1; d <= 9; d++) {
      const b = bit(d), cs = UNITS[18 + bx].filter(i => c[i] & b); if (cs.length < 2) continue;
      for (const [arr, off] of [[ROW, 0], [COL, 9]]) if (cs.every(i => arr[i] === arr[cs[0]])) {
        const line = off + arr[cs[0]], el = elimsFor(c, UNITS[line].filter(i => BOX[i] !== bx), b);
        if (el.length) return mk('pointing', { elims: el, cells: cs, digits: [d], where: cap(unitName(18 + bx)), region: UNITS[18 + bx] });
      }
    }
    return null;
  }
  function fClaiming(v, c) {
    for (let u = 0; u < 18; u++) for (let d = 1; d <= 9; d++) {
      const b = bit(d), cs = UNITS[u].filter(i => c[i] & b); if (cs.length < 2) continue;
      if (cs.every(i => BOX[i] === BOX[cs[0]])) {
        const bu = 18 + BOX[cs[0]], el = elimsFor(c, UNITS[bu], b, cs);
        if (el.length) return mk('claiming', { elims: el, cells: cs, digits: [d], where: cap(unitName(u)), region: UNITS[u] });
      }
    }
    return null;
  }

  // ---- subsets
  function nakedSubset(v, c, k, id) {
    for (let u = 0; u < 27; u++) {
      const es = UNITS[u].filter(i => !v[i]); if (es.length <= k) continue;
      for (const cb of combos(es.filter(i => POP[c[i]] <= k), k)) {
        let m = 0; for (const i of cb) m |= c[i]; if (POP[m] !== k) continue;
        const el = elimsFor(c, es, m, cb);
        if (el.length) return mk(id, { elims: el, cells: cb, digits: DIGS[m], where: cap(unitName(u)), region: UNITS[u] });
      }
    }
    return null;
  }
  function hiddenSubset(v, c, k, id) {
    for (let u = 0; u < 27; u++) {
      const es = UNITS[u].filter(i => !v[i]); if (es.length <= k) continue;
      const ds = [];
      for (let d = 1; d <= 9; d++) { let n = 0; for (const i of es) if (c[i] & bit(d)) n++; if (n >= 1 && n <= k) ds.push(d); }
      for (const cb of combos(ds, k)) {
        let m = 0; for (const d of cb) m |= bit(d);
        const cs = es.filter(i => c[i] & m); if (cs.length !== k) continue;
        const el = elimsFor(c, cs, 511 & ~m);
        if (el.length) return mk(id, { elims: el, cells: cs, digits: cb, where: cap(unitName(u)), region: UNITS[u] });
      }
    }
    return null;
  }

  // ---- basic fish
  function fish(v, c, k, id) {
    for (let d = 1; d <= 9; d++) for (const [base, cover, cov, lin] of [[0, 9, COL, ROW], [9, 0, ROW, COL]]) {
      const b = bit(d), lines = [];
      for (let l = 0; l < 9; l++) { let m = 0; for (const i of UNITS[base + l]) if (c[i] & b) m |= 1 << cov[i]; const p = POP[m]; if (p >= 2 && p <= k) lines.push([l, m]); }
      for (const cb of combos(lines, k)) {
        let m = 0; for (const x of cb) m |= x[1]; if (POP[m] !== k) continue;
        const ls = cb.map(x => x[0]), el = [], pat = [];
        for (let x = 0; x < 9; x++) if (m & (1 << x)) for (const i of UNITS[cover + x]) {
          if (!(c[i] & b)) continue;
          if (ls.includes(lin[i])) pat.push(i); else el.push({ cell: i, digit: d });
        }
        if (el.length) return mk(id, { elims: el, cells: pat, digits: [d], where: 'Digit ' + d + ', ' + (base === 0 ? 'rows ' : 'columns ') + list(ls.map(x => x + 1)), region: [].concat(...ls.map(l => UNITS[base + l])) });
      }
    }
    return null;
  }

  // ---- wings
  function fXYWing(v, c) {
    for (let p = 0; p < 81; p++) {
      if (POP[c[p]] !== 2) continue;
      const ws = PEERS[p].filter(i => POP[c[i]] === 2 && POP[c[i] & c[p]] === 1);
      for (let x = 0; x < ws.length; x++) for (let y = x + 1; y < ws.length; y++) {
        const a = ws[x], b = ws[y];
        if ((c[a] & c[p]) === (c[b] & c[p])) continue;
        const z = c[a] & c[b] & ~c[p]; if (POP[z] !== 1) continue;
        const el = elimsFor(c, commonPeers(a, b), z, [p]);
        if (el.length) return mk('xy_wing', { elims: el, cells: [p, a, b], digits: DIGS[z], where: 'Pivot in ' + unitName(18 + BOX[p]), region: boxOf(p) });
      }
    }
    return null;
  }
  function fXYZWing(v, c) {
    for (let p = 0; p < 81; p++) {
      if (POP[c[p]] !== 3) continue;
      const ws = PEERS[p].filter(i => POP[c[i]] === 2 && (c[i] & c[p]) === c[i]);
      for (let x = 0; x < ws.length; x++) for (let y = x + 1; y < ws.length; y++) {
        const a = ws[x], b = ws[y];
        if (c[a] === c[b] || (c[a] | c[b]) !== c[p]) continue;
        const z = c[a] & c[b]; if (POP[z] !== 1) continue;
        const el = elimsFor(c, commonPeers(a, b).filter(i => sees(i, p)), z);
        if (el.length) return mk('xyz_wing', { elims: el, cells: [p, a, b], digits: DIGS[z], where: 'Pivot in ' + unitName(18 + BOX[p]), region: boxOf(p) });
      }
    }
    return null;
  }

  // ---- single-digit patterns
  function conjugates(c, d, from, to) { // lines/units holding digit d in exactly two cells
    const out = [], b = bit(d);
    for (let u = from; u < to; u++) { const cs = UNITS[u].filter(i => c[i] & b); if (cs.length === 2) out.push([cs[0], cs[1], u]); }
    return out;
  }
  function fSkyscraper(v, c) {
    for (let d = 1; d <= 9; d++) for (const [from, cov] of [[0, COL], [9, ROW]]) {
      const ls = conjugates(c, d, from, from + 9);
      for (let x = 0; x < ls.length; x++) for (let y = x + 1; y < ls.length; y++) {
        const A = ls[x], B = ls[y];
        for (const [a0, a1] of [[A[0], A[1]], [A[1], A[0]]]) for (const [b0, b1] of [[B[0], B[1]], [B[1], B[0]]]) {
          if (cov[a0] !== cov[b0] || cov[a1] === cov[b1]) continue; // a0/b0 are the aligned base, a1/b1 the roof
          const el = elimsFor(c, commonPeers(a1, b1), bit(d), [a0, b0]);
          if (el.length) return mk('skyscraper', { elims: el, cells: [a0, a1, b0, b1], digits: [d], where: 'Digit ' + d + ', ' + unitName(A[2]) + ' and ' + unitName(B[2]), region: UNITS[A[2]].concat(UNITS[B[2]]) });
        }
      }
    }
    return null;
  }
  function fKite(v, c) {
    for (let d = 1; d <= 9; d++) {
      const rs = conjugates(c, d, 0, 9), cs = conjugates(c, d, 9, 18);
      for (const R of rs) for (const C of cs) {
        if (R[0] === C[0] || R[0] === C[1] || R[1] === C[0] || R[1] === C[1]) continue;
        for (const [r0, r1] of [[R[0], R[1]], [R[1], R[0]]]) for (const [c0, c1] of [[C[0], C[1]], [C[1], C[0]]]) {
          if (BOX[r0] !== BOX[c0]) continue; // r0 and c0 share the box; r1 and c1 are the string ends
          const el = elimsFor(c, commonPeers(r1, c1), bit(d), [r0, c0]);
          if (el.length) return mk('two_string_kite', { elims: el, cells: [r0, r1, c0, c1], digits: [d], where: 'Digit ' + d + ', ' + unitName(R[2]) + ' and ' + unitName(C[2]), region: UNITS[R[2]].concat(UNITS[C[2]]) });
        }
      }
    }
    return null;
  }
  // X-chain: strong = weak - strong = ... on one digit. Either end is the digit, so anything seeing both ends loses it.
  function xChain(v, c, minStrong, maxStrong, id) {
    for (let d = 1; d <= 9; d++) {
      const b = bit(d), strong = new Map();
      for (const [x, y] of conjugates(c, d, 0, 27)) {
        if (!strong.has(x)) strong.set(x, new Set()); if (!strong.has(y)) strong.set(y, new Set());
        strong.get(x).add(y); strong.get(y).add(x);
      }
      if (strong.size < minStrong * 2) continue;
      let found = null;
      const path = [];
      const rec = () => {
        const n = path.length / 2, a = path[0], z = path[path.length - 1];
        if (n >= minStrong) {
          const el = elimsFor(c, commonPeers(a, z), b, path);
          if (el.length) { found = mk(id, { elims: el, cells: path.slice(), digits: [d], where: 'Digit ' + d, region: withDigit(c, d) }); return; }
        }
        if (n >= maxStrong) return;
        for (const p of PEERS[z]) {
          if (!(c[p] & b) || !strong.has(p) || path.includes(p)) continue;
          for (const q of strong.get(p)) {
            if (path.includes(q)) continue;
            path.push(p, q); rec(); path.pop(); path.pop();
            if (found) return;
          }
        }
      };
      for (const [a, set] of strong) {
        for (const z of set) { path.length = 0; path.push(a, z); rec(); if (found) return found; }
      }
    }
    return null;
  }
  function fColouring(v, c) {
    for (let d = 1; d <= 9; d++) {
      const b = bit(d), adj = new Map();
      for (const [x, y] of conjugates(c, d, 0, 27)) {
        if (!adj.has(x)) adj.set(x, []); if (!adj.has(y)) adj.set(y, []);
        adj.get(x).push(y); adj.get(y).push(x);
      }
      const colour = new Map();
      for (const start of adj.keys()) {
        if (colour.has(start)) continue;
        const comp = [start], q = [start]; colour.set(start, 0); let ok = true;
        while (q.length) {
          const x = q.pop();
          for (const y of adj.get(x)) {
            if (!colour.has(y)) { colour.set(y, 1 - colour.get(x)); comp.push(y); q.push(y); }
            else if (colour.get(y) === colour.get(x)) ok = false;
          }
        }
        if (!ok || comp.length < 3) continue;
        const side = [comp.filter(i => colour.get(i) === 0), comp.filter(i => colour.get(i) === 1)];
        // colour wrap: two cells of one colour see each other, so that colour is false everywhere
        for (let s = 0; s < 2; s++) {
          let clash = false;
          for (let x = 0; x < side[s].length && !clash; x++) for (let y = x + 1; y < side[s].length; y++) if (sees(side[s][x], side[s][y])) { clash = true; break; }
          if (clash) return mk('simple_colouring', { elims: side[s].map(i => ({ cell: i, digit: d })), cells: comp, digits: [d], where: 'Digit ' + d, region: withDigit(c, d) });
        }
        // colour trap: an outside cell that sees both colours
        const el = [];
        for (let i = 0; i < 81; i++) {
          if (!(c[i] & b) || comp.includes(i)) continue;
          if (side[0].some(x => sees(i, x)) && side[1].some(x => sees(i, x))) el.push({ cell: i, digit: d });
        }
        if (el.length) return mk('simple_colouring', { elims: el, cells: comp, digits: [d], where: 'Digit ' + d, region: withDigit(c, d) });
      }
    }
    return null;
  }

  // ---- uniqueness (type 1). Valid only because banked puzzles have exactly one solution.
  function fUniqueRect(v, c) {
    for (let r1 = 0; r1 < 9; r1++) for (let r2 = r1 + 1; r2 < 9; r2++) for (let c1 = 0; c1 < 9; c1++) for (let c2 = c1 + 1; c2 < 9; c2++) {
      const sameBand = ((r1 / 3) | 0) === ((r2 / 3) | 0), sameStack = ((c1 / 3) | 0) === ((c2 / 3) | 0);
      if (sameBand === sameStack) continue; // the four corners must sit in exactly two boxes
      const q = [r1 * 9 + c1, r1 * 9 + c2, r2 * 9 + c1, r2 * 9 + c2];
      if (q.some(i => v[i])) continue;
      for (let k = 0; k < 4; k++) {
        const rest = q.filter((_, j) => j !== k), m = c[rest[0]];
        if (POP[m] !== 2 || c[rest[1]] !== m || c[rest[2]] !== m) continue;
        if ((c[q[k]] & m) !== m || c[q[k]] === m) continue;
        return mk('unique_rectangle', { elims: DIGS[m].map(d => ({ cell: q[k], digit: d })), cells: q, digits: DIGS[m], where: cap(unitName(18 + BOX[q[0]])) + ' and ' + unitName(18 + BOX[q[3]]), region: boxOf(q[0]).concat(boxOf(q[3])) });
      }
    }
    return null;
  }

  // ---- XY-chain: bivalue cells linked by shared digits; start and end share digit z, one of them must be z.
  function fXYChain(v, c) {
    const MAX = 8;
    for (let s = 0; s < 81; s++) {
      if (POP[c[s]] !== 2) continue;
      for (const z of DIGS[c[s]]) {
        const zb = bit(z), path = [s]; let found = null;
        const rec = (cell, carry) => { // `carry` is the digit forced into the next link
          for (const p of PEERS[cell]) {
            if (POP[c[p]] !== 2 || !(c[p] & carry) || path.includes(p)) continue;
            const out = c[p] & ~carry;
            path.push(p);
            if (out === zb && path.length >= 3) {
              const el = elimsFor(c, commonPeers(s, p), zb, path);
              if (el.length) { found = mk('xy_chain', { elims: el, cells: path.slice(), digits: [z], where: 'Starts in ' + unitName(18 + BOX[s]), region: boxOf(s) }); return; }
            }
            if (path.length < MAX) rec(p, out);
            path.pop();
            if (found) return;
          }
        };
        rec(s, c[s] & ~zb);
        if (found) return found;
      }
    }
    return null;
  }

  const FINDERS = [
    fFullHouse, fHiddenBox, fHiddenLine, fNakedSingle, fPointing, fClaiming,
    (v, c) => nakedSubset(v, c, 2, 'naked_pair'), (v, c) => hiddenSubset(v, c, 2, 'hidden_pair'),
    (v, c) => nakedSubset(v, c, 3, 'naked_triple'), (v, c) => hiddenSubset(v, c, 3, 'hidden_triple'),
    (v, c) => fish(v, c, 2, 'x_wing'), fSkyscraper, fKite, (v, c) => fish(v, c, 3, 'swordfish'),
    (v, c) => xChain(v, c, 2, 2, 'turbot_fish'), fXYWing, fXYZWing,
    fColouring, fUniqueRect, (v, c) => xChain(v, c, 3, 4, 'x_chain'), fXYChain,
  ];

  // Easiest step that makes progress from this state, or null if the engine is out of ideas.
  function findStep(v, c) {
    for (let t = 0; t < FINDERS.length; t++) { const s = FINDERS[t](v, c); if (s) return s; }
    return null;
  }
  const LEVEL_NAMES = ['', 'Easy', 'Medium', 'Hard', 'Expert', 'Extreme', 'Fiendish', 'Diabolical', 'Nightmare', 'Inhuman', 'Impossible'];
  function applyStep(v, c, s) {
    if (s.place) {
      const i = s.place.cell, b = bit(s.place.digit);
      v[i] = s.place.digit; c[i] = 0; for (const p of PEERS[i]) c[p] &= ~b;
    } else for (const e of s.elims) c[e.cell] &= ~bit(e.digit);
  }
  function countSingles(v, c) { // how many cells can be filled right now by any single (the "opportunity" count)
    const hit = new Uint8Array(81); let n = 0;
    for (let i = 0; i < 81; i++) if (!v[i] && POP[c[i]] === 1) { hit[i] = 1; n++; }
    for (let u = 0; u < 27; u++) for (let d = 1; d <= 9; d++) {
      let k = 0, at = -1; const b = bit(d);
      for (const i of UNITS[u]) if (c[i] & b) { k++; at = i; if (k > 1) break; }
      if (k === 1 && !hit[at]) { hit[at] = 1; n++; }
    }
    return n;
  }

  // Solve the way a person would and report what it took.
  function grade(puzzle, onStep) {
    const v = Int8Array.from(puzzle), c = candidates(v), counts = new Array(TECHS.length).fill(0);
    let clues = 0; for (let i = 0; i < 81; i++) if (v[i]) clues++;
    let filled = clues, hardest = 0, hardSteps = 0, oppSum = 0, oppN = 0, minOpp = 99, firstHardAt = -1;
    while (filled < 81) {
      const s = findStep(v, c);
      if (!s) return { solved: false, level: 11, hardest: -1, counts, hardSteps, clues, avgOpp: oppN ? oppSum / oppN : 0, minOpp, firstHardAt };
      if (onStep) onStep(s, v, c);
      if (s.place) { const o = countSingles(v, c); oppSum += o; oppN++; if (o < minOpp) minOpp = o; filled++; }
      else { hardSteps++; if (firstHardAt < 0) firstHardAt = filled; }
      counts[s.t]++; if (s.t > hardest) hardest = s.t;
      applyStep(v, c, s);
    }
    return { solved: true, level: TECHS[hardest].level, hardest, counts, hardSteps, clues, avgOpp: oppSum / oppN, minOpp, firstHardAt };
  }

  const api = { LEVEL_NAMES, ROW, COL, BOX, UNITS, PEERS, POP, DIGS, TECHS, TI, sees, bit, parse, format, countSolutions, solve, candidates, findStep, applyStep, grade, unitName, cellName };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SudokuEngine = api;
})(typeof self !== 'undefined' ? self : typeof globalThis !== 'undefined' ? globalThis : this);
