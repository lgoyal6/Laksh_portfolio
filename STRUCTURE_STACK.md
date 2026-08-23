# Netra Website - HTML & CSS Structure

A full breakdown of how the page is laid out, layered, and styled. Pair with `MOTION_STACK.md`. Designed so you can lift the patterns into a portfolio without dragging the brand specifics along.

## 1. The big idea - fixed stage, scrolling content

Every "cinematic" site lives or dies on this layout choice:

```
z-index   layer
─────────────────────────────────────────────
   100    #boot         loading overlay (kills itself after intro)
    60    #pilot        modal drawer
    40    #nav          sticky header
    30    #hud, #progress  scene index + scroll bar
    20    #reticle, .device-label  DOM tags projected onto 3D
     2    #scroll (main)   ALL content — sections, type, forms
     1    #veil, #vignette, #scanlines  atmospherics over canvas
     0    <canvas id="stage">  ← fixed, full-screen WebGL
```

The canvas is `position: fixed; inset: 0` and **stays put**. Content scrolls over it inside `#scroll`. That's the whole trick - the 3D scene never moves in the DOM, only the camera moves (driven by scroll-Y, see motion doc).

```html
<body class="is-booting">
  <canvas id="stage"></canvas>     <!-- z:0 fixed -->
  <div id="vignette"></div>        <!-- z:1 fixed atmospherics -->
  <div id="scanlines"></div>
  <div id="veil"></div>            <!-- z:1 opacity driven by JS -->

  <div id="reticle"></div>         <!-- z:20 projected onto 3D -->
  <div id="boot"></div>            <!-- z:100, removed after intro -->
  <header id="nav"></header>       <!-- z:40 -->

  <main id="scroll">               <!-- z:2 — sits on top of canvas -->
    <section class="scene" data-scene="hero">...</section>
    <section class="scene" data-scene="problem">...</section>
    ...
  </main>

  <div id="pilot"></div>           <!-- z:60 modal -->
  <div id="hud"></div>             <!-- z:30 -->
  <div id="progress"></div>        <!-- z:30 -->
</body>
```

## 2. Design tokens (`:root`)

All brand and rhythm constants are CSS variables, mirrored from `src/config.js` so JS and CSS stay locked:

```css
:root {
  --bg: #020203;          /* near-black, NOT pure #000 */
  --bg-2: #06070a;
  --red: #e0533d;         /* brand accent */
  --red-deep: #b83a28;
  --coral: #ef7c5f;       /* secondary accent */
  --white: #f5f6f7;
  --ink: #ffffff;
  --gray: #8b8b8b;        /* body copy */
  --dim: #6b6b6b;         /* meta / faint */
  --faint: #3a3a3a;       /* placeholder */
  --hair: #2b2b2b;        /* 1px borders, hairlines */

  /* modality channels — three semantic accents */
  --rf: #35e0d0;
  --acoustic: #f5a623;
  --optical: #9b6cff;

  --font-sans:  "Space Grotesk", "Helvetica Neue", system-ui, sans-serif;
  --font-mono:  "JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace;
  --font-brand: "Helvetica Neue", "Inter", Helvetica, Arial, sans-serif;

  --gutter: clamp(22px, 5.5vw, 96px);
  --maxw: 1320px;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --nav-h: 68px;
}
```

Key choices to copy:
- **`--bg: #020203`** not `#000`. Pure black flattens fog and bloom.
- **`clamp(22px, 5.5vw, 96px)`** for the page gutter - one variable scales horizontal rhythm from phone to ultrawide.
- **Three font families**: a tight display sans, a wide-tracked mono for kickers/metadata, a light wordmark sans. The mono carries 90% of the "tactical" feel.
- **`--ease-out: cubic-bezier(0.16, 1, 0.3, 1)`** - the "soft-overshoot" easing used on every transition. Single token used everywhere.

## 3. Reset & global rules

