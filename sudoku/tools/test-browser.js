// Drives the built app in headless Chrome over the DevTools protocol: real taps, real rendering, screenshots.
// Usage: node tools/test-browser.js [screenshot-dir]
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p => fs.existsSync(p));
const SHOTS = path.resolve(process.argv[2] || path.join(os.tmpdir(), 'sudoku-shots'));
const PAGE = 'file:///' + path.join(__dirname, '..', 'docs', 'index.html').replace(/\\/g, '/');
const PORT = 9337;
const sleep = ms => new Promise(r => setTimeout(r, ms));

let fails = 0;
const ok = (cond, msg) => { console.log((cond ? '  ok    ' : '  FAIL  ') + msg); if (!cond) fails++; };

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'sudoku-chrome-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=' + PORT, '--user-data-dir=' + profile, '--no-first-run', '--mute-audio', '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: 'ignore' });
  let target;
  for (let i = 0; i < 50 && !target; i++) { await sleep(200); try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find(t => t.type === 'page'); } catch (e) { /* not up yet */ } }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  let id = 0; const waiting = new Map(), errors = [];
  ws.addEventListener('message', m => {
    const d = JSON.parse(m.data);
    if (d.id && waiting.has(d.id)) { waiting.get(d.id)(d.result || d.error); waiting.delete(d.id); }
    if (d.method === 'Runtime.exceptionThrown') errors.push(d.params.exceptionDetails.exception ? d.params.exceptionDetails.exception.description : d.params.exceptionDetails.text);
    if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errors.push(d.params.args.map(a => a.value || a.description).join(' '));
  });
  const send = (method, params) => new Promise(r => { waiting.set(++id, r); ws.send(JSON.stringify({ id, method, params: params || {} })); });
  const js = async expr => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(expr + ' -> ' + JSON.stringify(r.exceptionDetails)); return r.result.value; };
  const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(SHOTS, name + '.png'), Buffer.from(r.data, 'base64')); };
  const viewport = (w, h, mobile) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile });
  const centre = sel => js(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2, r.width, r.height]; })()`);
  const tap = async (sel, holdMs) => {
    const p = await centre(sel); if (!p) throw new Error('no element: ' + sel);
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: p[0], y: p[1], button: 'left', clickCount: 1 });
    if (holdMs) await sleep(holdMs);
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p[0], y: p[1], button: 'left', clickCount: 1 });
    await sleep(30);
  };
  const cell = i => `#board .cell[data-i="${i}"]`, num = d => `#pad .num[data-d="${d}"]`;
  const saved = () => js(`JSON.parse(localStorage.getItem('sudoku.game.v1'))`);
  const text = sel => js(`document.querySelector(${JSON.stringify(sel)}).textContent`);
  const has = (sel, cls) => js(`document.querySelector(${JSON.stringify(sel)}).classList.contains(${JSON.stringify(cls)})`);

  await send('Runtime.enable'); await send('Page.enable');
  await viewport(390, 760, true);
  await send('Page.navigate', { url: PAGE }); await sleep(900);

  console.log('first launch');
  ok(await js(`!document.getElementById('modal').hidden && document.querySelectorAll('.level').length === 10`), 'level sheet opens with 10 levels');
  await shot('01-levels');
  await tap('.level[data-arg="5"]');
  let s = await saved();
  ok(s && s.level === 5 && s.solution.length === 81, 'starting level 5 creates and saves a game');
  ok(await text('#lvl') === 'Extreme' && await text('#mist') === '0/3', 'header shows Extreme and 0/3');
  const fit = await js(`(() => { const b = document.getElementById('board').getBoundingClientRect(), p = document.getElementById('pad').getBoundingClientRect(); return [b.width, p.bottom, innerHeight, document.documentElement.scrollHeight]; })()`);
  ok(fit[1] <= fit[2] && fit[3] <= fit[2], `phone layout fits without scrolling (board ${Math.round(fit[0])}px, pad bottom ${Math.round(fit[1])} of ${fit[2]})`);
  await shot('02-new-game');

  console.log('entering digits');
  const empty = [...s.vals].map((c, i) => c === '0' ? i : -1).filter(i => i >= 0), sol = i => +s.solution[i], bad = i => sol(i) % 9 + 1;
  const a = empty[0], b = empty[1], c = empty[2];
  await tap(cell(a)); ok(await has(cell(a), 'sel'), 'tapping a cell selects it');
  await tap(num(sol(a)));
  ok(await text(cell(a) + ' .val') === String(sol(a)) && await has(cell(a), 'user'), 'correct digit goes in and is blue');
  await tap(cell(b)); await tap(num(bad(b)));
  ok(await has(cell(b), 'wrong') && await text('#mist') === '1/3', 'wrong digit is red and counted');
  await shot('03-right-and-wrong');
  await tap('#btn-erase'); ok(await text(cell(b) + ' .val') === '', 'erase removes the wrong digit');
  await tap('#btn-undo'); ok(await text(cell(b) + ' .val') === String(bad(b)), 'undo brings it back');
  await tap('#btn-undo'); await tap('#btn-undo');

  console.log('notes');
  await tap('#btn-notes'); ok(await text('#notes-badge') === 'ON', 'notes mode switches on');
  await tap(cell(c)); await tap(num(sol(c))); await tap(num(bad(c)));
  ok(await js(`document.querySelectorAll(${JSON.stringify(cell(c) + ' .notes i.on')}).length`) === 2, 'two pencil marks appear');
  await tap(num(sol(c))); // remove the real digit from the notes
  await tap('#btn-hint');
  ok((await text('#hint-title')).includes('notes have a mistake'), 'hint catches the note that lost its real digit');
  await tap('#btn-hint');
  ok(await has(cell(c), 'ht') && !/\d/.test(await text('#hint-body')), 'second tap shows the cell, not the digit');
  await shot('04-notes-check');
  await tap('#btn-erase'); await tap('#btn-notes');

  console.log('hints');
  await tap('#btn-hint');
  const title = await text('#hint-title');
  ok(title.startsWith('Look for: '), 'hint names a technique: ' + title);
  await shot('05-hint-1-name');
  await tap('#btn-hint'); ok(await js(`document.querySelectorAll('#board .cell.hr').length`) >= 9, 'tap 2 highlights a region: ' + await text('#hint-body')); await shot('06-hint-2-where');
  await tap('#btn-hint'); ok(await js(`document.querySelectorAll('#board .cell.hp').length`) >= 1, 'tap 3 highlights the exact cells'); await shot('07-hint-3-cells');
  const before = (await saved()).vals;
  await tap('#btn-hint'); s = await saved();
  ok(s.assisted === true && (s.vals !== before || s.undo.length > 0), 'tap 4 applies the step and marks the game assisted'); await shot('08-hint-4-applied');
  await tap('#hint-guide'); ok(await js(`!document.getElementById('modal').hidden && document.querySelectorAll('#example .cell').length === 81`), 'guide opens from the hint with a diagram');
  await shot('09-guide'); await tap('[data-act="close"]');

  console.log('digit lock');
  s = await saved();
  const counts = {}; for (const ch of s.vals) counts[ch] = (counts[ch] || 0) + 1;
  const lockDigit = [1, 2, 3, 4, 5, 6, 7, 8, 9].find(d => (counts[d] || 0) < 8);
  await tap(num(lockDigit), 600);
  ok(await has(num(lockDigit), 'locked') && (await text('#status')).includes(lockDigit + ' locked'), 'long press locks a digit and says so: "' + await text('#status') + '"');
  const lockCell = [...s.vals].findIndex((ch, i) => ch === '0' && sol(i) === lockDigit);
  await tap(cell(lockCell)); ok(await text(cell(lockCell) + ' .val') === String(lockDigit), 'tapping a cell places the locked digit');
  await shot('10-lock');
  await tap(num(lockDigit)); ok(!(await has(num(lockDigit), 'locked')), 'tapping the digit again unlocks');

  console.log('three mistakes, then finish');
  s = await saved();
  let open = [...s.vals].map((ch, i) => ch === '0' ? i : -1).filter(i => i >= 0);
  for (const i of open.slice(0, 3)) { await tap(cell(i)); await tap(num(bad(i))); await tap('#btn-erase'); }
  ok((await text('#mist')).startsWith('4/3') || (await text('#mist')).startsWith('3/3'), 'mistake counter passes the limit: ' + await text('#mist'));
  ok(await has('#mist-wrap', 'fail') && await js(`!document.getElementById('modal').hidden`) === false, 'marked as failed, game carries on');
  await tap('#btn-pause'); ok(await js(`!document.getElementById('paused').hidden`), 'pause covers the board'); await shot('11-paused'); await tap('#paused');
  for (const i of open) { await tap(cell(i)); await tap(num(sol(i))); }
  await sleep(1700);
  ok(await js(`!document.getElementById('modal').hidden && !!document.querySelector('.result')`), 'finishing opens the result sheet');
  ok((await text('.result .tag')).startsWith('Failed'), 'result is labelled as a fail');
  const stats = await js(`JSON.parse(localStorage.getItem('sudoku.stats.v1'))[5]`);
  ok(stats.played === 1 && stats.fail === 1 && stats.pass === 0 && stats.total === 0, 'failed game recorded and kept out of the average');
  await shot('12-result');

  console.log('resume, themes, desktop');
  await tap('[data-act="start"]'); await tap(cell(40));
  s = await saved(); const first = [...s.vals].findIndex(ch => ch === '0');
  await tap(cell(first)); await tap(num(+s.solution[first]));
  await send('Page.reload'); await sleep(900);
  ok(await js(`document.getElementById('modal').hidden`) && await text(cell(first) + ' .val') === s.solution[first], 'reload resumes the game in progress');
  await tap('#btn-settings'); await tap('[data-arg="dark"]'); await tap('[data-act="close"]');
  ok(await js(`document.documentElement.dataset.theme`) === 'dark', 'dark theme applies'); await tap(cell(first)); await shot('13-dark');
  await tap('#btn-stats'); await shot('14-stats'); await tap('[data-act="close"]');
  await viewport(1200, 800, false); await sleep(300); await shot('15-desktop');
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
  ok(await has(cell(first + 1), 'sel'), 'arrow keys move the selection on desktop');
  await viewport(320, 568, true); await sleep(300);
  const small = await js(`[document.getElementById('pad').getBoundingClientRect().bottom, innerHeight, document.getElementById('board').getBoundingClientRect().width]`);
  ok(small[0] <= small[1], `fits a small phone, 320x568 (board ${Math.round(small[2])}px)`); await shot('16-small-phone');

  console.log('an elimination hint on a hard level');
  await viewport(390, 760, true); await sleep(200);
  await tap('#newgame-top'); await tap('.level[data-arg="8"]');
  const singles = ['Look for: Hidden single', 'Look for: Naked single', 'Look for: Last free cell'];
  let name = '';
  for (let k = 0; k < 80; k++) { // let the hint tool play the singles, then stop on the first real technique
    await tap('#btn-hint'); name = await text('#hint-title');
    if (!singles.includes(name)) break;
    await tap('#btn-hint'); await tap('#btn-hint'); await tap('#btn-hint');
  }
  ok(name.startsWith('Look for: ') && !singles.includes(name), 'level 8 reaches a non-single technique: ' + name);
  await tap('#btn-hint'); await tap('#btn-hint');
  const marks = await js(`[document.querySelectorAll('#board .cell.hp').length, document.querySelectorAll('#board .cell.ht').length, document.querySelectorAll('#board .notes i.strike').length]`);
  ok(marks[0] >= 2 && marks[1] >= 1 && marks[2] >= 1, `tap 3 shows ${marks[0]} pattern cells, ${marks[1]} target cells, ${marks[2]} struck candidates`);
  await shot('17-elimination-hint');
  await tap('#btn-hint');
  ok(await js(`document.querySelectorAll('#board .notes i.on').length`) >= 2 && await js(`document.querySelectorAll('#board .notes i.strike').length`) === 0, 'tap 4 writes the notes with the candidates removed');
  await shot('18-elimination-applied');

  ok(errors.length === 0, 'no JavaScript errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  ws.close(); chrome.kill();
  await sleep(300); try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { /* profile still locked; harmless */ }
  console.log(fails ? `\n${fails} check(s) failed` : '\nall browser checks passed'); console.log('screenshots: ' + SHOTS);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
