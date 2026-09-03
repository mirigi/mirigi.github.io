#!/usr/bin/env node
/*
  Renders the MIRIGI 24/7 hotel deck (video_slide_hotelga/) to WebM (+ MP4).

  Usage:
    node scripts/render-hotelga-video.js                              # English, 30fps webm
    node scripts/render-hotelga-video.js --lang=es                    # Spanish, 30fps webm
    node scripts/render-hotelga-video.js --lang=es --fps=60           # 60fps webm (interpolated)
    node scripts/render-hotelga-video.js --lang=es --mp4              # also produce the mp4
    node scripts/render-hotelga-video.js --lang=es --mp4 --width=2160 --height=3840   # 4K vertical mp4

  ─────────────────────────────────────────────────────────────────────────
  Capture method: Playwright's recordVideo, not deterministic CDP capture
  ─────────────────────────────────────────────────────────────────────────
  A deterministic, frame-exact pipeline (Chromium's `Emulation.setVirtualTimePolicy`
  CDP domain, driving the deck's setTimeout/CSS-animation engine one virtual
  frame at a time, screenshotting each — the technique Remotion/HyperFrames
  use) was built and abandoned: it hit a reproducible hang in
  `Page.captureScreenshot` in this environment, in three different forms
  (missing-advance-before-first-screenshot; and two more once that was
  fixed), with zero CPU on any process while stuck. Root cause not
  identified — reproduced with both Playwright's default pipe transport and
  a manual `connectOverCDP` TCP transport, so it isn't an fd-leak into a
  spawned ffmpeg. Not reliable enough to ship on; reverted.

  This script instead uses Playwright's built-in `context.recordVideo`.
  Known defects, both real and NOT fully fixable after the fact:
    - Chromium's recordVideo encoder here is hardcoded to ~1Mbit/s VP8 and
      has a known frame-timestamp rounding jitter (microsoft/playwright#35776).
    - The raw capture alone looks chunky/stepped, especially on our dark
      gradient backgrounds (jitter + low bitrate).
  Every render therefore re-encodes the raw capture through ffmpeg:
  `minterpolate` retimes it to a constant fps (irons out the jitter),
  `deband` softens the gradient banding baked in by the low source bitrate,
  and real VP9 Profile-2 10-bit (`yuv420p10le`) crf-based quality replaces
  Playwright's forced low bitrate — 10-bit measurably reduces the encoder's
  own added banding even from an 8-bit source.

  Gradient banding at the *source*: Chromium's screenshot/DOM rendering
  pipeline is 8-bit sRGB with no way to get more color depth out of it (no
  bit-depth parameter exists in the CDP `Page.captureScreenshot` schema) —
  confirmed against node_modules/devtools-protocol directly. So
  js/slides.js's markup includes a fixed, low-opacity SVG noise overlay
  (`#grain` in index.html/css/slides.css) that dithers the gradients
  *before* that 8-bit truncation happens — the standard trick from video
  color grading for breaking up banding that no post-hoc encoder filter can
  fully undo once it's already happened. A genuine fix for the 8-bit ceiling
  would mean re-rendering the deck's gradients via WebGL/WebGPU with a
  floating-point framebuffer and reading raw pixels — a much larger project
  than this deck's scope; not attempted here.

  Requirements: playwright (chromium), ffmpeg-static — both devDeps.
  The deck exposes window.MIRIGI_TOTAL_DURATION_MS (computed against
  whichever `?lang=` was requested) so this script never has to guess or
  duplicate the per-slide timing math.
*/

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.resolve(ROOT, 'video-out');

const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; })
);

const LANG = (args.lang || 'en').trim();
// WIDTH/HEIGHT are the CSS viewport (what every vw/vh in slides.css sees) —
// always the 1080x1920 layout, regardless of output resolution. DPR
// (Playwright deviceScaleFactor) scales the captured pixel density on top
// of that *same* layout instead of changing the viewport, so nothing needs
// to be sized in real px ever again to survive a resolution change (see
// the .miri-pop max-width bug this replaced — a literal 2160x3840 viewport
// changed the layout itself, not just the pixel density). Output pixels =
// WIDTH*DPR x HEIGHT*DPR.
const WIDTH = parseInt(args.width || '1080', 10);
const HEIGHT = parseInt(args.height || '1920', 10);
const DPR = parseInt(args.dpr || '1', 10);
const PORT = parseInt(args.port || '8766', 10);
const FPS = args.fps ? parseInt(args.fps, 10) : null;
const SECONDS = args.seconds ? parseFloat(args.seconds) : null;
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

function reencodeWebm(rawWebmPath, finalWebmPath, fps) {
  const ffmpegPath = require('ffmpeg-static');
  const targetFps = fps || 30;
  const vf = `minterpolate=fps=${targetFps}:mi_mode=blend,` +
    'deband=1thr=0.08:2thr=0.08:3thr=0.08:4thr=0.08:range=32,' +
    'pad=ceil(iw/2)*2:ceil(ih/2)*2';
  const r = spawnSync(ffmpegPath, [
    '-y', '-i', rawWebmPath,
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
  ], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`ffmpeg webm re-encode failed for ${rawWebmPath}`);
}

