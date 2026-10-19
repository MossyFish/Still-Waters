const IMG_W = 240, IMG_H = 340;

const FISH_DEFS = {
  1: { bodyLen: 226, anchors: [{x:104,y:65},{x:116,y:60},{x:118,y:61},{x:128,y:60},{x:144,y:63}] },
  2: { bodyLen: 203, anchors: [{x:96,y:69},{x:108,y:68},{x:115,y:63},{x:120,y:64},{x:139,y:63}] },
  3: { bodyLen: 197, anchors: [{x:102,y:70},{x:110,y:66},{x:118,y:66},{x:127,y:67},{x:138,y:66}] },
  4: { bodyLen: 156, anchors: [{x:100,y:82},{x:108,y:82},{x:116,y:82},{x:120,y:81},{x:128,y:85}] },
  5: { bodyLen: 83,  anchors: [{x:108,y:107},{x:112,y:106},{x:112,y:105},{x:114,y:105},{x:116,y:106}] },
  6: { bodyLen: 74,  anchors: [{x:109,y:112},{x:112,y:110},{x:112,y:110},{x:112,y:111},{x:115,y:111}] },
};

const SHADOW_DEFS = {
  1: { anchors: [{x:86,y:79},{x:112,y:65},{x:123,y:56},{x:128,y:59},{x:156,y:59}] },
  2: { anchors: [{x:82,y:68},{x:112,y:64},{x:115,y:64},{x:140,y:60},{x:134,y:68}] },
  3: { anchors: [{x:90,y:70},{x:93,y:72},{x:116,y:78},{x:112,y:63},{x:138,y:65}] },
  4: { anchors: [{x:88,y:97},{x:102,y:100},{x:112,y:102},{x:126,y:88},{x:136,y:91}] },
  5: { anchors: [{x:98,y:133},{x:110,y:136},{x:113,y:134},{x:115,y:126},{x:117,y:128}] },
};

const TIER_FISH_TYPES = { large: [1,2], medium: [3,4], baby: [5,6] };
const SHADOW_FOR_FISH  = { 1:1, 2:2, 3:3, 4:4, 5:5, 6:5 };

// I screwed up the coloring because I thought it would just be a base layer
// but fixing it in code because there's 0 shot I'm spending more time coloring fish
const KOI_PALETTE = [
  { hue: 0, sat: 110 },
  { hue: 0, sat: 150 },
  { hue: 150, sat: 260 },
  { hue: 150, sat: 190 },
  { hue: 165, sat: 240 },
  { hue: 165, sat: 180 },
  { hue: 185, sat: 200 },
  { hue: 185, sat: 150 },
  { hue: 140, sat: 200 },
  { hue: 140, sat: 150 },
  { hue: 10, sat: 130 },
  { hue: 20, sat: 170 },
];
// the third frame of every fish is the straight pose; it gets bent in code instead of
// swapping between hand-drawn frames, which is what made the old swim look choppy
const STRAIGHT_FRAME = 2;

// fish behaviour
const PANIC_SECONDS = 1.0;
const KOI_TIERS = [
  { name:'large', weight: 0.45, lenRange:[95,135] },
  { name:'medium', weight: 0.40, lenRange:[58,80] },
  { name:'baby', weight: 0.15, lenRange:[32,46] },
];

function randRange(min, max) { return min + Math.random()*(max-min); }

function pickTier() {
  let r = Math.random(), acc = 0;
  for (const tier of KOI_TIERS) {
    acc += tier.weight;
    if (r < acc) return tier;
  }
  return KOI_TIERS.at(-1);
}

