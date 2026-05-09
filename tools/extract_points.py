#!/usr/bin/env python3.11
"""
Flow-based stippling point extractor.
Samples ~20,000 points from a portrait photo using density-weighted rejection sampling.
Each point carries: x, y, r, g, b, brightness, angle (contour direction), radius, type_idx
"""

import json
import math
import os
import sys
import numpy as np
from PIL import Image
import cv2

# ── Paths ────────────────────────────────────────────────────────────────────
SRC_IMAGE   = '/home/jon/Pictures/jonathan.png'
OUTPUT_FILE = '/home/jon/Documents/projects/personal/portrait/data/points.json'
TARGET_W    = 800

# ── Structure type index map (matches TYPES order in structures.js) ───────────
# galaxy=0, golden=1, plant=2, maze=3, circuit=4, dna=5, neural=6,
# lotus=7, mandala=8, elephant=9, sun=10, moon=11, wave=12, fish=13,
# ouroboros=14, breath=15, infinity=16, heart=17, om=18
BRIGHT_TYPES = [7, 10, 1, 18, 15, 17, 2, 8, 9]   # lotus,sun,golden,om,breath,heart,plant,mandala,elephant
MID_TYPES    = [12, 13, 14, 16, 5, 2, 7, 11, 17]  # wave,fish,ouroboros,infinity,dna,plant,lotus,moon,heart
DARK_TYPES   = [3, 4, 6, 5, 8, 0, 14, 4]          # maze,circuit,neural,dna,mandala,galaxy,ouroboros,circuit
BG_TYPES     = [0, 11, 15, 16, 12]                 # galaxy,moon,breath,infinity,wave

NUM_CANDIDATES = 600_000


def load_and_resize(path, target_w):
    img = Image.open(path).convert('RGB')
    w, h = img.size
    scale = target_w / w
    new_h = int(h * scale)
    img = img.resize((target_w, new_h), Image.LANCZOS)
    print(f"Image resized to {target_w}x{new_h}")
    return img, target_w, new_h


def compute_sobel(gray_np):
    """Returns (gx, gy, magnitude) arrays."""
    gx = cv2.Sobel(gray_np, cv2.CV_64F, 1, 0, ksize=3)
    gy = cv2.Sobel(gray_np, cv2.CV_64F, 0, 1, ksize=3)
    mag = np.sqrt(gx**2 + gy**2)
    return gx, gy, mag


def compute_grabcut_mask(img_np, W, H):
    """Uses GrabCut to separate foreground (face) from background."""
    mask = np.zeros((H, W), np.uint8)
    # Seed rect: generous inset — face should be in center
    margin_x = int(W * 0.05)
    margin_y = int(H * 0.05)
    rect = (margin_x, margin_y, W - 2 * margin_x, H - 2 * margin_y)

    bgd_model = np.zeros((1, 65), np.float64)
    fgd_model = np.zeros((1, 65), np.float64)

    try:
        cv2.grabCut(img_np, mask, rect, bgd_model, fgd_model, 5, cv2.GC_INIT_WITH_RECT)
        # GC_FGD=1, GC_PR_FGD=3 → foreground
        fg_mask = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 1, 0).astype(np.uint8)
    except Exception as e:
        print(f"GrabCut failed ({e}), using full-image mask")
        fg_mask = np.ones((H, W), np.uint8)

    fg_ratio = fg_mask.mean()
    print(f"GrabCut foreground coverage: {fg_ratio*100:.1f}%")

    # If GrabCut removed too much, fall back to a soft center mask
    if fg_ratio < 0.15 or fg_ratio > 0.95:
        print("GrabCut result unreliable, using elliptical fallback mask")
        yy, xx = np.mgrid[0:H, 0:W]
        cx, cy = W / 2, H / 2
        # Ellipse covering the portrait area (shoulders + head)
        fg_mask = ((xx - cx)**2 / (W * 0.42)**2 + (yy - cy)**2 / (H * 0.48)**2 < 1).astype(np.uint8)

    return fg_mask


def assign_type_idx(brightness, is_bg, position_hash):
    if is_bg:
        pool = BG_TYPES
    elif brightness > 160:
        pool = BRIGHT_TYPES
    elif brightness >= 100:
        pool = MID_TYPES
    else:
        pool = DARK_TYPES
    return pool[position_hash % len(pool)]


