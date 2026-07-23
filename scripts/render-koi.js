const KOI_HUES = {
  red: ['#e0473a', '#c22e22', '#932015'],
  yellow: ['#f0c14b', '#d99a2b', '#b87a1e'],
};
const SUMI = '#221d1a';
const RED_PROB = randRange(0.55, 0.70);

const PANIC_SECONDS = 1.0;
const CALM_SECONDS = 2.0;

const KOI_TIERS = [
  { name: 'large', weight: 0.5, lenRange: [65, 92] },
  { name: 'medium', weight: 0.3, lenRange: [36, 50] },
  { name: 'baby', weight: 0.2, lenRange: [18, 28] },
];

function pickTier(){
  const r = Math.random();
  let acc = 0;
  for(const t of KOI_TIERS){ acc += t.weight; if(r < acc) return t; }
  return KOI_TIERS[KOI_TIERS.length-1];
}

function randomShapeForTier(name){
  if(name === 'large') return {
    depth: randRange(0.76, 0.94), nose: randRange(0.96, 1.08),
    tailFullness: randRange(1.12, 1.36), bulge: randRange(-0.03, 0.08)
  };
  if(name === 'medium') return {
    depth: randRange(0.72, 0.86), nose: randRange(0.94, 1.06),
    tailFullness: randRange(0.80, 0.98), bulge: randRange(-0.03, 0.06)
  };
  return {
    depth: randRange(0.68, 0.85), nose: randRange(0.90, 1.02),
    tailFullness: randRange(0.62, 0.80), bulge: randRange(-0.02, 0.04)
  };
}

const FIN_PARAMS = {
  pectoral: {
    large: { strands: 5, spread: 1.05, length: 0.46, width: 0.16, waveAmp: 0.045 },
    medium: { strands: 2, spread: 0.34, length: 0.34, width: 0.19, waveAmp: 0.016 },
    baby: { strands: 1, spread: 0, length: 0.26, width: 0.22, waveAmp: 0.008 },
  },
  secondary: {
    large: { strands: 2, spread: 0.48, length: 0.20, width: 0.13, waveAmp: 0.02 },
  },
  tail: {
    large: { strands: 6, spread: 1.75, length: 0.54, width: 0.15, waveAmp: 0.05 },
    medium: { strands: 3, spread: 1.0, length: 0.40, width: 0.17, waveAmp: 0.03 },
    baby: { strands: 2, spread: 0.55, length: 0.30, width: 0.19, waveAmp: 0.015 },
  }
};

function bendAt(xCoeff, rightC, leftC, phase, ampTail){
  const u = Math.min(1, Math.max(0, (rightC - xCoeff)/(rightC+leftC)));
  const amp = ampTail*Math.pow(u, 1.6);
  return Math.sin(phase - u*2.7)*amp;
}

function bodyGeometry(shape){
  const nose = shape.nose||1, tailFullness = shape.tailFullness||1, depth = shape.depth||1;
  return {
    rightC: 0.62*nose,
    leftC: 0.95*tailFullness,
    halfWidth: 0.345*depth
  };
}

function finAttachInfo(kind, tier, shape){
  const params = FIN_PARAMS[kind] && FIN_PARAMS[kind][tier];
  if(!params) return null;
  const { rightC, leftC } = bodyGeometry(shape);
  let xc, sideOffsetCoeff, mirror;
  if(kind === 'pectoral'){ xc = rightC*0.40; sideOffsetCoeff = 0.30*shape.depth; mirror = true; }
  else if(kind === 'secondary'){ xc = -0.30; sideOffsetCoeff = 0.20*shape.depth; mirror = true; }
  else { xc = -leftC; sideOffsetCoeff = 0; mirror = false; }
  return { params, xc, sideOffsetCoeff, mirror };
}

