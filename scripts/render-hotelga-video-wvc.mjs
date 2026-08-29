#!/usr/bin/env node
/*
  Renders the MIRIGI 24/7 hotel deck (video_slide_hotelga/) to WebM using
  WebVideoCreator (WVC) — https://github.com/Vinlic/WebVideoCreator.

  Usage:
    node scripts/render-hotelga-video-wvc.mjs                              # English, 30fps webm
    node scripts/render-hotelga-video-wvc.mjs --lang=es                    # Spanish, 30fps webm
    node scripts/render-hotelga-video-wvc.mjs --lang=es --fps=60           # genuine 60fps webm
    node scripts/render-hotelga-video-wvc.mjs --lang=es --seconds=10       # first 10s only, fast iteration
    node scripts/render-hotelga-video-wvc.mjs --lang=es --width=2160 --height=3840   # 4K vertical

  ─────────────────────────────────────────────────────────────────────────
  Why this replaces scripts/render-hotelga-video.js's Playwright recordVideo
  ─────────────────────────────────────────────────────────────────────────
  recordVideo captures Chromium in real wall-clock time at a fixed ~1Mbit/s,
  ~25fps that can drop/duplicate frames under load — it is not a
  frame-accurate capture. A hand-rolled deterministic pipeline was built
  earlier (Chromium's `Emulation.setVirtualTimePolicy` CDP domain, driving
  the page one virtual frame at a time) but hit a reproducible hang in this
  environment that was never root-caused.

  WVC solves the exact same problem (Chrome's `HeadlessExperimental.beginFrame`
  deterministic rendering API — the same one Chrome docs recommend for this)
  as a mature, maintained library rather than hand-rolled CDP calls, and it
  already has documented handling for the failure mode our hand-rolled
  version hit (`TargetCloseError: Protocol error (HeadlessExperimental.beginFrame)`
  → its own `compatibleRenderingMode` fallback). In testing here it produced
  an exact-duration, exact-fps, zero-dropped-frame capture with no
  intervention needed.

  `duration` must be known before WVC's createSingleVideo() is called, so
  this script does a brief separate Playwright probe first (~1-2s) to read
  window.MIRIGI_TOTAL_DURATION_MS — the same value scripts/render-hotelga-video.js
  waits on — then hands off to WVC for the actual frame-perfect capture.

  First run downloads WVC's own Chrome build into ./.bin/ (gitignored,
  silent unless you're watching for it — no progress log during download).
*/

import { fileURLToPath } from 'url';
import path from 'path';
import http from 'http';
import fs from 'fs';
import WebVideoCreator, { VIDEO_ENCODER, logger } from 'web-video-creator';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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
const PORT = parseInt(args.port || '8767', 10);
const FPS = parseInt(args.fps || '30', 10);
const SECONDS = args.seconds ? parseFloat(args.seconds) : null;
const FAST = !!args.fast; // jpeg frames + yuv420p — for quick content/timing iteration, not final quality checks
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

async function probeDurationMs(url) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForSelector('.slide', { timeout: 8000 });
    const totalMs = await page.evaluate(() => window.MIRIGI_TOTAL_DURATION_MS);
    if (!totalMs) throw new Error('window.MIRIGI_TOTAL_DURATION_MS was not set by the deck — check js/slides.js');
    return totalMs;
  } finally {
    await browser.close();
  }
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const server = await startServer(ROOT, PORT);
  const baseUrl = `http://127.0.0.1:${PORT}`;
  const url = `${baseUrl}${DECK_PATH}?auto=1&lang=${LANG}`;
  console.log(`[${LANG}] probing duration at ${url} ...`);

  try {
    const totalMs = await probeDurationMs(url);
    const durationMs = (SECONDS ? Math.min(totalMs, SECONDS * 1000) : totalMs) + TAIL_BUFFER_MS;
    console.log(`[${LANG}] rendering ${durationMs}ms at ${WIDTH}x${HEIGHT}, ${FPS}fps (WebVideoCreator, frame-perfect) ...`);

    const wvc = new WebVideoCreator();
    // frameFormat: 'png' (not the 80%-quality jpeg default) — frames are
    // now captured deterministically via Chrome's beginFrame API, so this
    // is the ONLY lossy step left in the whole pipeline (unlike the old
    // recordVideo path's raw ~1Mbit/s VP8 pre-compression); worth the
    // slower capture. yuv444p keeps full chroma resolution for the
    // shader's Bayer dither (see js/bg-webgl.js) instead of yuv420p's 2x2
    // chroma subsampling smearing it.
    wvc.config({ webmEncoder: VIDEO_ENCODER.CPU.VP9, frameFormat: FAST ? 'jpeg' : 'png' });
    if (FAST) console.log(`[${LANG}] --fast: jpeg frames + yuv420p, for quick iteration only`);

    const outputPath = path.join(OUT_DIR, `hotelga-24-7-${LANG}${SECONDS ? '-preview' : ''}.webm`);
    const video = wvc.createSingleVideo({
      url,
      width: WIDTH,
      height: HEIGHT,
      fps: FPS,
      duration: durationMs,
      outputPath,
      showProgress: true,
      pixelFormat: FAST ? 'yuv420p' : 'yuv444p',
      videoQuality: FAST ? 80 : 100,
    });

    await new Promise((resolve, reject) => {
      video.once('completed', result => {
        console.log(`[${LANG}] webm: ${path.relative(ROOT, outputPath)} — took ${(result.takes / 1000).toFixed(1)}s, RTF ${result.rtf.toFixed(3)}`);
        resolve();
      });
      video.once('error', reject);
      video.start();
    });
  } finally {
    server.close();
  }
})().catch(err => { console.error(err); process.exit(1); });
