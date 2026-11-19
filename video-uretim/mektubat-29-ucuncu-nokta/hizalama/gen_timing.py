import json
OFF = 1.52
al = json.load(open('align.json'))
words = [{'w': w['w'], 's': round(w['s'] - OFF, 3), 'e': round(w['e'] - OFF, 3)} for w in al[2:]]
for w in words:
    if w['w'] == 'elhamdülillahi': w['s'] = round(53.34 - OFF, 3)
def idx(word, nth=1):
    k = 0
    for i, w in enumerate(words):
        if w['w'] == word:
            k += 1
            if k == nth: return i
    raise KeyError(word)
G = [
 (idx('darülhikmettir'), idx('darülhikmettir'), 'hikmet yeridir'),
 (idx('darülhizmettir'), idx('darülhizmettir'), 'hizmet yeridir'),
 (idx('darülücret'), idx('mükafat'), 'ücret ve ödül yeri'),
 (idx('amal', 1), idx('amal', 1), 'ameller'),
 (idx('berzahta', 1), idx('berzahta', 1), 'dünya ile âhiret arasında'),
 (idx('amal', 2), idx('amal', 2), 'ameller'),
 (idx('berzahta', 2), idx('berzahta', 2), 'dünya ile âhiret arasında'),
 (idx('amali'), idx('uhreviyeye'), 'âhiret için yapılan amellere'),
 (idx('mahzunane'), idx('mahzunane'), 'hüzünle'),
 (idx('baki', 1), idx('baki', 1), 'kalıcı'),
 (idx('ameli'), idx('uhrevi'), 'âhiret için yapılan amel'),
 (idx('fani'), idx('fani'), 'sonlu'),
 (idx('karı'), idx('akıl'), 'akıl kârı'),
 (idx('baki', 2), idx('baki', 2), 'kalıcı'),
 (idx('mübadele'), idx('etmek', 2), 'değiştirmek'),
 (idx('ehli'), idx('velayet'), 'veliler'),
 (idx('meşakkat'), idx('meşakkat'), 'zahmet'),
 (idx('külfeti'), idx('külfeti'), 'yükü'),
 (idx('şekva'), idx('etmiyorlar'), 'şikâyet etmiyorlar'),
 (idx('elhamdülillahi'), idx('halin'), "her durumda Allah'a hamd olsun"),
]
gl = []
for k, (a, b, txt) in enumerate(G):
    on = words[a]['s']; wend = words[b]['e']
    nxt = words[G[k+1][0]]['s'] if k + 1 < len(G) else 99
    end = min(nxt - 0.08, max(on + 1.6, wend + 1.0))
    if txt.startswith('her durumda'): end = 54.35
    gl.append({'text': txt.replace("'", "’"), 'on': round(on, 3), 'off': round(end, 3), 'word': ' '.join(w['w'] for w in words[a:b+1])})
for g in gl: print(f"{g['on']:7.3f}-{g['off']:7.3f}  {g['word']:<22} -> {g['text']}")
js = "// generated from wav2vec2 CTC forced alignment; times are VIDEO seconds (first %.2f s of the recording, 'Üçüncü Nokta', is cut)\n" % OFF
js += "export const AUDIO_OFFSET = %.3f;\n" % OFF
js += "export const WORDS = " + json.dumps(words, ensure_ascii=False) + ";\n"
js += "export const GLOSSES = " + json.dumps(gl, ensure_ascii=False, indent=1) + ";\n"
js += """/** onset of the n-th occurrence (1-based) of a word (alignment spelling, e.g. 'mübadele', 'baki') */
export function on(word, n = 1) { let k = 0; for (const w of WORDS) if (w.w === word && ++k === n) return w.s; throw new Error('no word ' + word); }
export function off(word, n = 1) { let k = 0; for (const w of WORDS) if (w.w === word && ++k === n) return w.e; throw new Error('no word ' + word); }
"""
open('../engine/timing.js', 'w').write(js)
print(len(words), 'words; last', words[-1])
print(' '.join(f"{w['w']}@{w['s']:.2f}" for w in words))
