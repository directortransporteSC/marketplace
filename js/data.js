/* =============================================
   AUTOMARKET — Datos compartidos & utilidades
   ============================================= */

'use strict';

// ─── Credenciales admin (cambia aquí) ─────────
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'automarket2024';

// ─── Estado global ─────────────────────────────
let vehicles  = [];
let favorites = new Set();

// ─── Datos de ejemplo ──────────────────────────
const SAMPLE_VEHICLES = [
  {
    id: 1, brand: 'Toyota', model: 'Corolla', year: 2022, price: 72000000,
    type: 'Sedán', condition: 'Usado', km: 28000, fuel: 'Gasolina',
    trans: 'Automática', color: 'Blanco', engine: '2.0L',
    city: 'Bogotá', contact: '3001234567', email: 'carlos@email.com',
    seller: 'Carlos Martínez',
    desc: 'Excelente estado, único dueño. Mantenimientos al día en concesionario oficial. Vidrios eléctricos, cámara de reversa, control crucero. SOAT y tecnomecánica vigente.',
    images: [], date: Date.now() - 86400000 * 3
  },
  {
    id: 2, brand: 'Chevrolet', model: 'Spark GT', year: 2023, price: 52000000,
    type: 'Sedán', condition: 'Nuevo', km: 0, fuel: 'Gasolina',
    trans: 'Manual', color: 'Rojo', engine: '1.2L',
    city: 'Medellín', contact: '3109876543', email: 'ventas@autocenter.com',
    seller: 'AutoCenter Medellín',
    desc: '0 kilómetros directo de agencia. Garantía de fábrica 3 años. Aire acondicionado, bluetooth, pantalla táctil 7". Entrega inmediata con papeles al día.',
    images: [], date: Date.now() - 86400000 * 1
  },
  {
    id: 3, brand: 'BMW', model: '320i', year: 2021, price: 145000000,
    type: 'Sedán', condition: 'Usado', km: 42000, fuel: 'Gasolina',
    trans: 'Automática', color: 'Negro', engine: '2.0L Turbo',
    city: 'Bogotá', contact: '3152223344', email: 'premium@bmwcars.co',
    seller: 'Premium Cars',
    desc: 'BMW Serie 3 en perfectas condiciones. Rines 18", cuero, techo panorámico, GPS. SOAT y tecnomecánica al día. Primer dueño, historial completo de mantenimiento.',
    images: [], date: Date.now() - 86400000 * 5
  },
  {
    id: 4, brand: 'Renault', model: 'Duster', year: 2022, price: 68000000,
    type: 'SUV', condition: 'Usado', km: 35000, fuel: 'Gasolina',
    trans: 'Automática', color: 'Gris', engine: '1.6L',
    city: 'Cali', contact: '3223344556', email: 'juanp@correo.com',
    seller: 'Juan Pablo Rivera',
    desc: 'Renault Duster 4x2. Cámara de reversa, sensores de parqueo, pantalla táctil 7". Sin rayones, excelente mecánica, negociable.',
    images: [], date: Date.now() - 86400000 * 2
  },
  {
    id: 5, brand: 'Honda', model: 'CB500F', year: 2023, price: 28000000,
    type: 'Moto', condition: 'Nuevo', km: 500, fuel: 'Gasolina',
    trans: 'Manual', color: 'Azul', engine: '471cc',
    city: 'Barranquilla', contact: '3004455667', email: 'motos@hondacaribe.com',
    seller: 'Moto Honda Caribe',
    desc: 'Moto naked de media cilindrada perfecta para ciudad y carretera. ABS de serie, instrumentación digital, excelente consumo. Garantía de fábrica.',
    images: [], date: Date.now() - 86400000 * 7
  },
  {
    id: 6, brand: 'Mazda', model: 'CX-5', year: 2022, price: 112000000,
    type: 'SUV', condition: 'Usado', km: 22000, fuel: 'Gasolina',
    trans: 'Automática', color: 'Azul Marino', engine: '2.5L Skyactiv',
    city: 'Bogotá', contact: '3156677889', email: 'diego.r@gmail.com',
    seller: 'Diego Rodríguez',
    desc: 'Mazda CX-5 Grand Touring. Cuero, head-up display, i-Activsense, AWD. Primer dueño con factura original. Estado impecable.',
    images: [], date: Date.now() - 86400000 * 4
  },
  {
    id: 7, brand: 'Ford', model: 'Escape', year: 2021, price: 95000000,
    type: 'SUV', condition: 'Usado', km: 38000, fuel: 'Híbrido',
    trans: 'Automática', color: 'Blanco', engine: '2.5L Híbrido',
    city: 'Pereira', contact: '3168899001', email: 'autoford@eje.com',
    seller: 'AutoFord Eje Cafetero',
    desc: 'Ford Escape Híbrido. Excelente economía de combustible. SYNC 4, Apple CarPlay, asientos de cuero, cámara 360°. Perfecto estado.',
    images: [], date: Date.now() - 86400000 * 6
  },
  {
    id: 8, brand: 'Kia', model: 'Sportage', year: 2023, price: 118000000,
    type: 'SUV', condition: 'Nuevo', km: 0, fuel: 'Gasolina',
    trans: 'Automática', color: 'Plata', engine: '1.6L Turbo',
    city: 'Bogotá', contact: '3001122334', email: 'kia@motorsbogota.com',
    seller: 'Kia Motors Bogotá',
    desc: 'Kia Sportage GT-Line 0km. Pantalla doble curva, cámara 360°, techo panorámico. Garantía 5 años. Directo de concesionario oficial.',
    images: [], date: Date.now() - 86400000 * 0.5
  }
];