// The swim is the same one as the Submerge KDE wallpaper: one straight sprite per fish, bent on
// the GPU by a travelling wave down the body, a soft C-shaped arc when it turns, and fins that
// sweep back, spread and flutter. Canvas 2D can only do the wave and the arc, so it's the fallback.
const FISH_VERT = `#version 300 es
in vec2 uv;
out vec2 vUv;
uniform vec2 screen;    // canvas size, px
uniform vec2 pos;       // where the head (anchor) sits on screen
uniform float rot;      // heading + yaw, radians
uniform vec2 itemSize;  // whole sprite on screen, px
uniform vec2 anchor;    // head inside the sprite, px (x is the body centreline)
uniform float phase;    // swim cycle, radians
uniform float amp;      // tail swing, px
uniform float bend;     // how far the body curves when turning, radians
uniform float headV;    // texture v of the head
uniform float tailV;    // texture v of the tail tip
uniform float bodyHalf; // half the body's width, px; anything wider is fin
uniform float flow;     // 0 = neat, 1 = tail and fins streaming out and rippling
uniform float fold;     // fins swept back (+) while driving, spread forward (-) while gliding
uniform float finTurn;  // turning: one pectoral fin spreads to brake while the other tucks in
void main() {
    vUv = uv;
    float itemH = itemSize.y, pivotX = anchor.x;
    vec2 p = uv * itemSize;
    float w = clamp((uv.y - headV) / (tailV - headV), 0.0, 1.0);
    // about one S along the body: the head barely recoils, the middle sways a little, the tail most
    float waveK = 5.2 + flow * 0.9;
    float env = 0.1 + 0.9 * pow(w, 1.6);
    float swing = sin(phase - w * waveK) * env - sin(phase) * 0.1;
    // the tail fin lags behind the body and keeps whipping after each stroke
    float tailFin = smoothstep(0.78, 1.0, w);
    swing += tailFin * (0.2 + 0.4 * flow) * sin(phase - w * waveK - 1.2);
    swing += tailFin * flow * 0.12 * sin(phase * 2.0 - w * 12.0);
    float x0 = p.x;
    p.x += amp * swing;
    // whatever sticks out past the body sweeps back or spreads out, each side a little out of step
    float dx = x0 - pivotX;
    float side = dx < 0.0 ? -1.0 : 1.0;
    float reach = max(abs(dx) - bodyHalf, 0.0);
    float flutter = (0.08 + 0.22 * flow) * sin(phase * 0.5 - w * 3.0 + side * 1.3);
    float sweep = (fold * 0.6 + side * finTurn * 0.35) * (1.0 - 0.5 * tailFin) + flutter;
    p.y += reach * sweep;
    p.x -= side * reach * abs(sweep) * 0.25;
    // turning: every point rides a constant-curvature arc that starts just behind the head
    float startV = headV + (tailV - headV) * 0.08;
    float sigma = p.y - startV * itemH;
    if (sigma > 0.0) {
        float k = bend / ((tailV - startV) * itemH);
        float th = k * sigma;
        float ox = p.x - pivotX;
        vec2 c = abs(k) > 1e-5 ? vec2(cos(th) - 1.0, sin(th)) / k : vec2(0.0, sigma);
        p = vec2(pivotX, startV * itemH) + c + ox * vec2(cos(th), sin(th));
    }
    vec2 q = p - anchor;
    float cr = cos(rot), sr = sin(rot);
    vec2 world = pos + vec2(cr * q.x - sr * q.y, sr * q.x + cr * q.y);
    gl_Position = vec4(world.x / screen.x * 2.0 - 1.0, 1.0 - world.y / screen.y * 2.0, 0.0, 1.0);
}`;

const FISH_FRAG = `#version 300 es
precision mediump float;
in vec2 vUv;
out vec4 color;
uniform sampler2D tex;
uniform float alpha;
void main() { color = texture(tex, vUv) * alpha; }`;

