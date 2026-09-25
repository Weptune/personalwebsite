import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy.ndimage import gaussian_filter
import subprocess
import io

W, H = 2400, 1260

# 1. Base Gradient: Rich Royal Violet & Celestial Indigo
y, x = np.mgrid[0:H, 0:W]
arr = np.zeros((H, W, 3), dtype=np.float32)

top_color = np.array([48, 30, 78], dtype=np.float32)       # royal cosmic violet
bottom_color = np.array([30, 22, 52], dtype=np.float32)    # deep twilight purple
center_glow = np.array([105, 58, 155], dtype=np.float32)    # vibrant magenta-violet nebula

for c in range(3):
    arr[:, :, c] = top_color[c] * (1.0 - y / H) + bottom_color[c] * (y / H)

cx, cy = W / 2.0, H / 2.0
r_center = np.sqrt(((x - cx) / (W * 0.45))**2 + ((y - cy) / (H * 0.55))**2)
nebula_mask = np.clip(1.0 - r_center, 0.0, 1.0) ** 1.3

for c in range(3):
    arr[:, :, c] += center_glow[c] * nebula_mask * 0.9

np.random.seed(101)
noise1 = gaussian_filter(np.random.randn(H // 20, W // 20), sigma=4)
noise1 = (noise1 - noise1.min()) / (noise1.max() - noise1.min())
noise_img1 = Image.fromarray((noise1 * 255).astype(np.uint8)).resize((W, H), Image.Resampling.BICUBIC)
noise_arr1 = np.array(noise_img1).astype(np.float32) / 255.0

left_wing = np.clip(1.0 - (x / (W * 0.42)), 0.0, 1.0) ** 1.4
right_wing = np.clip((x - W * 0.58) / (W * 0.42), 0.0, 1.0) ** 1.4
wings = left_wing + right_wing

arr[:, :, 0] += noise_arr1 * wings * 70  # Magenta/violet
arr[:, :, 1] += noise_arr1 * wings * 35  # Midtones
arr[:, :, 2] += noise_arr1 * wings * 95  # Deep blue/purple

arr = np.clip(arr, 0, 255).astype(np.uint8)
base_img = Image.fromarray(arr).convert('RGBA')

# 2. Visible 3D Perspective Chessboard Floor
floor_overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
floor_draw = ImageDraw.Draw(floor_overlay)
horizon_y = H * 0.58
vp_x = W * 0.5
num_cols = 16

y_steps = np.linspace(0.05, 1.0, 11) ** 2.0
grid_ys = [horizon_y + (H - horizon_y) * d for d in y_steps]

for r in range(len(grid_ys) - 1):
    y_top = grid_ys[r]
    y_bot = grid_ys[r+1]
    d_top = y_steps[r]
    d_bot = y_steps[r+1]
    
    for c in range(-num_cols, num_cols):
        x_tl = vp_x + c * (W * 0.065) * d_top
        x_tr = vp_x + (c + 1) * (W * 0.065) * d_top
        x_bl = vp_x + c * (W * 0.065) * d_bot
        x_br = vp_x + (c + 1) * (W * 0.065) * d_bot
        
        is_light = (r + c) % 2 == 0
        if is_light:
            alpha = int(55 * d_bot)
            fill_col = (165, 130, 215, alpha)
        else:
            alpha = int(35 * d_bot)
            fill_col = (55, 38, 85, alpha)
            
        floor_draw.polygon([(x_tl, y_top), (x_tr, y_top), (x_br, y_bot), (x_bl, y_bot)], fill=fill_col)

for i in range(-num_cols, num_cols + 1):
    bottom_x = vp_x + i * (W * 0.065)
    floor_draw.line([(vp_x, horizon_y), (bottom_x, H)], fill=(205, 170, 250, 85), width=3)

for gy in grid_ys:
    alpha = int(80 * (gy - horizon_y) / (H - horizon_y))
    floor_draw.line([(0, gy), (W, gy)], fill=(205, 170, 250, alpha), width=3)

base_img = Image.alpha_composite(base_img, floor_overlay)

# 3. Spectral Tropical Graph: Bold, Vibrant Constellation Nodes & Edges
graph_overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
graph_draw = ImageDraw.Draw(graph_overlay)

np.random.seed(777)
pts = []
for _ in range(18):
    px = np.random.uniform(W * 0.06, W * 0.30)
    py = np.random.uniform(H * 0.12, H * 0.85)
    pts.append((px, py))

for _ in range(18):
    px = np.random.uniform(W * 0.70, W * 0.94)
    py = np.random.uniform(H * 0.12, H * 0.85)
    pts.append((px, py))

for i, p1 in enumerate(pts):
    for j, p2 in enumerate(pts):
        if i < j:
            d = np.hypot(p1[0] - p2[0], p1[1] - p2[1])
            if d < 360:
                edge_alpha = int(140 * (1.0 - d / 360))
                color = (235, 200, 130, edge_alpha) if (i + j) % 3 == 0 else (210, 180, 255, edge_alpha)
                graph_draw.line([p1, p2], fill=color, width=3)

for idx, (px, py) in enumerate(pts):
    r = 7 if idx % 2 == 0 else 9
    graph_draw.ellipse([px - r*4, py - r*4, px + r*4, py + r*4], fill=(180, 140, 250, 55))
    graph_draw.ellipse([px - r*2, py - r*2, px + r*2, py + r*2], fill=(235, 195, 255, 110))
    core_color = (255, 240, 180, 240) if idx % 2 == 0 else (250, 240, 255, 250)
    graph_draw.ellipse([px - r, py - r, px + r, py + r], fill=core_color)

base_img = Image.alpha_composite(base_img, graph_overlay)

# 4. Bold Volumetric Celestial Light Rays
rays_overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
rays_draw = ImageDraw.Draw(rays_overlay)
apex_x, apex_y = W / 2.0, H * 0.12

for angle_deg in np.linspace(-72, 72, 33):
    rad = np.radians(angle_deg + 90)
    ray_len = 1250
    end_x = apex_x + ray_len * np.cos(rad)
    end_y = apex_y + ray_len * np.sin(rad)
    ray_alpha = int(45 * np.cos(np.radians(angle_deg * 1.15)))
    rays_draw.line([(apex_x, apex_y), (end_x, end_y)], fill=(250, 220, 150, ray_alpha), width=12)

rays_overlay = rays_overlay.filter(ImageFilter.GaussianBlur(radius=18))
base_img = Image.alpha_composite(base_img, rays_overlay)

# 5. Stardust & Sparkles
stars_overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
stars_draw = ImageDraw.Draw(stars_overlay)
for _ in range(130):
    sx = np.random.uniform(0, W)
    sy = np.random.uniform(0, H)
    sr = np.random.uniform(1.5, 4.5)
    s_alpha = np.random.randint(110, 245)
    color = (255, 255, 255, s_alpha) if np.random.rand() > 0.35 else (255, 225, 140, s_alpha)
    stars_draw.ellipse([sx - sr, sy - sr, sx + sr, sy + sr], fill=color)

base_img = Image.alpha_composite(base_img, stars_overlay)

# 6. Dark Focal Halo behind Logo
halo = Image.new('RGBA', (W, H), (0, 0, 0, 0))
halo_draw = ImageDraw.Draw(halo)
halo_draw.ellipse([cx - 430, cy - 480, cx + 430, cy + 460], fill=(28, 18, 48, 195))
halo = halo.filter(ImageFilter.GaussianBlur(radius=70))
base_img = Image.alpha_composite(base_img, halo)

# 7. Paste Clean Logo
data = subprocess.check_output(['git', 'show', '4b8fc77:src/content/projects/heavens-gate/cover.png'])
orig = Image.open(io.BytesIO(data))
bbox = orig.getbbox()
logo = orig.crop(bbox)

target_h = 1040
target_w = int(logo.width * (target_h / logo.height))
scaled_logo = logo.resize((target_w, target_h), Image.Resampling.LANCZOS)
pos_x = (W - target_w) // 2
pos_y = (H - target_h) // 2

arch_glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
arch_glow_draw = ImageDraw.Draw(arch_glow)
arch_glow_draw.ellipse(
    [pos_x + target_w * 0.08, pos_y + target_h * 0.04, pos_x + target_w * 0.92, pos_y + target_h * 0.88],
    fill=(250, 205, 120, 65)
)
arch_glow = arch_glow.filter(ImageFilter.GaussianBlur(radius=80))
base_img = Image.alpha_composite(base_img, arch_glow)

base_img.paste(scaled_logo, (pos_x, pos_y), scaled_logo)

# 8. Framing Border
border_draw = ImageDraw.Draw(base_img)
border_draw.rectangle([0, 0, W - 1, H - 1], outline=(120, 95, 160, 240), width=4)
inset = 32
border_draw.rectangle([inset, inset, W - inset, H - inset], outline=(160, 125, 205, 130), width=3)
c_len = 50
for cx_c, cy_c in [(inset, inset), (W - inset, inset), (inset, H - inset), (W - inset, H - inset)]:
    dx = 1 if cx_c == inset else -1
    dy = 1 if cy_c == inset else -1
    border_draw.line([(cx_c, cy_c), (cx_c + dx * c_len, cy_c)], fill=(245, 215, 150, 240), width=4)
    border_draw.line([(cx_c, cy_c), (cx_c, cy_c + dy * c_len)], fill=(245, 215, 150, 240), width=4)

out_rgb = base_img.convert('RGB')
out_rgb.save('src/content/projects/heavens-gate/cover.png', quality=95)
print('Cover generated successfully!')
