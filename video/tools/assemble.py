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
    's02': ('dipwhite', 0.6), 's03': ('fade', 0.4), 's04': ('fade', 0.4), 's05': ('fade', 0.45), 's06': ('dipblack', 0.5),
    's07': ('hblur', 0.25), 's08': ('fade', 0.3), 's09': ('dipblack', 0.5), 's10': ('fade', 0.35), 's11': ('fade', 0.4),
    's12': ('smoothleft', 0.45), 's13': ('fade', 0.5), 's14': ('fade', 0.45), 's15': ('dipblack', 0.5), 's16': ('smoothleft', 0.45),
    's17': ('smoothleft', 0.45), 's18': ('fade', 0.4), 's19': ('dipblack', 0.5), 's20': ('dipwhite', 0.7),
}
# Symmetric dips (ffmpeg's fadewhite/fadeblack drive the outgoing clip to the colour in ~20% of the duration -> a flash/blink).
# P runs 1 -> 0 over the transition; q = 1 - P. Underneath, a smoothstep crossfade over q 0.3-0.7; on top, a bell-shaped
# veil of colour (white peaks at 85% so it reads as a luminous dissolve, black at 100%). yuv420p limited range.
def _dip(peak, y, gamma):
    return ("st(1,1-P);st(2,clip((ld(1)-0.3)/0.4,0,1));st(2,ld(2)*ld(2)*(3-2*ld(2)));"
            f"st(3,{peak}*pow(sin(PI*ld(1)),{gamma}));(A*(1-ld(2))+B*ld(2))*(1-ld(3))+if(eq(PLANE,0),{y},128)*ld(3)")
CUSTOM = {'dipwhite': _dip(0.85, 235, 1.3), 'dipblack': _dip(1.0, 16, 0.8)}

inputs, filters = [], []
for i, s in enumerate(S):
    clip = os.path.join(ROOT, opt('clips', 'out/clips'), s['id'] + '.mp4')
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
    tspec = f"custom:expr='{CUSTOM[tr]}'" if tr in CUSTOM else tr
    filters.append(f"[{cur}][v{i}]xfade=transition={tspec}:duration={d}:offset={off:.4f}[x{i}]"); cur = f'x{i}'

post = f"[{cur}]fade=t=in:st=0:d=0.35,fade=t=out:st={TOTAL - 0.9:.3f}:d=0.9"
CANVAS_CAPS = '--canvas-captions' in args
if CANVAS_CAPS:
    # Step 1: caption-free picture -> measure luminance under the caption band -> render the caption layer
    nosubs = os.path.join(ROOT, 'out/_nosubs.mp4')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-stats', *inputs, '-filter_complex', ';'.join(filters + [post + '[vout]']), '-map', '[vout]', '-t', f'{TOTAL:.3f}', '-c:v', 'libx264', '-preset', 'medium', '-crf', '10', '-pix_fmt', 'yuv420p', '-r', str(FPS), nosubs], check=True)
    meta = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', nosubs, '-vf', 'crop=880:260:100:1360,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-', '-f', 'null', '-'], capture_output=True, text=True).stdout
    import re as _re
    luma = [round(float(v) / 255, 4) for v in _re.findall(r'YAVG=([\d.]+)', meta)]
    json.dump(luma, open(os.path.join(ROOT, 'data/caption_luma.json'), 'w'))
    subprocess.run(['node', os.path.join(ROOT, 'tools/render_captions.mjs'), '--style', opt('capstyle', 'serif'), '--video'], check=True)
    inputs = ['-i', nosubs, '-i', os.path.join(ROOT, 'out/captions_layer.mov')]
    filters = ['[0:v][1:v]overlay=0:0:format=auto,format=yuv420p[vout]']
    S = [None]  # audio input index becomes 2 below
elif '--nosubs' not in args:
    ass = os.path.join(ROOT, 'out/captions.ass'); fonts = os.path.join(ROOT, 'assets/fonts')
    post += f",subtitles={ass}:fontsdir={fonts}" + (":original_size=1080x1920" if preview else '')
if not CANVAS_CAPS:
    post += "[vout]"; filters.append(post)

mix = os.path.join(ROOT, opt('audio', 'out/mix.wav'))
inputs += ['-i', mix]
out = os.path.join(ROOT, opt('out', 'out/final_preview.mp4' if preview else 'out/final.mp4'))
cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-stats', *inputs, '-filter_complex', ';'.join(filters),
       '-map', '[vout]', '-map', f'{(2 if CANVAS_CAPS else len(S))}:a', '-t', f'{TOTAL:.3f}',
       '-c:v', 'libx264', '-preset', 'veryfast' if preview else 'slow', '-crf', opt('crf', '26' if preview else '18'), '-profile:v', 'high',
       '-pix_fmt', 'yuv420p', '-r', str(FPS), '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
       '-af', f'afade=t=out:st={TOTAL - 0.9:.3f}:d=0.9', '-movflags', '+faststart', out]
print(' '.join(cmd[:8]), '...')
subprocess.run(cmd, check=True)
print('->', out)
