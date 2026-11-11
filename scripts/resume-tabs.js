// resumes as tabs: pick a version and the first page of that PDF shows underneath, drawn with
// pdf.js so it looks like a page of paper rather than a browser PDF viewer
(() => {
    const tabs = document.querySelector('.resume-tabs');
    const preview = document.getElementById('resumePreview');
    if (!tabs || !preview || !window.pdfjsLib) return;
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const canvas = preview.querySelector('canvas');
    const ripple = tabs.querySelector('.rt-ripple');
    const buttons = [...tabs.querySelectorAll('button')];
    const pages = new Map();
    let current = null;

    function moveRipple(btn) {
        ripple.style.left = `${btn.offsetLeft}px`;
        ripple.style.width = `${btn.offsetWidth}px`;
    }

    async function render(key) {
        if (!pages.has(key)) {
            pages.set(key, pdfjsLib.getDocument(`resume/versions/${key}.pdf`).promise.then(doc => doc.getPage(1)));
        }
        const page = await pages.get(key);
        if (current !== key) return;
        const width = preview.clientWidth;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const viewport = page.getViewport({ scale: width / page.getViewport({ scale: 1 }).width * dpr });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${width}px`;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        preview.classList.remove('turning');
    }

    function select(btn) {
        const key = btn.dataset.key;
        if (key === current) return;
        current = key;
        buttons.forEach(b => b.setAttribute('aria-selected', String(b === btn)));
        moveRipple(btn);
        preview.href = `/resume/#${key}`;
        preview.classList.add('turning');
        setTimeout(() => render(key), 180);
    }

    buttons.forEach(b => b.addEventListener('click', () => select(b)));
    tabs.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        const i = buttons.findIndex(b => b.dataset.key === current);
        const next = buttons[(i + (e.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length];
        next.focus();
        select(next);
    });
    window.addEventListener('resize', () => { const b = buttons.find(x => x.dataset.key === current); if (b) { moveRipple(b); render(current); } });

    select(buttons[0]);
})();
