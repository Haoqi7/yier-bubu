import os, shutil
from PIL import Image

src_dir = os.path.join(os.path.dirname(__file__), 'assets', '素材')
base = os.path.dirname(__file__)

files = os.listdir(src_dir)
png_files = [f for f in files if f.endswith('.png')]

targets = {}
for f in png_files:
    if 'yier' not in f.lower() and '一二' not in f and '布布' not in f:
        continue
    if 'idle' in f or '发呆' in f:
        if '一二' in f:
            targets[f] = os.path.join(base, 'assets', 'yier', 'idle')
    elif 'walk' in f or '走路' in f:
        if '一二' in f:
            targets[f] = os.path.join(base, 'assets', 'yier', 'walk')
        elif '布布' in f:
            targets[f] = os.path.join(base, 'assets', 'bubu', 'walk')
    elif 'stare' in f or '盯' in f or '看' in f:
        if '布布' in f:
            targets[f] = os.path.join(base, 'assets', 'bubu', 'stare_at_cursor')

print(f"Found {len(targets)} source images:")
for k, v in targets.items():
    print(f"  {k} -> {v}")

for fname, out_dir in targets.items():
    src = os.path.join(src_dir, fname)
    img = Image.open(src).convert('RGBA')
    w, h = img.size
    print(f"\n=== {fname} ({w}x{h}) ===")

    gray = img.convert('L')
    pixels = list(gray.getdata())

    h_black = []
    for y in range(h):
        row_black = sum(1 for x in range(w) if pixels[y * w + x] < 30)
        if row_black > w * 0.6:
            h_black.append(y)

    v_black = []
    for x in range(w):
        col_black = sum(1 for y in range(h) if pixels[y * w + x] < 30)
        if col_black > h * 0.6:
            v_black.append(x)

    def find_centers(black_list, total_dim):
        if not black_list:
            return []
        margin = max(total_dim // 20, 10)
        filtered = [p for p in black_list if margin < p < total_dim - margin]
        if not filtered:
            return []
        groups = []
        start = filtered[0]
        end = filtered[0]
        for i in range(1, len(filtered)):
            if filtered[i] - filtered[i-1] <= 10:
                end = filtered[i]
            else:
                groups.append((start + end) // 2)
                start = filtered[i]
                end = filtered[i]
        groups.append((start + end) // 2)
        return groups

    h_splits = find_centers(h_black, h)
    v_splits = find_centers(v_black, w)

    print(f"  h_black rows: {len(h_black)}, splits: {h_splits}")
    print(f"  v_black cols: {len(v_black)}, splits: {v_splits}")

    if h_splits and v_splits:
        sy = h_splits[0]
        sx = v_splits[0]
    else:
        sy = h // 2
        sx = w // 2
        print(f"  WARNING: no split lines found, using center ({sx}, {sy})")

    boxes = [
        (0, 0, sx, sy),
        (sx, 0, w, sy),
        (0, sy, sx, h),
        (sx, sy, w, h),
    ]

    os.makedirs(out_dir, exist_ok=True)
    for i, box in enumerate(boxes):
        frame = img.crop(box)
        out_path = os.path.join(out_dir, f'frame_{i+1:03d}.png')
        frame.save(out_path, 'PNG')
        print(f"  frame_{i+1:03d}.png: box={box} size={frame.size}")

print("\nDONE")
