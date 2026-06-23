# Netra Website — Motion & Animation Stack

A full breakdown of every framework, library, technique, and pattern used to drive the motion on this site. Drop this into your portfolio's context.

## 1. Dependencies (the actual libraries)

From `frontend/package.json`:

```json
"dependencies": {
  "animejs": "^4.4.1",   // DOM tweening, timelines, text splitting, SVG draw-on
  "lenis": "^1.3.23",    // inertia / smooth-scroll wrapper around native scroll
  "three": "^0.184.0"    // WebGL stage, shaders, post-processing (bloom)
}
"devDependencies": {
  "vite": "^7.1.5",
  "puppeteer-core": "^23.11.1"  // only for screenshotting (shoot.mjs), not runtime
}
```

Only **three libraries** drive everything:
- **anime.js v4** — all DOM/SVG animation. (v4 is the ES-module, tree-shakeable rewrite; APIs differ from v3.)
- **Lenis** — smooth-scroll. Pure scroll-position smoother, not a scroll-trigger framework.
- **three.js** + its `examples/jsm/postprocessing` modules — `EffectComposer`, `RenderPass`, `UnrealBloomPass`, `OutputPass`.

No GSAP, no Framer Motion, no ScrollTrigger, no React Three Fiber. It's all vanilla.

## 2. The architecture (how the pieces talk)

```
┌─────────────────────────────────────────────────────────────┐
│ Lenis (smooth scroll)  →  scrollY                           │
│                              ↓                              │
│ scroll.js  →  s = sceneIndex + localProgressInSection       │
│                              ↓                              │
│ director.js — turns s into { camPos, camLook, fov, morph }  │
│                              ↓                              │
│ three.js stage.onFrame(dt, t)                               │
│    ├─ damped camera lerp toward director output             │
│    ├─ world.update(morph, dt, t, pointer) — shaders + meshes│
│    └─ projectToScreen(vec3) → drives DOM overlays           │
│                                                             │
│ anime.js (independent, IntersectionObserver-triggered)      │
│    ├─ boot intro (SVG draw-on + scale)                      │
│    ├─ reveals (split-text char cascade + count-ups)         │
│    ├─ word cycler, form, drawer                             │
└─────────────────────────────────────────────────────────────┘
```

Two layers run side-by-side and never directly couple:
- **WebGL layer** is scroll-driven (continuous interpolation of one "scene coordinate").
- **DOM layer** is intersection-triggered (per-block timelines that fire when in view).

A `try/catch` around the WebGL boot means a GPU failure leaves the static page perfectly readable.

## 3. Smooth scroll — Lenis

```js
// main.js
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

const lenis = new Lenis({
  lerp: 0.085,          // lower = smoother/heavier inertia
  wheelMultiplier: 1,
  smoothWheel: true,
  touchMultiplier: 1.4,
});
const lraf = (time) => { lenis.raf(time); requestAnimationFrame(lraf); };
requestAnimationFrame(lraf);
```

CSS: `html { scroll-behavior: auto; overflow-x: clip; }` — native smooth must be off so Lenis owns scroll feel. `overflow-x: clip` (not `hidden`) doesn't break sticky/Lenis.

Anchor links use `lenis.scrollTo(target, { offset: -40, duration: 1.1 })`; if Lenis is unavailable, falls back to anime.js animating `window.scrollTo`.

## 4. Scroll → continuous "scene coordinate"

`scroll.js` — the key insight that lets the camera glide across sections instead of snapping:

```js
// caches each section's { top, height } on resize/load
function read() {
  const y = window.scrollY;
  const vh = window.innerHeight;
  let index = 0;
  for (let i = 0; i < rects.length; i++) if (y + 1 >= rects[i].top) index = i;
  const r = rects[index];
  const span = Math.max(1, r.height - vh);
  const localT = clamp((y - r.top) / span);
  return { s: index + localT, index, localT, progress: clamp(y / docMax) };
}
```

So `s ∈ [0, N-1]` is one continuous float. Every animation reads from `s`.

## 5. The Director — scroll → camera & morph state

`three/director.js` — translates `s` into:

