"""Splice partial re-renders into a full scene clip (frame-exact).
Partial renders must be made on the clip's frame grid, e.g.
  node tools/render.mjs --scene s05 --video --scale 1.0 --final --quality 0.97 --from 1.2 --to 2.4 --out out/parts/s05_a.mp4
Usage: python3 tools/splice.py --clip out/clips_v2/s05.mp4 out/parts/s05_a.mp4 [more parts...]
The original clip is kept as <clip>.bak.mp4; the spliced clip replaces it (same frame count, same metadata)."""
import json, os, shutil, subprocess, sys

args = sys.argv[1:]
clip = args[args.index('--clip') + 1]
parts = [a for i, a in enumerate(args) if not a.startswith('--') and (i == 0 or args[i - 1] != '--clip')]
cm = json.load(open(clip + '.json')); fps = cm['fps']; N = cm['frames']

def nframes(f):
    out = subprocess.run(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', f], capture_output=True, text=True).stdout.strip()
    return int(out)

assert nframes(clip) == N, 'clip frame count mismatch'
segs = []  # (k0, k1, part)
for p in parts:
    pm = json.load(open(p + '.json')); assert pm['scene'] == cm['scene'] and pm['fps'] == fps
    k0f = (pm['from'] - cm['from']) * fps; k0 = round(k0f)
    assert abs(k0f - k0) < 1e-3, f'{p}: from={pm["from"]} is not on the clip frame grid'
    n = nframes(p); assert n == pm['frames'], f'{p}: frame count mismatch'
    assert 0 <= k0 and k0 + n <= N, f'{p}: outside clip'
    segs.append((k0, k0 + n, p))
segs.sort()
for a, b in zip(segs, segs[1:]): assert a[1] <= b[0], 'overlapping parts'

inputs = ['-i', clip]; filt = []; labels = []; cur = 0
for j, (k0, k1, p) in enumerate(segs, start=1):
    inputs += ['-i', p]
    if k0 > cur: filt.append(f'[0:v]trim=start_frame={cur}:end_frame={k0},setpts=PTS-STARTPTS[o{len(labels)}]'); labels.append(f'[o{len(labels)}]')
    filt.append(f'[{j}:v]setpts=PTS-STARTPTS[o{len(labels)}]'); labels.append(f'[o{len(labels)}]'); cur = k1
if cur < N: filt.append(f'[0:v]trim=start_frame={cur}:end_frame={N},setpts=PTS-STARTPTS[o{len(labels)}]'); labels.append(f'[o{len(labels)}]')
filt.append(''.join(labels) + f'concat=n={len(labels)}:v=1:a=0,fps={fps}[v]')
tmp = clip + '.splice.mp4'
subprocess.run(['ffmpeg', '-y', '-v', 'error', *inputs, '-filter_complex', ';'.join(filt), '-map', '[v]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '12', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', tmp], check=True)
assert nframes(tmp) == N, 'spliced frame count mismatch'
bak = clip[:-4] + '.bak.mp4'
if not os.path.exists(bak): shutil.copy2(clip, bak)
os.replace(tmp, clip)
print(f'spliced {len(segs)} part(s) into {clip}: frames ' + ', '.join(f'{a}-{b - 1}' for a, b, _ in segs))
