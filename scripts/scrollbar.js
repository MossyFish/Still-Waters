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
        ctx.arc(0, 0, r * 0.16, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(centerLight, 0.9);
        ctx.fill();
        ctx.filter = 'none';

        ctx.beginPath();
        ctx.arc(0, 0, r * 0.07, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.shadowColor = 'rgba(160,220,180,0.55)';
        ctx.shadowBlur = 6;
        blobPath(ctx, outlinePts);
        ctx.strokeStyle = 'rgba(200,255,210,0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        return canvas;
    }

    document.querySelectorAll('.exp-block').forEach((block) => {
        const list = block.querySelector('.scroll-list');
        const track = block.querySelector('.fake-scrollbar-track');
        const thumb = block.querySelector('.fake-scrollbar-thumb');
        if (!list || !track || !thumb) return;
        thumb.appendChild(buildPad(48));

        const items = Array.from(list.querySelectorAll('.exp-item'));
        if (!items.length) return;

        // the stem runs from the first entry to the last, with a dot level with each one
        const STEM_END = 14;
        const ticks = items.map(() => {
            const tick = document.createElement('div');
            tick.className = 'fake-scrollbar-tick';
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
            ticks.forEach((tick, i) => tick.classList.toggle('active', i === index));
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