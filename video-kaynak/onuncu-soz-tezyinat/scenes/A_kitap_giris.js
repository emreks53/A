/* A_kitap_giris — YER TUTUCU (henüz uygulanmadı) */
E.scene({
  id: 'A_kitap_giris', t0: 0.0, t1: 2.7,
  draw(ctx, t, s) {
    ctx.fillStyle = E.lin(ctx, 0, 0, 0, E.H, [[0, '#5a2a1e'], [1, '#000000']]); ctx.fillRect(0, 0, E.W, E.H);
    ctx.fillStyle = '#fff'; ctx.font = '600 64px "Cormorant Garamond"'; ctx.textAlign = 'center';
    ctx.fillText('A_kitap_giris', E.W / 2, 400); ctx.fillText(t.toFixed(2) + ' s', E.W / 2, 480);
  },
});