function silhouettePoints(L, shape, phase){
  const { rightC, leftC } = bodyGeometry(shape);
  const depth = shape.depth||1, bulge = shape.bulge||0;
  const ampTail = L*0.15;
  const bend = (xc) => bendAt(xc, rightC, leftC, phase, ampTail);

  const profile = [
    [ rightC, 0.000 ],
    [ rightC*0.82, 0.150 ],
    [ rightC*0.46, 0.300 + bulge*0.5 ],
    [ rightC*0.08, 0.335 ],
    [ -0.18, 0.320 ],
    [ -0.42, 0.260 ],
    [ -0.64, 0.175 ],
    [ -leftC*0.88, 0.100 ],
    [ -leftC, 0.028 ],
  ];

  const top = profile.map(([xc,h]) => [ L*xc, L*h*depth + bend(xc) ]);
  const bottom = [];
  for(let i=profile.length-2; i>0; i--){
    const [xc,h] = profile[i];
    bottom.push([ L*xc, -L*h*depth + bend(xc) ]);
  }
  return top.concat(bottom);
}

function bodySilhouette(ctx, L, shape, phase){
  blobPath(ctx, silhouettePoints(L, shape, phase));
}

function blobPointsStretched(cx, cy, r, template, stretchX, stretchY, rotAngle){
  const raw = blobPointsFromTemplate(0, 0, r, template);
  const cos = Math.cos(rotAngle), sin = Math.sin(rotAngle);
  return raw.map(([x,y]) => {
    const sx = x*stretchX, sy = y*stretchY;
    return [ cx + sx*cos - sy*sin, cy + sx*sin + sy*cos ];
  });
}

function fillPatchRadial(ctx, pts, cx, cy, extent, colorCenter, colorEdge, alpha){
  blobPath(ctx, pts);
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, extent);
  grad.addColorStop(0, colorCenter);
  grad.addColorStop(0.65, colorCenter);
  grad.addColorStop(1, colorEdge);
  ctx.fillStyle = grad;
  ctx.globalAlpha = alpha;
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawPatchSpeckles(ctx, pts, cx, cy, rx, ry, specks){
  ctx.save();
  blobPath(ctx, pts);
  ctx.clip();
  specks.forEach(s => {
    const sx = cx + s.ux*rx, sy = cy + s.uy*ry;
    const sr = Math.max(1, s.rScale*Math.max(rx,ry));
    const spec = blobPointsFromTemplate(sx, sy, sr, s.template);
    fillBlobFlat(ctx, spec, s.color, s.alpha);
  });
  ctx.restore();
}

function strandPath(ctx, x0, y0, angle, length, width, waveAmp, wavePhase, taper, curve){
  const N = 9;
  const fx = Math.cos(angle), fy = Math.sin(angle);
  const px = -fy, py = fx;
  const top = [], bot = [];
  for(let i=0;i<=N;i++){
    const s = i/N;
    const forward = s*length;
    const wob = Math.sin(s*Math.PI*curve + wavePhase) * waveAmp * s;
    const cx = x0 + fx*forward + px*wob;
    const cy = y0 + fy*forward + py*wob;
    const w = width*(1-s*taper)*0.5;
    top.push([cx+px*w, cy+py*w]);
    bot.push([cx-px*w, cy-py*w]);
  }
  blobPath(ctx, top.concat(bot.reverse()));
}

