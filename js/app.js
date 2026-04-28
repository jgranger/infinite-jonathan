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
