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

  // ── Tap-to-zoom ──────────────────────────────────────────────────────────
  // Tap (no drag): smooth animated zoom into that point at 40×.
  // Tap again while zoomed: reset to full portrait.
  // Works alongside viewport.js drag/pan without conflict.

  let animFrame   = null;
  let tapDownPos  = null;
  let tapDownTime = 0;

  function animateZoom(screenX, screenY, targetZoom, durationMs = 850) {
    if (animFrame) cancelAnimationFrame(animFrame);
    const startZoom = viewport.zoom;
    const startTime = performance.now();
    function tick(now) {
      const t      = Math.min(1, (now - startTime) / durationMs);
      const eased  = 1 - Math.pow(1 - t, 3); // cubic ease-out
      const factor = Math.pow(targetZoom / startZoom, eased) * startZoom / viewport.zoom;
      Viewport.zoomAround(screenX, screenY, factor);
      if (t < 1) animFrame = requestAnimationFrame(tick);
    }
    animFrame = requestAnimationFrame(tick);
  }

  canvas.addEventListener('pointerdown', (e) => {
    tapDownPos  = { x: e.clientX, y: e.clientY };
    tapDownTime = Date.now();
  }, { passive: true });

  canvas.addEventListener('pointerup', (e) => {
    if (!tapDownPos) return;
    const dx   = e.clientX - tapDownPos.x;
    const dy   = e.clientY - tapDownPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const held = Date.now() - tapDownTime;
    tapDownPos = null;

    // Only treat as a tap if pointer barely moved and wasn't held long
    if (dist > 8 || held > 400) return;

    const rect = canvas.getBoundingClientRect();
    const sx   = e.clientX - rect.left;
    const sy   = e.clientY - rect.top;

    // Already deep? Reset. Otherwise zoom in.
    if (viewport.zoom > 10) {
      if (animFrame) cancelAnimationFrame(animFrame);
      Viewport.resetView();
    } else {
      animateZoom(sx, sy, 40);
    }
  }, { passive: true });

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