// ─── Persistencia ──────────────────────────────
function saveData() {
  try {
    localStorage.setItem('automarket_v3', JSON.stringify({
      vehicles, favorites: [...favorites]
    }));
  } catch(e) {}
}

function loadData() {
  try {
    const raw = localStorage.getItem('automarket_v3');
    if (raw) {
      const d = JSON.parse(raw);
      vehicles  = d.vehicles  || [];
      favorites = new Set(d.favorites || []);
      return;
    }
  } catch(e) {}
  vehicles  = [...SAMPLE_VEHICLES];
  favorites = new Set();
  saveData();
}

// ─── Utilidades ────────────────────────────────
function formatPrice(n) {
  return new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', maximumFractionDigits:0 }).format(n);
}
function formatKm(n) {
  return n === 0 ? '0 km' : new Intl.NumberFormat('es-CO').format(n) + ' km';
}
function timeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff/60000), h = Math.floor(m/60), d = Math.floor(h/24);
  if (d > 0)  return `hace ${d} día${d  > 1 ? 's' : ''}`;
  if (h > 0)  return `hace ${h} hora${h > 1 ? 's' : ''}`;
  if (m > 0)  return `hace ${m} min`;
  return 'hace un momento';
}
function getEmoji(type) {
  return ({ 'Moto':'🏍️','SUV':'🚙','Camioneta':'🛻','Deportivo':'🏎️',
            'Eléctrico':'⚡','Camión':'🚛','Van':'🚐' })[type] || '🚗';
}
function uniqueSorted(arr) { return [...new Set(arr)].sort(); }

// ─── Toast ─────────────────────────────────────
let _toastTimer;
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = `toast toast-${type} show`;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
}

// ─── Galería compartida ────────────────────────
let _slideIdx = 0, _slideImgs = [];
function openGallery(imgs, galleryEl) {
  _slideImgs = imgs || []; _slideIdx = 0;
  if (!_slideImgs.length) {
    galleryEl.innerHTML = `<div class="gallery-no-img">🚗</div>`;
    return;
  }
  galleryEl.innerHTML =
    _slideImgs.map((src,i) =>
      `<div class="gallery-slide ${i===0?'active':''}">
        <img src="${src}" alt="Foto ${i+1}" loading="lazy"/>
       </div>`
    ).join('') +
    (_slideImgs.length > 1
      ? `<button class="g-arrow prev" onclick="changeSlide(-1)">‹</button>
         <button class="g-arrow next" onclick="changeSlide(1)">›</button>
         <div class="g-dots">${_slideImgs.map((_,i)=>
           `<button class="g-dot ${i===0?'active':''}" onclick="goSlide(${i})"></button>`
         ).join('')}</div>`
      : '');
}
function changeSlide(dir) { goSlide((_slideIdx + dir + _slideImgs.length) % _slideImgs.length); }
function goSlide(n) {
  _slideIdx = n;
  document.querySelectorAll('.gallery-slide').forEach((s,i) => s.classList.toggle('active', i===n));
  document.querySelectorAll('.g-dot').forEach((d,i)         => d.classList.toggle('active', i===n));
}
