"""Assemble final video: scene clips (with handles) -> transitions -> subtitles -> audio mix -> out/final.mp4
Usage: python3 tools/assemble.py [--out out/final.mp4] [--crf 18] [--nosubs] [--preview (540x960 fast)]"""
import json, os, subprocess, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
args = sys.argv[1:]
def opt(k, d=None):
    return args[args.index('--' + k) + 1] if '--' + k in args else d
tl = json.load(open(os.path.join(ROOT, 'data/timeline.json')))
S = tl['scenes']; FPS = tl['fps']; TOTAL = tl['audioDuration']
preview = '--preview' in args
W, H = (540, 960) if preview else (1080, 1920)

# transition into scene i (from scene i-1): (xfade transition name, duration)
TRANS = {
    's02': ('fadewhite', 0.6), 's03': ('fade', 0.4), 's04': ('fade', 0.4), 's05': ('zoomin', 0.5), 's06': ('fadeblack', 0.5),
    's07': ('hblur', 0.25), 's08': ('fade', 0.3), 's09': ('fadeblack', 0.5), 's10': ('fade', 0.35), 's11': ('fade', 0.4),
    's12': ('smoothleft', 0.45), 's13': ('fade', 0.5), 's14': ('fade', 0.45), 's15': ('fadeblack', 0.5), 's16': ('smoothleft', 0.45),
    's17': ('smoothleft', 0.45), 's18': ('fade', 0.4), 's19': ('fadeblack', 0.5), 's20': ('fadewhite', 0.7),
}

inputs, filters = [], []
for i, s in enumerate(S):
    clip = os.path.join(ROOT, 'out/clips', s['id'] + '.mp4')
    meta = json.load(open(clip + '.json'))
    g0 = s['start'] + meta['from']                   # global time of clip t=0
    d_in = TRANS.get(s['id'], ('fade', 0))[1] if i > 0 else 0
    d_out = TRANS.get(S[i + 1]['id'], ('fade', 0))[1] if i + 1 < len(S) else 0
    a = (s['start'] - d_in / 2) - g0
    b = (s['end'] + d_out / 2) - g0 if i + 1 < len(S) else (TOTAL - g0)
    if a < -1e-3 or b > (meta['to'] - meta['from']) + 1e-3:
        print(f"WARNING {s['id']}: needs [{a:.2f},{b:.2f}] but clip has [0,{meta['to']-meta['from']:.2f}]")
    a = max(0, a)
    inputs += ['-i', clip]
    filters.append(f"[{i}:v]trim=start={a:.4f}:end={b:.4f},setpts=PTS-STARTPTS,fps={FPS},scale={W}:{H}:flags=lanczos,format=yuv420p,setsar=1[v{i}]")

cur = 'v0'; acc = S[0]['end'] + (TRANS[S[1]['id']][1] / 2)
for i in range(1, len(S)):
    tr, d = TRANS.get(S[i]['id'], ('fade', 0.4))
    off = S[i]['start'] - d / 2
    filters.append(f"[{cur}][v{i}]xfade=transition={tr}:duration={d}:offset={off:.4f}[x{i}]"); cur = f'x{i}'

post = f"[{cur}]fade=t=in:st=0:d=0.35,fade=t=out:st={TOTAL - 0.9:.3f}:d=0.9"
if '--nosubs' not in args:
    ass = os.path.join(ROOT, 'out/captions.ass'); fonts = os.path.join(ROOT, 'assets/fonts')
    post += f",subtitles={ass}:fontsdir={fonts}" + (":original_size=1080x1920" if preview else '')
post += "[vout]"; filters.append(post)

mix = os.path.join(ROOT, opt('audio', 'out/mix.wav'))
inputs += ['-i', mix]
out = os.path.join(ROOT, opt('out', 'out/final_preview.mp4' if preview else 'out/final.mp4'))
cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-stats', *inputs, '-filter_complex', ';'.join(filters),
       '-map', '[vout]', '-map', f'{len(S)}:a', '-t', f'{TOTAL:.3f}',
       '-c:v', 'libx264', '-preset', 'veryfast' if preview else 'slow', '-crf', opt('crf', '26' if preview else '18'), '-profile:v', 'high',
       '-pix_fmt', 'yuv420p', '-r', str(FPS), '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
       '-af', f'afade=t=out:st={TOTAL - 0.9:.3f}:d=0.9', '-movflags', '+faststart', out]
print(' '.join(cmd[:8]), '...')
subprocess.run(cmd, check=True)
print('->', out)