function drawFinFan(sctx, baseX, baseY, restAngle, spread, strandCount, length, width, waveAmp, phase, colorLight, colorMid, flatColor){
  if(strandCount > 1){
    const webLayers = [
      { rScale: 0.80, waveMul: 1.0, phaseOff: 0, alpha: 0.55 },
      { rScale: 0.58, waveMul: 1.35, phaseOff: 2.1, alpha: 0.45 },
    ];
    webLayers.forEach(layer => {
      const pts = [];
      const webSteps = 12;
      for(let i=0;i<=webSteps;i++){
        const t = i/webSteps;
        const ang = restAngle - spread/2 + spread*t;
        const r = length*layer.rScale*(0.88+0.12*Math.sin(t*Math.PI));
        const wob = Math.sin(t*Math.PI*1.3 + phase*1.15*layer.waveMul + layer.phaseOff)*waveAmp*layer.waveMul;
        const px = -Math.sin(ang), py = Math.cos(ang);
        pts.push([baseX+Math.cos(ang)*r+px*wob, baseY+Math.sin(ang)*r+py*wob]);
      }
      pts.push([baseX, baseY]);
      blobPath(sctx, pts);
      if(flatColor){
        sctx.fillStyle = flatColor;
        sctx.fill();
      } else {
        const webGrad = sctx.createRadialGradient(baseX, baseY, 0, baseX, baseY, length);
        webGrad.addColorStop(0, colorMid);
        webGrad.addColorStop(1, colorLight);
        sctx.fillStyle = webGrad;
        sctx.globalAlpha = layer.alpha;
        sctx.fill();
        sctx.globalAlpha = 1;
      }
    });
  }

  for(let i=0;i<strandCount;i++){
    const t = strandCount<=1 ? 0.5 : i/(strandCount-1);
    const ang = restAngle + (strandCount<=1 ? 0 : (-spread/2 + spread*t));
    const lenVar = length*(0.88+0.24*Math.sin(i*2.3+1.1));
    const wavePhase = phase*1.25 + i*0.7;
    strandPath(sctx, baseX, baseY, ang, lenVar, width, waveAmp, wavePhase, 0.5, 1.5);
    if(flatColor){
      sctx.fillStyle = flatColor;
      sctx.fill();
    } else {
      const tipX = baseX+Math.cos(ang)*lenVar, tipY = baseY+Math.sin(ang)*lenVar;
      const grad = sctx.createLinearGradient(baseX, baseY, tipX, tipY);
      grad.addColorStop(0, colorMid);
      grad.addColorStop(1, colorLight);
      sctx.fillStyle = grad;
      sctx.globalAlpha = 0.85;
      sctx.fill();
      sctx.globalAlpha = 1;
    }
  }
}

class Fish {
  constructor(isCompanion = false){
    this.isCompanion = isCompanion;
    this.x = Math.random() * W;
    this.y = Math.random() * H;
    this.angle = Math.random() * Math.PI * 2;
    this.baseAngle = this.angle;
    this.cruiseSpeed = isCompanion ? 0 : randRange(0.7, 2.1);
    this.speed = this.cruiseSpeed;
    this.turnRate = randRange(0.035, 0.075);
    this.wanderT = Math.random() * 1000;
    this.swimPhase = Math.random() * Math.PI * 2;
    this.fleeing = 0;
    this.calming = 0;
    this.panicSpeed = 3.2;
    this.calmFromSpeed = this.cruiseSpeed;
    this.fleeAngle = this.angle;

    if(isCompanion){
      this.tier = 'medium';
      this.len = 15;
      this.shape = { depth: 1, nose: 1, tailFullness: 1.05, bulge: 0 };
      this.buildCompanionSprites();
      this.pectoralFin = this.buildFinSprite('pectoral', 'large', 1.7);
      this.secondaryFin = null;
      this.tailFin = this.buildFinSprite('tail', 'large', 2.0);
    } else {
      const tier = pickTier();
      this.tier = tier.name;
      this.len = randRange(tier.lenRange[0], tier.lenRange[1]);
      this.shape = randomShapeForTier(tier.name);
      const hue = Math.random() < RED_PROB ? 'red' : 'yellow';
      this.shades = KOI_HUES[hue]; 
      this.hasSumi = Math.random() < 0.3;
      this.buildPatchPlan();
      this.buildSpriteSheet();
      this.buildShadowSprites();
      this.pectoralFin = this.buildFinSprite('pectoral');
      this.secondaryFin = this.tier === 'large' ? this.buildFinSprite('secondary') : null;
      this.tailFin = this.buildFinSprite('tail');
    }
  }

