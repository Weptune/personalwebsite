import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import subprocess
import io

W, H = 2400, 1260

# 1. Neutral Deep Charcoal / Obsidian Studio Gradient
# Theme-neutral: works across all themes (Sky, Sun, Moon, Ocean, Stars)
y, x = np.mgrid[0:H, 0:W]
cx, cy = W / 2.0, H / 2.0

# Radial distance from center
r_norm = np.sqrt(((x - cx) / (W * 0.6))**2 + ((y - (cy - 50)) / (H * 0.6))**2)
r_norm = np.clip(r_norm, 0.0, 1.0)

# Smooth ease-out falloff
falloff = np.cos(r_norm * (np.pi / 2.0)) ** 1.8

# Base colors: Center is deep charcoal slate (26, 28, 34), Edges are obsidian (13, 14, 17)
c_center = np.array([28, 30, 36], dtype=np.float32)
c_edge = np.array([13, 14, 17], dtype=np.float32)

arr = np.zeros((H, W, 3), dtype=np.float32)
for c in range(3):
    arr[:, :, c] = c_edge[c] + (c_center[c] - c_edge[c]) * falloff

# Very soft warm ambient glow directly behind the golden arch
r_arch = np.sqrt(((x - cx) / (W * 0.28))**2 + ((y - cy) / (H * 0.38))**2)
arch_glow_mask = np.clip(1.0 - r_arch, 0.0, 1.0) ** 2.0
arch_glow_color = np.array([42, 34, 22], dtype=np.float32) # subtle warm gold undertone
for c in range(3):
    arr[:, :, c] += arch_glow_color[c] * arch_glow_mask

arr = np.clip(arr, 0, 255).astype(np.uint8)
base_img = Image.fromarray(arr).convert('RGBA')

# 2. Subtle Modern Tech Dot-Grid / Subtle Chessboard Coordinate Grid
# Like Linear, Vercel, or modern IDE dark mode - clean, structural, theme-neutral
grid_overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
grid_draw = ImageDraw.Draw(grid_overlay)

# Fine dot grid
step = 48
for gx in range(step // 2, W, step):
    for gy in range(step // 2, H, step):
        # Subtle fade near borders and behind center logo
        dist_from_center = np.hypot((gx - cx) / (W * 0.4), (gy - cy) / (H * 0.45))
        dist_from_edge = min(gx, W - gx, gy, H - gy) / 100.0
        edge_alpha = np.clip(dist_from_edge, 0.0, 1.0)
        
        # Don't draw dots heavily right under the horse
        center_suppression = np.clip((dist_from_center - 0.4) / 0.5, 0.0, 1.0)
        alpha = int(28 * edge_alpha * (0.3 + 0.7 * center_suppression))
        if alpha > 0:
            grid_draw.ellipse([gx - 1.5, gy - 1.5, gx + 1.5, gy + 1.5], fill=(160, 165, 180, alpha))

base_img = Image.alpha_composite(base_img, grid_overlay)

# 3. Paste Original Logo Cleanly
data = subprocess.check_output(['git', 'show', '4b8fc77:src/content/projects/heavens-gate/cover.png'])
orig = Image.open(io.BytesIO(data))
bbox = orig.getbbox()
logo = orig.crop(bbox)

# Scale cleanly to centered size
target_h = 1000
target_w = int(logo.width * (target_h / logo.height))
scaled_logo = logo.resize((target_w, target_h), Image.Resampling.LANCZOS)
pos_x = (W - target_w) // 2
pos_y = (H - target_h) // 2

# Subtle warm backlight halo behind logo to make the gold arch pop delicately
logo_halo = Image.new('RGBA', (W, H), (0, 0, 0, 0))
logo_halo_draw = ImageDraw.Draw(logo_halo)
logo_halo_draw.ellipse(
    [pos_x + target_w * 0.15, pos_y + target_h * 0.05, pos_x + target_w * 0.85, pos_y + target_h * 0.85],
    fill=(210, 180, 120, 32)
)
logo_halo = logo_halo.filter(ImageFilter.GaussianBlur(radius=60))
base_img = Image.alpha_composite(base_img, logo_halo)

base_img.paste(scaled_logo, (pos_x, pos_y), scaled_logo)

# 4. Minimalist Hairline Border (Crisp, modern, 1px subtle dark-gold / slate outline)
border_draw = ImageDraw.Draw(base_img)
border_draw.rectangle([0, 0, W - 1, H - 1], outline=(180, 150, 95, 70), width=2)

out_rgb = base_img.convert('RGB')
out_rgb.save('src/content/projects/heavens-gate/cover.png', quality=95)
out_rgb.save('src/content/projects/heavens-gate/cover_clean.png', quality=95)
print('Clean, tasteful cover generated!')
