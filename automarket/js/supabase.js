/* =============================================
   AUTOMARKET — Configuración Supabase
   ¡CAMBIA ESTOS DOS VALORES con los tuyos!
   ============================================= */

const SUPABASE_URL  = 'https://noeknjgibzkywlnqultl.supabase.co';   // ← Reemplaza
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vZWtuamdpYnpreXdsbnF1bHRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MDAwMzEsImV4cCI6MjA4OTI3NjAzMX0.RjD0OiHQsAV5z-euVZTGJgmHoBB3pGlOwRdmEGPYzSo';                  // ← Reemplaza

/* ── Cómo obtener estos valores:
   1. Ve a https://supabase.com y crea un proyecto gratuito
   2. En el dashboard ve a: Settings → API
   3. Copia "Project URL"  → pégalo en SUPABASE_URL
   4. Copia "anon public"  → pégalo en SUPABASE_ANON
   ─────────────────────────────────────────────── */

// Cliente Supabase (se inicializa con la librería CDN)
let sb; // se asigna en DOMContentLoaded de cada página

function initSupabase() {
  sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
  return sb;
}

/* ── Credenciales de administradores ──────────
   Agrega hasta 5 admins. Cambia usuarios y contraseñas.
   IMPORTANTE: estas credenciales deben coincidir con
   los usuarios creados en Supabase Auth (ver README).
   ─────────────────────────────────────────────── */
const ADMINS = [
  { user: 'adminusados@specialcar.com.co', label: 'Admin' },/*UsadosSC2026*/
  { user: 'ceo@specialcar.com.co', label: 'Gerencia' },/*CeoSC2026*/
  { user: 'directortransporte@specialcar.com.co', label: 'SuperAdmin' },/*AdminSC2026*/
  // Agrega más si necesitas (hasta 5 recomendado)
];

// ─── Utilidades ────────────────────────────────
function formatPrice(n) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0
  }).format(n);
}
function formatKm(n) {
  return n === 0 ? '0 km' : new Intl.NumberFormat('es-CO').format(n) + ' km';
}
function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff/60000), h = Math.floor(m/60), d = Math.floor(h/24);
  if (d > 0)  return `hace ${d} día${d>1?'s':''}`;
  if (h > 0)  return `hace ${h} hora${h>1?'s':''}`;
  if (m > 0)  return `hace ${m} min`;
  return 'hace un momento';
}
function getEmoji(type) {
  return ({'Moto':'🏍️','SUV':'🚙','Camioneta':'🛻','Deportivo':'🏎️',
           'Eléctrico':'⚡','Camión':'🚛','Van':'🚐'})[type] || '🚗';
}
function uniqueSorted(arr) { return [...new Set(arr)].sort(); }

// Toast
let _toastTimer;
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = `toast toast-${type} show`;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 3800);
}

// Galería compartida
let _slideIdx = 0, _slideUrls = [];
function openGallery(urls, el) {
  _slideUrls = urls || []; _slideIdx = 0;
  if (!_slideUrls.length) {
    el.innerHTML = `<div class="gallery-no-img">🚗</div>`; return;
  }
  el.innerHTML =
    _slideUrls.map((src,i) =>
      `<div class="gallery-slide ${i===0?'active':''}">
        <img src="${src}" alt="Foto ${i+1}" loading="lazy"/>
       </div>`
    ).join('') +
    (_slideUrls.length > 1
      ? `<button class="g-arrow prev" onclick="changeSlide(-1)">‹</button>
         <button class="g-arrow next" onclick="changeSlide(1)">›</button>
         <div class="g-dots">${_slideUrls.map((_,i)=>
           `<button class="g-dot ${i===0?'active':''}" onclick="goSlide(${i})"></button>`
         ).join('')}</div>` : '');
}
function changeSlide(dir) { goSlide((_slideIdx+dir+_slideUrls.length)%_slideUrls.length); }
function goSlide(n) {
  _slideIdx = n;
  document.querySelectorAll('.gallery-slide').forEach((s,i)=>s.classList.toggle('active',i===n));
  document.querySelectorAll('.g-dot').forEach((d,i)=>d.classList.toggle('active',i===n));
}

// Spinner de carga
function showSpinner(msg='Cargando...') {
  let s = document.getElementById('globalSpinner');
  if (!s) {
    s = document.createElement('div');
    s.id = 'globalSpinner';
    s.innerHTML = `<div class="spinner-box"><div class="spinner"></div><p>${msg}</p></div>`;
    s.style.cssText = 'position:fixed;inset:0;background:rgba(26,47,110,.45);z-index:999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(3px)';
    document.body.appendChild(s);
  } else {
    s.querySelector('p').textContent = msg;
    s.style.display = 'flex';
  }
}
function hideSpinner() {
  const s = document.getElementById('globalSpinner');
  if (s) s.style.display = 'none';
}
