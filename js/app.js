(async () => {

  const canvas  = document.getElementById('c');
  const ctx     = canvas.getContext('2d');
  const zoomEl  = document.getElementById('zoom-level');
  const loadEl  = document.getElementById('loading');
  const loadBar = document.getElementById('loading-bar');

  let needsRender = true;

  function setProgress(p) { loadBar.style.setProperty('--p', `${p}%`); }

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    needsRender   = true;
  }
  resize();
  window.addEventListener('resize', resize);

  setProgress(10);
  const res = await fetch('data/tonal_field.json');
  const tonalData = await res.json();
  setProgress(100);

  const PW = tonalData.canvas_w;
  const PH = tonalData.canvas_h;

  Portrait.init(tonalData);

  let viewport = { x: 0, y: 0, zoom: 1 };
  Viewport.init(canvas, PW, PH, (v) => {
    viewport    = v;
    zoomEl.textContent = v.zoom.toFixed(1) + 'x';
    needsRender = true;
  });

  const cx = () => canvas.width  / 2;
  const cy = () => canvas.height / 2;

  // ── Smooth animated zoom ──────────────────────────────────────────────────
  let animFrame = null;
  function animateZoom(screenX, screenY, factor, durationMs = 500) {
    if (animFrame) cancelAnimationFrame(animFrame);
    const targetZoom = viewport.zoom * factor;
    const startZoom  = viewport.zoom;
    const start      = performance.now();
    function tick(now) {
      const t    = Math.min(1, (now - start) / durationMs);
      const ease = 1 - Math.pow(1 - t, 3);
      const want = startZoom * Math.pow(targetZoom / startZoom, ease);
      Viewport.zoomAround(screenX, screenY, want / viewport.zoom);
      if (t < 1) animFrame = requestAnimationFrame(tick);
    }
    animFrame = requestAnimationFrame(tick);
  }

  // Controls
  document.getElementById('reset-btn').addEventListener('click', () => {
    if (animFrame) cancelAnimationFrame(animFrame);
    Viewport.resetView();
  });
  document.getElementById('zoom-in').addEventListener('click',  () => animateZoom(cx(), cy(),  1.5));
  document.getElementById('zoom-out').addEventListener('click', () => animateZoom(cx(), cy(), 1/1.5));
  document.addEventListener('keydown', (e) => {
    if (e.key === '+' || e.key === '=') animateZoom(cx(), cy(),  1.5);
    if (e.key === '-' || e.key === '_') animateZoom(cx(), cy(), 1/1.5);
  });

  // Click anywhere → zoom in 1.5× centred on that point
  let mdX = 0, mdY = 0;
  canvas.addEventListener('mousedown', (e) => { mdX = e.clientX; mdY = e.clientY; });
  canvas.addEventListener('mouseup', (e) => {
    const d = Math.hypot(e.clientX - mdX, e.clientY - mdY);
    if (d > 6) return; // drag — ignore
    const rect = canvas.getBoundingClientRect();
    animateZoom(e.clientX - rect.left, e.clientY - rect.top, 1.5);
  });

  function renderFrame() {
    requestAnimationFrame(renderFrame);
    if (!needsRender) return;
    needsRender = false;
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    Portrait.render(ctx, viewport, canvas.width, canvas.height);
  }

  setTimeout(() => {
    loadEl.classList.add('hidden');
    setTimeout(() => { loadEl.style.display = 'none'; }, 900);
    needsRender = true;
    requestAnimationFrame(renderFrame);
  }, 200);

})();
