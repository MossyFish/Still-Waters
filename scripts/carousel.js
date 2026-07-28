const bubblePond = document.getElementById('bubblePond');
const POND_DURATION = 8;
const SLOT_COUNT = 3;

let photos = [];
let nextPhotoIndex = SLOT_COUNT;

function buildSlot(photo, delay) {
    const slot = document.createElement('div');
    slot.className = 'bubble-slot';
    slot.style.animationDelay = delay;

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.style.animationDelay = `0s, ${delay}`;

    const img = document.createElement('img');
    img.src = photo.src;
    img.alt = photo.alt || '';
    bubble.appendChild(img);
    slot.appendChild(bubble);

    const ring = document.createElement('div');
    ring.className = 'ring';
    ring.style.animationDelay = delay;
    slot.appendChild(ring);

    const flash = document.createElement('span');
    flash.className = 'flash';
    flash.style.animationDelay = delay;
    slot.appendChild(flash);

    ['dp1', 'dp2', 'dp3', 'dp4', 'dp5', 'dp6'].forEach(cls => {
        const d = document.createElement('span');
        d.className = `droplet ${cls}`;
        d.style.animationDelay = delay;
        slot.appendChild(d);
    });

    slot.addEventListener('animationiteration', (e) => {
        if (e.animationName !== 'bubbleTravel') return;
        const photo = photos[nextPhotoIndex % photos.length];
        nextPhotoIndex++;
        const img = slot.querySelector('img');
        img.src = photo.src;
        img.alt = photo.alt || '';
    });

    return slot;
}

function makeBubbles(list) {
    photos = list;
    if (!photos.length) return;

    bubblePond.innerHTML = '';
    nextPhotoIndex = SLOT_COUNT;

    for (let i = 0; i < SLOT_COUNT; i++) {
        const delay = `-${(i * (POND_DURATION / SLOT_COUNT)).toFixed(2)}s`;
        const slot = buildSlot(photos[i % photos.length], delay);
        bubblePond.appendChild(slot);
    }
}

fetch('/api/photos')
  .then(res => {
    if (!res.ok) throw new Error(`/api/photos failed (${res.status})`);
    return res.json();
  })
  .then(makeBubbles)
  .catch(err => console.error('Failed to load photo list:', err));
    
window.addEventListener('resize', layoutCarousel);