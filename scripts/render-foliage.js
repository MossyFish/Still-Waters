/* Lilypad layout: tries to find a spot overlapping existing foliage 
   by <=30%. Falls back to the least-crowded option so it never breaks. */

const PAD_PALETTES = [
    ['#60ac72','#2d7348','#18422a'],
    ['#7ec46e','#409442','#1e5624'],
    ['#46968c','#226860','#03836'],
    ['#96ba54','#5c8432','#2c4816'],
    ['#3a8066','#1a5242','#0c2c26'],
    ['#70b096','#348c62','#164036'],
    ['#8cc45a','#4f8a30','#254a16'],
    ['#a0be6c','#6a9040','#33501e']
];

const LEAF_GREENS = ['#4f9a5c','#6bb36f','#3f7a52','#7fb35a','#356b48','#5aa76a','#8cc26a','#2f6b46'];

const hexLuma = hex => {
    const v = parseInt(hex.slice(1), 16);
    return 0.299 * ((v >> 16) & 255) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255);
};

const PAD_MAJORITY_PALETTES = PAD_PALETTES.filter(p => (hexLuma(p[1]) + hexLuma(p[2])) / 2 > 65);

// Jittered grid for cluster centers
const padCluster = []; (() => {
    const cols = 3, rows = 3;
    const cellW = W / cols, cellH = H / rows;
    for (let cy = 0; cy < rows; cy++) {
        for (let cx = 0; cx < cols; cx++) {
            if (Math.random() < 0.85) {
                padCluster.push({
                    x: cx * cellW + cellW * (0.2 + Math.random() * 0.6),
                    y: cy * cellH + cellH * (0.2 + Math.random() * 0.6)
                });
            }
        }
    }
})();

function whereCluster(spread) {
    if (Math.random() < 0.82 && padCluster.length) {
        const c = padCluster[Math.floor(Math.random() * padCluster.length)];
        const gx = (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
        const gy = (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
        return { x: c.x + gx * spread, y: c.y + gy * spread };
    }
    return { x: Math.random() * W, y: Math.random() * H };
}

// foliage at edges
const EXCLUSION_PADDING = 36;
const getExclusionRect = () => {
    const els = ['#intro .title', '#intro .sub', '#intro .enter-hint']
        .map(sel => document.querySelector(sel))
        .filter(Boolean);
    
    if (!els.length) return null;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    
    els.forEach(el => {
        const r = el.getBoundingClientRect();
        x0 = Math.min(x0, r.left);
        y0 = Math.min(y0, r.top);
        x1 = Math.max(x1, r.right);
        y1 = Math.max(y1, r.bottom);
    });
    
    return { x0: x0 - EXCLUSION_PADDING, y0: y0 - EXCLUSION_PADDING, x1: x1 + EXCLUSION_PADDING, y1: y1 + EXCLUSION_PADDING };
};

let introExclusionRect = getExclusionRect();
window.addEventListener('resize', () => { introExclusionRect = getExclusionRect(); });

const isExcluded = (x, y, r, rect) => {
    if (!rect) return false;
    return x + r > rect.x0 && x - r < rect.x1 && y + r > rect.y0 && y - r < rect.y1;
};

// tracker so they don't overlap too much 
const placedFoliage = [];
const MAX_LAP = 0.3;
const TRIES = 40;

function circleOverlapArea(x1, y1, r1, x2, y2, r2) {
    const d = Math.hypot(x2 - x1, y2 - y1);
    if (d >= r1 + r2) return 0;
    if (d <= Math.abs(r1 - r2)) return Math.PI * Math.min(r1, r2) ** 2;
    
    const r1sq = r1 * r1, r2sq = r2 * r2;
    const alpha = Math.acos((d * d + r1sq - r2sq) / (2 * d * r1)) * 2;
    const beta = Math.acos((d * d + r2sq - r1sq) / (2 * d * r2)) * 2;
    return 0.5 * r1sq * (alpha - Math.sin(alpha)) + 0.5 * r2sq * (beta - Math.sin(beta));
}

function findSpot(spread, r) {
    let best = null, bestFrac = Infinity;
    let attempts = 0, validAttempts = 0;
    const maxAttempts = TRIES * 3;

    while (validAttempts < TRIES && attempts < maxAttempts) {
        attempts++;
        const p = whereCluster(spread);
        if (isExcluded(p.x, p.y, r, introExclusionRect)) continue;
        validAttempts++;

        let worstFrac = 0;
        for (const other of placedFoliage) {
            const overlap = circleOverlapArea(p.x, p.y, r, other.x, other.y, other.r);
            const smallerArea = Math.PI * Math.min(r, other.r) ** 2;
            const frac = smallerArea > 0 ? overlap / smallerArea : 0;
            if (frac > worstFrac) worstFrac = frac;
        }

        if (worstFrac <= MAX_LAP) return p;
        if (worstFrac < bestFrac) {
            bestFrac = worstFrac;
            best = p;
        }
    }

    if (best) return best;

    // Fallback random spots if everything is jammed
    for (let i = 0; i < 30; i++) {
        const p = { x: Math.random() * W, y: Math.random() * H };
        if (!isExcluded(p.x, p.y, r, introExclusionRect)) return p;
    }
    return { x: Math.random() * W, y: Math.random() * H };
}

function lerpHex(hexA, hexB, t) {
    const a = parseInt(hexA.slice(1), 16), b = parseInt(hexB.slice(1), 16);
    const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
    const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
    const r = Math.round(ar + (br - ar) * t);
    const g = Math.round(ag + (bg - ag) * t);
    const bl = Math.round(ab + (bb - ab) * t);
    return '#' + [r, g, bl].map(v => v.toString(16).padStart(2, '0')).join('');
}

function angularDistance(a, ref) {
    let d = (a - ref) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return Math.abs(d);
}

// Wabi-sabi leaf shaping
function makePadOutline(baseR, notchWidth, notchDepth, irregularity, seedA, seedB, samples = 48) {
    const pts = [];
    for (let i = 0; i < samples; i++) {
        const a = (i / samples) * Math.PI * 2;
        const notchFactor = Math.max(0, 1 - angularDistance(a, 0) / notchWidth);
        const wobble = 1 + irregularity * (Math.sin(a * 3 + seedA) * 0.5 + Math.sin(a * 5 + seedB) * 0.3);
        const r = baseR * wobble * (1 - notchDepth * Math.pow(notchFactor, 1.4));
        pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    return pts;
}