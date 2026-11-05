import json, subprocess, numpy as np, sys
from common import ROOT
import shots, cues, sfx

def make(total=139.3):
    sh = shots.shot_table()
    env = np.load(ROOT + '/audio/env30.npy')
    sfx.render(cues.cues(sh), total, env, ROOT + '/audio/sfx_bus.wav')
    # voice: 48k stereo, padded; sfx bus already quiet; final true-peak limit
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', ROOT + '/audio/voice.mp3', '-i', ROOT + '/audio/sfx_bus.wav',
                    '-filter_complex',
                    f'[0:a]aresample=48000,pan=stereo|c0=c0|c1=c1,apad=whole_dur={total}[v];'
                    f'[1:a]aresample=48000,atrim=0:{total}[s];'
                    f'[v][s]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.89:attack=3:release=60[o]',
                    '-map', '[o]', '-c:a', 'pcm_s24le', '-t', str(total), ROOT + '/audio/mix.wav'], check=True)

if __name__ == '__main__':
    make(float(sys.argv[1]) if len(sys.argv) > 1 else 139.3)
