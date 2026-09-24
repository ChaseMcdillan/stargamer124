/* ========== CONFIG ========== */
const API_KEY = window.RAWG_API_KEY;
const GAMES = window.GAMES_LIST;
const FALLBACKS = window.FALLBACK_DESCRIPTIONS;

/* ========== CUSTOM CURSOR ========== */
const cursor = document.querySelector('.cursor');
const follower = document.querySelector('.cursor-follower');
if (cursor && follower && window.matchMedia('(pointer: fine)').matches) {
  let mx = 0, my = 0, fx = 0, fy = 0;
  window.addEventListener('mousemove', (e) => {
    mx = e.clientX; my = e.clientY;
    cursor.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
  });
  function animate() {
    fx += (mx - fx) * 0.15;
    fy += (my - fy) * 0.15;
    follower.style.transform = `translate(${fx}px, ${fy}px) translate(-50%, -50%)`;
    requestAnimationFrame(animate);
  }
  animate();
  document.querySelectorAll('a, button, .game-card, .social-card').forEach(el => {
    el.addEventListener('mouseenter', () => follower.classList.add('hover'));
    el.addEventListener('mouseleave', () => follower.classList.remove('hover'));
  });
}

/* ========== NAV SCROLL ========== */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
});

/* ========== STAR CANVAS ========== */
const canvas = document.getElementById('stars');
const ctx = canvas.getContext('2d');
let stars = [];
function resizeStars() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  stars = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    z: Math.random() * 0.8 + 0.2,
    r: Math.random() * 1.4 + 0.2,
    tw: Math.random() * Math.PI * 2,
  }));
}
resizeStars();
window.addEventListener('resize', resizeStars);

function drawStars() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const t = Date.now() * 0.001;
  stars.forEach(s => {
    s.tw += 0.02;
    s.y -= s.z * 0.15;
    if (s.y < -5) { s.y = canvas.height + 5; s.x = Math.random() * canvas.width; }
    const alpha = 0.4 + Math.sin(s.tw) * 0.35;
    ctx.fillStyle = `rgba(196, 181, 253, ${alpha})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  });
  requestAnimationFrame(drawStars);
}
drawStars();

/* ========== SCROLL REVEAL STAGES ========== */
const stages = document.querySelectorAll('.reveal-stage');
function updateStages() {
  const rect = document.querySelector('.reveal').getBoundingClientRect();
  const total = rect.height - window.innerHeight;
  const progress = Math.min(Math.max(-rect.top / total, 0), 1);
  const idx = Math.min(Math.floor(progress * stages.length), stages.length - 1);
  stages.forEach((s, i) => s.classList.toggle('active', i === idx));
}
window.addEventListener('scroll', updateStages);
updateStages();

/* ========== FADE IN OBSERVER ========== */
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      if (e.target.classList.contains('stat')) animateCount(e.target.querySelector('.stat-num'));
    }
  });
}, { threshold: 0.15 });
document.querySelectorAll('.fade-in, .fade-in-up, .stat').forEach(el => io.observe(el));

/* ========== COUNTERS ========== */
function animateCount(el) {
  if (!el || el.dataset.done) return;
  el.dataset.done = '1';
  const target = parseInt(el.dataset.count, 10);
  const dur = 2000;
  const start = performance.now();
  function tick(now) {
    const t = Math.min((now - start) / dur, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    const val = Math.floor(target * eased);
    el.textContent = formatNum(val);
    if (t < 1) requestAnimationFrame(tick);
    else el.textContent = formatNum(target);
  }
  requestAnimationFrame(tick);
}
function formatNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

/* ========== RAWG CAROUSEL ========== */
const carousel = document.getElementById('carousel');
const dotsWrap = document.getElementById('dots');

async function fetchGame(name) {
  try {
    const searchRes = await fetch(`https://api.rawg.io/api/games?key=${API_KEY}&search=${encodeURIComponent(name)}&page_size=1`);
    const searchData = await searchRes.json();
    if (!searchData.results || !searchData.results.length) return null;

    const g = searchData.results[0];
    let description = FALLBACKS[name] || '';

    // Fetch full details for description
    try {
      const detailRes = await fetch(`https://api.rawg.io/api/games/${g.id}?key=${API_KEY}`);
      const detail = await detailRes.json();
      if (detail.description_raw && detail.description_raw.length > 20) {
        description = detail.description_raw.slice(0, 260).trim() + '…';
      }
    } catch (e) { /* keep fallback */ }

    return {
      name: g.name,
      cover: g.background_image,
      genres: (g.genres || []).slice(0, 2).map(x => x.name),
      released: g.released,
      description,
    };
  } catch (err) {
    console.warn('Failed for', name, err);
    return null;
  }
}

