declare module 'virtual:kitaplar' {
  /** PDF'lerin kaynağı (künye) */
  export const kaynak: string;
  /** PDF'i olmayan kitapların dış adresleri (ör. RNK Neşriyat'ın kitap sayfaları); yoksa null */
  export const baglanti: import('../../vite/kitaplar').Baglanti | null;
  /** PDF'i eklenmiş kitaplar (Külliyat sırasıyla); PDF'i ve dış adresi olmayan kitap "yakında" görünür */
  export const kitaplar: import('./ortak').Kitap[];
}