  buildPatchPlan(){
    const shades = this.shades;
    this.patches = [];

    const makeSpeckles = (extraSumiChance) => {
      const list = [];
      const mottleCount = 10 + Math.floor(Math.random() * 14);
      for(let i=0; i<mottleCount; i++){
        const edgeBias = 0.4 + 0.6 * Math.pow(Math.random(), 0.45);
        const ang = Math.random() * Math.PI * 2;
        list.push({
          ux: Math.cos(ang)*edgeBias, uy: Math.sin(ang)*edgeBias,
          rScale: randRange(0.018, 0.04), color: shades[2],
          alpha: 0.3 + Math.random()*0.3, template: makeBlobTemplate(5, 0.4)
        });
      }
      if(this.hasSumi && Math.random() < extraSumiChance){
        const sumiCount = 1 + Math.floor(Math.random()*3);
        for(let i=0; i<sumiCount; i++){
          const edgeBias = 0.25 + 0.65 * Math.random();
          const ang = Math.random() * Math.PI * 2;
          list.push({
            ux: Math.cos(ang)*edgeBias, uy: Math.sin(ang)*edgeBias,
            rScale: randRange(0.045, 0.08), color: SUMI,
            alpha: 0.55 + Math.random()*0.25, template: makeBlobTemplate(5, 0.4)
          });
        }
      }
      return list;
    };

    if(this.tier === 'baby'){
      const r = randRange(0.46, 0.56);
      const stretchX = randRange(1.4, 1.7), stretchY = randRange(1.05, 1.25);
      this.patches.push({
        cx: randRange(-0.08, 0.12), cy: randRange(-0.04, 0.04),
        r, stretchX, stretchY,
        rotAngle: randRange(-0.15, 0.15), template: makeBlobTemplate(7, 0.14),
        colorCenter: shades[0], colorEdge: shades[1],
        speckles: this.hasSumi ? makeSpeckles(1) : []
      });
      return;
    }

    const coverage = randRange(0.3, 0.8);
    const regionCount = coverage > 0.55 ? 1 + Math.floor(Math.random()*2) : 1 + Math.floor(Math.random()*3);
    const anchors = [];
    for(let i=0; i<regionCount; i++) anchors.push(randRange(-0.58, 0.40));
    anchors.sort((a,b) => a - b);

    const sizeScale = 0.55 + coverage * 1.4;
    anchors.forEach(ax => {
      const r = randRange(0.14, 0.20) * sizeScale * (this.tier === 'large' ? 1.15 : 1.0);
      const stretchX = randRange(1.3, 2.1);
      const stretchY = randRange(0.85, 1.05) * (0.75 + coverage*0.75);
      this.patches.push({
        cx: ax, cy: randRange(-0.06, 0.06),
        r, stretchX, stretchY,
        rotAngle: randRange(-0.25, 0.25), template: makeBlobTemplate(6 + Math.floor(Math.random()*3), 0.34),
        colorCenter: shades[Math.random() < 0.6 ? 0 : 1], colorEdge: shades[2],
        speckles: makeSpeckles(0.55)
      });
    });
  }

  buildSpriteSheet(){
    const L = this.len;
    const { rightC, leftC, halfWidth } = bodyGeometry(this.shape);
    const pad = L * 0.12;
    const bendPad = L * 0.18;

    this.spriteW = L * (rightC + leftC) + pad * 2;
    this.spriteH = L * halfWidth * 2 + bendPad * 2 + pad * 2;
    this.originX = pad + L * leftC;
    this.originY = this.spriteH / 2;

    this.sprites = [];
    for(let i=0; i<N_PHASES; i++){
      const phase = (i/N_PHASES) * Math.PI * 2;     
      this.sprites.push(this.renderPose(phase));
    }
  }
 
