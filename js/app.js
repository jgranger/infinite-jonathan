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

  const panStep = () => canvas.width * 0.12; // pan 12% of screen width per press

  // Controls — zoom, pan, reset
  document.getElementById('reset-btn').addEventListener('click',  () => Viewport.resetView());
  document.getElementById('zoom-in').addEventListener('click',    () => Viewport.zoomAround(cx(), cy(),   1.5));
  document.getElementById('zoom-out').addEventListener('click',   () => Viewport.zoomAround(cx(), cy(), 1/1.5));
  document.getElementById('pan-left').addEventListener('click',   () => Viewport.panBy(-panStep(), 0));
  document.getElementById('pan-right').addEventListener('click',  () => Viewport.panBy( panStep(), 0));
  document.addEventListener('keydown', (e) => {
    if (e.key === '+' || e.key === '=')    Viewport.zoomAround(cx(), cy(),   1.5);
    if (e.key === '-' || e.key === '_')    Viewport.zoomAround(cx(), cy(), 1/1.5);
    if (e.key === 'ArrowLeft')  { e.preventDefault(); Viewport.panBy(-panStep(), 0); }
    if (e.key === 'ArrowRight') { e.preventDefault(); Viewport.panBy( panStep(), 0); }
  });

  // Click canvas → zoom in 1.5× centred on that exact point, every time.
  // Never zooms out. Only − button / − key zooms out.
  let mdX = 0, mdY = 0;
  canvas.addEventListener('mousedown', (e) => { mdX = e.clientX; mdY = e.clientY; });
  canvas.addEventListener('mouseup', (e) => {
    if (Math.hypot(e.clientX - mdX, e.clientY - mdY) > 6) return; // drag
    const rect = canvas.getBoundingClientRect();
    Viewport.zoomAround(e.clientX - rect.left, e.clientY - rect.top, 1.5);
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
