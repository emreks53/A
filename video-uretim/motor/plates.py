"""Render background plates for every shot in the shot table (parallel)."""
import json, os, sys, hashlib
from multiprocessing import Pool
from common import *
import bg

PLATES = ROOT + '/plates'
os.makedirs(PLATES, exist_ok=True)


def plate_spec(s, pre, post):
    dur = s['end'] - s['start'] + pre + post
    spec = dict(src=s['src'], t_in=max(0.0, s.get('t_in', 0.0) - pre * s.get('speed', 1.0)), dur=dur,
                speed=s.get('speed', 1.0), cx=s.get('cx', 0.5), cy=s.get('cy', 0.5),
                z0=s.get('z0', 1.0), z1=s.get('z1', 1.08), dx=s.get('dx', 0), dy=s.get('dy', 0),
                rot0=s.get('rot0', 0), rot1=s.get('rot1', 0), flip=s.get('flip', False),
                ease=s.get('ease', 'inout'))
    if 'sharpen' in s:
        spec['sharpen'] = s['sharpen']
    return spec


def _job(args):
    sid, spec, out = args
    key = hashlib.md5(json.dumps(spec, sort_keys=True).encode()).hexdigest()[:10]
    stamp = out + '.key'
    if os.path.exists(out) and os.path.exists(stamp) and open(stamp).read() == key:
        return sid, 'cached'
    if spec['src'].endswith('.png') or spec['src'].endswith('.jpg'):
        import still25d
        still25d.render(spec, out)
    else:
        bg.render_shot(spec, out)
    open(stamp, 'w').write(key)
    return sid, 'rendered'


def build(shots, procs=3):
    jobs = []
    for k, s in enumerate(shots):
        pre = s.get('trans', {}).get('dur', 0) / 2 if k > 0 else 0
        post = shots[k + 1].get('trans', {}).get('dur', 0) / 2 if k + 1 < len(shots) else 0
        out = f"{PLATES}/{s['id']}.mp4"
        s['plate'] = out
        jobs.append((s['id'], plate_spec(s, pre, post), out))
    with Pool(procs) as p:
        for sid, st in p.imap_unordered(_job, jobs):
            print(sid, st, flush=True)
    return shots
