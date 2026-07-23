let lastFrameTime = performance.now();
let dt = 1/60;

function loop(){
    const now = performance.now();
    dt = Math.min(0.05, (now - lastFrameTime)/1000);
    lastFrameTime = now;

    ctv.clearRect(0, 0, W, H);
    drawWater();
    drawRipples();
    screenCtx.clearRect(0, 0, W, H);
    screenCtx.drawImage(Buffer,0,0);

    fishArr.forEach(f => {
        f.update();
        f.draw(screenCtx);
        nudgeFoliageNear(f.x, f.y, 10, 0.08);
    })

    lilyPads.forEach(p => { p.update(); p.draw(screenCtx); });
    leaves.forEach(l => { l.update(); l.draw(screenCtx); });
    companion.update();
    nudgeFoliageNear(f.x, f.y, 4, 0.05);
    if(trailX === null){ trailX = companion.x; trailY = companion.y; }
    if(companion.speed > 1 && Math.hypot(companion.x-trailX, companion.y-trailY) > 26){
        spawnRipple(companion.x, companion.y, 0.55, { decay: 0.92, maxAge: 1, rings: 1 });
        trailX = companion.x; trailY = companion.y;
    }
    
    if(overlayCtx) {
        overlayCtx.clearRect(0, 0, W, H); 
        companion.draw(overlayCtx); 
    }

    else companion.draw(screenCtx);
    requestAnimationFrame(loop);
}
loop();