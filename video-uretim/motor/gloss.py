"""Elegant word-gloss subtitles: modern-Turkish meaning appears exactly at the
onset of the archaic word, stacks upward, no box, no source word."""
import skia
from common import *

FONT_FILE = 'CormorantGaramond-600-italic.ttf'
SIZE = 96
LINE_GAP = 104
BASE_Y = 1338          # baseline of the newest line
MAX_W = 880
MAX_VISIBLE = 3
LEAD = 0.067           # appear ~1 frame before the onset for perceptual sync


def _wrap(text, f):
    if f.measureText(text) <= MAX_W:
        return [text]
    words = text.split(' ')
    best = None
    for k in range(1, len(words)):
        a, b = ' '.join(words[:k]), ' '.join(words[k:])
        m = max(f.measureText(a), f.measureText(b))
        if best is None or m < best[0]:
            best = (m, [a, b])
    return best[1]


class GlossTrack:
    def __init__(self, items, end_time=None):
        self.f = font(FONT_FILE, SIZE)
        its = []
        for it in items:
            lines = _wrap(it['gloss'], self.f)
            its.append(dict(text=it['gloss'], lines=lines, t_in=it['t'] - LEAD,
                            n=len(lines), phrase=it.get('phrase', 0), pend=it.get('pend')))
        n = len(its)
        for i, it in enumerate(its):
            L = len(it['text'])
            hold = clamp(1.55 + 0.05 * L, 1.9, 3.3)
            out = it['t_in'] + hold
            if i + 1 < n and its[i + 1]['t_in'] - out < 0.7:
                out = max(out, its[i + 1]['t_in'] + 0.35)
            if it.get('pend') is not None:
                out = min(out, max(it['t_in'] + 1.7, it['pend'] + 0.9))
            if i + 1 < n and its[i + 1]['phrase'] != it['phrase']:
                out = min(out, its[i + 1]['t_in'] + 0.05)
            if i + MAX_VISIBLE < n:
                out = min(out, its[i + MAX_VISIBLE]['t_in'] + 0.05)
            if end_time is not None:
                out = min(out, end_time)
            it['t_out'] = out
        # older lines never outlive newer ones
        for i in range(n - 2, -1, -1):
            its[i]['t_out'] = min(its[i]['t_out'], its[i + 1]['t_out'])
        self.items = its
        self._metrics = self.f.getMetrics()

    def active(self, T):
        return [i for i, it in enumerate(self.items)
                if it['t_in'] <= T < it['t_out'] + 0.36]

    def draw(self, canvas, T, global_alpha=1.0):
        act = self.active(T)
        if not act:
            return
        its = self.items
        for i in act:
            it = its[i]
            # how far it has been pushed up by newer lines (in lines)
            push = 0.0
            depth = 0.0
            for j in range(i + 1, len(its)):
                if its[j]['t_in'] > T:
                    break
                e = ease_out_expo(lin(its[j]['t_in'] - 0.02, its[j]['t_in'] + 0.40, T))
                push += e * its[j]['n']
                depth += e
            ex = lin(it['t_out'], it['t_out'] + 0.32, T)
            exit_a = 1 - ease_in_out_sine(ex)
            scale = mix(1.0, 0.80, clamp(depth)) * mix(1.0, 0.9, clamp(depth - 1))
            alpha = mix(1.0, 0.62, clamp(depth)) * mix(1.0, 0.6, clamp(depth - 1))
            alpha *= exit_a * global_alpha
            if alpha <= 0.003:
                continue
            nl = it['n']
            for li, line in enumerate(it['lines']):
                yb = BASE_Y - (push * 0.93 + (nl - 1 - li)) * LINE_GAP
                yb -= 16 * ease_in_cubic(ex)
                self._draw_line(canvas, line, yb, scale, alpha, T - it['t_in'] - li * 0.10)
            if depth < 0.999:
                self._hairline(canvas, BASE_Y + 30 - push * 0.93 * LINE_GAP, T - it['t_in'],
                               alpha * (1 - clamp(depth)))

    def _hairline(self, c, y, lt, a):
        w = 150 * ease_out_cubic(lin(0.12, 0.75, lt))
        if w < 2 or a <= 0.01:
            return
        p = skia.Paint(AntiAlias=True)
        p.setShader(skia.GradientShader.MakeLinear(
            [skia.Point(540 - w, y), skia.Point(540 + w, y)],
            [col(GOLD, 0), col(GOLD, 0.95 * a), col(GOLD, 0)], [0, 0.5, 1]))
        c.drawRect(skia.Rect.MakeLTRB(540 - w, y - 1.2, 540 + w, y + 1.2), p)
        d = 5.5 * ease_out_back(lin(0.35, 0.8, lt))
        if d > 0.2:
            dp = skia.Paint(AntiAlias=True, Color4f=col(GOLD_HI, a))
            path = skia.Path()
            path.moveTo(540, y - d); path.lineTo(540 + d, y); path.lineTo(540, y + d); path.lineTo(540 - d, y); path.close()
            c.drawPath(path, dp)

    def _draw_line(self, c, text, yb, scale, alpha, lt):
        f = self.f
        widths = f.getWidths(f.textToGlyphs(text))
        total = sum(widths)
        c.save()
        c.translate(540, yb)
        c.scale(scale, scale)
        x0 = -total / 2
        n = len(text)
        step = min(0.016, 0.26 / max(n, 1))
        settled = lt > step * n + 0.24
        fill = skia.Paint(AntiAlias=True)
        fill.setShader(skia.GradientShader.MakeLinear(
            [skia.Point(0, -62), skia.Point(0, 8)],
            [col(IVORY, alpha), col((246, 229, 192), alpha)]))
        sh1 = skia.Paint(AntiAlias=True, Color4f=skia.Color4f(0.03, 0.02, 0.01, 0.68 * alpha),
                         MaskFilter=skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, 16))
        sh2 = skia.Paint(AntiAlias=True, Color4f=skia.Color4f(0.02, 0.01, 0.0, 0.62 * alpha),
                         MaskFilter=skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, 3.2))
        glow = skia.Paint(AntiAlias=True, Color4f=col(GOLD, 0.16 * alpha),
                          MaskFilter=skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, 30))
        if settled:
            blob = skia.TextBlob.MakeFromString(text, f)
            c.drawTextBlob(blob, x0, 6, sh1)
            c.drawTextBlob(blob, x0, 2, sh2)
            c.drawTextBlob(blob, x0, 0, glow)
            c.drawTextBlob(blob, x0, 0, fill)
        else:
            x = x0
            for k, ch in enumerate(text):
                a = ease_out_cubic(lin(k * step, k * step + 0.24, lt))
                if a > 0.004 and ch != ' ':
                    blob = skia.TextBlob.MakeFromString(ch, f)
                    dy = (1 - a) * 34
                    sig = (1 - a) * 7
                    ca = a
                    for paint, oy in ((sh1, 6), (sh2, 2), (glow, 0)):
                        pp = skia.Paint(paint)
                        pp.setAlphaf(paint.getAlphaf() * ca)
                        c.drawTextBlob(blob, x, dy + oy, pp)
                    fp = skia.Paint(fill)
                    fp.setAlphaf(ca)
                    if sig > 0.4:
                        fp.setMaskFilter(skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, sig))
                    c.drawTextBlob(blob, x, dy, fp)
                x += widths[k] if k < len(widths) else 0
        c.restore()
