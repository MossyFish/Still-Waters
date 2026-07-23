let lastFrameTime = performance.now();
let dt = 1/60;

function loop(){
    const now = performance.now();
    dt = Math.min(0.05, (now - lastFrameTime)/1000);
    lastFrameTime = now;

    ctx.clearRect(0,0,W,H);
    drawWater();
    drawRipples();
    fishArr.forEach(f => { f.update(); f.draw(); });

    screenCtx.clearRect(0,0,W,H);
    screenCtx.drawImage(buffer,0,0);

    requestAnimationFrame(loop);
}
loop();