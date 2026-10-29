// Kitapta kalınan yer: her kitap için son açık PDF sayfası (bu cihazda). Rafta "kaldığın yer" olarak görünür.
// Hangi PDF dosyasında kalındığı da saklanır: kitabın dosyası (başka bir baskıyla) değişince eski sayfa numarası
// yeni dosyada başka bir yeri gösterir, o yüzden kullanılmaz.
const ANAHTAR = 'nuruhakikat.gunes.yer';

export interface KalinanYer {
  /** PDF sayfası */
  sayfa: number;
  /** Son okuma zamanı (ms) */
  zaman: number;
  /** Okunan PDF dosyası (kitaplar.json'daki yol) */
  pdf?: string;
}

function hepsi(): Record<string, KalinanYer> {
  try {
    const v = JSON.parse(localStorage.getItem(ANAHTAR) ?? '{}');
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}

const gecerli = (y: KalinanYer | undefined, pdf?: string): y is KalinanYer =>
  !!y && Number.isInteger(y.sayfa) && y.sayfa >= 1 && (!pdf || !y.pdf || y.pdf === pdf);

/** Kitapta kalınan yer; pdf verilirse yalnız o dosyada kalındıysa */
export function kalinanYer(kimlik: string, pdf?: string): KalinanYer | null {
  const y = hepsi()[kimlik];
  return gecerli(y, pdf) ? y : null;
}

/** En son okunan kitap (rafta öne çıkar) */
export function sonOkunan(): { kimlik: string; yer: KalinanYer } | null {
  let son: { kimlik: string; yer: KalinanYer } | null = null;
  for (const [kimlik, yer] of Object.entries(hepsi())) {
    if (gecerli(yer) && (!son || yer.zaman > son.yer.zaman)) son = { kimlik, yer };
  }
  return son;
}

export function yeriKaydet(kimlik: string, sayfa: number, pdf?: string): void {
  try {
    const h = hepsi();
    h[kimlik] = { sayfa, zaman: Date.now(), ...(pdf ? { pdf } : {}) };
    localStorage.setItem(ANAHTAR, JSON.stringify(h));
  } catch {
    // gizli pencere ya da dolu depolama: yer hatırlanmaz
  }
}
