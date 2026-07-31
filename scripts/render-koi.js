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

// fish behaviour
const PANIC_SECONDS = 1.0;
const CALM_SECONDS  = 2.0;
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

const fishScratch = document.createElement('canvas');
const fishScratchCtx = fishScratch.getContext('2d');
const shadowScratch = document.createElement('canvas');
const shadowScratchCtx = shadowScratch.getContext('2d');

let maxDrawDim = 0;
for (const tier of KOI_TIERS) {
  for (const type of TIER_FISH_TYPES[tier.name]) {
    const scale = tier.lenRange[1] / FISH_DEFS[type].bodyLen;
    maxDrawDim = Math.max(maxDrawDim, IMG_W*scale, IMG_H*scale);
  }
}
const SCRATCH_MAX = Math.ceil(maxDrawDim * 1.6) + 8;
fishScratch.width = fishScratch.height = SCRATCH_MAX;
shadowScratch.width = shadowScratch.height = SCRATCH_MAX;

class Fish {
  constructor(isCursorFish = false) {
    this.isCursorFish = isCursorFish;
    this.x = Math.random() * W;
    this.y = Math.random() * H;
    this.angle = Math.random() * Math.PI * 2;
    this.baseAngle = this.angle;
    this.swimPhase = Math.random() * Math.PI * 2;
    this.wanderT = Math.random() * 1000;
    this.fleeing = 0;
    this.calming = 0;
    this.fleeAngle = this.angle;
    
    this.offscreenTime = 0;
    this.returnThreshold = 2 + Math.random(); 

    if (isCursorFish) {
      this.speed = 0;
      this.cruiseSpeed = 0;
      this.len = 22;
    } 
    
    else {
      const tier = pickTier();
      this.tier = tier.name;
      this.len = randRange(...tier.lenRange);
      this.cruiseSpeed = randRange(0.5, 1.4);
      this.speed = this.cruiseSpeed;
      this.turnRate = randRange(0.035, 0.075);
      this.panicSpeed = 3.2;
      this.calmFromSpeed = this.cruiseSpeed;

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
      this.tintedFrames = null;
    }
  }

  getFramePos() {
    const t = (1 - Math.cos(this.swimPhase)) / 2;
    const pos = t * 4;
    const i0 = Math.min(4, Math.floor(pos));
    const i1 = Math.min(4, i0 + 1);
    const raw = pos - i0;

    const WINDOW = 0.18;
    let blend;
    if (raw < 0.5 - WINDOW) blend = 0;
    else if (raw > 0.5 + WINDOW) blend = 1;
    else {
      const local = (raw - (0.5 - WINDOW)) / (WINDOW * 2);
      blend = local*local*(3-2*local);
    }
    return { i0, i1, blend };
  }

  ensureTintedFrames() {
    if (this.tintedFrames) return;
    const frames = assets.fish[this.fishType];
    if (!frames || frames.some(f => !f)) return;
    this.tintedFrames = frames.map(img => {
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const cctx = c.getContext('2d');
      cctx.filter = this.colorFilter;
      cctx.drawImage(img, 0, 0);
      return c;
    });
  }

  steerWander(step) {
    this.baseAngle += (Math.random()-0.5) * 0.05 * step;
    const target = this.baseAngle + Math.sin(this.wanderT) * 0.9;
    const diff   = Math.atan2(Math.sin(target-this.angle), Math.cos(target-this.angle));
    this.angle  += diff * Math.min(1, this.turnRate*3*step);
  }

  update() {
    const step = dt * 60;
    this.wanderT += 0.012 * step;

    if (this.isCursorFish) {
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

    } 
    else if (this.fleeing > 0) {
      this.fleeing -= dt;
      this.angle   = this.fleeAngle + Math.sin(this.wanderT*6) * 0.3;
      this.speed  += (this.panicSpeed - this.speed) * (1 - Math.pow(1-0.35, step));
      
      if (this.fleeing <= 0) {
        this.fleeing = 0; this.calming = CALM_SECONDS;
        this.speed = this.cruiseSpeed + (this.speed-this.cruiseSpeed) * 0.5;
        this.calmFromSpeed = this.speed;
        this.baseAngle = this.angle;
      }
    } 
    else if (this.calming > 0) {
      this.calming -= dt;
      this.steerWander(step);
      const t = Math.min(1, 1 - Math.max(0, this.calming) / CALM_SECONDS);
      this.speed = this.calmFromSpeed + (this.cruiseSpeed-this.calmFromSpeed) * t*t*(3-2*t);
    } 
    else {
      this.steerWander(step);
      this.speed += (this.cruiseSpeed-this.speed) * (1 - Math.pow(1-0.02, step));
    }

    if (this.isCursorFish) {
      this.swimPhase += 0.12 * step;
    } else {
      const speedFactor = Math.min(1.2, this.speed/2.2);
      this.swimPhase += 0.09 * (0.30 + speedFactor*1.6) * step;
    }

    if (!this.isCursorFish) {
      this.x += Math.cos(this.angle) * this.speed * step;
      this.y += Math.sin(this.angle) * this.speed * step;
      
      if (this.x < -120) this.x = W + 120; if (this.x > W + 120) this.x = -120;
      if (this.y < -120) this.y = H + 120; if (this.y > H + 120) this.y = -120;
    }
  }

  draw(ctx) {
    if (this.isCursorFish) { this.drawCursorFish(ctx); return; }
    this.ensureTintedFrames();

    const { i0, i1, blend } = this.getFramePos();
    const { ux, uy, t } = lightShadowParams(this.x, this.y);
    const shadowOff = this.len * (0.14 + t*0.5);

    this.drawShadow(ctx, i0, i1, blend, ux, uy, t, shadowOff);
    this.drawBody(ctx, i0, i1, blend);
  }

