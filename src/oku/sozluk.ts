// Okuma ekranı ile lügat arasındaki köprü. (Geçici basit arama; lügat portu gelince onunla değişecek.)
export interface Mana {
  /** Asıl mana (kalın yazılır); yoksa boş */
  asil: string;
  kalan: string;
}
export interface SozlukMadde {
  kelime: string;
  manalar: Mana[];
  bakiniz: string[];
}
export interface SozlukSonuc {
  madde: SozlukMadde;
  digerleri: string[];
}

interface Ham {
  w: string;
  m: string;
  f?: number;
}

let yukleme: Promise<Map<string, Ham[]>> | null = null;

function anahtar(s: string): string {
  return s
    .toLocaleLowerCase('tr')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’'ʼ-]/g, '')
    .replace(/ı/g, 'i');
}

function yukle(): Promise<Map<string, Ham[]>> {
  yukleme ??= fetch(`${import.meta.env.BASE_URL}lugat/lugat.jsonl`)
    .then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.text();
    })
    .then((metin) => {
      const harita = new Map<string, Ham[]>();
      for (const satir of metin.split('\n')) {
        if (!satir.trim()) continue;
        const h = JSON.parse(satir) as Ham;
        const k = anahtar(h.w);
        const liste = harita.get(k);
        if (liste) liste.push(h);
        else harita.set(k, [h]);
      }
      return harita;
    });
  yukleme.catch(() => (yukleme = null));
  return yukleme;
}

function madde(h: Ham): SozlukMadde {
  const manalar = h.m.split('\n').map((p) => {
    const i = p.search(/[.!?](\s|$)/);
    return i < 0 ? { asil: p, kalan: '' } : { asil: p.slice(0, i + 1), kalan: p.slice(i + 1).trim() };
  });
  const bakiniz = Array.from(h.m.matchAll(/\(Bak:\s*([^)]+)\)/g), (m) => m[1].trim());
  return { kelime: h.w, manalar, bakiniz };
}

export async function kelimeAra(kelime: string, _once: string[], sonra: string[]): Promise<SozlukSonuc | null> {
  const harita = await yukle();
  const temiz = kelime.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '');
  const adaylar = [sonra[0] ? `${temiz} ${sonra[0].replace(/[^\p{L}'’-]+$/u, '')}` : '', temiz].filter(Boolean);
  for (const a of adaylar) {
    const k = anahtar(a);
    for (let n = k.length; n >= Math.min(3, k.length); n--) {
      const bulunan = harita.get(k.slice(0, n));
      if (bulunan) return { madde: madde(bulunan[0]), digerleri: bulunan.slice(1).map((x) => x.w) };
    }
  }
  return null;
}

export async function maddeAc(kelime: string): Promise<SozlukSonuc | null> {
  const bulunan = (await yukle()).get(anahtar(kelime));
  return bulunan ? { madde: madde(bulunan[0]), digerleri: [] } : null;
}
