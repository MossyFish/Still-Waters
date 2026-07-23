let lastFrameTime = performance.now();
let dt = 1/60;

function loop(){
    const now = performance.now();
    dt = Math.min(0.05, (now - lastFrameTime)/1000);
    lastFrameTime = now;

    createContext.clearRect(0, 0, W, H);
    drawWater();
    drawRipples();
    screenCtx.clearRect(0, 0, W, H);
    screenCtx.drawImage(Buffer,0,0);

    fishArr.forEach(f => {
        f.update();
        f.draw(screenCtx);
    })

    lilyPads.forEach(p => { p.update(); p.draw(screenCtx); });
    leaves.forEach(l => { l.update(); l.draw(screenCtx); });
    companion.update();

    if(overlayCtx) {
        overlayCtx.clearRect(0, 0, W, H); 
        companion.draw(overlayCtx); 
    }

    else companion.draw(screenCtx);
    requestAnimationFrame(loop);
}
loop();