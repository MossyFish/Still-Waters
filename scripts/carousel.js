const carouselViewport = document.getElementById('carousel');
const carouselTrack = document.getElementById('carouselTrack');
let slides = [];
let slideIdx = 0;
let carouselTimer = null;

// sets full carousel size
function layoutCarousel() {
    const slideWidth = carouselViewport.clientWidth * 0.5;
    slides.forEach(slide => { slide.style.width = `${slideWidth}px`;});
    positionCarousel(false);
}

function positionCarousel(animate) {
    const viewportWidth = carouselViewport.clientWidth;
    const slideWidth = viewportWidth * 0.5;
    const offset = (viewportWidth * 0.25) - (slideIdx * slideWidth);
    carouselTrack.style.transition = animate ? '' : 'none';
    carouselTrack.style.transform = `translateX(${offset}px)`;
    slides.forEach((slide, i) => slide.classList.toggle('is-active', i === slideIdx));
}

function advanceCarousel() {
    if (slides.length < 2) return;
    slideIdx = (slideIdx + 1) % slides.length;
    positionCarousel(true);
}

// photo order
function buildSlides(photos) {
    carouselTrack.innerHTML = '';
    slides = photos.map(photo => {
        const slide = document.createElement('div');
        slide.className = 'slide';
        const img = document.createElement('img');
        img.src = photo.src;
        slide.appendChild(img);
        carouselTrack.appendChild(slide);
        return slide;
    });
    slideIdx = 0;
    layoutCarousel();
    clearInterval(carouselTimer);
    carouselTimer = setInterval(advanceCarousel, 5000);
}

fetch('tos.json')
.then(res => res.json())
.then(buildSlides)
.catch(err => console.error('Failed to load:', err));
    
window.addEventListener('resize', layoutCarousel);