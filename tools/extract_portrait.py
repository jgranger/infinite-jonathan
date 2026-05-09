#!/usr/bin/env python3.11
"""
Extract portrait data from source photo for the fractal portrait renderer.
Outputs two JSON files:
  - data/contours.json   : edge contour paths (for structural lines)
  - data/tonal_field.json: sampled tonal/color values across the image (for micro-structure placement)
"""

import cv2
import numpy as np
import json
import sys
from pathlib import Path

SOURCE = "/home/jon/Pictures/jonathan.png"
OUT_DIR = Path(__file__).parent.parent / "data"
OUT_DIR.mkdir(exist_ok=True)

TARGET_W = 800  # normalized canvas width

img_bgr = cv2.imread(SOURCE)
if img_bgr is None:
    sys.exit(f"Could not read {SOURCE}")

h, w = img_bgr.shape[:2]
scale = TARGET_W / w
new_h = int(h * scale)
img_bgr = cv2.resize(img_bgr, (TARGET_W, new_h))
h, w = img_bgr.shape[:2]
print(f"Image resized to {w}x{h}")

img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
img_gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

# --- Contour extraction ---
# Bilateral filter preserves edges while smoothing texture noise
smoothed = cv2.bilateralFilter(img_gray, 9, 75, 75)

# Multi-scale edges: coarse structure + fine detail
edges_coarse = cv2.Canny(smoothed, 30, 80)
edges_fine   = cv2.Canny(smoothed, 60, 140)

# Find contours at both scales
def extract_contours(edge_img, min_len=8):
    contours, _ = cv2.findContours(edge_img, cv2.RETR_LIST, cv2.CHAIN_APPROX_TC89_KCOS)
    paths = []
    for c in contours:
        if len(c) < min_len:
            continue
        # Simplify slightly to reduce point count
        eps = 0.5
        approx = cv2.approxPolyDP(c, eps, False)
        pts = approx.reshape(-1, 2).tolist()
        if len(pts) >= 2:
            paths.append(pts)
    return paths

coarse_paths = extract_contours(edges_coarse, min_len=6)
fine_paths   = extract_contours(edges_fine,   min_len=10)

print(f"Coarse contours: {len(coarse_paths)}, Fine contours: {len(fine_paths)}")

contour_data = {
    "width": w,
    "height": h,
    "coarse": coarse_paths,
    "fine": fine_paths,
}
with open(OUT_DIR / "contours.json", "w") as f:
    json.dump(contour_data, f, separators=(",", ":"))
print(f"Wrote contours.json ({(OUT_DIR / 'contours.json').stat().st_size // 1024}KB)")

# --- Tonal field sampling ---
# Sample the image on a grid; each cell gets brightness + color.
# The renderer uses this to place and style micro-structures.
GRID_W = 120
GRID_H = int(GRID_W * h / w)

tonal = cv2.resize(img_gray, (GRID_W, GRID_H))
color_small = cv2.resize(img_rgb,  (GRID_W, GRID_H))

# Also sample a slightly blurred version for smoother density
tonal_blur = cv2.GaussianBlur(tonal, (5, 5), 0)

cells = []
for row in range(GRID_H):
    for col in range(GRID_W):
        brightness = int(tonal_blur[row, col])
        r, g, b    = color_small[row, col].tolist()
        # Darkness drives density (darker = more structures)
        density = round(1.0 - brightness / 255.0, 3)
        cells.append([col, row, brightness, r, g, b, density])

tonal_data = {
    "grid_w": GRID_W,
    "grid_h": GRID_H,
    "canvas_w": w,
    "canvas_h": h,
    "cells": cells,
}
with open(OUT_DIR / "tonal_field.json", "w") as f:
    json.dump(tonal_data, f, separators=(",", ":"))
print(f"Wrote tonal_field.json ({(OUT_DIR / 'tonal_field.json').stat().st_size // 1024}KB)")

# --- Subject mask (rough foreground isolation) ---
# GrabCut to separate Jon from the bokeh background
mask = np.zeros((h, w), np.uint8)
rect = (30, 10, w - 60, h - 20)  # rough bounding rect, leaving some margin
bgd_model = np.zeros((1, 65), np.float64)
fgd_model = np.zeros((1, 65), np.float64)
cv2.grabCut(img_bgr, mask, rect, bgd_model, fgd_model, 8, cv2.GC_INIT_WITH_RECT)
fg_mask = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)

# Downsample mask to match grid
mask_small = cv2.resize(fg_mask, (GRID_W, GRID_H))
mask_list = (mask_small > 128).tolist()  # list of lists of bools

mask_data = {
    "grid_w": GRID_W,
    "grid_h": GRID_H,
    "mask": [[int(v) for v in row] for row in mask_list],
}
with open(OUT_DIR / "subject_mask.json", "w") as f:
    json.dump(mask_data, f, separators=(",", ":"))
print(f"Wrote subject_mask.json ({(OUT_DIR / 'subject_mask.json').stat().st_size // 1024}KB)")

print("Done.")