  renderPose(phase){  
    const L = this.len;
    const { rightC, leftC } = bodyGeometry(this.shape);
    const ampTail = L * 0.15;
    const bend = (xc) => bendAt(xc, rightC, leftC, phase, ampTail);

    const sc = document.createElement('canvas');
    sc.width = Math.ceil(this.spriteW * SPRITE_SCALE);
    sc.height = Math.ceil(this.spriteH * SPRITE_SCALE);
    const sctx = sc.getContext('2d');
    sctx.scale(SPRITE_SCALE, SPRITE_SCALE);
    sctx.translate(this.originX, this.originY);

    sctx.filter = 'blur(1.1px)';

    bodySilhouette(sctx, L, this.shape, phase);
    const bodyGrad = sctx.createLinearGradient(0, -L*0.4, 0, L*0.4);
    bodyGrad.addColorStop(0, '#fdf7ea');
    bodyGrad.addColorStop(0.55, '#fdf7ea');
    bodyGrad.addColorStop(1, '#ffffff');
    sctx.fillStyle = bodyGrad;
    sctx.fill();

    sctx.save();
    sctx.filter = 'none';
    bodySilhouette(sctx, L, this.shape, phase);
    sctx.clip();
    sctx.filter = 'blur(1.1px)';

    this.patches.forEach(p => {
      const cx = L*p.cx, cy = L*p.cy + bend(p.cx);
      const pts = blobPointsStretched(cx, cy, L*p.r, p.template, p.stretchX, p.stretchY, p.rotAngle);
      fillPatchRadial(sctx, pts, cx, cy, L*p.r*Math.max(p.stretchX, p.stretchY), p.colorCenter, p.colorEdge, 0.92);
      if(p.speckles.length) drawPatchSpeckles(sctx, pts, cx, cy, L*p.r*p.stretchX, L*p.r*p.stretchY, p.speckles);
    });

    const rim = sctx.createRadialGradient(0, 0, L*0.15, 0, 0, L*0.6);
    rim.addColorStop(0, 'rgba(0,0,0,0)');
    rim.addColorStop(1, 'rgba(20,30,20,0.12)');
    sctx.fillStyle = rim;
    sctx.fillRect(-this.originX, -this.originY, this.spriteW, this.spriteH);

    sctx.save();
    sctx.filter = 'none';
    sctx.translate(L*0.08, -L*0.1*this.shape.depth);
    sctx.scale(1, 0.3);
    const sheen = sctx.createRadialGradient(0, 0, 0, 0, 0, L*0.28);
    sheen.addColorStop(0, 'rgba(255,255,255,0.3)');
    sheen.addColorStop(1, 'rgba(255,255,255,0)');
    sctx.beginPath();
    sctx.arc(0, 0, L*0.28, 0, Math.PI*2);
    sctx.fillStyle = sheen;
    sctx.fill();
    sctx.restore();

    sctx.restore();
    return sc;
  }

  buildFinSprite(kind, tierOverride, sizeMul = 1){
    const tier = tierOverride || this.tier;
    const info = finAttachInfo(kind, tier, this.shape);
    if(!info) return null;
    const { params, xc, sideOffsetCoeff, mirror } = info;

    const L = this.len;
    const ampTail = L * 0.15;

    const attachX = L * xc;
    const sideOffset = L * sideOffsetCoeff;
    const length = L * params.length * sizeMul, waveAmp = L * params.waveAmp * sizeMul, width = L * params.width * sizeMul;
    const reach = length + waveAmp + width + sideOffset + ampTail;
    const pad = 6;
    const S = Math.ceil(reach*2 + pad*2);
    const originX = S/2, originY = S/2;

    const finTint = (this.tier === 'baby' || this.isCompanion) ? '#ffffff' : this.shades[0];
    const colorMid = hexToRgba(finTint, 0.55);
    const colorLight = hexToRgba('#ffffff', 0.45);

    const sprites = [];
    for(let i=0; i<N_PHASES; i++){
      const phase = (i/N_PHASES) * Math.PI * 2;
      const sc = document.createElement('canvas');
      sc.width = Math.ceil(S * SPRITE_SCALE);
      sc.height = Math.ceil(S * SPRITE_SCALE);
      const sctx = sc.getContext('2d');
      sctx.scale(SPRITE_SCALE, SPRITE_SCALE);
      sctx.translate(originX, originY);
      sctx.filter = 'blur(0.6px)';
      drawFinFan(sctx, 0, sideOffset, Math.PI, params.spread, params.strands, length, width, waveAmp, phase, colorLight, colorMid);
      sprites.push(sc);
    }
    return { sprites, size: S, originX, originY, attachX, xc, mirror };
  }

