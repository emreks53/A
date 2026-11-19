# -*- coding: utf-8 -*-
import os, pickle, time

HERE = os.path.dirname(os.path.abspath(__file__))
CDIR = os.path.join(HERE, 'cache')
os.makedirs(CDIR, exist_ok=True)


def cached(name, fn, force=False):
    p = os.path.join(CDIR, name + '.pkl')
    if os.path.exists(p) and not force:
        with open(p, 'rb') as f:
            return pickle.load(f)
    t = time.time()
    obj = fn()
    with open(p, 'wb') as f:
        pickle.dump(obj, f, protocol=5)
    print(f'[cache] {name} kuruldu ({time.time() - t:.1f} sn)', flush=True)
    return obj
