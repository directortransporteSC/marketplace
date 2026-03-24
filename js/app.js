/* =============================================
   AUTOMARKET — Lógica principal
   ============================================= */

'use strict';

// ─── Estado global ───────────────────────────
let vehicles   = [];
let filtered   = [];
let favorites  = new Set();
let currentImages = [];
let editId     = null;
let orderBy    = 'reciente';
let yearFilter = '';
let priceMin   = 0;
let priceMax   = 9999999999;
let viewMode   = 'grid';
let showFavs   = false;
let detailSlideIndex = 0;
let detailImages = [];

// ─── Datos de ejemplo ────────────────────────
const SAMPLE_VEHICLES = [
  {
    id: 1,
    brand: 'Toyota', model: 'Corolla', year: 2022, price: 72000000,
    type: 'Sedán', condition: 'Usado', km: 28000,
    fuel: 'Gasolina', trans: 'Automática', color: 'Blanco',
    engine: '2.0L', city: 'Bogotá', contact: '3001234567',
    seller: 'Carlos Martínez',
    desc: 'Excelente estado, único dueño. Mantenimientos al día en concesionario oficial. Vidrios eléctricos, cámara de reversa, control crucero. SOAT y tecnomecánica al día.',
    images: [], date: Date.now() - 86400000 * 3
  },
  {
    id: 2,
    brand: 'Chevrolet', model: 'Spark GT', year: 2023, price: 52000000,
    type: 'Sedán', condition: 'Nuevo', km: 0,
    fuel: 'Gasolina', trans: 'Manual', color: 'Rojo',
    engine: '1.2L', city: 'Medellín', contact: '3109876543',
    seller: 'AutoCenter Medellín',
    desc: '0 kilómetros directo de agencia. Garantía de fábrica 3 años. Aire acondicionado, bluetooth, pantalla táctil 7". Entrega inmediata.',
    images: [], date: Date.now() - 86400000 * 1
  },
  {
    id: 3,
    brand: 'BMW', model: '320i', year: 2021, price: 145000000,
    type: 'Sedán', condition: 'Usado', km: 42000,
    fuel: 'Gasolina', trans: 'Automática', color: 'Negro',
    engine: '2.0L Turbo', city: 'Bogotá', contact: '3152223344',
    seller: 'Premium Cars',
    desc: 'BMW Serie 3 en perfectas condiciones. Rines 18", asientos de cuero, techo panorámico, navegación GPS. SOAT y revisión tecnomecánica al día. Primer dueño.',
    images: [], date: Date.now() - 86400000 * 5
  },
  {
    id: 4,
    brand: 'Renault', model: 'Duster', year: 2022, price: 68000000,
    type: 'SUV', condition: 'Usado', km: 35000,
    fuel: 'Gasolina', trans: 'Automática', color: 'Gris',
    engine: '1.6L', city: 'Cali', contact: '3223344556',
    seller: 'Juan Pablo Rivera',
    desc: 'Renault Duster 4x2, excelente para ciudad y carretera. Cámara de reversa, sensores de parqueo, pantalla táctil 7 pulgadas. Sin rayones.',
    images: [], date: Date.now() - 86400000 * 2
  },
  {
    id: 5,
    brand: 'Honda', model: 'CB500F', year: 2023, price: 28000000,
    type: 'Moto', condition: 'Nuevo', km: 500,
    fuel: 'Gasolina', trans: 'Manual', color: 'Azul',
    engine: '471cc', city: 'Barranquilla', contact: '3004455667',
    seller: 'Moto Honda Caribe',
    desc: 'Moto naked de media cilindrada, perfecta para ciudad y carretera. ABS de serie, instrumentación digital, excelente consumo de combustible.',
    images: [], date: Date.now() - 86400000 * 7
  },
  {
    id: 6,
    brand: 'Mazda', model: 'CX-5', year: 2022, price: 112000000,
    type: 'SUV', condition: 'Usado', km: 22000,
    fuel: 'Gasolina', trans: 'Automática', color: 'Azul Marino',
    engine: '2.5L Skyactiv', city: 'Bogotá', contact: '3156677889',
    seller: 'Diego Rodríguez',
    desc: 'Mazda CX-5 Grand Touring en impecable estado. Cuero, head-up display, i-Activsense, AWD. Primer dueño, factura de compra original.',
    images: [], date: Date.now() - 86400000 * 4
  },
  {
    id: 7,
    brand: 'Ford', model: 'Escape', year: 2021, price: 95000000,
    type: 'SUV', condition: 'Usado', km: 38000,
    fuel: 'Híbrido', trans: 'Automática', color: 'Blanco',
    engine: '2.5L Híbrido', city: 'Pereira', contact: '3168899001',
    seller: 'AutoFord Eje',
    desc: 'Ford Escape Híbrido. Excelente economía de combustible. Pantalla SYNC 4, Apple CarPlay/Android Auto, asientos de cuero, cámara 360°.',
    images: [], date: Date.now() - 86400000 * 6
  },
  {
    id: 8,
    brand: 'Kia', model: 'Sportage', year: 2023, price: 118000000,
    type: 'SUV', condition: 'Nuevo', km: 0,
    fuel: 'Gasolina', trans: 'Automática', color: 'Plata',
    engine: '1.6L Turbo', city: 'Bogotá', contact: '3001122334',
    seller: 'Kia Motors Bogotá',
    desc: 'Kia Sportage GT-Line 0km, directo de concesionario. Pantalla doble curva, cámara 360°, sensores, techo panorámico. Garantía 5 años.',
    images: [], date: Date.now() - 86400000 * 0.5
  }
];

