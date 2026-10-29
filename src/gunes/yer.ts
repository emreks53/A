// Kitapta kalınan yer: her kitap için son açık PDF sayfası (bu cihazda). Rafta "kaldığın yer" olarak görünür.
const ANAHTAR = 'nuruhakikat.gunes.yer';

export interface KalinanYer {
  /** PDF sayfası */
  sayfa: number;
  /** Son okuma zamanı (ms) */
  zaman: number;
}

function hepsi(): Record<string, KalinanYer> {
  try {
    const v = JSON.parse(localStorage.getItem(ANAHTAR) ?? '{}');
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}

export function kalinanYer(kimlik: string): KalinanYer | null {
  const y = hepsi()[kimlik];
  return y && Number.isInteger(y.sayfa) && y.sayfa >= 1 ? y : null;
}

/** En son okunan kitap (rafta öne çıkar) */
export function sonOkunan(): { kimlik: string; yer: KalinanYer } | null {
  let son: { kimlik: string; yer: KalinanYer } | null = null;
  for (const [kimlik, yer] of Object.entries(hepsi())) {
    if (yer && Number.isInteger(yer.sayfa) && (!son || yer.zaman > son.yer.zaman)) son = { kimlik, yer };
  }
  return son;
}

export function yeriKaydet(kimlik: string, sayfa: number): void {
  try {
    const h = hepsi();
    h[kimlik] = { sayfa, zaman: Date.now() };
    localStorage.setItem(ANAHTAR, JSON.stringify(h));
  } catch {
    // gizli pencere ya da dolu depolama: yer hatırlanmaz
  }
}
