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

  document.getElementById('reset-btn').addEventListener('click',  () => Viewport.resetView());
  document.getElementById('zoom-in').addEventListener('click',    () => Viewport.zoomAround(cx(), cy(), 1.5));
  document.getElementById('zoom-out').addEventListener('click',   () => Viewport.zoomAround(cx(), cy(), 1 / 1.5));
  document.addEventListener('keydown', (e) => {
    if (e.key === '+' || e.key === '=') Viewport.zoomAround(cx(), cy(), 1.3);
    if (e.key === '-' || e.key === '_') Viewport.zoomAround(cx(), cy(), 1 / 1.3);
  });

  // ── Click-to-zoom ────────────────────────────────────────────────────────
  // Single click: smooth animated zoom into the clicked point (40× target).
  // Double-click: zoom back to full portrait view.
  // This lets you explore each Claude Code instance bubble directly.

  let animFrame = null;

  function animateZoom(screenX, screenY, targetZoom, durationMs = 900) {
    if (animFrame) cancelAnimationFrame(animFrame);

    const startZoom = viewport.zoom;
    const startTime = performance.now();

    function tick(now) {
      const t = Math.min(1, (now - startTime) / durationMs);
      // Cubic ease-out
      const eased = 1 - Math.pow(1 - t, 3);
      const desiredZoom = startZoom * Math.pow(targetZoom / startZoom, eased);
      const factor = desiredZoom / viewport.zoom;
      Viewport.zoomAround(screenX, screenY, factor);
      if (t < 1) animFrame = requestAnimationFrame(tick);
    }

    animFrame = requestAnimationFrame(tick);
  }

  let lastClick = 0;
  canvas.addEventListener('click', (e) => {
    // Ignore if a drag just finished (viewport.js sets dragging flag briefly)
    if (e.detail > 1) return; // suppress if triggered by dblclick

    const now = Date.now();
    if (now - lastClick < 350) return; // handled by dblclick
    lastClick = now;

    const rect = canvas.getBoundingClientRect();
    animateZoom(e.clientX - rect.left, e.clientY - rect.top, 40);
  });

  canvas.addEventListener('dblclick', (e) => {
    lastClick = 0;
    if (animFrame) cancelAnimationFrame(animFrame);
    Viewport.resetView();
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
