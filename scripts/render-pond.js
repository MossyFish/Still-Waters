const FRAME_DIR = 'assets/frames/';

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
    for(let i = 1; i <= 5; i++)
        assets.water.push(await loadImage(`${FRAME_DIR}/Water/Water-${i}.png`));

    for(let i = 1; i <= 7; i++)
        assets.caustics.push(await loadImage(`${FRAME_DIR}/Caustics/Caustics-${i}.png`));

    for(let num = 1; num <= 6; num++){
        assets.fish[num] = [];
            for(let f = 1; f <= 5; f++) assets.fish[num].push(await loadImage(`${FRAME_DIR}/Fish${num}/Fish${num}-${f}.png`));
    }

    for(let s = 1; s <= 4; s++) {
        const prefix = s <= 4 ? `Fish${s}Shadow` : 'Fish6Shadow';
        assets.shadows[s] = [];

        for(let f = 1; f <= 5; f++)
        assets.shadows[s].push(await loadImage(`${FRAME_DIR}/Fish${prefix}/Fish${prefix}-${f}.png`));
    }

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

    fishArr.forEach(f => {
        f.update();
        f.draw(screenCtx);
        nudgeFoliage(f.x, f.y, 10, 0.08);
    });

    lilyPads.forEach(p => { p.update(); p.draw(screenCtx); });
    leaves.forEach(l => { l.update(); l.draw(screenCtx); });

    companion.update();
    nudgeFoliage(companion.x, companion.y, 4, 0.05);

    if (trailX === null) { trailX = companion.x; trailY = companion.y; }
    
    if (companion.speed > 1 && Math.hypot(companion.x-trailX, companion.y-trailY) > 26) {
        spawnRipple(companion.x, companion.y, 0.55, { decay:0.92, maxAge:1, rings:1 });
        trailX = companion.x; trailY = companion.y;
    }

    if (overlayCtx) {
        overlayCtx.clearRect(0, 0, W, H);
        companion.draw(overlayCtx);
    } 
    else {
        companion.draw(screenCtx);
    }

    requestAnimationFrame(loop);
}

async function start() {
  await loadAllAssets();
  requestAnimationFrame(loop);
}

start();