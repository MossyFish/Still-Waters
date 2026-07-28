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

  boxes.forEach((box) => {
    const desc = box.querySelector('.project-desc');

    if (desc) {
      const fullText = desc.textContent.trim();
      const sentences = fullText.match(/[^.!?]+[.!?]+(\s+|$)/g) || [fullText];

      if (sentences.length > 2) {
        const preview = sentences.slice(0, 2).join('').trim() + '...';
        desc.dataset.full = fullText;
        desc.dataset.preview = preview;
        desc.textContent = preview;
      }
    }

    box.addEventListener('click', (e) => {
      if (e.target.closest('a')) return;
      box.classList.contains('expanded') ? collapse(box) : expand(box);
    });
  });

  if (overlay) {
    overlay.addEventListener('click', () => {
      if (openBox) collapse(openBox);
    });
  }

  window.hasOpenProject = () => !!openBox;
  window.collapseOpenProject = () => { if (openBox) collapse(openBox); };
});