  buildShadowSprites(){
    const shadowL = this.len * 1.08;
    const { rightC, leftC, halfWidth } = bodyGeometry(this.shape);
    const ampTail = shadowL * 0.15;
    const blurPx = Math.max(2, this.len * 0.07);
    const pad = shadowL * 0.12 + blurPx * 2.5;
    const bendPad = shadowL * 0.18 + blurPx * 2.5;

    this.shadowSpriteW = shadowL * (rightC + leftC) + pad * 2;
    this.shadowSpriteH = shadowL * halfWidth * 2 + bendPad * 2 + pad * 2;
    this.shadowOriginX = pad + shadowL * leftC;
    this.shadowOriginY = this.shadowSpriteH / 2;

    const finKinds = ['pectoral', 'tail'];
    if(this.tier === 'large') finKinds.push('secondary');

    this.shadowSprites = [];
    for(let i=0; i<N_PHASES; i++){
      const phase = (i/N_PHASES) * Math.PI * 2;
      const sc = document.createElement('canvas');
      sc.width = Math.ceil(this.shadowSpriteW * SPRITE_SCALE);
      sc.height = Math.ceil(this.shadowSpriteH * SPRITE_SCALE);
      const sctx = sc.getContext('2d');
      sctx.scale(SPRITE_SCALE, SPRITE_SCALE);
      sctx.translate(this.shadowOriginX, this.shadowOriginY);
      sctx.filter = `blur(${blurPx.toFixed(1)}px)`;

      finKinds.forEach(kind => {
        const info = finAttachInfo(kind, this.tier, this.shape);
        if(!info) return;
        const { params, xc, sideOffsetCoeff, mirror } = info;
        const attachX = shadowL * xc;
        const sideOffset = shadowL * sideOffsetCoeff;
        const bendY = bendAt(xc, rightC, leftC, phase, ampTail);
        sctx.save();
        sctx.translate(attachX, bendY);
        drawFinFan(sctx, 0, sideOffset, Math.PI, params.spread, params.strands, shadowL*params.length, shadowL*params.width, shadowL*params.waveAmp, phase, null, null, '#000');
        if(mirror){
          sctx.scale(1, -1);
          drawFinFan(sctx, 0, sideOffset, Math.PI, params.spread, params.strands, shadowL*params.length, shadowL*params.width, shadowL*params.waveAmp, phase, null, null, '#000');
        }
        sctx.restore();
      });

      bodySilhouette(sctx, shadowL, this.shape, phase);
      sctx.fillStyle = '#000';
      sctx.fill();
      this.shadowSprites.push(sc);
    }
  }

  buildCompanionSprites(){
    const L = this.len;
    const { rightC, leftC, halfWidth } = bodyGeometry(this.shape);
    const glowPad = 40;
    this.compSpriteW = L * (rightC + leftC) + glowPad * 2;
    this.compSpriteH = L * halfWidth * 2 + glowPad * 2;
    this.compOriginX = glowPad + L * leftC;
    this.compOriginY = this.compSpriteH / 2;

    this.compSprites = [];
    for(let i=0; i<N_PHASES; i++){
      const phase = (i/N_PHASES) * Math.PI * 2;
      const sc = document.createElement('canvas');
      sc.width = Math.ceil(this.compSpriteW * SPRITE_SCALE);
      sc.height = Math.ceil(this.compSpriteH * SPRITE_SCALE);
      const sctx = sc.getContext('2d');
      sctx.scale(SPRITE_SCALE, SPRITE_SCALE);
      sctx.translate(this.compOriginX, this.compOriginY);

      sctx.save();
      sctx.shadowColor = 'rgba(255,255,255,0.95)';
      sctx.shadowBlur = 18;
      bodySilhouette(sctx, L, this.shape, phase);
      sctx.fillStyle = 'rgba(255,255,255,0.92)';
      sctx.fill();
      sctx.restore();

      sctx.save();
      sctx.shadowColor = 'rgba(255,255,255,0.9)';
      sctx.shadowBlur = 6;
      bodySilhouette(sctx, L, this.shape, phase);
      sctx.strokeStyle = 'rgba(255,255,255,0.95)';
      sctx.lineWidth = 1.4;
      sctx.stroke();
      sctx.restore();

      sctx.beginPath();
      sctx.arc(L*0.46, -L*0.05, L*0.045, 0, Math.PI*2);
      sctx.fillStyle = 'rgba(30,30,30,0.9)';
      sctx.fill();

      this.compSprites.push(sc);
    }
  }

