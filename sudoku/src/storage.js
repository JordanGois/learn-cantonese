// localStorage wrapper: the game in progress, settings, and per-level statistics.
// Every access is guarded; private windows and file previews can throw or come back empty.
(function (root) {
  'use strict';
  const KEY = { game: 'sudoku.game.v1', stats: 'sudoku.stats.v1', settings: 'sudoku.settings.v1' };
  const read = k => { try { const s = root.localStorage.getItem(k); return s ? JSON.parse(s) : null; } catch (e) { return null; } };
  const write = (k, v) => { try { if (v === null) root.localStorage.removeItem(k); else root.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } };

  const blank = () => ({ played: 0, pass: 0, fail: 0, assisted: 0, best: 0, total: 0, hints: 0 });

  const S = {
    loadGame: () => read(KEY.game),
    saveGame: g => write(KEY.game, g),
    loadSettings: () => Object.assign({ theme: 'auto', sound: true, vibrate: true }, read(KEY.settings) || {}),
    saveSettings: s => write(KEY.settings, s),
    loadStats() { const s = read(KEY.stats) || {}; for (let l = 1; l <= 10; l++) s[l] = Object.assign(blank(), s[l] || {}); return s; },
    resetStats: () => write(KEY.stats, null),
    // Only clean passes (under 3 mistakes, no reveal) count toward best and average time.
    record(level, status, ms, hints) {
      const all = S.loadStats(), s = all[level];
      s.played++; s[status]++; s.hints += hints;
      if (status === 'pass') { s.total += ms; if (!s.best || ms < s.best) s.best = ms; }
      write(KEY.stats, all);
      return s;
    },
    average: s => s.pass ? s.total / s.pass : 0,
  };
  root.SudokuStorage = S;
})(typeof self !== 'undefined' ? self : globalThis);