function makeCard(game, originalName) {
  const card = document.createElement('div');
  card.className = 'game-card';
  const cover = game?.cover || '';
  const title = game?.name || originalName;
  const desc = game?.description || FALLBACKS[originalName] || 'No description available.';
  const genre = game?.genres?.[0] || 'Game';

  card.innerHTML = `
    ${cover ? `<img class="game-cover" src="${cover}" alt="${title}" loading="lazy" onerror="this.style.display='none'">` : `<div class="game-cover"></div>`}
    <div class="game-body">
      <div class="game-meta"><span class="game-tag">${genre}</span></div>
      <h3 class="game-title">${title}</h3>
      <p class="game-desc">${desc}</p>
    </div>
  `;
  return card;
}

async function loadGames() {
  const results = await Promise.all(GAMES.map(g => fetchGame(g)));
  carousel.innerHTML = '';
  results.forEach((g, i) => carousel.appendChild(makeCard(g, GAMES[i])));
  buildDots();
  setTimeout(() => {
    document.querySelectorAll('.game-card').forEach(c => {
      c.addEventListener('mouseenter', () => follower?.classList.add('hover'));
      c.addEventListener('mouseleave', () => follower?.classList.remove('hover'));
    });
  }, 100);
}

function buildDots() {
  dotsWrap.innerHTML = '';
  const count = carousel.children.length;
  for (let i = 0; i < count; i++) {
    const d = document.createElement('span');
    d.className = 'dot' + (i === 0 ? ' active' : '');
    d.addEventListener('click', () => {
      const card = carousel.children[i];
      carousel.scrollTo({ left: card.offsetLeft - carousel.offsetLeft, behavior: 'smooth' });
    });
    dotsWrap.appendChild(d);
  }
}

document.querySelector('.carousel-btn.prev')?.addEventListener('click', () => {
  carousel.scrollBy({ left: -320, behavior: 'smooth' });
});
document.querySelector('.carousel-btn.next')?.addEventListener('click', () => {
  carousel.scrollBy({ left: 320, behavior: 'smooth' });
});
carousel.addEventListener('scroll', () => {
  const cards = [...carousel.children];
  const idx = Math.round(carousel.scrollLeft / 320);
  document.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('active', i === idx));
});

loadGames();

/* ========== LEGAL MODAL ========== */
const legalText = {
  privacy: `
    <h2>Privacy Policy</h2>
    <p>Last updated: 2025. This website is operated by Chase McDillan ("we", "us").</p>
    <h3>Information We Collect</h3>
    <p>This is a static informational website. We do not directly collect personal information. Third-party services used on this site (such as the RAWG API for game data) may log request data per their own privacy policies.</p>
    <h3>Third-Party Services</h3>
    <ul>
      <li>RAWG (rawg.io) — game data and cover images</li>
      <li>Google Fonts — typography</li>
      <li>Vercel — hosting</li>
    </ul>
    <h3>Contact</h3>
    <p>For privacy inquiries, contact the site owner, Chase McDillan.</p>
  `,
  terms: `
    <h2>Terms of Service</h2>
    <p>By accessing this website, you agree to these terms.</p>
    <h3>Content</h3>
    <p>All original content, design, and code on this site is © 2025 Chase McDillan. The name "Stargamer124" is the gaming alias of Matthew Yau. All game titles, cover art, and trademarks are the property of their respective owners and are used here for identification purposes only.</p>
    <h3>Use</h3>
    <p>You may view and share this site for personal, non-commercial purposes. You may not reproduce or redistribute its design or code without permission.</p>
    <h3>Third-Party Content</h3>
    <p>Game data is provided by RAWG. We are not responsible for the accuracy of third-party data.</p>
  `,
  cookies: `
    <h2>Cookie Notice</h2>
    <p>This site does not set first-party tracking cookies.</p>
    <h3>Third-Party Cookies</h3>
    <p>Embedded third-party services (such as RAWG, Google Fonts, or hosting providers) may set their own cookies. Please refer to their respective policies for details.</p>
    <h3>Managing Cookies</h3>
    <p>You can control or disable cookies through your browser settings.</p>
  `,
};

function openLegal(type) {
  document.getElementById('legalContent').innerHTML = legalText[type] || '';
  document.getElementById('legalModal').classList.add('open');
}
function closeLegal() {
  document.getElementById('legalModal').classList.remove('open');
}
document.getElementById('legalModal').addEventListener('click', (e) => {
  if (e.target.id === 'legalModal') closeLegal();
});
window.openLegal = openLegal;
window.closeLegal = closeLegal;

/* ========== MAGNETIC BUTTONS ========== */
document.querySelectorAll('.magnetic').forEach(btn => {
  btn.addEventListener('mousemove', (e) => {
    const r = btn.getBoundingClientRect();
    const x = e.clientX - r.left - r.width / 2;
    const y = e.clientY - r.top - r.height / 2;
    btn.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.transform = '';
  });
});