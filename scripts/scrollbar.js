document.addEventListener('DOMContentLoaded', () => {
    const tickSound = document.getElementById('sfxClick');

    function playTick() {
        playOneShot(tickSound, { rate: 0.96 + Math.random() * 0.08 });
    }

    function buildPad(size) {
        const canvas = document.createElement('canvas');
        const scale = window.devicePixelRatio || 1;
        canvas.width = size * scale;
        canvas.height = size * scale;
        canvas.style.width = `${size}px`;
        canvas.style.height = `${size}px`;
        const ctx = canvas.getContext('2d');
        ctx.scale(scale, scale);
        ctx.translate(size / 2, size / 2);
        ctx.rotate(-Math.PI / 2);

        const r = size * 0.42;
        const palette = PAD_COLORS[Math.floor(Math.random() * PAD_COLORS.length)];
        const [c0, c1, c2] = palette;
        const bodyColor = lerpHex(c1, c2, 0.3);
        const edgeColor = lerpHex(bodyColor, c2, 0.5);
        const centerLight = lerpHex(c0, '#d1ffdb', 0.2);
        const veinColor = lerpHex(c1, c0, 0.7);

        let altPalette;
        do { altPalette = PAD_COLORS[Math.floor(Math.random() * PAD_COLORS.length)]; }
        while (altPalette === palette);
        const mixColor = lerpHex(altPalette[Math.floor(Math.random() * altPalette.length)], bodyColor, 0.1);
        const mixAngle = Math.random() * Math.PI * 2;

        const outlinePts = makePadOutline(r, 0.5, 0.65, 0.07, Math.random() * 10, Math.random() * 10, 40);

        ctx.save();
        ctx.filter = 'blur(3px)';
        ctx.translate(1.5, 2.5);
        blobPath(ctx, outlinePts);
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.fill();
        ctx.restore();

        ctx.save();
        blobPath(ctx, outlinePts);
        ctx.clip();

        blobPath(ctx, outlinePts);
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        grad.addColorStop(0, hexToRgba(bodyColor, 1));
        grad.addColorStop(1, hexToRgba(edgeColor, 1));
        ctx.fillStyle = grad;
        ctx.fill();

        // secondary-color patch blended into ~30% of the pad
        {
            const centerDist = r * 0.45;
            const bx = Math.cos(mixAngle) * centerDist;
            const by = Math.sin(mixAngle) * centerDist;
            const blobR = r * 0.85;
            ctx.beginPath();
            ctx.arc(bx, by, blobR, 0, Math.PI * 2);
            const mixGrad = ctx.createRadialGradient(bx, by, 0, bx, by, blobR * 0.85);
            mixGrad.addColorStop(0, hexToRgba(mixColor, 0.8));
            mixGrad.addColorStop(0.55, hexToRgba(mixColor, 0.45));
            mixGrad.addColorStop(1, hexToRgba(mixColor, 0));
            ctx.fillStyle = mixGrad;
            ctx.fill();
        }

        // the pad is drawn turned -90deg, so the screen's top-left light is turned back by the same amount
        paintPadTexture(ctx, r, palette, Math.atan2(-1, -1) + Math.PI / 2, 0.5);

        // light streaks radiating from center
        ctx.save();
        ctx.filter = 'blur(0.6px)';
        ctx.lineCap = 'round';
        const veinCount = 5;
        for (let i = 0; i < veinCount; i++) {
            const angle = (i / veinCount) * Math.PI * 2 + Math.random() * 0.3;
            const len = r * (0.45 + Math.random() * 0.35);
            ctx.strokeStyle = hexToRgba(veinColor, 0.22 + Math.random() * 0.15);
            ctx.lineWidth = r * 0.05;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * len, Math.sin(angle) * len);
            ctx.stroke();
        }
        ctx.restore();

        // rim darkening
        const rimGrad = ctx.createRadialGradient(0, 0, r * 0.45, 0, 0, r);
        rimGrad.addColorStop(0, 'rgba(0,0,0,0)');
        rimGrad.addColorStop(0.7, 'rgba(0,0,0,0.18)');
        rimGrad.addColorStop(1, 'rgba(0,0,0,0.4)');
        ctx.fillStyle = rimGrad;
        ctx.fill();

        ctx.filter = 'blur(1px)';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.14, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(centerLight, 0.55);
        ctx.fill();
        ctx.filter = 'none';

        ctx.beginPath();
        ctx.arc(0, 0, r * 0.04, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fill();

        // a bead of water sitting on the leaf: a faint lens, darker at the bottom, with a glint
        {
            const bx = r * 0.32, by = r * 0.3, br = r * 0.11;
            const bead = ctx.createRadialGradient(bx - br * 0.3, by - br * 0.3, 0, bx, by, br);
            bead.addColorStop(0, 'rgba(235,255,240,0.35)');
            bead.addColorStop(0.7, 'rgba(160,215,180,0.12)');
            bead.addColorStop(1, 'rgba(10,40,25,0.35)');
            ctx.beginPath();
            ctx.arc(bx, by, br, 0, Math.PI * 2);
            ctx.fillStyle = bead;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(bx - br * 0.35, by - br * 0.35, br * 0.28, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.fill();
        }
        ctx.restore();


        return canvas;
    }

    // ---- watercolour flowers: soft washes with the pigment pooling darker at the drying edge,
    // like the painted water and fish ----
    function wcCanvas(w, h) {
        const canvas = document.createElement('canvas');
        const scale = window.devicePixelRatio || 1;
        canvas.width = w * scale;
        canvas.height = h * scale;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        const ctx = canvas.getContext('2d');
        ctx.scale(scale, scale);
        return { canvas, ctx };
    }
    function wash(ctx, path, fill, edge, edgeW) {
        ctx.save();
        path();
        ctx.fillStyle = fill;
        ctx.fill();
        path();
        ctx.clip();
        ctx.filter = `blur(${Math.max(0.5, edgeW * 0.45).toFixed(1)}px)`;
        path();
        ctx.strokeStyle = edge;
        ctx.lineWidth = edgeW;
        ctx.stroke();
        ctx.restore();
    }
    // a petal from its base at the origin to a point at (bend, -len)
    function petalPath(ctx, len, wid, bend = 0) {
        return () => {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(wid, -len * 0.25, wid * 0.8 + bend, -len * 0.78, bend, -len);
            ctx.bezierCurveTo(-wid * 0.8 + bend, -len * 0.78, -wid, -len * 0.25, 0, 0);
            ctx.closePath();
        };
    }
    function grad(ctx, x0, y0, x1, y1, stops) {
        const g = ctx.createLinearGradient(x0, y0, x1, y1);
        stops.forEach(([t, c]) => g.addColorStop(t, c));
        return g;
    }
    function veins(ctx, len, n, color) {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 0.5;
        for (let i = 0; i < n; i++) {
            const x = (i - (n - 1) / 2) * 1.6;
            ctx.beginPath();
            ctx.moveTo(x * 0.3, -len * 0.08);
            ctx.quadraticCurveTo(x, -len * 0.5, x * 0.4, -len * 0.88);
            ctx.stroke();
        }
        ctx.restore();
    }

    // the soft paper grain the pond pads have, laid over a finished flower and trimmed to its shape
    function grainify(canvas, ctx, amount) {
        const copy = document.createElement('canvas');
        copy.width = canvas.width;
        copy.height = canvas.height;
        copy.getContext('2d').drawImage(canvas, 0, 0);
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = 'overlay';
        ctx.globalAlpha = amount;
        ctx.fillStyle = padGrainPattern(ctx);
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(copy, 0, 0);
        ctx.restore();
    }

    // one petal painted softly: no outline, colour deepening toward the tip, a paler streak down
    // the middle where the light catches it
    function softPetal(ctx, len, wid, bend, base, mid, tip, blur) {
        ctx.save();
        ctx.filter = `blur(${blur}px)`;
        petalPath(ctx, len, wid, bend)();
        ctx.fillStyle = grad(ctx, 0, 0, 0, -len, [[0, base], [0.5, mid], [1, tip]]);
        ctx.fill();
        ctx.filter = `blur(${(blur * 2).toFixed(1)}px)`;
        ctx.beginPath();
        ctx.ellipse(bend * 0.3, -len * 0.5, wid * 0.28, len * 0.3, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,244,246,0.35)';
        ctx.fill();
        ctx.restore();
    }

    // a closed lotus bud from the side, painted: green sepals with a pink tip showing
    function buildBud(w, h) {
        const { canvas, ctx } = wcCanvas(w, h);
        const cx = w / 2, base = h * 0.76, L = h * 0.7, W = w * 0.42;

        ctx.save();
        ctx.filter = 'blur(0.4px)';
        ctx.strokeStyle = 'rgba(120,150,86,0.85)';
        ctx.lineWidth = 1.3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx, base);
        ctx.quadraticCurveTo(cx + 0.8, h * 0.88, cx - 0.3, h * 0.99);
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.translate(cx, base);
        ctx.rotate((Math.random() - 0.5) * 0.14);
        softPetal(ctx, L, W * 0.6, 0, 'rgba(246,222,206,0.95)', 'rgba(240,170,188,0.95)', 'rgba(214,96,136,0.95)', 0.5);
        softPetal(ctx, L * 0.86, W, -0.5, 'rgba(96,138,70,0.95)', 'rgba(134,176,96,0.95)', 'rgba(176,204,128,0.9)', 0.55);
        softPetal(ctx, L * 0.78, W * 0.8, 0.5, 'rgba(110,150,80,0.9)', 'rgba(160,196,112,0.9)', 'rgba(198,218,150,0.85)', 0.55);
        // a little pink bleeding into the green near the tip
        ctx.filter = 'blur(1.2px)';
        ctx.beginPath();
        ctx.ellipse(0, -L * 0.72, W * 0.5, L * 0.12, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(214,110,140,0.25)';
        ctx.fill();
        ctx.restore();
        grainify(canvas, ctx, 0.2);
        return canvas;
    }

    // a pad reduced to colour: the pond's pad shape and palette, a second colour bleeding in, a soft
    // light in the middle and the rim darkened, without veins, ribs or a water bead
    function buildSimplePad(size) {
        // the pond's own pad recipe at a small size: an irregular notched outline, a lighter body,
        // a second colour bleeding in, the pad texture laid on lightly, a soft centre glow and a
        // pale highlight on part of the rim. No water bead or drawn veins, so it stays painterly
        const { canvas, ctx } = wcCanvas(size, size);
        ctx.translate(size / 2, size / 2);
        const rot = Math.random() * Math.PI * 2;
        const r = size * 0.42;
        const palette = PAD_COLORS[Math.floor(Math.random() * PAD_COLORS.length)];
        const [c0, c1, c2] = palette;
        const notch = 0.35 + Math.random() * 0.45;
        const pts = makePadOutline(r, notch, 0.55 + Math.random() * 0.35, 0.06 + Math.random() * 0.07, Math.random() * 10, Math.random() * 10, 40);
        const bodyColor = lerpHex(c1, c2, Math.random() * 0.4);
        const edgeColor = lerpHex(bodyColor, c2, 0.35);

        ctx.save();
        ctx.filter = 'blur(2px)';
        ctx.translate(1.5, 2);
        ctx.rotate(rot);
        blobPath(ctx, pts);
        ctx.fillStyle = 'rgba(0,8,14,0.18)';
        ctx.fill();
        ctx.restore();

        ctx.rotate(rot);
        ctx.save();
        ctx.filter = 'blur(0.4px)';
        blobPath(ctx, pts);
        ctx.clip();
        const body = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        body.addColorStop(0, bodyColor);
        body.addColorStop(1, edgeColor);
        ctx.fillStyle = body;
        ctx.fillRect(-r * 1.3, -r * 1.3, r * 2.6, r * 2.6);
        let alt;
        do { alt = PAD_COLORS[Math.floor(Math.random() * PAD_COLORS.length)]; } while (alt === palette && PAD_COLORS.length > 1);
        const mixColor = lerpHex(alt[Math.floor(Math.random() * 3)], bodyColor, 0.1);
        const ma = Math.random() * Math.PI * 2;
        const bx = Math.cos(ma) * r * 0.45, by = Math.sin(ma) * r * 0.45;
        const mg = ctx.createRadialGradient(bx, by, 0, bx, by, r * 0.75);
        mg.addColorStop(0, hexToRgba(mixColor, 0.8));
        mg.addColorStop(0.55, hexToRgba(mixColor, 0.45));
        mg.addColorStop(1, hexToRgba(mixColor, 0));
        ctx.fillStyle = mg;
        ctx.fillRect(-r * 1.3, -r * 1.3, r * 2.6, r * 2.6);
        ctx.globalAlpha = 0.6;
        paintPadTexture(ctx, r, palette, Math.atan2(-1, -1) - rot, notch);
        ctx.globalAlpha = 1;
        ctx.filter = 'blur(1px)';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.15, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(lerpHex(c0, '#d1ffdb', 0.15), 0.8);
        ctx.fill();
        ctx.filter = 'none';
        const rim = ctx.createRadialGradient(0, 0, r * 0.55, 0, 0, r);
        rim.addColorStop(0, 'rgba(0,0,0,0)');
        rim.addColorStop(1, 'rgba(0,0,0,0.2)');
        ctx.fillStyle = rim;
        ctx.fillRect(-r * 1.3, -r * 1.3, r * 2.6, r * 2.6);
        ctx.restore();

        // pale light along part of the rim
        const n = pts.length, start = Math.floor(Math.random() * n), span = Math.floor(n * (0.15 + Math.random() * 0.15));
        ctx.lineCap = 'round';
        for (let i = 0; i < span; i++) {
            const p0 = pts[(start + i) % n], p1 = pts[(start + i + 1) % n];
            const taper = Math.sin(Math.PI * (i + 0.5) / span);
            ctx.strokeStyle = `rgba(235,250,240,${(0.35 * taper).toFixed(3)})`;
            ctx.lineWidth = r * 0.07 * (0.3 + 0.7 * taper);
            ctx.beginPath();
            ctx.moveTo(p0[0] * 1.08, p0[1] * 1.08);
            ctx.lineTo(p1[0] * 1.08, p1[1] * 1.08);
            ctx.stroke();
        }
        return canvas;
    }

    // a lotus opening on its pad, seen at a slant the way you'd see one from the bank. Each petal
    // is laid in like oil paint: a muted wash, a shadow scumbled into the side away from the light,
    // a few dry-brush streaks along its length, and no hard outline anywhere
    function buildLotus(size) {
        const { canvas, ctx } = wcCanvas(size, size);
        const c = size / 2;
        const R = size * 0.27;
        const cx = c, cy = c + size * 0.06;

        // an ordinary round pad, the same as the ones in the pond, with the flower in its middle
        const ps = Math.round(size * 0.7);
        ctx.drawImage(buildSimplePad(ps), cx - ps / 2, cy - ps / 2 - size * 0.04, ps, ps);
        const rnd = (a) => (Math.random() - 0.5) * a;
        const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
        const css = (col, al) => `rgba(${col.map(Math.round).join(',')},${al})`;
        const CREAM = [246, 236, 228], ROSE = [228, 176, 188], DUSK = [196, 126, 148], SHADE = [120, 74, 96];

        // its shadow on the pad
        ctx.save();
        ctx.filter = 'blur(3px)';
        ctx.beginPath();
        ctx.ellipse(cx + 3, cy + 3, R * 1.05, R * 0.55, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(10,26,20,0.35)';
        ctx.fill();
        ctx.restore();

        // petals in 3D: angle round the cup, how far out the tip leans, how high it stands
        const TILT = 0.78;
        const petals = [];
        const ringOf = (n, out, up, wid, off, warm) => {
            for (let i = 0; i < n; i++) {
                // evenly spaced, every ring the same shape all the way round
                const a = off + i / n * Math.PI * 2;
                petals.push({ a, out, up, wid, warm });
            }
        };
        const turn = Math.random() * Math.PI;
        ringOf(8, R * 0.95, R * 0.22, R * 0.4, turn, 1);
        ringOf(8, R * 0.62, R * 0.5, R * 0.34, turn + Math.PI / 8, 0.6);
        ringOf(5, R * 0.3, R * 0.62, R * 0.26, turn, 0.3);
        petals.forEach(p => { p.depth = Math.sin(p.a) * p.out; });
        petals.sort((p, q) => p.depth - q.depth);

        function paintPetal(p) {
            const bx = cx + Math.cos(p.a) * R * 0.12, by = cy + Math.sin(p.a) * R * 0.12 * TILT;
            const tx = cx + Math.cos(p.a) * p.out, ty = cy + Math.sin(p.a) * p.out * TILT - p.up;
            const len = Math.hypot(tx - bx, ty - by);
            const front = Math.sin(p.a) > 0;           // facing us we see the petal's darker back
            const lit = 0.5 + 0.5 * Math.cos(p.a + Math.PI * 0.75); // light from the top left
            const tipCol = mix(DUSK, ROSE, lit * 0.6 + (front ? 0 : 0.35));
            const midCol = mix(ROSE, CREAM, lit * 0.35 + (front ? 0 : 0.3));
            const baseCol = mix(CREAM, ROSE, front ? 0.25 : 0.05);

            ctx.save();
            ctx.translate(bx, by);
            ctx.rotate(Math.atan2(ty - by, tx - bx) + Math.PI / 2);
            const bend = 0;
            const path = petalPath(ctx, len, p.wid, bend);

            ctx.filter = 'blur(0.7px)';
            path();
            ctx.fillStyle = grad(ctx, 0, 0, 0, -len, [[0, css(baseCol, 0.96)], [0.55, css(midCol, 0.95)], [1, css(tipCol, 0.92)]]);
            ctx.fill();

            ctx.save();
            path();
            ctx.clip();
            // shadow scumbled into the side turned from the light, deeper on the front petals
            ctx.filter = 'blur(2.2px)';
            ctx.beginPath();
            ctx.ellipse(p.wid * 0.55, -len * 0.45, p.wid * 0.55, len * 0.55, 0, 0, Math.PI * 2);
            ctx.fillStyle = css(SHADE, front ? 0.28 : 0.14);
            ctx.fill();
            // a cool reflection of the water low on the petal
            ctx.beginPath();
            ctx.ellipse(-p.wid * 0.2, -len * 0.18, p.wid * 0.5, len * 0.2, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(176,206,214,0.12)';
            ctx.fill();
            // dry-brush streaks running base to tip
            ctx.filter = 'blur(0.35px)';
            ctx.lineCap = 'round';
            for (let k = 0; k < 4; k++) {
                const x = (k / 3 - 0.5) * p.wid * 0.9 + rnd(p.wid * 0.15);
                ctx.beginPath();
                ctx.moveTo(x * 0.3, -len * 0.08);
                ctx.quadraticCurveTo(x, -len * 0.5, x * 0.4 + bend * 0.6, -len * (0.82 + Math.random() * 0.1));
                ctx.strokeStyle = k % 2 ? css(CREAM, 0.22 + lit * 0.2) : css(DUSK, 0.12);
                ctx.lineWidth = 0.5 + Math.random() * 0.6;
                ctx.stroke();
            }
            ctx.restore();

            // the edge picks up a little light rather than being outlined
            ctx.filter = 'blur(0.6px)';
            path();
            ctx.strokeStyle = css(CREAM, front ? 0.18 : 0.3);
            ctx.lineWidth = 0.6;
            ctx.stroke();
            ctx.restore();
        }

        let podDone = false;
        const paintPod = () => {
            // the seed head, mostly hidden in the inner petals: muted green-gold, soft stamens round it
            ctx.save();
            ctx.filter = 'blur(0.9px)';
            ctx.fillStyle = 'rgba(214,176,96,0.75)';
            for (let i = 0; i < 14; i++) {
                const a = i / 14 * Math.PI * 2;
                ctx.beginPath();
                ctx.ellipse(cx + Math.cos(a) * R * 0.2, cy - R * 0.55 + Math.sin(a) * R * 0.2 * TILT, 1.1, 1.6, a, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.beginPath();
            ctx.ellipse(cx, cy - R * 0.58, R * 0.15, R * 0.15 * TILT + 0.6, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(190,190,112,0.9)';
            ctx.fill();
            ctx.restore();
        };
        petals.forEach(p => {
            if (!podDone && p.depth > -R * 0.05 && p.out < R * 0.5) { paintPod(); podDone = true; }
            paintPetal(p);
        });
        if (!podDone) paintPod();

        grainify(canvas, ctx, 0.3);
        return canvas;
    }

    document.querySelectorAll('.exp-block').forEach((block) => {
        const list = block.querySelector('.scroll-list');
        const track = block.querySelector('.fake-scrollbar-track');
        const thumb = block.querySelector('.fake-scrollbar-thumb');
        if (!list || !track || !thumb) return;
        thumb.appendChild(buildLotus(60));

        const items = Array.from(list.querySelectorAll('.exp-item'));
        if (!items.length) return;

        // the stem runs from the first entry to the last, with a dot level with each one
        const STEM_END = 14;
        const ticks = items.map(() => {
            const tick = document.createElement('div');
            tick.className = 'fake-scrollbar-tick';
            // each entry gets its own tiny pad; the big one floats over to whichever is selected
            const pad = buildBud(12, 24);
            pad.style.animationDelay = `-${(Math.random() * 7).toFixed(1)}s`;
            tick.appendChild(pad);
            track.insertBefore(tick, thumb);
            return tick;
        });
        let mids = [];

        let currentIndex = -1;
        let dragging = false;

        function layout() {
            const listTop = list.getBoundingClientRect().top;
            mids = items.map((item) => {
                const rect = item.getBoundingClientRect();
                return rect.top + rect.height / 2 - listTop;
            });
            const first = mids[0];
            track.style.top = `${first - STEM_END}px`;
            track.style.height = `${mids[mids.length - 1] - first + STEM_END * 2}px`;
            ticks.forEach((tick, i) => { tick.style.top = `${mids[i] - first + STEM_END}px`; });
            positionThumb(currentIndex);
        }

        function setActive(index, { silent = false } = {}) {
            index = Math.max(0, Math.min(items.length - 1, index));
            if (index === currentIndex) return;
            if (currentIndex >= 0) items[currentIndex].classList.remove('scroll-active');
            items[index].classList.add('scroll-active');
            ticks.forEach((tick, i) => {
                tick.classList.toggle('active', i === index);
                // the buds either side of the flower stand a little taller
                const d = Math.abs(i - index);
                tick.classList.toggle('near', d === 1);
                tick.classList.toggle('near2', d === 2);
            });
            currentIndex = index;
            if (!silent) {
                playTick();
                // a ring spreads out under the pad where it lands
                thumb.classList.remove('landed');
                void thumb.offsetWidth;
                thumb.classList.add('landed');
            }
            positionThumb(index);
        }

        function positionThumb(index) {
            if (index < 0 || !mids.length) return;
            thumb.style.setProperty('--pad-y', `${mids[index] - mids[0] + STEM_END}px`);
        }

        function indexFromClientY(clientY) {
            let closest = 0;
            let minDist = Infinity;
            items.forEach((item, i) => {
                const rect = item.getBoundingClientRect();
                const mid = rect.top + rect.height / 2;
                const dist = Math.abs(clientY - mid);
                if (dist < minDist) { minDist = dist; closest = i; }
            });
            return closest;
        }

        thumb.addEventListener('pointerdown', (e) => {
            dragging = true;
            thumb.setPointerCapture(e.pointerId);
            thumb.classList.add('dragging');
        });

        thumb.addEventListener('pointermove', (e) => {
            if (!dragging) return;
            setActive(indexFromClientY(e.clientY));
        });

        function endDrag(e) {
            if (!dragging) return;
            dragging = false;
            thumb.classList.remove('dragging');
        }
        thumb.addEventListener('pointerup', endDrag);
        thumb.addEventListener('pointercancel', endDrag);

        track.addEventListener('pointerdown', (e) => {
            if (e.target.closest('.fake-scrollbar-thumb')) return;
            setActive(indexFromClientY(e.clientY));
       });

        // heights change as fonts load and the window resizes
        new ResizeObserver(layout).observe(list);
        layout();
        setActive(0, { silent: true });
    });
});