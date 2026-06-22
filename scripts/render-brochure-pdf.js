#!/usr/bin/env node
/*
  Server-renders the print brochure to a multi-page PDF, one per language.

  Reads the built Jekyll site from `_site/`, serves it over a tiny static
  HTTP server, loads each language's /brochure.html in headless Chromium with
  print emulation, and writes:

    _site/downloads/brochure-en.pdf
    _site/downloads/brochure-es.pdf
    _site/downloads/brochure-fr.pdf

  Run after `jekyll build -d _site`:

    node scripts/render-brochure-pdf.js
    node scripts/render-brochure-pdf.js --site=_site --out=_site/downloads

  Requirements: puppeteer (devDep). No running Jekyll server needed — this
  serves the static _site itself.

  Why the injected print CSS: the theme sets `html,body{height:100%}` and the
  brochure pages use `min-height:100vh`. Under print that collapses the whole
  document to a single clipped page. We force auto height + visible overflow
  and let the @page size drive pagination (preferCSSPageSize).
*/

const http = require('http');
const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; })
);

const SITE_DIR = path.resolve(ROOT, args.site || '_site');
const OUT_DIR  = path.resolve(ROOT, args.out  || path.join(SITE_DIR, 'downloads'));
const PORT     = parseInt(args.port || '0', 10); // 0 = let the OS pick a free port

// language → brochure URL path within the built site.
const TARGETS = [
  { lang: 'en', urlPath: '/brochure.html' },
  { lang: 'es', urlPath: '/es/brochure.html' },
  { lang: 'fr', urlPath: '/fr/brochure.html' },
];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.eot':  'application/vnd.ms-fontobject',
  '.ico':  'image/x-icon',
  '.pdf':  'application/pdf',
  '.map':  'application/json; charset=utf-8',
};

// Print-fix CSS, injected after the page's own stylesheets so it wins.
const PRINT_FIX_CSS = `
  @media print {
    html, body {
      height: auto !important;
      min-height: 0 !important;
      overflow: visible !important;
    }
    .no-print { display: none !important; }
  }
`;

function serveStatic(dir) {
  return http.createServer((req, res) => {
    try {
      let urlPath = decodeURIComponent(req.url.split('?')[0]);
      if (urlPath.endsWith('/')) urlPath += 'index.html';
      let filePath = path.join(dir, urlPath);

      // Prevent path traversal outside the served directory.
      if (!filePath.startsWith(dir)) {
        res.writeHead(403); return res.end('Forbidden');
      }
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        const asIndex = path.join(filePath, 'index.html');
        if (fs.existsSync(asIndex)) filePath = asIndex;
        else { res.writeHead(404); return res.end('Not found: ' + urlPath); }
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    } catch (e) {
      res.writeHead(500); res.end(String(e));
    }
  });
}

(async () => {
  if (!fs.existsSync(SITE_DIR)) {
    throw new Error(`Built site not found at ${SITE_DIR}. Run jekyll build -d _site first.`);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const puppeteer = require('puppeteer');

  const server = serveStatic(SITE_DIR);
  await new Promise(resolve => server.listen(PORT, '127.0.0.1', resolve));
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;
  console.log(`Serving ${path.relative(ROOT, SITE_DIR)} at ${base}`);

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    for (const { lang, urlPath } of TARGETS) {
      const url = base + urlPath;
      const outFile = path.join(OUT_DIR, `brochure-${lang}.pdf`);
      console.log(`→ ${lang}  ${url}  →  ${path.relative(ROOT, outFile)}`);

      const page = await browser.newPage();
      const resp = await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
      if (!resp || !resp.ok()) {
        throw new Error(`Failed to load ${url} (status ${resp && resp.status()})`);
      }

      await page.addStyleTag({ content: PRINT_FIX_CSS });
      await page.emulateMediaType('print');

      // Wait for fonts and lazily-decoded images before snapshotting.
      await page.evaluate(async () => {
        if (document.fonts && document.fonts.ready) await document.fonts.ready;
        const imgs = Array.from(document.images);
        await Promise.all(imgs.map(img => img.complete
          ? Promise.resolve()
          : new Promise(r => { img.onload = img.onerror = r; })));
      });

      await page.pdf({
        path: outFile,
        printBackground: true,
        preferCSSPageSize: true, // let @page size:letter drive pagination
        format: 'Letter',        // fallback if the page sets no @page size
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
      });

      await page.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
  console.log('done.');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
