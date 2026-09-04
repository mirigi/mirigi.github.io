#!/usr/bin/env node
/*
  Renders the MIRIGI 24/7 hotel deck (video_slide_hotelga/) to WebM using
  WebVideoCreator (WVC), https://github.com/Vinlic/WebVideoCreator.

  Usage:
    node scripts/render-hotelga-video-wvc.mjs                              # English, 30fps webm
    node scripts/render-hotelga-video-wvc.mjs --lang=es                    # Spanish, 30fps webm
    node scripts/render-hotelga-video-wvc.mjs --lang=es --fps=60           # genuine 60fps webm
    node scripts/render-hotelga-video-wvc.mjs --lang=es --seconds=10       # first 10s only, fast iteration
    node scripts/render-hotelga-video-wvc.mjs --lang=es --width=2160 --height=3840   # 4K vertical
    node scripts/render-hotelga-video-wvc.mjs --lang=es --chunk-ms=0       # disable chunking, one long session

  ─────────────────────────────────────────────────────────────────────────
  Why this replaces scripts/render-hotelga-video.js's Playwright recordVideo
  ─────────────────────────────────────────────────────────────────────────
  recordVideo captures Chromium in real wall-clock time at a fixed ~1Mbit/s,
  ~25fps that can drop/duplicate frames under load, it is not a
  frame-accurate capture. A hand-rolled deterministic pipeline was built
  earlier (Chromium's `Emulation.setVirtualTimePolicy` CDP domain, driving
  the page one virtual frame at a time) but hit a reproducible hang in this
  environment that was never root-caused.

  WVC solves the exact same problem (Chrome's `HeadlessExperimental.beginFrame`
  deterministic rendering API, the same one Chrome docs recommend for this)
  as a mature, maintained library rather than hand-rolled CDP calls.

  ─────────────────────────────────────────────────────────────────────────
  Rendering happens in short chunks, not one long session, see --chunk-ms
  ─────────────────────────────────────────────────────────────────────────
  A single continuous WVC session reliably crashed partway through the full
  ~296s deck in this environment, confirmed twice: at 4K within 5-60s, and
  separately at 1080p ~19 minutes / 158MB in (a `Page crashed` error,
  followed by an unrelated internal WVC operation, #seekCSSAnimations ,
  throwing once it tried to keep using the already-dead page). Not
  resolution-specific: a long-running-session problem, root cause not
  identified beyond that.

  So by default this renders the deck in `--chunk-ms` (default 60000)
  windows, each a fully separate WebVideoCreator instance/browser session
  using WVC's own `startTime`/`duration` options (its capture loop only
  screenshots frames once virtual time reaches `startTime`, earlier frames
  are stepped through with lighter per-frame CDP calls, not a full
  screenshot capture, so seeking to a late startTime is meaningfully
  cheaper than capturing through it), then concatenates the per-chunk webm
  files with ffmpeg's concat demuxer (lossless, same codec/resolution/fps
  throughout, so this is just a container-level splice). Each chunk's own
  session only has to survive ~chunk-ms of real capture time, well under
  whatever threshold triggers the crash.

  `--chunk-ms=0` disables this and renders in one long session (useful for
  the --seconds preview path, where the whole thing already fits well under
  the crash threshold, and chunking's extra per-chunk browser-launch
  overhead isn't worth it).

  ─────────────────────────────────────────────────────────────────────────
  4K (and above) is patched to use compatibleRenderingMode automatically
  ─────────────────────────────────────────────────────────────────────────
  At 4K, `HeadlessExperimental.beginFrame` (an experimental/legacy CDP
  method, see puppeteer#11315, heygen-com/hyperframes#294) hung
  unpredictably here: sometimes outright (0% CPU, never recovers, even on
  a fresh browser profile with plenty of free RAM), sometimes "succeeding"
  after 70-90+ minutes for a 30s clip with the intermediate webm size
  ballooning unboundedly (900MB+ for what should be ~90MB), plausibly a
  symptom of a stalled/retried begin-frame loop confusing libvpx-vp9's
  rate control. Below, `compatibleRenderingMode` is set automatically for
  anything larger than 1080x1920, which swaps the frame-signaling
  mechanism to plain `Page.screenshot`, determinism doesn't actually come
  from beginFrame itself, it comes from WVC's own injected virtual clock
  (overriding requestAnimationFrame/performance.now, see
  node_modules/web-video-creator/core/CaptureContext.js), so this keeps
  frame-perfect, zero-dropped-frame capture, just ~40% slower per WVC's
  own docs.

  Also: node_modules/web-video-creator/core/Browser.js is hand-patched to
  drop the `--single-process` Chrome flag it hardcodes on Linux (no config
  option exists for this), --single-process is independently known to be
  unstable for headless Chromium automation, and this deck runs two
  full-screen WebGL2 contexts (js/bg-webgl.js) that compound the risk.
  THIS PATCH IS LOST ON ANY `npm install` OF web-video-creator, reapply
  by replacing `util.isLinux() ? "--single-process" : "--process-per-tab"`
  with `"--process-per-tab"` in that file's #generateArgs() if renders
  start hanging again after a dependency reinstall.

  First run downloads WVC's own Chrome build into ./.bin/ (gitignored,
  silent unless you're watching for it, no progress log during download).
*/

