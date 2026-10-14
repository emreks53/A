// Post-processing: render -> (GTAO) -> bloom -> tone map (OutputPass) -> FinishPass (DOF, grade, vignette, grain, fade)
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';

export const DEFAULT_POST = () => ({
  exposure: 1.0,
  toneMapping: 'aces',            // 'aces' | 'agx' | 'neutral'
  bloom: { enabled: true, strength: 0.35, radius: 0.55, threshold: 0.85 },
  ao: { enabled: false },          // GTAO is expensive (~+1s/frame). Prefer baked/contact shadows.
  dof: { enabled: false, focus: 5, range: 3, amount: 1.0, tiltShift: false, focusY: 0.5, band: 0.25 },
  grade: { contrast: 1.05, saturation: 1.08, warmth: 0.03, tint: 0.0, lift: [0, 0, 0], gain: [1, 1, 1], gamma: 1.0 },
  vignette: 0.35,
  grain: 0.035,
  aberration: 0.0015,
  fade: 0,                          // 0..1 to black
  fadeColor: '#000000',
});

const quadVS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;

function blurMat(dir) {
  return new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: null }, dir: { value: dir }, res: { value: new THREE.Vector2(1, 1) } },
    vertexShader: quadVS,
    fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 dir, res; varying vec2 vUv;
      void main(){ vec2 o = dir / res; vec4 c = texture2D(tDiffuse, vUv) * 0.227027;
        c += (texture2D(tDiffuse, vUv + o*1.384615) + texture2D(tDiffuse, vUv - o*1.384615)) * 0.316216;
        c += (texture2D(tDiffuse, vUv + o*3.230769) + texture2D(tDiffuse, vUv - o*3.230769)) * 0.070270;
        gl_FragColor = c; }`,
    depthTest: false, depthWrite: false,
  });
}

export class FinishPass extends Pass {
  constructor(w, h) {
    super();
    const rtOpts = { type: THREE.HalfFloatType, depthBuffer: false };
    this.rtA = new THREE.WebGLRenderTarget(w >> 1, h >> 1, rtOpts); this.rtB = this.rtA.clone();
    this.rtC = new THREE.WebGLRenderTarget(w >> 2, h >> 2, rtOpts); this.rtD = this.rtC.clone();
    this.copy = new FullScreenQuad(new THREE.ShaderMaterial({ uniforms: { tDiffuse: { value: null } }, vertexShader: quadVS, fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ gl_FragColor = texture2D(tDiffuse, vUv); }`, depthTest: false, depthWrite: false }));
    this.bh = new FullScreenQuad(blurMat(new THREE.Vector2(1, 0))); this.bv = new FullScreenQuad(blurMat(new THREE.Vector2(0, 1)));
    this.u = {
      tDiffuse: { value: null }, tBlurA: { value: null }, tBlurB: { value: null }, tDepth: { value: null },
      useDof: { value: 0 }, tilt: { value: 0 }, focus: { value: 5 }, range: { value: 3 }, amount: { value: 1 }, focusY: { value: .5 }, band: { value: .25 },
      cNear: { value: .1 }, cFar: { value: 100 },
      contrast: { value: 1 }, saturation: { value: 1 }, warmth: { value: 0 }, tint: { value: 0 }, lift: { value: new THREE.Vector3() }, gain: { value: new THREE.Vector3(1, 1, 1) }, gammaV: { value: 1 },
      vignette: { value: .3 }, grain: { value: .03 }, aberr: { value: .001 }, fade: { value: 0 }, fadeColor: { value: new THREE.Color(0) }, seed: { value: 0 }, aspect: { value: w / h },
    };
    this.quad = new FullScreenQuad(new THREE.ShaderMaterial({
      uniforms: this.u, vertexShader: quadVS, depthTest: false, depthWrite: false,
      fragmentShader: `
        #include <packing>
        uniform sampler2D tDiffuse, tBlurA, tBlurB, tDepth; uniform float useDof, tilt, focus, range, amount, focusY, band, cNear, cFar;
        uniform float contrast, saturation, warmth, tint, gammaV, vignette, grain, aberr, fade, seed, aspect; uniform vec3 lift, gain, fadeColor;
        varying vec2 vUv;
        float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
        void main(){
          vec2 uv = vUv; vec2 dc = uv - .5;
          vec3 col;
          if (aberr > 0.) { vec2 off = dc * aberr * 2.; col = vec3(texture2D(tDiffuse, uv + off).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - off).b); }
          else col = texture2D(tDiffuse, uv).rgb;
          if (useDof > .5) {
            float coc;
            if (tilt > .5) { coc = smoothstep(band * .5, band * .5 + .25, abs(uv.y - focusY)); }
            else { float d = unpackRGBAToDepth(texture2D(tDepth, uv)); float vz = -perspectiveDepthToViewZ(d, cNear, cFar); if (d >= .9999) vz = cFar; coc = clamp(abs(vz - focus) / max(range, 1e-3), 0., 1.); }
            coc *= amount;
            vec3 a = texture2D(tBlurA, uv).rgb, b = texture2D(tBlurB, uv).rgb;
            col = mix(col, a, smoothstep(0., .45, coc)); col = mix(col, b, smoothstep(.45, 1., coc));
          }
          // grade (display space)
          col = pow(max(col, 0.), vec3(1. / gammaV));
          col = col * gain + lift * (1. - col);
          col += vec3(warmth, warmth * .25 + tint, -warmth) * .5 * (col);
          float l = dot(col, vec3(.2126, .7152, .0722));
          col = mix(vec3(l), col, saturation);
          col = (col - .5) * contrast + .5;
          // vignette
          vec2 vv = dc * vec2(aspect, 1.) * 1.15; float vig = 1. - vignette * smoothstep(.2, .95, dot(vv, vv) * 1.6);
          col *= vig;
          // grain
          float g = hash(uv * vec2(1080., 1920.) + seed) - .5; col += g * grain * (1. - l * .5);
          col = mix(col, fadeColor, fade);
          gl_FragColor = vec4(clamp(col, 0., 1.), 1.);
        }`,
    }));
    this.p = DEFAULT_POST();
  }
  setSize(w, h) { this.rtA.setSize(w >> 1, h >> 1); this.rtB.setSize(w >> 1, h >> 1); this.rtC.setSize(w >> 2, h >> 2); this.rtD.setSize(w >> 2, h >> 2); this.u.aspect.value = w / h; }
  blur(renderer, src, tmp, dst, w, h, radius) {
    this.bh.material.uniforms.tDiffuse.value = src.texture; this.bh.material.uniforms.res.value.set(w / radius, h / radius);
    renderer.setRenderTarget(tmp); this.bh.render(renderer);
    this.bv.material.uniforms.tDiffuse.value = tmp.texture; this.bv.material.uniforms.res.value.set(w / radius, h / radius);
    renderer.setRenderTarget(dst); this.bv.render(renderer);
  }
  render(renderer, writeBuffer, readBuffer) {
    const p = this.p, u = this.u;
    u.tDiffuse.value = readBuffer.texture;
    const dofOn = p.dof.enabled && p.dof.amount > 0.001;
    u.useDof.value = dofOn ? 1 : 0;
    if (dofOn) {
      this.copy.material.uniforms.tDiffuse.value = readBuffer.texture; renderer.setRenderTarget(this.rtA); this.copy.render(renderer);
      this.blur(renderer, this.rtA, this.rtB, this.rtA, this.rtA.width, this.rtA.height, 1.0);
      this.copy.material.uniforms.tDiffuse.value = this.rtA.texture; renderer.setRenderTarget(this.rtC); this.copy.render(renderer);
      this.blur(renderer, this.rtC, this.rtD, this.rtC, this.rtC.width, this.rtC.height, 1.0);
      this.blur(renderer, this.rtC, this.rtD, this.rtC, this.rtC.width, this.rtC.height, 2.0);
      u.tBlurA.value = this.rtA.texture; u.tBlurB.value = this.rtC.texture;
      u.tilt.value = p.dof.tiltShift ? 1 : 0; u.focus.value = p.dof.focus; u.range.value = p.dof.range; u.amount.value = p.dof.amount; u.focusY.value = p.dof.focusY; u.band.value = p.dof.band;
    }
    const g = p.grade;
    u.contrast.value = g.contrast; u.saturation.value = g.saturation; u.warmth.value = g.warmth; u.tint.value = g.tint ?? 0; u.gammaV.value = g.gamma ?? 1;
    u.lift.value.set(...(g.lift || [0, 0, 0])); u.gain.value.set(...(g.gain || [1, 1, 1]));
    u.vignette.value = p.vignette; u.grain.value = p.grain; u.aberr.value = p.aberration; u.fade.value = p.fade; u.fadeColor.value.set(p.fadeColor);
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer); this.quad.render(renderer);
  }
}

export function makeComposer(renderer, scene, camera, W, H, { msaa = 0, smaa = true } = {}) {
  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: msaa });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(1); composer.setSize(W, H);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);
  const gtao = new GTAOPass(scene, camera, W >> 1, H >> 1); gtao.enabled = false; composer.addPass(gtao);
  const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.35, 0.55, 0.85); composer.addPass(bloom);
  const output = new OutputPass(); composer.addPass(output);
  const smaaPass = new SMAAPass(W, H); smaaPass.enabled = smaa; composer.addPass(smaaPass);
  const finish = new FinishPass(W, H); composer.addPass(finish);
  return { composer, renderPass, gtao, bloom, output, smaa: smaaPass, finish };
}
