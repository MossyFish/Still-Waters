const PAD_PALETTES = [
    ['#60ac72','#2d7348','#18422a'],
    ['#7ec46e','#409442','#1e5624'],
    ['#46968c','#226860','#103836'],
    ['#96ba54','#5c8432','#2c4816'],
    ['#3a8066','#1a5242','#0c2c26'],
    ['#70b096','#348c62','#164036'],
    ['#8cc45a','#4f8a30','#254a16'],
    ['#a0be6c','#6a9040','#33501e']
];

const LEAF_GREENS = ['#4f9a5c','#6bb36f','#3f7a52','#7fb35a','#356b48','#5aa76a','#8cc26a','#2f6b46'];

const PAD_MAJORITY_PALETTES = PAD_PALETTES.filter(p => {
    const mid = p[1], dark = p[2];
    return (parseInt(mid.slice(1),16) + parseInt(dark.slice(1),16)) / 2 > 0x414141;
});

// Jittered grid for cluster centers
const padCluster = []; (() => {
    const cols = 3, rows = 3;
    const cellW = W / cols, cellH = H / rows;
    for (let cy = 0; cy < rows; cy++) {
        for (let cx = 0; cx < cols; cx++) {
            if (Math.random() < 0.85) {
                padCluster.push({
                    x: cx * cellW + cellW * (0.2 + Math.random() * 0.6),
                    y: cy * cellH + cellH * (0.2 + Math.random() * 0.6)
                });
            }
        }
    }
})();

