// Procedural micro-structure generators
// Each draw function renders into ctx, centered at (0,0), within radius ~size
// depth=0: draw as simple canvas paths
// depth>0: place child structures at key geometric points

const Structures = (() => {

  function lcg(seed) {
    let s = (seed ^ 0xdeadbeef) >>> 0;
    return () => {
      s = Math.imul(s, 1664525) + 1013904223 >>> 0;
      return s / 4294967296;
    };
  }

  // --- Ecology map: preferred child types per structure ---
  const ECOLOGY = {
    galaxy:    ['breath','om','wave','infinity','galaxy'],
    golden:    ['heart','lotus','breath','om','golden'],
    plant:     ['fish','wave','heart','breath','plant'],
    maze:      ['circuit','neural','hilbert','maze'],
    circuit:   ['maze','bintree','neural','hilbert','circuit'],
    dna:       ['circuit','breath','infinity','hilbert'],
    neural:    ['circuit','maze','bintree','neural'],
    lotus:     ['heart','om','golden','mandala','lotus'],
    mandala:   ['lotus','golden','heart','om','mandala'],
    elephant:  ['lotus','om','mandala','heart','golden'],
    sun:       ['heart','golden','breath','lotus','om'],
    moon:      ['wave','fish','breath','infinity','moon'],
    wave:      ['fish','ouroboros','moon','wave'],
    fish:      ['wave','ouroboros','moon','fish'],
    ouroboros: ['infinity','breath','wave','ouroboros'],
    breath:    ['om','golden','heart','lotus','breath'],
    infinity:  ['ouroboros','breath','wave','infinity'],
    heart:     ['lotus','golden','breath','heart'],
    om:        ['lotus','mandala','breath','heart','om'],
    sierpinski:['sierpinski','mandala','lotus'],
    hilbert:   ['circuit','maze','hilbert'],
    bintree:   ['neural','circuit','bintree'],
  };

  // --- Place a child structure at (x,y) relative to current transform ---
  function placeChild(ctx, x, y, parentType, size, color, seed, depth) {
    if (size < 2) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1.2, size * 0.999), 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    const eco = ECOLOGY[parentType] || ['breath'];
    const subType = eco[((seed >>> 0) % eco.length)];
    const subSeed = (seed ^ 0xdeadbeef ^ ((x * 100 + y) | 0)) >>> 0;
    ctx.save();
    ctx.translate(x, y);
    draw(ctx, subType, size, color, subSeed, 1, depth - 1);
    ctx.restore();
  }

  // --- Spiral Galaxy ---
  function galaxy(ctx, size, color, seed, depth) {
    const rng = lcg(seed);
    const arms = 2 + (rng() > 0.5 ? 1 : 0);
    const turns = 2.5 + rng() * 1.5;
    const armOffset0 = rng() * Math.PI * 2; // consume rng call for rotation

    if (depth > 0) {
      // Place children at points along arms + center
      const armPts = 6;
      const childPoints = [];
      for (let arm = 0; arm < arms; arm++) {
        const armOffset = (arm / arms) * Math.PI * 2 + armOffset0;
        for (let i = 1; i <= armPts; i++) {
          const t = i / armPts;
          const r = t * size * 0.85;
          const theta = t * turns * Math.PI * 2 + armOffset;
          const x = r * Math.cos(theta);
          const y = r * Math.sin(theta) * 0.85;
          const childSize = size * 0.24 * (1.1 - t * 0.4);
          childPoints.push([x, y, childSize]);
        }
      }
      // Center
      childPoints.push([0, 0, size * 0.14]);

      for (let i = 0; i < childPoints.length; i++) {
        const [x, y, childSize] = childPoints[i];
        placeChild(ctx, x, y, 'galaxy', childSize, color, seed ^ (i * 1337), depth);
      }
      return;
    }

    const pts = Math.max(60, Math.floor(size * 2));
    ctx.save();
    ctx.rotate(armOffset0);

    for (let arm = 0; arm < arms; arm++) {
      const armOffset = (arm / arms) * Math.PI * 2;
      ctx.beginPath();
      for (let i = 0; i <= pts; i++) {
        const t = i / pts;
        const r = t * size * 0.9;
        const theta = t * turns * Math.PI * 2 + armOffset;
        const wobble = (rng() - 0.5) * size * 0.04;
        const x = (r + wobble) * Math.cos(theta);
        const y = (r + wobble) * Math.sin(theta) * 0.85;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1.0, size * 0.042);
      ctx.globalAlpha *= 0.9;
      ctx.stroke();
      ctx.globalAlpha /= 0.9;
    }

    // Stars scattered along arms
    const starCount = Math.floor(size * 1.5);
    for (let i = 0; i < starCount; i++) {
      const arm = Math.floor(rng() * arms);
      const t = rng();
      const r = t * size * 0.9;
      const theta = t * turns * Math.PI * 2 + (arm / arms) * Math.PI * 2;
      const scatter = rng() * size * 0.12 * (1 - t * 0.5);
      const x = r * Math.cos(theta) + (rng() - 0.5) * scatter;
      const y = r * Math.sin(theta) * 0.85 + (rng() - 0.5) * scatter;
      const sr = Math.max(0.2, size * 0.008 * (1 - t * 0.6));
      ctx.beginPath();
      ctx.arc(x, y, sr, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }

    // Nucleus glow
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.12);
    grad.addColorStop(0, color);
    grad.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.restore();
  }

  // --- Golden / Fibonacci Spiral ---
  function goldenSpiral(ctx, size, color, seed, depth) {
    const rng = lcg(seed);
    const phi = (1 + Math.sqrt(5)) / 2;
    const maxAngle = Math.PI * 2 * 4.5;
    const rotation = rng() * Math.PI * 2;

    if (depth > 0) {
      // 10 points along the Fibonacci spiral
      for (let i = 0; i < 10; i++) {
        const t = i / 9;
        const angle = t * maxAngle;
        const r = (Math.pow(phi, angle / (Math.PI / 2)) - 1) /
                  (Math.pow(phi, maxAngle / (Math.PI / 2)) - 1) * size * 0.85;
        const x = r * Math.cos(angle + rotation);
        const y = r * Math.sin(angle + rotation);
        placeChild(ctx, x, y, 'golden', size * 0.22, color, seed ^ (i * 997), depth);
      }
      return;
    }

    const pts = 200;
    ctx.save();
    ctx.rotate(rotation);
    ctx.beginPath();
    for (let i = 0; i <= pts; i++) {
      const angle = (i / pts) * maxAngle;
      const r = (Math.pow(phi, angle / (Math.PI / 2)) - 1) / (Math.pow(phi, maxAngle / (Math.PI / 2)) - 1) * size * 0.9;
      const x = r * Math.cos(angle);
      const y = r * Math.sin(angle);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.0, size * 0.052);
    ctx.stroke();

    // Small squares along the spiral (Fibonacci squares hint)
    let a = 0, b = size * 0.06;
    let cx2 = 0, cy2 = 0;
    for (let i = 0; i < 6 && b < size; i++) {
      const s = b;
      ctx.strokeRect(cx2 - s * 0.5, cy2 - s * 0.5, s, s);
      [a, b] = [b, a + b];
      cx2 += s * (rng() > 0.5 ? 1 : -1) * 0.2;
    }

    ctx.restore();
  }

  // --- Plant / Tree ---
  function plant(ctx, size, color, seed, depth) {
    const rng = lcg(seed);

    if (depth > 0) {
      // Collect branch endpoints and place children there
      const endpoints = [];
      const branchDepth = Math.min(5, 3 + Math.floor(size / 15));

      function collectBranch(x, y, angle, len, bd) {
        if (bd <= 0 || len < 0.5) {
          endpoints.push([x, y]);
          return;
        }
        const x2 = x + len * Math.cos(angle);
        const y2 = y + len * Math.sin(angle);
        const spread = 0.35 + rng() * 0.25;
        const reduction = 0.62 + rng() * 0.1;
        collectBranch(x2, y2, angle - spread, len * reduction, bd - 1);
        collectBranch(x2, y2, angle + spread, len * reduction, bd - 1);
        if (rng() > 0.6) {
          collectBranch(x2, y2, angle + (rng() - 0.5) * 0.2, len * reduction * 0.7, bd - 2);
        }
      }

      collectBranch(0, size * 0.45, -Math.PI / 2, size * 0.4, branchDepth);

      for (let i = 0; i < endpoints.length; i++) {
        const [ex, ey] = endpoints[i];
        placeChild(ctx, ex - 0, ey - 0, 'plant', size * 0.25, color, seed ^ (i * 1009), depth);
      }
      return;
    }

    function branch(x, y, angle, len, bd) {
      if (bd <= 0 || len < 0.5) return;
      const x2 = x + len * Math.cos(angle);
      const y2 = y + len * Math.sin(angle);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x2, y2);
      ctx.lineWidth = Math.max(0.2, bd * size * 0.008);
      ctx.strokeStyle = color;
      ctx.stroke();

      const spread = 0.35 + rng() * 0.25;
      const reduction = 0.62 + rng() * 0.1;
      branch(x2, y2, angle - spread, len * reduction, bd - 1);
      branch(x2, y2, angle + spread, len * reduction, bd - 1);
      if (rng() > 0.6) {
        branch(x2, y2, angle + (rng() - 0.5) * 0.2, len * reduction * 0.7, bd - 2);
      }
    }

    ctx.save();
    const bd = Math.min(8, 4 + Math.floor(size / 15));
    branch(0, size * 0.45, -Math.PI / 2, size * 0.4, bd);
    ctx.restore();
  }

  // --- Maze ---
  function maze(ctx, size, color, seed, depth) {
    const rng = lcg(seed);
    const cols = Math.max(3, Math.floor(size / 8));
    const rows = cols;
    const cw = size * 1.8 / cols;
    const ch = size * 1.8 / rows;
    const ox = -size * 0.9;
    const oy = -size * 0.9;

    // Depth-first maze generation (always runs to define junctions)
    const visited = Array.from({length: rows}, () => new Array(cols).fill(false));
    const hWalls = Array.from({length: rows + 1}, () => new Array(cols).fill(true));
    const vWalls = Array.from({length: rows}, () => new Array(cols + 1).fill(true));

    function carve(r, c) {
      visited[r][c] = true;
      const dirs = [[0,1],[0,-1],[1,0],[-1,0]].sort(() => rng() - 0.5);
      for (const [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc]) {
          if (dr === 0) vWalls[r][dc > 0 ? c + 1 : c] = false;
          else hWalls[dr > 0 ? r + 1 : r][c] = false;
          carve(nr, nc);
        }
      }
    }
    carve(0, 0);

    if (depth > 0) {
      // 8-10 junction sample points
      const sampleCount = Math.min(10, rows * cols);
      const step = Math.max(1, Math.floor(rows * cols / sampleCount));
      let placed = 0;
      for (let idx = 0; idx < rows * cols && placed < sampleCount; idx += step) {
        const row = Math.floor(idx / cols);
        const col = idx % cols;
        const x = (col + 0.5) * cw + ox;
        const y = (row + 0.5) * ch + oy;
        placeChild(ctx, x, y, 'maze', size * 0.25, color, seed ^ (idx * 701), depth);
        placed++;
      }
      return;
    }

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(0.8, size * 0.042);
    ctx.lineCap = 'square';

    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (hWalls[r][c]) {
          ctx.beginPath();
          ctx.moveTo(ox + c * cw, oy + r * ch);
          ctx.lineTo(ox + (c+1) * cw, oy + r * ch);
          ctx.stroke();
        }
      }
    }
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c <= cols; c++) {
        if (vWalls[r][c]) {
          ctx.beginPath();
          ctx.moveTo(ox + c * cw, oy + r * ch);
          ctx.lineTo(ox + c * cw, oy + (r+1) * ch);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  // --- Circuit Board ---
  function circuit(ctx, size, color, seed, depth) {
    const rng = lcg(seed);
    const nodeCount = 6 + Math.floor(rng() * 5);
    const nodes = [];

    // Place nodes on a rough grid with jitter
    const grid = Math.ceil(Math.sqrt(nodeCount));
    const step = (size * 1.6) / grid;
    for (let i = 0; i < nodeCount; i++) {
      const gx = (i % grid) - grid / 2;
      const gy = Math.floor(i / grid) - grid / 2;
      nodes.push({
        x: gx * step + (rng() - 0.5) * step * 0.4,
        y: gy * step + (rng() - 0.5) * step * 0.4,
      });
    }

    if (depth > 0) {
      for (let i = 0; i < nodes.length; i++) {
        placeChild(ctx, nodes[i].x, nodes[i].y, 'circuit', size * 0.28, color, seed ^ (i * 883), depth);
      }
      return;
    }

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.0, size * 0.035);

    // Connect neighbors with right-angle traces
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = Math.abs(nodes[i].x - nodes[j].x);
        const dy = Math.abs(nodes[i].y - nodes[j].y);
        if (dx < step * 1.8 && dy < step * 1.8 && rng() > 0.3) {
          const mid = rng() > 0.5
            ? { x: nodes[j].x, y: nodes[i].y }
            : { x: nodes[i].x, y: nodes[j].y };
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(mid.x, mid.y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }
    }

    // Draw node pads
    const padR = Math.max(0.8, size * 0.025);
    for (const n of nodes) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, padR, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      if (rng() > 0.5) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, padR * 2, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(0.8, size * 0.021);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // --- DNA Helix ---
  function dna(ctx, size, color, seed, depth) {
    const rng = lcg(seed);
    const amplitude = size * 0.3;
    const period = size * 0.5;
    const rotation = rng() > 0.5 ? Math.PI / 2 : 0;

    if (depth > 0) {
      // At each rung midpoint
      const rungCount = Math.floor(size * 1.8 / (period / 4));
      for (let i = 0; i <= rungCount; i++) {
        const t = i / rungCount;
        const y = t * size * 1.8 - size * 0.9;
        // rung midpoint is at x=0
        placeChild(ctx, 0, y, 'dna', size * 0.22, color, seed ^ (i * 613), depth);
      }
      return;
    }

    const pts = 80;
    ctx.save();
    ctx.rotate(rotation);
    ctx.strokeStyle = color;

    // Strand 1
    ctx.beginPath();
    for (let i = 0; i <= pts; i++) {
      const t = i / pts;
      const y = t * size * 1.8 - size * 0.9;
      const x = Math.sin(t * Math.PI * 2 * (size / period)) * amplitude;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.lineWidth = Math.max(1.0, size * 0.042);
    ctx.stroke();

    // Strand 2
    ctx.beginPath();
    for (let i = 0; i <= pts; i++) {
      const t = i / pts;
      const y = t * size * 1.8 - size * 0.9;
      const x = -Math.sin(t * Math.PI * 2 * (size / period)) * amplitude;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Rungs
    const rungCount = Math.floor(size * 1.8 / (period / 4));
    for (let i = 0; i <= rungCount; i++) {
      const t = i / rungCount;
      const y = t * size * 1.8 - size * 0.9;
      const x = Math.sin(t * Math.PI * 2 * (size / period)) * amplitude;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(-x, y);
      ctx.lineWidth = Math.max(0.8, size * 0.025);
      ctx.stroke();
    }
    ctx.restore();
  }

  // --- Neural Network ---
  function neural(ctx, size, color, seed, depth) {
    const rng = lcg(seed);
    const layers = [3, 4, 4, 3];
    const layerNodes = [];
    const lw = size * 1.8 / (layers.length - 1);

    for (let l = 0; l < layers.length; l++) {
      const x = -size * 0.9 + l * lw;
      const nodes = [];
      for (let n = 0; n < layers[l]; n++) {
        const y = (n - (layers[l] - 1) / 2) * (size * 1.4 / (layers[l]));
        nodes.push({ x, y });
      }
      layerNodes.push(nodes);
    }

    if (depth > 0) {
      for (let l = 0; l < layerNodes.length; l++) {
        for (let n = 0; n < layerNodes[l].length; n++) {
          const node = layerNodes[l][n];
          placeChild(ctx, node.x, node.y, 'neural', size * 0.28, color, seed ^ (l * 31 + n * 97), depth);
        }
      }
      return;
    }

    ctx.save();
    ctx.strokeStyle = color;

    // Connections
    for (let l = 0; l < layers.length - 1; l++) {
      for (const a of layerNodes[l]) {
        for (const b of layerNodes[l + 1]) {
          if (rng() > 0.2) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.lineWidth = Math.max(0.15, size * 0.005);
            ctx.globalAlpha *= 0.5;
            ctx.stroke();
            ctx.globalAlpha /= 0.5;
          }
        }
      }
    }

    // Nodes
    const nr = Math.max(0.8, size * 0.04);
    for (const layer of layerNodes) {
      for (const n of layer) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, nr, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // --- Lotus Flower ---
  function lotus(ctx, size, color, seed, depth) {
    const rng = lcg(seed);
    const lw2 = Math.max(1.0, size * 0.045);
    const rotation = rng() * Math.PI * 0.25;

    const layerDefs = [
      { count: 6, r: size * 0.28, pw: size * 0.28, ph: size * 0.42, childSize: size * 0.26 },
      { count: 8, r: size * 0.55, pw: size * 0.26, ph: size * 0.38, childSize: size * 0.22 },
    ];

    if (depth > 0) {
      // Children at center of each petal, plus center
      let idx = 0;
      for (const { count, r, childSize } of layerDefs) {
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2 + rotation;
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          placeChild(ctx, x, y, 'lotus', childSize, color, seed ^ (idx * 541), depth);
          idx++;
        }
      }
      // Center
      placeChild(ctx, 0, 0, 'lotus', size * 0.24, color, seed ^ 0xf00d, depth);
      return;
    }

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lw2;
    ctx.rotate(rotation);

    for (const { count, r, pw, ph } of layerDefs) {
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        ctx.save();
        ctx.rotate(angle);
        ctx.translate(0, -r);
        ctx.beginPath();
        ctx.ellipse(0, 0, pw, ph, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
    // Center circle
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.1, 0, Math.PI * 2);
    ctx.stroke();
    // Center dot
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.04, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  // --- Mandala ---
  function mandala(ctx, size, color, seed, depth) {
    const rng = lcg(seed);
    const lw2 = Math.max(0.8, size * 0.035);
    const rings = 4;

    if (depth > 0) {
      // Spoke-ring intersections
      let idx = 0;
      for (let ring = 1; ring <= rings; ring++) {
        const r = (ring / rings) * size * 0.9;
        const spokes = ring * 6;
        for (let i = 0; i < spokes; i++) {
          const a = (i / spokes) * Math.PI * 2;
          const x = Math.cos(a) * r;
          const y = Math.sin(a) * r;
          const childSize = size * 0.22 / ring;
          placeChild(ctx, x, y, 'mandala', childSize, color, seed ^ (idx * 389), depth);
          idx++;
        }
      }
      return;
    }

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lw2;

    for (let ring = 1; ring <= rings; ring++) {
      const r = (ring / rings) * size * 0.9;
      const petals = ring * 6;
      // Outer circle
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.globalAlpha *= 0.4;
      ctx.stroke();
      ctx.globalAlpha /= 0.4;
      // Petal lines
      for (let i = 0; i < petals; i++) {
        const a = (i / petals) * Math.PI * 2;
        const inner = (ring - 1) / rings * size * 0.9;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        ctx.stroke();
        // Small arc between spokes
        if (i % 2 === 0) {
          const a2 = ((i + 1) / petals) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(0, 0, r * 0.85, a, a2);
          ctx.stroke();
        }
      }
    }
    // Center star
    const pts = 8;
    ctx.beginPath();
    for (let i = 0; i < pts * 2; i++) {
      const a = (i / (pts * 2)) * Math.PI * 2;
      const r = i % 2 === 0 ? size * 0.08 : size * 0.04;
      i === 0 ? ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r) : ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  // --- Ganesha Elephant ---
  function elephant(ctx, size, color, seed, depth) {
    const rng = lcg(seed);
    const lw2 = Math.max(1.2, size * 0.056);

    if (depth > 0) {
      // 8 key anatomical points
      const points = [
        [0,           -size * 0.22,  'forehead bindi'],
        [-size * 0.5, -size * 0.05,  'left ear tip'],
        [ size * 0.5, -size * 0.05,  'right ear tip'],
        [-size * 0.45,  size * 0.3,  'trunk end'],
        [-size * 0.28,  size * 0.48, 'left tusk tip'],
        [ size * 0.28,  size * 0.48, 'right tusk tip'],
        [-size * 0.1,  -size * 0.1,  'left eye'],
        [ size * 0.1,  -size * 0.1,  'right eye'],
      ];
      for (let i = 0; i < points.length; i++) {
        placeChild(ctx, points[i][0], points[i][1], 'elephant', size * 0.24, color, seed ^ (i * 457), depth);
      }
      return;
    }

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lw2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Head
    ctx.beginPath();
    ctx.arc(0, -size * 0.05, size * 0.32, 0, Math.PI * 2);
    ctx.stroke();

    // Left ear
    ctx.save();
    ctx.translate(-size * 0.28, -size * 0.05);
    ctx.rotate(-0.25);
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.22, size * 0.3, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Right ear
    ctx.save();
    ctx.translate(size * 0.28, -size * 0.05);
    ctx.rotate(0.25);
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.22, size * 0.3, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Trunk — curls up (auspicious)
    ctx.beginPath();
    ctx.moveTo(-size * 0.04, size * 0.22);
    ctx.bezierCurveTo(-size * 0.04, size * 0.55, -size * 0.45, size * 0.55, -size * 0.45, size * 0.3);
    ctx.bezierCurveTo(-size * 0.45, size * 0.1, -size * 0.22, size * 0.08, -size * 0.28, size * 0.12);
    ctx.stroke();

    // Left tusk
    ctx.beginPath();
    ctx.moveTo(-size * 0.1, size * 0.2);
    ctx.quadraticCurveTo(-size * 0.28, size * 0.38, -size * 0.28, size * 0.48);
    ctx.stroke();

    // Right tusk
    ctx.beginPath();
    ctx.moveTo(size * 0.1, size * 0.2);
    ctx.quadraticCurveTo(size * 0.28, size * 0.38, size * 0.28, size * 0.48);
    ctx.stroke();

    // Eyes
    ctx.beginPath();
    ctx.arc(-size * 0.1, -size * 0.1, size * 0.03, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(size * 0.1, -size * 0.1, size * 0.03, 0, Math.PI * 2);
    ctx.fill();

    // Third eye / bindi
    ctx.beginPath();
    ctx.arc(0, -size * 0.22, size * 0.025, 0, Math.PI * 2);
    ctx.fill();

    // Crown dots
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.arc(i * size * 0.08, -size * 0.38, size * 0.015, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // --- Sun ---
  function sun(ctx, size, color, seed, depth) {
    const rng = lcg(seed);
    const lw2 = Math.max(1.0, size * 0.042);
    const rotation = rng() * Math.PI / 8;
    const rayCount = 12;
    const coreR = size * 0.28;

    if (depth > 0) {
      // Tip of each of the 12 rays
      for (let i = 0; i < rayCount; i++) {
        const a = (i / rayCount) * Math.PI * 2 + rotation;
        const long = i % 2 === 0;
        const outerR = long ? size * 0.88 : size * 0.6;
        const x = Math.cos(a) * outerR;
        const y = Math.sin(a) * outerR;
        placeChild(ctx, x, y, 'sun', size * 0.22, color, seed ^ (i * 761), depth);
      }
      return;
    }

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lw2;
    ctx.rotate(rotation);

    // Core circle
    ctx.beginPath();
    ctx.arc(0, 0, coreR, 0, Math.PI * 2);
    ctx.stroke();

    // Rays — alternating long and short, slightly curved
    for (let i = 0; i < rayCount; i++) {
      const a = (i / rayCount) * Math.PI * 2;
      const long = i % 2 === 0;
      const outerR = long ? size * 0.85 : size * 0.6;
      const innerR = coreR * 1.15;
      const sweep = long ? 0.12 : 0.08;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a - sweep) * innerR, Math.sin(a - sweep) * innerR);
      ctx.quadraticCurveTo(Math.cos(a) * outerR * 0.7, Math.sin(a) * outerR * 0.7,
                           Math.cos(a) * outerR, Math.sin(a) * outerR);
      ctx.quadraticCurveTo(Math.cos(a) * outerR * 0.7, Math.sin(a) * outerR * 0.7,
                           Math.cos(a + sweep) * innerR, Math.sin(a + sweep) * innerR);
      ctx.stroke();
    }

    // Inner glow rings
    for (let r = 0.5; r < 1; r += 0.25) {
      ctx.beginPath();
      ctx.arc(0, 0, coreR * r, 0, Math.PI * 2);
      ctx.globalAlpha *= 0.3;
      ctx.stroke();
      ctx.globalAlpha /= 0.3;
    }
    ctx.restore();
  }

  // --- Moon ---
  function moon(ctx, size, color, seed, depth) {
    const rng = lcg(seed);
    const rotation = rng() * Math.PI * 0.5 - Math.PI * 0.25;
    const r = size * 0.7;

    if (depth > 0) {
      // 6 crescent points + 5 star positions
      const points = [];
      // Crescent arc points
      for (let i = 0; i < 6; i++) {
        const angle = -Math.PI * 0.75 + (i / 5) * Math.PI * 1.5;
        const cx2 = Math.cos(angle + rotation) * r;
        const cy2 = Math.sin(angle + rotation) * r;
        points.push([cx2, cy2]);
      }
      // 5 "star" positions scattered outside
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 + rotation;
        const dist = r * 1.4;
        points.push([Math.cos(angle) * dist, Math.sin(angle) * dist]);
      }
      for (let i = 0; i < points.length; i++) {
        placeChild(ctx, points[i][0], points[i][1], 'moon', size * 0.22, color, seed ^ (i * 503), depth);
      }
      return;
    }

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.0, size * 0.049);
    ctx.rotate(rotation);

    // Crescent via two arcs
    ctx.beginPath();
    ctx.arc(0, 0, r, -Math.PI * 0.75, Math.PI * 0.75);
    ctx.arc(-r * 0.4, 0, r * 0.85, Math.PI * 0.75, -Math.PI * 0.75, true);
    ctx.closePath();
    ctx.stroke();

    // Stars scattered nearby
    const starCount = 5 + Math.floor(rng() * 4);
    for (let i = 0; i < starCount; i++) {
      const angle = rng() * Math.PI * 2;
      const dist = r * (1.2 + rng() * 0.6);
      const sx = Math.cos(angle) * dist;
      const sy = Math.sin(angle) * dist;
      if (sx < r * 0.3 && Math.abs(sy) < r * 0.5) continue;
      const sr = Math.max(0.5, size * 0.015 * (0.5 + rng() * 0.5));
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
    ctx.restore();
  }

  // --- Ocean Waves ---
  function wave(ctx, size, color, seed, depth) {
    const rng = lcg(seed);
    const lw2 = Math.max(1.0, size * 0.042);
    const waveCount = 6;
    const amplitude = size * 0.12;
    const halfW = size * 0.9;

    // Pre-generate wave params so depth>0 can use same values
    const waveParams = [];
    for (let w = 0; w < waveCount; w++) {
      waveParams.push({
        y: -size * 0.7 + (w / (waveCount - 1)) * size * 1.4,
        phase: rng() * Math.PI * 2,
        freq: 1.5 + rng() * 1.5,
        amp: amplitude * (0.6 + rng() * 0.6),
      });
    }

    if (depth > 0) {
      // Crest and trough of each wave
      for (let w = 0; w < waveCount; w++) {
        const { y, phase, freq, amp } = waveParams[w];
        // Crest at t ~ 0.25, trough at t ~ 0.75
        const tCrest = 0.25, tTrough = 0.75;
        const xCrest = -halfW + tCrest * halfW * 2;
        const yCrest = y + Math.sin(tCrest * Math.PI * 2 * freq + phase) * amp;
        const xTrough = -halfW + tTrough * halfW * 2;
        const yTrough = y + Math.sin(tTrough * Math.PI * 2 * freq + phase) * amp;
        placeChild(ctx, xCrest, yCrest, 'wave', size * 0.22, color, seed ^ (w * 2 * 311), depth);
        placeChild(ctx, xTrough, yTrough, 'wave', size * 0.22, color, seed ^ (w * 2 * 311 + 1), depth);
      }
      return;
    }

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lw2;

    for (let w = 0; w < waveCount; w++) {
      const { y, phase, freq, amp } = waveParams[w];
      ctx.beginPath();
      const steps = 60;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = -halfW + t * halfW * 2;
        const yy = y + Math.sin(t * Math.PI * 2 * freq + phase) * amp
                    + Math.sin(t * Math.PI * 3.3 * freq + phase * 1.3) * amp * 0.3;
        i === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
      }
      ctx.globalAlpha *= (0.4 + (1 - w / waveCount) * 0.6);
      ctx.stroke();
      ctx.globalAlpha /= (0.4 + (1 - w / waveCount) * 0.6);
    }
    ctx.restore();
  }

  // --- Fish (Koi silhouette) ---
  function fish(ctx, size, color, seed, depth) {
    const rng = lcg(seed);
    const rotation = rng() * Math.PI * 2;
    const bw = size * 0.55;
    const bh = size * 0.3;
    const scaleCols = 4, scaleRows = 3;

    if (depth > 0) {
      // 12 scale grid positions
      let idx = 0;
      for (let row = 0; row < scaleRows; row++) {
        for (let col = 0; col < scaleCols; col++) {
          const sx = -bw * 0.4 + col * (bw * 0.35) + size * 0.08;
          const sy = -bh * 0.5 + row * (bh * 0.5) + bh * 0.1;
          placeChild(ctx, sx, sy, 'fish', size * 0.22, color, seed ^ (idx * 421), depth);
          idx++;
        }
      }
      return;
    }

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.0, size * 0.045);
    ctx.rotate(rotation);

    // Body — elongated oval
    ctx.beginPath();
    ctx.ellipse(size * 0.08, 0, bw, bh, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Tail — forked
    ctx.beginPath();
    ctx.moveTo(-bw + size * 0.08, 0);
    ctx.lineTo(-size * 0.85, -size * 0.35);
    ctx.moveTo(-bw + size * 0.08, 0);
    ctx.lineTo(-size * 0.85, size * 0.35);
    ctx.stroke();

    // Tail curve
    ctx.beginPath();
    ctx.moveTo(-size * 0.85, -size * 0.35);
    ctx.quadraticCurveTo(-size * 0.7, 0, -size * 0.85, size * 0.35);
    ctx.stroke();

    // Dorsal fin
    ctx.beginPath();
    ctx.moveTo(size * 0.1, -bh);
    ctx.quadraticCurveTo(size * 0.25, -size * 0.55, size * 0.45, -bh * 0.7);
    ctx.stroke();

    // Eye
    ctx.beginPath();
    ctx.arc(bw * 0.55, -size * 0.06, size * 0.04, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Scales — arc rows
    ctx.strokeStyle = color;
    for (let row = 0; row < scaleRows; row++) {
      for (let col = 0; col < scaleCols; col++) {
        const sx = -bw * 0.4 + col * (bw * 0.35) + size * 0.08;
        const sy = -bh * 0.5 + row * (bh * 0.5) + bh * 0.1;
        ctx.beginPath();
        ctx.arc(sx, sy, size * 0.09, 0, Math.PI);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // --- Ouroboros (snake eating its tail / endless cycle) ---
  function ouroboros(ctx, size, color, seed, depth) {
    const rng = lcg(seed);
    const lw2 = Math.max(1.2, size * 0.193);
    const rotation = rng() * Math.PI * 0.5;
    const r = size * 0.7;

    if (depth > 0) {
      // 10 evenly-spaced positions along the ring
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * (Math.PI * 2 - 0.4) + 0.3 + rotation;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        placeChild(ctx, x, y, 'ouroboros', size * 0.22, color, seed ^ (i * 997), depth);
      }
      return;
    }

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lw2;
    ctx.rotate(rotation);

    // Snake body as thick circle arc
    ctx.beginPath();
    ctx.arc(0, 0, r, 0.3, Math.PI * 2 - 0.05);
    ctx.stroke();

    // Head (slightly larger bulge)
    const headAngle = 0.15;
    const hx = Math.cos(headAngle) * r;
    const hy = Math.sin(headAngle) * r;
    ctx.beginPath();
    ctx.arc(hx, hy, lw2 * 1.4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Eye — use a darkened version of the portrait color, not a hardcoded black
    ctx.beginPath();
    const eyeR = lw2 * 0.45;
    const eyeOff = lw2 * 1.2;
    ctx.arc(hx - Math.sin(headAngle) * eyeOff, hy + Math.cos(headAngle) * eyeOff, eyeR, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fill();

    // Scale texture on body
    const scaleCount = 18;
    for (let i = 2; i < scaleCount; i++) {
      const a = (i / scaleCount) * (Math.PI * 2 - 0.4) + 0.3;
      const sx = Math.cos(a) * r;
      const sy = Math.sin(a) * r;
      const tangent = a + Math.PI / 2;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(tangent);
      ctx.beginPath();
      ctx.arc(0, 0, lw2 * 0.8, 0, Math.PI);
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(0.8, size * 0.021);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  // --- Breath (expanding ripples) ---
  function breath(ctx, size, color, seed, depth) {
    const rng = lcg(seed);

    if (depth > 0) {
      // 4 rings × 2 cardinal directions = 8 points
      const ringFracs = [0.3, 0.55, 0.75, 0.9];
      let idx = 0;
      for (const frac of ringFracs) {
        const r = frac * size;
        for (let i = 0; i < 2; i++) {
          const a = i * Math.PI; // 0 and π (left/right pair per ring)
          const x = Math.cos(a) * r;
          const y = Math.sin(a) * r;
          placeChild(ctx, x, y, 'breath', size * 0.1, color, seed ^ (idx * 179), depth);
          idx++;
        }
      }
      return;
    }

    ctx.save();
    ctx.strokeStyle = color;

    const rings = 7;
    for (let i = 1; i <= rings; i++) {
      const t = i / rings;
      const r = t * size * 0.88;
      const opacity = (1 - t) * 0.9 + 0.1;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.lineWidth = Math.max(0.2, size * 0.012 * (1 - t * 0.6));
      ctx.globalAlpha *= opacity;
      ctx.stroke();
      ctx.globalAlpha /= opacity;
    }

    // Center: small filled dot — the self
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.045, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Four cardinal breath lines (inhale/exhale cross)
    ctx.lineWidth = Math.max(0.8, size * 0.028);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * size * 0.05, Math.sin(a) * size * 0.05);
      ctx.lineTo(Math.cos(a) * size * 0.88, Math.sin(a) * size * 0.88);
      ctx.globalAlpha *= 0.25;
      ctx.stroke();
      ctx.globalAlpha /= 0.25;
    }
    ctx.restore();
  }

  // --- Infinity / Lemniscate ---
  function infinity(ctx, size, color, seed, depth) {
    const rng = lcg(seed);
    const rotation = rng() * Math.PI * 0.15 - Math.PI * 0.075;
    const a = size * 0.75;

    if (depth > 0) {
      // 10 points sampled along the lemniscate
      for (let i = 0; i < 10; i++) {
        const t = (i / 10) * Math.PI * 2;
        const scale = 1 / (1 + Math.sin(t) * Math.sin(t));
        const x = a * Math.cos(t) * scale;
        const y = a * Math.sin(t) * Math.cos(t) * scale;
        placeChild(ctx, x, y, 'infinity', size * 0.24, color, seed ^ (i * 857), depth);
      }
      return;
    }

    const steps = 200;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.0, size * 0.049);
    ctx.rotate(rotation);

    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      const scale = 1 / (1 + Math.sin(t) * Math.sin(t));
      const x = a * Math.cos(t) * scale;
      const y = a * Math.sin(t) * Math.cos(t) * scale;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Inner figure-8 echo
    ctx.lineWidth *= 0.4;
    ctx.globalAlpha *= 0.4;
    const b = size * 0.4;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      const scale = 1 / (1 + Math.sin(t) * Math.sin(t));
      const x = b * Math.cos(t) * scale;
      const y = b * Math.sin(t) * Math.cos(t) * scale;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  // --- Heart ---
  function heart(ctx, size, color, seed, depth) {
    const rng = lcg(seed);
    const rotation = rng() * Math.PI * 0.06 - Math.PI * 0.03;
    const s = size * 0.8;

    if (depth > 0) {
      // 8 points along the bezier heart curve
      // Top-left lobe, top-right lobe, sides, bottom tip
      const pts8 = [
        [-s * 0.5, -s * 0.5],  // top-left lobe center
        [ s * 0.5, -s * 0.5],  // top-right lobe center
        [-s * 0.9,  0],         // left side
        [ s * 0.9,  0],         // right side
        [-s * 0.45, s * 0.5],   // lower-left
        [ s * 0.45, s * 0.5],   // lower-right
        [0,         s * 0.9],   // bottom tip
        [0,        -s * 0.3],   // top center
      ];
      for (let i = 0; i < pts8.length; i++) {
        const [x, y] = pts8[i];
        placeChild(ctx, x, y, 'heart', size * 0.24, color, seed ^ (i * 641), depth);
      }
      return;
    }

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.0, size * 0.052);
    ctx.rotate(rotation);

    ctx.beginPath();
    ctx.moveTo(0, s * 0.3);
    ctx.bezierCurveTo( s * 0.9,  s * 0.3,  s * 0.9, -s * 0.5,  0,       -s * 0.5);
    ctx.bezierCurveTo(-s * 0.9, -s * 0.5, -s * 0.9,  s * 0.3,  0,        s * 0.3);
    // Point at bottom
    ctx.bezierCurveTo(-s * 0.45, s * 0.65, 0, s * 0.95, 0, s);
    ctx.bezierCurveTo( 0,  s * 0.95,  s * 0.45, s * 0.65, 0, s * 0.3);
    ctx.stroke();

    // Inner echo
    ctx.globalAlpha *= 0.3;
    ctx.lineWidth *= 0.5;
    const t = 0.65;
    ctx.beginPath();
    ctx.moveTo(0, s * t * 0.3);
    ctx.bezierCurveTo( s*t*0.9,  s*t*0.3,  s*t*0.9, -s*t*0.5,  0,         -s*t*0.5);
    ctx.bezierCurveTo(-s*t*0.9, -s*t*0.5, -s*t*0.9,  s*t*0.3,  0,          s*t*0.3);
    ctx.bezierCurveTo(-s*t*0.45, s*t*0.65, 0, s*t*0.95, 0, s*t);
    ctx.bezierCurveTo( 0, s*t*0.95, s*t*0.45, s*t*0.65, 0, s*t*0.3);
    ctx.stroke();
    ctx.restore();
  }

  // --- Om (ॐ) ---
  function om(ctx, size, color, seed, depth) {
    if (depth > 0) {
      // 4 radiating positions: top, bottom-left, bottom-right, top-right dot
      const omPts = [
        [0,           -size * 0.4],
        [-size * 0.3,  size * 0.3],
        [ size * 0.25, size * 0.3],
        [ size * 0.3, -size * 0.5],
      ];
      for (let i = 0; i < omPts.length; i++) {
        placeChild(ctx, omPts[i][0], omPts[i][1], 'om', size * 0.26, color, seed ^ (i * 739), depth);
      }
      return;
    }

    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Use the ॐ unicode character as the base form
    const fontSize = size * 1.5;
    ctx.font = `${fontSize}px serif`;
    ctx.globalAlpha *= 0.9;
    ctx.fillText('ॐ', 0, size * 0.05);

    // Radiating lines behind
    ctx.globalAlpha *= 0.25;
    ctx.lineWidth = Math.max(0.8, size * 0.028);
    const rays = 8;
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * size * 0.75, Math.sin(a) * size * 0.75);
      ctx.lineTo(Math.cos(a) * size * 0.95, Math.sin(a) * size * 0.95);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ============================================================
  // NEW FRACTAL STRUCTURES
  // ============================================================

  // --- Sierpiński Triangle ---
  function sierpinski(ctx, size, color, seed, depth) {
    const d = Math.min(2 + depth, 6);
    const h = size * 0.866;
    const ax = 0,        ay = -h * 0.667;
    const bx = -size * 0.5, by = h * 0.333;
    const cx =  size * 0.5, cy = h * 0.333;

    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(0.8, size * 0.028);

    function tri(ax2, ay2, bx2, by2, cx2, cy2, n) {
      if (n <= 0) {
        ctx.beginPath();
        ctx.moveTo(ax2, ay2); ctx.lineTo(bx2, by2); ctx.lineTo(cx2, cy2);
        ctx.closePath(); ctx.stroke(); return;
      }
      const mx1 = (ax2+bx2)/2, my1 = (ay2+by2)/2;
      const mx2 = (bx2+cx2)/2, my2 = (by2+cy2)/2;
      const mx3 = (ax2+cx2)/2, my3 = (ay2+cy2)/2;
      tri(ax2, ay2, mx1, my1, mx3, my3, n-1);
      tri(mx1, my1, bx2, by2, mx2, my2, n-1);
      tri(mx3, my3, mx2, my2, cx2, cy2, n-1);
    }
    tri(ax, ay, bx, by, cx, cy, d);

    // At depth>0, also place children at the three corners
    if (depth > 0) {
      const childSize = size * 0.45;
      placeChild(ctx, ax, ay, 'sierpinski', childSize, color, seed^1, depth);
      placeChild(ctx, bx, by, 'sierpinski', childSize, color, seed^2, depth);
      placeChild(ctx, cx, cy, 'sierpinski', childSize, color, seed^3, depth);
    }
  }

  // --- Hilbert Space-Filling Curve ---
  function hilbert(ctx, size, color, seed, depth) {
    const order = Math.min(2 + depth, 6);
    const s = size * 1.7;

    const pts = [];
    function curve(x, y, xi, xj, yi, yj, n) {
      if (n <= 0) { pts.push([x + (xi+yi)/2, y + (xj+yj)/2]); return; }
      curve(x,           y,           yi/2, yj/2, xi/2, xj/2, n-1);
      curve(x+xi/2,      y+xj/2,      xi/2, xj/2, yi/2, yj/2, n-1);
      curve(x+xi/2+yi/2, y+xj/2+yj/2, xi/2, xj/2, yi/2, yj/2, n-1);
      curve(x+xi-yi/2,   y+xj-yj/2,  -yi/2,-yj/2,-xi/2,-xj/2, n-1);
    }
    curve(-s/2, -s/2, s, 0, 0, s, order);

    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.0, size * 0.042);
    ctx.stroke();

    // At depth>0, place children at sampled curve points
    if (depth > 0) {
      const step = Math.max(1, Math.floor(pts.length / 8));
      for (let i = 0; i < 8; i++) {
        const pt = pts[i * step] || pts[0];
        const [px, py] = pt;
        placeChild(ctx, px, py, 'hilbert', size * 0.25, color, seed ^ (i * 997), depth);
      }
    }
  }

  // --- Binary Search Tree ---
  function bintree(ctx, size, color, seed, depth) {
    const maxLevels = Math.min(3 + depth, 6);
    const nodeR = Math.max(0.5, size * 0.035);
    const nodes = [];

    function drawNode(x, y, spread, level) {
      nodes.push([x, y, level]);
      if (level >= maxLevels) return;
      const childY = y + size * 1.6 / Math.pow(2, level + 1);
      const lx = x - spread, rx = x + spread;

      // Edges
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(lx, childY);
      ctx.moveTo(x, y); ctx.lineTo(rx, childY);
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(0.2, (maxLevels - level) * size * 0.004);
      ctx.stroke();

      drawNode(lx, childY, spread * 0.5, level + 1);
      drawNode(rx, childY, spread * 0.5, level + 1);
    }

    drawNode(0, -size * 0.7, size * 0.4, 0);

    // Draw node circles on top
    for (const [nx, ny, level] of nodes) {
      const nr = nodeR * Math.max(0.4, 1 - level * 0.12);
      ctx.beginPath();
      ctx.arc(nx, ny, nr, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }

    // At depth>0, place children at leaf nodes
    if (depth > 0) {
      const leaves = nodes.filter(([,, l]) => l >= maxLevels - 1);
      for (let i = 0; i < leaves.length; i++) {
        const [nx, ny] = leaves[i];
        placeChild(ctx, nx, ny, 'bintree', size * 0.26, color, seed ^ ((nx*7+ny*13)|0), depth);
      }
    }
  }

  // ============================================================

  const TYPES = [
    'galaxy', 'golden', 'plant', 'maze', 'circuit', 'dna', 'neural',
    'lotus', 'mandala', 'elephant', 'sun', 'moon', 'wave', 'fish',
    'ouroboros', 'breath', 'infinity', 'heart', 'om',
    'sierpinski', 'hilbert', 'bintree',
  ];

  function draw(ctx, type, size, color, seed, opacity = 1, depth = 0) {
    if (size < 2) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(1.2, size * 0.999), 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.save();
    ctx.globalAlpha *= opacity;
    switch (type) {
      case 'galaxy':     galaxy(ctx, size, color, seed, depth);       break;
      case 'golden':     goldenSpiral(ctx, size, color, seed, depth); break;
      case 'plant':      plant(ctx, size, color, seed, depth);        break;
      case 'maze':       maze(ctx, size, color, seed, depth);         break;
      case 'circuit':    circuit(ctx, size, color, seed, depth);      break;
      case 'dna':        dna(ctx, size, color, seed, depth);          break;
      case 'neural':     neural(ctx, size, color, seed, depth);       break;
      case 'lotus':      lotus(ctx, size, color, seed, depth);        break;
      case 'mandala':    mandala(ctx, size, color, seed, depth);      break;
      case 'elephant':   elephant(ctx, size, color, seed, depth);     break;
      case 'sun':        sun(ctx, size, color, seed, depth);          break;
      case 'moon':       moon(ctx, size, color, seed, depth);         break;
      case 'wave':       wave(ctx, size, color, seed, depth);         break;
      case 'fish':       fish(ctx, size, color, seed, depth);         break;
      case 'ouroboros':  ouroboros(ctx, size, color, seed, depth);    break;
      case 'breath':     breath(ctx, size, color, seed, depth);       break;
      case 'infinity':   infinity(ctx, size, color, seed, depth);     break;
      case 'heart':      heart(ctx, size, color, seed, depth);        break;
      case 'om':         om(ctx, size, color, seed, depth);           break;
      case 'sierpinski': sierpinski(ctx, size, color, seed, depth);   break;
      case 'hilbert':    hilbert(ctx, size, color, seed, depth);      break;
      case 'bintree':    bintree(ctx, size, color, seed, depth);      break;
    }
    ctx.restore();
  }

  return { draw, TYPES };
})();