// ─── Persistencia ─────────────────────────────
function saveData() {
  try {
    localStorage.setItem('automarket_data', JSON.stringify({
      vehicles,
      favorites: [...favorites]
    }));
  } catch (e) {
    console.warn('No se pudo guardar en localStorage:', e);
  }
}

function loadData() {
  try {
    const raw = localStorage.getItem('automarket_data');
    if (raw) {
      const d = JSON.parse(raw);
      vehicles  = d.vehicles  || [];
      favorites = new Set(d.favorites || []);
    }
  } catch (e) {
    vehicles  = [];
    favorites = new Set();
  }
  if (!vehicles.length) {
    vehicles = SAMPLE_VEHICLES;
    saveData();
  }
}

// ─── Utilidades ───────────────────────────────
function formatPrice(n) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(n);
}

function formatKm(n) {
  if (n === 0) return '0 km';
  return new Intl.NumberFormat('es-CO').format(n) + ' km';
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const min  = Math.floor(diff / 60000);
  const hr   = Math.floor(min  / 60);
  const day  = Math.floor(hr   / 24);
  if (day  > 0) return `hace ${day}  día${day  > 1 ? 's' : ''}`;
  if (hr   > 0) return `hace ${hr}   hora${hr   > 1 ? 's' : ''}`;
  if (min  > 0) return `hace ${min}  min`;
  return 'hace un momento';
}

function getEmoji(type) {
  const map = {
    'Moto': '🏍️', 'SUV': '🚙', 'Camioneta': '🛻',
    'Deportivo': '🏎️', 'Eléctrico': '⚡', 'Camión': '🚛', 'Van': '🚐'
  };
  return map[type] || '🚗';
}

function unique(arr) {
  return [...new Set(arr)].sort();
}

// ─── Filtros & Render ──────────────────────────
function applyFilters() {
  const q      = (document.getElementById('searchInput').value || '').toLowerCase().trim();
  const brand  = document.getElementById('brandFilter').value;
  const type   = document.getElementById('typeFilter').value;

  let list = showFavs ? vehicles.filter(v => favorites.has(v.id)) : vehicles;

  filtered = list.filter(v => {
    const hay   = `${v.brand} ${v.model} ${v.year} ${v.city || ''} ${v.type || ''} ${v.color || ''}`.toLowerCase();
    const matchQ     = !q     || hay.includes(q);
    const matchBrand = !brand || v.brand === brand;
    const matchType  = !type  || v.type  === type;
    const matchYear  = !yearFilter || (
      yearFilter === '2010' ? v.year <= 2010 : v.year >= parseInt(yearFilter)
    );
    const matchPrice = v.price >= priceMin && v.price <= priceMax;
    return matchQ && matchBrand && matchType && matchYear && matchPrice;
  });

  // Ordenar
  if      (orderBy === 'precio_asc')  filtered.sort((a, b) => a.price - b.price);
  else if (orderBy === 'precio_desc') filtered.sort((a, b) => b.price - a.price);
  else if (orderBy === 'km')          filtered.sort((a, b) => a.km - b.km);
  else                                filtered.sort((a, b) => b.date - a.date);

  renderGrid();
  updateBrandFilter();
  updateStats();
}

