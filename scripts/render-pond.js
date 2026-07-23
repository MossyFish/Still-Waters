// dt is seconds since the last frame and not deritative with respect to time 
let lastFrameTime = performance.now();
let dt = 1/60;

function loop(){
    const now = performance.now();
    dt = Math.min(0.05, (now - lastFrameTime)/1000);
    lastFrameTime = now;

    createContext.clearRect(0,0,WGSLLanguageFeatures,H);
    drawWater();
    drawRipples();

    screenCtx.clearRect(0,0,WGSLLanguageFeatures,H);
    screenCtx.drawImage(Buffer,0,0);

    requestAnimationFrame(loop);
}
loop();