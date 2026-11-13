// Sounds are synthesised with Web Audio, so there are no audio files to load.
// iOS only allows audio after a touch, so unlock() is called from the first pointer event.
(function (root) {
  'use strict';
  let ctx = null, master = null;
  const A = { enabled: true, vibrate: true };

  A.unlock = function () {
    try {
      if (!ctx) {
        const AC = root.AudioContext || root.webkitAudioContext; if (!AC) return;
        ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
      }
      if (ctx.state === 'suspended') ctx.resume();
    } catch (e) { ctx = null; }
  };

  // One enveloped oscillator. `at` is seconds from now; `slide` is an optional end frequency.
  function tone(freq, dur, opt) {
    if (!ctx) return;
    const o = opt || {}, t = ctx.currentTime + (o.at || 0), osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(freq, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, t + dur);
    const peak = o.gain || 0.2;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(master); osc.start(t); osc.stop(t + dur + 0.02);
  }

  const SOUNDS = {
    select() { tone(520, 0.03, { gain: 0.04 }); },
    place() { tone(880, 0.07, { type: 'triangle', gain: 0.16, slide: 660 }); },
    note() { tone(1500, 0.035, { type: 'triangle', gain: 0.07 }); },
    erase() { tone(340, 0.08, { gain: 0.1, slide: 220 }); },
    undo() { tone(440, 0.07, { gain: 0.1, slide: 330 }); },
    error() { tone(150, 0.22, { gain: 0.3, slide: 95 }); tone(111, 0.22, { type: 'triangle', gain: 0.18 }); },
    unit() { tone(660, 0.14, { gain: 0.16, at: 0.05 }); tone(990, 0.22, { gain: 0.16, at: 0.15 }); },
    digit() { [784, 988, 1175].forEach((f, i) => tone(f, 0.16, { type: 'triangle', gain: 0.14, at: 0.05 + i * 0.07 })); },
    hint() { tone(587, 0.12, { gain: 0.1 }); tone(880, 0.16, { gain: 0.08, at: 0.08 }); },
    lock() { tone(700, 0.05, { type: 'triangle', gain: 0.12 }); tone(1050, 0.07, { type: 'triangle', gain: 0.12, at: 0.06 }); },
    win() {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, { type: 'triangle', gain: 0.16, at: i * 0.11 }));
      [523, 659, 784, 1047].forEach(f => tone(f, 1.1, { gain: 0.09, at: 0.5 }));
    },
  };
  const BUZZ = { place: 8, error: [40, 50, 40], unit: 18, digit: 25, win: [30, 60, 30, 60, 80], lock: 15 };

  A.canVibrate = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  A.play = function (name) {
    if (A.enabled && SOUNDS[name]) { A.unlock(); try { SOUNDS[name](); } catch (e) { /* audio is never worth crashing for */ } }
    if (A.vibrate && A.canVibrate && BUZZ[name]) { try { navigator.vibrate(BUZZ[name]); } catch (e) { /* ignore */ } }
  };

  root.SudokuAudio = A;
})(typeof self !== 'undefined' ? self : globalThis);
