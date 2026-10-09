#!/usr/bin/env python3
"""Lügat dosyasını (assets/lugat.jsonl) denetler ve isteğe bağlı olarak düzenler.

Her satır bir maddedir:
  {"w":"inkişaf","o":"Ar.","f":3,"m":"Açılma, gelişme...","v":["..."]}

  w  kelime (Risale-i Nur'daki yazılışıyla)      — zorunlu
  m  manası (RNK Neşriyat lügatındaki metin; bir kelimenin
     o lügatta birden çok satırı varsa her biri ayrı paragraf,
     aralarında "\n")                           — zorunlu
  o  köken: Ar., Fa., Tr., Ar.-Fa. ...          — isteğe bağlı
  f  sıklık: 3 çok sık, 2 sık, 1 seyrek; 0 Risale-i Nur metninde
     (neredeyse) geçmeyen, RNK lügatının geri kalanı — zorunlu
  v  başka baskılarda görülen yazılışlar         — isteğe bağlı

İki dosya vardır: assets/lugat.jsonl (Risale-i Nur'da geçen kelimeler, f = 1-3) ve
assets/lugat_ek.jsonl (RNK lügatının geri kalanı, f = 0). Uygulama önce birincisini,
ardından ikisini birlikte yükler.

Kullanım:
  python3 tool/lugat_kontrol.py                 # iki dosyayı birlikte denetle
  python3 tool/lugat_kontrol.py --duzelt        # Türk alfabesine göre sırala, biçimi düzelt
  python3 tool/lugat_kontrol.py DOSYA.jsonl     # başka bir dosyayı denetle
"""
import json
import os
import re
import sys
import unicodedata

ASSETS = os.path.join(os.path.dirname(__file__), "..", "assets")
# Risale-i Nur'da geçen kelimeler (sıklık 1-3) ve RNK lügatının geri kalanı (sıklık 0).
DEFAULT = os.path.join(ASSETS, "lugat.jsonl")
EXTRA = os.path.join(ASSETS, "lugat_ek.jsonl")

ORIGINS = {
    "", "Ar.", "Fa.", "Tr.", "Ar.-Fa.", "Fa.-Ar.", "Ar.-Tr.", "Fa.-Tr.", "Tr.-Ar.",
    "Tr.-Fa.", "Yun.", "Fr.", "İt.", "Lat.", "İbr.", "Sür.",
}
KEYS = ("w", "o", "f", "m", "v")
WORD_RE = re.compile(r"^[a-zA-ZçÇğĞıİöÖşŞüÜâÂîÎûÛêÊôÔ' .\-]+$")

# Uygulamadaki (lib/src/dictionary/normalize.dart) arama anahtarıyla aynı kurallar.
_PLAIN = str.maketrans({"â": "a", "î": "i", "û": "u", "ê": "e", "ô": "o"})
_DROP = re.compile(r"['’‘ʼʻʿʾ`´\-\s.,;:!?()\"«»“”/]")
ALPHABET = "abcçdefgğhıijklmnoöprsştuüvyz"
RANK = {c: i for i, c in enumerate(ALPHABET)}


def turkish_lower(s):
    return s.replace("I", "ı").replace("İ", "i").lower()


def search_key(word):
    return _DROP.sub("", turkish_lower(word).translate(_PLAIN))


def sort_key(entry):
    key = search_key(entry["w"])
    return ([RANK.get(c, 100 + ord(c)) for c in key], entry["w"])


def problems(entry):
    if not isinstance(entry, dict):
        return ["madde bir JSON nesnesi olmalı"]
    errs = []
    w, m = entry.get("w"), entry.get("m")
    if set(entry) - set(KEYS):
        errs.append(f"bilinmeyen alan: {sorted(set(entry) - set(KEYS))}")
    if not isinstance(w, str) or not w.strip():
        errs.append("'w' boş")
    elif not WORD_RE.match(w) or w != w.strip() or "  " in w:
        errs.append(f"'w' geçersiz karakter/boşluk içeriyor: {w!r}")
    if not isinstance(m, str) or len(m.strip()) < 3:
        errs.append("'m' boş ya da çok kısa")
    elif "\t" in m or any(not p.strip() or p != p.strip() for p in m.split("\n")):
        errs.append("'m' sekme, boş paragraf ya da paragraf başında/sonunda boşluk içeriyor")
    elif "\\" in m:
        errs.append("'m' ters bölü içeriyor (kaynaktan kalmış bir \\n kaçışı olabilir)")
    if entry.get("o", "") not in ORIGINS:
        errs.append(f"'o' tanınmıyor: {entry.get('o')!r}")
    f = entry.get("f")
    if isinstance(f, bool) or not isinstance(f, int) or f not in (0, 1, 2, 3):
        errs.append("'f' 0, 1, 2 ya da 3 olmalı")
    v = entry.get("v", [])
    if not isinstance(v, list) or not all(isinstance(x, str) and WORD_RE.match(x) for x in v):
        errs.append("'v' kelime listesi olmalı (ör. [\"itikat\"])")
    elif isinstance(w, str):
        for x in v:
            if len(search_key(x)) < 2 or search_key(x) == search_key(w):
                errs.append(f"'v' içindeki {x!r} anlamsız (çok kısa ya da kelimenin kendisiyle aynı)")
    return errs