    drawShadow(ctx, i0, i1, blend, ux, uy, t, shadowOff) {
      const shadow0 = assets.shadows[this.shadowType]?.[i0];
      if (!shadow0) return;
      const shadow1 = assets.shadows[this.shadowType]?.[i1];
      const sa0 = this.shadowDef.anchors[i0];
      const sa1 = this.shadowDef.anchors[i1];

      const sw = SCRATCH_MAX;
      const sh = SCRATCH_MAX;
      const cx = sw / 2, cy = sh / 2;

      if (shadowScratch.width !== sw || shadowScratch.height !== sh) {
        shadowScratch.width = sw;
        shadowScratch.height = sh;
      }
      shadowScratchCtx.clearRect(0, 0, sw, sh);
      shadowScratchCtx.globalAlpha = 1 - blend
      shadowScratchCtx.drawImage(shadow0, cx - sa0.x*this.spriteScale, cy - sa0.y*this.spriteScale, this.drawW, this.drawH);

      if (blend > 0.02 && shadow1) {
        shadowScratchCtx.globalAlpha = blend;
        shadowScratchCtx.drawImage(shadow1, cx - sa1.x*this.spriteScale, cy - sa1.y*this.spriteScale, this.drawW, this.drawH);
        shadowScratchCtx.globalAlpha = 1;
      }

      ctx.save();
      ctx.translate(this.x + ux*shadowOff, this.y + uy*shadowOff);
      ctx.rotate(this.angle + Math.PI/2);
      ctx.globalAlpha = Math.max(0, 0.3 - t*0.12);
      ctx.drawImage(shadowScratch, -cx, -cy, sw, sh);
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    drawBody(ctx, i0, i1, blend) {
      const body0 = this.tintedFrames ? this.tintedFrames[i0] : assets.fish[this.fishType]?.[i0];
      if (!body0) return;
      const body1 = this.tintedFrames ? this.tintedFrames[i1] : assets.fish[this.fishType]?.[i1];
  
      const fa0 = this.def.anchors[i0];
      const fa1 = this.def.anchors[i1];
  
      const sw = SCRATCH_MAX;
      const sh = SCRATCH_MAX;
      const cx = sw / 2, cy = sh / 2;
  
      if (fishScratch.width !== sw || fishScratch.height !== sh) {
        fishScratch.width = sw;
        fishScratch.height = sh;
      }
      fishScratchCtx.clearRect(0, 0, sw, sh);
  
      fishScratchCtx.globalAlpha = 1 - blend;
      fishScratchCtx.drawImage(body0, cx - fa0.x*this.spriteScale, cy - fa0.y*this.spriteScale, this.drawW, this.drawH);
      
      if (blend > 0.02 && body1) {
        fishScratchCtx.globalAlpha = blend;
        fishScratchCtx.drawImage(body1, cx - fa1.x*this.spriteScale, cy - fa1.y*this.spriteScale, this.drawW, this.drawH);
        fishScratchCtx.globalAlpha = 1;
      }
      
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle + Math.PI/2);
      ctx.drawImage(fishScratch, -cx, -cy, sw, sh);
      ctx.restore();
    }
    

    drawCursorFish(ctx) {
    const L = this.len;
    const wag = Math.sin(this.swimPhase) * 0.55;
 
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.shadowColor = 'rgba(255,255,255,0.9)';
    ctx.shadowBlur  = 14;
    ctx.fillStyle   = 'rgba(255,255,255,0.9)';
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth   = 1.2;
 
    // tail
    const tx = -L*0.42;
    const wagY = wag*L*0.45;
    ctx.beginPath();
    ctx.moveTo(tx, 0);
    ctx.quadraticCurveTo(-L*0.62, L*0.24 + wagY*0.5, -L*0.78, L*0.5 + wagY);
    ctx.quadraticCurveTo(-L*0.6, L*0.08 + wagY*0.3, -L*0.68, -L*0.02 + wagY*0.5);
    ctx.quadraticCurveTo(-L*0.6, -L*0.08 + wagY*0.3, -L*0.78, -L*0.5 + wagY);
    ctx.quadraticCurveTo(-L*0.62, -L*0.24 + wagY*0.5, tx, 0);
    ctx.fill();
 
    // fins
    for (const side of [1, -1]) {
      ctx.beginPath();
      ctx.moveTo(L * 0.08, side * L * 0.14);
      ctx.quadraticCurveTo(-L * 0.1, side * L * 0.4, -L * 0.3, side * L * 0.28);
      ctx.quadraticCurveTo(-L * 0.12, side * L * 0.18, L * 0.08, side * L * 0.14);
      ctx.fill();
    }
 
    // body
    ctx.beginPath();
    ctx.moveTo(L * 0.5, 0);
    ctx.quadraticCurveTo(L * 0.35, L * 0.24, 0, L * 0.22);
    ctx.quadraticCurveTo(-L * 0.3, L * 0.19, tx, 0);
    ctx.quadraticCurveTo(-L * 0.3, -L * 0.19, 0, -L * 0.22);
    ctx.quadraticCurveTo(L * 0.35, -L * 0.24, L * 0.5, 0);
    ctx.fill();
    ctx.stroke();
 
    // eye
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(30,30,30,0.9)';
    ctx.beginPath();
    ctx.arc(L * 0.33, 0, L * 0.05, 0, Math.PI * 2);
    ctx.fill();
 
    ctx.restore();
  }
}

function fishPop() {
  const target = Math.max(4, Math.round(W * H * 18 / (1920 * 1080)));
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
      f.angle      = f.fleeAngle;
      f.fleeing    = PANIC_SECONDS;
      f.calming    = 0;
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