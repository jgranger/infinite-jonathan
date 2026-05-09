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
  const MAX_SCREEN = 40;    // structures up to 40px — identifiable at zoom 3–4×

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

  // Pick from a type list with local diversity: within every TILE×TILE block
  // of cells all types appear roughly once before repeating, preventing clusters.
  // Different tiles get different shuffles so there's no global pattern.
  function pickType(types, gx, gy, tileKey) {
    const TILE = 5;
    const tx = Math.floor(gx / TILE);
    const ty = Math.floor(gy / TILE);
    const cx = ((gx % TILE) + TILE) % TILE;
    const cy = ((gy % TILE) + TILE) % TILE;

    // Seeded Fisher-Yates shuffle for this tile
    const arr = types.slice();
    let s = ((tx * 374761393) ^ (ty * 668265263) ^ (tileKey * 2246822519)) >>> 0;
    for (let i = arr.length - 1; i > 0; i--) {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      const j = s % (i + 1);
      const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }

    return arr[(cx + cy * TILE) % arr.length];
  }

  // ── Theme library ──────────────────────────────────────────────────────────
  // To add themes to any area: just append type names to the relevant array.
  // 'universal' is blended into every region automatically.
  const THEMES = {
    universal: [
      // Space — appears everywhere
      'galaxy','nebula','planet','moon','sun',
      // Health — appears everywhere
      'heartbeat','breath',
    ],
    head: [
      // CS / systems / computation
      'code_lines','metrics','neural','circuit','queue','stack',
      'graph','linked_list','hash_table','hilbert','bintree',
      'sierpinski','maze',
      // Creativity / intellect
      'music','golden','mandala',
    ],
    eyes: [
      // TBD — exploring themes. Placeholder: wonder, perception, depth
      'mandala','golden','galaxy','lotus','breath',
    ],
    heart: [
      // Love, family, friends, gratitude
      'heart','lotus','mandala','music','breath','golden',
      // Nature, animals, life
      'dog','cat','bird','fish','wave','plant','moon',
      // Warmth, nourishment
      'coffee',
    ],
    shoulders: [
      // Heavy lifting — most weight-focused area
      'barbell','barbell','dumbbell','dumbbell',
      // Strength, endurance
      'heartbeat','wave','sun','yoga',
    ],
    arms: [
      // Strength, movement, action
      'barbell','dumbbell','yoga',
      // Nature / flow (arms in motion)
      'wave','bird','fish','plant',
    ],
    hands: [
      // Craft, creation, touch, mastery
      'keyboard','paintbrush','music','code_lines','golden',
      // Art, sensitivity, connection
      'heart','lotus','mandala','coffee',
      // Precision
      'circuit','maze',
    ],
    belly: [
      // Breath, comfort, nourishment
      'breath','mandala','lotus','wave',
      'coffee','heart','golden','plant','fish',
    ],
  };

  // Merge a region's themes with universal ones
  function themesFor(region) {
    return [...(THEMES[region] || THEMES.heart), ...THEMES.universal];
  }

  // ── Region detection ───────────────────────────────────────────────────────
  // Returns the body region name for a normalised portrait position (nx, ny).
  // Coordinates: nx 0=left 1=right, ny 0=top 1=bottom.
  // Tune the numbers here as the portrait mapping becomes clearer.
  function detectRegion(nx, ny) {
    // Head (top ~40%)
    if (ny < 0.40) {
      // Eyes: lower head, horizontally centered
      if (ny > 0.20 && ny < 0.36 && nx > 0.36 && nx < 0.64) return 'eyes';
      return 'head';
    }
    // Shoulders: upper sides
    if (ny < 0.52 && (nx < 0.28 || nx > 0.72)) return 'shoulders';
    // Arms: mid sides
    if (ny > 0.40 && ny < 0.72 && (nx < 0.28 || nx > 0.72)) return 'arms';
    // Hands: lower sides / extremities
    if (ny > 0.68 && (nx < 0.38 || nx > 0.62)) return 'hands';
    // Heart / chest: center upper-mid
    if (ny > 0.38 && ny < 0.62 && nx > 0.32 && nx < 0.68) return 'heart';
    // Belly: lower center
    if (ny > 0.58 && nx > 0.32 && nx < 0.68) return 'belly';
    // Default: heart themes (covers unspecified torso area)
    return 'heart';
  }

  function structureType(gx, gy, octave, brightness, wx, wy) {
    const nx = td ? wx / td.canvas_w : 0.5;
    const ny = td ? wy / td.canvas_h : 0.5;

    // Bright bokeh → space objects, one consistent type per bubble
    if (brightness > 215) {
      const t = ['galaxy','nebula','planet','moon','sun'];
      const bubbleId = ((Math.floor(gx / 8) * 997) ^ (Math.floor(gy / 8) * 613)) >>> 0;
      return t[bubbleId % t.length];
    }

    const region = detectRegion(nx, ny);
    return pickType(themesFor(region), gx, gy, octave);
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
    // ceil excludes octaves whose cells would be larger than MAX_SCREEN
    const L_min = Math.max(1, Math.ceil(Math.log(BASE * zoom / MAX_SCREEN) / logR));
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
          const type    = structureType(gx, gy, L, brightness, wx, wy);
          const opacity = Math.min(1, (structR - 4) / 8);
          Structures.draw(ctx, type, structR * 1.6, color, seed, opacity, 0);
        }
      }
    }

    // ── Zoom-reveal pass ────────────────────────────────────────────────────
    // Each octave level uses a fixed grid that grows with zoom. Every octave
    // appears when its cells hit REVEAL_MIN screen size, then keeps growing.
    // As you zoom in: coarser octave structures get larger, finer octave
    // structures appear at the same "entry" size — exactly like flying through
    // space where distant objects grow and new tiny ones emerge behind them.
    const REVEAL_BASE  = 8;   // world-px of coarsest reveal cell (BASE/4 = finer grid)
    const REVEAL_MIN   = 20;  // screen px at which a cell first fades in (~dot size)
    const REVEAL_RATIO = 2;   // each level is 2× finer — clean doublings

    // L_max: deepest level whose cells could possibly be visible at this zoom.
    // REVEAL_BASE / RATIO^L * zoom >= REVEAL_MIN  →  L <= log(REVEAL_BASE*zoom/REVEAL_MIN)/log(RATIO)
    const L_max_reveal = Math.ceil(Math.log(REVEAL_BASE * zoom / REVEAL_MIN) / Math.log(REVEAL_RATIO));

    for (let L = 0; L <= L_max_reveal; L++) {
      const revealWS = REVEAL_BASE / Math.pow(REVEAL_RATIO, L);
      const revealSS = revealWS * zoom;
      if (revealSS < REVEAL_MIN) continue;

      const opacity = Math.min(1, (revealSS - REVEAL_MIN) / REVEAL_MIN);

      const rx0 = Math.floor(vpX / revealWS) - 1;
      const ry0 = Math.floor(vpY / revealWS) - 1;
      const rx1 = Math.ceil((vpX + canvasW / zoom) / revealWS) + 1;
      const ry1 = Math.ceil((vpY + canvasH / zoom) / revealWS) + 1;

      for (let ry = ry0; ry <= ry1; ry++) {
        for (let rx = rx0; rx <= rx1; rx++) {
          const wx = (rx + 0.5) * revealWS;
          const wy = (ry + 0.5) * revealWS;

          const s = sample(wx, wy);
          if (!s) continue;

          const [r, g, b, brightness, angle] = s;
          if (brightness < 20) continue;

          const t        = brightness / 255;
          const curved   = t <= 0.70 ? t : 0.70 + (t - 0.70) * 0.42;
          const sizeFrac = 0.04 + curved * 0.88;
          const structR  = revealSS * sizeFrac * 0.5;
          if (structR < 4) continue;

          const sx    = (wx - vpX) * zoom;
          const sy    = (wy - vpY) * zoom;
          const color = `rgb(${r},${g},${b})`;
          const seed  = ((rx * 2654435761) ^ (ry * 2246822519) ^ (L * 1234567)) >>> 0;
          const type  = structureType(rx, ry, L, brightness, wx, wy);

          ctx.save();
          ctx.translate(sx, sy);
          ctx.rotate(angle);
          Structures.draw(ctx, type, structR * 1.6, color, seed, opacity, 0);
          ctx.restore();
        }
      }
    }
  }

  return { init, render };
})();
