/* H_numune — YER TUTUCU (henüz uygulanmadı) */
E.scene({
  id: 'H_numune', t0: 37.6, t1: 47.8,
  draw(ctx, t, s) {
    ctx.fillStyle = E.lin(ctx, 0, 0, 0, E.H, [[0, '#2f6a7a'], [1, '#000000']]); ctx.fillRect(0, 0, E.W, E.H);
    ctx.fillStyle = '#fff'; ctx.font = '600 64px "Cormorant Garamond"'; ctx.textAlign = 'center';
    ctx.fillText('H_numune', E.W / 2, 400); ctx.fillText(t.toFixed(2) + ' s', E.W / 2, 480);
  },
});