def tidy(entry):
    out = {}
    for k in KEYS:
        if k not in entry:
            continue
        val = entry[k]
        if k == "m" and isinstance(val, str):
            paragraphs = (re.sub(r"\s+", " ", p.replace("’", "'")).strip() for p in val.split("\n"))
            val = unicodedata.normalize("NFC", "\n".join(p for p in paragraphs if p))
        elif isinstance(val, str):
            val = unicodedata.normalize("NFC", re.sub(r"\s+", " ", val.replace("’", "'")).strip())
        if k == "v":
            val = [unicodedata.normalize("NFC", x.replace("’", "'").strip()) for x in val if x.strip()]
            if not val:
                continue
        if k == "o" and not val:
            continue
        out[k] = val
    return out


def dump(entry):
    return json.dumps(entry, ensure_ascii=False, separators=(",", ":"))


def main(argv):
    fix = "--duzelt" in argv
    given = [a for a in argv if not a.startswith("--")]
    paths = given or [DEFAULT, EXTRA]
    rc = 0
    across = {}  # dosyalar arası mükerrer denetimi (küçük harfe çevrilmiş kelime → dosya)
    for path in paths:
        entries, errors = [], []
        with open(path, encoding="utf-8") as fh:
            for no, line in enumerate(fh, 1):
                if not line.strip():
                    continue
                try:
                    e = json.loads(line)
                except json.JSONDecodeError as exc:
                    errors.append(f"{path}:{no}: JSON hatası ({exc.msg})")
                    continue
                errors += [f"{path}:{no}: {msg}" for msg in problems(e)]
                entries.append((no, e))
        seen = {}
        for no, e in entries:
            w = e.get("w") if isinstance(e, dict) else None
            if not isinstance(w, str):
                continue
            if w in seen:
                errors.append(f"{path}:{no}: '{w}' iki kez var (ilki {seen[w]}. satırda)")
            seen.setdefault(w, no)
            low = turkish_lower(w)
            if low in across and across[low] != path:
                errors.append(f"{path}:{no}: '{w}' {os.path.basename(across[low])} dosyasında da var")
            across.setdefault(low, path)
            if not given:
                core = os.path.abspath(path) == os.path.abspath(DEFAULT)
                if core and e.get("f") == 0:
                    errors.append(f"{path}:{no}: '{w}' sıklığı 0; lugat_ek.jsonl'e taşınmalı")
                if not core and e.get("f") != 0:
                    errors.append(f"{path}:{no}: '{w}' sıklığı 0 olmalı (yoksa lugat.jsonl'e taşınmalı)")
        if errors:
            # Sıralama ve düzeltme yalnızca bütün maddeler geçerliyken yapılır.
            if fix:
                errors.append(f"{path}: önce yukarıdaki hataları düzeltin, sonra --duzelt'i yeniden çalıştırın")
        else:
            ordered = [e for _, e in entries]
            in_order = ordered == sorted(ordered, key=sort_key)
            if fix:
                tidied = sorted((tidy(e) for e in ordered), key=sort_key)
                if tidied != ordered:
                    with open(path, "w", encoding="utf-8") as fh:
                        fh.writelines(dump(e) + "\n" for e in tidied)
                    print(f"{path}: Türk alfabesine göre sıralandı ve biçimi düzeltildi")
            elif not in_order:
                errors.append(f"{path}: maddeler alfabetik sırada değil (--duzelt ile sıralanabilir)")
        for err in errors[:100]:
            print(err)
        if len(errors) > 100:
            print(f"... ve {len(errors) - 100} hata daha")
        status = "TAMAM" if not errors else "HATALI"
        print(f"{status}: {path} — {len(entries)} madde, {len(errors)} sorun")
        rc |= 1 if errors else 0
    return rc


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
