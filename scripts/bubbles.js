const bubblePond = document.getElementById('bubblePond');
const LAP_SECONDS = 9;
const SLOT_COUNT = 3;
const WOBBLES = ['wobble-a', 'wobble-b', 'wobble-c'];

let photos = [];
let nextPhoto = SLOT_COUNT;
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

function randomDroplets(slot) {
    slot.querySelectorAll('.droplet').forEach((d) => {
        const angle = Math.random() * Math.PI * 2;
        const dist = 18 + Math.random() * 22;
        d.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
        d.style.setProperty('--dy', `${Math.sin(angle) * dist + 6}px`);
    });
}

function buildSlot(startIndex, delay) {
    const slot = document.createElement('div');
    slot.className = 'bubble-slot';
    slot.style.animationDelay = delay;

    const lift = document.createElement('div');
    lift.className = 'bubble-lift';

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    pickWobble(bubble);

    const img = document.createElement('img');
    img.src = photos[startIndex % photos.length].src;
    img.alt = photos[startIndex % photos.length].alt || '';
    bubble.appendChild(img);

    const glass = document.createElement('div');
    glass.className = 'glass';
    bubble.appendChild(glass);

    lift.appendChild(bubble);
    slot.appendChild(lift);

    const ring = document.createElement('div');
    ring.className = 'ring';
    slot.appendChild(ring);

    const flash = document.createElement('span');
    flash.className = 'flash';
    slot.appendChild(flash);

    for (let i = 0; i < 5; i++) {
        const d = document.createElement('span');
        d.className = 'droplet';
        slot.appendChild(d);
    }
    randomDroplets(slot);

    slot.addEventListener('animationiteration', (e) => {
        if (e.animationName !== 'travel') return;
        const photo = photos[nextPhoto % photos.length];
        img.src = photo.src;
        img.alt = photo.alt || '';
        preload(nextPhoto + 2);
        nextPhoto++;
        pickWobble(bubble);
        randomDroplets(slot);
    });

    slot.addEventListener('click', () => {
        slot.style.animationDelay = `-${(LAP_SECONDS * 0.9).toFixed(2)}s`;
    });

    return slot;
}

function buildBubblePond(list) {
    photos = list;
    if (!photos.length) return;

    bubblePond.innerHTML = '';
    nextPhoto = SLOT_COUNT;

    const firstLoads = [];
    for (let i = 0; i < SLOT_COUNT; i++) {
        firstLoads.push(loadImage(photos[i % photos.length].src));
    }

    Promise.all(firstLoads).then(() => {
        for (let i = 0; i < SLOT_COUNT; i++) {
            const delay = `-${(i * (LAP_SECONDS / SLOT_COUNT)).toFixed(2)}s`;
            bubblePond.appendChild(buildSlot(i, delay));
        }
        bubblePond.classList.add('ready');
    });
}

fetch('/api/photos')
    .then((res) => {
        if (!res.ok) throw new Error(`/api/photos failed (${res.status})`);
        return res.json();
    })
    .then(buildBubblePond)
    .catch((err) => console.error('Failed to load photo list:', err));