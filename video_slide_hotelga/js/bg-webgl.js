/*
  WebGL background renderer for photo-driven slides: Ken Burns pan/zoom +
  gradient scrim, both computed in a fragment shader with an ordered (Bayer)
  dither baked in before output.

  Why: the CSS/DOM version of this (`.bg` + `.scrim` divs, see slides.css)
  produces visible banding on the dark scrim gradients once the deck is
  captured to video — Chromium's screenshot/video pipeline is 8-bit sRGB
  with no way to get more color depth out of it, and a static SVG noise
  overlay (`#grain`) survives Playwright's own lossy raw capture too poorly
  to fully fix it (see scripts/render-hotelga-video.js's notes). Computing
  the gradient in a shader lets us dither it precisely, at the moment of
  generation, at a strength tuned for what needs to survive re-compression
  — not a blind approximation via CSS-only noise.

  Scope: ONLY the photo + scrim background layer. Text, kickers, and the
  Miri popups stay ordinary DOM/CSS — they aren't where the banding
  complaint is (photos are already lossy 8-bit JPEGs, text has hard edges,
  neither bands), and re-implementing a whole typography/chat-UI engine in
  WebGL would be a much larger, riskier project for no corresponding gain.

  TWO alternating canvases, not one shared canvas reparented on every slide
  change: a single shared canvas has to move to the incoming slide the
  instant show() runs, which leaves the OUTGOING slide with no background
  at all for the whole ~1.1s CSS crossfade — it fades to solid black instead
  of its photo. slides.js's show() alternates between layer 0 and layer 1
  (see createLayer()/window.BgWebGL.layers below), so the outgoing slide's
  layer stays put, still rendering, until its own fade-out finishes; the
  incoming slide gets the other layer from the start of its fade-in.
*/
(function () {
  function createLayer(index) {
    var canvas = document.createElement('canvas');
    canvas.id = 'bg-canvas-' + index;
    canvas.className = 'bg-canvas';
    var gl = canvas.getContext('webgl2', { antialias: false, alpha: false, preserveDrawingBuffer: true });
    if (!gl) return { attachTo: function () {}, detach: function () {}, setBackground: function () {}, supported: false };

    var VERT = '#version 300 es\n' +
      'in vec2 aPos;\n' +
      'out vec2 vUv;\n' +
      'void main() {\n' +
      '  vec2 p = aPos;\n' +
      '  vUv = p * 0.5 + 0.5;\n' +
      '  gl_Position = vec4(p, 0.0, 1.0);\n' +
      '}\n';

    // uKenBurns: vec3(scale, tx, ty) — mirrors the CSS `@keyframes kenburns`
    // (scale 1 -> 1.08, translate 0,0 -> -1%,-1.5%, 9000ms ease-in-out,
    // alternating) computed on the JS side per-frame.
    // uCover: vec2(scaleX, scaleY) — the `background-size: cover` fit of the
    // image into the canvas (computed from image vs. canvas aspect ratio;
    // see coverScaleFor() below). Applied before Ken Burns, same as CSS
    // applies `background-size: cover` to the element before the transform
    // animates on top of it.
    // uScrim: 0 = default bottom-pinned linear vignette, 1 = full-bg
    // radial+linear vignette (mirrors .slide--full-bg .scrim in slides.css).
    var FRAG = '#version 300 es\n' +
      'precision highp float;\n' +
      'in vec2 vUv;\n' +
      'out vec4 outColor;\n' +
      'uniform sampler2D uTex;\n' +
      'uniform vec3 uKenBurns;\n' +
      'uniform vec2 uCover;\n' +
      'uniform vec2 uResolution;\n' +
      'uniform float uScrim;\n' +
      '\n' +
      '// 8x8 Bayer ordered-dither matrix, normalized to [0,1) then centered.\n' +
      'float bayer(vec2 p) {\n' +
      '  const float m[64] = float[64](\n' +
      '     0., 32.,  8., 40.,  2., 34., 10., 42.,\n' +
      '    48., 16., 56., 24., 50., 18., 58., 26.,\n' +
      '    12., 44.,  4., 36., 14., 46.,  6., 38.,\n' +
      '    60., 28., 52., 20., 62., 30., 54., 22.,\n' +
      '     3., 35., 11., 43.,  1., 33.,  9., 41.,\n' +
      '    51., 19., 59., 27., 49., 17., 57., 25.,\n' +
      '    15., 47.,  7., 39., 13., 45.,  5., 37.,\n' +
      '    63., 31., 55., 23., 61., 29., 53., 21.);\n' +
      '  ivec2 ip = ivec2(mod(p, 8.0));\n' +
      '  return m[ip.y * 8 + ip.x] / 64.0 - 0.5;\n' +
      '}\n' +
      '\n' +
      '// Piecewise-linear interpolation across 4 stops — CSS gradients\n' +
      '// interpolate stops linearly (not eased), so this (not smoothstep)\n' +
      '// is what actually matches the original .scrim design.\n' +
      'float stops4(float t, float p1, float v0, float v1, float p2, float v2, float p3, float v3) {\n' +
      '  if (t < p1) return mix(v0, v1, t / p1);\n' +
      '  if (t < p2) return mix(v1, v2, (t - p1) / (p2 - p1));\n' +
      '  if (t < p3) return mix(v2, v3, (t - p2) / (p3 - p2));\n' +
      '  return v3;\n' +
      '}\n' +
      '\n' +
      'void main() {\n' +
      '  vec2 covered = (vUv - 0.5) * uCover + 0.5;\n' +
      '  vec2 centered = (covered - 0.5) * uKenBurns.x + 0.5 + uKenBurns.yz;\n' +
      // textureLod(...,0.0), not texture() — automatic mip-LOD selection is
      // derivative-based (screen-space dFdx/dFdy of the UV), and the Ken
      // Burns zoom/clamp combination produces a discontinuous UV derivative
      // right at the clamped edge, which produced a garbage vertical strip
      // there on this headless Chromium's SwiftShader software rasterizer.
      // Forcing LOD 0 sidesteps automatic LOD selection entirely.
      '  vec3 photo = textureLod(uTex, clamp(centered, 0.0, 1.0), 0.0).rgb;\n' +
      '\n' +
      '  vec3 scrimColor;\n' +
      '  float scrimAlpha;\n' +
      '  if (uScrim > 0.5) {\n' +
      '    // full-bg: matches the old .slide--full-bg .scrim —\n' +
      '    //   radial-gradient(ellipse at center, .4 0%, .72 68%, .88 100%)\n' +
      '    //   composited (source-over) on top of\n' +
      '    //   linear-gradient(180deg, .6 0%, .35 38%, .7 65%, .9 100%)\n' +
      '    // "100%" on a `farthest-corner` ellipse is the distance from\n' +
      '    // center to a corner, i.e. length(vec2(0.5)) = 1/sqrt(2) in UV —\n' +
      '    // so UV distance must be rescaled by sqrt(2) to land stops correctly.\n' +
      '    float d = distance(vUv, vec2(0.5)) * 1.4142135;\n' +
      '    float radialA = d < 0.68 ? mix(0.4, 0.72, d / 0.68) : mix(0.72, 0.88, clamp((d - 0.68) / 0.32, 0.0, 1.0));\n' +
      '    float linearA = stops4(vUv.y, 0.38, 0.6, 0.35, 0.65, 0.7, 1.0, 0.9);\n' +
      '    scrimAlpha = radialA + linearA * (1.0 - radialA);\n' +
      '    scrimColor = vec3(0.0);\n' +
      '  } else {\n' +
      '    // default: bottom-pinned linear vignette (photo stays clear up\n' +
      '    // top, near-opaque by the bottom so text sits legibly on it) —\n' +
      '    // matches linear-gradient(180deg, 0 0%, .15 45%, .88 78%, .96 100%).\n' +
      '    scrimAlpha = stops4(vUv.y, 0.45, 0.0, 0.15, 0.78, 0.88, 1.0, 0.96);\n' +
      '    scrimColor = vec3(9.0, 9.0, 8.0) / 255.0;\n' +
      '  }\n' +
      '\n' +
      '  vec3 composited = mix(photo, scrimColor, scrimAlpha);\n' +
      '  // Dither strength tuned to survive Playwright\'s raw ~1Mbit/s VP8\n' +
      '  // capture (the first, unavoidable lossy step) followed by our own\n' +
      '  // re-encode — plain 1-LSB dithering gets erased by that; this is\n' +
      '  // intentionally coarser/stronger.\n' +
      '  composited += bayer(gl_FragCoord.xy) * (3.0 / 255.0);\n' +
      '  outColor = vec4(composited, 1.0);\n' +
      '}\n';

    function compile(type, src) {
      var sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        throw new Error('bg-webgl shader compile error: ' + gl.getShaderInfoLog(sh));
      }
      return sh;
    }

    var prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error('bg-webgl program link error: ' + gl.getProgramInfoLog(prog));
    }
    gl.useProgram(prog);

    var uTex = gl.getUniformLocation(prog, 'uTex');
    var uKenBurns = gl.getUniformLocation(prog, 'uKenBurns');
    var uCover = gl.getUniformLocation(prog, 'uCover');
    var uResolution = gl.getUniformLocation(prog, 'uResolution');
    var uScrim = gl.getUniformLocation(prog, 'uScrim');
    gl.uniform1i(uTex, 0);

    // A real VBO-backed quad, not attributeless gl_VertexID indexing — the
    // latter is valid GLES3 but unreliable on this headless Chromium's
    // SwiftShader software rasterizer (produced a torn, garbage vertical
    // strip on canvas resize/reparent in testing).
    var quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, -1, 1, 1, 1,
    ]), gl.STATIC_DRAW);
    var aPos = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    var texCache = {}; // url -> { tex, w, h } (per-context; textures aren't shareable across GL contexts)
    var current = null;
    var currentScrim = 0;
    var startedAtMs = null; // Ken Burns phase origin — set once per setBackground so a fresh slide always starts its pan/zoom from scale 1, not wherever the shared clock happens to be

    function loadTexture(url, onReady) {
      if (texCache[url]) { onReady(texCache[url]); return; }
      var tex = gl.createTexture();
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function () {
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        var entry = { tex: tex, w: img.naturalWidth, h: img.naturalHeight };
        texCache[url] = entry;
        onReady(entry);
      };
      img.src = url;
    }

    // `background-size: cover` equivalent: scales UV around center so the
    // image fills the canvas with no letterboxing, cropping whichever axis
    // is relatively too generous — exactly what CSS's `cover` keyword does.
    function coverScaleFor(imgW, imgH, canvasW, canvasH) {
      var imgAspect = imgW / imgH;
      var boxAspect = canvasW / canvasH;
      if (imgAspect > boxAspect) return [boxAspect / imgAspect, 1];
      return [1, imgAspect / boxAspect];
    }

    function resize() {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    }

    function render(nowMs) {
      if (!current || startedAtMs === null) return;
      resize();
      if (!canvas.width || !canvas.height) return;
      var cycle = 9000;
      var elapsed = nowMs - startedAtMs;
      var t = (elapsed % (cycle * 2)) / cycle;
      var phase = t <= 1 ? t : 2 - t; // triangle wave 0->1->0
      var ease = phase * phase * (3 - 2 * phase); // smoothstep ~ ease-in-out
      var scale = 1 + 0.08 * ease;
      var tx = -0.01 * ease;
      var ty = -0.015 * ease;
      var cover = coverScaleFor(current.w, current.h, canvas.width, canvas.height);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, current.tex);
      gl.uniform3f(uKenBurns, scale, tx, ty);
      gl.uniform2f(uCover, cover[0], cover[1]);
      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.uniform1f(uScrim, currentScrim);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    function raf(ts) {
      render(ts);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return {
      supported: true,
      canvas: canvas,
      // First child, z-index:0 — behind the slide's text content, above the
      // slide's own CSS background fill (mirrors the old `.bg` div).
      attachTo: function (slideNode) {
        if (canvas.parentNode !== slideNode) {
          slideNode.insertBefore(canvas, slideNode.firstChild);
        }
      },
      detach: function () {
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      },
      setBackground: function (url, isFullBg, nowMs) {
        currentScrim = isFullBg ? 1 : 0;
        startedAtMs = nowMs;
        loadTexture(url, function (entry) { current = entry; });
      },
    };
  }

  var layer0 = createLayer(0);
  var layer1 = createLayer(1);

  window.BgWebGL = {
    supported: layer0.supported,
    // Two alternating layers — see the file header comment for why a
    // single shared/reparented canvas causes a black flash on every
    // transition. slides.js's show() picks layers[index % 2] for the
    // incoming slide, leaving the other layer attached to the outgoing
    // slide until its own fade-out finishes.
    layers: [layer0, layer1],
  };
})();
