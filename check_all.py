import os, re, sys
sys.stdout.reconfigure(encoding='utf-8')

base = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(base, 'config.js'), 'r', encoding='utf-8') as f:
    content = f.read()

yier_match = re.search(r'const YIER_STATES\s*=\s*\[([\s\S]*?)\];', content)
bubu_match = re.search(r'const BUBU_STATES\s*=\s*\[([\s\S]*?)\];', content)

def extract_ids(text):
    return re.findall(r"id:\s*'([^']+)'", text)

yier_states = extract_ids(yier_match.group(1)) if yier_match else []
bubu_states = extract_ids(bubu_match.group(1)) if bubu_match else []

img_match = re.search(r'const IMAGE_CONFIG\s*=\s*\{([\s\S]*?)\n\};', content)
yier_img = []
bubu_img = []
if img_match:
    block = img_match.group(1)
    parts = block.split('bubu:')
    if len(parts) >= 2:
        yier_part = parts[0]
        bubu_part = parts[1]
        yier_img = re.findall(r'(\w+):\s*\{', yier_part)
        bubu_img = re.findall(r'(\w+):\s*\{', bubu_part)
        yier_img = [i for i in yier_img if i not in ('basePath', 'frameRate', 'preferredFormats')]
        bubu_img = [i for i in bubu_img if i not in ('basePath', 'frameRate', 'preferredFormats')]

def get_frames(pet):
    pet_dir = os.path.join(base, 'assets', pet)
    result = {}
    if not os.path.isdir(pet_dir):
        return result
    for s in sorted(os.listdir(pet_dir)):
        s_dir = os.path.join(pet_dir, s)
        if os.path.isdir(s_dir):
            frames = [f for f in os.listdir(s_dir) if f.startswith('frame_') and f.endswith('.png')]
            result[s] = len(frames)
    return result

yier_frames = get_frames('yier')
bubu_frames = get_frames('bubu')

print("=" * 70)
print("一 二 (yier)")
print("=" * 70)
print(f"{'状态':<22} {'定义':>4} {'图片配置':>6} {'素材帧数':>6} {'问题'}")
print("-" * 70)
all_yier = set(yier_states) | set(yier_img) | set(yier_frames.keys())
for s in sorted(all_yier):
    in_def = '✅' if s in yier_states else '❌'
    in_img = '✅' if s in yier_img else '❌'
    frames = yier_frames.get(s, 0)
    frame_str = str(frames) if frames > 0 else '无'
    problems = []
    if s not in yier_states:
        problems.append('未定义状态')
    if s not in yier_img:
        problems.append('未配置图片')
    if frames == 0:
        problems.append('无素材文件')
    elif frames not in (4, 8):
        problems.append(f'帧数异常({frames})')
    prob_str = ' | '.join(problems) if problems else '✅正常'
    print(f"  {s:<20} {in_def:>4} {in_img:>8} {frame_str:>6}   {prob_str}")

print()
print("=" * 70)
print("布 布 (bubu)")
print("=" * 70)
print(f"{'状态':<22} {'定义':>4} {'图片配置':>6} {'素材帧数':>6} {'问题'}")
print("-" * 70)
all_bubu = set(bubu_states) | set(bubu_img) | set(bubu_frames.keys())
for s in sorted(all_bubu):
    in_def = '✅' if s in bubu_states else '❌'
    in_img = '✅' if s in bubu_img else '❌'
    frames = bubu_frames.get(s, 0)
    frame_str = str(frames) if frames > 0 else '无'
    problems = []
    if s not in bubu_states:
        problems.append('未定义状态')
    if s not in bubu_img:
        problems.append('未配置图片')
    if frames == 0:
        problems.append('无素材文件')
    elif frames not in (4, 8):
        problems.append(f'帧数异常({frames})')
    prob_str = ' | '.join(problems) if problems else '✅正常'
    print(f"  {s:<20} {in_def:>4} {in_img:>8} {frame_str:>6}   {prob_str}")

print()
print("=" * 70)
print("汇总")
print("=" * 70)
print(f"一二: {len(yier_states)} 个状态定义, {len(yier_img)} 个图片配置, {len(yier_frames)} 个素材文件夹")
print(f"布布: {len(bubu_states)} 个状态定义, {len(bubu_img)} 个图片配置, {len(bubu_frames)} 个素材文件夹")

# 有问题的
yier_issues = [s for s in sorted(all_yier) if s not in yier_states or s not in yier_img or yier_frames.get(s, 0) == 0]
bubu_issues = [s for s in sorted(all_bubu) if s not in bubu_states or s not in bubu_img or bubu_frames.get(s, 0) == 0]

print()
if yier_issues:
    print(f"一二有问题的状态: {', '.join(yier_issues)}")
else:
    print("一二全部正常")

if bubu_issues:
    print(f"布布有问题的状态: {', '.join(bubu_issues)}")
else:
    print("布布全部正常")
