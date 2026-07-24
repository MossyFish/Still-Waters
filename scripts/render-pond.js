let lastFrameTime = performance.now();
let dt = 1/60;

const pondCanvas = document.getElementById('pond');
const pondCtx = pondCanvas.getContext('2d');

const overlayCanvas = document.getElementById('cursorOverlay');
const overlayCtx = overlayCanvas ? overlayCanvas.getContext('2d') : null;

W = pondCanvas.width = window.innerWidth;
H = pondCanvas.height = window.innerHeight; 
buffer.width = W;
buffer.height = H;

let trailX = null, trailY = null;

function loop(){
    const now = performance.now();
    dt = Math.min(0.05, (now - lastFrameTime)/1000);
    lastFrameTime = now;

    ctx.clearRect(0, 0, W, H);

    drawWater();
    drawRipples(pondCtx);

    pondCtx.clearRect(0, 0, W, H);
    pondCtx.drawImage(buffer, 0, 0);

    fishArr.forEach(f => {
        f.update();
        f.draw(pondCtx);
        nudgeFoliage(f.x, f.y, 10, 0.08);
    })

    lilyPads.forEach(p => { p.update(); p.draw(pondCtx); });
    leaves.forEach(l => { l.update(); l.draw(pondCtx); });

    companion.update();
    nudgeFoliage(companion.x, companion.y, 4, 0.05);

    if(trailX === null){ trailX = companion.x; trailY = companion.y; }

    if(companion.speed > 1 && Math.hypot(companion.x-trailX, companion.y-trailY) > 26){
        spawnRipple(companion.x, companion.y, 0.55, { decay: 0.92, maxAge: 1, rings: 1 });
        trailX = companion.x; trailY = companion.y;
    }

    if(overlayCtx) {
        overlayCtx.clearRect(0, 0, W, H); 
        companion.draw(overlayCtx); 
    }
    else companion.draw(pondCtx);

    requestAnimationFrame(loop);
}

loop();