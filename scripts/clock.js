function updateClock() {
    const el = document.getElementById('liveClock');
    const now = new Date();
    el.textContent = now.toLocaleString(undefined, {
        weekday:'short', month:'long', day:'numeric',
        hour:'2-digit', minute:'2-digit', second:'2-digit'
    })
}
updateClock();
setInterval(updateClock, 1000);