import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy.ndimage import gaussian_filter

W, H = 2400, 1260

# 1. Base Gradient: Deep cosmic indigo to midnight obsidian
y, x = np.mgrid[0:H, 0:W]
arr = np.zeros((H, W, 3), dtype=np.float32)

# Deep space colors matching the site's nebula palette
# Top: deep cosmic violet/indigo
top_color = np.array([16, 12, 28], dtype=np.float32)
# Bottom: deep space charcoal
bottom_color = np.array([8, 7, 14], dtype=np.float32)
# Center glow: warm celestial violet
center_glow = np.array([45, 30, 70], dtype=np.float32)

for c in range(3):
    arr[:, :, c] = top_color[c] * (1.0 - y / H) + bottom_color[c] * (y / H)

cx, cy = W / 2.0, H / 2.0
r_center = np.sqrt(((x - cx) / (W * 0.42))**2 + ((y - cy) / (H * 0.52))**2)
nebula_mask = np.clip(1.0 - r_center, 0.0, 1.0) ** 1.8

# Left & Right cosmic dust clouds
np.random.seed(42)
noise = np.random.randn(H // 25, W // 25)
noise = gaussian_filter(noise, sigma=5)
noise = (noise - noise.min()) / (noise.max() - noise.min())
noise_img = Image.fromarray((noise * 255).astype(np.uint8)).resize((W, H), Image.Resampling.BICUBIC)
noise_arr = np.array(noise_img).astype(np.float32) / 255.0

# Soft clouds (violet-magenta, deep cyan, cosmic purple)
cloud_tint = np.zeros((H, W, 3), dtype=np.float32)
cloud_tint[:, :, 0] = noise_arr * 40  # Red/magenta
cloud_tint[:, :, 1] = noise_arr * 16  # Green
cloud_tint[:, :, 2] = noise_arr * 60  # Blue

arr += cloud_tint * 0.7
for c in range(3):
    arr[:, :, c] += center_glow[c] * nebula_mask * 0.65

arr = np.clip(arr, 0, 255).astype(np.uint8)
base_img = Image.fromarray(arr).convert('RGBA')

# 2. Add perspective chessboard grid on the floor (subtle & elegant)
floor_overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
floor_draw = ImageDraw.Draw(floor_overlay)
horizon_y = H * 0.64
floor_lines = 16
vp_x = W * 0.5

# Draw receding perspective lines
for i in range(-floor_lines, floor_lines + 1):
    bottom_x = vp_x + i * (W * 0.058)
    floor_draw.line([(vp_x, horizon_y), (bottom_x, H)], fill=(140, 115, 200, 30), width=2)

# Horizontal lines with exponential distance
for d in np.linspace(0.08, 1.0, 11):
    cur_y = horizon_y + (H - horizon_y) * (d ** 2.3)
    alpha = int(45 * d)
    floor_draw.line([(0, cur_y), (W, cur_y)], fill=(150, 125, 210, alpha), width=1)

# Mask floor to only bottom third and softly fade at horizon
floor_arr = np.array(floor_overlay)
fade = np.clip((y - horizon_y) / (H - horizon_y), 0, 1) ** 1.6
for c in range(4):
    floor_arr[:, :, c] = (floor_arr[:, :, c] * fade).astype(np.uint8)

floor_faded = Image.fromarray(floor_arr)
base_img = Image.alpha_composite(base_img, floor_faded)

# 3. Spectral Tropical Graph: Constellation network on left and right wings
graph_overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
graph_draw = ImageDraw.Draw(graph_overlay)

np.random.seed(2026)
pts = []
# Generate points on left wing
for _ in range(22):
    px = np.random.uniform(W * 0.05, W * 0.32)
    py = np.random.uniform(H * 0.12, H * 0.88)
    pts.append((px, py))

# Generate points on right wing
for _ in range(22):
    px = np.random.uniform(W * 0.68, W * 0.95)
    py = np.random.uniform(H * 0.12, H * 0.88)
    pts.append((px, py))

# Connect nearby points in each cluster
for i, p1 in enumerate(pts):
    for j, p2 in enumerate(pts):
        if i < j:
            d = np.hypot(p1[0] - p2[0], p1[1] - p2[1])
            if d < 280:
                edge_alpha = int(45 * (1.0 - d / 280))
                # Slight golden-violet tint for spectral graph edges
                graph_draw.line([p1, p2], fill=(175, 155, 225, edge_alpha), width=1)

# Draw glowing graph nodes
for px, py in pts:
    r = np.random.choice([2, 3, 4])
    glow_r = r * 3
    graph_draw.ellipse([px - glow_r, py - glow_r, px + glow_r, py + glow_r], fill=(190, 160, 245, 35))
    graph_draw.ellipse([px - r, py - r, px + r, py + r], fill=(240, 230, 255, 140))

base_img = Image.alpha_composite(base_img, graph_overlay)

# 4. Volumetric Starlight Rays from the Apex Star
rays_overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
rays_draw = ImageDraw.Draw(rays_overlay)
apex_x, apex_y = W / 2.0, H * 0.14

for angle_deg in np.linspace(-65, 65, 29):
    rad = np.radians(angle_deg + 90)
    ray_len = 1150
    end_x = apex_x + ray_len * np.cos(rad)
    end_y = apex_y + ray_len * np.sin(rad)
    ray_alpha = int(18 * np.cos(np.radians(angle_deg * 1.2)))
    rays_draw.line([(apex_x, apex_y), (end_x, end_y)], fill=(235, 205, 145, ray_alpha), width=7)

rays_overlay = rays_overlay.filter(ImageFilter.GaussianBlur(radius=16))
base_img = Image.alpha_composite(base_img, rays_overlay)

# 5. Stardust and Sparkles (cosmic particles)
stars_overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
stars_draw = ImageDraw.Draw(stars_overlay)
for _ in range(90):
    sx = np.random.uniform(0, W)
    sy = np.random.uniform(0, H)
    sr = np.random.uniform(1.0, 2.8)
    s_alpha = np.random.randint(50, 190)
    color = (255, 255, 255, s_alpha) if np.random.rand() > 0.35 else (238, 210, 140, s_alpha)
    stars_draw.ellipse([sx - sr, sy - sr, sx + sr, sy + sr], fill=color)

base_img = Image.alpha_composite(base_img, stars_overlay)

# 6. Logo Backdrop Halo for crisp contrast
halo = Image.new('RGBA', (W, H), (0, 0, 0, 0))
halo_draw = ImageDraw.Draw(halo)
halo_draw.ellipse([cx - 480, cy - 500, cx + 480, cy + 470], fill=(22, 17, 36, 170))
halo = halo.filter(ImageFilter.GaussianBlur(radius=65))
base_img = Image.alpha_composite(base_img, halo)

# 7. Crop & Scale the Original Clean Logo
orig = Image.open('src/content/projects/heavens-gate/orig_transparent_logo.png')
bbox = orig.getbbox()
logo = orig.crop(bbox)

target_h = 1040
target_w = int(logo.width * (target_h / logo.height))
scaled_logo = logo.resize((target_w, target_h), Image.Resampling.LANCZOS)
pos_x = (W - target_w) // 2
pos_y = (H - target_h) // 2

# Subtle warm backlight glow specifically under the gold arch
arch_glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
arch_glow_draw = ImageDraw.Draw(arch_glow)
arch_glow_draw.ellipse(
    [pos_x + target_w * 0.1, pos_y + target_h * 0.05, pos_x + target_w * 0.9, pos_y + target_h * 0.85],
    fill=(226, 188, 119, 32)
)
arch_glow = arch_glow.filter(ImageFilter.GaussianBlur(radius=75))
base_img = Image.alpha_composite(base_img, arch_glow)

# Paste scaled logo
base_img.paste(scaled_logo, (pos_x, pos_y), scaled_logo)

# 8. Elegant Double Border with Inset Corner Flourishes
border_draw = ImageDraw.Draw(base_img)
# Outer border matching website border token
border_draw.rectangle([0, 0, W - 1, H - 1], outline=(70, 60, 95, 230), width=2)
# Inset fine line
inset = 30
border_draw.rectangle([inset, inset, W - inset, H - inset], outline=(95, 80, 130, 75), width=1)
# Corner marks
c_len = 42
for cx_c, cy_c in [(inset, inset), (W - inset, inset), (inset, H - inset), (W - inset, H - inset)]:
    dx = 1 if cx_c == inset else -1
    dy = 1 if cy_c == inset else -1
    border_draw.line([(cx_c, cy_c), (cx_c + dx * c_len, cy_c)], fill=(200, 175, 235, 160), width=2)
    border_draw.line([(cx_c, cy_c), (cx_c, cy_c + dy * c_len)], fill=(200, 175, 235, 160), width=2)

out_rgb = base_img.convert('RGB')
out_rgb.save('src/content/projects/heavens-gate/cover.png', quality=95)
print('Procedural cosmic chess cover generated successfully!')
