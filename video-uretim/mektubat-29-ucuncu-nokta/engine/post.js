// post.js — WebGL2 gouache finishing pass.
// scene canvas (painted flat gouache) → edge break, matte chalky surface, paint relief, paper border → + crisp overlay (subtitles)
import { W, H } from './core.js';

const VS = `#version 300 es
in vec2 p; out vec2 uv;
void main(){ uv = p*0.5+0.5; gl_Position = vec4(p,0.,1.); }`;

const FS = `#version 300 es
precision highp float;
in vec2 uv; out vec4 o;
uniform sampler2D scene, overlay, noiseT, paperT;
uniform vec2 res;
uniform float edgeAmp, relief, border, grain, matte, frameSeed, overlayPaper, vign;
uniform vec3 paperCol;
float lum(vec3 c){ return dot(c, vec3(0.299,0.587,0.114)); }
vec3 S(vec2 q){ return texture(scene, q).rgb; }
void main(){
  vec2 px = 1.0/res;
  // texture row 0 = image top and readPixels starts at framebuffer row 0, so q = uv yields top-down readback
  vec2 q = uv;
  vec2 frag = q*res;
  // --- edge break: anisotropic bristle displacement (mostly horizontal streaks, like gouache dabs)
  vec4 n1 = texture(noiseT, frag/1024.0*vec2(0.9,1.0));
  vec4 n2 = texture(noiseT, frag/1024.0*vec2(0.33,2.4) + vec2(0.37,0.11));
  vec2 d = vec2((n1.b-0.5)*1.6 + (n2.a-0.5)*2.2, (n1.g-0.5)*1.2 + (n2.b-0.5)*1.0) * edgeAmp;
  vec3 c = S(q + d*px);
  // --- relief: emboss from local luminance (striation + edges) lit from upper right
  float l  = lum(c);
  float lx = lum(S(q + (d + vec2(1.5,0.0))*px)) - lum(S(q + (d - vec2(1.5,0.0))*px));
  float ly = lum(S(q + (d + vec2(0.0,1.5))*px)) - lum(S(q + (d - vec2(0.0,1.5))*px));
  vec3 nrm = normalize(vec3(-lx*6.0, ly*6.0, 1.0));
  vec3 L = normalize(vec3(0.55, 0.6, 0.6));
  float sh = dot(nrm, L) - dot(vec3(0,0,1), L);
  c *= 1.0 + sh*relief;
  // --- matte, chalky gouache: compress, lift darks a touch, desaturate highlights a little
  vec3 cm = mix(c, vec3(l), 0.06);
  cm = cm*0.94 + 0.035;
  c = mix(c, cm, matte);
  // chalky speckles in dark tones
  float sp = texture(noiseT, frag/1024.0*3.7 + vec2(0.21,0.73)).b;
  float dark = 1.0 - smoothstep(0.18, 0.55, l);
  c += vec3(0.05) * smoothstep(0.80, 0.98, sp) * dark;
  // --- paper grain (cold press), subtle everywhere
  float pg = texture(paperT, frag/1024.0).r;
  c *= 1.0 + (pg-0.5)*grain;
  // --- painted border on cream paper (dry-brush broken rectangle)
  if (border > 0.0) {
    float dx = min(frag.x, res.x-frag.x), dy = min(frag.y, res.y-frag.y);
    float nb = (texture(noiseT, frag/1024.0*vec2(0.25,4.0)).a-0.5)*26.0 + (texture(noiseT, frag/1024.0*vec2(4.0,0.25)).a-0.5)*26.0;
    float nb2 = (texture(noiseT, frag/1024.0*vec2(0.08,0.08)).r-0.5)*18.0;
    float m = smoothstep(0.0, 2.0, min(dx, dy) - border - nb - nb2);
    vec3 paper = paperCol * (1.0 + (pg-0.5)*0.16);
    c = mix(paper, c, m);
  }
  // --- gentle vignette (painted, not photographic)
  vec2 vq = q - 0.5; c *= 1.0 - vign*dot(vq*vec2(1.0,0.7), vq*vec2(1.0,0.7))*1.6;
  // --- overlay (subtitles, calligraphy): crisp, premultiplied
  vec4 ov = texture(overlay, q);
  vec3 ovc = ov.rgb * (1.0 + (pg-0.5)*overlayPaper);
  c = c*(1.0-ov.a) + ovc;
  o = vec4(clamp(c,0.0,1.0), 1.0);
}`;

export class Post {
  constructor(canvas, sceneCanvas, overlayCanvas, images) {
    this.c = canvas; this.scene = sceneCanvas; this.overlay = overlayCanvas;
    const gl = (this.gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true, premultipliedAlpha: false, antialias: false }));
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const pr = (this.prog = gl.createProgram());
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    gl.useProgram(pr);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.tex = {};
    const mk = (name, unit, src, repeat) => {
      const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      const wrap = repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE;
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
      if (src) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
      gl.uniform1i(gl.getUniformLocation(pr, name), unit);
      this.tex[name] = { t, unit };
    };
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    mk('scene', 0, null, false); mk('overlay', 1, null, false); mk('noiseT', 2, images.noise, true); mk('paperT', 3, images.paper, true);
    this.u = (n) => gl.getUniformLocation(pr, n);
    gl.uniform2f(this.u('res'), W, H);
    this.params = { edgeAmp: 0.7, relief: 0.2, border: 0, grain: 0.07, matte: 0.6, overlayPaper: 0.05, vign: 0.18, paperCol: [0.93, 0.894, 0.816] };
  }
  render(p = {}) {
    const gl = this.gl; const q = { ...this.params, ...p };
    gl.viewport(0, 0, W, H);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.tex.scene.t);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.scene);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.tex.overlay.t);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.overlay);
    for (const k of ['edgeAmp', 'relief', 'border', 'grain', 'matte', 'overlayPaper', 'vign']) gl.uniform1f(this.u(k), q[k]);
    gl.uniform3f(this.u('paperCol'), ...q.paperCol);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  read() {
    const gl = this.gl; const px = new Uint8Array(W * H * 4);
    gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
    return px;
  }
}
