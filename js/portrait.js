// Portrait renderer — one layer only: structures in portrait colour.
// No background fills, no overlays. The structure IS the pixel.
// At small sizes dense structures (breath, mandala) read as solid coloured marks.
// Zooming reveals their form; deeper zoom reveals recursive sub-structures.
const Portrait = (() => {

  let tonalData = null;

  function cellHash(col, row) {
    let h = (col * 2654435761 ^ row * 2246822519) >>> 0;
    h ^= h >>> 16; h = Math.imul(h, 0x45d9f3b) >>> 0;
    h ^= h >>> 16;
    return h;
  }

  // Dense structure types — fill their bounding area well at small sizes.
  // Used when structures are tiny so the portrait tone reads correctly.
  const DENSE = ['breath','mandala','sierpinski','hilbert','golden','om'];

  function structureType(col, row, brightness, inMask, screenR) {
    const h = cellHash(col, row);

    // At small structure sizes, prioritise dense types so the portrait
    // colour fills the cell area without visible dark gaps.
    if (screenR < 18) {
      return DENSE[h % DENSE.length];
    }

    if (!inMask) {
      const bg = ['galaxy','moon','wave','infinity','breath','hilbert','bintree','wave','galaxy'];
      return bg[h % bg.length];
    }
    if (brightness > 160) {
      const light = [
        'lotus','sun','golden','om','breath','heart','mandala','elephant',
        'plant','sierpinski','infinity','fish','dna','wave'
      ];
      return light[h % light.length];
    }
    if (brightness > 100) {
      const mid = [
        'wave','fish','ouroboros','infinity','dna','plant','lotus','moon',
        'heart','golden','mandala','om','breath','sierpinski','hilbert',
        'elephant','sun','circuit','neural'
      ];
      return mid[h % mid.length];
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

        // Sub-pixel: 1×1 rect
        if (screenR < 1.2) {
          ctx.fillStyle = color;
          ctx.fillRect(sx, sy, 1.5, 1.5);
          continue;
        }

        // The structure IS the pixel — drawn in portrait colour, no background fill.
        // At small sizes DENSE types (breath=concentric rings, mandala, sierpinski)
        // cover their area well, so the portrait tone reads correctly.
        // At larger sizes the full variety of types reveals itself.
        // 2.2× bleed so neighbouring structures overlap, filling inter-cell gaps.
        const type    = structureType(col, row, brightness, inMask, screenR);
        const seed    = cellHash(col, row);
        const depth   = Math.min(5, Math.max(0, Math.floor(Math.log(screenR / 6) / Math.log(4))));
        const opacity = Math.min(1, (screenR - 1.2) / 3);

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(angle);
        Structures.draw(ctx, type, screenR * 2.2, color, seed, opacity, depth);
        ctx.restore();
      }
    }
  }

  return { init, render };
})();