import { fileURLToPath } from 'url';
import path from 'path';
import http from 'http';
import fs from 'fs';
import os from 'os';
import { spawn, spawnSync } from 'child_process';
import { createRequire } from 'module';
import WebVideoCreator, { VIDEO_ENCODER } from 'web-video-creator';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.resolve(ROOT, 'video-out');

// Split on the FIRST '=' only, not .split('='), which breaks any value
// containing its own '=' (e.g. --url=http://host/path?auto=1&lang=es got
// truncated to "http://host/path?auto", silently dropping "=1&lang=es" and
// making every chunk-worker load the deck with no lang param at all →
// deck fell back to English despite --lang=es on every chunked run.
const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => {
      const stripped = a.replace(/^--/, '');
      const eq = stripped.indexOf('=');
      return eq === -1 ? [stripped, true] : [stripped.slice(0, eq), stripped.slice(eq + 1)];
    })
);

const LANG = (args.lang || 'en').trim();
const WIDTH = parseInt(args.width || '1080', 10);
const HEIGHT = parseInt(args.height || '1920', 10);
const PORT = parseInt(args.port || '8767', 10);
const FPS = parseInt(args.fps || '30', 10);
const SECONDS = args.seconds ? parseFloat(args.seconds) : null;
const FAST = !!args.fast; // jpeg frames + yuv420p, for quick content/timing iteration, not final quality checks
const CHUNK_MS = args['chunk-ms'] !== undefined ? parseInt(args['chunk-ms'], 10) : 60000;
const TAG = args.tag ? `-${args.tag}` : '';
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
    if (!totalMs) throw new Error('window.MIRIGI_TOTAL_DURATION_MS was not set by the deck, check js/slides.js');
    return totalMs;
  } finally {
    await browser.close();
  }
}

// Renders one [startTime, startTime+duration) window to outputPath using a
// fresh WebVideoCreator instance (i.e. a fresh browser session, see file
// header for why sessions are kept short-lived).
async function renderWindow({ url, outputPath, startTime, duration }) {
  const wvc = new WebVideoCreator();
  wvc.config({
    webmEncoder: VIDEO_ENCODER.CPU.VP9,
    frameFormat: FAST ? 'jpeg' : 'png',
    beginFrameTimeout: 30000,
    compatibleRenderingMode: WIDTH * HEIGHT > 1080 * 1920,
    // GPU acceleration is ~3x faster per chunk (65-87s vs ~215s under
    // software rendering, confirmed by direct comparison) and NOT the cause
    // of the chunk-4 (60-80s) 4/4 failure it was first suspected of: the
    // same window also crashed on a retry under software rendering, so
    // this content is just occasionally flaky regardless of backend, not a
    // GPU-specific deterministic bug (unlike the earlier panic_button.webp
    // ICC-profile crash, which really was 100% deterministic). Keeping GPU
    // on and relying on MAX_ATTEMPTS_PER_CHUNK to absorb the flakiness.
    // --no-gpu is a debugging escape hatch, not the default.
    ...(args['no-gpu'] ? { browserUseGPU: false, browserUseAngle: false } : {}),
  });

  const video = wvc.createSingleVideo({
    url,
    width: WIDTH,
    height: HEIGHT,
    fps: FPS,
    startTime,
    duration,
    outputPath,
    showProgress: true,
    pixelFormat: 'yuv420p',
    videoQuality: FAST ? 80 : 90,
    // Debugging visibility: forward the deck's own console/page errors and
    // WVC's internal frame-preprocessing log into stdout, not just the
    // generic "Page crashed!" with no context. Off by default (noisy);
    // enable via --debug-log when isolating a specific crash.
    ...(args['debug-log'] ? { consoleLog: true, videoPreprocessLog: true } : {}),
  });

  // Watchdog: WVC's high-level API doesn't surface a Chromium renderer
  // crash as a promise rejection, the "Page crashed" event lives on an
  // internal Page object under a "crashed" event name that, unless
  // something is listening for it specifically, just gets logged
  // (`logger.error("Page crashed:", err)`, see core/Page.js #emitCrashed)
  // and otherwise vanishes, leaving this process hanging forever instead
  // of exiting non-zero. Progress-based (polls the intermediate file
  // WVC itself writes to in tmp/synthesizer/), not a flat deadline, so a
  // legitimately slow-but-alive chunk isn't killed just for taking a while.
  const synthesizerDir = path.join(ROOT, 'tmp', 'synthesizer');
  const STALL_CHECK_MS = 30000;
  const STALL_CHECKS_BEFORE_BAIL = 6; // 3 minutes of zero growth
  let lastSize = -1;
  let stallCount = 0;
  const watchdog = setInterval(() => {
    let size = 0;
    try {
      const files = fs.readdirSync(synthesizerDir).filter(f => f.endsWith('.webm'));
      for (const f of files) size += fs.statSync(path.join(synthesizerDir, f)).size;
    } catch { /* dir may not exist yet */ }
    if (size > lastSize) {
      stallCount = 0;
      lastSize = size;
    } else {
      stallCount++;
      if (stallCount >= STALL_CHECKS_BEFORE_BAIL) {
        console.error(`[${LANG}] watchdog: no growth for ${(stallCount * STALL_CHECK_MS / 1000).toFixed(0)}s, assuming a silent renderer crash (see core/Page.js #emitCrashed) and exiting`);
        process.exit(1);
      }
    }
  }, STALL_CHECK_MS);

  await new Promise((resolve, reject) => {
    video.once('completed', result => {
      console.log(`[${LANG}] chunk done: ${path.relative(ROOT, outputPath)}, took ${(result.takes / 1000).toFixed(1)}s, RTF ${result.rtf.toFixed(3)}`);
      resolve();
    });
    video.once('error', reject);
    video.start();
  });
  clearInterval(watchdog);
}

