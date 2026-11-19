import json
w = json.load(open('align/ctc_words.json'))
# glosses: (orig token as in text, occurrence index among same orig, meaning)
G = [('mütemadiyen',0,'sürekli'),('mütemadiyen',1,'sürekli'),('zeval',0,'yok oluş'),('firakta',0,'ayrılıkta'),
     ('zîhayatın',0,'canlıların'),('cihazatça',0,'cihazlarca'),('zîhayatların',0,'canlıların'),('edna',0,'aşağı'),
     ('meşakkatli',0,'zahmetli'),('azîm',0,'çok büyük'),('ebedî',0,'sonsuz'),('gaflet',0,'unutkanlık'),
     ('sermaye-i',0,'ömür sermayesini'),('bâd-i',0,'boşuboşuna'),('cesedine',0,'bedenine'),('"Lâyemut',0,'ölümsüz'),
     ('nokta-i',0,'bakış noktasından'),('nâsih',0,'nasihat edici'),('mürşiddir.',0,'yol göstericidir'),
     ('şekva',0,'şikâyet'),('cihette',0,'yönde')]
# word-level list (merge hyphen parts back to orig tokens)
words = []
for x in w:
    if words and words[-1]['orig'] == x['orig'] and x['part'] != x['orig'] and words[-1].get('_open'):
        words[-1]['e'] = x['e']; words[-1]['parts'].append(x['part'])
        if x['part'] == x['orig'].split('-')[-1].strip('.,:"'): words[-1]['_open'] = False
        continue
    words.append({'orig': x['orig'], 's': x['s'], 'e': x['e'], 'parts': [x['part']], '_open': '-' in x['orig']})
for x in words: x.pop('_open', None)
gl = []
for orig, occ, mean in G:
    hits = [x for x in words if x['orig'] == orig]
    x = hits[occ]
    gl.append({'word': orig.strip('".,:'), 't': round(x['s'], 3), 'wordEnd': round(x['e'], 3), 'text': mean})
gl.sort(key=lambda g: g['t'])
json.dump({'duration': 114.29, 'words': words, 'glosses': gl}, open('timing.json', 'w'), ensure_ascii=False, indent=1)
for g in gl: print(g)
print(len(words))