  steerWander(step){
    this.baseAngle += (Math.random() - 0.5) * 0.05 * step;
    const targetAngle = this.baseAngle + Math.sin(this.wanderT) * 0.9;
    let diff = targetAngle - this.angle;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    this.angle += diff * Math.min(1, this.turnRate * 3 * step);
  }

  update(){
    const step = dt * 60;
    this.wanderT += 0.012 * step;
    
    if(this.isCompanion){
      const dx = mouse.x - this.x, dy = mouse.y - this.y;
      const dist = Math.hypot(dx, dy);
      const ease = 1 - Math.pow(1 - 0.32, step);
      this.x += dx * ease;
      this.y += dy * ease;
      if(dist > 1){
        const targetAngle = Math.atan2(dy, dx);
        let diff = targetAngle - this.angle;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        this.angle += diff * (1 - Math.pow(1 - 0.9, step));
      }
      this.speed = Math.min(dist * ease, 20);
    } else if(this.fleeing > 0){
      this.fleeing -= dt;
      this.angle = this.fleeAngle + Math.sin(this.wanderT * 6) * 0.3;
      this.speed += (this.panicSpeed - this.speed) * (1 - Math.pow(1 - 0.35, step));
      if(this.fleeing <= 0){
        this.fleeing = 0;
        this.calming = CALM_SECONDS;
        this.speed = this.cruiseSpeed + (this.speed - this.cruiseSpeed) * 0.50;
        this.calmFromSpeed = this.speed;
        this.baseAngle = this.angle;
      }
    } else if(this.calming > 0){
      this.calming -= dt;
      this.steerWander(step);
      const t = Math.min(1, 1 - Math.max(0, this.calming) / CALM_SECONDS);
      const eased = t * t * (3 - 2 * t);
      this.speed = this.calmFromSpeed + (this.cruiseSpeed - this.calmFromSpeed) * eased;
    } else {
      this.steerWander(step);
      this.speed += (this.cruiseSpeed - this.speed) * (1 - Math.pow(1 - 0.02, step));
    }
    
    const speedFactor = Math.min(1.7, this.speed / 2.2);
    this.swimPhase += 0.18 * (0.30 + speedFactor * 2.8) * step;

    if(!this.isCompanion){
      this.x += Math.cos(this.angle) * this.speed * step;
      this.y += Math.sin(this.angle) * this.speed * step;
      if(this.x < -60) this.x = W + 60;
      if(this.x > W + 60) this.x = -60;
      if(this.y < -60) this.y = H + 60;
      if(this.y > H + 60) this.y = -60;
    } else {
      this.x = Math.max(20, Math.min(W - 20, this.x));
      this.y = Math.max(20, Math.min(H - 20, this.y));
    }
  }

  drawFinImage(ctx, fin, rightC, leftC, ampTail, norm, idx){
    if(!fin) return;
    const bendY = bendAt(fin.xc, rightC, leftC, norm, ampTail);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.translate(fin.attachX, bendY);
    ctx.drawImage(fin.sprites[idx], -fin.originX, -fin.originY, fin.size, fin.size);
    if(fin.mirror){
      ctx.scale(1, -1);
      ctx.drawImage(fin.sprites[idx], -fin.originX, -fin.originY, fin.size, fin.size);
    }
    ctx.restore();
  }

