#!/usr/bin/env node
/*
  Captures a static preview PNG for each miniapp folder, used by the brochure
  and any other non-iframe context.

  Each miniapp should ship a `preview.png` alongside its `index.html`. Run:

    node scripts/render-miniapp-preview.js                # all miniapps
    node scripts/render-miniapp-preview.js reports        # one miniapp
    node scripts/render-miniapp-preview.js --width=900 --height=675

  Requirements: puppeteer (already a devDep). Jekyll must be serving on :4000.
*/

const http = require('http');
const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MINIAPPS_DIR = path.resolve(ROOT, 'miniapps/features');

const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; })
);
const positional = process.argv.slice(2).filter(a => !a.startsWith('--'));

const WIDTH    = parseInt(args.width  || '1000', 10);
const HEIGHT   = parseInt(args.height || '750',  10);
const SETTLE   = parseInt(args.settle || '2200', 10);   // ms to wait for animations to land
const PORT     = parseInt(args.port   || '4000', 10);
const HOST     = args.host || 'localhost';

function ping(url, attemptsLeft = 30) {
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(url, res => { res.resume(); resolve(); });
      req.on('error', () => {
        if (--attemptsLeft <= 0) return reject(new Error('Jekyll not reachable at ' + url));
        setTimeout(tick, 500);
      });
    };
    tick();
  });
}

(async () => {
  const puppeteer = require('puppeteer');

  // Determine which miniapps to capture.
  const all = fs.readdirSync(MINIAPPS_DIR)
    .filter(name => fs.statSync(path.join(MINIAPPS_DIR, name)).isDirectory())
    .filter(name => fs.existsSync(path.join(MINIAPPS_DIR, name, 'index.html')));
  const targets = positional.length ? positional : all;

  // Make sure Jekyll is up before we ask Chromium to render.
  await ping(`http://${HOST}:${PORT}/`);

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const name of targets) {
    // ?preview=fan is honored by the screenshots lib (renders the cards as a
    // fanned hand). Miniapps that don't know about it ignore it harmlessly.
    const url = `http://${HOST}:${PORT}/miniapps/features/${name}/?lang=en&size=large&preview=fan`;
    const outFile = path.join(MINIAPPS_DIR, name, 'preview.png');
    console.log(`→ ${name}  →  ${path.relative(ROOT, outFile)}`);

    const page = await browser.newPage();
    await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 2 });
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

    // Give CSS animations a moment to land in a representative pose.
    await new Promise(r => setTimeout(r, SETTLE));

    await page.screenshot({ path: outFile, type: 'png', omitBackground: false });
    await page.close();
  }

  await browser.close();
  console.log('done.');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