Minimal - no Tailwind, no Normalize:

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html {
  scroll-behavior: auto;   /* JS owns scroll feel; native smooth fights Lenis */
  -webkit-text-size-adjust: 100%;
  overflow-x: clip;        /* root-level guard against horizontal scroll
                              — `clip` doesn't break sticky/Lenis like `hidden` does */
}
body {
  background: var(--bg);
  color: var(--white);
  font-family: var(--font-sans);
  font-weight: 400;
  line-height: 1.5;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
body.is-booting { overflow: hidden; height: 100vh; }  /* lock scroll during boot */

a { color: inherit; text-decoration: none; }
em { font-style: normal; color: var(--coral); }       /* repurpose <em> as accent */
::selection { background: var(--red); color: #0a0a0a; }
```

`body.is-booting` is the only place scroll gets locked - boot.js removes the class once the intro completes.

## 4. The fixed atmospheric stack

These four siblings of the canvas turn a WebGL scene into something that looks photographed instead of rendered:

```css
#stage {
  position: fixed; inset: 0;
  width: 100%; height: 100%;
  display: block; z-index: 0;
  touch-action: none;          /* prevent mobile gesture interference */
}

/* Vignette: a static dual-gradient overlay — radial dark corners +
   vertical dark top/bottom. Pulls the eye to center. */
#vignette {
  position: fixed; inset: 0; z-index: 1; pointer-events: none;
  background:
    radial-gradient(135% 100% at 50% 46%,
      transparent 34%, rgba(0,0,0,.55) 78%, rgba(0,0,0,.8) 100%),
    linear-gradient(to bottom,
      rgba(0,0,0,.95) 0%,
      rgba(0,0,0,.4)  16%,
      transparent     38%,
      transparent     60%,
      rgba(0,0,0,.55) 84%,
      rgba(0,0,0,.92) 100%);
}

/* Veil: JS sets opacity each frame from scroll progress, so the scene
   "emerges from the dark" then stays revealed. */
#veil {
  position: fixed; inset: 0; z-index: 1; pointer-events: none;
  opacity: 0;
  will-change: opacity;
  background: radial-gradient(120% 95% at 50% 42%,
    #020203 0%, #020203 55%, rgba(2,2,3,.82) 100%);
}

/* Scanlines: a 3px-period repeating gradient with mix-blend-mode: overlay.
   Adds a faint CRT/sensor feel without dimming anything. */
