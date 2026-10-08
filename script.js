// Split text into animated letters
document.querySelectorAll('[data-split]').forEach((el, block) => {
  const text = el.textContent;
  el.textContent = '';
  [...text].forEach((ch, i) => {
    const s = document.createElement('span');
    s.className = 'char';
    s.textContent = ch === ' ' ? '\u00A0' : ch;
    s.style.animationDelay = `${0.15 + block * 0.18 + i * 0.045}s`;
    el.appendChild(s);
  });
  // contact headline animates only when visible
  if (el.closest('.contact')) el.querySelectorAll('.char').forEach(c => (c.style.animationPlayState = 'paused'));
});

// Live Cairo clock
const clock = document.getElementById('clock');
const tick = () => {
  clock.textContent = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Cairo' }).format(new Date());
};
tick(); setInterval(tick, 30000);

// Scroll progress bar
const bar = document.getElementById('progress');
addEventListener('scroll', () => {
  const max = document.documentElement.scrollHeight - innerHeight;
  bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
}, { passive: true });

// Reveal + in-view triggers
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const t = e.target;
    if (t.classList.contains('card')) t.classList.add('in-view');
    else if (t.classList.contains('contact')) t.querySelectorAll('.char').forEach(c => (c.style.animationPlayState = 'running'));
    else t.classList.add('visible');
    if (t.dataset.count) countUp(t);
    io.unobserve(t);
  });
}, { threshold: 0.2 });
document.querySelectorAll('.reveal, .card, .contact').forEach(el => io.observe(el));

// Count-up GPA (observed through its tile)
function countUp(el) {
  const target = parseFloat(el.dataset.count);
  let start;
  const step = ts => {
    start ??= ts;
    const p = Math.min((ts - start) / 1500, 1);
    el.textContent = (target * (1 - Math.pow(1 - p, 4))).toFixed(2);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
document.querySelectorAll('[data-count]').forEach(el => io.observe(el));

// Custom cursor (desktop only)
const cursor = document.getElementById('cursor');
if (matchMedia('(hover: hover)').matches) {
  let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
  addEventListener('mousemove', e => { x = e.clientX; y = e.clientY; });
  (function loop() {
    cx += (x - cx) * 0.2; cy += (y - cy) * 0.2;
    cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
    requestAnimationFrame(loop);
  })();
  document.querySelectorAll('a, button, .tile, .tr').forEach(el => {
    el.addEventListener('mouseenter', () => cursor.classList.add('grow'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('grow'));
  });
}

// Magnetic contact button
const magnet = document.getElementById('magnet');
const big = document.getElementById('contact-email-big');
big.addEventListener('mousemove', e => {
  const r = magnet.getBoundingClientRect();
  const dx = e.clientX - (r.left + r.width / 2);
  const dy = e.clientY - (r.top + r.height / 2);
  magnet.style.transform = `translate(${dx * 0.25}px, ${dy * 0.25}px) rotate(-45deg)`;
});
big.addEventListener('mouseleave', () => (magnet.style.transform = ''));

document.getElementById('year').textContent = new Date().getFullYear();
