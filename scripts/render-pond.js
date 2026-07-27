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
    for (let i = 1; i <= 5; i++)
        assets.water.push(await loadImage(`assets/Water/Water-${i}.png`));
    
    for (let i = 1; i <= 7; i++)
        assets.caustics.push(await loadImage(`assets/Caustics/Caustics-${i}.png`));
    
    for (let type = 1; type <= 6; type++) {
        assets.fish[type] = [];
        for (let f = 1; f <= 5; f++)
        assets.fish[type].push(await loadImage(`assets/Fish${type}/Fish${type}-${f}.png`));
    }

    for (let s = 1; s <= 4; s++) {
        assets.shadows[s] = [];
        for (let f = 1; f <= 5; f++)
        assets.shadows[s].push(await loadImage(`assets/Fish${s}/Fish${s}Shadow-${f}.png`));
    }
    assets.shadows[5] = [];
    for (let f = 1; f <= 5; f++)
        assets.shadows[5].push(await loadImage(`assets/Fish6/Fish6Shadow-${f}.png`));

    console.log('Assets loaded');
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

    for (const f of fishArr) {
        f.update();
        f.draw(screenCtx);
        nudgeFoliage(f.x, f.y, Math.max(18, f.len * 0.55), 0.08);
    };

    lilyPads.forEach(p => { p.update(); p.draw(screenCtx); });
    leaves.forEach(l => { l.update(); l.draw(screenCtx); });

    cursorFish.update();
    nudgeFoliage(cursorFish.x, cursorFish.y, 4, 0.05);

    if (trailX === null) { trailX = cursorFish.x; trailY = cursorFish.y; }
    
    if (cursorFish.speed > 1 && Math.hypot(cursorFish.x-trailX, cursorFish.y-trailY) > 26) {
        spawnRipple(cursorFish.x, cursorFish.y, 0.55, { decay:0.92, maxAge:1, rings:1 });
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