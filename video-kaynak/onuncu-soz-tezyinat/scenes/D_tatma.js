/* D_tatma — YER TUTUCU (henüz uygulanmadı) */
E.scene({
  id: 'D_tatma', t0: 11.5, t1: 16.3,
  draw(ctx, t, s) {
    ctx.fillStyle = E.lin(ctx, 0, 0, 0, E.H, [[0, '#7a5a2f'], [1, '#000000']]); ctx.fillRect(0, 0, E.W, E.H);
    ctx.fillStyle = '#fff'; ctx.font = '600 64px "Cormorant Garamond"'; ctx.textAlign = 'center';
    ctx.fillText('D_tatma', E.W / 2, 400); ctx.fillText(t.toFixed(2) + ' s', E.W / 2, 480);
  },
});