**Camera keyframes** at exact scene-coords, lerped with smoothstep:
```js
const KEYS = [
  { s: 0.0,  pos: [0,12,19],    look: [0,-4.5,-6], fov: 44 }, // hero
  { s: 1.5,  pos: [-3.4,8.5,18],look: [2.6,1.5,-3],fov: 45 }, // problem
  { s: 2.5,  pos: [0,18,34],    look: [0,-2,-7],   fov: 49 }, // wide pull-back
  { s: 3.5,  pos: [10,4.6,13.5],look: [11.5,2.2,1.2],fov:40},// close on edge
  { s: 4.3,  pos: [0.5,6.8,19], look: [0,1.0,-1],  fov: 42 }, // contact
];
```
Bracket the two keyframes around current `s`, smoothstep the local fraction, `lerpVectors`.

**Morph state** — abstract floats that the world reads:
```js
morph.ignite = smoothstep(0.0, 0.85, s);              // ramp
morph.dim    = band(1.1, 1.45, 1.7, 2.0, s);          // triangle window
morph.swarm  = band(1.15, 1.55, 1.75, 2.0, s);
morph.drone  = smoothstep(3.05, 3.5, s);              // gated start
morph.lock   = clamp(smoothstep(3.45, 3.72, s)) * (1 - smoothstep(4.1, 4.45, s));
```

`band(lo,a,b,hi,s) = smoothstep(lo,a,s) - smoothstep(b,hi,s)` is the workhorse pulse — 0→1→0 across a window. This is how every effect appears, peaks, and recedes as you scroll past it.

## 6. The stage — three.js setup

`three/stage.js`:

```js
const renderer = new THREE.WebGLRenderer({
  canvas, antialias: !lite, alpha: false,
  powerPreference: 'high-performance', stencil: false,
});
renderer.toneMapping = THREE.NoToneMapping;          // preserve brand colors
renderer.outputColorSpace = THREE.SRGBColorSpace;

scene.fog = new THREE.FogExp2(COLOR.black, 0.026);   // depth fade
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 240);
```

**Post-processing (bloom)** — disabled on low-power:
```js
composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
// (resolution, strength, radius, threshold)
bloomPass = new UnrealBloomPass(new THREE.Vector2(1,1), 0.22, 0.3, 0.42);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());
```
Threshold of 0.42 keeps the dark grid from blooming; only hot node cores glow.

**Frame loop** — single `THREE.Clock`, `dt` capped at 0.05 to prevent spike on tab return, a callback Set so any module can hook in:
```js
stage.onFrame((dt, t) => { /* sync director output → camera + world */ });
```

**Pointer parallax** — pointer recorded as `-1..1` and damped:
```js
pointerSmooth.x = damp(pointerSmooth.x, pointer.x, 6, dt);
```

**Frame-independent damping** (`util.js`) — the entire reason camera moves feel buttery, not floaty:
```js
export const damp = (cur, tgt, lambda, dt) =>
  lerp(cur, tgt, 1 - Math.exp(-lambda * dt));
```
Used everywhere camera/pointer/FOV need to follow a moving target.

**3D → DOM projection** — drives the lock-on reticle and device labels:
```js
function projectToScreen(vec3) {
  _p.copy(vec3).project(camera);
  return {
    x: (_p.x * 0.5 + 0.5) * innerWidth,
    y: (-_p.y * 0.5 + 0.5) * innerHeight,
    visible: _p.z < 1 && Math.abs(_p.x) <= 1.2 && Math.abs(_p.y) <= 1.2,
  };
}
```

**Visibility pause** — `clock.getDelta()` called once on resume to swallow the gap so `dt` doesn't spike.

## 7. The world — meshes, shaders, layers

`three/world.js` is the big file (~1100 lines). Layers:

- **`field`** — `THREE.Points` with custom GLSL shader (additive blending, fog, ignite, dim, breathe, depth-faded `gl_PointSize`).
- **`links`** — `THREE.LineSegments`; vertex shader does "draw-on" by interpolating the end vertex from the start using a `uLink` uniform, fragment shader has a traveling pulse `fract(uTime * 0.22 + vSeed * 7.0)`.
- **`pylons`** — `THREE.InstancedMesh` of `BoxGeometry`, brightness updated per-instance per-frame via `setColorAt` + `instanceColor.needsUpdate = true`.
- **`grid`** — fragment shader procedural grid using `fwidth(coord)` for antialiased lines + radial fade for "infinite floor without a hard edge".
- **`packet`** — `THREE.Sprite` traveling along a precomputed BFS path through the link graph; trail = 6 trailing sprites at staggered `t`.
- **`pathTrace`** — `Line` whose fragment shader lights up segments where `vT < uHead` (the head position), with `smoothstep(0.09, 0.0, abs(d))` for a bright leading edge.
- **`worldfield`** — wider second `Points` layer, scaled radius up to 80 units, with rare bright "pin" points (critical infrastructure markers).
- **`drone`** — manually-modeled quadrotor (`OctahedronGeometry` body + 4 `TorusGeometry` rotors + dashed `LineDashedMaterial` uplink). Rotors spun per-frame; entire group `lerp`'d from entry to hover.
- **`rings`** — three `RingGeometry` meshes scaled and fading on `(1 - phase) * 0.7` (modality-coded RGB).
- **`converge`** — `LineSegments` whose end vertices `lerp` from each node toward the drone as `lock` ramps.

**Shader pattern used throughout** — uniforms updated each frame from `morph`:
```js
fieldUniforms.uIgnite.value = s.ignite;
linkUniforms.uLink.value    = s.link;
swarmUniforms.uSwarm.value  = s.swarm;
worldUniforms.uWorld.value  = s.world;
```

The vertex shader gates each point's appearance by comparing a per-vertex seed to the uniform — this gives the deploy-from-center cascade for free:
```glsl
float lit = smoothstep(aSeed - 0.05, aSeed + 0.12, uIgnite);
```

**Deterministic layout** — a `mulberry32` PRNG (`rng(SEED)` in `util.js`) seeds node positions so what you see is identical every load. Layout uses a **phyllotaxis disk** (`i * golden + jitter`) for organic-looking-but-even spread.

**Performance profiles** — `isLowPower()` checks `pointer: coarse`, narrow viewport, `navigator.hardwareConcurrency <= 4`, `deviceMemory <= 4`. The `lite` profile uses fewer nodes, no bloom, smaller pixel ratio, no antialias.

## 8. DOM animation — anime.js v4

v4 imports are **named exports**, not a default `anime()`:
```js
import { animate, utils, stagger, createTimeline, createDrawable, splitText }
  from 'animejs';
```

### Boot intro — `dom/boot.js`

