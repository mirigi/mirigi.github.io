#!/usr/bin/env node
/*
  Renders the AI-concierge miniapp to MP4 + WebM, one file per language.

  Usage:
    node scripts/render-miniapp-video.js
    node scripts/render-miniapp-video.js --langs=en,es --duration=15000
    node scripts/render-miniapp-video.js --width=720 --height=1280

  Requirements: ffmpeg in PATH, puppeteer (devDep).
*/

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const MINIAPP_PATH = '/miniapps/features/ai-concierge/index.html';
const OUT_DIR = path.resolve(ROOT, 'video-out');

const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; })
);

const LANGS  = (args.langs || 'en,es,fr').split(',').map(s => s.trim());
const WIDTH  = parseInt(args.width  || '1080', 10);
const HEIGHT = parseInt(args.height || '1920', 10);
const PORT   = parseInt(args.port   || '8765', 10);
const CYCLES = parseFloat(args.cycles || '1');
// --duration overrides the auto-computed length (per language) when provided.
const DURATION_OVERRIDE = args.duration ? parseInt(args.duration, 10) : null;

/*
  Mirror of the timing constants in
  miniapps/features/ai-concierge/index.html (large-size branch: ?size != 'small').
  Keep in sync if the miniapp changes.
*/
const TIMING = {
  CHAR_MS:   34,
  THINK_MS:  1400,
  DWELL_MS:  2000,
  PAUSE_MS:  650,
  SETTLE_MS: 560,   // sleep(560) before typing starts
  MIN_V:     3,     // first MIN_V-1 cards are instant pre-populates
  TAIL_MS:   1200,  // small buffer so the last DWELL is fully captured
};

function cycleDurationMs(cards) {
  // One full pass through all `cards.length` items, animated.
  // Per animated card:
  //   SETTLE_MS + typeText(user) + PAUSE_MS + THINK_MS + typeText(miri) + DWELL_MS
  const fixed = TIMING.SETTLE_MS + TIMING.PAUSE_MS + TIMING.THINK_MS + TIMING.DWELL_MS;
  let total = 0;
  for (const c of cards) {
    const userLen = [...(c.user || '')].length;
    const miriLen = [...(c.miri || '')].length;
    total += fixed + TIMING.CHAR_MS * (userLen + miriLen);
  }
  return total;
}

function loadCards(lang) {
  const p = path.join(ROOT, 'miniapps/features/ai-concierge/data', `${lang}.json`);
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
};

function startServer(rootDir, port) {
  return new Promise((resolve, reject) => {
    const srv = http.createServer((req, res) => {
      const urlPath = decodeURIComponent(req.url.split('?')[0]);
      let filePath = path.join(rootDir, urlPath);
      if (!filePath.startsWith(rootDir)) { res.writeHead(403); return res.end(); }
      fs.stat(filePath, (err, stat) => {
        if (!err && stat.isDirectory()) filePath = path.join(filePath, 'index.html');
        fs.readFile(filePath, (err2, data) => {
          if (err2) { res.writeHead(404); return res.end('Not found'); }
          const ext = path.extname(filePath).toLowerCase();
          res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
          res.end(data);
        });
      });
    });
    srv.on('error', reject);
    srv.listen(port, '127.0.0.1', () => resolve(srv));
  });
}

async function recordLang(browser, lang, baseUrl, durationMs) {
  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });

  const url = `${baseUrl}${MINIAPP_PATH}?lang=${lang}`;
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.waitForSelector('.card', { timeout: 8000 });

  const webmPath = path.join(OUT_DIR, `ai-concierge-${lang}.webm`);
  const recorder = await page.screencast({ path: webmPath });

  await new Promise(r => setTimeout(r, durationMs));

  await recorder.stop();
  await page.close();
  return webmPath;
}

function transcodeToMp4(webmPath) {
  const mp4Path = webmPath.replace(/\.webm$/, '.mp4');
  const r = spawnSync('ffmpeg', [
    '-y', '-i', webmPath,
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', '22',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2',
    mp4Path,
  ], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`ffmpeg failed for ${webmPath}`);
  return mp4Path;
}

(async () => {
  let puppeteer;
  try { puppeteer = require('puppeteer'); }
  catch {
    console.error('puppeteer is not installed. Run:\n  npm install --save-dev puppeteer');
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const server = await startServer(ROOT, PORT);
  const baseUrl = `http://127.0.0.1:${PORT}`;
  console.log(`Serving ${ROOT} on ${baseUrl}`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--autoplay-policy=no-user-gesture-required'],
  });

  try {
    for (const lang of LANGS) {
      const cards = loadCards(lang);
      const durationMs = DURATION_OVERRIDE
        ?? Math.round(cycleDurationMs(cards) * CYCLES + TIMING.TAIL_MS);
      console.log(
        `\n[${lang}] recording ${durationMs}ms at ${WIDTH}x${HEIGHT} ` +
        `(${cards.length} cards × ${CYCLES} cycle${CYCLES === 1 ? '' : 's'}) ...`
      );
      const webm = await recordLang(browser, lang, baseUrl, durationMs);
      const stat = fs.statSync(webm);
      console.log(`[${lang}] webm: ${path.relative(ROOT, webm)} (${(stat.size/1024).toFixed(0)} KB)`);

      const mp4 = transcodeToMp4(webm);
      const stat2 = fs.statSync(mp4);
      console.log(`[${lang}] mp4:  ${path.relative(ROOT, mp4)} (${(stat2.size/1024).toFixed(0)} KB)`);
    }
    console.log(`\nDone. Output: ${path.relative(ROOT, OUT_DIR)}/`);
  } finally {
    await browser.close();
    server.close();
  }
})().catch(err => { console.error(err); process.exit(1); });
