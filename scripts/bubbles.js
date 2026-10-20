const bubblePond = document.getElementById('bubblePond');
const popSoundEl = document.getElementById('sfxPop');

const LAP_SECONDS = 13;
const BUBBLE_COUNT = 3;
const POP_AT_PROGRESS = 0.85;
const POP_LIFE_MS = POP_AT_PROGRESS * LAP_SECONDS * 1000;
const RELEASE_EVERY_MS = Math.round(LAP_SECONDS * 1000 / BUBBLE_COUNT); 
const POP_DURATION_MS = 200;

const EDGE_PARTICLE_TRIGGER = 0.65;
const EDGE_PARTICLE_COUNT = 10;

const WOBBLE_SHAPES = ['wobble-a', 'wobble-b', 'wobble-c'];

// The glass and the soap-film colours are painted once and shared by every bubble. Stacking blurred
// gradients, inset shadows and a masked spinning ring on each bubble made Firefox repaint them every
// frame, which halved the frame rate.
const BUBBLE_ART = (() => {
    const S = 256, c = S / 2, R = c - 2;
    function paint(draw) {
        const cv = document.createElement('canvas');
        cv.width = cv.height = S;
        draw(cv.getContext('2d'));
        return cv.toDataURL();
    }
    const glass = paint((ctx) => {
        // clear in the middle, picking up a faint blue toward the rim where the film is seen edge-on
        const edge = ctx.createRadialGradient(c, c, R * 0.5, c, c, R);
        edge.addColorStop(0, 'rgba(170,215,255,0)');
        edge.addColorStop(0.78, 'rgba(170,215,255,0.08)');
        edge.addColorStop(0.95, 'rgba(225,242,255,0.32)');
        edge.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = edge;
        ctx.beginPath(); ctx.arc(c, c, R, 0, Math.PI * 2); ctx.fill();

        ctx.strokeStyle = 'rgba(235,248,255,0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(c, c, R - 1, 0, Math.PI * 2); ctx.stroke();

        // a window reflection curving along the top left, and a small catchlight opposite
        ctx.save();
        ctx.translate(c, c);
        ctx.rotate(-Math.PI * 0.75);
        ctx.filter = 'blur(2px)';
        ctx.beginPath();
        ctx.arc(0, 0, R * 0.8, -0.45, 0.45);
        ctx.arc(0, 0, R * 0.62, 0.38, -0.38, true);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fill();
        ctx.restore();
        ctx.filter = 'blur(1.5px)';
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.beginPath(); ctx.ellipse(c + R * 0.5, c + R * 0.52, R * 0.08, R * 0.035, -Math.PI / 4, 0, Math.PI * 2); ctx.fill();
    });
    const film = paint((ctx) => {
        // magenta, gold and cyan swirling round the rim, heavy on one side and faint on the other
        ctx.filter = 'blur(3px)';
        ctx.lineCap = 'round';
        const steps = 90;
        for (let i = 0; i < steps; i++) {
            const a0 = (i / steps) * Math.PI * 2, a1 = ((i + 1.4) / steps) * Math.PI * 2;
            const hue = 300 + 140 * Math.sin(a0 * 2.0 + 0.6);
            const strength = Math.pow(Math.max(0, Math.cos(a0 - 0.9)), 1.6) * 0.42
                           + Math.pow(Math.max(0, Math.cos(a0 - 4.0)), 3) * 0.18;
            if (strength < 0.01) continue;
            ctx.strokeStyle = `hsla(${hue.toFixed(0)}, 90%, 72%, ${strength.toFixed(3)})`;
            ctx.lineWidth = R * (0.09 + 0.05 * Math.sin(a0 * 3));
            ctx.beginPath(); ctx.arc(c, c, R * 0.87, a0, a1); ctx.stroke();
        }
    });
    return { glass, film };
})();

const PHOTO_REFRESH_MS = 5 * 60 * 1000;

const FALLBACK_SRC = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
        <rect width="200" height="200" fill="#345973"/>
        <circle cx="100" cy="100" r="60" fill="none" stroke="#9fc8e8" stroke-width="4" opacity="0.6"/>
        <circle cx="100" cy="80" r="10" fill="#9fc8e8" opacity="0.6"/>
    </svg>