function transcodeToMp4(webmPath, fps) {
  const ffmpegPath = require('ffmpeg-static');
  const suffix = fps ? `-${fps}fps` : '';
  const mp4Path = webmPath.replace(/\.webm$/, `${suffix}.mp4`);
  // zscale=dither=error_diffusion does the 10-bit -> 8-bit reduction with
  // dithering; a plain `-pix_fmt yuv420p` (no zscale) just truncates and
  // reintroduces the banding the 10-bit VP9 intermediate was meant to avoid.
  const vf = [
    fps ? `minterpolate=fps=${fps}:mi_mode=blend` : null,
    'zscale=dither=error_diffusion',
    'format=yuv420p',
    'pad=ceil(iw/2)*2:ceil(ih/2)*2',
  ].filter(Boolean).join(',');
  const r = spawnSync(ffmpegPath, [
    '-y', '-i', webmPath,
    '-vf', vf,
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', '18',
    '-movflags', '+faststart',
    mp4Path,
  ], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`ffmpeg failed for ${webmPath}`);
  return mp4Path;
}

(async () => {
  const browserName = (args.browser || 'chromium').trim();
  let browserType;
  try { browserType = require('playwright')[browserName]; }
  catch {
    console.error('playwright is not installed. Run:\n  npm install --save-dev playwright && npx playwright install chromium');
    process.exit(1);
  }
  if (!browserType) {
    console.error(`Unknown --browser=${browserName}. Use chromium, firefox, or webkit.`);
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const videoDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'hotelga-video-'));

  const server = await startServer(ROOT, PORT);
  const baseUrl = `http://127.0.0.1:${PORT}`;
  console.log(`Serving ${ROOT} on ${baseUrl}`);

  const browser = await browserType.launch();
  try {
    const context = await browser.newContext({
      viewport: { width: WIDTH, height: HEIGHT },
      deviceScaleFactor: DPR,
      recordVideo: { dir: videoDir, size: { width: WIDTH * DPR, height: HEIGHT * DPR } },
    });
    const page = await context.newPage();

    const url = `${baseUrl}${DECK_PATH}?auto=1&lang=${LANG}`;
    console.log(`[${LANG}] loading ${url}`);
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForSelector('.slide', { timeout: 8000 });

    const totalMs = await page.evaluate(() => window.MIRIGI_TOTAL_DURATION_MS);
    if (!totalMs) throw new Error('window.MIRIGI_TOTAL_DURATION_MS was not set by the deck — check js/slides.js');
    const recordMs = SECONDS ? Math.min(totalMs, SECONDS * 1000) : totalMs;
    const tailMs = SECONDS && recordMs < totalMs ? 0 : TAIL_BUFFER_MS;
    console.log(`[${LANG}] recording ${recordMs}ms${SECONDS ? ` (--seconds=${SECONDS} preview cap)` : ` (+${TAIL_BUFFER_MS}ms tail)`} at ${WIDTH}x${HEIGHT}${DPR > 1 ? ` @${DPR}x DPR (${WIDTH * DPR}x${HEIGHT * DPR} output)` : ''} ...`);

    await page.waitForTimeout(recordMs + tailMs);

    const video = page.video();
    await context.close();

    const recordedPath = await video.path();
    const resSuffix = WIDTH * DPR * HEIGHT * DPR > 1080 * 1920 ? '-4k' : '';
    const webmPath = path.join(OUT_DIR, `hotelga-24-7-${LANG}${resSuffix}${SECONDS ? '-preview' : ''}.webm`);
    console.log(`[${LANG}] re-encoding (minterpolate + deband + 10-bit VP9)...`);
    reencodeWebm(recordedPath, webmPath, FPS);
    const stat = fs.statSync(webmPath);
    console.log(`[${LANG}] webm: ${path.relative(ROOT, webmPath)} (${(stat.size / 1024).toFixed(0)} KB)`);

    if (args.mp4) {
      const mp4Path = transcodeToMp4(webmPath, FPS);
      const stat2 = fs.statSync(mp4Path);
      console.log(`[${LANG}] mp4:  ${path.relative(ROOT, mp4Path)} (${(stat2.size / 1024).toFixed(0)} KB)`);
    } else {
      console.log(`[${LANG}] skipping mp4 (pass --mp4 to also transcode) — webm only, for fast content iteration.`);
    }

    console.log(`\nDone. Output: ${path.relative(ROOT, OUT_DIR)}/`);
  } finally {
    await browser.close();
    server.close();
    fs.rmSync(videoDir, { recursive: true, force: true });
  }
})().catch(err => { console.error(err); process.exit(1); });
