import json, sys
from common import *
import shots, plates, events

def build(procs=3, upto=None):
    sh = shots.shot_table()
    if upto:
        sh = [s for s in sh if s['start'] < upto]
    sh = plates.build(sh, procs=procs)
    g = json.load(open(ROOT + '/audio/glosses_timed.json'))
    tl = dict(shots=sh, gfx=events.events(), glosses=[dict(t=x['t'], gloss=x['gloss'], phrase=x['phrase'], pend=x['pend']) for x in g],
              env=ROOT + '/audio/env30.npy', fade_in=0.45,
              duration=sh[-1]['end'], fade_out_start=sh[-1]['end'] - 0.9)
    json.dump(tl, open(ROOT + '/timeline.json', 'w'), ensure_ascii=False, indent=1)
    return tl

if __name__ == '__main__':
    build(upto=float(sys.argv[1]) if len(sys.argv) > 1 else None)
