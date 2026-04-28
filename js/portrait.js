// Portrait renderer — light background, dark structures.
// Classic engraving logic: dark areas = large dense marks, bright areas = tiny sparse marks.
// Gaps between structure lines show warm parchment, never black.
// No tricks, no filled circles — the background IS the light.
const Portrait = (() => {

  let tonalData = null;

  function cellHash(col, row) {
    let h = (col * 2654435761 ^ row * 2246822519) >>> 0;
    h ^= h >>> 16; h = Math.imul(h, 0x45d9f3b) >>> 0;
    h ^= h >>> 16;
    return h;
  }

  function structureType(col, row, brightness, inMask) {
    const h = cellHash(col, row);
    if (!inMask) {
      const bg = ['galaxy','moon','wave','infinity','breath','hilbert','bintree','wave','galaxy'];
      return bg[h % bg.length];
    }
    if (brightness > 160) {
      // Highlights: spiritual, organic, mathematical — small delicate marks
      const light = [
        'lotus','sun','golden','om','breath','heart','mandala','elephant',
        'plant','sierpinski','infinity','fish','dna','wave'
      ];
      return light[h % light.length];
    }
    if (brightness > 100) {
      // Mid-tones: nature, cycles, life
      const mid = [
        'wave','fish','ouroboros','infinity','dna','plant','lotus','moon',
        'heart','golden','mandala','om','breath','sierpinski','hilbert',
        'elephant','sun','circuit','neural'
      ];
      return mid[h % mid.length];
    }
    // Shadows: engineered, mathematical — large bold marks
    const dark = [
      'maze','circuit','neural','dna','galaxy','ouroboros',
      'hilbert','bintree','sierpinski','mandala','infinity','breath'
    ];
    return dark[h % dark.length];
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

        // Normal halftone on light background:
        // darkness drives structure size — dark → large marks, bright → tiny marks
        let sizeFrac;
        if (inMask) {
          const t = 1 - brightness / 255; // darkness 0→1
          // Soft cap at high density so deepest shadows stay readable
          const curved = t <= 0.75 ? t : 0.75 + (t - 0.75) * 0.5;
          sizeFrac = 0.04 + curved * 0.86;
        } else {
          // Background bokeh: very sparse, only mid-dark areas
          if (brightness > 160 || brightness < 15) continue;
          sizeFrac = 0.02 + (1 - brightness / 255) * 0.10;
        }

        const sx = ((col + 0.5) * cellW - vpX) * zoom;
        const sy = ((row + 0.5) * cellH - vpY) * zoom;
        const screenR = cellPx * sizeFrac * 0.5;

        if (screenR < 0.3) continue;

        // Darken portrait color → dark ink on light parchment
        // Factor 0.28 keeps warm skin tones as warm dark brown, jacket as near-black
        const structColor = `rgb(${Math.round(red*0.28)},${Math.round(grn*0.28)},${Math.round(blu*0.28)})`;

        if (screenR < 1.2) {
          ctx.fillStyle = structColor;
          ctx.fillRect(sx, sy, 1.5, 1.5);
          continue;
        }

        if (screenR < 4) {
          ctx.beginPath();
          ctx.arc(sx, sy, screenR, 0, Math.PI * 2);
          ctx.fillStyle = structColor;
          ctx.fill();
          continue;
        }

        const type    = structureType(col, row, brightness, inMask);
        const seed    = cellHash(col, row);
        const depth   = Math.min(5, Math.max(0, Math.floor(Math.log(screenR / 6) / Math.log(4))));
        const opacity = Math.min(1, (screenR - 4) / 8);

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(angle);
        Structures.draw(ctx, type, screenR * 1.6, structColor, seed, opacity, depth);
        ctx.restore();
      }
    }
  }

  return { init, render };
})();