function concatWebm(chunkPaths, outputPath) {
  const ffmpegPath = require('ffmpeg-static');
  const listPath = path.join(os.tmpdir(), `concat-${Date.now()}.txt`);
  fs.writeFileSync(listPath, chunkPaths.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join('\n'));
  const r = spawnSync(ffmpegPath, [
    '-y', '-f', 'concat', '-safe', '0', '-i', listPath,
    '-c', 'copy',
    outputPath,
  ], { stdio: 'inherit' });
  fs.rmSync(listPath, { force: true });
  if (r.status !== 0) throw new Error(`ffmpeg concat failed for ${outputPath}`);
}

// Worker mode: render exactly one [startTime, startTime+duration) window
// and exit, no duration probe, no HTTP server of its own (connects to the
// orchestrator's). Run as a genuinely separate OS process per chunk (see
// orchestrator below), not just a fresh WebVideoCreator instance in the
// same process: a Chromium renderer crash (confirmed to happen at a
// specific point in this deck, not just from long sessions, chunks
// covering 0-100s completed cleanly, but the chunk starting at 100s
// crashed immediately) can leave puppeteer-core/WVC's internal state
// (browser pool, CDP connection) unusable even for a *new* WebVideoCreator
// instance in that same process. A fresh process sidesteps that entirely,
// and lets the orchestrator retry a failed chunk a few times in case the
// crash isn't fully deterministic.
async function runWorker() {
  await renderWindow({
    url: args.url,
    outputPath: args.output,
    startTime: parseInt(args['start-time'], 10),
    duration: parseInt(args.duration, 10),
  });
  // Explicit exit, not a natural return: a successfully-completed worker
  // was observed hanging indefinitely afterward (some WVC/puppeteer
  // internal handle, browser pool, CDP socket, keeps the event loop
  // alive) with the orchestrator waiting on its 'exit' event the whole
  // time, stalling the whole chunk pipeline on an already-finished chunk.
  process.exit(0);
}

// Async spawn, not spawnSync: spawnSync blocks Node's single-threaded
// event loop for the child's entire lifetime, but the orchestrator's own
// HTTP server (which the child needs to reach to load the deck) runs on
// that same event loop. A blocked parent can't answer the child's
// page.goto() request, which then times out waiting for a response that
// can never come, a self-deadlock (reproduced: every attempt failed with
// "Navigation timeout of 30000 ms exceeded" until this was fixed).
function spawnChunkWorker({ url, outputPath, startTime, duration }) {
  const workerArgs = [
    __filename,
    '--chunk-worker',
    `--url=${url}`,
    `--output=${outputPath}`,
    `--start-time=${startTime}`,
    `--duration=${duration}`,
    `--width=${WIDTH}`,
    `--height=${HEIGHT}`,
    `--fps=${FPS}`,
    `--lang=${LANG}`,
  ];
  if (FAST) workerArgs.push('--fast');
  return new Promise(resolve => {
    const child = spawn(process.execPath, workerArgs, { stdio: 'inherit' });
    child.on('exit', code => resolve({ status: code }));
  });
}

const __filename = fileURLToPath(import.meta.url);

