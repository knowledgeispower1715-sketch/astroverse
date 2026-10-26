import math
import os
from PIL import Image, ImageDraw, ImageFont

os.makedirs('apps/mobile/assets', exist_ok=True)

def draw_starfield(draw, width, height, count=120):
    import random
    random.seed(42)
    for _ in range(count):
        x = random.randint(0, width)
        y = random.randint(0, height)
        size = random.choice([1, 2, 3])
        alpha = random.randint(120, 240)
        draw.ellipse([x, y, x + size, y + size], fill=(255, 255, 255, alpha))

def draw_dharmachakra(draw, cx, cy, radius, gold_color=(245, 158, 11), spoke_count=12):
    # Outer decorative ring
    draw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], outline=gold_color, width=max(2, int(radius * 0.04)))
    
    # Second inner ring
    r2 = radius * 0.85
    draw.ellipse([cx - r2, cy - r2, cx + r2, cy + r2], outline=(198, 161, 91), width=max(1, int(radius * 0.02)))
    
    # 12 Spokes
    for i in range(spoke_count):
        angle = i * (2 * math.pi / spoke_count)
        x1 = cx + (r2 * 0.25) * math.cos(angle)
        y1 = cy + (r2 * 0.25) * math.sin(angle)
        x2 = cx + r2 * math.cos(angle)
        y2 = cy + r2 * math.sin(angle)
        draw.line([x1, y1, x2, y2], fill=gold_color, width=max(2, int(radius * 0.025)))
        
        # Outer dot per spoke
        dot_r = max(2, int(radius * 0.03))
        dx = cx + (radius * 0.92) * math.cos(angle)
        dy = cy + (radius * 0.92) * math.sin(angle)
        draw.ellipse([dx - dot_r, dy - dot_r, dx + dot_r, dy + dot_r], fill=(253, 230, 138))

    # Center Hub
    hub_r = radius * 0.22
    draw.ellipse([cx - hub_r, cy - hub_r, cx + hub_r, cy + hub_r], fill=(136, 19, 55), outline=gold_color, width=max(2, int(radius * 0.03)))
    inner_hub = hub_r * 0.5
    draw.ellipse([cx - inner_hub, cy - inner_hub, cx + inner_hub, cy + inner_hub], fill=gold_color)

# 1. ICON (1024x1024)
icon = Image.new('RGB', (1024, 1024), color='#0A1020')
icon_draw = ImageDraw.Draw(icon)
# Gradient simulation
for y in range(1024):
    ratio = y / 1024.0
    r = int(10 + (28 - 10) * ratio)
    g = int(16 + (11 - 16) * ratio)
    b = int(32 + (18 - 32) * ratio)
    icon_draw.line([(0, y), (1024, y)], fill=(r, g, b))

draw_starfield(icon_draw, 1024, 1024, count=80)
draw_dharmachakra(icon_draw, 512, 512, radius=380)
icon.save('apps/mobile/assets/icon.png', 'PNG')
print("Created apps/mobile/assets/icon.png (1024x1024)")

# 2. ADAPTIVE ICON (1024x1024) with safe zone
adaptive = Image.new('RGBA', (1024, 1024), color=(15, 23, 42, 255))
adaptive_draw = ImageDraw.Draw(adaptive)
draw_starfield(adaptive_draw, 1024, 1024, count=60)
# Inside Android safe zone (diameter ~600px)
draw_dharmachakra(adaptive_draw, 512, 512, radius=280)
adaptive.save('apps/mobile/assets/adaptive-icon.png', 'PNG')
print("Created apps/mobile/assets/adaptive-icon.png (1024x1024)")

# 3. SPLASH (2048x2048)
splash = Image.new('RGB', (2048, 2048), color='#0F172A')
splash_draw = ImageDraw.Draw(splash)
for y in range(2048):
    ratio = y / 2048.0
    r = int(15 + (25 - 15) * ratio)
    g = int(23 + (15 - 23) * ratio)
    b = int(42 + (25 - 42) * ratio)
    splash_draw.line([(0, y), (2048, y)], fill=(r, g, b))

draw_starfield(splash_draw, 2048, 2048, count=180)
draw_dharmachakra(splash_draw, 1024, 900, radius=420)
splash.save('apps/mobile/assets/splash.png', 'PNG')
print("Created apps/mobile/assets/splash.png (2048x2048)")

# 4. FAVICON (48x48)
favicon = icon.resize((48, 48), Image.Resampling.LANCZOS)
favicon.save('apps/mobile/assets/favicon.png', 'PNG')
print("Created apps/mobile/assets/favicon.png (48x48)")
