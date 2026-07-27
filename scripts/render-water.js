const canvas = document.getElementById('pond');
const screenCtx = canvas.getContext('2d');
const buffer = document.createElement('canvas');
const ctx = buffer.getContext('2d');

const overlayCanvas = document.getElementById('cursorOverlay');
const overlayCtx = overlayCanvas ? overlayCanvas.getContext('2d') : null;

const SPRITE_SCALE = 2;
const N_PHASES = 16;

let W, H;
function resize() {
  W = canvas.width = buffer.width = window.innerWidth;
  H = canvas.height = buffer.height = window.innerHeight;
  if (overlayCanvas) { overlayCanvas.width = W; overlayCanvas.height = H; }
}
resize();
window.addEventListener('resize', resize);

let mouse = { x: W/2, y: H/2, active: false };
window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true; });
window.addEventListener('mouseleave', () => mouse.active = false);

function hexToRgba(hex, alpha) {
  const v = parseInt(hex.slice(1), 16);
  return `rgba(${(v>>16)&255},${(v>>8)&255},${v&255},${alpha})`;
}

function makeBlobTemplate(lobes, irregularity) {
  return Array.from({length: lobes}, () => 1 - irregularity*0.5 + Math.random()*irregularity);
}
function blobPointsFromTemplate(cx, cy, baseR, template) {
  return template.map((r, i) => {
    const a = (i / template.length) * Math.PI * 2;
    return [cx + Math.cos(a)*baseR*r, cy + Math.sin(a)*baseR*r*0.82];
  });
}
function blobPath(ctx, pts) {
  ctx.beginPath();
  const start = [(pts[0][0]+pts[pts.length-1][0])/2, (pts[0][1]+pts[pts.length-1][1])/2];
  ctx.moveTo(start[0], start[1]);
  for (let i = 0; i < pts.length; i++) {
    const p0 = pts[i], p1 = pts[(i+1) % pts.length];
    ctx.quadraticCurveTo(p0[0], p0[1], (p0[0]+p1[0])/2, (p0[1]+p1[1])/2);
  }
  ctx.closePath();
}

// water frame cycling
const WATER   = [0,1,2,3,4,3,2,1];
const CAUSTICS = [0,1,2,3,4,5,6,5,4,3,2,1];

let waterPhase = 0;
let causticPhase = 0;
let driftT = 0;

