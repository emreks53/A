/* K_kitap_kapanis — YER TUTUCU (henüz uygulanmadı) */
E.scene({
  id: 'K_kitap_kapanis', t0: 68.1, t1: 72.41,
  draw(ctx, t, s) {
    ctx.fillStyle = E.lin(ctx, 0, 0, 0, E.H, [[0, '#3a2a20'], [1, '#000000']]); ctx.fillRect(0, 0, E.W, E.H);
    ctx.fillStyle = '#fff'; ctx.font = '600 64px "Cormorant Garamond"'; ctx.textAlign = 'center';
    ctx.fillText('K_kitap_kapanis', E.W / 2, 400); ctx.fillText(t.toFixed(2) + ' s', E.W / 2, 480);
  },
});
