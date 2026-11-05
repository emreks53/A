/* J_gayeler — YER TUTUCU (henüz uygulanmadı) */
E.scene({
  id: 'J_gayeler', t0: 61.6, t1: 68.6,
  draw(ctx, t, s) {
    ctx.fillStyle = E.lin(ctx, 0, 0, 0, E.H, [[0, '#7a3f2f'], [1, '#000000']]); ctx.fillRect(0, 0, E.W, E.H);
    ctx.fillStyle = '#fff'; ctx.font = '600 64px "Cormorant Garamond"'; ctx.textAlign = 'center';
    ctx.fillText('J_gayeler', E.W / 2, 400); ctx.fillText(t.toFixed(2) + ' s', E.W / 2, 480);
  },
});
