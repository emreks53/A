"""Full render: timeline -> N parallel chunks -> concat -> mux with the mix."""
import json, os, sys, subprocess, time
from multiprocessing import Pool
from common import *
import build, mix

OUT = ROOT + '/renders'


def _chunk(args):
    tl, f0, f1, path, crf = args
    subprocess.run(['python3', 'compose.py', 'range', tl, str(f0), str(f1), path, str(crf)], check=True,
                   cwd=os.path.dirname(os.path.abspath(__file__)))
    return path


def main(name='final', procs=4, crf=14, total=None):
    tl = build.build(procs=3)
    total = total or tl['duration']
    nfr = int(round(total * FPS))
    # split near shot boundaries
    cuts = [0]
    target = nfr / procs
    bounds = sorted(int(round(s['start'] * FPS)) for s in tl['shots'])
    for k in range(1, procs):
        want = int(target * k)
        best = min(bounds, key=lambda b: abs(b - want))
        cuts.append(best)
    cuts.append(nfr)
    cuts = sorted(set(cuts))
    jobs = []
    for i in range(len(cuts) - 1):
        jobs.append((ROOT + '/timeline.json', cuts[i], cuts[i + 1], f'{OUT}/{name}_part{i}.mp4', crf))
    t0 = time.time()
    with Pool(len(jobs)) as p:
        parts = p.map(_chunk, jobs)
    print('chunks done', time.time() - t0)
    lst = f'{OUT}/{name}_list.txt'
    open(lst, 'w').write(''.join(f"file '{x}'\n" for x in parts))
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy',
                    f'{OUT}/{name}_video.mp4'], check=True)
    mix.make(total)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'{OUT}/{name}_video.mp4', '-i', ROOT + '/audio/mix.wav',
                    '-filter_complex', f'[1:a]volume=-1.5dB,afade=t=out:st={total - 1.2:.2f}:d=1.2[a]', '-map', '0:v', '-map', '[a]',
                    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-movflags', '+faststart',
                    '-t', f'{total:.3f}', f'{OUT}/{name}.mp4'], check=True)
    print('DONE', f'{OUT}/{name}.mp4', time.time() - t0)


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'final', procs=int(sys.argv[2]) if len(sys.argv) > 2 else 4,
         crf=int(sys.argv[3]) if len(sys.argv) > 3 else 14)
