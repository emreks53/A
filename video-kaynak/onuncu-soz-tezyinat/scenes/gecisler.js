/* Sahneler arası geçişler (entegrasyon). Tanımsız örtüşmelerde varsayılan: örtüşme boyunca yumuşak çapraz geçiş. */
E.transition({ from: 'A_kitap_giris', to: 'B_bahce', at: 2.30, dur: 0.40, type: 'light', x: 540, y: 960, color: '#FFF6E6' });
E.transition({ from: 'B_bahce', to: 'C_gul_firak', at: 6.40, dur: 0.034, type: 'cut' });
E.transition({ from: 'C_gul_firak', to: 'D_tatma', at: 11.50, dur: 0.30, type: 'fade' });
E.transition({ from: 'D_tatma', to: 'E_omur', at: 16.10, dur: 0.20, type: 'fade' });
E.transition({ from: 'E_omur', to: 'F_kiymet', at: 22.30, dur: 0.20, type: 'fade' });
E.transition({ from: 'F_kiymet', to: 'G_hasiye', at: 28.50, dur: 0.20, type: 'fade' });
E.transition({ from: 'G_hasiye', to: 'H_numune', at: 37.60, dur: 0.20, type: 'blur' });
E.transition({ from: 'H_numune', to: 'I_cennet', at: 47.60, dur: 0.20, type: 'light', x: 540, y: 520, color: '#FFFDF7' });
E.transition({ from: 'I_cennet', to: 'J_gayeler', at: 61.60, dur: 0.30, type: 'fade' });
E.transition({ from: 'J_gayeler', to: 'K_kitap_kapanis', at: 68.10, dur: 0.50, type: 'light', x: 540, y: 800, color: '#FFF6E6' });
