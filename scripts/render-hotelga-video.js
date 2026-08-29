#!/usr/bin/env node
/*
  Renders the MIRIGI 24/7 hotel deck (video_slide_hotelga/) to WebM (+ MP4).

  Usage:
    node scripts/render-hotelga-video.js                              # English, 30fps webm
    node scripts/render-hotelga-video.js --lang=es                    # Spanish, 30fps webm
    node scripts/render-hotelga-video.js --lang=es --fps=60           # genuine 60fps webm
    node scripts/render-hotelga-video.js --lang=es --mp4              # also produce the mp4
    node scripts/render-hotelga-video.js --lang=es --mp4 --width=2160 --height=3840   # 4K vertical mp4

  ─────────────────────────────────────────────────────────────────────────
  Deterministic, frame-exact capture (not Playwright's recordVideo)
  ─────────────────────────────────────────────────────────────────────────
  Two earlier approaches were tried and rejected:
    1. Playwright's built-in `context.recordVideo` — Chromium's encoder here
       is hardcoded to ~1Mbit/s VP8 and has a known frame-timestamp rounding
       jitter (microsoft/playwright#35776). Both defects are baked into the
       encoded output and cannot be fully recovered afterwards — the jitter
       shows as visibly uneven/"chunky" motion, and the low bitrate shows as
       banding on our dark gradient backgrounds. Re-encoding that raw output
       through ffmpeg (minterpolate + deband) only ever patched over damage
       that had already happened.
    2. Hand-rolled CDP `Page.startScreencast` — Chrome stalled screencast
       delivery after a handful of frames; an ack/throttling issue not worth
       chasing.

  This script instead uses Chromium's `Emulation.setVirtualTimePolicy` (CDP),
  the technique real HTML-to-video renderers use (e.g. Remotion, HyperFrames)
  for exactly this problem: it freezes the browser's clock and lets us
  advance it in exact, arbitrary steps. Our deck's engine is plain
  `setTimeout`-driven and its CSS uses ordinary transitions/@keyframes — both
  are virtualized by this CDP domain with no code changes needed beyond a
  small start-gate (see `capture=1` handling in js/slides.js). For each
  virtual-time step we grab a lossless PNG screenshot and stream it straight
  into ffmpeg's stdin (`image2pipe`), so there is exactly one lossy
  compression step in the whole pipeline (the final video encode) instead of
  two. Because there's no real-time constraint, `--fps` now captures that
  many *genuine* browser-rendered frames per second — no interpolation
  fakery required.

  Gradient banding: even a lossless source still gets requantized to 8-bit
  YUV4:2:0 by the final encode, so js/slides.js's markup includes a fixed,
  low-opacity SVG noise overlay (`#grain` in index.html/css/slides.css) that
  dithers the gradients *before* capture — the standard trick from video
  color grading for breaking up banding that no post-hoc encoder filter can
  fully undo once it's already happened.

  Requirements: playwright (chromium), ffmpeg-static — both devDeps.
  The deck exposes window.MIRIGI_TOTAL_DURATION_MS (computed against
  whichever `?lang=` was requested) so this script never has to guess or
  duplicate the per-slide timing math.
*/

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.resolve(ROOT, 'video-out');

const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; })
);

const LANG = (args.lang || 'en').trim();
const WIDTH = parseInt(args.width || '1080', 10);
const HEIGHT = parseInt(args.height || '1920', 10);
const PORT = parseInt(args.port || '8766', 10);
const FPS = parseInt(args.fps || '30', 10);
const TAIL_BUFFER_MS = 500;

const DECK_PATH = '/video_slide_hotelga/';

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

// Advances Chromium's virtualized clock by exactly `budgetMs` and resolves
// once that budget has fully elapsed (all setTimeouts/CSS animation ticks
// due within it have fired) — the deterministic replacement for
// `page.waitForTimeout`.
function advanceVirtualTime(client, budgetMs) {
  return new Promise((resolve, reject) => {
    client.once('Emulation.virtualTimeBudgetExpired', resolve);
    client.send('Emulation.setVirtualTimePolicy', { policy: 'advance', budget: budgetMs }).catch(reject);
  });
}

async function captureFrames(page, client, totalMs, fps, ffmpegStdin) {
  const frameMs = 1000 / fps;
  const frameCount = Math.ceil(totalMs / frameMs) + 1; // +1 for the frame-0 still
  let elapsed = 0;
  for (let i = 0; i < frameCount; i++) {
    if (i > 0) {
      const targetMs = Math.round(i * frameMs);
      await advanceVirtualTime(client, targetMs - elapsed);
      elapsed = targetMs;
    }
    // Raw CDP screenshot, not page.screenshot() — Playwright's wrapper waits
    // for a stabilizing requestAnimationFrame internally, which never fires
    // while the virtual clock is paused between our explicit advances.
    const { data } = await client.send('Page.captureScreenshot', { format: 'png' });
    const png = Buffer.from(data, 'base64');
    const ok = ffmpegStdin.write(png);
    if (!ok) await new Promise(resolve => ffmpegStdin.once('drain', resolve));
    if ((i + 1) % Math.round(fps * 5) === 0 || i === frameCount - 1) {
      process.stdout.write(`\r  frame ${i + 1}/${frameCount} (${elapsed}ms / ${totalMs}ms)`);
    }
  }
  process.stdout.write('\n');
}