function setOrder(val, el) {
  orderBy = val;
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  applyFilters();
}

function setYear(val)  { yearFilter = val; applyFilters(); }

function setPrice(val) {
  if (!val) { priceMin = 0; priceMax = 9999999999; }
  else {
    const [a, b] = val.split('-');
    priceMin = parseInt(a);
    priceMax = parseInt(b);
  }
  applyFilters();
}

function setView(val, el) {
  viewMode = val;
  document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  applyFilters();
}

function toggleFavFilter() {
  showFavs = !showFavs;
  const btn = document.getElementById('favFilterBtn');
  btn.textContent = showFavs ? '♥ Ver todos' : '♡ Favoritos';
  btn.classList.toggle('btn-primary', showFavs);
  btn.classList.toggle('btn-ghost', !showFavs);
  document.getElementById('sectionTitle').textContent = showFavs ? 'Mis favoritos' : 'Todos los vehículos';
  applyFilters();
}

function updateBrandFilter() {
  const sel  = document.getElementById('brandFilter');
  const curr = sel.value;
  const brands = unique(vehicles.map(v => v.brand));
  sel.innerHTML = '<option value="">Todas las marcas</option>';
  brands.forEach(b => {
    const opt = document.createElement('option');
    opt.value = b;
    opt.textContent = b;
    sel.appendChild(opt);
  });
  sel.value = curr;
}

function updateStats() {
  const count = document.getElementById('resultsCount');
  if (count) {
    count.innerHTML = `<strong>${filtered.length}</strong> vehículo${filtered.length !== 1 ? 's' : ''}`;
  }
  const navCount = document.getElementById('navCount');
  if (navCount) {
    navCount.innerHTML = `<strong>${vehicles.length}</strong> vehículos publicados`;
  }
}