function drawWaterFrames() {
  ctx.fillStyle = '#1a5a70';
  ctx.fillRect(0, 0, W, H);

  if (!assets?.water?.length) return;

  driftT += dt;

  const wZoom = 1.045 + Math.sin(driftT * 0.15) * 0.028;
  const wDx   = Math.sin(driftT * 0.13) * 30;
  const wDy   = Math.cos(driftT * 0.10) * 22;

  waterPhase += dt * 0.8;
  const wt = waterPhase % WATER.length;
  const wiA = WATER[Math.floor(wt) % WATER.length];
  const wiB = WATER[(Math.floor(wt)+1) % WATER.length];
  const wb = wt - Math.floor(wt);

  ctx.save();
  ctx.translate(W/2 + wDx, H/2 + wDy);
  ctx.scale(wZoom, wZoom);
  ctx.translate(-W/2, -H/2);
  ctx.drawImage(assets.water[wiA], 0, 0, W, H);

  if (wb > 0.001) {
    ctx.globalAlpha = wb;
    ctx.drawImage(assets.water[wiB], 0, 0, W, H);
    ctx.globalAlpha = 1;
  }

  ctx.restore();

  // caustics
  const cZoom = 1.1 + Math.sin(driftT * 0.22 + 1.7) * 0.05;
  const cDx   = Math.sin(driftT * 0.2 + 2.1) * 46;
  const cDy   = Math.cos(driftT * 0.17 + 0.6) * 34;
  const cRot = Math.sin(driftT * 0.08) * 0.035;

  causticPhase += dt * 0.6;
  const ct = causticPhase % CAUSTICS.length;
  const ciA = CAUSTICS[Math.floor(ct) % CAUSTICS.length];
  const ciB = CAUSTICS[(Math.floor(ct)+1) % CAUSTICS.length];
  const cb = ct - Math.floor(ct);

  ctx.save();
  ctx.translate(W/2 + cDx, H/2 + cDy);
  ctx.scale(cZoom, cZoom);
  ctx.translate(-W/2, -H/2);
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 1 * (1 - cb);
  ctx.drawImage(assets.caustics[ciA], 0, 0, W, H);
  ctx.globalAlpha = 1 * cb;
  ctx.drawImage(assets.caustics[ciB], 0, 0, W, H);
  ctx.restore();


  // second caustic layer
  const ct2 = (causticPhase * 1.4 + CAUSTICS.length * 0.5) % CAUSTICS.length;
  const ci2A = CAUSTICS[Math.floor(ct2) % CAUSTICS.length];
  const ci2B = CAUSTICS[(Math.floor(ct2)+1) % CAUSTICS.length];
  const cb2 = ct2 - Math.floor(ct2);

  const c2Zoom = 1.18 + Math.sin(driftT * 0.31 + 4.2) * 0.06;
  const c2Dx = -Math.sin(driftT * 0.25 + 0.9) * 40;
  const c2Dy = -Math.cos(driftT * 0.19 + 3.0) * 30;
  const c2Rot = -Math.sin(driftT * 0.11 + 1.2) * 0.045;

  ctx.save();
  ctx.translate(W/2 + c2Dx, H/2 + c2Dy);
  ctx.rotate(c2Rot);
  ctx.scale(c2Zoom, c2Zoom);
  ctx.translate(-W/2, -H/2);
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.55 * (1 - cb2);
  ctx.drawImage(assets.caustics[ci2A], 0, 0, W, H);
  ctx.globalAlpha = 0.55 * cb2;
  ctx.drawImage(assets.caustics[ci2B], 0, 0, W, H);
  ctx.restore();
}

// light shimmer idk if this has any impact ngl
const dapples = Array.from({length: 10}, () => ({
  x: Math.random()*2000, y: Math.random()*1200,
  r: 40 + Math.random()*80,
  phase: Math.random()*Math.PI*2,
  speed: 0.04 + Math.random()*0.06
}));

const sunspots = Array.from({length: 4}, () => ({
  x: Math.random()*2000, y: Math.random()*1200,
  r: 60 + Math.random()*110,
  phase: Math.random()*Math.PI*2,
  speed: 0.02 + Math.random()*0.04,
  intensity: 0.04 + Math.random()*0.14
}));