function spawnFfmpegEncoder(finalWebmPath, fps) {
  const ffmpegPath = require('ffmpeg-static');
  const vf = 'pad=ceil(iw/2)*2:ceil(ih/2)*2';
  const proc = spawn(ffmpegPath, [
    '-y',
    '-f', 'image2pipe',
    '-vcodec', 'png',
    '-framerate', String(fps),
    '-i', '-',
    '-vf', vf,
    '-c:v', 'libvpx-vp9',
    '-profile:v', '2',
    '-pix_fmt', 'yuv420p10le',
    '-b:v', '0',
    '-crf', '20',
    '-deadline', 'good',
    '-cpu-used', '1',
    '-an',
    finalWebmPath,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  return proc;
}

function transcodeToMp4(webmPath) {
  const ffmpegPath = require('ffmpeg-static');
  const mp4Path = webmPath.replace(/\.webm$/, '.mp4');
  const r = spawnSync(ffmpegPath, [
    '-y', '-i', webmPath,
    '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2',
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', '18',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    mp4Path,
  ], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`ffmpeg failed for ${webmPath}`);
  return mp4Path;
}

(async () => {
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch {
    console.error('playwright is not installed. Run:\n  npm install --save-dev playwright && npx playwright install chromium');
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const server = await startServer(ROOT, PORT);
  const baseUrl = `http://127.0.0.1:${PORT}`;
  console.log(`Serving ${ROOT} on ${baseUrl}`);

  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT } });
    const page = await context.newPage();
    const client = await context.newCDPSession(page);

    const url = `${baseUrl}${DECK_PATH}?auto=1&capture=1&lang=${LANG}`;
    console.log(`[${LANG}] loading ${url}`);
    // Real time until the page (fonts, images) is fully settled — then, and
    // only then, do we freeze the clock and hand control to js/slides.js's
    // capture=1 gate (see js/slides.js), so frame 0 is deterministic.
    await page.goto(url, { waitUntil: 'networkidle' });
    // state: 'attached', not the default 'visible' — with capture=1 the deck
    // defers its first show(0) call (see js/slides.js), so no slide carries
    // is-active/visibility:visible yet at this point.
    await page.waitForSelector('.slide', { state: 'attached', timeout: 8000 });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => typeof window.__startCapture === 'function' || Promise.reject(new Error('window.__startCapture missing — capture=1 gate not wired up in js/slides.js')));

    const totalMs = await page.evaluate(() => window.MIRIGI_TOTAL_DURATION_MS);
    if (!totalMs) throw new Error('window.MIRIGI_TOTAL_DURATION_MS was not set by the deck — check js/slides.js');
    const durationMs = totalMs + TAIL_BUFFER_MS;
    console.log(`[${LANG}] capturing ${durationMs}ms at ${WIDTH}x${HEIGHT}, ${FPS}fps (deterministic virtual-time capture) ...`);

    await client.send('Emulation.setVirtualTimePolicy', { policy: 'pause' });
    await page.evaluate(() => window.__startCapture());

    const webmPath = path.join(OUT_DIR, `hotelga-24-7-${LANG}.webm`);
    const ffmpeg = spawnFfmpegEncoder(webmPath, FPS);
    const ffmpegDone = new Promise((resolve, reject) => {
      ffmpeg.on('close', code => code === 0 ? resolve() : reject(new Error(`ffmpeg encoder exited ${code}`)));
      ffmpeg.on('error', reject);
    });

    await captureFrames(page, client, durationMs, FPS, ffmpeg.stdin);
    ffmpeg.stdin.end();
    await ffmpegDone;

    const stat = fs.statSync(webmPath);
    console.log(`[${LANG}] webm: ${path.relative(ROOT, webmPath)} (${(stat.size / 1024).toFixed(0)} KB)`);

    if (args.mp4) {
      const mp4Path = transcodeToMp4(webmPath);
      const stat2 = fs.statSync(mp4Path);
      console.log(`[${LANG}] mp4:  ${path.relative(ROOT, mp4Path)} (${(stat2.size / 1024).toFixed(0)} KB)`);
    } else {
      console.log(`[${LANG}] skipping mp4 (pass --mp4 to also transcode).`);
    }

    console.log(`\nDone. Output: ${path.relative(ROOT, OUT_DIR)}/`);
  } finally {
    await browser.close();
    server.close();
  }
})().catch(err => { console.error(err); process.exit(1); });
