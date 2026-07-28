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
        if (w < 480) count = 1;
        if (w < 768) count = 2;
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

        window.hasOpenProject = () => !!openBox;
        window.collapseOpenProject = () => { if (openBox) collapse(openBox); };
    });
})
