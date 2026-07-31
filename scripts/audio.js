const ambience = document.getElementById('ambience');
const ambience2 = document.getElementById('ambience2');
const sfxRipple = document.getElementById('sfxRipple');
const sfxSplash = [
  document.getElementById('sfxSplash1'),
  document.getElementById('sfxSplash2'),
  document.getElementById('sfxSplash3')
];

ambience.volume = 1.0;
ambience2.volume = 0.2;
sfxRipple.volume = 0.2;
sfxSplash.forEach(s => s.volume = 0.7);  

let muted = false;
let ambienceStarted = false;

function startAmbience(){
  if(ambienceStarted || muted) return;
  ambienceStarted = true;
  ambience.play().catch(() =>{ });
  ambience2.play().catch(() => {})
}

window.addEventListener('click', startAmbience);
window.addEventListener('keydown', startAmbience);

function playRippleSound(){
  if(muted) return;
  sfxRipple.currentTime = 0;
  sfxRipple.play().catch(()=>{});
}

function playFleeSound(){
  if(muted) return;
  const pick = sfxSplash[Math.floor(Math.random() * sfxSplash.length)];
  pick.currentTime = 0;
  pick.play().catch(()=>{});
}

const iconOn  = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;
const iconOff = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`;
function drawMuteIcon(){
  muteBtn.innerHTML = muted ? iconOff : iconOn;
}
drawMuteIcon();

muteBtn.addEventListener('click', () => {
  muted = !muted;
  if(muted){
    ambience.pause();
    drawMuteIcon();
  } else {
    if(ambienceStarted) ambience.play().catch(()=>{});
    drawMuteIcon();
  }
});