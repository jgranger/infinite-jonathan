# Infinite Jonathan

**[→ Live demo](https://jgranger.github.io/infinite-jonathan/)**

A portrait made entirely from math. No images are rendered — every dot, spiral, and structure you see is drawn in real time using Canvas 2D path commands. Zoom in and the dots reveal themselves to be galaxies, yoga poses, barbells, circuit boards, linked lists. Keep zooming and new ones appear behind them. There's no bottom.

---

## How it works

### The portrait data

A Python script ran GrabCut segmentation and Sobel edge detection on a photo, producing a compact 500×332 tonal grid (~5MB JSON). Each cell stores color, brightness, gradient angle, and a subject mask flag. That grid is the only "data" in the app — everything else is computed at render time.

### Halftone rendering

At default zoom the portrait reads as a halftone: brightness drives dot size (bright = large, dark = small), color comes from the tonal field at each cell's position. This is a multi-octave system — several grid scales render simultaneously so the dot texture stays consistent as you begin zooming in.

### The zoom-reveal pass

A second independent render pass runs on top of the halftone. It uses a fixed grid that grows with zoom rather than swapping out for finer scales. When a cell reaches ~20px on screen its dot starts revealing its structure. Each doubling of zoom brings a new, finer level of structures into view at the same entry size while the previous level keeps growing — exactly like flying through space where distant objects grow and new tiny ones appear behind them.

The depth is computed dynamically from the zoom value, so there's no ceiling. `MAX_ZOOM = Infinity`.

### Structure placement

Structures are placed by sampling the tonal field at each cell's world position. Body region (head, heart, arms, torso) is derived from the normalized (x, y) position within the portrait canvas. A seeded Fisher-Yates tile shuffle runs over every 5×5 block of cells to prevent clustering — all types appear before any repeats within a local neighborhood.

---

## The structures

There are 34 hand-drawn structure types, grouped roughly by where they appear and what they represent.

**Space** — galaxy, nebula, planet with rings, moon, sun. These dominate the bright bokeh lights in the background. Realistic spiral galaxies with scattered stars and a glowing nucleus.

**CS / code** — circuit board, neural network, Hilbert space-filling curve, Sierpiński triangle, binary search tree, maze, queue, stack, directed graph, linked list, hash table with collision chains. These cluster around the head.

**Health / movement** — barbell with weight plates, three yoga poses (tree, warrior I, seated meditation), ECG heartbeat waveform, breath ripples. These appear around the arms, chest, and torso.

**Contemplative** — lotus flower, mandala, golden spiral (Fibonacci), breath ripples. Heart and center of the portrait.

**Nature / animals** — ocean waves, koi fish, fractal plant/tree, dog, cat, bird in flight. Mixed throughout.

**Life** — music staff with notes, coffee cup with steam. Scattered in brighter regions.

---

## The math

- **Bilinear interpolation** — smooth color and brightness sampling between the 500×332 grid cells
- **Inverted halftone** — `sizeFrac = 0.04 + (brightness/255) * 0.88`, so brightness maps linearly to structure radius
- **Multi-octave tiling** — each octave L has world cell size `BASE / RATIO^L`; L_min is computed from `ceil(log(BASE·zoom / MAX_SCREEN) / log(RATIO))` so octaves outside the visible size range are skipped
- **Depth reveal** — a cell at reveal level L first appears when `(REVEAL_BASE / 2^L) * zoom ≥ 20px`; the deepest active level grows with zoom automatically
- **Seeded LCG** — all procedural randomness uses a linear congruential generator seeded by `(gx * 2654435761) ^ (gy * 2246822519) ^ (L * 1234567)` so every structure is deterministic and stable across frames
- **Fisher-Yates tile shuffle** — `pickType()` does a fresh shuffle per 5×5 tile of cells to guarantee local type diversity without global patterns
- **Momentum panning** — drag velocity decays by 0.92 per frame after release
- **Pinch-to-zoom** — touch distance delta maps directly to zoom factor around the pinch midpoint

---

## Stack

Pure HTML + Canvas 2D + vanilla JS. No frameworks, no build step, no dependencies. The data generation tools are in `/tools` (Python, OpenCV).

---

*Built with [Claude Code](https://claude.ai/code)*