function whereCluster(spread) {
    if (Math.random() < 0.82 && padCluster.length) {
        const c = padCluster[Math.floor(Math.random() * padCluster.length)];
        const gx = (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
        const gy = (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
        return { x: c.x + gx * spread, y: c.y + gy * spread };
    }
    return { x: Math.random() * W, y: Math.random() * H };
}

// foliage at edges
const EXCLUDE = 36;
function getExclusionRect () {
    const els = ['#intro .title', '#intro .sub', '#intro .enter-hint']
        .map(sel => document.querySelector(sel))
        .filter(Boolean);
    
    if (!els.length) return null;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    
    els.forEach(el => {
        const r = el.getBoundingClientRect();
        x0 = Math.min(x0, r.left);
        y0 = Math.min(y0, r.top);
        x1 = Math.max(x1, r.right);
        y1 = Math.max(y1, r.bottom);
    });
    
    return { x0: x0 - EXCLUDE, y0: y0 - EXCLUDE, x1: x1 + EXCLUDE, y1: y1 + EXCLUDE };
}

let introExclusionRect = getExclusionRect();
window.addEventListener('resize', () => { introExclusionRect = getExclusionRect(); });

function isExcluded(x, y, r, rect) {
    if (!rect) return false;
    return x + r > rect.x0 && x - r < rect.x1 && y + r > rect.y0 && y - r < rect.y1;
}

// tracker so they don't overlap too much 
const placedFoliage = [];
const OVERLAP = 0.3;
const TRIES = 40;

function findSpot(spread, r) {
    let best = null, bestFrac = Infinity;
    let attempts = 0, validAttempts = 0;
    const maxAttempts = TRIES * 3;

    while (validAttempts < TRIES && attempts < maxAttempts) {
        attempts++;
        const p = whereCluster(spread);
        if (isExcluded(p.x, p.y, r, introExclusionRect)) continue;
        validAttempts++;

        let worstFrac = 0;
        // overlap check
        for (const other of placedFoliage) {
            const d = Math.hypot(p.x - other.x, p.y - other.y);
            const minR = Math.min(r, other.r);
            if (d >= r + other.r) continue;
            if (d <= Math.abs(r - other.r)) {
                worstFrac = 1;
                break;
            }
            const depth = (r + other.r - d) / 2;
            const frac = Math.min(1, depth / minR);
            
            if (frac > worstFrac) worstFrac = frac;
        }

        if (worstFrac <= OVERLAP) return p;
        if (worstFrac < bestFrac) {
            bestFrac = worstFrac;
            best = p;
        }
    }

    if (best) return best;

    // Fallback random spots if everything is jammed
    for (let i = 0; i < 30; i++) {
        const p = { x: Math.random() * W, y: Math.random() * H };
        if (!isExcluded(p.x, p.y, r, introExclusionRect)) return p;
    }
    return { x: Math.random() * W, y: Math.random() * H };
}

function lerpHex(hexA, hexB, t) {
    const a = parseInt(hexA.slice(1), 16), b = parseInt(hexB.slice(1), 16);
    const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
    const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
    const r = Math.round(ar + (br - ar) * t);
    const g = Math.round(ag + (bg - ag) * t);
    const bl = Math.round(ab + (bb - ab) * t);
    return '#' + [r, g, bl].map(v => v.toString(16).padStart(2, '0')).join('');
}

function angularDistance(a, ref) {
    let d = (a - ref) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return Math.abs(d);
}

function makePadOutline(baseR, notchWidth, notchDepth, irregularity, seedA, seedB, samples = 48) {
    const pts = [];
    for (let i = 0; i < samples; i++) {
        const a = (i / samples) * Math.PI * 2;
        const notchFactor = Math.max(0, 1 - angularDistance(a, 0) / notchWidth);
        const wobble = 1 + irregularity * (Math.sin(a * 3 + seedA) * 0.5 + Math.sin(a * 5 + seedB) * 0.3);
        const r = baseR * wobble * (1 - notchDepth * Math.pow(notchFactor, 1.4));
        pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    return pts;
}

class LilyPad {
    constructor(){
        this.r = 16 + Math.random()*18;
        const p = findSpot(85, this.r);
        this.x = p.x; this.y = p.y;
        this.placedEntry = {x:this.x, y:this.y, r:this.r};
        placedFoliage.push(this.placedEntry);
        this.rot = Math.random()*Math.PI*2;
        this.driftT = Math.random()*1000;

        this.offX = 0; this.offY = 0; this.velX = 0; this.velY = 0;
        this.palette = PAD_MAJORITY_PALETTES[Math.floor(Math.random()*PAD_MAJORITY_PALETTES.length)];
        
        // shape 
        this.notchWidth = 0.35 + Math.random()*0.55;
        this.notchDepth = 0.55 + Math.random()*0.4;
        this.irregularity = 0.05 + Math.random()*0.08;
        this.outlinePts = makePadOutline(this.r, this.notchWidth, this.notchDepth, this.irregularity, Math.random()*10, Math.random()*10);
        const [c0,c1,c2] = this.palette;

        // color 
        this.bodyColor = lerpHex(c1, c2, Math.random()*0.75);
        this.edgeColor = lerpHex(this.bodyColor, c2, 0.3+Math.random()*0.7);
        this.veinColor = lerpHex(c1, c0, 0.5+Math.random()*0.4);
        this.centerLight = lerpHex(c0, '#d1ffdb', 0.1+Math.random()*0.2);
        this.sparkleR = 0.04 + Math.random() * 0.065;
        this.sparkleAlpha = 0.8 + Math.random() * 0.95;
        let altPalette;
        do { altPalette = PAD_PALETTES[Math.floor(Math.random()*PAD_PALETTES.length)]; }

        while(altPalette === this.palette);
        const altTone = altPalette[Math.floor(Math.random()*altPalette.length)];
        this.mixColor = lerpHex(altTone, this.bodyColor, 0.05+Math.random()*0.15);
        this.mixAngle = Math.random()*Math.PI*2;
        this.mixShare = 0.3 + Math.random()*0.1;
        this.mixBlobTemplate = makeBlobTemplate(7, 0.45);

        // 30 to 70% veis
        const veinCount = 1 + Math.floor(Math.random() * 4);
        this.veins = [];
        for(let i = 0; i < veinCount; i++) {
            let angle;
            let tries = 0;
            do {
                angle = Math.random()*Math.PI*2;
                tries++;
            }
            while(angularDistance(angle, 0) < this.notchWidth*1.3 && tries < 30);
            this.veins.push({
                angle,
                len: this.r*(0.3 + Math.random()*0.4),
                width: this.r*(0.05 + Math.random()*0.07),
                alpha: 0.18 + Math.random()*0.22
            });
        }

        const rimRoll = Math.random();
        this.rimStyle = rimRoll < 0.3 ? 'full' : rimRoll < 0.7 ? 'partial' : 'none';
        this.rimAlpha = 0.18 + Math.random()*0.24;
        this.rimArcStart = Math.random()*Math.PI*2;
        this.rimArcSpan = 0.7 + Math.random()*1.7;

        this.hasEdgeHighlight = Math.random() < 0.50;

        if (this.hasEdgeHighlight) {
            this.edgeHighlightStart = Math.random() * Math.PI * 2;
            this.edgeHighlightSpan = (0.12 + Math.random()*0.20)*Math.PI*2;
        }
        this.buildSprite();  
    }  
    buildSprite(){
        const half = Math.ceil(this.r*2.4);
        const size = half*2;

        const sc = document.createElement('canvas');
        sc.width = sc.height = size;
        const sctx = sc.getContext('2d');
        sctx.translate(half, half);

        const { ux, uy, t } = lightShadowParams(this.x, this.y);
        {
        const blurPx = Math.max(1.5, this.r*0.1);
        const shadowOffset = this.r*(0.2 + t*0.6);
        sctx.save();
        sctx.translate(ux*shadowOffset, uy*shadowOffset);
        sctx.rotate(this.rot);
        sctx.filter = `blur(${blurPx.toFixed(1)}px)`; 
        blobPath(sctx, this.outlinePts);
        sctx.fillStyle = `rgba(0,8,14,${Math.max(0, 0.16 - t*0.07).toFixed(3)})`;
        sctx.fill();
        sctx.restore();
        }

        sctx.rotate(this.rot);

        sctx.save();
        blobPath(sctx, this.outlinePts);
        sctx.clip();

        blobPath(sctx, this.outlinePts);
        const padGrad = sctx.createRadialGradient(0,0,0, 0,0,this.r);
        padGrad.addColorStop(0, hexToRgba(this.bodyColor,1));
        padGrad.addColorStop(1, hexToRgba(this.edgeColor,1));
        sctx.fillStyle = padGrad;
        sctx.fill();

        // wavy edge patch of a second palette
        {
            const centerDist = this.r*(0.85 - this.mixShare*0.8);
            const bx = Math.cos(this.mixAngle)*centerDist, by = Math.sin(this.mixAngle)*centerDist;
            const blobR = this.r*(0.55 + this.mixShare*1.0);
            const pts = blobPointsFromTemplate(bx, by, blobR, this.mixBlobTemplate);
            blobPath(sctx, pts);
            const mixGrad = sctx.createRadialGradient(bx,by,0, bx,by,blobR*0.85);
            mixGrad.addColorStop(0, hexToRgba(this.mixColor, 0.85));
            mixGrad.addColorStop(0.55, hexToRgba(this.mixColor, 0.5));
            mixGrad.addColorStop(1, hexToRgba(this.mixColor, 0));
            sctx.fillStyle = mixGrad;
            sctx.fill();
        }

        // vein blurring on pad
        sctx.save(); 
        sctx.filter = `blur(${Math.max(0.6, this.r*0.045).toFixed(1)}px)`;
        sctx.lineCap = 'round';
        this.veins.forEach(v => {
            sctx.strokeStyle = hexToRgba(this.veinColor, v.alpha) 
            sctx.lineWidth = v.width;
            sctx.beginPath();
            sctx.moveTo(0,0);
            sctx.lineTo(Math.cos(v.angle)*v.len, Math.sin(v.angle)*v.len);
            sctx.stroke();
        })
        sctx.restore();
        // center and white dot 
        sctx.save();
        sctx.filter = `blur(${Math.max(0.8, this.r*0.06).toFixed(1)}px)`;
        sctx.beginPath();
        sctx.arc(0,0, this.r*0.15, 0, Math.PI*2);
        sctx.fillStyle = hexToRgba(this.centerLight, 0.95);
        sctx.fill();

        sctx.beginPath();
        sctx.arc(0,0, this.r*this.sparkleR, 0, Math.PI*2);
        sctx.fillStyle = `rgba(255,255,255,${this.sparkleAlpha.toFixed(2)})`;
        sctx.fill();

        sctx.restore();
        sctx.restore();

        if(this.hasEdgeHighlight) {
            const pts = this.outlinePts;
            const n = pts.length;
            const outset = 1.1;
            const startIdx = Math.round((this.edgeHighlightStart/(Math.PI*2))*n);
            const spanCount = Math.max(2, Math.round((this.edgeHighlightSpan/(Math.PI*2))*n));
            sctx.lineCap = 'round';
            for(let i=0;i<spanCount;i++){
                const p0 = pts[(startIdx+i)%n], p1 = pts[(startIdx + i + 1)%n];
                const tMid = (i + 0.5)/spanCount;
                const taper = Math.sin(Math.PI*tMid);
                if(taper <= 0.02) continue;
                const segAngle = ((startIdx + i + 0.5)/n) * Math.PI*2;
                const backness = angularDistance(segAngle, 0)/Math.PI;
                const thicknessScale = 0.065 + (0.095 - 0.065)*backness;
                sctx.strokeStyle = `rgba(255,255,255,${(0.6*taper).toFixed(3)})`;
                sctx.lineWidth = this.r * thicknessScale*(0.3 + 0.7*taper);
                sctx.beginPath();
                sctx.moveTo(p0[0]*outset, p0[1]*outset);
                sctx.lineTo(p1[0]*outset, p1[1]*outset);
                sctx.stroke();
            }
        }

        if (this.rimStyle !== 'none') {
            sctx.save();
            if(this.rimStyle === 'partial') {
                sctx.beginPath();
                sctx.moveTo(0, 0);
                sctx.arc(0, 0, this.r*0.5, this.rimArcStart, this.rimArcStart + this.rimArcSpan);
                sctx.closePath();
                sctx.clip();
            }
            blobPath(sctx, this.outlinePts);
            const rimGrad = sctx.createRadialGradient(0,0,this.r*0.45, 0,0,this.r);
            rimGrad.addColorStop(0, 'rgba(0,0,0,0)');
            rimGrad.addColorStop(0.75, `rgba(0,0,0,${(this.rimAlpha*0.55).toFixed(3)})`);
            rimGrad.addColorStop(1, `rgba(0,0,0,${this.rimAlpha})`);
            sctx.fillStyle = rimGrad;
            sctx.fill();
            sctx.restore();
        }
        this.sprite = sc;
        this.spriteHalf = half;
    }
    update(){
        const step = dt*60;
        this.driftT += 0.003*step;
        this.velX *= Math.pow(0.88, step);
        this.velY *= Math.pow(0.88, step);
        this.offX += this.velX*step;
        this.offY += this.velY*step;
    } 
    draw(ctx) {
        const dx = Math.sin(this.driftT)*3 + this.offX;
        const dy = Math.cos(this.driftT*0.8)*2 + this.offY;
        ctx.drawImage(this.sprite, this.x + dx - this.spriteHalf, this.y + dy - this.spriteHalf);
    }
}

class Leaf{
    constructor(){
        this.len = 15 + Math.random()*17;
        const r = this.len*0.5;
        const p = findSpot(70, r);
        this.x = p.x; this.y = p.y;
        this.placedEntry = {x:this.x, y:this.y, r};
        placedFoliage.push(this.placedEntry);
        this.rot = Math.random()*Math.PI*2;
        this.driftT = Math.random()*1000;
        this.offX = 0; this.offY = 0; this.velX = 0; this.velY = 0;
        this.color = LEAF_GREENS[Math.floor(Math.random()*LEAF_GREENS.length)];
        this.shadowDir = lightShadowParams(this.x, this.y);
        this.buildShadowSprite();
    }

    buildShadowSprite(){
    const blurPx = Math.max(1, this.len*0.08);
    const halfW = this.len*0.6 + blurPx*2.5;
    const halfH = this.len*0.4 + blurPx*2.5;
    const sc = document.createElement('canvas');
    sc.width = Math.ceil(halfW*2*SPRITE_SCALE);
    sc.height = Math.ceil(halfH*2*SPRITE_SCALE);
    const sctx = sc.getContext('2d');
    sctx.scale(SPRITE_SCALE, SPRITE_SCALE);
    sctx.translate(halfW, halfH);
    sctx.filter = `blur(${blurPx.toFixed(1)}px)`;
    sctx.beginPath();
    sctx.moveTo(this.len*0.6,0);
    sctx.quadraticCurveTo(0,-this.len*0.4,-this.len*0.6,0);
    sctx.quadraticCurveTo(0,this.len*0.4,this.len*0.6,0);
    sctx.closePath();
    sctx.fillStyle = '#000';
    sctx.fill();
    this.shadowSprite = sc;
    this.shadowOriginX = halfW;
    this.shadowOriginY = halfH;
    this.shadowSpriteW = halfW*2;
    this.shadowSpriteH = halfH*2;
    }
    update(){
        const step = dt*60;
        this.driftT += 0.004*step;
        this.velX *= Math.pow(0.88, step); 
        this.velY *= Math.pow(0.88, step);
        this.offX += this.velX*step;
        this.offY += this.velY*step;
    }
    draw(ctx){
        const dx = Math.sin(this.driftT)*3 + this.offX, dy = Math.cos(this.driftT*0.7)*2 + this.offY;
        const { ux, uy, t } = this.shadowDir;
        const shadowOffset = this.len*(0.16 + t*0.4);
        ctx.save();
        ctx.translate(this.x+dx+ux*shadowOffset, this.y+dy+uy*shadowOffset);
        ctx.rotate(this.rot + Math.sin(this.driftT)*0.15);
        ctx.globalAlpha = Math.max(0, 0.15 - t*0.06);
        ctx.drawImage(this.shadowSprite, -this.shadowOriginX, -this.shadowOriginY, this.shadowSpriteW, this.shadowSpriteH);
        ctx.globalAlpha = 1;
        ctx.restore();
        ctx.save();
        ctx.translate(this.x + dx, this.y + dy);
        ctx.rotate(this.rot + Math.sin(this.driftT)*0.15);
        ctx.beginPath();
        ctx.moveTo(this.len*0.6,0);
        ctx.quadraticCurveTo(0, -this.len*0.4, -this.len*0.6, 0);
        ctx.quadraticCurveTo(0, this.len*0.4, this.len*0.6, 0); 
        ctx.closePath();
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.92; 
        ctx.fill();
        ctx.globalAlpha = 1;
        
        ctx.strokeStyle = 'rgba(14,50,26,0.4)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(this.len*0.55, 0);
        ctx.lineTo(-this.len*0.55, 0);
        ctx.stroke();
        ctx.restore();
    }                     
}

function foliagePop() {
  const target = Math.max(6, Math.round(W * H * 24 / (1920 * 1080)));

  while (lilyPads.length < target) lilyPads.push(new LilyPad());
  while (lilyPads.length > target) {
    const removed = lilyPads.pop();
    const idx = placedFoliage.indexOf(removed.placedEntry);
    if (idx !== -1) placedFoliage.splice(idx, 1);
  }

  while (leaves.length < target) leaves.push(new Leaf());
  while (leaves.length > target) {
    const removed = leaves.pop();
    const idx = placedFoliage.indexOf(removed.placedEntry);
    if (idx !== -1) placedFoliage.splice(idx, 1);
  }
}

const lilyPads = [];
const leaves = [];
foliagePop();
window.addEventListener('resize', foliagePop);

function nudgeFoliage(x, y, radius, strength){
  [...lilyPads, ...leaves].forEach(item => {
    const ddx = item.x-x, ddy = item.y - y;
    const d = Math.hypot(ddx, ddy);
    if(d < radius){
      const falloff = 1 - d/radius;
      const ux = ddx/(d || 1), uy = ddy/(d || 1);
      item.velX += ux*strength*falloff;
      item.velY += uy*strength*falloff;
    }
  }); 
}
