const bubblePond = document.getElementById('bubblePond');
const LAP_SECONDS = 9;
const SLOT_COUNT = 3;
const WOBBLES = ['wobble-a', 'wobble-b', 'wobble-c'];
const POP_PROGRESS = 0.92;

let photos = [];
let nextPhoto = 0;
let activeLanes = [];
const imageCache = new Map();

function loadImage(src) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(img);
        img.src = src;
    });
}

function preload(index) {
    const photo = photos[index % photos.length];
    if (!photo || imageCache.has(photo.src)) return;
    loadImage(photo.src).then((img) => imageCache.set(photo.src, img));
}

function pickWobble(bubble) {
    WOBBLES.forEach((w) => bubble.classList.remove(w));
    bubble.classList.add(WOBBLES[Math.floor(Math.random() * WOBBLES.length)]);
    bubble.style.animationDelay = `-${(Math.random() * 6).toFixed(2)}s`;
}

function randomizeParticles(slot) {
    slot.querySelectorAll('.particle').forEach((p) => {
        const angle = Math.random() * Math.PI * 2;
        const dist = 20 + Math.random() * 26;
        p.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
        p.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
    });
}

function buildSlot(photoIndex, delaySeconds) {
    const slot = document.createElement('div');
    slot.className = 'bubble-slot';
    slot.style.animationDelay = `-${delaySeconds.toFixed(2)}s`;

    const inner = document.createElement('div');
    inner.className = 'bubble-inner';

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    pickWobble(bubble);

    const img = document.createElement('img');
    img.src = photos[photoIndex % photos.length].src;
    img.alt = photos[photoIndex % photos.length].alt || '';
    bubble.appendChild(img);

    const glass = document.createElement('div');
    glass.className = 'glass';
    bubble.appendChild(glass);

    inner.appendChild(bubble);

    const hole = document.createElement('div');
    hole.className = 'hole';
    inner.appendChild(hole);

    for (let i = 0; i < 7; i++) {
        const p = document.createElement('span');
        p.className = 'particle';
        inner.appendChild(p);
    }
    randomizeParticles(inner);

    slot.appendChild(inner);
    return slot;
}

function spawnLane(laneIndex, delaySeconds) {
    const photoIndex = nextPhoto;
    nextPhoto++;
    preload(nextPhoto);
    preload(nextPhoto + 1);

    const slot = buildSlot(photoIndex, delaySeconds);
    bubblePond.appendChild(slot);

    const anim = slot.getAnimations().find((a) => a.animationName === 'travel');
    const lane = { slot, anim, popped: false };

    slot.addEventListener('click', () => popLane(lane));
    activeLanes[laneIndex] = lane;
}

function popLane(lane) {
    if (lane.popped) return;
    lane.popped = true;
    if (lane.anim) lane.anim.pause();
    randomizeParticles(lane.slot);
    lane.slot.classList.add('popping');

    setTimeout(() => {
        const laneIndex = activeLanes.indexOf(lane);
        lane.slot.remove();
        spawnLane(laneIndex, 0);
    }, 480);
}

function monitorLanes() {
    activeLanes.forEach((lane) => {
        if (!lane || lane.popped || !lane.anim || !lane.anim.effect) return;
        const timing = lane.anim.effect.getComputedTiming();
        if (typeof timing.progress === 'number' && timing.progress >= POP_PROGRESS) {
            popLane(lane);
        }
    });
    requestAnimationFrame(monitorLanes);
}

function buildBubblePond(list) {
    photos = list;
    if (!photos.length) return;

    bubblePond.innerHTML = '';
    activeLanes = [];
    nextPhoto = 0;

    const firstLoads = [];
    for (let i = 0; i < SLOT_COUNT; i++) {
        firstLoads.push(loadImage(photos[i % photos.length].src));
    }

    Promise.all(firstLoads).then(() => {
        for (let i = 0; i < SLOT_COUNT; i++) {
            spawnLane(i, i * (LAP_SECONDS / SLOT_COUNT));
        }
        bubblePond.classList.add('ready');
        requestAnimationFrame(monitorLanes);
    });
}

fetch('/api/photos')
    .then((res) => {
        if (!res.ok) throw new Error(`/api/photos failed (${res.status})`);
        return res.json();
    })
    .then(buildBubblePond)
    .catch((err) => console.error('Failed to load photo list:', err));