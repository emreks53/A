declare module 'virtual:kitaplar' {
  /** PDF'lerin kaynağı (künye) */
  export const kaynak: string;
  /** PDF'i eklenmiş kitaplar (Külliyat sırasıyla); listede olmayan kitap "yakında" görünür */
  export const kitaplar: import('./ortak').Kitap[];
}
