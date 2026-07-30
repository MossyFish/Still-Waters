const assets = {
    water:    [],
    caustics: [],
    fish:     {},
    shadows:  {},
};

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload  = () => resolve(img);
        img.onerror = () => { console.warn('Failed to load', src); resolve(null); };
        img.src = src;
    });
}
 
async function loadAssets() {
  const waterP = Promise.all(Array.from({length:5}, (_,i) => loadImage(`assets/Water/Water-${i+1}.webp`)));
  const causticsP = Promise.all(Array.from({length:7}, (_,i) => loadImage(`assets/Caustics/Caustics-${i+1}.webp`)));
 
  const fishTypes = [1,2,3,4,5,6];
  const fishP = Promise.all(fishTypes.map(type =>
    Promise.all(Array.from({length:5}, (_,f) => loadImage(`assets/Fish${type}/Fish${type}-${f+1}.png`)))
  ));
 
  const shadowSlots = [1,2,3,4,5];
  const shadowP = Promise.all(shadowSlots.map(s => {
    const prefix = s <= 4 ? `Fish${s}/Fish${s}Shadow` : 'Fish6/Fish6Shadow';
    return Promise.all(Array.from({length:5}, (_,f) => loadImage(`assets/${prefix}-${f+1}.png`)));
  }));
 
  const [water, caustics, fishResults, shadowResults] = await Promise.all([waterP, causticsP, fishP, shadowP]);
 
  assets.water = water;
  assets.caustics = caustics;
  fishTypes.forEach((type, i) => { assets.fish[type] = fishResults[i]; });
  shadowSlots.forEach((s, i)  => { assets.shadows[s] = shadowResults[i]; });
 
  console.log('assets loaded');
}

let lastFrameTime = performance.now();
let dt = 1/60;
let trailX = null, trailY = null;

function loop() {
    const now = performance.now();
    dt = Math.min(0.05, (now - lastFrameTime)/1000);
    lastFrameTime = now;

    ctx.clearRect(0, 0, W, H);
    drawWater();

    screenCtx.clearRect(0, 0, W, H);
    screenCtx.drawImage(buffer, 0, 0);

    minFish(); 

    for (const f of fishArr) {
        f.update();
        f.draw(screenCtx);
        nudgeFoliage(f.x, f.y, Math.max(18, f.len * 0.55), 0.15);
    };

    lilyPads.forEach(p => { p.update(); p.draw(screenCtx); });
    leaves.forEach(l => { l.update(); l.draw(screenCtx); });

    cursorFish.update();
    nudgeFoliage(cursorFish.x, cursorFish.y, 4, 0.15);

    if (trailX === null) { trailX = cursorFish.x; trailY = cursorFish.y; }
    
    if (cursorFish.speed > 1 && Math.hypot(cursorFish.x-trailX, cursorFish.y-trailY) > 26) {
        spawnRipple(cursorFish.x, cursorFish.y, 0.85, { decay:0.94, maxAge:1.2, rings:1 });
        trailX = cursorFish.x; trailY = cursorFish.y;
    }
    
    if (overlayCtx) {
        overlayCtx.clearRect(0, 0, W, H);
        cursorFish.draw(overlayCtx);
    } 
    else {
        cursorFish.draw(screenCtx);
    }
    
    requestAnimationFrame(loop);
}

async function start() {
  await loadAssets();
  requestAnimationFrame(loop);
}

start();