function drawAmbientLight() {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (const d of dapples) {
    d.phase += d.speed * 0.01 * (dt*60);
    const dx = d.x + Math.sin(d.phase)*18;
    const dy = d.y + Math.cos(d.phase*0.8)*12;
    const g = ctx.createRadialGradient(dx, dy, 0, dx, dy, d.r);
    g.addColorStop(0, 'rgba(205,230,250,0.09)');
    g.addColorStop(1, 'rgba(205,230,250,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(dx, dy, d.r, 0, Math.PI*2); ctx.fill();
  }
  for (const s of sunspots) {
    s.phase += s.speed * 0.01 * (dt*60);
    const sx = s.x + Math.sin(s.phase)*22;
    const sy = s.y + Math.cos(s.phase*0.7)*16;
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, s.r);
    g.addColorStop(0, `rgba(255,248,225,${s.intensity})`);
    g.addColorStop(1, 'rgba(255,248,225,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(sx, sy, s.r, 0, Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

function drawVignette() {
  const vg = ctx.createRadialGradient(W/2, H/2, H*0.3, W/2, H/2, H*0.85);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,6,14,0.35)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
}

function drawWater() {
  drawWaterFrames();
  //drawAmbientLight();
  drawVignette();
  drawRipples();
}

// ripples
let ripples = [];

function spawnRipple(x, y, strength = 0.6, opts = {}) {
  const {
    decay = 0.96, maxAge = Infinity, wobble = false,
    rings = null, alphaBoot = 1, widthBoost = 1,
    ringGap = 5/60, speedMul = 1
  } = opts;

  const ringCount = rings ?? 3 + Math.floor(Math.random()*3);
  const baseAngle = Math.random() * Math.PI * 2;

  for (let i = 0; i < ringCount; i++) {
    const alpha0 = (0.5 - i*0.1) * strength * alphaBoot;
    const maxR = (90 + i*24) * strength;
    const life = Math.max(0.15, Math.min(maxAge, Math.log(0.02/alpha0) / (60*Math.log(decay))));
    ripples.push({
      x, y, r: 2, age: 0, maxAge, decay,
      delay: i === 0 ? 0 : i*ringGap + Math.random()*(2/60),
      alpha: alpha0, maxR,
      speed: (maxR - 2) / (60*life) * speedMul,
      width: Math.max(0.9, 2.4 - i*0.4) * widthBoost,
      peakAngle: baseAngle + (Math.random()-0.5)*1.1,
      wobbleAmt: wobble ? 0.025 + Math.random()*0.035 : 0,
      wobbleSeedA: Math.random()*10, wobbleSeedB: Math.random()*10,
      wobbleFreqA: 2 + Math.floor(Math.random()*3),
      wobbleFreqB: 4 + Math.floor(Math.random()*3)
    });
    if (ripples.length > 150) ripples.splice(0, ripples.length - 150);
  }
}

canvas.addEventListener('click', e => {
  spawnRipple(e.clientX, e.clientY, 1.3, {
    wobble: true,
    rings: 2 + Math.floor(Math.random()*3),
    decay: 0.95, alphaBoot: 1.35, widthBoost: 1.45,
    ringGap: 0.28
  });

  nudgeFoliage(e.clientX, e.clientY, 110, 3.2);
  playRippleSound();
  const fishFled = fleeFrom(e.clientX, e.clientY, 90);
  if (fishFled) playFleeSound();
});

function rippleRadius(rp, angle) {
  if (rp.wobbleAmt <= 0) return rp.r;
  const n = Math.sin(angle*rp.wobbleFreqA + rp.wobbleSeedA)*0.6
          + Math.sin(angle*rp.wobbleFreqB + rp.wobbleSeedB)*0.4;
  return rp.r * (1 + rp.wobbleAmt*n);
}

function drawRipples() {
  const step = dt * 60;
  for (let i = ripples.length-1; i >= 0; i--) {
    const rp = ripples[i];
    rp.age += dt;
    if (rp.delay > 0) { rp.delay -= dt; continue; }
    rp.r += rp.speed * step;
    rp.alpha *= Math.pow(rp.decay, step);
    if (rp.alpha < 0.015 || (rp.maxAge !== Infinity && rp.age >= rp.maxAge)) {
      ripples.splice(i, 1); continue;
    }
    const segments = rp.wobbleAmt > 0 ? 40 : 18;
    ctx.save();
    for (let j = 0; j < segments; j++) {
      const a0 = (j/segments) * Math.PI*2;
      const a1 = ((j+1)/segments) * Math.PI*2;
      let diff = ((a0+a1)/2) - rp.peakAngle;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      const falloff = (Math.cos(diff)+1) / 2;
      const segAlpha = rp.alpha * (0.12 + falloff*0.95);
      if (segAlpha < 0.015) continue;
      ctx.strokeStyle = `rgba(220,238,248,${segAlpha})`;
      ctx.lineWidth = rp.width * (0.35 + falloff*1.1);
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, rippleRadius(rp, a0), a0, a1);
      ctx.stroke();
    }
    ctx.restore();
  }
}