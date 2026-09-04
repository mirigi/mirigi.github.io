#!/usr/bin/env node
/*
  Renders the MIRIGI 24/7 hotel deck (video_slide_hotelga/) via Puppeteer's
  native page.screencast(), Chrome DevTools Protocol's Page.startScreencast,
  wrapped by puppeteer-core itself (added ~v22, no extra package needed;
  puppeteer-screen-recorder was tried first but pins peer dep puppeteer@19,
  incompatible with the puppeteer@24 already in this repo).

  Why this instead of Playwright's context.recordVideo (render-hotelga-video.js)
  or WebVideoCreator (render-hotelga-video-wvc.mjs):
    - Playwright's recordVideo is hardcoded inside its own bundled code
      (node_modules/playwright-core/lib/coreBundle.js) to `-c:v vp8 -crf 8
      -b:v 1M`, a fixed 1Mbit/s VP8 encode with NO exposed option to raise
      it. That's genuinely low for 1080x1920@30fps with fast text/bubble
      transitions and flat color fields (the WhatsApp header), and no
      downstream re-encode can recover detail already lost there. Confirmed
      via direct inspection of the bundled ffmpeg invocation.
    - puppeteer-core's ScreenRecorder (node_modules/puppeteer-core/lib/esm/
      puppeteer/node/ScreenRecorder.js) instead pipes each CDP screencast
      frame to ffmpeg as PNG (`-f image2pipe -vcodec png`, lossless per
      frame) and encodes with `-crf <quality>` (default 30, fully
      configurable via the `quality` option) and `-b:v 0` (CRF-only rate
      control, not bitrate-capped). No hardcoded low-bitrate bottleneck.
    - WVC (render-hotelga-video-wvc.mjs) is frame-perfect/deterministic and
      even higher quality (no real-time capture at all), but Chromium-only
      and was the render that used to crash, root cause found and fixed
      this session (img/features/panic_button.webp's embedded ICC profile
      choking the GPU process), so it's viable again; this script is the
      real-time-capture alternative for comparison, not a replacement.

  Usage:
    node scripts/render-hotelga-video-puppeteer.mjs --lang=es --tag=pscr --mp4
    node scripts/render-hotelga-video-puppeteer.mjs --lang=es --dpr=2 --tag=pscr-4k --mp4
*/
import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { spawnSync } from 'child_process';
import puppeteer from 'puppeteer';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const OUT_DIR = path.resolve(ROOT, 'video-out');

const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; })
);

const LANG = (args.lang || 'en').trim();
// Same DPR trick as render-hotelga-video.js: the CSS viewport always stays
// the 1080x1920 layout (what every vw/vh in slides.css computes against);
// DPR scales captured pixel density on top instead of changing the layout.
const WIDTH = parseInt(args.width || '1080', 10);
const HEIGHT = parseInt(args.height || '1920', 10);
const DPR = parseInt(args.dpr || '1', 10);
const PORT = parseInt(args.port || '8768', 10);
const FPS = parseInt(args.fps || '30', 10);
const SECONDS = args.seconds ? parseFloat(args.seconds) : null;
const QUALITY = parseInt(args.quality || '15', 10); // ffmpeg -crf: lower = better; ScreenRecorder default is 30
const TAG = args.tag ? `-${args.tag}` : '-pscr';
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

function transcodeToMp4(webmPath) {
  const ffmpegPath = require('ffmpeg-static');
  const mp4Path = webmPath.replace(/\.webm$/, '.mp4');
  // matrixin=gbr: puppeteer-core's ScreenRecorder pipes PNG frames (RGB) into
  // ffmpeg, so the intermediate webm is gbrp (planar RGB), not YUV, zscale
  // needs to be told there's no YUV matrix on the input side or it errors
  // with "no path between colorspaces".
  const vf = 'zscale=matrixin=gbr:matrix=709:dither=error_diffusion,format=yuv420p,pad=ceil(iw/2)*2:ceil(ih/2)*2';
  const r = spawnSync(ffmpegPath, [
    '-y', '-i', webmPath,
    '-vf', vf,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-movflags', '+faststart',
    mp4Path,
  ], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`ffmpeg mp4 transcode failed for ${webmPath}`);
  return mp4Path;
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const server = await startServer(ROOT, PORT);
  const baseUrl = `http://127.0.0.1:${PORT}`;
  console.log(`Serving ${ROOT} on ${baseUrl}`);

  // Headless Chrome defaults to --use-angle=swiftshader-webgl (software
  // rendering) even when a real GPU is present, for this deck's two
  // full-screen WebGL2 shader canvases (js/bg-webgl.js), software rendering
  // can't reliably hit 30fps in real time, which is what produced the
  // dropped/held-frame choppiness in the first screencast attempt (frame
  // quality itself was fine, it's a real-time throughput problem, not an
  // encoding one). These flags force real hardware ANGLE/GL instead;
  // confirmed via WEBGL_debug_renderer_info that this actually engages the
  // Intel Iris Xe GPU (not SwiftShader) in this environment, once /dev/dri
  // was made accessible to this user.
  const browser = await puppeteer.launch({
    args: [
      '--no-sandbox', '--disable-setuid-sandbox',
      '--use-gl=angle', '--use-angle=gl-egl',
      '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu',
    ],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: DPR });

    const url = `${baseUrl}${DECK_PATH}?auto=1&lang=${LANG}`;
    console.log(`[${LANG}] loading ${url}`);
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForSelector('.slide', { timeout: 8000 });

    const totalMs = await page.evaluate(() => window.MIRIGI_TOTAL_DURATION_MS);
    if (!totalMs) throw new Error('window.MIRIGI_TOTAL_DURATION_MS was not set by the deck, check js/slides.js');
    const recordMs = SECONDS ? Math.min(totalMs, SECONDS * 1000) : totalMs;
    const tailMs = SECONDS && recordMs < totalMs ? 0 : TAIL_BUFFER_MS;

    const webmPath = path.join(OUT_DIR, `hotelga-24-7-${LANG}${TAG}${SECONDS ? '-preview' : ''}.webm`);
    console.log(`[${LANG}] recording ${recordMs}ms${SECONDS ? ` (--seconds=${SECONDS} preview cap)` : ` (+${TAIL_BUFFER_MS}ms tail)`} at ${WIDTH}x${HEIGHT}${DPR > 1 ? ` @${DPR}x DPR (${WIDTH * DPR}x${HEIGHT * DPR} output)` : ''}, crf=${QUALITY} ...`);

    const recorder = await page.screencast({
      path: webmPath,
      format: 'webm',
      fps: FPS,
      quality: QUALITY,
      ffmpegPath: require('ffmpeg-static'),
    });
    await new Promise(resolve => setTimeout(resolve, recordMs + tailMs));
    await recorder.stop();

    const stat = fs.statSync(webmPath);
    console.log(`[${LANG}] webm: ${path.relative(ROOT, webmPath)} (${(stat.size / 1024 / 1024).toFixed(1)} MB)`);

    if (args.mp4) {
      console.log(`[${LANG}] transcoding to mp4 (dithered 8-bit downconversion)...`);
      const mp4Path = transcodeToMp4(webmPath);
      const stat2 = fs.statSync(mp4Path);
      console.log(`[${LANG}] mp4: ${path.relative(ROOT, mp4Path)} (${(stat2.size / 1024 / 1024).toFixed(1)} MB)`);
    }

    console.log(`\nDone. Output: ${path.relative(ROOT, OUT_DIR)}/`);
  } finally {
    await browser.close();
    server.close();
  }
})().catch(err => { console.error(err); process.exit(1); });