const koiGL = (() => {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2', { premultipliedAlpha: true, antialias: true });
  if (!gl) return null;

  function compile(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) console.warn(gl.getShaderInfoLog(sh));
    return sh;
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, FISH_VERT));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FISH_FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.warn(gl.getProgramInfoLog(prog)); return null; }
  gl.useProgram(prog);
  const u = {};
  for (const name of ['screen','pos','rot','itemSize','anchor','phase','amp','bend','headV','tailV',
                      'bodyHalf','flow','fold','finTurn','alpha']) {
    u[name] = gl.getUniformLocation(prog, name);
  }

  // same mesh density as the wallpaper: 12 x 32 cells
  const GX = 12, GY = 32;
  const verts = [], idx = [];
  for (let j = 0; j <= GY; j++) for (let i = 0; i <= GX; i++) verts.push(i / GX, j / GY);
  for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) {
    const a = j * (GX + 1) + i, b = a + 1, c = a + GX + 1, d = c + 1;
    idx.push(a, b, c, b, d, c);
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'uv');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);

  const textures = new WeakMap();
  function texture(img) {
    let t = textures.get(img);
    if (t) return t;
    t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    textures.set(img, t);
    return t;
  }

  function begin(w, h) {
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(u.screen, w, h);
  }

  function draw(img, anchor, fish, x, y, phase, alpha) {
    const s = fish.spriteScale, m = fish.motion;
    gl.bindTexture(gl.TEXTURE_2D, texture(img));
    gl.uniform2f(u.pos, x, y);
    gl.uniform1f(u.rot, fish.angle + Math.PI / 2 + m.yaw);
    gl.uniform2f(u.itemSize, fish.drawW, fish.drawH);
    gl.uniform2f(u.anchor, anchor.x * s, anchor.y * s);
    gl.uniform1f(u.phase, phase);
    gl.uniform1f(u.amp, m.amp);
    gl.uniform1f(u.bend, m.bend);
    gl.uniform1f(u.headV, anchor.y / IMG_H);
    gl.uniform1f(u.tailV, Math.min(1, (anchor.y + fish.def.bodyLen) / IMG_H));
    gl.uniform1f(u.bodyHalf, fish.len * 0.1);
    gl.uniform1f(u.flow, m.flow);
    gl.uniform1f(u.fold, m.fold);
    gl.uniform1f(u.finTurn, m.finTurn);
    gl.uniform1f(u.alpha, alpha);
    gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
  }

  return { canvas, begin, draw };
})();

// fallback for browsers without WebGL2: the same wave and arc, drawn as thin rows of the sprite
const fishScratch = document.createElement('canvas');
const fishScratchCtx = fishScratch.getContext('2d');

let maxDrawDim = 0;
for (const tier of KOI_TIERS) {
  for (const type of TIER_FISH_TYPES[tier.name]) {
    const scale = tier.lenRange[1] / FISH_DEFS[type].bodyLen;
    maxDrawDim = Math.max(maxDrawDim, IMG_W*scale, IMG_H*scale);
  }
}
const SCRATCH_MAX = Math.ceil(maxDrawDim * 2.2) + 8;
fishScratch.width = fishScratch.height = SCRATCH_MAX;

