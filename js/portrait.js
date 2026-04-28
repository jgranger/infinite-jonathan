// Portrait renderer — inverted halftone on dark canvas.
// Low zoom: full-cell fill gives 100% coverage so portrait reads clearly.
// Medium zoom: crossfade from filled circle → contrasting structure.
// High zoom: recursive structures at up to depth 5.
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

        // Inverted halftone: bright → large structure, dark → small (dark bg shows through)
        let sizeFrac;
        if (inMask) {
          const t = brightness / 255;
          const curved = t <= 0.70 ? t : 0.70 + (t - 0.70) * 0.42;
          sizeFrac = 0.04 + curved * 0.88;
        } else {
          if (brightness < 40 || brightness > 220) continue;
          sizeFrac = 0.04 + (brightness / 255) * 0.18;
        }

        const screenR = cellPx * sizeFrac * 0.5;
        if (screenR < 0.3) continue;

        const color = `rgb(${red},${grn},${blu})`;

        // ── Portrait-colour cell fill ─────────────────────────────────────────
        // Rectangles tile perfectly → zero dark gaps, always 100% coverage.
        // Alpha stays at 1 until screenR=4 (structures start), then fades
        // slowly over 40px so coverage is maintained during the transition.
        const fillAlpha = screenR < 4
          ? 1
          : Math.max(0, 1 - (screenR - 4) / 40);

        const cellX = (col * cellW - vpX) * zoom;
        const cellY = (row * cellH - vpY) * zoom;

        ctx.fillStyle = fillAlpha > 0.995
          ? color
          : `rgba(${red},${grn},${blu},${fillAlpha.toFixed(3)})`;
        ctx.fillRect(cellX, cellY, cellPx + 0.5, cellPx + 0.5);

        // ── Structure overlay ─────────────────────────────────────────────────
        if (screenR < 4) continue;

        const sx = ((col + 0.5) * cellW - vpX) * zoom;
        const sy = ((row + 0.5) * cellH - vpY) * zoom;

        const structAlpha = Math.min(1, (screenR - 4) / 10);
        if (structAlpha < 0.01) continue;

        const type   = structureType(col, row, brightness, inMask);
        const seed   = cellHash(col, row);
        const depth  = Math.min(5, Math.max(0, Math.floor(Math.log(screenR / 6) / Math.log(4))));
        const cf     = brightness > 128 ? 0.58 : 1.9;
        const sColor = `rgb(${Math.min(255,Math.round(red*cf))},${Math.min(255,Math.round(grn*cf))},${Math.min(255,Math.round(blu*cf))})`;

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(angle);
        Structures.draw(ctx, type, screenR * 1.8, sColor, seed, structAlpha, depth);
        ctx.restore();
      }
    }
  }

  return { init, render };
})();
