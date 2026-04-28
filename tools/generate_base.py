#!/usr/bin/env python3.11
"""Generate a small base image for the viewer's low-zoom layer."""
import cv2, base64, json
from pathlib import Path

SOURCE = "/home/jon/Pictures/jonathan.png"
OUT_DIR = Path(__file__).parent.parent / "data"

img = cv2.imread(SOURCE)
h, w = img.shape[:2]
scale = 800 / w
img = cv2.resize(img, (800, int(h * scale)))

# Slightly desaturate - the micro-structures will add back color character
hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(float)
hsv[:,:,1] *= 0.7
img_desat = cv2.cvtColor(hsv.astype('uint8'), cv2.COLOR_HSV2BGR)

ok, buf = cv2.imencode(".jpg", img_desat, [cv2.IMWRITE_JPEG_QUALITY, 85])
b64 = base64.b64encode(buf).decode()

out = {"width": 800, "height": img.shape[0], "data": b64}
with open(OUT_DIR / "base_image.json", "w") as f:
    json.dump(out, f)
print(f"base_image.json: {len(b64) // 1024}KB base64")
