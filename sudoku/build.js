// Assembles the app into one self-contained file: docs/index.html.
// Beside it go the optional extras that make it installable and offline-capable when hosted:
// manifest.webmanifest, sw.js and two icons. The HTML works on its own without them.
// Usage: node build.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const src = f => fs.readFileSync(path.join(__dirname, 'src', f), 'utf8');
const out = path.join(__dirname, 'docs');
fs.mkdirSync(out, { recursive: true });

const js = [
  fs.readFileSync(path.join(__dirname, 'engine', 'engine.js'), 'utf8'),
  'self.SUDOKU_BANK = ' + JSON.stringify(JSON.parse(src('bank.json'))) + ';',
  src('guide-examples.js'), src('guide.js'), src('game.js'), src('hints.js'), src('audio.js'), src('storage.js'), src('ui.js'),
].join('\n');
if (js.includes('</script')) throw new Error('script text would close the inline <script> tag');

const html = src('index.html').split('/*{{CSS}}*/').join(src('styles.css')).split('/*{{JS}}*/').join(js);
fs.writeFileSync(path.join(out, 'index.html'), html);

// ---- icons: a small sudoku grid, drawn straight into PNG bytes so the build needs no image tools
function png(size) {
  const px = Buffer.alloc(size * (size * 4 + 1));
  const bg = [90, 123, 192], paper = [255, 255, 255], ink = [52, 72, 97], fill = [187, 222, 251];
  const m = size * 0.16, w = size - 2 * m, cell = w / 3, thick = Math.max(2, size * 0.022);
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1); px[row] = 0;
    for (let x = 0; x < size; x++) {
      let c = bg;
      if (x >= m && x < m + w && y >= m && y < m + w) {
        const cx = Math.floor((x - m) / cell), cy = Math.floor((y - m) / cell);
        const edge = v => Math.min(v - m, m + w - v) < thick;
        const onLine = edge(x) || edge(y) || [1, 2].some(k => Math.abs(x - (m + k * cell)) < thick / 2 || Math.abs(y - (m + k * cell)) < thick / 2);
        c = onLine ? ink : cx === 1 && cy === 1 ? fill : paper;
      }
      const o = row + 1 + x * 4; px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = 255;
    }
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]), crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(px)), chunk('IEND', Buffer.alloc(0))]);
}
fs.writeFileSync(path.join(out, 'icon-180.png'), png(180));
fs.writeFileSync(path.join(out, 'icon-512.png'), png(512));

fs.writeFileSync(path.join(out, 'manifest.webmanifest'), JSON.stringify({
  name: 'Sudoku', short_name: 'Sudoku', start_url: './', scope: './', display: 'standalone',
  background_color: '#ffffff', theme_color: '#ffffff',
  icons: [{ src: 'icon-180.png', sizes: '180x180', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }],
}, null, 2));

// Network first so a new version shows up as soon as you are online; cache as the offline fallback.
const version = crypto.createHash('sha1').update(html).digest('hex').slice(0, 10);
fs.writeFileSync(path.join(out, 'sw.js'), `const CACHE = 'sudoku-${version}';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-512.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
});
`);

console.log(`docs/index.html  ${(fs.statSync(path.join(out, 'index.html')).size / 1024).toFixed(0)} KB  (build ${version})`);
