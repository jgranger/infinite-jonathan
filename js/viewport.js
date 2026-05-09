// Zoom / pan viewport controller
const Viewport = (() => {

  let state = { x: 0, y: 0, zoom: 1 };
  let canvas, portraitW, portraitH, canvasW, canvasH;
  let onUpdate = null;

  // Drag state
  let dragging = false;
  let dragStart = { mx: 0, my: 0, vx: 0, vy: 0 };

  // Momentum
  let velocity = { x: 0, y: 0 };
  let lastDrag = { x: 0, y: 0, t: 0 };
  let momentumFrame = null;

  const MIN_ZOOM = 0.4;
  const MAX_ZOOM = Infinity; // no ceiling — this is Infinite Jonathan

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function constrainPan() {
    const vw = canvasW / state.zoom;
    const vh = canvasH / state.zoom;
    // Generous bounds — allow portrait to scroll fully in any direction
    state.x = clamp(state.x, -vw * 0.7, portraitW - vw * 0.3);
    state.y = clamp(state.y, -vh * 0.7, portraitH - vh * 0.3);
  }

  function zoomAround(mx, my, factor) {
    const newZoom = clamp(state.zoom * factor, MIN_ZOOM, MAX_ZOOM);
    const worldX = state.x + mx / state.zoom;
    const worldY = state.y + my / state.zoom;
    state.zoom = newZoom;
    state.x = worldX - mx / state.zoom;
    state.y = worldY - my / state.zoom;
    constrainPan();
    onUpdate && onUpdate(state);
  }

  function onWheel(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.25 : 1 / 1.25;
    zoomAround(mx, my, factor);
  }

  function onPointerDown(e) {
    if (momentumFrame) { cancelAnimationFrame(momentumFrame); momentumFrame = null; }
    dragging = true;
    dragStart = { mx: e.clientX, my: e.clientY, vx: state.x, vy: state.y };
    lastDrag = { x: e.clientX, y: e.clientY, t: Date.now() };
    velocity = { x: 0, y: 0 };
    canvas.classList.add('dragging');
    canvas.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e) {
    if (!dragging) return;
    const now = Date.now();
    const dt = now - lastDrag.t;
    if (dt > 0) {
      velocity.x = (e.clientX - lastDrag.x) / dt;
      velocity.y = (e.clientY - lastDrag.y) / dt;
    }
    lastDrag = { x: e.clientX, y: e.clientY, t: now };
    const dx = (e.clientX - dragStart.mx) / state.zoom;
    const dy = (e.clientY - dragStart.my) / state.zoom;
    state.x = dragStart.vx - dx;
    state.y = dragStart.vy - dy;
    constrainPan();
    onUpdate && onUpdate(state);
  }

  function onPointerUp() {
    if (!dragging) return;
    dragging = false;
    canvas.classList.remove('dragging');
    startMomentum();
  }

  function startMomentum() {
    const decay = 0.92;
    function tick() {
      if (Math.abs(velocity.x) < 0.01 && Math.abs(velocity.y) < 0.01) return;
      state.x -= velocity.x * 16 / state.zoom;
      state.y -= velocity.y * 16 / state.zoom;
      velocity.x *= decay;
      velocity.y *= decay;
      constrainPan();
      onUpdate && onUpdate(state);
      momentumFrame = requestAnimationFrame(tick);
    }
    momentumFrame = requestAnimationFrame(tick);
  }

  // Pinch-to-zoom
  let touches = {};
  let lastPinchDist = null;

  function onTouchStart(e) {
    e.preventDefault();
    for (const t of e.changedTouches) touches[t.identifier] = t;
  }
  function onTouchMove(e) {
    e.preventDefault();
    for (const t of e.changedTouches) touches[t.identifier] = t;
    const pts = Object.values(touches);
    if (pts.length === 2) {
      const dx = pts[0].clientX - pts[1].clientX;
      const dy = pts[0].clientY - pts[1].clientY;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (lastPinchDist) {
        const rect = canvas.getBoundingClientRect();
        const cx = (pts[0].clientX + pts[1].clientX) / 2 - rect.left;
        const cy = (pts[0].clientY + pts[1].clientY) / 2 - rect.top;
        zoomAround(cx, cy, dist / lastPinchDist);
      }
      lastPinchDist = dist;
    }
  }
  function onTouchEnd(e) {
    for (const t of e.changedTouches) delete touches[t.identifier];
    lastPinchDist = null;
  }

  function init(c, pw, ph, updateCb) {
    canvas = c;
    portraitW = pw;
    portraitH = ph;
    canvasW = canvas.width;
    canvasH = canvas.height;
    onUpdate = updateCb;

    // Start centered
    resetView();

    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove',  onTouchMove,  { passive: false });
    canvas.addEventListener('touchend',   onTouchEnd);
  }

  function resetView() {
    const fitZoom = Math.min(canvasW / portraitW, canvasH / portraitH) * 0.9;
    state.zoom = fitZoom;
    state.x = -(canvasW / state.zoom - portraitW) / 2;
    state.y = -(canvasH / state.zoom - portraitH) / 2;
    onUpdate && onUpdate(state);
  }

  function panBy(screenDx, screenDy) {
    state.x += screenDx / state.zoom;
    state.y += screenDy / state.zoom;
    constrainPan();
    onUpdate && onUpdate(state);
  }

  function getState() { return { ...state }; }

  return { init, getState, resetView, zoomAround, panBy };
})();
