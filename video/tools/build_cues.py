"""Merge per-scene SFX cue files (data/sfx/sNN.json) + transition cues -> data/sfx_cues.json"""
import json, os, glob
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
tl = json.load(open(os.path.join(ROOT, 'data/timeline.json')))
cues = []
for f in sorted(glob.glob(os.path.join(ROOT, 'data/sfx/s*.json'))):
    for c in json.load(open(f)):
        c['scene'] = os.path.basename(f)[:-5]; cues.append(c)
# transition whooshes on the cuts that slide/blur (soft, under the voice)
TRANS_SFX = {'s07': ('whoosh', 0.5, -5), 's12': ('whoosh', 0.7, -4), 's16': ('whoosh', 0.7, -5), 's17': ('whoosh', 0.7, -5),
             's05': ('whoosh', 0.6, -6), 's20': ('shimmer', 1.6, -6), 's02': ('shimmer', 1.4, -6)}
for s in tl['scenes']:
    if s['id'] in TRANS_SFX:
        k, d, g = TRANS_SFX[s['id']]
        cues.append({'t': round(s['start'] - d * 0.6, 2), 'dur': d, 'kind': k, 'desc': f'transition into {s["id"]}', 'gain': g, 'scene': 'trans'})
cues.sort(key=lambda c: c['t'])
json.dump(cues, open(os.path.join(ROOT, 'data/sfx_cues.json'), 'w'), ensure_ascii=False, indent=0)
print(len(cues), 'cues')