`);

let photos = [];
let nextPhotoIndex = 0;
let bubbles = [];
let releaseTimer = null;
const imageCache = new Map();

function preload(index) {
    const src = photos[index % photos.length]?.src;
    if (!src || imageCache.has(src)) return;
    const img = new Image();
    img.src = src;
    imageCache.set(src, img);
}

function loadImage(src) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = img.onerror = () => resolve();
        img.src = src;
    });
}

function scatterParticles(container) {
    container.querySelectorAll('.particle').forEach((particle) => {
        const angle = Math.random() * Math.PI * 2;
        const distance = 34 + Math.random() * 46;
        particle.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
        particle.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);
    });
}

function spawnEdgeParticles(container) {
    for (let i = 0; i < EDGE_PARTICLE_COUNT; i++) {
        const angle = Math.random() * Math.PI * 2;
        const edgeRadius = 46;
        const x = 50 + Math.cos(angle) * edgeRadius;
        const y = 50 + Math.sin(angle) * edgeRadius;

        const particle = document.createElement('span');
        particle.className = 'particle particle-fall';
        particle.style.left = `${x}%`;
        particle.style.top = `${y}%`;
        particle.style.setProperty('--dx', `${(Math.random() - 0.5) * 30}px`);
        particle.style.setProperty('--dy', `${40 + Math.random() * 35}px`);
        particle.style.animationDelay = `${(Math.random() * 0.08).toFixed(2)}s`;
        container.appendChild(particle);

        setTimeout(() => particle.remove(), 650);
    }
}

function popHole(bubbleEl, bubbleSlot, durationMs) {
    const tears = Array.from({ length: 4 }, () => ({
        x: 35 + Math.random() * 30,
        y: 35 + Math.random() * 30,
        warpX: 1 + Math.random() * 0.25,
        warpY: 1 + Math.random() * 0.25,
    }));
    const start = performance.now();
    let edgeParticlesSpawned = false;

    function step(now) {
        const t = Math.min(1, (now - start) / durationMs);
        const eased = 1 - (1 - t) ** 3;
        const grow = eased * 165;

        bubbleEl.style.maskImage = tears
            .map(({ x, y, warpX, warpY }) => {
                const r = Math.max(0, grow);
                const rx = (r * warpX).toFixed(1);
                const ry = (r * warpY).toFixed(1);
                return `radial-gradient(ellipse ${rx}% ${ry}% at ${x}% ${y}%, transparent 60%, black 70%)`;
            })
            .join(', ');

        if (!edgeParticlesSpawned && t > EDGE_PARTICLE_TRIGGER) {
            edgeParticlesSpawned = true;
            spawnEdgeParticles(bubbleSlot);
        }

        if (t < 1) requestAnimationFrame(step);
        else bubbleEl.style.opacity = '0';
    }
    requestAnimationFrame(step);
}

function buildBubble(photoIndex, delaySeconds = 0) {
    const slot = document.createElement('div');
    slot.className = 'bubble-slot';
    // drifts across at a steady pace, and grows in from small as it arrives
    slot.style.animation = `travel ${LAP_SECONDS}s linear forwards, arrive 1.8s cubic-bezier(0.2, 0.8, 0.3, 1)`;
    slot.style.animationDelay = `-${delaySeconds.toFixed(2)}s`;

    const inner = document.createElement('div');
    inner.className = 'bubble-inner';
    // each bubble bobs at its own pace
    inner.style.animationDuration = `${(4.5 + Math.random() * 2.5).toFixed(2)}s`;
    inner.style.animationDelay = `-${(Math.random() * 6).toFixed(2)}s`;

    const bubbleEl = document.createElement('div');
    bubbleEl.className = 'bubble';
    bubbleEl.classList.add(WOBBLE_SHAPES[Math.floor(Math.random() * WOBBLE_SHAPES.length)]);
    bubbleEl.style.animationDelay = `-${(Math.random() * 6).toFixed(2)}s`;

    const photo = photos[photoIndex % photos.length];
    bubbleEl.innerHTML = `
        <div class="photo"><img src="${photo.src}" alt="${photo.alt || ''}"></div>
        <img class="film" src="${BUBBLE_ART.film}" alt="" style="animation-delay: -${(Math.random() * 20).toFixed(1)}s">
        <img class="glass" src="${BUBBLE_ART.glass}" alt="">
    `;
    const imgEl = bubbleEl.querySelector('.photo img');
    imgEl.onerror = () => { imgEl.onerror = null; imgEl.src = FALLBACK_SRC; };
    inner.appendChild(bubbleEl);

    for (let i = 0; i < 7; i++) {
        const particle = document.createElement('span');
        particle.className = 'particle';
        inner.appendChild(particle);
    }
    scatterParticles(inner);

    slot.appendChild(inner);
    return slot;
}

function pop(bubble) {
    if (bubble.popped) return;
    bubble.popped = true;
    playOneShot(popSoundEl, { rate: 0.85 + Math.random()*0.3 });

    bubble.slot.getAnimations().forEach((a) => a.pause());

    scatterParticles(bubble.slot);
    bubble.slot.classList.add('popping');
    popHole(bubble.slot.querySelector('.bubble'), bubble.slot, POP_DURATION_MS);

    setTimeout(() => {
        bubble.slot.remove();
        bubbles = bubbles.filter((b) => b !== bubble);
        if (bubbles.length === 0) scheduleRelease(50);
    }, POP_DURATION_MS + 550);
}

function release(delaySeconds = 0) {
    const photoIndex = nextPhotoIndex++;
    preload(nextPhotoIndex);
    preload(nextPhotoIndex + 1);

    const slot = buildBubble(photoIndex, delaySeconds);
    bubblePond.appendChild(slot);

    const bubble = {
        slot,
        popped: false,
        releasedAt: performance.now() - delaySeconds * 1000,
    };

    slot.addEventListener('click', () => pop(bubble));
    bubbles.push(bubble);
}

function scheduleRelease(delay = RELEASE_EVERY_MS) {
    clearTimeout(releaseTimer);
    releaseTimer = setTimeout(() => {
        if (bubbles.length < BUBBLE_COUNT) release();
        scheduleRelease();
    }, delay);
}

// for the bubble stacking 
function checkPops() {
    const now = performance.now();
    bubbles.forEach((bubble) => {
        if (!bubble.popped && now - bubble.releasedAt >= POP_LIFE_MS) pop(bubble);
    });
}

async function loadPhotos() {
    try {
        const res = await fetch('/api/photos', { cache: 'no-store' });
        if (!res.ok) throw new Error(`/api/photos failed (${res.status})`);
        const list = await res.json();
        if (list.length) photos = list;
    } catch (err) {
        console.error('Photo refresh failed:', err);
    }
}

async function start(photoList) {
    photos = photoList;
    if (!photos.length) return;

    await Promise.all(
        Array.from({ length: BUBBLE_COUNT }, (_, i) => loadImage(photos[i % photos.length].src))
    );

    for (let i = 0; i < BUBBLE_COUNT; i++) {
        release(i * (RELEASE_EVERY_MS / 1000));
    }
    bubblePond.classList.add('ready');

    setInterval(checkPops, 200);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            hiddenAt = performance.now();
            clearTimeout(releaseTimer);
        } else {
            if (hiddenAt !== null) {
                const hiddenMs = performance.now() - hiddenAt;
                bubbles.forEach((b) => { b.releasedAt += hiddenMs; });
                hiddenAt = null;
            }
            checkPops();
            scheduleRelease();
        }
    });

    scheduleRelease();
}

fetch('/api/photos')
    .then((res) => {
        if (!res.ok) throw new Error(`/api/photos failed (${res.status})`);
        return res.json();
    })
    .then((list) => {
        start(list.length ? list : [{ src: FALLBACK_SRC, alt: 'placeholder' }]);
        setInterval(loadPhotos, PHOTO_REFRESH_MS);
    })
    .catch((err) => {
        console.error('Failed to load photo list:', err);
        start([{ src: FALLBACK_SRC, alt: 'placeholder' }]);
    });