function drawBent2D(ctx, img, anchor, fish, x, y, phase, alpha) {
  const s = fish.spriteScale, m = fish.motion;
  const size = SCRATCH_MAX, c0 = size / 2;
  const sctx = fishScratchCtx;
  sctx.clearRect(0, 0, size, size);
  const itemH = fish.drawH, pivotX = anchor.x * s, headY = anchor.y * s;
  const headV = anchor.y / IMG_H;
  const tailV = Math.min(1, (anchor.y + fish.def.bodyLen) / IMG_H);
  const startV = headV + (tailV - headV) * 0.08;
  const k = m.bend / ((tailV - startV) * itemH);
  const rows = Math.min(60, Math.max(16, Math.ceil(itemH / 4)));
  const rowH = IMG_H / rows;
  for (let i = 0; i < rows; i++) {
    const v = (i + 0.5) / rows;
    const w = Math.max(0, Math.min(1, (v - headV) / (tailV - headV)));
    const waveK = 5.2 + m.flow * 0.9;
    const env = 0.1 + 0.9 * Math.pow(w, 1.6);
    const tf = Math.max(0, Math.min(1, (w - 0.78) / 0.22)), tailFin = tf * tf * (3 - 2 * tf);
    const swing = Math.sin(phase - w * waveK) * env - Math.sin(phase) * 0.1
                + tailFin * (0.2 + 0.4 * m.flow) * Math.sin(phase - w * waveK - 1.2)
                + tailFin * m.flow * 0.12 * Math.sin(phase * 2 - w * 12);
    const sigma = (v - startV) * itemH;
    let ox = pivotX, oy = v * itemH, th = 0;
    if (sigma > 0 && Math.abs(k) > 1e-5) {
      th = k * sigma;
      ox = pivotX + (Math.cos(th) - 1) / k;
      oy = startV * itemH + Math.sin(th) / k;
    }
    sctx.save();
    sctx.translate(c0 + ox - pivotX, c0 + oy - headY);
    sctx.rotate(th);
    sctx.drawImage(img, 0, i * rowH, IMG_W, rowH + 0.6,
                   -pivotX + m.amp * swing, -rowH * s / 2, fish.drawW, (rowH + 0.6) * s);
    sctx.restore();
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(fish.angle + Math.PI / 2 + m.yaw);
  ctx.globalAlpha = alpha;
  ctx.drawImage(fishScratch, -c0, -c0);
  ctx.restore();
}

// tinted copies are shared between fish of the same type and colour
const tintCache = new Map();

class Fish {
  constructor(isCursorFish = false) {
    this.isCursorFish = isCursorFish;
    this.x = Math.random() * W;
    this.y = Math.random() * H;
    this.angle = Math.random() * Math.PI * 2;
    this.baseAngle = this.angle;
    this.swimPhase = Math.random() * Math.PI * 2;
    this.wanderT = Math.random() * 1000;
    this.seedA = Math.random() * 100;
    this.seedB = Math.random() * 100;
    this.flowSeed = Math.random() * 100;
    this.turn = 0;          // smoothed turning speed, rad/s
    // koi swim in bursts: a few strong tail beats, then a glide with the tail almost still
    this.beat = 0.5;
    this.beatTarget = 0.8;
    this.beatTimer = Math.random() * 2;
    this.fleeing = 0;
    this.fleeAngle = this.angle;
    this.motion = { amp: 0, bend: 0, yaw: 0, flow: 0, fold: 0, finTurn: 0 };

    this.offscreenTime = 0;
    this.returnThreshold = 2 + Math.random();

    if (isCursorFish) {
      this.speed = 0;
      this.cruiseSpeed = 0;
      // a tiny version of the pond's own baby koi, so it matches the painted fish
      this.fishType = 6;
      this.def = FISH_DEFS[6];
      this.len = 40;
      this.spriteScale = this.len / this.def.bodyLen;
      this.drawW = IMG_W * this.spriteScale;
      this.drawH = IMG_H * this.spriteScale;
      this.bubbles = [];
      this.bubbleTimer = 0;
    }

    else {
      const tier = pickTier();
      this.tier = tier.name;
      this.len = randRange(...tier.lenRange);
      this.cruiseSpeed = randRange(0.5, 1.4);
      this.speed = this.cruiseSpeed;
      this.panicSpeed = 3.2;

      const types = TIER_FISH_TYPES[this.tier];
      this.fishType = types[Math.floor(Math.random() * types.length)];
      this.shadowType = SHADOW_FOR_FISH[this.fishType];
      this.def = FISH_DEFS[this.fishType];
      this.shadowDef = SHADOW_DEFS[this.shadowType];
      this.spriteScale = this.len / this.def.bodyLen;
      this.drawW = IMG_W * this.spriteScale;
      this.drawH = IMG_H * this.spriteScale;

      const pick = KOI_PALETTE[Math.floor(Math.random() * KOI_PALETTE.length)];
      this.colorFilter = `saturate(${pick.sat}%) hue-rotate(${pick.hue}deg)`;
      this.tinted = null;
    }
  }

  ensureTinted() {
    if (this.tinted) return;
    const key = this.fishType + '|' + this.colorFilter;
    if (tintCache.has(key)) { this.tinted = tintCache.get(key); return; }
    const img = assets.fish[this.fishType]?.[STRAIGHT_FRAME];
    if (!img) return;
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const cctx = c.getContext('2d');
    cctx.filter = this.colorFilter;
    cctx.drawImage(img, 0, 0);
    tintCache.set(key, c);
    this.tinted = c;
  }

  update() {
    const step = dt * 60;
    const now = performance.now() / 1000;
    this.wanderT += 0.012 * step;

    if (this.isCursorFish) {
      const angleBefore = this.angle;
      const dx = mouse.x - this.x, dy = mouse.y - this.y;
      const dist = Math.hypot(dx, dy);
      const ease = 1 - Math.pow(1-0.32, step);
      this.x += dx * ease;
      this.y += dy * ease;

      if (dist > 1) {
        const diff = Math.atan2(Math.sin(Math.atan2(dy,dx)-this.angle), Math.cos(Math.atan2(dy,dx)-this.angle));
        this.angle += diff * (1 - Math.pow(1-0.9, step));
      }

      this.speed = Math.min(dist*ease, 20);
      this.x = Math.max(20, Math.min(W-20, this.x));
      this.y = Math.max(20, Math.min(H-20, this.y));

      // it turns as fast as the cursor does, so the curve comes from the measured turn rate
      const dA = Math.atan2(Math.sin(this.angle-angleBefore), Math.cos(this.angle-angleBefore)) / Math.max(dt, 0.001);
      this.turn += (Math.max(-3, Math.min(3, dA)) - this.turn) * (1 - Math.exp(-dt / 0.15));
      const drive = Math.max(0.25, Math.min(1, this.speed / 4));
      this.swimPhase += dt * (1.4 + 4.6 * drive);
      this.setMotion(drive, now, 0.35);
      this.updateBubbles();
      return;
    }

    // where it wants to head drifts smoothly (no per-frame randomness), and the turning speed
    // eases toward what's needed, so turns build up and settle like a real fish
    let target, maxTurn, settle;
    if (this.fleeing > 0) {
      this.fleeing -= dt;
      target = this.fleeAngle + Math.sin(this.wanderT*4) * 0.25;
      maxTurn = 4.5; settle = 0.12;
      if (this.fleeing <= 0) { this.fleeing = 0; this.baseAngle = this.angle; }
    } else {
      this.baseAngle += (0.16 * Math.sin(now * 0.07 + this.seedA) + 0.09 * Math.sin(now * 0.19 + this.seedB)) * dt;
      target = this.baseAngle + Math.sin(this.wanderT) * 0.8;
      maxTurn = 1.1; settle = 0.55;
    }
    const diff = Math.atan2(Math.sin(target - this.angle), Math.cos(target - this.angle));
    const want = Math.max(-maxTurn, Math.min(maxTurn, diff * (this.fleeing > 0 ? 6 : 1.1)));
    this.turn += (want - this.turn) * (1 - Math.exp(-dt / settle));
    this.angle += this.turn * dt;

    // burst and glide; a scared fish just beats as hard as it can
    this.beatTimer -= dt;
    if (this.beatTimer <= 0) {
      const gliding = this.beatTarget > 0.5;
      this.beatTarget = gliding ? 0.08 + Math.random() * 0.1 : 0.65 + Math.random() * 0.35;
      this.beatTimer = gliding ? 1.2 + Math.random() * 2.2 : 1.4 + Math.random() * 2.4;
    }
    const beatGoal = this.fleeing > 0 ? 1 : this.beatTarget;
    this.beat += (beatGoal - this.beat) * (1 - Math.exp(-dt / (this.fleeing > 0 ? 0.12 : 0.6)));
    const drive = Math.max(this.beat, Math.min(1, Math.abs(this.turn) * 0.8));

    const targetSpeed = this.fleeing > 0 ? this.panicSpeed : this.cruiseSpeed * (0.4 + 0.9 * drive);
    const tau = this.fleeing > 0 ? 0.1 : targetSpeed > this.speed ? 0.8 : 1.6;
    this.speed += (targetSpeed - this.speed) * (1 - Math.exp(-dt / tau));

    // the tail beats while driving and almost stops while gliding; these fish cover more body
    // lengths a second than the wallpaper's, so the beat speeds up with that too
    const pace = Math.sqrt(Math.max(1, this.speed * 60 / this.len / 0.45));
    this.swimPhase += dt * (1.4 + 4.6 * drive) * pace;
    this.setMotion(drive, now, 1.5);

    // each stroke of the tail gives a little surge forward
    const surge = 1 + 0.15 * drive * Math.sin(2 * this.swimPhase);
    this.x += Math.cos(this.angle) * this.speed * surge * step;
    this.y += Math.sin(this.angle) * this.speed * surge * step;

    if (this.x < -120) this.x = W + 120; if (this.x > W + 120) this.x = -120;
    if (this.y < -120) this.y = H + 120; if (this.y > H + 120) this.y = -120;
  }

  setMotion(drive, now, bendGain) {
    const m = this.motion;
    m.amp = this.len * (0.02 + 0.07 * drive);
    // negative so the tail trails to the outside of the turn
    m.bend = -Math.max(-1.3, Math.min(1.3, this.turn * bendGain));
    m.yaw = Math.sin(this.swimPhase + 0.6) * 2.0 * drive * Math.PI / 180;
    // the tail and fins drift between neat and streaming, and trail out more while gliding
    m.flow = Math.max(0, Math.min(1, 0.45 + 0.45 * Math.sin(now * 0.045 + this.flowSeed)
                                       + 0.25 * Math.sin(now * 0.11 + this.flowSeed * 2.3)
                                       + 0.25 * (1 - drive)));
    // fins tuck back during a burst and spread out while gliding
    m.fold = Math.max(-0.35, Math.min(0.5, drive * 0.8 - 0.3));
    // the fin on the inside of a turn spreads to brake, the outer one tucks in
    m.finTurn = -Math.max(-1, Math.min(1, this.turn * 1.2));
  }

  drawShadow(draw) {
    const shadow = assets.shadows[this.shadowType]?.[STRAIGHT_FRAME];
    if (!shadow) return;
    const { ux, uy, t } = lightShadowParams(this.x, this.y);
    const off = this.len * (0.14 + t*0.5);
    draw(shadow, this.shadowDef.anchors[STRAIGHT_FRAME], this, this.x + ux*off, this.y + uy*off,
         this.swimPhase - 0.3, Math.max(0, 0.3 - t*0.12));
  }

  drawBody(draw) {
    this.ensureTinted();
    if (!this.tinted) return;
    draw(this.tinted, this.def.anchors[STRAIGHT_FRAME], this, this.x, this.y, this.swimPhase, 1);
  }

    // a little trail of bubbles that drift off the tail while the cursor fish is moving
    updateBubbles() {
      this.bubbleTimer -= dt;
      if (this.speed > 1.5 && this.bubbleTimer <= 0) {
        const back = this.len * 0.55;
        this.bubbles.push({
          x: this.x - Math.cos(this.angle) * back + (Math.random() - 0.5) * 4,
          y: this.y - Math.sin(this.angle) * back + (Math.random() - 0.5) * 4,
          r: 1 + Math.random() * 1.8, age: 0, life: 0.7 + Math.random() * 0.5
        });
        this.bubbleTimer = 0.07;
      }
      for (const b of this.bubbles) { b.age += dt; b.y -= dt * 9; }
      this.bubbles = this.bubbles.filter(b => b.age < b.life);
    }

    drawCursorFish(ctx) {
      for (const b of this.bubbles) {
        const k = 1 - b.age / b.life;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r * (0.6 + 0.4 * k), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,255,255,${(0.7 * k).toFixed(3)})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      const img = assets.fish[this.fishType]?.[STRAIGHT_FRAME];
      if (!img) return;
      const anchor = this.def.anchors[STRAIGHT_FRAME];
      // soft light around it so it reads as the one you're steering
      ctx.save();
      ctx.shadowColor = 'rgba(255,255,255,0.75)';
      ctx.shadowBlur = 6;
      if (useGL) {
        koiGL.begin(W, H);
        koiGL.draw(img, anchor, this, this.x, this.y, this.swimPhase, 1);
        const r = Math.ceil(this.len * 1.5);
        const sx = Math.max(0, Math.floor(this.x - r)), sy = Math.max(0, Math.floor(this.y - r));
        const sw = Math.min(W, sx + 2*r) - sx, sh = Math.min(H, sy + 2*r) - sy;
        if (sw > 0 && sh > 0) ctx.drawImage(koiGL.canvas, sx, sy, sw, sh, sx, sy, sw, sh);
      } else {
        drawBent2D(ctx, img, anchor, this, this.x, this.y, this.swimPhase, 1);
      }
      ctx.restore();
    }
}

// if the GPU path ever fails (say a sprite it isn't allowed to read), drop to canvas 2D for good
let useGL = !!koiGL;

// all the shadows go down first, then every fish on top of them
function drawKoi(ctx, fishes) {
  if (useGL) {
    try {
      koiGL.begin(W, H);
      for (const f of fishes) f.drawShadow(koiGL.draw);
      for (const f of fishes) f.drawBody(koiGL.draw);
      ctx.drawImage(koiGL.canvas, 0, 0);
      return;
    } catch (e) {
      console.warn('fish fell back to canvas 2D:', e);
      useGL = false;
    }
  }
  const draw = (...args) => drawBent2D(ctx, ...args);
  for (const f of fishes) f.drawShadow(draw);
  for (const f of fishes) f.drawBody(draw);
}

function fishPop() {
  const target = Math.max(4, Math.round(W * H * 16 / (1920 * 1080)));
  while (fishArr.length < target) fishArr.push(new Fish());
  while (fishArr.length > target) fishArr.pop(); 
}

const fishArr = [];
fishPop();
window.addEventListener('resize', fishPop);
const cursorFish = new Fish(true);

function fleeFrom(x, y, radius) {
  let fled = false;
  for (const f of fishArr) {
    if (Math.hypot(f.x-x, f.y-y) < radius) {
      f.fleeAngle  = Math.atan2(f.y-y, f.x-x);
      f.fleeing    = PANIC_SECONDS;
      f.panicSpeed = 4.5 + Math.random()*1.3;
      fled = true;
    }
  }
  return fled;
}

function lightShadowParams(x, y) {
  const lx = W*0.32, ly = H*0.22;
  const dx = x-lx, dy = y-ly;
  const dist = Math.hypot(dx, dy);
  const t = Math.min(1, dist / (Math.hypot(W,H)*0.6));
  return { ux: dist>0.001 ? dx/dist : 0, uy: dist>0.001 ? dy/dist : 1, t };
}

function minFish() {
  for (const f of fishArr) {
    const onscreen = f.x >= 0 && f.x <= W && f.y >= 0 && f.y <= H;
    f.offscreenTime = onscreen ? 0 : f.offscreenTime + dt;
  }

  const onscreen = f => (f.tier === 'large' || f.tier === 'medium') && f.x >= 0 && f.x <= W && f.y >= 0 && f.y <= H;
  const visible = fishArr.filter(onscreen).length;
  if (visible >= 10) return;

  const candidate = fishArr.find(f =>
    (f.tier === 'large' || f.tier === 'medium') &&
    f.offscreenTime >= f.returnThreshold &&
    !onscreen(f)
  );
  if (candidate) {
    const targetAngle = Math.atan2(H/2 - candidate.y, W/2 - candidate.x);
    candidate.baseAngle = targetAngle;
  }
}