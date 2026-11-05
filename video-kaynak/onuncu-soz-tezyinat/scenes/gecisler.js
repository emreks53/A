/* Sahneler arası geçişler (entegrasyon). Tanımsız örtüşmelerde varsayılan: örtüşme boyunca yumuşak çapraz geçiş. */
E.transition({ from: 'G_hasiye', to: 'H_numune', at: 37.60, dur: 0.20, type: 'blur' });
E.transition({ from: 'H_numune', to: 'I_cennet', at: 47.60, dur: 0.20, type: 'light', x: 540, y: 520, color: '#FFFDF7' });
E.transition({ from: 'I_cennet', to: 'J_gayeler', at: 61.60, dur: 0.30, type: 'fade' });
E.transition({ from: 'J_gayeler', to: 'K_kitap_kapanis', at: 68.10, dur: 0.50, type: 'light', x: 540, y: 800, color: '#FFF6E6' });
