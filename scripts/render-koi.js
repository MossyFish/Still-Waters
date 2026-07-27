const IMG_W = 240, IMG_H = 340;

const FISH_DEFS = {
  1: { bodyLen: 226, anchors: [{x:104,y:65},{x:116,y:60},{x:118,y:61},{x:128,y:60},{x:144,y:63}] },
  2: { bodyLen: 203, anchors: [{x:96,y:69},{x:108,y:68},{x:115,y:63},{x:120,y:64},{x:139,y:63}] },
  3: { bodyLen: 197, anchors: [{x:102,y:70},{x:110,y:66},{x:118,y:66},{x:127,y:67},{x:138,y:66}] },
  4: { bodyLen: 156, anchors: [{x:100,y:82},{x:108,y:82},{x:116,y:82},{x:120,y:81},{x:128,y:85}] },
  5: { bodyLen: 83, anchors: [{x:108,y:107},{x:112,y:106},{x:112,y:105},{x:114,y:105},{x:116,y:106}] },
  6: { bodyLen: 74, anchors: [{x:109,y:112},{x:112,y:110},{x:112,y:110},{x:112,y:111},{x:115,y:111}] },
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

const FIN_PARAMS = {
  pectoral: { strands:5, spread:1.05, length:0.46, width:0.16, waveAmp:0.045 },
  tail: { strands:6, spread:1.75, length:0.54, width:0.15, waveAmp:0.05  },
};

function bodyGeometry(shape) {
  return {
    rightC:    0.62  * (shape.nose || 1),
    leftC:     0.95  * (shape.tailFullness || 1),
    halfWidth: 0.345 * (shape.depth || 1),
  };
}

function bendAt(xCoeff, rightC, leftC, phase, ampTail) {
  const u = Math.min(1, Math.max(0, (rightC - xCoeff) / (rightC + leftC)));
  return Math.sin(phase - u*2.7) * ampTail * Math.pow(u, 1.6);
}

function silhouettePoints(L, shape, phase) {
  const { rightC, leftC } = bodyGeometry(shape);
  const depth = shape.depth || 1, bulge = shape.bulge || 0;
  const ampTail = L * 0.15;
  const bend = xc => bendAt(xc, rightC, leftC, phase, ampTail);
  const profile = [
    [rightC, 0], [rightC*0.82, 0.15], [rightC*0.46, 0.30 + bulge*0.5],
    [rightC*0.08, 0.335], [-0.18, 0.32], [-0.42, 0.26],
    [-0.64, 0.175], [-leftC*0.88, 0.10], [-leftC, 0.028],
  ];
  const top = profile.map(([xc,h]) => [L*xc, L*h*depth + bend(xc)]);
  const bot = [];
  for (let i = profile.length-2; i > 0; i--) {
    const [xc,h] = profile[i];
    bot.push([L*xc, -L*h*depth + bend(xc)]);
  }
  return top.concat(bot);
}

function bodySilhouette(ctx, L, shape, phase) {
  blobPath(ctx, silhouettePoints(L, shape, phase));
}

function finAttachInfo(kind, shape) {
  const params = FIN_PARAMS[kind];
  if (!params) return null;
  const { rightC, leftC } = bodyGeometry(shape);
  let xc, sideOffsetCoeff, mirror;
  if (kind === 'pectoral') { xc = rightC*0.40; sideOffsetCoeff = 0.30*shape.depth; mirror = true;  }
  else                     { xc = -leftC;      sideOffsetCoeff = 0;               mirror = false; }
  return { params, xc, sideOffsetCoeff, mirror };
}

function strandPath(ctx, x0, y0, angle, length, width, waveAmp, wavePhase, taper, curve) {
  const N = 9, fx = Math.cos(angle), fy = Math.sin(angle), px = -fy, py = fx;
  const top = [], bot = [];
  for (let i = 0; i <= N; i++) {
    const s = i/N;
    const wob = Math.sin(s*Math.PI*curve + wavePhase) * waveAmp * s;
    const cx = x0 + fx*s*length + px*wob;
    const cy = y0 + fy*s*length + py*wob;
    const w = width * (1 - s*taper) * 0.5;
    top.push([cx+px*w, cy+py*w]);
    bot.push([cx-px*w, cy-py*w]);
  }
  blobPath(ctx, top.concat(bot.reverse()));
}

function drawFinFan(sctx, baseX, baseY, restAngle, spread, strandCount, length, width, waveAmp, phase, colorLight, colorMid, flatColor) {
  if (strandCount > 1) {
    for (const layer of [{rScale:0.80,waveMul:1.0,phaseOff:0,alpha:0.55},{rScale:0.58,waveMul:1.35,phaseOff:2.1,alpha:0.45}]) {
      const pts = [];
      for (let i = 0; i <= 12; i++) {
        const t = i/12, ang = restAngle - spread/2 + spread*t;
        const r   = length * layer.rScale * (0.88 + 0.12*Math.sin(t*Math.PI));
        const wob = Math.sin(t*Math.PI*1.3 + phase*1.15*layer.waveMul + layer.phaseOff) * waveAmp * layer.waveMul;
        pts.push([baseX + Math.cos(ang)*r - Math.sin(ang)*wob, baseY + Math.sin(ang)*r + Math.cos(ang)*wob]);
      }
      pts.push([baseX, baseY]);
      blobPath(sctx, pts);
      if (flatColor) { sctx.fillStyle = flatColor; sctx.fill(); }
      else {
        const g = sctx.createRadialGradient(baseX, baseY, 0, baseX, baseY, length);
        g.addColorStop(0, colorMid); g.addColorStop(1, colorLight);
        sctx.fillStyle = g; sctx.globalAlpha = layer.alpha; sctx.fill(); sctx.globalAlpha = 1;
      }
    }
  }
  for (let i = 0; i < strandCount; i++) {
    const t = strandCount <= 1 ? 0.5 : i/(strandCount-1);
    const ang = restAngle + (strandCount <= 1 ? 0 : -spread/2 + spread*t);
    const lenVar = length * (0.88 + 0.24*Math.sin(i*2.3+1.1));
    strandPath(sctx, baseX, baseY, ang, lenVar, width, waveAmp, phase*1.25+i*0.7, 0.5, 1.5);
    if (flatColor) { sctx.fillStyle = flatColor; sctx.fill(); }
    else {
      const g = sctx.createLinearGradient(baseX, baseY, baseX+Math.cos(ang)*lenVar, baseY+Math.sin(ang)*lenVar);
      g.addColorStop(0, colorMid); g.addColorStop(1, colorLight);
      sctx.fillStyle = g; sctx.globalAlpha = 0.85; sctx.fill(); sctx.globalAlpha = 1;
    }
  }
}

// fish behaviour
const PANIC_SECONDS = 1.0;
const CALM_SECONDS  = 2.0;
const KOI_TIERS = [
  { name:'large',  weight:0.5, lenRange:[65,92]  },
  { name:'medium', weight:0.3, lenRange:[36,50]  },
  { name:'baby',   weight:0.2, lenRange:[18,28]  },
];

function randRange(min, max) { return min + Math.random()*(max-min); }

function pickTier() {
  let r = Math.random(), acc = 0;
  for (const t of KOI_TIERS) { acc += t.weight; if (r < acc) return t; }
  return KOI_TIERS.at(-1);
}

class Fish {
  constructor(isCursorFish = false) {
    this.isCursorFish = isCursorFish;
    this.x = Math.random() * W;
    this.y = Math.random() * H;
    this.angle     = Math.random() * Math.PI * 2;
    this.baseAngle = this.angle;
    this.swimPhase = Math.random() * Math.PI * 2;
    this.wanderT   = Math.random() * 1000;
    this.fleeing   = 0;
    this.calming   = 0;
    this.fleeAngle = this.angle;

    if (isCursorFish) {
      this.speed = 0;
      this.cruiseSpeed = 0;
      this.len   = 15;
      this.shape = { depth:1, nose:1, tailFullness:1.05, bulge:0 };
      this.buildCursorSprites();
      this.pectoralFin = this.buildFinSprite('pectoral', 1.7);
      this.tailFin     = this.buildFinSprite('tail', 2.0);
    } 
    
    else {
      const tier = pickTier();
      this.tier  = tier.name;
      this.len   = randRange(...tier.lenRange);
      this.cruiseSpeed  = randRange(0.7, 2.1);
      this.speed        = this.cruiseSpeed;
      this.turnRate     = randRange(0.035, 0.075);
      this.panicSpeed   = 3.2;
      this.calmFromSpeed = this.cruiseSpeed;

      const types      = TIER_FISH_TYPES[this.tier];
      this.fishType    = types[Math.floor(Math.random() * types.length)];
      this.shadowType  = SHADOW_FOR_FISH[this.fishType];
      this.def         = FISH_DEFS[this.fishType];
      this.shadowDef   = SHADOW_DEFS[this.shadowType];
      this.spriteScale = this.len / this.def.bodyLen;
      this.drawW = IMG_W * this.spriteScale;
      this.drawH = IMG_H * this.spriteScale;
    }
  }

  // cosine easing gives natural slow-at-extremes tail motion
  getFrameIndex() {
    const t = (1 - Math.cos(this.swimPhase)) / 2;
    return Math.min(4, Math.floor(t * 4.999));
  }

  buildCursorSprites() {
    const L = this.len;
    const { rightC, leftC, halfWidth } = bodyGeometry(this.shape);
    const pad = 40;
    this.cursorW = L*(rightC+leftC) + pad*2;
    this.cursorH = L*halfWidth*2 + pad*2;
    this.cursorOX = pad + L*leftC;
    this.cursorOY = this.cursorH / 2;

    this.cursorSprites = [];
    for (let i = 0; i < N_PHASES; i++) {
      const phase = (i/N_PHASES) * Math.PI * 2;
      const sc = document.createElement('canvas');
      sc.width  = Math.ceil(this.cursorW * SPRITE_SCALE);
      sc.height = Math.ceil(this.cursorH * SPRITE_SCALE);
      const sctx = sc.getContext('2d');
      sctx.scale(SPRITE_SCALE, SPRITE_SCALE);
      sctx.translate(this.cursorOX, this.cursorOY);

      sctx.save();
      sctx.shadowColor = 'rgba(255,255,255,0.95)';
      sctx.shadowBlur  = 18;
      bodySilhouette(sctx, L, this.shape, phase);
      sctx.fillStyle = 'rgba(255,255,255,0.92)';
      sctx.fill();
      sctx.restore();

      sctx.save();
      sctx.shadowColor = 'rgba(255,255,255,0.9)';
      sctx.shadowBlur  = 6;
      bodySilhouette(sctx, L, this.shape, phase);
      sctx.strokeStyle = 'rgba(255,255,255,0.95)';
      sctx.lineWidth   = 1.4;
      sctx.stroke();
      sctx.restore();

      sctx.beginPath();
      sctx.arc(L*0.46, -L*0.05, L*0.045, 0, Math.PI*2);
      sctx.fillStyle = 'rgba(30,30,30,0.9)';
      sctx.fill();

      this.cursorSprites.push(sc);
    }
  }

  buildFinSprite(kind, sizeMul = 1) {
    const info = finAttachInfo(kind, this.shape);
    if (!info) return null;
    const { params, xc, sideOffsetCoeff, mirror } = info;
    const L = this.len;
    const length  = L * params.length  * sizeMul;
    const waveAmp = L * params.waveAmp * sizeMul;
    const width   = L * params.width   * sizeMul;
    const sideOff = L * sideOffsetCoeff;
    const reach   = length + waveAmp + width + sideOff + L*0.15;
    const S       = Math.ceil(reach*2 + 12);

    const sprites = [];
    for (let i = 0; i < N_PHASES; i++) {
      const phase = (i/N_PHASES) * Math.PI * 2;
      const sc = document.createElement('canvas');
      sc.width = sc.height = Math.ceil(S * SPRITE_SCALE);
      const sctx = sc.getContext('2d');
      sctx.scale(SPRITE_SCALE, SPRITE_SCALE);
      sctx.translate(S/2, S/2);
      sctx.filter = 'blur(0.6px)';
      drawFinFan(sctx, 0, sideOff, Math.PI, params.spread, params.strands,
                 length, width, waveAmp, phase,
                 'rgba(255,255,255,0.45)', 'rgba(255,255,255,0.55)');
      sprites.push(sc);
    }
    return { sprites, size:S, originX:S/2, originY:S/2, attachX:L*xc, xc, mirror };
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

    } else if (this.fleeing > 0) {
      this.fleeing -= dt;
      this.angle   = this.fleeAngle + Math.sin(this.wanderT*6) * 0.3;
      this.speed  += (this.panicSpeed - this.speed) * (1 - Math.pow(1-0.35, step));
      if (this.fleeing <= 0) {
        this.fleeing = 0; this.calming = CALM_SECONDS;
        this.speed = this.cruiseSpeed + (this.speed-this.cruiseSpeed) * 0.5;
        this.calmFromSpeed = this.speed;
        this.baseAngle = this.angle;
      }
    } else if (this.calming > 0) {
      this.calming -= dt;
      this.steerWander(step);
      const t = Math.min(1, 1 - Math.max(0, this.calming) / CALM_SECONDS);
      this.speed = this.calmFromSpeed + (this.cruiseSpeed-this.calmFromSpeed) * t*t*(3-2*t);
    } else {
      this.steerWander(step);
      this.speed += (this.cruiseSpeed-this.speed) * (1 - Math.pow(1-0.02, step));
    }

    const speedFactor = Math.min(1.7, this.speed/2.2);
    this.swimPhase += 0.18 * (0.30 + speedFactor*2.8) * step;

    if (!this.isCursorFish) {
      this.x += Math.cos(this.angle) * this.speed * step;
      this.y += Math.sin(this.angle) * this.speed * step;
      if (this.x < -60) this.x = W+60; if (this.x > W+60) this.x = -60;
      if (this.y < -60) this.y = H+60; if (this.y > H+60) this.y = -60;
    }
  }

  draw(ctx) {
    if (this.isCursorFish) { this.drawCursorFish(ctx); return; }

    const fi = this.getFrameIndex();
    const fa = this.def.anchors[fi];
    const sa = this.shadowDef.anchors[fi];
    const { ux, uy, t } = lightShadowParams(this.x, this.y);
    const shadowOff = this.len * (0.14 + t*0.5);

    const shadow = assets.shadows[this.shadowType]?.[fi];
    if (shadow) {
      ctx.save();
      ctx.translate(this.x + ux*shadowOff, this.y + uy*shadowOff);
      ctx.rotate(this.angle + Math.PI/2);
      ctx.globalAlpha = Math.max(0, 0.3 - t*0.12);
      ctx.drawImage(shadow, -sa.x*this.spriteScale, -sa.y*this.spriteScale, this.drawW, this.drawH);
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    const body = assets.fish[this.fishType]?.[fi];
    if (body) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle + Math.PI/2);
      ctx.drawImage(body, -fa.x*this.spriteScale, -fa.y*this.spriteScale, this.drawW, this.drawH);
      ctx.restore();
    }
  }

  drawFinImage(ctx, fin, norm, idx) {
    if (!fin) return;
    const { rightC, leftC } = bodyGeometry(this.shape);
    const bendY = bendAt(fin.xc, rightC, leftC, norm, this.len*0.15);
    ctx.save();
    ctx.translate(this.x, this.y); ctx.rotate(this.angle);
    ctx.translate(fin.attachX, bendY);
    ctx.drawImage(fin.sprites[idx], -fin.originX, -fin.originY, fin.size, fin.size);
    if (fin.mirror) {
      ctx.scale(1, -1);
      ctx.drawImage(fin.sprites[idx], -fin.originX, -fin.originY, fin.size, fin.size);
    }
    ctx.restore();
  }

  drawCursorFish(ctx) {
    const norm = ((this.swimPhase % (Math.PI*2)) + Math.PI*2) % (Math.PI*2);
    const idx  = Math.floor((norm/(Math.PI*2)) * N_PHASES) % N_PHASES;
    this.drawFinImage(ctx, this.pectoralFin, norm, idx);
    this.drawFinImage(ctx, this.tailFin,     norm, idx);
    ctx.save();
    ctx.translate(this.x, this.y); ctx.rotate(this.angle);
    ctx.drawImage(this.cursorSprites[idx], -this.cursorOX, -this.cursorOY, this.cursorW, this.cursorH);
    ctx.restore();
  }
}

const fishArr   = [];
for (let i = 0; i < 9; i++) fishArr.push(new Fish());
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