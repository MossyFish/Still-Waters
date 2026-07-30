const intro = document.getElementById('intro');
const content = document.getElementById('content');
const swirl = document.getElementById('swirl');
const backBtn = document.getElementById('backBtn');
const turb = document.getElementById('turb');
const displacement = document.querySelector('#swirl svg defs filter feDisplacementMap');
let inContent = false;

const TRANSITION_MS = 1400;
const WARP_PEAK = 20;

const CROSSFADE_WIDTH = 0.35;
const FADE_OUT_END = 0.5 + CROSSFADE_WIDTH / 2;
const FADE_IN_START = 0.5 - CROSSFADE_WIDTH / 2;

turb.setAttribute('baseFrequency', '0.019');

function applyWarp(s){
  displacement.setAttribute('scale', s);
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function warpTransition(outEl, inEl, onSwap) {
  swirl.classList.add('active');
  outEl.classList.add('warping');
  const start = performance.now();
  let swapped = false; 

  function tick(now) {
    const progress = Math.min(1, (now - start) / TRANSITION_MS);
    const half = progress <= 0.5 ? progress / 0.5 : (progress - 0.5) / 0.5;
    const s = WARP_PEAK * Math.sin(Math.PI * progress);
    applyWarp(s);

    outEl.style.opacity = clamp01(1 - progress / FADE_OUT_END);

    if(!swapped  && progress >= 0.5) {
      swapped = true;
      if (outEl !== content) outEl.style.display = 'none';
      outEl.classList.remove('warping');
      if (inEl === intro) inEl.style.display = 'flex';
      else if (inEl !== content) inEl.style.display = 'block';
      void inEl.offsetWidth; 
      inEl.classList.add('warping');
      if(onSwap) onSwap();    
    }

    if (progress >= FADE_IN_START) {
      inEl.style.opacity = clamp01((progress - FADE_IN_START) / (1 - FADE_IN_START));
    }

    if(progress < 1){
      requestAnimationFrame(tick);
    } 
    else {
      applyWarp(0);
      inEl.classList.remove('warping');
      inEl.style.opacity = '';
      outEl.style.opacity = '';
      swirl.classList.remove('active');
    }
  }
  requestAnimationFrame(tick);
}

function enterContent(){
  if(inContent) return;
  inContent = true;
  warpTransition(intro, content, () => {
    content.classList.add('visible');
    backBtn.classList.add('visible');
    window.dispatchEvent(new Event('resize'));
  });
}

function exitToIntro(){
  if(!inContent) return;
  inContent = false;
  backBtn.classList.remove('visible');
  warpTransition(content, intro, () => {
    content.classList.remove('visible');
  });
}

window.addEventListener('load', () => {
  swirl.classList.add('active');
  applyWarp(0.01);
  content.classList.add('warping');
  intro.classList.add('warping');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      applyWarp(0);
      content.classList.remove('warping');
      intro.classList.remove('warping');
      swirl.classList.remove('active');
    });
  });
});

window.addEventListener('keydown', e => {
  if(e.key === 'Enter') enterContent();
  if(e.key === 'Escape'){
    if(window.hasOpenProject && window.hasOpenProject()){
      window.collapseOpenProject();
    } else {
      exitToIntro();
    }
  }
});

document.getElementById('enterBtn').addEventListener('click', enterContent);
backBtn.addEventListener('click', exitToIntro);