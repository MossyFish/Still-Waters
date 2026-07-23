/* Pond simulation */
const canvas = document.getElementById('pond');
const screenCtx = canvas.getContext('2d');
const buffer = document.createElement('canvas');
const ctx = buffer.getContext('2d');

// cursor koi renders above the content panel 
const overlayCanvas = document.getElementById('cursorOverlay');
const overlayCtx = overlayCanvas ? overlayCanvas.getContext('2d') : null;

const SOFT_BLUR = 'blur(0.8px)';
const SPRITE_SCALE = 2;
const N_PHASES = 16;

const FX_SCALE = 0.25;
const waterFxCanvas = document.createElement('canvas');
const waterFxCtx = waterFxCanvas.getContext('2d'); 

// super low res so upscaling gives a blurry web 
const CAUSTIC_SCALE = 0.12;
const causticCanvas = document.createElement('canvas');
const causticCtx = causticCanvas.getContext('2d');

function hexToRgba(hex, a){
  const v = parseInt(hex.slice(1),16); 
  return `rgba(${(v>>16)&255},${(v>>8)&255},${v&255},${a})`;
}

function randRange(a,b){ return a + Math.random()*(b-a); }

let W, H;
function resize(){ 
    W = canvas.width = buffer.width = window.innerWidth;
    H = canvas.height = buffer.height = window.innerHeight;
      if(overlayCanvas){ overlayCanvas.width = W; overlayCanvas.height = H; }

  waterFxCanvas.width = Math.max(1, Math.round(W*FX_SCALE));
  waterFxCanvas.height = Math.max(1, Math.round(H*FX_SCALE));
  causticCanvas.width = Math.max(1, Math.round(W*CAUSTIC_SCALE));
  causticCanvas.height = Math.max(1, Math.round(H*CAUSTIC_SCALE));
  
resize();
window.addEventListener('resize', resize);

let mouse = { x: W/2, y: H/2, active:false }};
window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true; });
window.addEventListener('mouseleave', () => mouse.active = false);

/* RIPPLES */
let ripples = [];
let trailX = null, trailY = null;

// Water bg 
function drawWater(){
    const t = Date.now()*0.0002;
    const grad = ctx.createLinearGradient(0,0,0,H);

    grad.addColorStop(0,'#1f5c53');
    grad.addColorStop(1,'#0f3531');
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,W,H);

    // light bands
    ctx.globalAlpha = 0.06;
    for(let i=0;i<5;i++){
        ctx.beginPath();
        const y = (H/5)*i + Math.sin(t + i)*20;
        ctx.strokeStyle = '#dff2ea';
        ctx.lineWidth = 30;
        ctx.moveTo(0,y);
        ctx.bezierCurveTo(W*0.3, y+40, W*0.7, y-40, W, y);
        ctx.stroke();                                 
        ctx.globalAlpha = 1;
    }
}

const WATER_HUES = [
  '92,196,168','58,150,148','70,132,186','122,178,110','40,100,140',
  '34,140,120','86,176,196', '48,90,150','108,150,86','54,60,120'
];

function makeBlobTemplate(lobes, irregularity){
    const t = [];
    for(let i=0;i<lobes;i++) {
        t.push(1 - irregularity*0.5 + Math.random()*irregularity);
    }
    return t;
}

function blobPointsFromTemplate(cx, cy, baseR, template){
    const lobes = template.length;
    const pts = [];
    for(let i=0;i<lobes;i++){
        const a = (i/lobes)*Math.PI*2;
        const r = baseR*template[i];
        pts.push([cx+Math.cos(a)*r, cy+Math.sin(a)*r*0.82]);
    return pts;
    }
}

