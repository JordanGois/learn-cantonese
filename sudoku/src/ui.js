// Interface: rendering, input, feedback, and the sheets (levels, result, stats, guide, settings).
(function () {
  'use strict';
  const E = self.SudokuEngine, G = self.SudokuGame, H = self.SudokuHints, A = self.SudokuAudio, S = self.SudokuStorage;
  const BANK = self.SUDOKU_BANK, GUIDE = self.SUDOKU_GUIDE, EXAMPLES = self.SUDOKU_GUIDE_EXAMPLES;
  const $ = id => document.getElementById(id);

  const LEVEL_SUB = ['', 'Scanning, plenty of clues', 'Scanning, fewer clues', 'Hidden singles in rows and columns', 'Naked singles',
    'Pointing pairs, naked and hidden pairs', 'Triples, X-wing', 'Skyscraper, kite, swordfish', 'XY-wing, XYZ-wing', 'Colouring, unique rectangles', 'Chains'];
  const STATE_CLASSES = ['user', 'wrong', 'peer', 'same', 'conflict', 'sel', 'hr', 'hp', 'ht'];
  const LONG_PRESS_MS = 420;

  let g = null;          // game in progress (or just finished)
  let sel = -1;          // selected cell
  let notesMode = false;
  let lock = 0;          // digit locked on the pad (digit-first entry), 0 if none
  let hint = null;       // hint being shown
  let paused = false;
  let toast = null;      // { text, until }
  let settings = S.loadSettings();
  let lastTick = Date.now(), lastSave = 0;

  // ---------- board DOM
  function buildBoard(root) {
    const out = [];
    for (let i = 0; i < 81; i++) {
      const r = E.ROW[i], c = E.COL[i], d = document.createElement('div');
      d.className = 'cell' + (c === 8 ? ' ex' : c % 3 === 2 ? ' bx' : '') + (r === 8 ? ' ey' : r % 3 === 2 ? ' by' : '');
      d.dataset.i = i;
      const v = document.createElement('span'); v.className = 'val';
      const n = document.createElement('div'); n.className = 'notes';
      const marks = [];
      for (let k = 1; k <= 9; k++) { const m = document.createElement('i'); m.textContent = k; n.appendChild(m); marks.push(m); }
      d.appendChild(v); d.appendChild(n); root.appendChild(d);
      out.push({ el: d, val: v, marks });
    }
    return out;
  }
  const cells = buildBoard($('board'));
  const padBtns = [];
  for (let d = 1; d <= 9; d++) {
    const b = document.createElement('button'); b.className = 'num'; b.dataset.d = d;
    b.appendChild(document.createTextNode(d));
    const s = document.createElement('small'); b.appendChild(s);
    $('pad').appendChild(b); padBtns[d] = { el: b, left: s };
  }

  const fmt = ms => {
    const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), two = x => String(x).padStart(2, '0');
    return (h ? h + ':' + two(m) : two(m)) + ':' + two(s % 60);
  };
  const flags = list => { const a = new Uint8Array(81); if (list) for (const i of list) a[i] = 1; return a; };

  // ---------- render
  function render() {
    const hv = hint ? H.view(hint) : null;
    const region = flags(hv && hv.region), pat = flags(hv && hv.cells), tgt = flags(hv && hv.targets);
    const strike = new Int16Array(81); if (hv) for (const e of hv.strikes) strike[e.cell] |= E.bit(e.digit);
    const focus = g ? (lock || (sel >= 0 ? g.vals[sel] : 0)) : 0;
    const conflict = new Uint8Array(81);
    if (g) for (let i = 0; i < 81; i++) if (G.isWrong(g, i)) for (const p of E.PEERS[i]) if (g.vals[p] === g.vals[i]) conflict[p] = 1;

    for (let i = 0; i < 81; i++) {
      const c = cells[i], v = g ? g.vals[i] : 0, on = {
        user: v && !g.given[i] && !G.isWrong(g, i), wrong: v && G.isWrong(g, i),
        peer: sel >= 0 && i !== sel && E.sees(sel, i), same: focus && v === focus, conflict: conflict[i],
        sel: i === sel, hr: region[i], hp: pat[i], ht: tgt[i],
      };
      const text = v ? String(v) : ''; if (c.val.textContent !== text) c.val.textContent = text;
      for (const k of STATE_CLASSES) c.el.classList.toggle(k, !!on[k]);
      const nm = g && !v ? g.notes[i] : 0;
      for (let d = 1; d <= 9; d++) {
        const b = E.bit(d), cls = (strike[i] & b) && !v ? 'strike' : (nm & b) ? (d === focus ? 'on same' : 'on') : '';
        if (c.marks[d - 1].className !== cls) c.marks[d - 1].className = cls;
      }
    }
    for (let d = 1; d <= 9; d++) {
      const left = g ? G.remaining(g, d) : 9;
      padBtns[d].left.textContent = left;
      padBtns[d].el.classList.toggle('done', left === 0);
      padBtns[d].el.classList.toggle('locked', lock === d);
    }
    $('lvl').textContent = g ? E.LEVEL_NAMES[g.level] : '-';
    $('mist').textContent = (g ? g.mistakes : 0) + '/' + G.MISTAKE_LIMIT;
    $('mist-wrap').classList.toggle('fail', !!g && G.failed(g));
    $('time').textContent = fmt(g ? g.elapsed : 0);
    $('btn-notes').classList.toggle('on', notesMode);
    $('notes-badge').textContent = notesMode ? 'ON' : 'OFF';
    $('paused').hidden = !paused;
    $('pause-ico').setAttribute('href', paused ? '#i-play' : '#i-pause');

    const st = $('status');
    if (toast && Date.now() < toast.until) { st.textContent = toast.text; st.className = 'status warn'; }
    else if (lock) { st.textContent = lock + ' locked' + (notesMode ? ' (notes)' : '') + ' — tap cells to ' + (notesMode ? 'note' : 'place') + ' it, tap ' + lock + ' to unlock'; st.className = 'status lock'; }
    else { st.textContent = ''; st.className = 'status'; }

    $('hint').hidden = !hv;
    if (hv) {
      $('hint-title').textContent = hv.title;
      $('hint-body').textContent = hv.body;
      $('hint-guide').hidden = !hv.techId;
      const dots = $('hint-dots'); dots.textContent = '';
      for (let k = 1; k <= hint.max; k++) { const d = document.createElement('i'); if (k <= hint.stage) d.className = 'on'; dots.appendChild(d); }
    }
  }
  function say(text) { toast = { text, until: Date.now() + 4000 }; setTimeout(render, 4050); }

  // ---------- feedback
  function anim(i, cls, delay) {
    const e = cells[i].el;
    e.classList.remove(cls); void e.offsetWidth; // restart if already running
    e.style.setProperty('--d', (delay || 0) + 'ms');
    e.classList.add(cls);
    setTimeout(() => e.classList.remove(cls), (delay || 0) + 650);
  }
  function ripple(list, from) {
    for (const i of list) anim(i, 'ripple', (Math.abs(E.ROW[i] - E.ROW[from]) + Math.abs(E.COL[i] - E.COL[from])) * 45);
  }

  // ---------- game flow
  function save() { if (g) { S.saveGame(G.serialize(g)); lastSave = Date.now(); } }
  function changed(keepHint) {
    if (!keepHint) hint = null;
    if (lock && G.remaining(g, lock) === 0) lock = 0;
    save(); render();
  }
  function start(level) {
    g = G.newGame(level, BANK);
    sel = -1; lock = 0; hint = null; paused = false; notesMode = false; toast = null;
    closeModal(); save(); render();
  }
  function restart() {
    const puzzle = Int8Array.from(g.solution, (d, i) => g.given[i] ? d : 0);
    g = G.create(g.level, puzzle);
    sel = -1; lock = 0; hint = null; paused = false; toast = null;
    closeModal(); save(); render();
  }
  function afterPlace(cell, r, keepHint) {
    changed(keepHint);
    if (r.erased) { A.play('erase'); return; }
    if (r.wrong) {
      A.play('error'); anim(cell, 'shake');
      if (g.mistakes === G.MISTAKE_LIMIT) { say('3 mistakes: this game counts as a fail. You can keep playing.'); render(); }
      return;
    }
    anim(cell, 'pop');
    if (r.win) { finish(cell); return; }
    if (r.units.length) { A.play('unit'); for (const u of r.units) ripple(E.UNITS[u], cell); if (r.digitDone) setTimeout(() => A.play('digit'), 320); }
    else A.play(r.digitDone ? 'digit' : 'place');
  }
  function finish(cell) {
    const st = G.status(g), stats = S.record(g.level, st, g.elapsed, g.hints);
    sel = -1; lock = 0; save(); render();
    A.play('win'); ripple([...Array(81).keys()], cell);
    setTimeout(() => showResult(st, stats), 1300);
  }
  function enter(cell, d) {
    if (!g || g.done || paused || G.isLocked(g, cell)) { render(); return; }
    if (notesMode) { if (G.toggleNote(g, cell, d).changed) { A.play('note'); changed(); } return; }
    const r = G.place(g, cell, d);
    if (r.changed) afterPlace(cell, r); else render();
  }
  function tapCell(i) {
    if (!g || paused) return;
    sel = i;
    if (lock && !g.done) enter(i, lock); else render();
  }
  function setLock(d) {
    if (!g || g.done || G.remaining(g, d) === 0) return;
    lock = d; A.play('lock'); render();
  }
  function tapNum(d) {
    if (!g || g.done || paused) return;
    if (lock) { lock = lock === d ? 0 : (G.remaining(g, d) ? d : lock); render(); return; }
    if (sel >= 0) enter(sel, d);
  }
  function doErase() { if (g && sel >= 0 && !paused && G.erase(g, sel)) { A.play('erase'); changed(); } }
  function doUndo() { if (g && !paused && G.undo(g)) { A.play('undo'); changed(); } }
  function toggleNotes() { notesMode = !notesMode; A.play('note'); render(); }
  function togglePause() { if (!g || g.done) return; paused = !paused; lastTick = Date.now(); save(); render(); }
  function doHint() {
    if (!g || g.done || paused) return;
    if (hint && hint.rev === g.rev && hint.stage < hint.max) hint.stage++;
    else { hint = H.compute(g); if (hint.kind === 'step' || hint.kind === 'stuck') g.hints++; }
    A.play('hint');
    const reveal = (hint.kind === 'step' && hint.stage === 4) || (hint.kind === 'stuck' && hint.stage === 2);
    if (!reveal) { save(); render(); return; }
    const h = hint, cell = h.kind === 'stuck' ? h.cells[0] : h.step.place ? h.step.place.cell : -1;
    const r = H.apply(g, h);
    h.rev = g.rev; // keep the card up to say what was done
    if (r && r.changed) afterPlace(cell, r, true); else changed(true);
  }

  // ---------- sheets
  const head = title => '<div class="sheet-head"><h2>' + title + '</h2><button class="icon-btn" data-act="close" aria-label="Close"><svg viewBox="0 0 24 24"><use href="#i-close"/></svg></button></div>';
  function openModal(html) { $('sheet').innerHTML = html; $('sheet').scrollTop = 0; $('modal').hidden = false; }
  function closeModal() { $('modal').hidden = true; $('sheet').textContent = ''; lastTick = Date.now(); }

  function showLevels() {
    const stats = S.loadStats(); let rows = '';
    for (let l = 1; l <= 10; l++) {
      const s = stats[l], avg = S.average(s);
      rows += '<button class="level' + (g && !g.done && g.level === l ? ' current' : '') + '" data-act="start" data-arg="' + l + '"><span class="n">' + l + '</span>' +
        '<span><div class="name">' + E.LEVEL_NAMES[l] + '</div><div class="sub">' + LEVEL_SUB[l] + '</div></span>' +
        '<span class="avg">' + (avg ? 'avg ' + fmt(avg) + '<br>' + s.pass + ' passed' : '') + '</span></button>';
    }
    openModal(head('New game') + '<div class="levels">' + rows + '</div>' +
      (g && !g.done ? '<button class="secondary" data-act="restart">Restart this puzzle</button>' : ''));
  }
  function showResult(st, s) {
    const label = { pass: 'Passed', fail: 'Failed: 3 or more mistakes', assisted: 'Assisted' }[st];
    const why = st === 'fail' ? 'Three or more mistakes, so this time is left out of your average.'
      : st === 'assisted' ? 'A step was applied for you, so this time is left out of your average.' : '';
    openModal(head('Solved') + '<div class="result"><span class="tag ' + st + '">' + label + '</span><div class="big">' + fmt(g.elapsed) + '</div>' +
      '<div class="sub">Level ' + g.level + ' · ' + E.LEVEL_NAMES[g.level] + '</div></div>' +
      '<div class="facts"><div class="fact">Mistakes<b>' + g.mistakes + '</b></div><div class="fact">Hints<b>' + g.hints + '</b></div>' +
      '<div class="fact">Best at this level<b>' + (s.best ? fmt(s.best) : '–') + '</b></div><div class="fact">Average at this level<b>' + (s.pass ? fmt(S.average(s)) : '–') + '</b></div></div>' +
      (why ? '<p class="note-line">' + why + '</p>' : '') +
      '<button class="primary" data-act="start" data-arg="' + g.level + '">New game, same level</button><div class="gap"></div>' +
      '<button class="secondary" data-act="levels">Change level</button>');
  }
  function showStats() {
    const stats = S.loadStats(); let rows = '';
    for (let l = 1; l <= 10; l++) {
      const s = stats[l];
      rows += '<tr><td>' + l + ' ' + E.LEVEL_NAMES[l] + '</td><td>' + s.played + '</td><td>' + s.pass + '</td><td>' + s.fail + '</td><td>' + s.assisted + '</td><td>' +
        (s.best ? fmt(s.best) : '–') + '</td><td>' + (s.pass ? fmt(S.average(s)) : '–') + '</td></tr>';
    }
    openModal(head('Statistics') + '<table class="stats"><tr><th>Level</th><th>Played</th><th>Pass</th><th>Fail</th><th>Asst.</th><th>Best</th><th>Avg</th></tr>' + rows + '</table>' +
      '<p class="note-line">Best and average count only passes: fewer than 3 mistakes and no step applied by a hint. Stats are stored on this device.</p>');
  }
  function showSettings() {
    const seg = ['auto', 'light', 'dark'].map(t => '<button data-act="theme" data-arg="' + t + '" class="' + (settings.theme === t ? 'on' : '') + '">' + t[0].toUpperCase() + t.slice(1) + '</button>').join('');
    const sw = (key, on) => '<button class="switch' + (on ? ' on' : '') + '" data-act="toggle" data-arg="' + key + '" role="switch" aria-checked="' + on + '"></button>';
    openModal(head('Settings') +
      '<div class="setting">Theme<span class="seg">' + seg + '</span></div>' +
      '<div class="setting">Sound' + sw('sound', settings.sound) + '</div>' +
      (A.canVibrate ? '<div class="setting">Vibration' + sw('vibrate', settings.vibrate) + '</div>' : '') +
      '<p class="note-line">On iPhone, sound follows the ring/silent switch, and web pages cannot vibrate.</p>' +
      '<button class="secondary" data-act="reset">Reset statistics</button>');
  }
  function showGuide() {
    let html = head('Technique guide'), level = 0;
    for (const t of GUIDE) {
      if (t.level !== level) { level = t.level; html += '<div class="guide-group">Level ' + level + ' · ' + E.LEVEL_NAMES[level] + '</div>'; }
      html += '<button class="guide-item" data-act="technique" data-arg="' + t.id + '">' + t.name + '</button>';
    }
    openModal(html);
  }
  function showTechnique(id) {
    const t = GUIDE.find(x => x.id === id || (x.alias && x.alias.includes(id))); if (!t) return;
    const ex = EXAMPLES[t.id];
    openModal(head(t.name) + '<div id="example" class="mini"></div><p class="caption">' + ex.where + '. ' +
      (ex.place ? 'The green cell must be ' + ex.place[1] + '.' : 'Green cells form the pattern; red candidates are removed.') + '</p>' +
      '<p class="guide-text">' + t.text + '</p><button class="secondary" data-act="guide">All techniques</button>');
    const board = document.createElement('div'); board.className = 'board'; $('example').appendChild(board);
    const cs = buildBoard(board), show = flags(ex.show), strike = new Int16Array(81);
    for (const [cell, d] of ex.elims) { strike[cell] |= E.bit(d); cs[cell].el.classList.add('ht'); }
    for (const i of ex.cells) cs[i].el.classList.add('hp');
    for (let i = 0; i < 81; i++) {
      const v = +ex.vals[i]; if (v) { cs[i].val.textContent = v; continue; }
      const mask = ex.digit ? (ex.cand[i] & E.bit(ex.digit)) : (show[i] ? ex.cand[i] : 0);
      for (let d = 1; d <= 9; d++) if (mask & E.bit(d)) cs[i].marks[d - 1].className = (strike[i] & E.bit(d)) ? 'strike' : 'on';
    }
  }

  function applyTheme() {
    const dark = settings.theme === 'dark' || (settings.theme === 'auto' && self.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.content = dark ? '#101820' : '#ffffff';
  }
  function applySettings() { A.enabled = settings.sound; A.vibrate = settings.vibrate; applyTheme(); }

  const ACTIONS = {
    close: closeModal, levels: showLevels, guide: showGuide, technique: showTechnique, restart,
    start: l => start(+l),
    theme: t => { settings.theme = t; S.saveSettings(settings); applySettings(); showSettings(); },
    toggle: k => { settings[k] = !settings[k]; S.saveSettings(settings); applySettings(); showSettings(); if (settings[k]) A.play('place'); },
    reset: () => { if (confirm('Reset all statistics? This cannot be undone.')) { S.resetStats(); showSettings(); } },
  };

  // ---------- events
  document.addEventListener('pointerdown', () => A.unlock(), { passive: true });
  $('board').addEventListener('pointerdown', e => { const c = e.target.closest('.cell'); if (c) tapCell(+c.dataset.i); });

  let press = null; // pad: a short tap enters the digit, a long press locks it
  $('pad').addEventListener('pointerdown', e => {
    const b = e.target.closest('.num'); if (!b) return;
    const d = +b.dataset.d;
    press = { d, long: false, timer: setTimeout(() => { if (press) { press.long = true; setLock(d); } }, LONG_PRESS_MS) };
  });
  const release = e => {
    if (!press) return;
    clearTimeout(press.timer);
    const p = press; press = null;
    if (e.type === 'pointerup' && !p.long) tapNum(p.d);
  };
  for (const type of ['pointerup', 'pointercancel', 'pointerleave']) $('pad').addEventListener(type, release);
  $('pad').addEventListener('contextmenu', e => e.preventDefault());

  $('btn-undo').addEventListener('click', doUndo);
  $('btn-erase').addEventListener('click', doErase);
  $('btn-notes').addEventListener('click', toggleNotes);
  $('btn-hint').addEventListener('click', doHint);
  $('btn-pause').addEventListener('click', togglePause);
  $('paused').addEventListener('click', togglePause);
  $('newgame').addEventListener('click', showLevels);
  $('newgame-top').addEventListener('click', showLevels);
  $('btn-stats').addEventListener('click', showStats);
  $('btn-guide').addEventListener('click', showGuide);
  $('btn-settings').addEventListener('click', showSettings);
  $('hint-close').addEventListener('click', () => { hint = null; render(); });
  $('hint-guide').addEventListener('click', () => { if (hint && hint.step) showTechnique(hint.step.tech.id); });
  $('modal').addEventListener('click', e => { if (e.target === $('modal')) closeModal(); });
  $('sheet').addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b && ACTIONS[b.dataset.act]) ACTIONS[b.dataset.act](b.dataset.arg); });

  document.addEventListener('keydown', e => {
    if (!$('modal').hidden) { if (e.key === 'Escape') closeModal(); return; }
    const digit = /^(Digit|Numpad)[1-9]$/.test(e.code) ? +e.code.slice(-1) : 0;
    if (digit) {
      if (!g || g.done || paused || sel < 0) return;
      if (e.shiftKey !== notesMode) { if (!G.isLocked(g, sel) && G.toggleNote(g, sel, digit).changed) { A.play('note'); changed(); } } // Shift flips the mode for one key
      else { const r = G.place(g, sel, digit); if (r.changed) afterPlace(sel, r); }
      e.preventDefault(); return;
    }
    const move = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 }[e.key];
    if (move) {
      const from = sel < 0 ? 40 : sel, to = from + move;
      if (to >= 0 && to < 81 && (Math.abs(move) === 9 || E.ROW[to] === E.ROW[from])) sel = to; else if (sel < 0) sel = 40;
      render(); e.preventDefault(); return;
    }
    const k = e.key.toLowerCase();
    if (k === 'backspace' || k === 'delete' || k === '0') doErase();
    else if (k === 'n') toggleNotes();
    else if (k === 'u' || (k === 'z' && (e.ctrlKey || e.metaKey))) doUndo();
    else if (k === 'h') doHint();
    else if (k === 'p' || k === ' ') togglePause();
    else if (k === 'escape') { hint = null; lock = 0; render(); }
    else return;
    e.preventDefault();
  });

  // The clock runs only while the puzzle is actually on screen.
  const ticking = () => g && !g.done && !paused && !document.hidden && $('modal').hidden;
  setInterval(() => {
    const now = Date.now();
    if (ticking()) {
      g.elapsed += Math.min(now - lastTick, 1000);
      $('time').textContent = fmt(g.elapsed);
      if (now - lastSave > 5000) save();
    }
    lastTick = now;
  }, 250);
  document.addEventListener('visibilitychange', () => { lastTick = Date.now(); if (document.hidden) save(); });
  self.addEventListener('pagehide', save);
  if (self.matchMedia) { const mq = matchMedia('(prefers-color-scheme: dark)'); if (mq.addEventListener) mq.addEventListener('change', applyTheme); }

  // ---------- start up
  applySettings();
  const saved = G.deserialize(S.loadGame());
  if (saved && !saved.done) g = saved;
  render();
  if (!g) showLevels();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
