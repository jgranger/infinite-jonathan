// Multi-octave portrait renderer.
//
// There is no fixed grid and no depth limit. Instead, we define a family
// of grids at exponentially decreasing scales (octaves). At any zoom level,
// every octave whose structures fall in the visible size range is rendered
// simultaneously. As you zoom deeper, finer octaves enter the visible range
// and coarser ones leave it — creating seamless infinite expansion.
//
// The portrait is encoded as a continuous function: bilinear interpolation
// of the tonal field gives colour + brightness + gradient angle at any
// world coordinate. Brightness drives structure size (inverted halftone):
// bright areas have large structures (fills cell → reads bright), dark areas
// have small structures (canvas shows through → reads dark).
//
// At zoom 1×:  octaves 0–2 visible  → portrait reads through halftone density
// At zoom 4×:  octaves 0–3 visible  → first structures emerge
// At zoom 16×: octaves 1–4 visible  → finer structures appear inside coarser
// At zoom 64×: octaves 2–5 visible  → three simultaneous scale levels
// ... continues forever.

const Portrait = (() => {

  const BASE  = 32;   // world-px size of the coarsest octave's cells
  const RATIO = 4;    // each octave is 4× finer than the previous
  const MIN_SCREEN = 1.2;   // don't render structures smaller than this (px)
  const MAX_SCREEN = 700;   // don't render structures larger than this (px)

  let td = null; // tonal data

  // ── Portrait sampler ──────────────────────────────────────────────────────
  // Bilinear interpolation of the tonal-field grid.
  // Returns [r, g, b, brightness, angle] or null if outside the subject.
  function sample(wx, wy) {
    if (!td) return null;
    const { grid_w: gW, grid_h: gH, canvas_w: cW, canvas_h: cH, cells } = td;
    if (wx < 0 || wx >= cW || wy < 0 || wy >= cH) return null;

    const gxf = (wx / cW) * gW;
    const gyf = (wy / cH) * gH;
    const gx0 = Math.min(gW - 2, Math.floor(gxf));
    const gy0 = Math.min(gH - 2, Math.floor(gyf));
    const fx  = gxf - gx0;
    const fy  = gyf - gy0;

    const c00 = cells[gy0 * gW + gx0];
    const c10 = cells[gy0 * gW + gx0 + 1];
    const c01 = cells[(gy0 + 1) * gW + gx0];
    const c11 = cells[(gy0 + 1) * gW + gx0 + 1];
    if (!c00 || !c10 || !c01 || !c11) return null;

    // Only within the subject mask
    if (!c00[7] && !c10[7] && !c01[7] && !c11[7]) return null;

    const bl = (v00, v10, v01, v11) =>
      v00 + (v10 - v00) * fx + (v01 - v00) * fy + (v11 - v10 - v01 + v00) * fx * fy;

    return [
      Math.round(bl(c00[3], c10[3], c01[3], c11[3])), // r
      Math.round(bl(c00[4], c10[4], c01[4], c11[4])), // g
      Math.round(bl(c00[5], c10[5], c01[5], c11[5])), // b
      bl(c00[2], c10[2], c01[2], c11[2]),              // brightness
      c00[6],                                           // angle
    ];
  }

  // ── Structure type ─────────────────────────────────────────────────────────
  // Deterministic by (grid-x, grid-y, octave). Intentional placement:
  // bright/highlight areas → spiritual/organic; dark areas → CS/mathematical.
  function structureType(gx, gy, octave, brightness) {
    const h = ((gx * 2654435761) ^ (gy * 2246822519) ^ (octave * 1234567)) >>> 0;

    if (octave >= 3) {
      // Fine octaves: dense, space-filling types that look good tiny
      const t = ['breath','mandala','hilbert','sierpinski','golden','om'];
      return t[h % t.length];
    }
    if (brightness > 160) {
      // Highlights — spiritual, life, mathematical beauty
      const t = ['lotus','golden','om','breath','mandala','elephant',
                 'heart','sierpinski','plant','dna','infinity'];
      return t[h % t.length];
    }
    if (brightness > 90) {
      // Mid-tones — nature, cycles, cosmos
      const t = ['wave','galaxy','plant','dna','ouroboros','golden',
                 'mandala','fish','lotus','moon','breath'];
      return t[h % t.length];
    }
    // Shadows — engineering, mathematics, computation
    const t = ['circuit','maze','neural','hilbert','bintree',
               'dna','sierpinski','mandala','galaxy','infinity'];
    return t[h % t.length];
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init(data) { td = data; }

  // ── Render ────────────────────────────────────────────────────────────────
  function render(ctx, viewport, canvasW, canvasH) {
    if (!td) return;

    const { x: vpX, y: vpY, zoom } = viewport;

    // Octave L is visible when MIN_SCREEN ≤ cellWorldSize × zoom ≤ MAX_SCREEN
    // cellWorldSize = BASE / RATIO^L
    // → L_min = floor( log(BASE × zoom / MAX_SCREEN) / log(RATIO) )
    // → L_max = ceil ( log(BASE × zoom / MIN_SCREEN) / log(RATIO) )
    const logR  = Math.log(RATIO);
    const L_min = Math.max(0, Math.floor(Math.log(BASE * zoom / MAX_SCREEN) / logR));
    const L_max = Math.ceil(Math.log(BASE * zoom / MIN_SCREEN) / logR);

    for (let L = L_min; L <= L_max; L++) {
      const worldSize  = BASE / Math.pow(RATIO, L);  // world px per cell
      const screenSize = worldSize * zoom;             // screen px per cell

      // Iterate only over the cells that intersect the viewport
      const gx0 = Math.floor(vpX / worldSize) - 1;
      const gy0 = Math.floor(vpY / worldSize) - 1;
      const gx1 = Math.ceil((vpX + canvasW / zoom) / worldSize) + 1;
      const gy1 = Math.ceil((vpY + canvasH / zoom) / worldSize) + 1;

      for (let gy = gy0; gy <= gy1; gy++) {
        for (let gx = gx0; gx <= gx1; gx++) {

          // World-space centre of this cell
          const wx = (gx + 0.5) * worldSize;
          const wy = (gy + 0.5) * worldSize;

          const s = sample(wx, wy);
          if (!s) continue;

          const [r, g, b, brightness, angle] = s;

          // Inverted halftone: brightness → structure size fraction
          const t       = brightness / 255;
          const curved  = t <= 0.70 ? t : 0.70 + (t - 0.70) * 0.42;
          const sizeFrac = 0.04 + curved * 0.88;
          const structR  = screenSize * sizeFrac * 0.5; // screen radius

          if (structR < 0.3) continue;

          const sx    = (wx - vpX) * zoom;
          const sy    = (wy - vpY) * zoom;
          const color = `rgb(${r},${g},${b})`;

          // ── Fast paths ──────────────────────────────────────────────────
          if (structR < 1.0) {
            ctx.fillStyle = color;
            ctx.fillRect(sx - 0.5, sy - 0.5, 1.5, 1.5);
            continue;
          }

          if (structR < 4) {
            ctx.beginPath();
            ctx.arc(sx, sy, structR, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
            continue;
          }

          // ── Full structure ───────────────────────────────────────────────
          const seed    = ((gx * 2654435761) ^ (gy * 2246822519) ^ (L * 1234567)) >>> 0;
          const type    = structureType(gx, gy, L, brightness);
          const opacity = Math.min(1, (structR - 4) / 8);
          // depth=0: the octave system provides multi-scale; each structure
          // is its pure base form. Zooming into it reveals the next octave
          // filling the surrounding space — that IS structure-inside-structure.
          Structures.draw(ctx, type, structR * 1.6, color, seed, opacity, 0);
        }
      }
    }
  }

  return { init, render };
})();