def main():
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

    # ── Load image ────────────────────────────────────────────────────────────
    img, W, H = load_and_resize(SRC_IMAGE, TARGET_W)
    img_np  = np.array(img, dtype=np.uint8)           # (H, W, 3) uint8
    gray_np = np.array(img.convert('L'), dtype=np.float32)  # (H, W) float

    # ── Sobel gradient ────────────────────────────────────────────────────────
    gx, gy, grad_mag = compute_sobel(gray_np)

    # Contour direction = gradient direction rotated 90°
    # angle_contour = atan2(gy, gx) + pi/2
    angle_map = (np.arctan2(gy, gx) + math.pi / 2).astype(np.float32)

    # ── GrabCut foreground mask ───────────────────────────────────────────────
    fg_mask = compute_grabcut_mask(img_np, W, H)

    # ── Density map ──────────────────────────────────────────────────────────
    brightness_map = gray_np  # 0..255
    density = (1.0 - brightness_map / 255.0) ** 0.7  # gamma curve

    # Background gets very sparse treatment
    bg_mask  = (fg_mask == 0)
    density[bg_mask] *= 0.15

    density_flat = density.ravel()
    density_max  = density_flat.max()
    density_prob = density_flat / density_max  # normalize to 0..1 (relative density)

    # ── Rejection sampling ────────────────────────────────────────────────────
    # We want ~20,000 unique accepted points.
    # Expected accepted = NUM_CANDIDATES * mean(density_prob).
    # Scale density_prob by a global factor so that expectation hits target.
    TARGET_POINTS = 20_000
    mean_density  = density_prob.mean()
    # scale so expected hits = NUM_CANDIDATES * mean_density * scale = TARGET
    # but cap scale at 1.0 (can't accept more than 100%)
    scale = min(1.0, TARGET_POINTS / (NUM_CANDIDATES * mean_density))
    density_prob_scaled = density_prob * scale
    print(f"Density scale factor: {scale:.4f}  (mean density: {mean_density:.4f})")

    rng = np.random.default_rng(42)

    candidate_flat = rng.integers(0, W * H, size=NUM_CANDIDATES)
    thresholds     = rng.random(size=NUM_CANDIDATES)
    accepted       = candidate_flat[thresholds < density_prob_scaled[candidate_flat]]

    # Convert flat indices → (row, col)
    rows = accepted // W
    cols = accepted % W

    # Deduplicate (keep unique pixel locations to avoid stacked points)
    coords   = np.unique(np.stack([rows, cols], axis=1), axis=0)
    rows, cols = coords[:, 0], coords[:, 1]
    n_points = len(rows)
    print(f"Accepted points after dedup: {n_points}")

    # ── Local radius estimation ───────────────────────────────────────────────
    # Estimate local density by counting neighbors in a small window.
    # Darker (denser) areas → smaller radius; brighter → larger.
    # Simple approximation: radius inversely proportional to local density.
    bmap_bright = brightness_map[rows, cols].astype(np.float32)  # 0..255
    # Radius: bright pixels (sparse) get larger radius, dark (dense) get smaller.
    # Map: brightness 0→2.5px, brightness 255→12px
    radius_arr = 2.5 + (bmap_bright / 255.0) * (12.0 - 2.5)
    radius_arr = np.clip(radius_arr, 2.5, 12.0)

    # ── Collect per-point data ────────────────────────────────────────────────
    r_arr = img_np[rows, cols, 0]
    g_arr = img_np[rows, cols, 1]
    b_arr = img_np[rows, cols, 2]
    bright_arr  = brightness_map[rows, cols].astype(np.float32)
    angle_arr   = angle_map[rows, cols]
    is_bg_arr   = bg_mask[rows, cols]

    # Stats breakdown
    fg_bright = int(np.sum((~is_bg_arr) & (bright_arr > 160)))
    fg_mid    = int(np.sum((~is_bg_arr) & (bright_arr >= 100) & (bright_arr <= 160)))
    fg_dark   = int(np.sum((~is_bg_arr) & (bright_arr < 100)))
    bg_count  = int(np.sum(is_bg_arr))

    print(f"\nPoint breakdown:")
    print(f"  Foreground bright (>160):  {fg_bright:>6}")
    print(f"  Foreground mid (100-160):  {fg_mid:>6}")
    print(f"  Foreground dark (<100):    {fg_dark:>6}")
    print(f"  Background:                {bg_count:>6}")
    print(f"  Total:                     {n_points:>6}")

    # ── Build output list ─────────────────────────────────────────────────────
    points_out = []
    for i in range(n_points):
        x       = int(cols[i])
        y       = int(rows[i])
        r_val   = int(r_arr[i])
        g_val   = int(g_arr[i])
        b_val   = int(b_arr[i])
        br      = int(bright_arr[i])
        angle   = round(float(angle_arr[i]), 2)
        radius  = round(float(radius_arr[i]), 1)
        is_bg   = bool(is_bg_arr[i])

        # Position hash for deterministic type variety
        pos_hash = (x * 2654435761 ^ y * 2246822519) & 0xFFFFFFFF
        tidx = assign_type_idx(br, is_bg, pos_hash)

        points_out.append([x, y, r_val, g_val, b_val, br, angle, radius, tidx])

    # ── Write JSON ────────────────────────────────────────────────────────────
    output = {
        "width":  W,
        "height": H,
        "points": points_out
    }

    with open(OUTPUT_FILE, 'w') as f:
        json.dump(output, f, separators=(',', ':'))

    size_mb = os.path.getsize(OUTPUT_FILE) / 1e6
    print(f"\nWrote {OUTPUT_FILE}")
    print(f"File size: {size_mb:.1f} MB")
    print(f"Done. {n_points} points total.")


if __name__ == '__main__':
    main()