// ─── Render de tarjetas ────────────────────────
function renderGrid() {
  const container = document.getElementById('vehicleContainer');
  const empty     = document.getElementById('emptyState');

  if (!filtered.length) {
    container.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  const isListMode = viewMode === 'list';
  container.className = isListMode ? 'vehicle-list' : 'vehicle-grid';

  container.innerHTML = filtered.map(v => buildCard(v, isListMode)).join('');
}

function buildCard(v, isList) {
  const isFav = favorites.has(v.id);
  const imgHtml = v.images && v.images.length
    ? `<div class="v-card-image">
        <img src="${v.images[0]}" alt="${v.brand} ${v.model}" loading="lazy"/>
        ${v.images.length > 1 ? `<span class="v-card-count">📷 ${v.images.length}</span>` : ''}
       </div>`
    : `<div class="v-card-image">
        <div class="v-card-no-img">${getEmoji(v.type)}<span>Sin fotos</span></div>
       </div>`;

  return `
  <div class="v-card" onclick="openDetail(${v.id})">
    <div style="position:relative">
      ${imgHtml}
      <span class="v-card-badge ${v.condition === 'Nuevo' ? 'badge-new' : 'badge-used'}">${v.condition}</span>
      <button class="v-card-fav ${isFav ? 'active' : ''}"
        onclick="event.stopPropagation(); toggleFav(${v.id}, this)"
        title="${isFav ? 'Quitar de favoritos' : 'Guardar en favoritos'}">
        ${isFav ? '♥' : '♡'}
      </button>
    </div>
    <div class="v-card-body">
      <div class="v-card-header">
        <div class="v-card-title">${v.brand} ${v.model}</div>
        <span class="v-card-year">${v.year}</span>
      </div>
      <div class="v-card-location">📍 ${v.city || 'Colombia'}</div>
      <div class="v-price">${formatPrice(v.price)}</div>
      <div class="v-specs">
        ${v.km !== undefined ? `<span class="spec-tag">🛣 ${formatKm(v.km)}</span>` : ''}
        ${v.fuel  ? `<span class="spec-tag">⛽ ${v.fuel}</span>`  : ''}
        ${v.trans ? `<span class="spec-tag">⚙️ ${v.trans}</span>` : ''}
        ${v.type  ? `<span class="spec-tag">${getEmoji(v.type)} ${v.type}</span>` : ''}
      </div>
      <div class="v-card-footer">
        <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); editVehicle(${v.id})">✏️ Editar</button>
        <button class="btn btn-danger-sm" onclick="event.stopPropagation(); deleteVehicle(${v.id})">🗑 Eliminar</button>
      </div>
    </div>
  </div>`;
}

// ─── Favoritos ─────────────────────────────────
function toggleFav(id, btn) {
  if (favorites.has(id)) {
    favorites.delete(id);
    if (btn) { btn.textContent = '♡'; btn.classList.remove('active'); }
  } else {
    favorites.add(id);
    if (btn) { btn.textContent = '♥'; btn.classList.add('active'); }
  }
  saveData();
  if (showFavs) applyFilters();
}

// ─── Modal Agregar / Editar ────────────────────
function openAddModal() {
  editId = null;
  currentImages = [];
  clearForm();
  document.getElementById('modalTitle').textContent = '🚗 Publicar vehículo';
  document.getElementById('addModal').classList.add('open');
}

function closeAddModal() {
  document.getElementById('addModal').classList.remove('open');
}

function editVehicle(id) {
  const v = vehicles.find(x => x.id === id);
  if (!v) return;

  editId = id;
  currentImages = v.images ? [...v.images] : [];
  document.getElementById('modalTitle').textContent = '✏️ Editar vehículo';

  const fields = {
    'f-brand': v.brand, 'f-model': v.model, 'f-year': v.year,
    'f-price': v.price, 'f-type': v.type, 'f-condition': v.condition,
    'f-km': v.km, 'f-fuel': v.fuel, 'f-trans': v.trans,
    'f-color': v.color, 'f-engine': v.engine, 'f-city': v.city,
    'f-contact': v.contact, 'f-seller': v.seller, 'f-desc': v.desc
  };
  Object.entries(fields).forEach(([k, val]) => {
    const el = document.getElementById(k);
    if (el) el.value = val || '';
  });

  renderImagePreview();
  document.getElementById('addModal').classList.add('open');
}

function clearForm() {
  const ids = ['f-brand','f-model','f-year','f-price','f-km','f-color',
                'f-engine','f-city','f-contact','f-seller','f-desc'];
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('f-type').value = '';
  document.getElementById('f-condition').value = 'Usado';
  document.getElementById('f-fuel').value = 'Gasolina';
  document.getElementById('f-trans').value = 'Automática';
  document.getElementById('imgPreview').innerHTML = '';
}

function handleImages(e) {
  const files = [...e.target.files];
  if (currentImages.length + files.length > 12) {
    showToast('Máximo 12 fotos por anuncio', 'error');
    return;
  }
  const toasts = [];
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = ev => {
      currentImages.push(ev.target.result);
      renderImagePreview();
    };
    reader.readAsDataURL(file);
  });
}

function renderImagePreview() {
  const wrap = document.getElementById('imgPreview');
  wrap.innerHTML = currentImages.map((src, i) => `
    <div class="img-preview-item ${i === 0 ? 'main-img' : ''}">
      <img src="${src}" alt="Foto ${i + 1}"/>
      <button class="remove-img" onclick="removeImage(${i})">✕</button>
    </div>`
  ).join('');
}

function removeImage(i) {
  currentImages.splice(i, 1);
  renderImagePreview();
}

