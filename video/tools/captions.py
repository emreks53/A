"""Word-synced Shorts-style subtitles (ASS) from data/words.json -> out/captions.ass
Phrases of a few words; the word being spoken is highlighted (gold, slight pop)."""
import json, os, re

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
words = json.load(open(os.path.join(ROOT, 'data/words.json')))

MAX_CHARS = 26      # per phrase (~1-2 lines at this size)
GAP_SPLIT = 0.33    # pause that forces a new phrase
WHITE, GOLD, OUTLINE = '&H00FFFFFF', '&H007AD2FF', '&H00201410'   # ASS colors are &HAABBGGRR

# Hand-authored phrase breaks (semantic), consumed sequentially over data/words.json.
PHRASES = """Allah Efendimiz
aleyhissalatü vesselama
bine yakın mu'cize vermiş
ve en büyük ve parlağını
Kur'an kılmıştır.
Resul-i Ekrem
aleyhissalatü vesselamın
Kur'an'dan sonraki
en büyük mu'cizesi ise,
kendi zatıdır.
Dostlarının dışında
düşmanları dahi
onun şahsında gözüken,
üstün ve yetişilemeyen
ahlaka şahittirler.
Mesela kendisine
düşman olan
pek çok müşrikler
emanetlerini
o kadar kişi arasından
Peygamberimiz
aleyhissalatü vesselama
emanet ederlerdi.
Hem Hazret-i Ali gibi
cesarette benzersiz
bir zat bile,
savaşın şiddetli anlarında
Resulullah
aleyhissalatü vesselamın
arkasına sığındıklarını
defalarca ifade etmiş.
Bu iki damla gibi olan
iki örnek
o deniz gibi
Ahlak-ı Âliyenin
iki damlası
ve iki misalidir.
Hem mesela
dürüstlükte
en yüksek derecede
olduğu gibi;
merhamette,
samimiyette,
adalette,
güvenilirlikte,
tevazuda,
vefada,
sabırda,
saygıda,
affedicilikte,
nezakette,
kanaatkârlıkta,
hoşgörüde,
diğerkâmlıkta,
yardımseverlikte
ve diğer bütün
güzel ahlak özelliklerinde;
tarihin şehadetiyle,
düşmanları bile
kabul ediyor ki
en yüksek ve
yetişilemeyecek
derecedeydi.
Şu ana kadar yazılmış
başta Şifa-i Şerif gibi
çok kitaplar
yüzlerce ciltlerle
bu "yüksek ahlak"
mu'cizesini
beyan ve ispat etmiştir.
Dünya çapında
büyük düşünürler de
Peygamberimizin ahlakını
kabul etmişler.
Döneminin en önemli
düşünürlerinden olan
filozof Thomas Carlyle
ve çağının
en büyüklerinden olan
İngiliz tarihçi
Edward Gibbon;
yazdıkları eserleriyle
bu hakikati ifade eden
Batılı düşünürlerden
yalnızca iki örnektir.
Daha bunlar gibi
birçok düşünür
Peygamberimiz
aleyhissalatü vesselamın
ahlakına hayran kalmıştır.
Bu tatlı hakikatten
Mektubat kitabının
195. sayfasında
ve 19. Söz gibi
başka risalelerde
çok hoş ve etraflıca
bahsedilmiştir.""".split("\n")
phrases, k = [], 0
for line in PHRASES:
    n = len(line.split())
    ph = words[k:k + n]
    assert [w['w'] for w in ph] == line.split(), (line, [w['w'] for w in ph])
    phrases.append(ph); k += n
assert k == len(words), (k, len(words))

def ts(t):
    t = max(0, t); h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60
    return f'{h}:{m:02d}:{s:05.2f}'

def clean(w):  # display form (strip quotes, keep punctuation light)
    return w.replace('"', '').replace('“', '').replace('”', '')

events = []
for pi, ph in enumerate(phrases):
    p_start = ph[0]['s'] - 0.08
    nxt = phrases[pi + 1][0]['s'] - 0.08 if pi + 1 < len(phrases) else ph[-1]['e'] + 0.8
    p_end = min(ph[-1]['e'] + 0.45, nxt)
    for k, w in enumerate(ph):
        a = p_start if k == 0 else w['s']
        b = ph[k + 1]['s'] if k + 1 < len(ph) else p_end
        if b <= a: continue
        parts = []
        for j, x in enumerate(ph):
            tw = clean(x['w'])
            if j == k:
                parts.append(r'{\c' + GOLD + r'&\fscx106\fscy106\t(0,90,\fscx100\fscy100)}' + tw + r'{\c' + WHITE + r'&\fscx100\fscy100}')
            else:
                parts.append(tw)
        intro = r'{\fad(90,0)\fscx92\fscy92\t(0,120,\fscx100\fscy100)}' if k == 0 else ''
        outro = r'{\fad(0,120)}' if k == len(ph) - 1 else ''
        events.append((a, b, intro + outro + ' '.join(parts)))

head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.709

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Nunito Black,68,{WHITE},{WHITE},{OUTLINE},&H96000000,0,0,0,0,100,100,0.5,0,1,5.5,3,2,110,110,430,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
out = os.path.join(ROOT, 'out/captions.ass'); os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, 'w', encoding='utf-8') as f:
    f.write(head)
    for a, b, txt in events:
        f.write(f'Dialogue: 0,{ts(a)},{ts(b)},Cap,,0,0,0,,{txt}\n')
print(len(phrases), 'phrases,', len(events), 'events ->', out)
for ph in phrases[:60]:
    print(f"{ph[0]['s']:7.2f}  {' '.join(x['w'] for x in ph)}")

# Also export phrases for the canvas caption renderer (tools/render_captions.mjs)
json.dump([[{'w': clean(x['w']), 's': x['s'], 'e': x['e']} for x in ph] for ph in phrases],
          open(os.path.join(ROOT, 'data/phrases.json'), 'w'), ensure_ascii=False)
