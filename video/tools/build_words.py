"""Align the canonical text (as actually read) to Whisper word timings -> data/words.json"""
import json, re, difflib, os
D = os.path.join(os.path.dirname(__file__), '..', 'data')
TEXT = """Allah Efendimiz aleyhissalatü vesselama bine yakın mu'cize vermiş ve en büyük ve parlağını Kur'an kılmıştır.
Resul-i Ekrem aleyhissalatü vesselamın Kur'an'dan sonraki en büyük mu'cizesi ise, kendi zatıdır.
Dostlarının dışında düşmanları dahi onun şahsında gözüken, üstün ve yetişilemeyen ahlaka şahittirler.
Mesela kendisine düşman olan pek çok müşrikler emanetlerini o kadar kişi arasından Peygamberimiz aleyhissalatü vesselama emanet ederlerdi.
Hem Hazret-i Ali gibi cesarette benzersiz bir zat bile, savaşın şiddetli anlarında Resulullah aleyhissalatü vesselamın arkasına sığındıklarını defalarca ifade etmiş.
Bu iki damla gibi olan iki örnek o deniz gibi Ahlak-ı Âliyenin iki damlası ve iki misalidir.
Hem mesela dürüstlükte en yüksek derecede olduğu gibi; merhamette, samimiyette, adalette, güvenilirlikte, tevazuda, vefada, sabırda, saygıda, affedicilikte, nezakette, kanaatkârlıkta, hoşgörüde, diğerkâmlıkta, yardımseverlikte ve diğer bütün güzel ahlak özelliklerinde;
tarihin şehadetiyle, düşmanları bile kabul ediyor ki en yüksek ve yetişilemeyecek derecedeydi.
Şu ana kadar yazılmış başta Şifa-i Şerif gibi çok kitaplar yüzlerce ciltlerle bu "yüksek ahlak" mu'cizesini beyan ve ispat etmiştir.
Dünya çapında büyük düşünürler de Peygamberimizin ahlakını kabul etmişler.
Döneminin en önemli düşünürlerinden olan filozof Thomas Carlyle ve çağının en büyüklerinden olan İngiliz tarihçi Edward Gibbon; yazdıkları eserleriyle bu hakikati ifade eden Batılı düşünürlerden yalnızca iki örnektir.
Daha bunlar gibi birçok düşünür Peygamberimiz aleyhissalatü vesselamın ahlakına hayran kalmıştır.
Bu tatlı hakikatten Mektubat kitabının 195. sayfasında ve 19. Söz gibi başka risalelerde çok hoş ve etraflıca bahsedilmiştir."""

def norm(s):
    s = s.lower().replace('i̇', 'i')
    s = re.sub(r"[^\wçğıöşüâîû]", "", s)
    return s.translate(str.maketrans('âîû', 'aiu'))

raw = json.load(open(os.path.join(D, 'whisper_raw.json')))
ww = []
for seg in raw:
    for w in seg['words']:
        t = w['w'].strip()
        # glue pieces like "'an" "-i" onto previous token
        if ww and (t.startswith("'") or t.startswith("-")) and abs(w['s'] - ww[-1]['e']) < 0.05:
            ww[-1]['w'] += t; ww[-1]['e'] = w['e']
        else:
            ww.append({'w': t, 's': w['s'], 'e': w['e']})

# canonical tokens; keep multiword names as single display tokens where whisper split them
lines = TEXT.split('\n')
canon = []
for li, line in enumerate(lines):
    for tok in line.split():
        canon.append({'w': tok, 'line': li})

a = [norm(x['w']) for x in ww]
b = [norm(x['w']) for x in canon]
sm = difflib.SequenceMatcher(a=a, b=b, autojunk=False)
for tag, i1, i2, j1, j2 in sm.get_opcodes():
    if tag == 'equal' or (tag == 'replace' and i2 - i1 == j2 - j1):
        for k in range(j2 - j1):
            canon[j1 + k]['s'] = ww[i1 + k]['s']; canon[j1 + k]['e'] = ww[i1 + k]['e']
    elif tag == 'replace':
        s, e = ww[i1]['s'], ww[i2 - 1]['e']
        n = j2 - j1
        for k in range(n):
            canon[j1 + k]['s'] = s + (e - s) * k / n; canon[j1 + k]['e'] = s + (e - s) * (k + 1) / n
    elif tag == 'insert':
        prev_e = canon[j1 - 1]['e'] if j1 > 0 else 0
        nxt = ww[i1]['s'] if i1 < len(ww) else prev_e + 0.3
        n = j2 - j1
        for k in range(n):
            canon[j1 + k]['s'] = prev_e + (nxt - prev_e) * k / n; canon[j1 + k]['e'] = prev_e + (nxt - prev_e) * (k + 1) / n
    if tag != 'equal':
        print(tag, [x['w'] for x in ww[i1:i2]], '->', [x['w'] for x in canon[j1:j2]])
for i, c in enumerate(canon):
    c['i'] = i; c['s'] = round(c['s'], 3); c['e'] = round(c['e'], 3)
json.dump(canon, open(os.path.join(D, 'words.json'), 'w'), ensure_ascii=False, indent=0)
print(len(canon), 'words; last end', canon[-1]['e'])