  draw(ctx){
    if(this.isCompanion){ this.drawCompanion(ctx); return; }

    const L = this.len;
    const { rightC, leftC } = bodyGeometry(this.shape);
    const ampTail = L * 0.15;

    const { ux, uy, t } = lightShadowParams(this.x, this.y);
    const shadowOffset = L * (0.14 + t * 0.5);
    const norm = ((this.swimPhase % (Math.PI*2)) + Math.PI*2) % (Math.PI*2);
    const idx = Math.floor((norm / (Math.PI*2)) * N_PHASES) % N_PHASES;

    ctx.save();
    ctx.translate(this.x + ux*shadowOffset, this.y + uy*shadowOffset);
    ctx.rotate(this.angle);
    ctx.globalAlpha = Math.max(0, 0.3 - t*0.12);
    ctx.drawImage(this.shadowSprites[idx], -this.shadowOriginX, -this.shadowOriginY, this.shadowSpriteW, this.shadowSpriteH);
    ctx.globalAlpha = 1;
    ctx.restore();

    this.drawFinImage(ctx, this.pectoralFin, rightC, leftC, ampTail, norm, idx);
    this.drawFinImage(ctx, this.secondaryFin, rightC, leftC, ampTail, norm, idx);
    this.drawFinImage(ctx, this.tailFin, rightC, leftC, ampTail, norm, idx);

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.drawImage(this.sprites[idx], -this.originX, -this.originY, this.spriteW, this.spriteH);
    ctx.restore();

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    const eyeX = L * rightC * 0.70;
    const eyeY = L * this.shape.depth * 0.19;
    const eyeMul = this.tier === 'large' ? 0.6 : (this.tier === 'medium' ? 0.85 : 1.0);
    const eyeRx = L * 0.052 * eyeMul, eyeRy = L * 0.030 * eyeMul;
    const edgeSlope = -0.4167 * this.shape.depth / rightC;
    const tiltAngle = Math.atan2(edgeSlope, 1);
    ctx.fillStyle = 'rgba(20,15,10,0.85)';
    [1, -1].forEach(side => {
      ctx.beginPath();
      ctx.ellipse(eyeX, side*eyeY, eyeRx, eyeRy, side*tiltAngle, 0, Math.PI*2);
      ctx.fill();
    });
    ctx.restore();
  }

  drawCompanion(ctx){
    const L = this.len;
    const { rightC, leftC } = bodyGeometry(this.shape);
    const ampTail = L * 0.15;
    const norm = ((this.swimPhase % (Math.PI*2)) + Math.PI*2) % (Math.PI*2);
    const idx = Math.floor((norm / (Math.PI*2)) * N_PHASES) % N_PHASES;

    this.drawFinImage(ctx, this.pectoralFin, rightC, leftC, ampTail, norm, idx);
    this.drawFinImage(ctx, this.tailFin, rightC, leftC, ampTail, norm, idx);

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.drawImage(this.compSprites[idx], -this.compOriginX, -this.compOriginY, this.compSpriteW, this.compSpriteH);
    ctx.restore();
  }
}

const fishArr = [];
for(let i=0; i<9; i++) fishArr.push(new Fish());
const companion = new Fish(true);

function fleeFrom(x, y, radius){
  fishArr.forEach(f => {
    const d = Math.hypot(f.x - x, f.y - y);
    if(d < radius){
      f.fleeAngle = Math.atan2(f.y - y, f.x - x);
      f.angle = f.fleeAngle;
      f.fleeing = PANIC_SECONDS;
      f.calming = 0;
      f.panicSpeed = 4.5 + Math.random() * 1.3;
    }
  });
}

function lightShadowParams(x, y){
  const lightX = W * 0.32, lightY = H * 0.22;
  const dx = x - lightX, dy = y - lightY;
  const dist = Math.hypot(dx, dy);
  const maxDist = Math.hypot(W, H) * 0.6;
  const t = Math.min(1, dist / maxDist);
  return { ux: dist > 0.001 ? dx/dist : 0, uy: dist > 0.001 ? dy/dist : 1, t };
}