function blobPath(ctx, pts){
    ctx.beginPath();
    const mid0 = [(pts[0][0]+pts[pts.length-1][0])/2, (pts[0][1]+pts[pts.length-1][1])/2];
    ctx.moveTo(mid0[0], mid0[1]);
    for(let i=0;i<pts.length;i++){
        const p0 = pts[i], p1 = pts[(i+1)%pts.length];
        ctx.quadraticCurveTo(p0[0], p0[1], (p0[0]+p1[0])/2, (p0[1]+p1[1])/2);
    }
    ctx.closePath();
}

function fillBlobFlat(ctx, pts, color, alpha=1){
    blobPath(ctx, pts);
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.fill();
    ctx.globalAlpha = 1;
}
 
 // soft edge version to blend the water color patches
 function fillBlobSoft(ctx, pts, cx, cy, outerR, rgb, alpha){
    blobPath(ctx, pts);
    const g = ctx.createRadialGradient(cx,cy,0, cx,cy,outerR);
    g.addColorStop(0, `rgba(${rgb}),${alpha}`)``;
    g.addColorStop(0.65, `rgba(${rgb}),${alpha*0.55}`)``;
    g.addColorStop(1, `rgba(${rgb}),0`);
    ctx.fillStyle = g;
    ctx.fill();
}

// Water 
const dapples = [];
for(let i=0;i<14;i++){
    dapples.push({
        x:Math.random()*W, y:Math.random()*H,
        r: 40+Math.random()*90,
        phase: Math.random()*Math.PI*2,
        speed: 0.05 + Math.random()*0.08
    });
}

const sunspots = [];
for(let i=0;i<5;i++){
    sunspots.push({
        x:Math.random()*W, y:Math.random()*H,
        r: 60+Math.random()*130,
        phase: Math.random()*Math.PI*2,
        speed: 0.03 + Math.random()*0.05,
        intensity: 0.06 + Math.random()*0.24
    })
}                          

const colorBlots = [];
for(let i=0;i<55;i++){
    const lobes = 6+Math.floor(Math.random()*3);
    colorBlots.push({
        x:Math.random()*W, y:Math.random()*H,
        r: 40+Math.random()*95,
        color: WATER_HUES[Math.floor(Math.random()*WATER_HUES.length)],
        alpha: 0.42+Math.random()*0.3,
        phase: Math.random()*Math.PI*2,
        speed: 0.015+Math.random()*0.025,
        template: makeBlobTemplate(lobes, 0.55);
    })
}

const noiseCanvas = document.createElement('canvas');
noiseCanvas.width = 180;
noiseCanvas.height = 180;
(function buildNoise(){
    const nctx = noiseCanvas.getContext('2d');
    const imgData = nctx.createImageData(180,180);
    for(let i=0;i<imgData.data.length;i+=4){
        const v = 205 + Math.random()*50;
        imgData.data[i] = v;
        imgData.data[i+1] = v;
        imgData.data[i+2] = v;
        imgData.data[i+3] = Math.random()*45;
    }
    nctx.putImageData(imgData,0,0);
})();
let noisePattern = null;
function getNoisePattern(){
    if(!noisePattern) noisePattern = ctx.createPattern(noiseCanvas,'repeat');
    return noisePattern;
}

// blob shapes
function drawWaterBlots(t){
    const fxW = waterFxCanvas.width, fxH = waterFxCanvas.height;
    waterFxCtx.clearRect(0,0,fxW,fxH);
    colorBlots.forEach(b=>{
    b.phase += b.speed*0.01*(dt*60);
    const bx = (b.x + Math.sin(b.phase)*14) * FX_SCALE;
    const by = (b.y + Math.cos(b.phase*0.75)*10) * FX_SCALE;
    const baseR = b.r*FX_SCALE;
    const pts = blobPointsFromTemplate(bx, by, baseR, b.template);
    fillBlobSoft(waterFxCtx, pts, bx, by, baseR, b.color, b.alpha);
    });

    ctx.save();
    ctx.drawImage(waterFxCanvas, 0, 0, W, H);
    ctx.restore();
}

