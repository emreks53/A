"""kelimeler.json (MMS_FA zorunlu hizalama) -> engine/timing.js
Kelime zamanları, cümle/ifade blokları ve anlam alt yazısı (gloss) zamanlamaları."""
import json, os
D = os.path.dirname(os.path.abspath(__file__)) + '/..'
W = json.load(open(f'{D}/audio/kelimeler.json'))
words = [dict(w=x['w'], s=x['s'], e=x['e']) for x in W]

def find(seq, start=0):
    """seq: list of word strings (prefix match, punctuation-insensitive). returns index"""
    import re
    n = lambda s: re.sub(r"[^\wâîûçğıöşüÂÎÛÇĞİÖŞÜ'-]", '', s).lower()
    for i in range(start, len(words) - len(seq) + 1):
        if all(n(words[i + k]['w']).startswith(n(seq[k])) for k in range(len(seq))):
            return i
    raise ValueError(seq)

# Ifadeler (konuşmadaki doğal bloklar)
PHRASES = [
 "Hem anlarsın ki", "şu dünyadaki tezyinat,", "yalnız telezzüz", "veya tenezzüh için değil.",
 "Çünkü bir zaman lezzet verse,", "firakıyla", "birçok zaman elem verir.",
 "Sana tattırır,", "iştihanı açar", "fakat doyurmaz.",
 "Çünkü ya onun ömrü kısa,", "ya senin ömrün kısadır.", "Doymaya kâfi değil.",
 "Demek kıymeti yüksek,", "müddeti kısa olan", "şu tezyinat;", "ibret içindir,",
 "Hâşiye.",
 "Evet, madem her şeyin kıymeti", "ve dekaik-ı sanatı", "gayet yüksek ve güzel olduğu halde", "müddeti kısa, ömrü azdır.",
 "Demek, o şeyler numunelerdir,", "başka şeylerin suretleri hükmündedirler.",
 "Ve madem müşterilerin nazarlarını,", "asıllarına çeviriyorlar gibi bir vaziyet vardır.",
 "Öyle ise elbette", "şu dünyadaki o çeşit tezyinat,", "bir Rahman-ı Rahîm'in rahmetiyle,",
 "sevdiği ibadına hazırladığı", "niam-ı cennetin numuneleridir,", "denilebilir", "ve denilir", "ve öyledir.",
 "şükür içindir,", "usûl-ü daimîsine teşvik içindir.", "Başka gayet ulvi gayeler içindir.",
]
phrases = []; i = 0
for p in PHRASES:
    toks = p.split(); j = find(toks, i)
    phrases.append(dict(text=p, s=words[j]['s'], e=words[j + len(toks) - 1]['e'], w0=j, w1=j + len(toks) - 1)); i = j + len(toks)

# Anlam alt yazıları: (okunan ifade, gösterilecek günümüz Türkçesi karşılığı)
GLOSS = [
 ("tezyinat,", "süslemeler"), ("telezzüz", "lezzet alma"), ("tenezzüh", "gezinti"),
 ("firakıyla", "ayrılmasıyla"), ("elem", "acı"), ("tezyinat;", "süslemeler"),
 ("dekaik-ı sanatı", "sanat incelikleri"), ("suretleri", "görüntüleri"), ("nazarlarını,", "bakışlarını"),
 ("tezyinat,", "süslemeler"), ("Rahman-ı Rahîm'in", "sonsuz merhametli ve şefkatli\nolan Allah’ın"),
 ("ibadına", "kullarına"), ("niam-ı cennetin", "cennet nimetlerinin"), ("usûl-ü daimîsine", "daimî asıllarına"),
]
gl = []; i = 0
for src, mean in GLOSS:
    toks = src.split(); j = find(toks, i)
    gl.append(dict(src=src.strip(',;'), text=mean, ws=words[j]['s'], we=words[j + len(toks) - 1]['e'])); i = j + len(toks)
for g in gl:
    g['in'] = round(g['ws'] - 0.08, 3)
OUT_FADE = 0.28   # engine/core.js: E.gloss.outDur — bir sonraki alt yazı, öncekinin silinmesi bitmeden başlamaz
SINIR = {'elem': 11.30, ('tezyinat', 1): 27.05, 'nazarlarını': 45.40}  # (kelime, kaçıncı geçiş) ya da kelime   # "acı": yükselen kâse alt yazı bandına girmeden kaybolsun (C→D devri)
for k, g in enumerate(gl):
    nxt = gl[k + 1]['in'] if k + 1 < len(gl) else 1e9
    want = max(g['we'] + 1.05, g['in'] + 1.5 + 0.035 * len(g['text']))  # okunabilirlik
    nth = sum(1 for x in gl[:k] if x['src'] == g['src'])
    want = min(want, SINIR.get((g['src'], nth), SINIR.get(g['src'], 1e9)))
    g['out'] = round(min(want, nxt - OUT_FADE - 0.04), 3)

END_VOICE = words[-1]['e']
DUR = round(END_VOICE + 4.0, 2)
js = "// Otomatik üretildi: tools/make_timing.py (kaynak: audio/kelimeler.json, MMS_FA zorunlu hizalama)\n"
js += "window.TIMING = " + json.dumps(dict(duration=DUR, voiceEnd=END_VOICE, words=words, phrases=phrases, glosses=gl), ensure_ascii=False, indent=1) + ";\n"
open(f'{D}/engine/timing.js', 'w').write(js)
for p in phrases: print(f"{p['s']:6.2f}-{p['e']:6.2f}  {p['text']}")
print('---')
for g in gl: print(f"{g['in']:6.2f}-{g['out']:6.2f}  {g['src']} -> {g['text']}")
print('duration', DUR)
