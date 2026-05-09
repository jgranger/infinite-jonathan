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
    galaxy:    ['nebula','planet','galaxy','breath','golden'],
    golden:    ['heart','lotus','breath','mandala','golden'],
    plant:     ['fish','wave','heart','breath','plant'],
    maze:      ['circuit','neural','hilbert','code_lines','maze'],
    circuit:   ['maze','bintree','neural','hilbert','code_lines'],
    neural:    ['circuit','maze','bintree','metrics','neural'],
    lotus:     ['heart','mandala','golden','breath','lotus'],
    mandala:   ['lotus','golden','heart','breath','mandala'],
    sun:       ['heart','golden','breath','lotus','nebula'],
    moon:      ['wave','fish','breath','planet','moon'],
    wave:      ['fish','moon','breath','wave'],
    fish:      ['wave','moon','fish'],
    breath:    ['mandala','golden','heart','lotus','breath'],
    heart:     ['lotus','golden','breath','heartbeat','heart'],
    sierpinski:['sierpinski','mandala','circuit','code_lines'],
    hilbert:   ['circuit','maze','hilbert','code_lines'],
    bintree:   ['neural','circuit','bintree','metrics'],
    queue:      ['stack','linked_list','circuit','bintree'],
    stack:      ['queue','linked_list','bintree','circuit'],
    graph:      ['neural','circuit','linked_list','graph'],
    linked_list:['queue','stack','bintree','linked_list'],
    hash_table: ['circuit','bintree','linked_list','hash_table'],
    barbell:   ['barbell','dumbbell','heartbeat','metrics','wave'],
    dumbbell:  ['barbell','dumbbell','heartbeat','wave'],
    keyboard:  ['code_lines','circuit','metrics','linked_list','keyboard'],
    paintbrush:['music','golden','mandala','lotus','paintbrush'],
    yoga:      ['breath','mandala','lotus','heartbeat','yoga'],
    dog:       ['dog','cat','bird','fish'],
    cat:       ['cat','dog','bird'],
    bird:      ['bird','fish','wave','moon'],
    planet:    ['nebula','galaxy','planet'],
    nebula:    ['galaxy','planet','breath','nebula'],
    heartbeat: ['heartbeat','breath','metrics','heart'],
    code_lines:['metrics','code_lines','circuit','neural','hilbert'],
    metrics:   ['code_lines','metrics','circuit','neural'],
    music:     ['music','wave','breath','mandala','golden'],
    coffee:    ['coffee','music','mandala','lotus'],
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
    const cols = Math.max(3, Math.min(16, Math.floor(size / 8)));
    const rows = cols;
    const cw = size * 1.8 / cols;
    const ch = size * 1.8 / rows;
    const ox = -size * 0.9;
    const oy = -size * 0.9;

    const visited = Array.from({length: rows}, () => new Array(cols).fill(false));
    const hWalls = Array.from({length: rows + 1}, () => new Array(cols).fill(true));
    const vWalls = Array.from({length: rows}, () => new Array(cols + 1).fill(true));

    // Iterative depth-first maze generation — avoids stack overflow at large sizes
    const stack = [[0, 0]];
    visited[0][0] = true;
    while (stack.length > 0) {
      const [r, c] = stack[stack.length - 1];
      const dirs = [[0,1],[0,-1],[1,0],[-1,0]].sort(() => rng() - 0.5);
      let moved = false;
      for (const [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc]) {
          if (dr === 0) vWalls[r][dc > 0 ? c + 1 : c] = false;
          else hWalls[dr > 0 ? r + 1 : r][c] = false;
          visited[nr][nc] = true;
          stack.push([nr, nc]);
          moved = true;
          break;
        }
      }
      if (!moved) stack.pop();
    }

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
  // STRENGTH / HANDS / CRAFT STRUCTURES
  // ============================================================

  // --- Dumbbell (single fixed weight, for shoulders) ---
  function dumbbell(ctx, size, color, seed) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';

    // Handle
    ctx.lineWidth = Math.max(1, size * 0.06);
    ctx.beginPath();
    ctx.moveTo(-size * 0.42, 0);
    ctx.lineTo(size * 0.42, 0);
    ctx.stroke();

    // Weight heads (rounded cylinders) each side
    for (const s of [-1, 1]) {
      const cx = s * size * 0.52;
      ctx.lineWidth = Math.max(1, size * 0.04);
      ctx.beginPath();
      ctx.ellipse(cx, 0, size * 0.16, size * 0.38, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Inner detail line
      ctx.beginPath();
      ctx.ellipse(cx, 0, size * 0.1, size * 0.28, 0, 0, Math.PI * 2);
      ctx.lineWidth = Math.max(0.5, size * 0.02);
      ctx.globalAlpha *= 0.4;
      ctx.stroke();
      ctx.globalAlpha /= 0.4;
    }
    ctx.restore();
  }

  // --- Keyboard ---
  function keyboard(ctx, size, color, seed) {
    const rng = lcg(seed);
    const rows = 4, cols = 11;
    const kw = size * 1.7 / cols, kh = size * 0.9 / rows, gap = size * 0.025;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(0.5, size * 0.028);

    // Body outline
    ctx.beginPath();
    ctx.roundRect(-size * 0.88, -size * 0.48, size * 1.76, size * 0.96, size * 0.05);
    ctx.stroke();

    // Keys
    for (let r = 0; r < rows; r++) {
      const rowOffset = r * size * 0.04; // slight stagger per row
      const keysInRow = r === rows - 1 ? 5 : cols - r;
      for (let c = 0; c < keysInRow; c++) {
        const x = -size * 0.82 + rowOffset + c * (kw + gap);
        const y = -size * 0.38 + r * (kh + gap);
        const w = r === rows - 1 && c === 2 ? kw * 4 : kw; // spacebar
        ctx.beginPath();
        ctx.roundRect(x, y, w, kh, size * 0.015);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // --- Paintbrush ---
  function paintbrush(ctx, size, color, seed) {
    const rng = lcg(seed);
    const angle = rng() * Math.PI * 0.25 - Math.PI * 0.125;
    ctx.save();
    ctx.rotate(angle);
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';

    // Handle (long, tapered)
    ctx.lineWidth = Math.max(1.5, size * 0.055);
    ctx.beginPath();
    ctx.moveTo(0, size * 0.8);
    ctx.lineTo(0, size * 0.1);
    ctx.stroke();

    // Ferrule (metal band)
    ctx.lineWidth = Math.max(1, size * 0.08);
    ctx.beginPath();
    ctx.moveTo(-size * 0.08, size * 0.1);
    ctx.lineTo(size * 0.08, size * 0.1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-size * 0.08, size * 0.0);
    ctx.lineTo(size * 0.08, size * 0.0);
    ctx.stroke();

    // Bristles (tapered to a point)
    ctx.lineWidth = Math.max(1, size * 0.04);
    ctx.beginPath();
    ctx.moveTo(-size * 0.08, size * 0.0);
    ctx.bezierCurveTo(-size * 0.1, -size * 0.3, -size * 0.04, -size * 0.55, 0, -size * 0.75);
    ctx.bezierCurveTo(size * 0.04, -size * 0.55, size * 0.1, -size * 0.3, size * 0.08, size * 0.0);
    ctx.closePath();
    ctx.stroke();

    // Bristle texture lines
    ctx.lineWidth = Math.max(0.4, size * 0.015);
    ctx.globalAlpha *= 0.4;
    for (let i = 1; i < 4; i++) {
      const t = i / 4;
      ctx.beginPath();
      ctx.moveTo(-size * 0.06 * (1 - t), -size * 0.2 * t);
      ctx.lineTo(-size * 0.02 * (1 - t), -size * 0.6 * t - size * 0.1);
      ctx.stroke();
    }
    ctx.globalAlpha /= 0.4;
    ctx.restore();
  }

  // ============================================================
  // COMPUTER SCIENCE STRUCTURES
  // ============================================================

  // --- Queue (FIFO) ---
  function queue(ctx, size, color, seed) {
    const n = 5;
    const bw = size * 0.3, bh = size * 0.28, gap = size * 0.05;
    const totalW = n * bw + (n - 1) * gap;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, size * 0.038);
    ctx.lineCap = 'round';

    for (let i = 0; i < n; i++) {
      const x = -totalW / 2 + i * (bw + gap);
      ctx.beginPath();
      ctx.rect(x, -bh / 2, bw, bh);
      ctx.stroke();
      if (i < 3) {
        ctx.globalAlpha *= 0.18;
        ctx.fillStyle = color;
        ctx.fillRect(x + size * 0.02, -bh / 2 + size * 0.02, bw - size * 0.04, bh - size * 0.04);
        ctx.globalAlpha /= 0.18;
      }
    }

    // Dequeue arrow (left)
    const lx = -totalW / 2 - size * 0.18;
    ctx.beginPath();
    ctx.moveTo(lx, 0); ctx.lineTo(-totalW / 2 - size * 0.01, 0);
    ctx.moveTo(lx + size * 0.09, -size * 0.07); ctx.lineTo(lx, 0); ctx.lineTo(lx + size * 0.09, size * 0.07);
    ctx.stroke();

    // Enqueue arrow (right)
    const rx = totalW / 2 + size * 0.18;
    ctx.beginPath();
    ctx.moveTo(totalW / 2 + size * 0.01, 0); ctx.lineTo(rx, 0);
    ctx.moveTo(rx - size * 0.09, -size * 0.07); ctx.lineTo(rx, 0); ctx.lineTo(rx - size * 0.09, size * 0.07);
    ctx.stroke();
    ctx.restore();
  }

  // --- Stack (LIFO) ---
  function stack(ctx, size, color, seed) {
    const n = 5, bw = size * 1.1, bh = size * 0.25, gap = size * 0.03;
    const totalH = n * (bh + gap);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, size * 0.038);
    ctx.lineCap = 'round';

    for (let i = 0; i < n; i++) {
      const y = totalH / 2 - (i + 1) * (bh + gap);
      ctx.beginPath();
      ctx.rect(-bw / 2, y, bw, bh);
      ctx.stroke();
      if (i < 3) {
        ctx.globalAlpha *= 0.18;
        ctx.fillStyle = color;
        ctx.fillRect(-bw / 2 + size * 0.02, y + size * 0.02, bw - size * 0.04, bh - size * 0.04);
        ctx.globalAlpha /= 0.18;
      }
    }

    // TOP pointer arrow
    const topY = totalH / 2 - n * (bh + gap);
    ctx.beginPath();
    ctx.moveTo(bw / 2 + size * 0.22, topY + bh * 0.5);
    ctx.lineTo(bw / 2 + size * 0.04, topY + bh * 0.5);
    ctx.moveTo(bw / 2 + size * 0.12, topY + bh * 0.5 - size * 0.07);
    ctx.lineTo(bw / 2 + size * 0.04, topY + bh * 0.5);
    ctx.lineTo(bw / 2 + size * 0.12, topY + bh * 0.5 + size * 0.07);
    ctx.stroke();
    ctx.restore();
  }

  // --- Graph (directed) ---
  function graph(ctx, size, color, seed) {
    const rng = lcg(seed);
    const nodeCount = 6;
    const nodes = [];
    for (let i = 0; i < nodeCount - 1; i++) {
      const a = (i / (nodeCount - 1)) * Math.PI * 2 + rng() * 0.3;
      const r = size * (0.42 + rng() * 0.35);
      nodes.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
    }
    nodes.push({ x: 0, y: 0 }); // center

    const nr = Math.max(1, size * 0.07);
    ctx.save();
    ctx.strokeStyle = color;

    // Edges
    ctx.lineWidth = Math.max(0.8, size * 0.028);
    for (let i = 0; i < nodes.length; i++) {
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        const dx = nodes[j].x - nodes[i].x, dy = nodes[j].y - nodes[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > size * 0.75 || rng() > 0.38) continue;
        const ux = dx / dist, uy = dy / dist;
        const ax = nodes[i].x + ux * nr, ay = nodes[i].y + uy * nr;
        const bx = nodes[j].x - ux * nr * 1.4, by = nodes[j].y - uy * nr * 1.4;
        ctx.beginPath();
        ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
        ctx.stroke();
        // Arrowhead
        const as = size * 0.065;
        ctx.beginPath();
        ctx.moveTo(bx - ux * as - uy * as * 0.5, by - uy * as + ux * as * 0.5);
        ctx.lineTo(bx, by);
        ctx.lineTo(bx - ux * as + uy * as * 0.5, by - uy * as - ux * as * 0.5);
        ctx.stroke();
      }
    }

    // Nodes
    ctx.lineWidth = Math.max(1, size * 0.038);
    for (const { x, y } of nodes) {
      ctx.beginPath(); ctx.arc(x, y, nr, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  // --- Linked list ---
  function linked_list(ctx, size, color, seed) {
    const n = 4;
    const bw = size * 0.42, bh = size * 0.3, arrowGap = size * 0.18;
    const totalW = n * bw + (n - 1) * arrowGap;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, size * 0.038);
    ctx.lineCap = 'round';

    for (let i = 0; i < n; i++) {
      const x = -totalW / 2 + i * (bw + arrowGap);
      // Box
      ctx.beginPath(); ctx.rect(x, -bh / 2, bw, bh); ctx.stroke();
      // Divider (data | ptr)
      const divX = x + bw * 0.6;
      ctx.beginPath(); ctx.moveTo(divX, -bh / 2); ctx.lineTo(divX, bh / 2); ctx.stroke();
      // Pointer dot
      const ptX = divX + (bw * 0.4) / 2;
      ctx.beginPath(); ctx.arc(ptX, 0, size * 0.033, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();

      if (i < n - 1) {
        // Arrow to next
        const nextX = -totalW / 2 + (i + 1) * (bw + arrowGap);
        ctx.beginPath();
        ctx.moveTo(ptX, 0); ctx.lineTo(nextX - size * 0.04, 0);
        ctx.moveTo(nextX - size * 0.09, -size * 0.05);
        ctx.lineTo(nextX, 0);
        ctx.lineTo(nextX - size * 0.09, size * 0.05);
        ctx.stroke();
      } else {
        // Null terminator
        ctx.beginPath();
        ctx.moveTo(divX + size * 0.05, -bh / 2 + size * 0.04);
        ctx.lineTo(x + bw - size * 0.05, bh / 2 - size * 0.04);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // --- Hash table ---
  function hash_table(ctx, size, color, seed) {
    const rng = lcg(seed);
    const buckets = 6;
    const bw = size * 0.7, bh = size * 0.22, gap = size * 0.05;
    const totalH = buckets * (bh + gap);
    ctx.save();
    ctx.strokeStyle = color;

    for (let i = 0; i < buckets; i++) {
      const y = -totalH / 2 + i * (bh + gap);
      ctx.lineWidth = Math.max(1, size * 0.035);
      ctx.beginPath(); ctx.rect(-bw / 2, y, bw, bh); ctx.stroke();

      // Index tick
      ctx.lineWidth = Math.max(0.5, size * 0.02);
      ctx.globalAlpha *= 0.45;
      ctx.beginPath();
      ctx.moveTo(-bw / 2 - size * 0.08, y + bh / 2);
      ctx.lineTo(-bw / 2, y + bh / 2);
      ctx.stroke();
      ctx.globalAlpha /= 0.45;

      // Filled entry
      if (rng() > 0.3) {
        ctx.globalAlpha *= 0.2;
        ctx.fillStyle = color;
        ctx.fillRect(-bw / 2 + size * 0.02, y + size * 0.02, bw - size * 0.04, bh - size * 0.04);
        ctx.globalAlpha /= 0.2;

        // Collision chain
        if (rng() > 0.55) {
          ctx.lineWidth = Math.max(0.8, size * 0.03);
          const chainX = bw / 2 + size * 0.06;
          ctx.beginPath();
          ctx.moveTo(bw / 2, y + bh / 2);
          ctx.lineTo(chainX + size * 0.02, y + bh / 2);
          ctx.rect(chainX, y, bw * 0.65, bh);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  // ============================================================
  // PERSONAL STRUCTURES
  // ============================================================

  // --- Barbell ---
  function barbell(ctx, size, color, seed) {
    const barLen = size * 0.88;
    const plateH = size * 0.38;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';

    // Bar
    ctx.beginPath();
    ctx.moveTo(-barLen, 0);
    ctx.lineTo(barLen, 0);
    ctx.lineWidth = Math.max(1, size * 0.045);
    ctx.stroke();

    // Plates each side
    for (const side of [-1, 1]) {
      const px = side * barLen * 0.78;
      const plateSizes = [plateH, plateH * 0.82, plateH * 0.62];
      const plateWidths = [size * 0.09, size * 0.07, size * 0.055];
      let offset = 0;
      for (let p = 0; p < 3; p++) {
        ctx.beginPath();
        ctx.ellipse(px + side * offset, 0, plateWidths[p], plateSizes[p], 0, 0, Math.PI * 2);
        ctx.lineWidth = Math.max(0.8, size * 0.03);
        ctx.stroke();
        offset += plateWidths[p] * 1.6;
      }
      // Collar
      ctx.beginPath();
      ctx.rect(px - side * size * 0.04, -size * 0.09, side * size * 0.06, size * 0.18);
      ctx.lineWidth = Math.max(0.8, size * 0.025);
      ctx.stroke();
    }
    ctx.restore();
  }

  // --- Yoga pose ---
  function yoga(ctx, size, color, seed) {
    const rng = lcg(seed);
    const pose = (seed >>> 0) % 3;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, size * 0.048);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const h = size * 0.9;

    if (pose === 0) {
      // Tree pose
      ctx.beginPath(); ctx.arc(0, -h * 0.41, h * 0.085, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -h * 0.32); ctx.lineTo(0, h * 0.1); ctx.stroke();
      // Arms overhead forming arch
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.18);
      ctx.bezierCurveTo(-h * 0.25, -h * 0.42, -h * 0.18, -h * 0.58, 0, -h * 0.62);
      ctx.bezierCurveTo(h * 0.18, -h * 0.58, h * 0.25, -h * 0.42, 0, -h * 0.18);
      ctx.stroke();
      // Standing leg
      ctx.beginPath(); ctx.moveTo(0, h * 0.1); ctx.lineTo(0, h * 0.5); ctx.stroke();
      // Bent leg
      ctx.beginPath(); ctx.moveTo(0, h * 0.18); ctx.lineTo(-h * 0.22, h * 0.14); ctx.stroke();

    } else if (pose === 1) {
      // Warrior I
      ctx.beginPath(); ctx.arc(0, -h * 0.44, h * 0.085, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -h * 0.35); ctx.lineTo(0, h * 0.06); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.22);
      ctx.lineTo(-h * 0.28, -h * 0.52);
      ctx.moveTo(0, -h * 0.22);
      ctx.lineTo(h * 0.28, -h * 0.52);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, h * 0.06);
      ctx.lineTo(-h * 0.32, h * 0.5);
      ctx.moveTo(0, h * 0.06);
      ctx.lineTo(h * 0.22, h * 0.5);
      ctx.stroke();

    } else {
      // Seated meditation
      ctx.beginPath(); ctx.arc(0, -h * 0.3, h * 0.085, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -h * 0.22); ctx.lineTo(0, h * 0.06); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-h * 0.3, h * 0.38);
      ctx.quadraticCurveTo(-h * 0.18, h * 0.06, 0, h * 0.38);
      ctx.quadraticCurveTo(h * 0.18, h * 0.06, h * 0.3, h * 0.38);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.08);
      ctx.lineTo(-h * 0.28, h * 0.22);
      ctx.moveTo(0, -h * 0.08);
      ctx.lineTo(h * 0.28, h * 0.22);
      ctx.stroke();
    }
    ctx.restore();
  }

  // --- Dog ---
  function dog(ctx, size, color, seed) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, size * 0.045);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Body
    ctx.beginPath();
    ctx.ellipse(0, size * 0.05, size * 0.42, size * 0.22, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Head
    const hx = size * 0.42;
    ctx.beginPath();
    ctx.arc(hx, -size * 0.1, size * 0.2, 0, Math.PI * 2);
    ctx.stroke();

    // Snout
    ctx.beginPath();
    ctx.ellipse(hx + size * 0.2, -size * 0.06, size * 0.12, size * 0.09, 0.15, 0, Math.PI * 2);
    ctx.stroke();

    // Eye
    ctx.beginPath();
    ctx.arc(hx + size * 0.07, -size * 0.18, size * 0.035, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill();

    // Floppy ear
    ctx.beginPath();
    ctx.moveTo(hx - size * 0.06, -size * 0.28);
    ctx.quadraticCurveTo(hx - size * 0.24, -size * 0.12, hx - size * 0.16, size * 0.1);
    ctx.stroke();

    // Tail (wagging up)
    ctx.beginPath();
    ctx.moveTo(-size * 0.42, -size * 0.0);
    ctx.bezierCurveTo(-size * 0.62, -size * 0.3, -size * 0.55, -size * 0.58, -size * 0.42, -size * 0.62);
    ctx.stroke();

    // Legs
    for (const [lx, off] of [[-size*0.22, 0], [-size*0.04, 0.04], [size*0.12, 0], [size*0.28, 0.04]]) {
      ctx.beginPath();
      ctx.moveTo(lx, size * 0.25);
      ctx.lineTo(lx + off * size, size * 0.55);
      ctx.stroke();
    }
    ctx.restore();
  }

  // --- Cat (sitting) ---
  function cat(ctx, size, color, seed) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, size * 0.042);
    ctx.lineCap = 'round';

    // Body
    ctx.beginPath();
    ctx.ellipse(0, size * 0.22, size * 0.3, size * 0.4, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Head
    ctx.beginPath();
    ctx.arc(0, -size * 0.28, size * 0.24, 0, Math.PI * 2);
    ctx.stroke();

    // Ears
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * size * 0.1, -size * 0.48);
      ctx.lineTo(s * size * 0.28, -size * 0.74);
      ctx.lineTo(s * size * 0.02, -size * 0.5);
      ctx.stroke();
    }

    // Eyes
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(s * size * 0.1, -size * 0.3, size * 0.045, size * 0.065, 0, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
    }

    // Nose
    ctx.beginPath();
    ctx.arc(0, -size * 0.2, size * 0.03, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill();

    // Whiskers
    ctx.lineWidth = Math.max(0.4, size * 0.018);
    for (const s of [-1, 1]) {
      for (const a of [-0.18, 0, 0.18]) {
        ctx.beginPath();
        ctx.moveTo(s * size * 0.04, -size * 0.19);
        ctx.lineTo(s * size * 0.42, -size * 0.19 + a * size);
        ctx.stroke();
      }
    }

    // Tail
    ctx.lineWidth = Math.max(1, size * 0.042);
    ctx.beginPath();
    ctx.moveTo(size * 0.28, size * 0.42);
    ctx.bezierCurveTo(size * 0.58, size * 0.65, size * 0.62, size * 0.1, size * 0.22, -size * 0.04);
    ctx.stroke();
    ctx.restore();
  }

  // --- Bird in flight ---
  function bird(ctx, size, color, seed) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, size * 0.042);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Body
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.28, size * 0.1, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Head
    ctx.beginPath();
    ctx.arc(size * 0.3, -size * 0.06, size * 0.1, 0, Math.PI * 2);
    ctx.stroke();

    // Beak
    ctx.beginPath();
    ctx.moveTo(size * 0.38, -size * 0.07);
    ctx.lineTo(size * 0.54, -size * 0.05);
    ctx.lineTo(size * 0.38, -size * 0.03);
    ctx.closePath(); ctx.stroke();

    // Eye
    ctx.beginPath();
    ctx.arc(size * 0.34, -size * 0.08, size * 0.025, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill();

    // Left wing (upper surface)
    ctx.beginPath();
    ctx.moveTo(-size * 0.04, -size * 0.04);
    ctx.bezierCurveTo(-size * 0.28, -size * 0.38, -size * 0.65, -size * 0.42, -size * 0.82, -size * 0.22);
    ctx.stroke();
    // Left wing (lower surface)
    ctx.beginPath();
    ctx.moveTo(-size * 0.04, -size * 0.04);
    ctx.bezierCurveTo(-size * 0.22, size * 0.18, -size * 0.55, size * 0.28, -size * 0.78, size * 0.12);
    ctx.stroke();
    // Wing tip close
    ctx.beginPath();
    ctx.moveTo(-size * 0.82, -size * 0.22);
    ctx.quadraticCurveTo(-size * 0.88, -size * 0.05, -size * 0.78, size * 0.12);
    ctx.stroke();

    // Tail
    ctx.beginPath();
    ctx.moveTo(-size * 0.28, 0);
    ctx.lineTo(-size * 0.54, size * 0.14);
    ctx.moveTo(-size * 0.28, -size * 0.02);
    ctx.lineTo(-size * 0.54, -size * 0.02);
    ctx.moveTo(-size * 0.28, -size * 0.04);
    ctx.lineTo(-size * 0.52, -size * 0.16);
    ctx.stroke();
    ctx.restore();
  }

  // --- Planet with rings ---
  function planet(ctx, size, color, seed) {
    const rng = lcg(seed);
    const r = size * 0.4;
    const tilt = 0.28 + rng() * 0.2;
    ctx.save();
    ctx.strokeStyle = color;

    // Back half of ring
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.85, r * tilt, 0, Math.PI, Math.PI * 2);
    ctx.lineWidth = Math.max(1, size * 0.035);
    ctx.globalAlpha *= 0.45;
    ctx.stroke();
    ctx.globalAlpha /= 0.45;

    // Planet body
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.lineWidth = Math.max(1.5, size * 0.048);
    ctx.stroke();

    // Atmospheric bands
    for (let b = -2; b <= 2; b++) {
      const by = b * r * 0.28;
      if (Math.abs(by) >= r * 0.95) continue;
      const bw = Math.sqrt(r * r - by * by);
      ctx.beginPath();
      ctx.ellipse(0, by, bw * 0.98, bw * 0.07, 0, 0, Math.PI * 2);
      ctx.lineWidth = Math.max(0.4, size * 0.018);
      ctx.globalAlpha *= 0.25;
      ctx.stroke();
      ctx.globalAlpha /= 0.25;
    }

    // Front half of ring
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.85, r * tilt, 0, 0, Math.PI);
    ctx.lineWidth = Math.max(1, size * 0.038);
    ctx.stroke();

    // Second ring gap
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.55, r * tilt * 0.85, 0, 0, Math.PI);
    ctx.lineWidth = Math.max(0.5, size * 0.02);
    ctx.globalAlpha *= 0.5;
    ctx.stroke();
    ctx.globalAlpha /= 0.5;

    ctx.restore();
  }

  // --- Nebula (space cloud) ---
  function nebula(ctx, size, color, seed) {
    const rng = lcg(seed);
    ctx.save();
    ctx.strokeStyle = color;

    const lobeCount = 3 + Math.floor(rng() * 3);
    for (let i = 0; i < lobeCount; i++) {
      const a = (i / lobeCount) * Math.PI * 2 + rng() * 0.6;
      const d = size * (0.15 + rng() * 0.3);
      const cx = Math.cos(a) * d;
      const cy = Math.sin(a) * d;
      const r = size * (0.22 + rng() * 0.28);

      ctx.beginPath();
      ctx.moveTo(cx + r, cy);
      for (let j = 0; j <= 6; j++) {
        const a1 = (j / 6) * Math.PI * 2;
        const a2 = ((j + 0.5) / 6) * Math.PI * 2;
        const r1 = r * (0.6 + rng() * 0.7);
        ctx.quadraticCurveTo(
          cx + Math.cos(a2) * r1 * 1.4, cy + Math.sin(a2) * r1 * 1.4,
          cx + Math.cos((j + 1) / 6 * Math.PI * 2) * r * (0.6 + rng() * 0.7),
          cy + Math.sin((j + 1) / 6 * Math.PI * 2) * r * (0.6 + rng() * 0.7)
        );
      }
      ctx.closePath();
      const alpha = 0.1 + rng() * 0.18;
      ctx.lineWidth = Math.max(0.5, size * 0.022);
      ctx.globalAlpha *= alpha;
      ctx.stroke();
      ctx.globalAlpha /= alpha;
    }

    // Bright core
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.1, 0, Math.PI * 2);
    ctx.lineWidth = Math.max(1, size * 0.04);
    ctx.globalAlpha *= 0.65;
    ctx.stroke();
    ctx.globalAlpha /= 0.65;

    // Star field
    const stars = Math.floor(size * 0.8);
    for (let i = 0; i < stars; i++) {
      const sa = rng() * Math.PI * 2;
      const sd = rng() * size * 0.88;
      ctx.beginPath();
      ctx.arc(Math.cos(sa) * sd, Math.sin(sa) * sd, Math.max(0.3, size * 0.012), 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha *= (0.3 + rng() * 0.7);
      ctx.fill();
      ctx.globalAlpha /= (0.3 + rng() * 0.7);
    }
    ctx.restore();
  }

  // --- Heartbeat / ECG ---
  function heartbeat(ctx, size, color, seed) {
    const w = size * 1.75;
    const h = size * 0.7;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, size * 0.048);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(-w * 0.5, 0);
    ctx.lineTo(-w * 0.22, 0);
    // P wave
    ctx.bezierCurveTo(-w * 0.18, -h * 0.22, -w * 0.12, -h * 0.22, -w * 0.08, 0);
    ctx.lineTo(-w * 0.04, 0);
    // QRS
    ctx.lineTo(-w * 0.01, -h * 0.18);
    ctx.lineTo(0, h);
    ctx.lineTo(w * 0.04, -h * 0.45);
    ctx.lineTo(w * 0.07, 0);
    // T wave
    ctx.bezierCurveTo(w * 0.13, 0, w * 0.16, -h * 0.38, w * 0.21, -h * 0.38);
    ctx.bezierCurveTo(w * 0.26, -h * 0.38, w * 0.29, 0, w * 0.32, 0);
    ctx.lineTo(w * 0.5, 0);
    ctx.stroke();
    ctx.restore();
  }

  // --- Code lines (terminal/editor) ---
  function code_lines(ctx, size, color, seed) {
    const rng = lcg(seed);
    const lineCount = 7;
    const lineH = size * 1.6 / lineCount;
    const maxW = size * 1.65;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineCap = 'square';

    for (let i = 0; i < lineCount; i++) {
      const y = -size * 0.78 + (i + 0.5) * lineH;
      const indent = Math.floor(rng() * 3) * size * 0.14;
      const len = (0.25 + rng() * 0.68) * (maxW - indent);
      ctx.lineWidth = Math.max(1, size * 0.06);
      ctx.globalAlpha *= (0.35 + rng() * 0.65);
      ctx.beginPath();
      ctx.moveTo(-maxW * 0.5 + indent, y);
      ctx.lineTo(-maxW * 0.5 + indent + len, y);
      ctx.stroke();
      ctx.globalAlpha /= (0.35 + rng() * 0.65);
    }
    // Cursor
    ctx.lineWidth = Math.max(0.5, size * 0.038);
    ctx.globalAlpha *= 0.75;
    const cursorY = -size * 0.78 + (lineCount - 0.5) * lineH;
    ctx.beginPath();
    ctx.rect(-maxW * 0.5 + size * 0.1, cursorY - lineH * 0.38, size * 0.08, lineH * 0.75);
    ctx.stroke();
    ctx.globalAlpha /= 0.75;
    ctx.restore();
  }

  // --- Metrics / bar chart ---
  function metrics(ctx, size, color, seed) {
    const rng = lcg(seed);
    const bars = 6;
    const barW = size * 1.4 / (bars * 1.5);
    const maxH = size * 1.3;
    const baseY = size * 0.65;
    ctx.save();
    ctx.strokeStyle = color;

    // Axes
    ctx.lineWidth = Math.max(1, size * 0.038);
    ctx.beginPath();
    ctx.moveTo(-size * 0.78, -size * 0.72);
    ctx.lineTo(-size * 0.78, baseY);
    ctx.lineTo(size * 0.78, baseY);
    ctx.stroke();

    // Bars with upward trend
    for (let i = 0; i < bars; i++) {
      const x = -size * 0.62 + i * (size * 1.24 / (bars - 1));
      const trend = (i / (bars - 1)) * maxH * 0.55;
      const h = Math.min(trend + rng() * maxH * 0.4 + maxH * 0.08, maxH);
      ctx.beginPath();
      ctx.rect(x - barW * 0.5, baseY - h, barW, h);
      ctx.lineWidth = Math.max(0.8, size * 0.028);
      ctx.stroke();
    }

    // Trend line (dashed)
    ctx.setLineDash([size * 0.05, size * 0.05]);
    ctx.beginPath();
    ctx.moveTo(-size * 0.62, baseY - maxH * 0.1);
    ctx.lineTo(size * 0.62, baseY - maxH * 0.9);
    ctx.lineWidth = Math.max(0.5, size * 0.022);
    ctx.globalAlpha *= 0.45;
    ctx.stroke();
    ctx.globalAlpha /= 0.45;
    ctx.setLineDash([]);
    ctx.restore();
  }

  // --- Music (staff + notes) ---
  function music(ctx, size, color, seed) {
    const rng = lcg(seed);
    const staffW = size * 1.7;
    const spacing = size * 0.2;
    ctx.save();
    ctx.strokeStyle = color;

    // Staff lines
    ctx.lineWidth = Math.max(0.5, size * 0.025);
    for (let l = 0; l < 5; l++) {
      const y = -size * 0.38 + l * spacing;
      ctx.beginPath();
      ctx.moveTo(-staffW * 0.5, y);
      ctx.lineTo(staffW * 0.5, y);
      ctx.stroke();
    }

    // Treble clef (simplified elegant curve)
    ctx.lineWidth = Math.max(1, size * 0.045);
    ctx.beginPath();
    ctx.moveTo(-staffW * 0.38, size * 0.5);
    ctx.bezierCurveTo(-staffW * 0.38, size * 0.08, -staffW * 0.22, -size * 0.15, -staffW * 0.3, -size * 0.32);
    ctx.bezierCurveTo(-staffW * 0.42, -size * 0.58, -staffW * 0.16, -size * 0.68, -staffW * 0.26, -size * 0.48);
    ctx.bezierCurveTo(-staffW * 0.38, -size * 0.28, -staffW * 0.48, -size * 0.08, -staffW * 0.3, size * 0.08);
    ctx.stroke();

    // Notes
    const noteCount = 2 + Math.floor(rng() * 2);
    for (let n = 0; n < noteCount; n++) {
      const nx = -staffW * 0.1 + n * staffW * 0.28;
      const linePos = Math.floor(rng() * 5);
      const ny = -size * 0.38 + linePos * spacing;
      ctx.lineWidth = Math.max(0.8, size * 0.035);
      ctx.beginPath();
      ctx.ellipse(nx, ny, size * 0.1, size * 0.072, -0.3, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
      ctx.beginPath();
      ctx.moveTo(nx + size * 0.095, ny);
      ctx.lineTo(nx + size * 0.095, ny - size * 0.48);
      ctx.stroke();
    }
    ctx.restore();
  }

  // --- Coffee cup ---
  function coffee(ctx, size, color, seed) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, size * 0.045);
    ctx.lineCap = 'round';

    const tw = size * 0.52, bw = size * 0.38, ch = size * 0.65;

    // Cup body
    ctx.beginPath();
    ctx.moveTo(-tw, -ch * 0.12);
    ctx.lineTo(-bw, ch * 0.55);
    ctx.lineTo(bw, ch * 0.55);
    ctx.lineTo(tw, -ch * 0.12);
    ctx.closePath();
    ctx.stroke();

    // Saucer
    ctx.beginPath();
    ctx.ellipse(0, ch * 0.6, size * 0.62, size * 0.09, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Handle
    ctx.beginPath();
    ctx.moveTo(tw, ch * 0.06);
    ctx.bezierCurveTo(tw + size * 0.32, ch * 0.06, tw + size * 0.32, ch * 0.42, tw, ch * 0.42);
    ctx.stroke();

    // Steam
    ctx.lineWidth = Math.max(0.5, size * 0.025);
    for (const sx of [-size * 0.18, 0, size * 0.18]) {
      ctx.beginPath();
      ctx.moveTo(sx, -ch * 0.18);
      ctx.bezierCurveTo(sx + size * 0.09, -ch * 0.42, sx - size * 0.09, -ch * 0.58, sx, -ch * 0.78);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ============================================================

  const TYPES = [
    // Space
    'galaxy', 'planet', 'nebula', 'moon', 'sun',
    // Nature / animals
    'wave', 'fish', 'plant', 'dog', 'cat', 'bird',
    // Body / health / movement
    'barbell', 'yoga', 'heartbeat', 'breath', 'heart',
    // Spiritual / contemplative
    'lotus', 'mandala', 'golden',
    // Mind / code / systems
    'code_lines', 'metrics', 'circuit', 'neural', 'hilbert', 'sierpinski', 'bintree', 'maze',
    'queue', 'stack', 'graph', 'linked_list', 'hash_table',
    // Arts / life / craft
    'music', 'coffee', 'dumbbell', 'keyboard', 'paintbrush',
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

    if (depth > 0) {
      // Space-filling hex grid: 7 children (1 center + 6 ring) tile the
      // parent's area completely so zooming never reveals dark empty space —
      // every region is occupied by a meaningful sub-structure from the ecology.
      //
      // Coverage: center child reaches 0→0.44R; ring children at 0.52R radius
      // with 0.40R size reach from 0.12R→0.92R; outer 8% covered by bleed
      // from neighbouring cells.  7^5 = 16,807 leaf draws at max zoom.
      const eco = ECOLOGY[type] || ['breath'];
      const rot = (seed % 628) / 100; // deterministic rotation for variety

      // 1 center + 6 ring
      const hex = [{ x: 0, y: 0, r: size * 0.44 }];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + rot;
        hex.push({ x: Math.cos(a) * size * 0.52, y: Math.sin(a) * size * 0.52, r: size * 0.40 });
      }

      for (let i = 0; i < hex.length; i++) {
        const { x, y, r } = hex[i];
        if (r < 1.5) continue;
        const subType = eco[((seed >>> 0) + i * 7) % eco.length];
        const subSeed = (seed ^ (i * 0x9e3779b9)) >>> 0;
        ctx.save();
        ctx.translate(x, y);
        draw(ctx, subType, r, color, subSeed, 1, depth - 1);
        ctx.restore();
      }
      ctx.restore();
      return;
    }

    // depth === 0: draw the actual structure as canvas paths.
    // Always pass 0 as depth so structure functions never trigger their own
    // (now superseded) depth>0 branches.
    switch (type) {
      case 'galaxy':     galaxy(ctx, size, color, seed, 0);      break;
      case 'golden':     goldenSpiral(ctx, size, color, seed, 0);break;
      case 'plant':      plant(ctx, size, color, seed, 0);       break;
      case 'maze':       maze(ctx, size, color, seed, 0);        break;
      case 'circuit':    circuit(ctx, size, color, seed, 0);     break;
      case 'neural':     neural(ctx, size, color, seed, 0);      break;
      case 'lotus':      lotus(ctx, size, color, seed, 0);       break;
      case 'mandala':    mandala(ctx, size, color, seed, 0);     break;
      case 'sun':        sun(ctx, size, color, seed, 0);         break;
      case 'moon':       moon(ctx, size, color, seed, 0);        break;
      case 'wave':       wave(ctx, size, color, seed, 0);        break;
      case 'fish':       fish(ctx, size, color, seed, 0);        break;
      case 'breath':     breath(ctx, size, color, seed, 0);      break;
      case 'heart':      heart(ctx, size, color, seed, 0);       break;
      case 'sierpinski': sierpinski(ctx, size, color, seed, 0);  break;
      case 'hilbert':    hilbert(ctx, size, color, seed, 0);     break;
      case 'bintree':    bintree(ctx, size, color, seed, 0);     break;
      case 'queue':      queue(ctx, size, color, seed);          break;
      case 'stack':      stack(ctx, size, color, seed);          break;
      case 'graph':      graph(ctx, size, color, seed);          break;
      case 'linked_list':linked_list(ctx, size, color, seed);    break;
      case 'hash_table': hash_table(ctx, size, color, seed);     break;
      case 'barbell':    barbell(ctx, size, color, seed);        break;
      case 'yoga':       yoga(ctx, size, color, seed);           break;
      case 'dog':        dog(ctx, size, color, seed);            break;
      case 'cat':        cat(ctx, size, color, seed);            break;
      case 'bird':       bird(ctx, size, color, seed);           break;
      case 'planet':     planet(ctx, size, color, seed);         break;
      case 'nebula':     nebula(ctx, size, color, seed);         break;
      case 'heartbeat':  heartbeat(ctx, size, color, seed);      break;
      case 'code_lines': code_lines(ctx, size, color, seed);     break;
      case 'metrics':    metrics(ctx, size, color, seed);        break;
      case 'music':      music(ctx, size, color, seed);          break;
      case 'coffee':     coffee(ctx, size, color, seed);         break;
      case 'dumbbell':   dumbbell(ctx, size, color, seed);      break;
      case 'keyboard':   keyboard(ctx, size, color, seed);      break;
      case 'paintbrush': paintbrush(ctx, size, color, seed);    break;
    }
    ctx.restore();
  }

  return { draw, TYPES };
})();