#scanlines {
  position: fixed; inset: 0; z-index: 1; pointer-events: none;
  opacity: .5;
  background: repeating-linear-gradient(to bottom,
    rgba(255,255,255,.018) 0px,
    rgba(255,255,255,.018) 1px,
    transparent 2px,
    transparent 3px);
  mix-blend-mode: overlay;
}
```

A bonus: a dotted column motif down the right edge using a `position: fixed` pseudo-element with a tiled radial gradient.

```css
#scroll::after {
  content: ""; position: fixed; top: 0; bottom: 0;
  right: clamp(14px, 2.6vw, 40px);
  width: 3px; z-index: 1; pointer-events: none;
  background-image: radial-gradient(currentColor 1px, transparent 1.4px);
  background-size: 3px 13px;
  color: #1d1d1d; opacity: .9;
}
@media (max-width: 720px) { #scroll::after { display: none; } }
```

This is the cheapest possible "instrument panel" detail - looks expensive, costs nothing.

## 5. Scrollable content (`#scroll`) + scene pattern

The content lane sits at `z-index: 2`:

```css
#scroll { position: relative; z-index: 2; }
.scene { position: relative; }
```

Each scene uses the **sticky-pin pattern** - the section is *taller* than the viewport, but its inner content is `position: sticky` so the copy holds while you scroll within the section:

```css
.scene__pin {
  position: sticky;
  top: 0;
  min-height: 100vh;
  min-height: 100svh;       /* small viewport — fixes mobile URL bar */
  display: flex;
  align-items: center;
  padding: calc(var(--nav-h) + 4vh) var(--gutter) 8vh;
}
.scene--hero      { min-height: 165vh; }
.scene--problem   { min-height: 160vh; }
.scene--scale     { min-height: 165vh; }
.scene--detection { min-height: 230vh; }  /* longest — most camera work */
```

The taller the section, the longer the camera move spent on that beat. **This is where you pace the film.**

Hero anchors copy to the top, not the center, so the 3D layer dominates the lower screen:
```css
.scene--hero .scene__pin {
  align-items: flex-start;
  padding-top: clamp(96px, 15vh, 190px);
}
```

## 6. Content blocks + the "readable over WebGL" trick

A reusable `.block` with three alignment variants:

```css
.block {
  width: 100%; max-width: var(--maxw); margin-inline: auto;
  display: flex; flex-direction: column;
  position: relative;
}
.block--center { align-items: center; text-align: center; }
.block--left   { align-items: flex-start; text-align: left;  max-width: min(720px, 62vw); margin-inline: 0 auto; }
.block--right  { align-items: flex-end;   text-align: right; max-width: min(720px, 62vw); margin-inline: auto 0; }
```

**The single most important style on the site** - a softly-feathered backdrop blur ONLY behind the copy, so text is legible against a busy 3D scene but the field around the text stays crisp:

```css
.block::before {
  content: "";
  position: absolute;
  z-index: -1;
  inset: -30% -12px;      /* generous bleed past the text */
  pointer-events: none;
  backdrop-filter: blur(9px) brightness(0.82);
  -webkit-backdrop-filter: blur(9px) brightness(0.82);
  background: radial-gradient(68% 62% at 50% 50%,
    rgba(2,2,3,.5), rgba(2,2,3,0) 72%);
  /* mask feathers both the blur AND the dim into nothing at the edges */
  -webkit-mask-image: radial-gradient(74% 68% at 50% 50%, #000 42%, transparent 82%);
          mask-image: radial-gradient(74% 68% at 50% 50%, #000 42%, transparent 82%);
}
```

Stack on top of that: text-shadows on every type primitive so even where the mask fades out, glyphs still have a dark halo.

## 7. Type system

Three sizes of display, plus body/caption/kicker - all `clamp()`-fluid:

```css
.kicker {                    /* tiny mono uppercase label */
  font-family: var(--font-mono);
  font-size: .72rem;
  letter-spacing: .26em;
  text-transform: uppercase;
  color: var(--gray);
  display: inline-flex; align-items: center; gap: .7em;
  margin-bottom: 1.5rem;
}
.kicker--red { color: var(--red); }
.kicker__dot {                /* the trademark 6px rotated square */
  width: 6px; height: 6px;
  background: currentColor;
  transform: rotate(45deg);
  box-shadow: 0 0 10px currentColor;
}

.display {                   /* hero-scale */
  font-size: clamp(3.1rem, 11vw, 9.4rem);
  font-weight: 500;
  line-height: 0.92;          /* tight, almost cinema-poster */
  letter-spacing: -0.03em;
  color: var(--white);
  text-shadow: 0 2px 40px rgba(8,8,9,.7),
               0 0   12px rgba(8,8,9,.5);
}
.display--sm { font-size: clamp(2.6rem, 7.2vw, 6rem);  letter-spacing: -0.025em; line-height: 0.98; }
.headline    { font-size: clamp(2rem,   5.2vw, 4.4rem); font-weight: 500; line-height: 1.02;
               letter-spacing: -0.022em; max-width: 18ch; }

.lede {                      /* mono "subtitle" under the headline */
  font-family: var(--font-mono);
  font-size: clamp(.86rem, 1.4vw, 1.05rem);
  letter-spacing: .04em;
  color: #cfd2d5;
  margin-top: 1.8rem;
  max-width: min(48ch, 100%);
  text-shadow: 0 1px 3px rgba(4,4,6,.95),
               0 2px 22px rgba(4,4,6,.92),
               0 0 14px rgba(4,4,6,.8);
}
.caption     { font-size: clamp(1rem, 1.5vw, 1.22rem); color: #b4b7ba;
               max-width: 46ch; margin-top: 1.6rem; line-height: 1.55; }

/* The character spans created by anime.js splitText() need this baseline: */
.split-char { display: inline-block; will-change: transform, opacity; }
.split-word { display: inline-block; white-space: nowrap; }
```

Patterns worth lifting:
- **`max-width: 18ch` / `46ch`** caps line length in character units, never pixels.
- **`text-shadow` with three stops** (sharp / mid / wide) gives legibility AND a subtle "glow" feel - pure visual cheat-code.
- **mono kickers + serif/grotesk headlines** is a low-effort recipe for "design-conscious" hierarchy.

## 8. Buttons

```css
.btn {
  --b: var(--hair);
  font-family: var(--font-mono);
  font-size: .74rem;
  letter-spacing: .18em;
  text-transform: uppercase;
  padding: .95em 1.5em;
  border: 1px solid var(--b);
  color: var(--white);
  display: inline-flex; align-items: center; gap: .6em;
  cursor: pointer;
  background: transparent;
  transition: color .3s, background .3s, border-color .3s, box-shadow .3s, transform .15s;
  position: relative;
}
.btn--primary {
  background: var(--red); border-color: var(--red);
  color: #160a07; font-weight: 700;
  box-shadow: 0 0 0 rgba(224,83,61,0);
}
.btn--primary:hover {
  background: #ef6450; border-color: #ef6450;
  box-shadow: 0 0 34px rgba(224,83,61,.45);    /* the "ignite" glow */
  transform: translateY(-1px);
}
.btn--ghost { color: #cbced1; --b: #3c4147; }
.btn--ghost:hover span { transform: translateY(3px); }  /* icon nudge */
.btn:active { transform: translateY(0) scale(0.99); }
.btn--block { width: 100%; justify-content: center; padding: 1.1em; }
```

The `--b` border variable + `transform: translateY(-1px)` lift + glowing `box-shadow` on hover is the whole identity in 8 lines.

## 9. Forms

```css
.form { display: flex; flex-direction: column; gap: 1.5rem; }
.field { display: flex; flex-direction: column; gap: .5rem; }
.field label {                       /* mono micro-label above each input */
  font-family: var(--font-mono);
  font-size: .66rem;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: var(--dim);
}
.field input {                        /* underline-only, no box */
  font-family: var(--font-sans);
  font-size: 1rem;
  color: var(--white);
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--hair);
  padding: .6em 0;
  transition: border-color .3s, box-shadow .3s;
}
.field input:focus {
  outline: none;
  border-color: var(--red);
  box-shadow: 0 1px 0 var(--red);    /* a second underline = a glowing bar */
}
```

The "underline-input + uppercase mono label" pattern travels well to any tactical/editorial site.

## 10. Sticky nav

A header that slides in once the boot finishes, hides behind itself on demand:

```css
#nav {
  position: fixed; top: 0; left: 0; right: 0;
  height: var(--nav-h);
  z-index: 40;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 var(--gutter);
  background: linear-gradient(to bottom,
    rgba(10,10,10,.66), rgba(10,10,10,0));   /* fades into the canvas */
  transition: opacity .6s, transform .6s;
}
#nav[data-hidden="true"] {
  opacity: 0;
  transform: translateY(-100%);
  pointer-events: none;
}
```

`data-hidden` toggled in JS - declarative, no class-swap soup. Same idea for `#hud[data-hidden]`.

## 11. The drawer (drops down from top)

```css
.pilot {
  position: fixed; inset: 0; z-index: 60;
  display: flex; justify-content: center; align-items: flex-start;
  padding-top: clamp(20px, 6vh, 72px);
  pointer-events: none;
}
.pilot[data-open="true"] { pointer-events: auto; }

.pilot__backdrop {
  position: absolute; inset: 0;
  background: rgba(2,2,3,.66);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
  opacity: 0;
  transition: opacity .4s;
}
.pilot[data-open="true"] .pilot__backdrop { opacity: 1; }

.pilot__panel {
  position: relative;
  width: min(560px, calc(100vw - 24px));
  transform: translateY(-130%);       /* off-screen baseline */
  background: linear-gradient(180deg, rgba(14,14,17,.97), rgba(7,7,9,.98));
  border: 1px solid var(--hair);
  border-radius: 6px;
  padding: clamp(26px, 4vw, 46px);
  box-shadow: 0 40px 120px rgba(0,0,0,.7);
}
```

JS animates `translateY` from `-110%` → `0%`. CSS keeps a `-130%` baseline so even before JS hydrates, the panel is off-screen.

## 12. The reticle (DOM overlay projected onto 3D)

A perfectly-tactical UI element built from 4 corner brackets + a centered crosshair + a side readout - all positioned absolutely inside one host:

```css
#reticle {
  position: fixed; top: 0; left: 0; z-index: 20;
  width: 132px; height: 132px;
  margin: -66px 0 0 -66px;          /* offset by half so transform: translate
                                       in JS places its CENTER at the target */
  pointer-events: none;
  opacity: 0;
  will-change: transform, opacity;
}
.reticle__corner {
  position: absolute;
  width: 20px; height: 20px;
  border: 1.5px solid var(--red);
}
.reticle__corner.tl { top: 0; left: 0;  border-right: none; border-bottom: none; }
.reticle__corner.tr { top: 0; right: 0; border-left: none;  border-bottom: none; }
.reticle__corner.bl { bottom: 0; left: 0;  border-right: none; border-top: none; }
.reticle__corner.br { bottom: 0; right: 0; border-left: none;  border-top: none; }

.reticle__crosshair::before,
.reticle__crosshair::after {
  content: ""; position: absolute; background: var(--red);
}
.reticle__crosshair::before { left: 50%; top: 50%; width: 11px; height: 1px; transform: translate(-50%, -50%); }
.reticle__crosshair::after  { left: 50%; top: 50%; width: 1px; height: 11px; transform: translate(-50%, -50%); }

.reticle__readout {
  position: absolute;
  left: calc(100% + 12px);          /* hanging off the right edge */
  top: 50%;
  transform: translateY(-50%);
  font-family: var(--font-mono);
  font-size: .6rem;
  letter-spacing: .12em;
  color: var(--red);
  white-space: nowrap;
  display: flex; flex-direction: column; gap: 2px;
}
```

Pattern worth stealing: **negative `margin: -66px 0 0 -66px`** so JS can write `transform: translate(x, y)` with raw screen coordinates and the element's CENTER lands at `(x,y)`. No `calc()` in the JS path.

## 13. HUD + progress bar

Bottom-left scene counter:

```css
#hud {
  position: fixed;
  left: var(--gutter); bottom: 24px;
  z-index: 30;
  font-family: var(--font-mono);
  font-size: .68rem;
  letter-spacing: .18em;
  color: var(--dim);
  display: flex; align-items: center; gap: .5em;
  transition: opacity .6s;
}
#hud[data-hidden="true"] { opacity: 0; }
.hud__idx { color: var(--red); }
.hud__label { color: var(--gray); margin-left: .4em; }
@media (max-width: 620px) { #hud { display: none; } }
```

Bottom-edge progress strip - single `transform: scaleX` from JS:

```css
#progress {
  position: fixed; left: 0; right: 0; bottom: 0;
  height: 2px; z-index: 30;
  background: rgba(255,255,255,.04);
}
#progress span {
  display: block;
  height: 100%;
  width: 100%;
  transform: scaleX(0);
  transform-origin: left;
  background: linear-gradient(90deg, var(--red), var(--coral));
  box-shadow: 0 0 12px var(--red);
}
```

The width is always `100%`; only `scaleX` changes. That hits the GPU compositor - no layout, no paint.

## 14. The CSS keyframe ledger

There is literally **one** `@keyframes` in the whole stylesheet:

```css
@keyframes hintPulse {
  0%, 100% { opacity: .25; transform: scaleY(.6); }
  50%      { opacity: 1;   transform: scaleY(1);  }
}
.scroll-hint::after {
  content: "";
  display: block;
  width: 1px; height: 30px;
  margin: 12px auto 0;
  background: linear-gradient(var(--dim), transparent);
  animation: hintPulse 2.4s var(--ease-out) infinite;
}
```

A single 1px-wide div, gradient-faded, scaling on the Y axis to look like a pulsing antenna. The rest of the motion is JS - CSS handles passive ambient stuff that should never stop.

## 15. Reveal initial state (CSS / JS handoff)

The reveal pattern needs CSS to hide things **only when JS is alive**:

```css
/* Add body.js-anim from main.js the moment animation infrastructure is ready.
   Without JS, or under reduced-motion, every [data-r] stays visible. */
body.js-anim [data-r]      { opacity: 0; }
body.js-anim .stat__num    { opacity: 0; }
```

This is the right way to do progressive enhancement: **default state = visible**, JS opts into hiding only when it can also opt into showing. No FOUC, no broken no-JS fallback.

## 16. Declarative data-attribute API

The HTML uses `data-*` as the JS contract; classes are purely visual:

| attribute | read by | purpose |
|---|---|---|
| `data-scene="hero"` | `scroll.js` | maps scroll position to scene index |
| `data-reveal` | `reveals.js` | block whose children intro-tween on enter |
| `data-r` | `reveals.js` | a child item that participates in the cascade |
| `data-split` | `reveals.js` | also split into chars for per-character cascade |
| `data-count="30000"` + `data-prefix`/`data-suffix` | `reveals.js` | count-up tween |
| `data-cycle="A\|B\|C"` + `data-cycle-word` | `cycle.js` | text rotator |
| `data-pilot-open` / `data-pilot-close` | `pilot.js` | drawer triggers |
| `data-hidden="true/false"` | `main.js` | toggle visibility transitions on nav/hud |
| `data-state="locked/tracking"` | `reticle.js` | state of the projected reticle |
| `data-open="true/false"` | `pilot.js` | drawer state |
| `data-success`, `data-progress`, `data-hud="idx"` | various | DOM slots written by JS |
| `data-field="conf"` | `reticle.js` | live-updated readout cells |

Why this is good:
- Markup describes what it IS, not how it animates.
- A find-in-files for `data-reveal` instantly tells you every animated block.
- You can swap classes/CSS freely without breaking JS, and vice versa.

## 17. BEM-ish class naming

Components use `block__element--modifier`:

```
.scene        .scene--hero  .scene--problem  .scene__pin
.block        .block--left  .block--center   .block--right
.btn          .btn--primary .btn--ghost      .btn--block
.kicker       .kicker--red  .kicker__dot
.nav__left    .nav__brand   .nav__mark       .nav__word   .nav__links   .nav__cta
.pilot        .pilot__panel .pilot__backdrop .pilot__close .pilot__title
.reticle__corner .reticle__crosshair .reticle__readout
.stat         .stat__num    .stat__label
.boot__inner  .boot__mark   .boot__word
.hud__idx     .hud__sep     .hud__total      .hud__label
```

Tight, scannable, no utility soup. Each component is independently legible.

## 18. The scene HTML pattern (copy-paste template)

Every scene is the same shape:

```html
<section class="scene scene--problem" data-scene="problem" id="problem">
  <div class="scene__pin">                         <!-- sticky inner -->
    <div class="block block--left" data-reveal>    <!-- reveal target -->
      <p class="kicker kicker--red" data-r>
        <span class="kicker__dot"></span>THE COST TRAP
      </p>

      <h2 class="headline" data-r data-split>      <!-- per-char cascade -->
        The defender loses on cost. Every time.
      </h2>

      <div class="stat-row" data-r>
        <div class="stat">
          <span class="stat__num" data-count="30000" data-suffix=":1">0:1</span>
          <span class="stat__label">cost-per-kill vs. the drone it stops</span>
        </div>
      </div>

      <p class="caption" data-r>$30,000 interceptors chase $500 drones…</p>
    </div>
  </div>
</section>
```

To make a new scene:
1. Add `'newscene'` to the `SCENES` array in `config.js`.
2. Drop another `<section class="scene" data-scene="newscene">` in the right order.
3. Set `.scene--newscene { min-height: ??vh }` based on how long the camera should dwell.
4. Add keyframes in `director.js` `KEYS` array at the right `s` coordinate.

That's it - no router, no component registration, no manifest.

## 19. Responsive strategy

Almost no breakpoints. Everything is `clamp()`-fluid. Real breakpoints only exist for **structural** changes:

```css
@media (max-width: 720px) {
  .block--left, .block--right { align-items: flex-start; text-align: left;
                                max-width: 100%; margin-inline: 0; }
  #scroll::after { display: none; }      /* drop the side dots */
  .nav__links   { display: none; }       /* hamburger-free, just hide */
}
@media (max-width: 620px) {
  .nav__cta { padding: .6em .85em; font-size: .64rem; letter-spacing: .1em; }
  #hud      { display: none; }
}
@media (max-width: 560px) {
  :root { --gutter: 20px; }              /* tighter rhythm */
  .display     { font-size: clamp(2.5rem, 13.5vw, 3.6rem); }
  .display--sm { font-size: clamp(2rem,   9.5vw, 2.7rem); }
  .headline    { font-size: clamp(1.7rem, 8.4vw, 2.5rem); }
}
```

Lesson: with `clamp()` and `min()` doing 90% of the work, breakpoints exist only to *remove or rearrange* elements, never to retype sizes.

## 20. Translating it to a portfolio (minimum recipe)

1. **Layer cake**: a fixed background (canvas, video, SVG, or a static hero image with `position: fixed`), a `#scroll` lane on top at `z-index: 2`, and an atmospheric `#vignette` + `#veil` in between. JS drives the veil's opacity from scroll.
2. **Design tokens**: one `:root` with palette, type, gutter, easing, nav-height. Mirror them in JS if you have JS-driven animation.
3. **Scene sections**: `.scene { } .scene__pin { position: sticky; top: 0; min-height: 100vh; }` with section heights in vh chosen to pace each beat.
4. **Reveal contract**: `[data-reveal] > [data-r]` blocks + `body.js-anim [data-r] { opacity: 0 }`, IntersectionObserver-triggered.
5. **`data-*` attribute API**: never use classes to mean "JS hook", always use `data-*`.
6. **Block backdrop blur**: the masked `.block::before` is the secret weapon. Worth implementing even if you never do 3D - it gives any text legibility over busy backgrounds.
7. **Mono + sans pairing**: one editorial sans, one tracked mono for kickers/labels/buttons. Instant editorial-tactical feel.
8. **Three text-shadows + one rgba color**: legibility over anything.
9. **`data-hidden` / `data-open` / `data-state`** patterns toggled in JS, styled in CSS. Beats class lists every time.

Files most worth lifting verbatim:
- The whole `:root` token block.
- `.block::before` with the masked backdrop blur.
- `.scene__pin` sticky pattern.
- `.kicker` / `.kicker__dot` system.
- `.btn` + `.btn--primary` + glow hover.
- `.field` underline-only input style.
- `#progress`, `#hud`, `#nav` data-attribute-driven visibility.