/* definitions for opts     
decay: alpha multiplier applies at decay^(dt*60) each frame 
maxAge: sec cutoff on the cursor trail 
wobble: each ring's s radius varies with angle when true
rings: force a specific ring count
ringGap: seconds between successive rings appearing
*/

function spawnRipple(x,y,strength=0.6,opts={}) {
    const { decay = 0.96, maxAge = Infinity, wobble = false, rings = null, alphaBoot = 1, widthBoost = 1, ringGap = 5/60, speedMul = 1 }= opts;
    const ringCount = rings != null ? rings : 3 + Math.floor(Math.random()*3);
    const baseAngle = Math.random()*Math.PI*2;
    for(let i=0;i<ringCount;i++){
        const alpha0 = (0.5 - i*0.1)*strength*alphaBoost;
        const maxR = (90 + i*24)*strength;
        // growth speed from how long the ring actually stays visible
        const life = Math.max(0.15, Math.min(maxAge, Math.log(0.02/alpha0)/(60*Math.log(decay))));
        ripples.push({
            x, y, r:2,
            age: 0,
            maxAge,
            decay,
            delay: i === 0 ? 0 : i*ringGap + Math.random()*(2/60),
            alpha: alpha0, maxR,
            speed: (maxR-2)/(60*life)*speedMul,
            width: Math.max(0.9, 2.4 - i*0.4)*widthBoost,
            peakAngle: baseAngle + (Math.random()-0.5)*1.1,
            wobbleAmt: wobble ? 0.025 + Math.random()*0.035 : 0,
            wobbleSeedA: Math.random()*10,
            wobbleSeedB: Math.random()*10,
            wobbleFreqA: 2 + Math.floor(Math.random()*3),
            wobbleFreqB: 4 + Math.floor(Math.random()*3)
        });
        if (ripples.length > 150) ripples.splice(0, ripples.length - 150);
    }
    canvas.addEventListener('click', e => {
        // click ripple set should die
        spawnRipple(e.clientX, e.clientY, 1.3, { wobble: true, rings: 2 + Math.floor(Math.random()*3), decay: 0.9, alphaBoost: 1.35, widthBoost: 1.45, ringGap: 0.08, speedMul: 0.825 });
        fleeFrom(e.clientX, e.clientY, 90);
        nudgeFoliageNear(e.clientX, e.clientY, 110, 3.2);  
        
        function ripplePointRadius(rp, angle) {
              if(rp.wobbleAmt <= 0) return rp.r;
                const n = Math.sin(angle*rp.wobbleFreqA + rp.wobbleSeedA)*0.6 + Math.sin(angle*rp.wobbleFreqB + rp.wobbleSeedB)*0.4;
                  return rp.r * (1 + rp.wobbleAmt*n);  
        }
     
        function drawRipples(){
            const step = dt*60;
                ripples.forEach(rp => { 
                  rp.age += dt;
                      if(rp.delay > 0){ rp.delay -= dt; return;}
            })
        }

    rp.r += rp.speed*step;
    rp.alpha *= Math.pow(rp.decay, step);
    const segments = rp.wobbleAmt > 0 ? 40 : 18;
    for(let i=0;i<segments;i++){
        const a0 = (i/segments)*Math.PI*2;
        const a1 = ((i+1)/segments)*Math.PI*2;
        let diff = ((a0+a1)/2) - rp.peakAngle;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        const falloff = (Math.cos(diff)+1)/2;
        const segAlpha = rp.alpha * (0.12 + falloff*0.95);
        if(segAlpha < 0.015) continue;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(220,238,248,${segAlpha})`;
            ctx.lineWidth = rp.width * (0.35 + falloff*1.1);
        if(rp.wobbleAmt > 0){
            const r0 = ripplePointRadius(rp, a0), r1 = ripplePointRadius(rp, a1);
            ctx.moveTo(rp.x + Math.cos(a0)*r0, rp.y + Math.sin(a0)*r0);
        }
    }
})}