function saveVehicle() {
  const brand = document.getElementById('f-brand').value.trim();
  const model = document.getElementById('f-model').value.trim();
  const year  = parseInt(document.getElementById('f-year').value);
  const price = parseInt(document.getElementById('f-price').value);

  if (!brand || !model || !year || !price) {
    showToast('Completa los campos obligatorios (marca, modelo, año, precio)', 'error');
    return;
  }
  if (year < 1980 || year > new Date().getFullYear() + 1) {
    showToast('Ingresa un año válido', 'error');
    return;
  }
  if (price < 100000) {
    showToast('Ingresa un precio válido en COP', 'error');
    return;
  }

  const v = {
    id:        editId || Date.now(),
    brand, model, year, price,
    type:      document.getElementById('f-type').value,
    condition: document.getElementById('f-condition').value,
    km:        parseInt(document.getElementById('f-km').value) || 0,
    fuel:      document.getElementById('f-fuel').value,
    trans:     document.getElementById('f-trans').value,
    color:     document.getElementById('f-color').value.trim(),
    engine:    document.getElementById('f-engine').value.trim(),
    city:      document.getElementById('f-city').value.trim(),
    contact:   document.getElementById('f-contact').value.trim(),
    seller:    document.getElementById('f-seller').value.trim(),
    desc:      document.getElementById('f-desc').value.trim(),
    images:    currentImages,
    date:      editId ? (vehicles.find(x => x.id === editId) || {}).date || Date.now() : Date.now()
  };

  if (editId) {
    const idx = vehicles.findIndex(x => x.id === editId);
    if (idx > -1) vehicles[idx] = v;
  } else {
    vehicles.unshift(v);
  }

  saveData();
  applyFilters();
  closeAddModal();
  showToast(editId ? '✓ Vehículo actualizado' : '✓ ¡Anuncio publicado exitosamente!', 'success');
}

function deleteVehicle(id) {
  const v = vehicles.find(x => x.id === id);
  if (!v) return;
  if (!confirm(`¿Eliminar el anuncio de ${v.brand} ${v.model} ${v.year}?`)) return;
  vehicles = vehicles.filter(x => x.id !== id);
  favorites.delete(id);
  saveData();
  applyFilters();
  showToast('Anuncio eliminado', 'success');
}

