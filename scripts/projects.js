document.addEventListener('DOMContentLoaded', () => {
    const boxes = document.querySelectorAll('.project-box');
    const overlay = document.getElementById('project-overlay');
    let openBox = null;

    function collapse(box) {
        const desc = box.querySelector('.project-desc');
        box.classList.remove('expanded');
        box.style.removeProperty('--expand-width');
        if (desc && desc.dataset.full) desc.textContent = desc.dataset.preview;
        if (box._homeParent) {
        box._homeParent.insertBefore(box, box._homeNextSibling);
        box._homeParent = null;
        }
        if (openBox === box) openBox = null;
        if (overlay) overlay.classList.remove('visible');
    }  

    function setPreview(desc, sentences) {
        const w = window.innerWidth;
        let count;
        if (w < 480) count = 1;
        else if (w < 768) count = 2;
        else count = 3;

        if (sentences.length > count) {
            const preview = sentences.slice(0, count).join('').trim() + '...';
            desc.dataset.preview = preview;
            if (!desc.closest('.project-box').classList.contains('expanded')) {
            desc.textContent = preview;
            }
        } else {
            desc.dataset.preview = desc.dataset.full;
            if (!desc.closest('.project-box').classList.contains('expanded')) {
            desc.textContent = desc.dataset.full;
            }
        }
    }

    function expand(box) {
        if (openBox && openBox !== box) collapse(openBox);

        const desc = box.querySelector('.project-desc');
        const rect = box.getBoundingClientRect();
        box.style.setProperty('--expand-width', `${rect.width * 2}px`);

        box._homeParent = box.parentNode;
        box._homeNextSibling = box.nextSibling;
        document.body.appendChild(box);

        box.classList.add('expanded');
        if (desc && desc.dataset.full) desc.textContent = desc.dataset.full;
        openBox = box;
        if (overlay) overlay.classList.add('visible');
    }

    const descSentenceMap = new Map();

    boxes.forEach((box) => {
        const desc = box.querySelector('.project-desc');

        if (desc) {
            const fullText = desc.textContent.trim();
            const sentences = fullText.match(/[^.!?]+[.!?]+(\s+|$)/g) || [fullText];
            desc.dataset.full = fullText;
            descSentenceMap.set(desc, sentences);
            setPreview(desc, sentences);
        }

        box.addEventListener('click', (e) => {
        if (e.target.closest('a')) return;
        box.classList.contains('expanded') ? collapse(box) : expand(box);
        });

        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                descSentenceMap.forEach((sentences, desc) => setPreview(desc, sentences));
            }, 150);
        });

        if (overlay) {
            overlay.addEventListener('click', () => {
            if (openBox) collapse(openBox);
            });
        }
    });

    // two projects at a time, moving on to the next pair every few seconds unless you're reading one
    const grid = document.querySelector('.projects-grid');
    if (grid) {
        const dots = document.createElement('div');
        dots.className = 'project-dots';
        const carousel = document.createElement('div');
        carousel.className = 'project-carousel';
        grid.before(carousel);
        carousel.appendChild(grid);
        const arrow = (dir, label, glyph) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'pn-arrow';
            b.setAttribute('aria-label', label);
            b.innerHTML = glyph;
            b.addEventListener('click', () => { go(page + dir); restart(); });
            return b;
        };
        const prev = arrow(-1, 'Previous projects', '&#8249;');
        const next = arrow(1, 'Next projects', '&#8250;');
        prev.classList.add('prev');
        next.classList.add('next');
        carousel.append(prev, next);
        dots.classList.add('project-nav');
        carousel.after(dots);
        let page = 0;
        let timer = null;
        const perView = () => (window.innerWidth <= 600 ? 1 : 2);
        const pageCount = () => Math.max(1, Math.ceil(grid.querySelectorAll('.project-box').length / perView()));
        const step = () => grid.clientWidth + parseFloat(getComputedStyle(grid).columnGap || 0);
        const mark = () => [...dots.children].forEach((d, i) => d.classList.toggle('on', i === page));
        function go(p) {
            const n = pageCount();
            page = (p + n) % n;
            grid.scrollTo({ left: page * step(), behavior: 'smooth' });
            mark();
        }
        function restart() {
            clearInterval(timer);
            timer = setInterval(() => {
                if (!grid.matches(':hover') && !openBox && document.getElementById('content')?.classList.contains('visible')) go(page + 1);
            }, 4000);
        }
        function buildDots() {
            dots.innerHTML = '';
            for (let i = 0; i < pageCount(); i++) {
                const b = document.createElement('button');
                b.type = 'button';
                b.setAttribute('aria-label', `Projects ${i * perView() + 1} to ${Math.min((i + 1) * perView(), grid.children.length)}`);
                b.addEventListener('click', () => { go(i); restart(); });
                dots.appendChild(b);
            }
            go(Math.min(page, pageCount() - 1));
        }
        // swiping by hand keeps the dots in step
        grid.addEventListener('scrollend', () => { page = Math.round(grid.scrollLeft / step()); mark(); });
        buildDots();
        restart();
        window.addEventListener('resize', buildDots);
    }

    window.hasOpenProject = () => !!openBox;
    window.collapseOpenProject = () => { if (openBox) collapse(openBox); };
})