(async () => {
  if (args['chunk-worker']) {
    await runWorker();
    return;
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const server = await startServer(ROOT, PORT);
  const baseUrl = `http://127.0.0.1:${PORT}`;
  const url = `${baseUrl}${DECK_PATH}?auto=1&lang=${LANG}`;
  console.log(`[${LANG}] probing duration at ${url} ...`);

  try {
    const totalMs = await probeDurationMs(url);
    const durationMs = (SECONDS ? Math.min(totalMs, SECONDS * 1000) : totalMs) + TAIL_BUFFER_MS;
    const outputPath = path.join(OUT_DIR, `hotelga-24-7-${LANG}${TAG}${SECONDS ? '-preview' : ''}.webm`);
    // Was 4; bumped after observing a chunk crash 4/4 in a row (a low-
    // probability but real outcome of independent ~25% per-attempt crash
    // odds, not a deterministic content bug, see the browserUseGPU note
    // above) that a 5th/6th attempt would very likely have absorbed.
    const MAX_ATTEMPTS_PER_CHUNK = 6;

    if (!CHUNK_MS || durationMs <= CHUNK_MS) {
      console.log(`[${LANG}] rendering ${durationMs}ms at ${WIDTH}x${HEIGHT}, ${FPS}fps (single session, in a worker process) ...`);
      for (let attempt = 1; ; attempt++) {
        const r = await spawnChunkWorker({ url, outputPath, startTime: 0, duration: durationMs });
        if (r.status === 0) break;
        console.error(`[${LANG}] render failed (attempt ${attempt}/${MAX_ATTEMPTS_PER_CHUNK})`);
        if (attempt >= MAX_ATTEMPTS_PER_CHUNK) throw new Error('render failed after retries');
      }
    } else {
      const chunkDir = fs.mkdtempSync(path.join(OUT_DIR, '.chunks-'));
      const chunkCount = Math.ceil(durationMs / CHUNK_MS);
      console.log(`[${LANG}] rendering ${durationMs}ms at ${WIDTH}x${HEIGHT}, ${FPS}fps in ${chunkCount} chunks of ~${CHUNK_MS}ms (separate worker processes, retried on crash) ...`);
      const chunkPaths = [];
      try {
        for (let i = 0; i < chunkCount; i++) {
          const startTime = i * CHUNK_MS;
          const duration = Math.min(CHUNK_MS, durationMs - startTime);
          const chunkPath = path.join(chunkDir, `chunk-${String(i).padStart(3, '0')}.webm`);
          console.log(`[${LANG}] chunk ${i + 1}/${chunkCount}: ${startTime}ms..${startTime + duration}ms`);
          for (let attempt = 1; ; attempt++) {
            const r = await spawnChunkWorker({ url, outputPath: chunkPath, startTime, duration });
            if (r.status === 0) break;
            console.error(`[${LANG}] chunk ${i + 1}/${chunkCount} failed (attempt ${attempt}/${MAX_ATTEMPTS_PER_CHUNK})`);
            if (attempt >= MAX_ATTEMPTS_PER_CHUNK) throw new Error(`chunk ${i + 1}/${chunkCount} (${startTime}ms..${startTime + duration}ms) failed after ${MAX_ATTEMPTS_PER_CHUNK} attempts, likely a deterministic crash on this content, not a transient one`);
          }
          chunkPaths.push(chunkPath);
        }
        console.log(`[${LANG}] concatenating ${chunkPaths.length} chunks...`);
        concatWebm(chunkPaths, outputPath);
      } finally {
        fs.rmSync(chunkDir, { recursive: true, force: true });
      }
    }

    const stat = fs.statSync(outputPath);
    console.log(`[${LANG}] webm: ${path.relative(ROOT, outputPath)} (${(stat.size / 1024 / 1024).toFixed(1)} MB)`);

    if (args.mp4) {
      // zscale=dither=error_diffusion for the same reason as
      // render-hotelga-video.js's transcodeToMp4: a plain -pix_fmt yuv420p
      // conversion from a higher-precision source truncates instead of
      // dithering and reintroduces banding.
      const ffmpegPath = require('ffmpeg-static');
      const mp4Path = outputPath.replace(/\.webm$/, '.mp4');
      const r = spawnSync(ffmpegPath, [
        '-y', '-i', outputPath,
        '-vf', 'zscale=dither=error_diffusion,format=yuv420p,pad=ceil(iw/2)*2:ceil(ih/2)*2',
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-movflags', '+faststart',
        mp4Path,
      ], { stdio: 'inherit' });
      if (r.status !== 0) throw new Error(`ffmpeg mp4 transcode failed for ${outputPath}`);
      const stat2 = fs.statSync(mp4Path);
      console.log(`[${LANG}] mp4: ${path.relative(ROOT, mp4Path)} (${(stat2.size / 1024 / 1024).toFixed(1)} MB)`);
    }
  } finally {
    server.close();
  }
})().catch(err => { console.error(err); process.exit(1); });