// ─── Modal Detalle ─────────────────────────────
function openDetail(id) {
  const v = vehicles.find(x => x.id === id);
  if (!v) return;

  detailImages    = v.images && v.images.length ? v.images : [];
  detailSlideIndex = 0;

  // Galería
  const gallery = document.getElementById('detailGallery');
  if (detailImages.length) {
    gallery.innerHTML =
      detailImages.map((src, i) =>
        `<div class="gallery-slide ${i === 0 ? 'active' : ''}">
          <img src="${src}" alt="Foto ${i + 1}"/>
         </div>`
      ).join('') +
      (detailImages.length > 1
        ? `<button class="gallery-arrow prev" onclick="changeSlide(-1)">‹</button>
           <button class="gallery-arrow next" onclick="changeSlide(1)">›</button>
           <div class="gallery-dots">${detailImages.map((_, i) =>
             `<button class="gallery-dot ${i === 0 ? 'active' : ''}" onclick="goSlide(${i})"></button>`
           ).join('')}</div>`
        : ''
      );
  } else {
    gallery.innerHTML = `<div class="gallery-no-img">${getEmoji(v.type)}</div>`;
  }

  // Contenido
  document.getElementById('detailContent').innerHTML = `
    <div class="detail-top">
      <div>
        <div class="detail-title">${v.brand} ${v.model} ${v.year}</div>
        <div class="detail-sub">
          📍 ${v.city || 'Colombia'} &nbsp;·&nbsp;
          🕐 Publicado ${timeAgo(v.date)}
          ${v.seller ? ` &nbsp;·&nbsp; 👤 ${v.seller}` : ''}
        </div>
      </div>
      <span class="v-card-badge ${v.condition === 'Nuevo' ? 'badge-new' : 'badge-used'}" style="white-space:nowrap">${v.condition}</span>
    </div>

    <div class="detail-price">${formatPrice(v.price)}</div>

    <div class="detail-specs">
      ${v.km !== undefined ? `<div class="detail-spec"><div class="spec-label">Kilometraje</div><div class="spec-val">${formatKm(v.km)}</div></div>` : ''}
      ${v.fuel   ? `<div class="detail-spec"><div class="spec-label">Combustible</div><div class="spec-val">${v.fuel}</div></div>` : ''}
      ${v.trans  ? `<div class="detail-spec"><div class="spec-label">Transmisión</div><div class="spec-val">${v.trans}</div></div>` : ''}
      ${v.engine ? `<div class="detail-spec"><div class="spec-label">Motor</div><div class="spec-val">${v.engine}</div></div>` : ''}
      ${v.color  ? `<div class="detail-spec"><div class="spec-label">Color</div><div class="spec-val">${v.color}</div></div>` : ''}
      ${v.type   ? `<div class="detail-spec"><div class="spec-label">Tipo</div><div class="spec-val">${v.type}</div></div>` : ''}
    </div>

    ${v.desc ? `<div class="detail-desc">${v.desc.replace(/\n/g, '<br>')}</div>` : ''}

    <div class="contact-card">
      <div class="contact-info">
        <div class="contact-name">${v.seller || 'Vendedor'}</div>
        <div class="contact-phone">${v.contact || 'Sin número de contacto'}</div>
      </div>
      <div class="contact-actions">
        ${v.contact
          ? `<a href="https://wa.me/57${v.contact}?text=Hola,%20me%20interesa%20el%20${encodeURIComponent(v.brand + ' ' + v.model + ' ' + v.year)}" target="_blank" rel="noopener">
               <button class="btn btn-white btn-sm">💬 WhatsApp</button>
             </a>
             <a href="tel:${v.contact}">
               <button class="btn btn-ghost btn-sm">📞 Llamar</button>
             </a>`
          : '<span style="color:rgba(255,255,255,.6);font-size:13px">Sin datos de contacto</span>'
        }
      </div>
    </div>

    <div class="detail-actions">
      <button class="btn btn-outline" style="flex:1" onclick="closeDetail(); editVehicle(${v.id})">✏️ Editar anuncio</button>
      <button class="btn ${favorites.has(v.id) ? 'btn-primary' : 'btn-outline'}" style="flex:1"
        onclick="toggleDetailFav(${v.id})">
        ${favorites.has(v.id) ? '♥ Guardado' : '♡ Guardar'}
      </button>
    </div>`;

  document.getElementById('detailModal').classList.add('open');
}

function toggleDetailFav(id) {
  toggleFav(id, null);
  const btn = document.querySelector('#detailContent .detail-actions .btn:last-child');
  if (btn) {
    const isFav = favorites.has(id);
    btn.className  = `btn ${isFav ? 'btn-primary' : 'btn-outline'}`;
    btn.innerHTML  = isFav ? '♥ Guardado' : '♡ Guardar';
    btn.style.flex = '1';
  }
}

function closeDetail() {
  document.getElementById('detailModal').classList.remove('open');
}

function changeSlide(dir) {
  goSlide((detailSlideIndex + dir + detailImages.length) % detailImages.length);
}

function goSlide(n) {
  detailSlideIndex = n;
  document.querySelectorAll('.gallery-slide').forEach((s, i) => s.classList.toggle('active', i === n));
  document.querySelectorAll('.gallery-dot').forEach((d, i)  => d.classList.toggle('active', i === n));
}

// ─── Toast ─────────────────────────────────────
let toastTimer = null;
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast toast-${type} show`;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
}

// ─── Keyboard shortcuts ────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeAddModal();
    closeDetail();
  }
  if (e.key === 'n' && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) {
    openAddModal();
  }
});

// ─── Init ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  applyFilters();

  // Cerrar modales al hacer clic en el fondo
  document.getElementById('addModal').addEventListener('click', function(e) {
    if (e.target === this) closeAddModal();
  });
  document.getElementById('detailModal').addEventListener('click', function(e) {
    if (e.target === this) closeDetail();
  });
});