SVG draw-on via `createDrawable` (the v4 replacement for v3's `strokeDashoffset` hack):
```js
const [drawable] = createDrawable(slash);
const tl = createTimeline({ defaults: { ease: 'outExpo' } });
tl.set(dots, { scale: 0, opacity: 0 }, 0);
tl.set(drawable, { draw: '0 0' }, 0);
tl.add(dots, {
  scale: [0, 1], opacity: [0, 1],
  ease: 'outBack(2.2)', duration: 520,
  delay: stagger(110),     // cascade between elements
}, 120);
tl.add(drawable, { draw: ['0 0', '0 1'], duration: 720, ease: 'inOutQuad' }, 300);
```

Boot also tweens a **plain JS object** (`state.bootIgnite`) so the WebGL world can read it:
```js
animate(state, { bootIgnite: [0, 0.7], duration: 1900, ease: 'inOut(2)' });
```

### Reveals — `dom/reveals.js`

Headlines use `splitText` to cascade per-character:
```js
const { chars } = splitText(el, { chars: true, words: true });
utils.set(chars, { display: 'inline-block', opacity: 0, y: '0.62em' });
tl.add(chars, { opacity: [0,1], y: ['0.62em', 0],
  duration: 740, ease: 'outExpo', delay: stagger(15) }, at);
```

Count-up numbers tween a dummy object's property:
```js
const o = { v: 0 };
tl.add(o, {
  v: [0, target], duration: 1500, ease: 'out(3)',
  onUpdate: () => { el.textContent = pre + Math.round(o.v).toLocaleString() + suf; },
}, tail);
```

Timeline is built with `autoplay: false`, then fired by an IntersectionObserver:
```js
const io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting && !played) {
    played = true; tl.play(); io.disconnect();
  }
}, { threshold: 0.2, rootMargin: '0px 0px -10% 0px' });
```

### Word cycler — `dom/cycle.js`

Old text fades up-out, new text fades up-in. Only ticks while in view:
```js
animate(word, { opacity: [1,0], y: [0,'-0.3em'], duration: 240, ease: 'inQuad',
  onComplete: () => {
    word.textContent = items[i];
    animate(word, { opacity: [0,1], y: ['0.3em',0], duration: 360, ease: 'outExpo' });
  }});
```

### Drawer & form

Slide-down drawer:
```js
animate(panel, { translateY: ['-110%','0%'], duration: 620, ease: 'out(3)' });
```
Form shake on invalid:
```js
animate(field, { x: [0,-9,9,-6,6,0], duration: 420, ease: 'inOutSine' });
```
Submit collapse with stagger:
```js
animate(fields, { opacity: [1,0], y: [0,-12], duration: 380, ease: 'inQuad',
  delay: stagger(35) });
```

### Easings used

`outExpo`, `inOutQuad`, `outBack(2.2)`, `inOut(2)`, `out(3)`, `inOutQuart`, `inOutSine`, `inQuad`, `in(3)`. v4 uses string identifiers; parameterized like `outBack(2.2)` for overshoot tuning.

## 9. The HTML contract (data-attributes)

Animation modules find their targets via `data-*` rather than classes, so markup is declarative:

| attribute | purpose |
|---|---|
| `data-scene="hero"` | scroll mapped to scene index (in `config.js` SCENES order) |
| `data-reveal` | block whose children are intro-timelined when in view |
| `data-r` | a child of `[data-reveal]` that participates in the cascade |
| `data-split` | split into chars for the per-character reveal |
| `data-count="30000" data-prefix="" data-suffix=":1"` | count-up tween |
| `data-cycle="A\|B\|C" data-cycle-word` | host + slot for word cycler |
| `data-pilot-open` / `data-pilot-close` | drawer triggers |
| `data-progress`, `data-hud="idx"`, `data-hud="label"` | HUD readouts |

## 10. CSS motion (small but load-bearing)

Almost no CSS animation — JS owns it. The handful of CSS-driven things:

```css
:root { --ease-out: cubic-bezier(0.16, 1, 0.3, 1); }

/* shared easing for transition-style hovers */
.btn { transition: color .3s, background .3s, border-color .3s,
                   box-shadow .3s, transform .15s; }

/* the "scroll" hint pulses on a CSS keyframe so it never stops */
@keyframes hintPulse {
  0%,100% { transform: scaleY(0.6); opacity: .4; }
  50%     { transform: scaleY(1);   opacity: 1; }
}
.scroll-hint { animation: hintPulse 2.4s var(--ease-out) infinite; }

/* every animated overlay declares will-change so the compositor promotes it */
#veil      { will-change: opacity; }
.progress  { will-change: transform, opacity; }
.reticle   { will-change: transform, opacity; }
```

A `#veil` element sits between the canvas and content and has its `opacity` set from JS each frame (`(1 - smoothstep(0,0.82,r.s)) * 0.9`) — that's how the scene fades out of the dark on first scroll. A `#scanlines` overlay with `mix-blend-mode: overlay` and a `repeating-linear-gradient` adds the CRT texture.

## 11. Translating this to a personal portfolio

The minimum recipe to clone the feel **without** the WebGL stage:

1. `npm i animejs lenis`
2. Wire Lenis (the 8-line snippet above).
3. Mark sections with `data-scene`, add the `createScroll(sceneIds)` controller from `scroll.js` (it's standalone, 50 lines).
4. Use `[data-reveal]` blocks + `data-r` / `data-split` / `data-count` and copy `reveals.js` wholesale — it works with any markup.
5. For "cinematic" feel without three.js: drive CSS variables (`element.style.setProperty('--t', s.toFixed(3))`) from the scroll coordinate each frame, and have CSS read them to translate/scale/blur/opacity hero artwork.
6. Steal `damp()`, `smoothstep()`, `band()`, `pulse()` from `util.js` — they're the core of how every transition feels weighted instead of linear.
7. If you want the WebGL background: the `stage.js` setup (renderer + bloom composer + `onFrame` registry + `projectToScreen`) is fully reusable as a black-box; only `world.js` is project-specific.

The file you most want to copy as a template is **`director.js`** — the `KEYS` array + `band()` pattern is how you make scroll feel like a director's camera path rather than independent section animations.
