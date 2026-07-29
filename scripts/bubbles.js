const bubblePond = document.getElementById('bubblePond');

const LAP_SECONDS = 9;
const BUBBLE_COUNT = 3;
const RELEASE_EVERY_MS = (LAP_SECONDS / BUBBLE_COUNT) * 1000;
const POP_AT_PROGRESS = 0.92;
const POP_DURATION_MS = 400;
const WOBBLE_SHAPES = ['wobble-a', 'wobble-b', 'wobble-c'];

let photos = [];
let nextPhotoIndex = 0;
let bubbles = [];
const imageCache = new Map();

function preload(index) {
    const src = photos[index % photos.length]?.src;
    if (!src || imageCache.has(src)) return;
    const img = new Image();
    img.src = src;
    imageCache.set(src, img); // keep the reference alive so the browser can't cancel the load mid-fetch
}

function loadImage(src) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = img.onerror = () => resolve();
        img.src = src;
    });
}

function randomWobble(bubbleEl) {
    WOBBLE_SHAPES.forEach((name) => bubbleEl.classList.remove(name));
    bubbleEl.classList.add(WOBBLE_SHAPES[Math.floor(Math.random() * WOBBLE_SHAPES.length)]);
    bubbleEl.style.animationDelay = `-${(Math.random() * 6).toFixed(2)}s`;
}

function scatterParticles(bubbleSlot) {
    bubbleSlot.querySelectorAll('.particle').forEach((particle) => {
        const angle = Math.random() * Math.PI * 2;
        const distance = 22 + Math.random() * 28;
        particle.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
        particle.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);
    });
}

// Tears a rough hole through the bubble by growing a few overlapping
// transparent circles in its mask. Done in JS, not an animated CSS
// custom property, so it actually works in Firefox.
function popHole(bubbleEl, durationMs) {
    const tears = Array.from({ length: 4 }, () => ({
        x: 35 + Math.random() * 30,
        y: 35 + Math.random() * 30,
        delay: Math.random() * 18,
    }));
    const start = performance.now();

    function step(now) {
        const t = Math.min(1, (now - start) / durationMs);
        const grow = (t ** 3) * 160;

        bubbleEl.style.maskImage = tears
            .map(({ x, y, delay }) => {
                const r = Math.max(0, grow - delay);
                return `radial-gradient(circle at ${x}% ${y}%, transparent ${r}%, black ${r + 6}%)`;
            })
            .join(', ');

        if (t < 1) requestAnimationFrame(step);
        else bubbleEl.style.opacity = '0';
    }
    requestAnimationFrame(step);
}

function buildBubble(photoIndex, delaySeconds = 0) {
    const slot = document.createElement('div');
    slot.className = 'bubble-slot';
    slot.style.animation = 'travel 9s linear forwards';
    slot.style.animationDelay = `-${delaySeconds.toFixed(2)}s`;

    const inner = document.createElement('div');
    inner.className = 'bubble-inner';

    const bubbleEl = document.createElement('div');
    bubbleEl.className = 'bubble';
    randomWobble(bubbleEl);

    const photo = photos[photoIndex % photos.length];
    bubbleEl.innerHTML = `
        <div class="photo"><img src="${photo.src}" alt="${photo.alt || ''}"></div>
        <div class="glass"></div>
    `;
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
    bubble.anim?.pause();

    scatterParticles(bubble.slot);
    bubble.slot.classList.add('popping');
    popHole(bubble.slot.querySelector('.bubble'), POP_DURATION_MS);

    setTimeout(() => {
        bubble.slot.remove();
        bubbles = bubbles.filter((b) => b !== bubble);
    }, POP_DURATION_MS + 60);
}

function release(delaySeconds = 0) {
    const photoIndex = nextPhotoIndex++;
    preload(nextPhotoIndex);
    preload(nextPhotoIndex + 1);

    const slot = buildBubble(photoIndex, delaySeconds);
    bubblePond.appendChild(slot);

    const bubble = { slot, anim: slot.getAnimations()[0], popped: false };
    slot.addEventListener('click', () => pop(bubble));
    bubbles.push(bubble);
}

function watchForEdge() {
    bubbles.forEach((bubble) => {
        if (bubble.popped) return;
        const progress = bubble.anim?.effect?.getComputedTiming().progress;
        if (progress >= POP_AT_PROGRESS) pop(bubble);
    });
    requestAnimationFrame(watchForEdge);
}

async function start(photoList) {
    photos = photoList;
    if (!photos.length) return;

    await Promise.all(
        Array.from({ length: BUBBLE_COUNT }, (_, i) => loadImage(photos[i % photos.length].src))
    );

    for (let i = 0; i < BUBBLE_COUNT; i++) {
        release(i * (LAP_SECONDS / BUBBLE_COUNT));
    }
    bubblePond.classList.add('ready');

    watchForEdge();
    setInterval(() => release(), RELEASE_EVERY_MS);
}

fetch('/api/photos')
    .then((res) => {
        if (!res.ok) throw new Error(`/api/photos failed (${res.status})`);
        return res.json();
    })
    .then(start)
    .catch((err) => console.error('Failed to load photo list:', err));