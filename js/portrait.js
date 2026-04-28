// Portrait renderer — portrait colour fill + portrait colour structures.
// Both layers are the same colour so there's no visible "overlay" separation.
// The fill provides coverage; the structure provides form that reveals on zoom.
// As the fill fades at high zoom, hex-grid sub-structures fill the remaining space.
const Portrait = (() => {

  let tonalData = null;

  function cellHash(col, row) {
    let h = (col * 2654435761 ^ row * 2246822519) >>> 0;
    h ^= h >>> 16; h = Math.imul(h, 0x45d9f3b) >>> 0;
    h ^= h >>> 16;
    return h;
  }

  const DENSE = ['breath','mandala','sierpinski','hilbert','golden','om'];

  function structureType(col, row, brightness, inMask, screenR) {
    const h = cellHash(col, row);
    if (screenR < 18) return DENSE[h % DENSE.length];
    if (!inMask) {
      return ['galaxy','moon','wave','infinity','breath','hilbert','bintree','wave','galaxy'][h % 9];
    }
    if (brightness > 160) {
      return ['lotus','sun','golden','om','breath','heart','mandala','elephant',
              'plant','sierpinski','infinity','fish','dna','wave'][h % 14];
    }
    if (brightness > 100) {
      return ['wave','fish','ouroboros','infinity','dna','plant','lotus','moon',
              'heart','golden','mandala','om','breath','sierpinski','hilbert',
              'elephant','sun','circuit','neural'][h % 19];
    }
    return ['maze','circuit','neural','dna','galaxy','ouroboros',
            'hilbert','bintree','sierpinski','mandala','infinity','breath'][h % 12];
  }

  function init(data) { tonalData = data; }

  function render(ctx, viewport, canvasW, canvasH) {
    if (!tonalData) return;

    const { x: vpX, y: vpY, zoom } = viewport;
    const { grid_w, grid_h, canvas_w, canvas_h, cells } = tonalData;
    const cellW = canvas_w / grid_w;
    const cellH = canvas_h / grid_h;
    const cellPx = cellW * zoom;

    const colMin = Math.max(0, Math.floor(vpX / cellW));
    const colMax = Math.min(grid_w - 1, Math.ceil((vpX + canvasW / zoom) / cellW));
    const rowMin = Math.max(0, Math.floor(vpY / cellH));
    const rowMax = Math.min(grid_h - 1, Math.ceil((vpY + canvasH / zoom) / cellH));

    for (let row = rowMin; row <= rowMax; row++) {
      for (let col = colMin; col <= colMax; col++) {
        const cell = cells[row * grid_w + col];
        if (!cell) continue;

        const [, , brightness, red, grn, blu, angle, inMask] = cell;

        let sizeFrac;
        if (inMask) {
          const t = brightness / 255;
          const curved = t <= 0.70 ? t : 0.70 + (t - 0.70) * 0.42;
          sizeFrac = 0.04 + curved * 0.88;
        } else {
          if (brightness < 40 || brightness > 220) continue;
          sizeFrac = 0.04 + (brightness / 255) * 0.18;
        }

        const sx = ((col + 0.5) * cellW - vpX) * zoom;
        const sy = ((row + 0.5) * cellH - vpY) * zoom;
        const screenR = cellPx * sizeFrac * 0.5;

        if (screenR < 0.3) continue;

        const color = `rgb(${red},${grn},${blu})`;

        // ── Portrait-colour fill ──────────────────────────────────────────────
        // Tiles perfectly, zero gaps. Fades slowly as structures establish.
        // Same colour as structures — no "two layer" visual separation.
        const fillAlpha = screenR < 4
          ? 1
          : Math.max(0, 1 - (screenR - 4) / 50);

        if (fillAlpha > 0.005) {
          const cellX = (col * cellW - vpX) * zoom;
          const cellY = (row * cellH - vpY) * zoom;
          ctx.fillStyle = fillAlpha > 0.995
            ? color
            : `rgba(${red},${grn},${blu},${fillAlpha.toFixed(3)})`;
          ctx.fillRect(cellX, cellY, cellPx + 0.5, cellPx + 0.5);
        }

        // ── Structure in portrait colour ──────────────────────────────────────
        // Same colour as the fill so the two layers are visually unified.
        // The structure provides form and texture that reveals as you zoom in.
        if (screenR < 3) continue;

        const type    = structureType(col, row, brightness, inMask, screenR);
        const seed    = cellHash(col, row);
        const depth   = Math.min(5, Math.max(0, Math.floor(Math.log(screenR / 6) / Math.log(4))));
        const opacity = Math.min(1, (screenR - 3) / 5);

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(angle);
        Structures.draw(ctx, type, screenR * 1.8, color, seed, opacity, depth);
        ctx.restore();
      }
    }
  }

  return { init, render };
})();
