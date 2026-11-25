/* WebGL2 watercolour post-process.
   Input per shot: paint (RGB, white = bare paper), ink (RGBA), light (RGBA).
   Output: final frame on the visible canvas #gl.

   Model (after Bousseau et al. 2006 "Interactive watercolor rendering with temporal coherence"):
     - wobble: lookup displaced by static low-frequency noise + paper gradient (hand-painted, wavy edges)
     - edge darkening: pigment pools at the inner rim of a wash: rim = lum(blur(c)) - lum(c) > 0
     - pigment density d modulated by turbulence (mottled washes), dispersion (fine grain), paper height
       (granulation), and the rim.  c' = c - (c - c^2)(d - 1)   (white paper stays white)
     - multiply by cold-press paper colour with emboss lighting
     - ink multiplied on top, broken by paper tooth; light screen-blended
   Static textures (paper, noise) are generated once on the GPU; per frame only lookups. */
(function () {
  const E = window.E;
  const W = E.W, H = E.H;

  const VS = `#version 300 es
  in vec2 p; out vec2 uv;
  void main(){ uv = p*0.5+0.5; gl_Position = vec4(p,0.,1.); }`;

  const NOISE_LIB = `
  float h21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
  vec2 h22(vec2 p){ float n = h21(p); return vec2(n, h21(p+n)); }
  float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
    return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
  float fbm(vec2 p, int oct){ float v=0., a=.5; for(int i=0;i<8;i++){ if(i>=oct)break; v+=a*vnoise(p); p=p*2.03+17.1; a*=.5;} return v; }
  float worley(vec2 p){ vec2 i=floor(p), f=fract(p); float d=1.;
    for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){ vec2 g=vec2(x,y); vec2 o=h22(i+g); d=min(d, length(g+o-f)); } return d; }
  `;

  // static paper: R height, G fine tooth, B fibre streaks; noise: R turbulence, G dispersion, BA wobble vector
  const FS_STATIC = `#version 300 es
  precision highp float; in vec2 uv; layout(location=0) out vec4 paper; layout(location=1) out vec4 noise;
  uniform vec2 uRes;
  ${NOISE_LIB}
  void main(){
    vec2 px = uv*uRes;
    // cold-press: rounded cells (inverted worley) + mid fbm
    float cell = 1. - worley(px/7.5);
    float cell2 = 1. - worley(px/17. + 3.1);
    float mid = fbm(px/40., 4);
    float h = 0.42*cell + 0.28*cell2 + 0.30*mid;
    float tooth = vnoise(px/1.6)*0.6 + vnoise(px/3.1)*0.4;
    float fib = smoothstep(0.62, 0.95, vnoise(vec2(px.x/70., px.y/6.) + fbm(px/90.,2)*3.));
    float hSmooth = 0.55*cell2 + 0.45*fbm(px/30., 3);
    paper = vec4(h, tooth, fib, hSmooth);
    float turb = fbm(px/260. + 11.3, 5);
    float turb2 = fbm(px/95. + 41.7, 4);
    float disp = vnoise(px/2.2)*0.5 + vnoise(px/5.)*0.5;
    vec2 wob = vec2(fbm(px/55. + 7.7, 3), fbm(px/55. + 91.1, 3));
    noise = vec4(mix(turb, turb2, 0.35), disp, wob);
  }`;

  const FS_DOWN = `#version 300 es
  precision highp float; in vec2 uv; out vec4 o; uniform sampler2D uTex; uniform vec2 uTexel;
  void main(){ vec2 d = uTexel*0.5;
    o = 0.25*(texture(uTex, uv+vec2(-d.x,-d.y))+texture(uTex, uv+vec2(d.x,-d.y))+texture(uTex, uv+vec2(-d.x,d.y))+texture(uTex, uv+vec2(d.x,d.y))); }`;

  const FS_BLUR = `#version 300 es
  precision highp float; in vec2 uv; out vec4 o; uniform sampler2D uTex; uniform vec2 uDir;
  void main(){
    float w[5] = float[](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);
    vec4 c = texture(uTex, uv)*w[0];
    for(int i=1;i<5;i++){ c += texture(uTex, uv+uDir*float(i))*w[i]; c += texture(uTex, uv-uDir*float(i))*w[i]; }
    o = c; }`;

  const FS_MAIN = `#version 300 es
  precision highp float; in vec2 uv; out vec4 o;
  uniform sampler2D uPaintA, uInkA, uLightA, uBlurSA, uBlurLA;
  uniform sampler2D uPaintB, uInkB, uLightB, uBlurSB, uBlurLB;
  uniform sampler2D uPaper, uNoise;
  uniform vec2 uRes;
  uniform float uMix;            // transition progress 0..1
  uniform int uType;             // 0 none, 1 fade, 2 bleed, 3 zoom, 4 cut
  uniform vec2 uCenter;          // transition centre (px, y down)
  uniform mat3 uXfA, uXfB;       // uv transforms (zoom transition)
  uniform vec4 uWC;              // x: edge darkening, y: granulation, z: wobble px, w: mottling
  uniform vec4 uWCB;             // same for shot B
  uniform vec2 uRaw;             // 1 = layer is a photograph (no watercolour), for A and B
  uniform float uPaperTone;      // 0..1 how much paper colour/texture to show (1 normal)
  uniform vec4 uGrade;           // x: vignette, y: warmth, z: exposure, w: dark-scene paper dim
  uniform float uTime;

  float lum(vec3 c){ return dot(c, vec3(0.299,0.587,0.114)); }

  vec3 watercolor(sampler2D P, sampler2D BS, sampler2D BL, vec2 st, vec4 wc, float raw, out float pig){
    vec4 pap = texture(uPaper, st);
    vec4 nz = texture(uNoise, st);
    if (raw > 0.5) { pig = 0.; return texture(P, st).rgb; }
    // wobble: static low-frequency displacement + paper relief gradient
    vec2 tx = 1./uRes;
    float hx = texture(uPaper, st + vec2(tx.x*2.,0.)).r - texture(uPaper, st - vec2(tx.x*2.,0.)).r;
    float hy = texture(uPaper, st + vec2(0.,tx.y*2.)).r - texture(uPaper, st - vec2(0.,tx.y*2.)).r;
    vec2 wob = (nz.ba - 0.5) * wc.z * tx * 2.0 + vec2(hx, hy) * 0.8 * tx;
    vec2 s2 = st + wob;
    vec3 c = texture(P, s2).rgb;
    vec3 bs = texture(BS, s2).rgb;
    vec3 bl = texture(BL, s2).rgb;
    float pigment = clamp(1. - min(min(c.r, c.g), c.b) + (1. - lum(c))*0.5, 0., 1.);
    pig = pigment;
    // edge darkening (pigment pooling on the inner rim of a wash)
    float rimS = max(0., lum(bs) - lum(c));
    float rimL = max(0., lum(bl) - lum(c));
    float rim = smoothstep(0.0, 0.10, rimS) * 0.8 + smoothstep(0.0, 0.22, rimL) * 0.3;
    // densities
    float turb = nz.r - 0.5;
    float disp = nz.g - 0.5;
    float h = pap.r - 0.5;
    float sat = max(max(c.r,c.g),c.b) - min(min(c.r,c.g),c.b);
    float hLow = pap.a - 0.5;                       // smooth paper relief (no fine tooth)
    float d = 1.0
      + wc.w * turb * 0.75
      + 0.07 * disp
      + wc.y * hLow * (0.35 + 1.1*sat) * 0.8
      + wc.x * rim * 1.7;
    d = clamp(d, 0.45, 1.0 + 0.95 * (0.35 + 0.65 * lum(c)));
    // soft colour bleed: lighter tint creeping outward from washes (wet edges)
    vec3 bleed = mix(c, min(c, bl), 0.18);
    c = bleed;
    vec3 cw = c - (c - c*c) * (d - 1.0);
    // granules: pigment settles into paper valleys
    float gran = smoothstep(0.45, 0.8, pap.g) * wc.y * pigment * 0.06;
    cw *= 1.0 - gran;
    return clamp(cw, 0., 1.);
  }

  void main(){
    vec2 st = vec2(uv.x, 1.0 - uv.y);      // texture space, y down like canvas
    vec2 px = st * uRes;
    vec4 pap = texture(uPaper, st);
    vec4 nz = texture(uNoise, st);

    // transition mask m: 0 -> A, 1 -> B
    float m = 0.0; float tide = 0.0;
    vec2 stA = st, stB = st;
    if (uType == 0) m = 0.0;
    else if (uType == 4) m = uMix >= 0.5 ? 1.0 : 0.0;
    else if (uType == 1) m = smoothstep(0.0, 1.0, uMix);
    else if (uType == 2) {
      float dist = length((px - uCenter) / uRes.y);
      float field = dist * 1.25 + (nz.r - 0.5) * 0.55 + (pap.r - 0.5) * 0.05;
      float front = uMix * 1.95 - 0.12;
      m = 1.0 - smoothstep(front - 0.035, front + 0.005, field);
      tide = exp(-pow((field - front + 0.012) / 0.012, 2.0)) * (1.0 - smoothstep(0.85, 1.0, uMix));
    } else if (uType == 3) {
      stA = (uXfA * vec3(st, 1.0)).xy;
      stB = (uXfB * vec3(st, 1.0)).xy;
      m = smoothstep(0.25, 0.85, uMix);
    }

    float pigA = 0., pigB = 0.;
    vec3 a = vec3(1.), b = vec3(1.);
    vec4 inkA = vec4(0.), inkB = vec4(0.), lightA = vec4(0.), lightB = vec4(0.);
    // where the incoming shot's picture does not reach (a zoom starts it smaller than the frame) the outgoing shot
    // shows instead of blank paper, with a soft 70 px edge (no milky frame-within-a-frame)
    vec2 eB = vec2(70.0) / uRes;
    float vB = smoothstep(0.0, eB.x, stB.x) * smoothstep(0.0, eB.x, 1.0 - stB.x)
             * smoothstep(0.0, eB.y, stB.y) * smoothstep(0.0, eB.y, 1.0 - stB.y);
    if (uType == 3) m *= vB;
    if (m < 0.999) {
      a = watercolor(uPaintA, uBlurSA, uBlurLA, stA, uWC, uRaw.x, pigA);
      inkA = texture(uInkA, stA); lightA = texture(uLightA, stA);
      if (any(lessThan(stA, vec2(0.))) || any(greaterThan(stA, vec2(1.)))) { a = vec3(1.); inkA = vec4(0.); lightA = vec4(0.); }
    }
    if (m > 0.001) {
      b = watercolor(uPaintB, uBlurSB, uBlurLB, stB, uWCB, uRaw.y, pigB);
      inkB = texture(uInkB, stB); lightB = texture(uLightB, stB);
      if (any(lessThan(stB, vec2(0.))) || any(greaterThan(stB, vec2(1.)))) { b = vec3(1.); inkB = vec4(0.); lightB = vec4(0.); }
      // tide line of the advancing wet wash
      b *= 1.0 - tide * 0.22 * (0.5 + pigB);
    }
    vec3 col = mix(a, b, m);
    vec4 ink = mix(inkA, inkB, m);
    vec4 light = mix(lightA, lightB, m);
    float raw = mix(uRaw.x, uRaw.y, m);

    // paper colour + emboss
    vec3 paperCol = vec3(0.972, 0.957, 0.925);
    float tx = 1.0/uRes.x;
    float ex = texture(uPaper, st + vec2(tx,0.)).r - texture(uPaper, st - vec2(tx,0.)).r;
    float ey = texture(uPaper, st + vec2(0.,tx)).r - texture(uPaper, st - vec2(0.,tx)).r;
    float emb = 1.0 + (ex*0.8 - ey*0.6) * 0.16;
    vec3 paper = paperCol * (0.985 + 0.03*pap.a) * emb - pap.b*0.008;
    vec3 wc = col * mix(vec3(1.), paper, uPaperTone);
    col = mix(wc, col, raw);

    // pencil / ink: multiplied, graphite sits on paper tooth
    float tooth = mix(0.55, 1.0, smoothstep(0.25, 0.75, pap.g*0.6 + pap.r*0.6));
    float ia = ink.a * mix(tooth, 1.0, raw);
    vec3 inkc = ink.rgb;
    col = mix(col, col * inkc, clamp(ia, 0., 1.));

    // light: screen
    vec3 L = light.rgb * light.a;
    col = 1.0 - (1.0 - col) * (1.0 - clamp(L, 0., 1.));

    // grade
    col *= uGrade.z;
    vec2 q = st - 0.5;
    float vig = 1.0 - uGrade.x * (1.0 - 0.75 * raw) * smoothstep(0.35, 0.95, length(q * vec2(1.0, 0.75)) * 1.35);
    col *= vig;
    col = mix(col, col * vec3(1.02, 1.0, 0.97), uGrade.y * (1.0 - raw));
    o = vec4(clamp(col, 0., 1.), 1.0);
  }`;

  function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) + '\n' + src);
    return s;
  }
  function program(gl, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, VS));
    gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'p');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); u[info.name.replace('[0]', '')] = gl.getUniformLocation(p, info.name); }
    return { p, u };
  }
  function tex(gl, w, h, filter = gl.LINEAR, internal = gl.RGBA8, format = gl.RGBA, type = gl.UNSIGNED_BYTE) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, type, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  function fbo(gl, ...texs) {
    const f = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    texs.forEach((t, i) => gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, t, 0));
    gl.drawBuffers(texs.map((_, i) => gl.COLOR_ATTACHMENT0 + i));
    return f;
  }

  E.Post = class {
    constructor(canvas) {
      const gl = (this.gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false, premultipliedAlpha: false }));
      if (!gl) throw new Error('WebGL2 unavailable');
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      this.pStatic = program(gl, FS_STATIC);
      this.pDown = program(gl, FS_DOWN);
      this.pBlur = program(gl, FS_BLUR);
      this.pMain = program(gl, FS_MAIN);
      // static textures
      this.paper = tex(gl, W, H);
      this.noise = tex(gl, W, H);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo(gl, this.paper, this.noise));
      gl.viewport(0, 0, W, H);
      gl.useProgram(this.pStatic.p);
      gl.uniform2f(this.pStatic.u.uRes, W, H);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      // per-slot textures (A, B)
      this.slots = [0, 1].map(() => {
        const s = {
          paint: tex(gl, W, H), ink: tex(gl, W, H), light: tex(gl, W, H),
          half: tex(gl, W / 2, H / 2), halfB: tex(gl, W / 2, H / 2),
          q: tex(gl, W / 4, H / 4), qB: tex(gl, W / 4, H / 4),
        };
        s.fHalf = fbo(gl, s.half); s.fHalfB = fbo(gl, s.halfB);
        s.fQ = fbo(gl, s.q); s.fQB = fbo(gl, s.qB);
        return s;
      });
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    upload(slot, layers) {
      const gl = this.gl, s = this.slots[slot];
      for (const k of ['paint', 'ink', 'light']) {
        gl.bindTexture(gl.TEXTURE_2D, s[k]);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, layers[k]);
      }
      // blurs of paint: half-res (small rim) and quarter-res (large)
      const pass = (prog, srcTex, dstFbo, w, h, setup) => {
        gl.bindFramebuffer(gl.FRAMEBUFFER, dstFbo);
        gl.viewport(0, 0, w, h);
        gl.useProgram(prog.p);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, srcTex);
        gl.uniform1i(prog.u.uTex, 0);
        setup(prog.u);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      };
      const hw = W / 2, hh = H / 2, qw = W / 4, qh = H / 4;
      pass(this.pDown, s.paint, s.fHalf, hw, hh, (u) => gl.uniform2f(u.uTexel, 1 / W, 1 / H));
      pass(this.pBlur, s.half, s.fHalfB, hw, hh, (u) => gl.uniform2f(u.uDir, 1.2 / hw, 0));
      pass(this.pBlur, s.halfB, s.fHalf, hw, hh, (u) => gl.uniform2f(u.uDir, 0, 1.2 / hh));
      pass(this.pDown, s.half, s.fQ, qw, qh, (u) => gl.uniform2f(u.uTexel, 1 / hw, 1 / hh));
      pass(this.pBlur, s.q, s.fQB, qw, qh, (u) => gl.uniform2f(u.uDir, 2.0 / qw, 0));
      pass(this.pBlur, s.qB, s.fQ, qw, qh, (u) => gl.uniform2f(u.uDir, 0, 2.0 / qh));
    }

    /** o: {mix, type, center:[x,y], xfA, xfB (3x3 col-major arrays), wcA, wcB ([edge, gran, wobble, mottle]), raw:[a,b], grade:[vig,warm,exp,0], paperTone} */
    draw(o) {
      const gl = this.gl, P = this.pMain, u = P.u;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, W, H);
      gl.useProgram(P.p);
      const bind = (unit, t, name) => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(u[name], unit); };
      const A = this.slots[0], B = this.slots[1];
      bind(0, A.paint, 'uPaintA'); bind(1, A.ink, 'uInkA'); bind(2, A.light, 'uLightA'); bind(3, A.half, 'uBlurSA'); bind(4, A.q, 'uBlurLA');
      bind(5, B.paint, 'uPaintB'); bind(6, B.ink, 'uInkB'); bind(7, B.light, 'uLightB'); bind(8, B.half, 'uBlurSB'); bind(9, B.q, 'uBlurLB');
      bind(10, this.paper, 'uPaper'); bind(11, this.noise, 'uNoise');
      gl.uniform2f(u.uRes, W, H);
      gl.uniform1f(u.uMix, o.mix || 0);
      gl.uniform1i(u.uType, o.type || 0);
      gl.uniform2f(u.uCenter, o.center ? o.center[0] : W / 2, o.center ? o.center[1] : H / 2);
      const I = [1, 0, 0, 0, 1, 0, 0, 0, 1];
      gl.uniformMatrix3fv(u.uXfA, false, o.xfA || I);
      gl.uniformMatrix3fv(u.uXfB, false, o.xfB || I);
      gl.uniform4fv(u.uWC, o.wcA || [1, 1, 3, 0.5]);
      gl.uniform4fv(u.uWCB, o.wcB || [1, 1, 3, 0.5]);
      gl.uniform2fv(u.uRaw, o.raw || [0, 0]);
      gl.uniform1f(u.uPaperTone, o.paperTone == null ? 1 : o.paperTone);
      gl.uniform4fv(u.uGrade, o.grade || [0.18, 0.4, 1.0, 0]);
      gl.uniform1f(u.uTime, o.time || 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
  };
})();
