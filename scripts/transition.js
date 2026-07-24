const intro = document.getElementById('intro');
const content = document.getElementById('content');
const swirl = document.getElementById('swirl');
const backBtn = document.getElementById('backBtn');
const turb = document.getElementById('turb');
const displacement = document.querySelector('#swirl svg defs filter feDisplacementMap');
let inContent = false;

const TRANSITION_MS = 1200;
const WARP_PEAK = 20;

turb.setAttribute('baseFrequency', '0.019');

function applyWarp(s){
    displacement.setAttribute('scale', s);
}

// rAF loop is a sine func on time passed 
function warpTransition(outEl, inEl, onSwap) {
    swirl.classList.add('active');
    outEl.classList.add('warping');
    const start = performance.now();
    let swapped = false; 

    function tick(now) {
        const progress = Math.min(1, (now - start) / TRANSITION_MS);
        const s = WARP_PEAK * Math.sin(Math.PI * progress);
        applyWarp(s);
        if(!swapped) {
            outEl.style.opacity = 1 - s / WARP_PEAK;
        }

        if(!swapped  && progress >= 0.5) {
            swapped = true;
            outEl.style.display = 'none';
            outEl.classList.remove('warping');
            if (inEl === intro) inEl.style.display = 'flex';
            else inEl.style.display = 'block';
            inEl.classList.add('warping');
        }
        if(swapped) {
            inEl.style.opacity = 1 - s / WARP_PEAK;
        }

        if(progress < 1){
            requestAnimationFrame(tick);
        } 
        else {
            applyWarp(0);
            inEl.classList.remove('warping');
            swirl.classList.remove('active');
        }
    }
    requestAnimationFrame(tick);
}

// from intro screen to content screen 
function enterContent(){
  if(inContent) return;
  inContent = true;
  warpTransition(intro, content, () => {
    content.classList.add('visible');
    backBtn.classList.add('visible');
    window.dispatchEvent(new Event('resize'));
  });
}

// from content screen to intro screen
function exitToIntro(){
  if(!inContent) return;
  inContent = false;
  backBtn.classList.remove('visible');
  warpTransition(content, intro, () => {
    content.classList.remove('visible');
  });
}

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