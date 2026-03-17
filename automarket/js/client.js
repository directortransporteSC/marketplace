/* =============================================
   AUTOMARKET — Vista CLIENTE (Supabase)
   ============================================= */
'use strict';

let vehicles   = [];
let filtered   = [];
let favorites  = new Set();
let orderBy    = 'reciente';
let yearFilter = '';
let priceMin   = 0;
let priceMax   = 9999999999;
let viewMode   = 'grid';
let showFavs   = false;
let emailTargetId = null;

// ─── Cargar vehículos desde Supabase ───────────
async function loadVehicles() {
  showSpinner('Cargando vehículos...');
  try {
    const { data, error } = await sb
      .from('vehicles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    vehicles = data || [];
    // Cargar favoritos desde localStorage
    try { favorites = new Set(JSON.parse(localStorage.getItem('am_favs') || '[]')); } catch(e) {}
    applyFilters();
    document.getElementById('statTotal').textContent = vehicles.length;
  } catch(e) {
    showToast('Error al cargar vehículos: ' + e.message, 'error');
    console.error(e);
  } finally {
    hideSpinner();
  }
}

// ─── Filtros ───────────────────────────────────
function applyFilters() {
  const q     = (document.getElementById('searchInput').value || '').toLowerCase().trim();
  const brand = document.getElementById('brandFilter').value;
  const type  = document.getElementById('typeFilter').value;

  let list = showFavs ? vehicles.filter(v => favorites.has(v.id)) : vehicles;

  filtered = list.filter(v => {
    const hay = `${v.brand} ${v.model} ${v.year} ${v.city||''} ${v.type||''} ${v.color||''}`.toLowerCase();
    return (!q     || hay.includes(q))
        && (!brand || v.brand === brand)
        && (!type  || v.type  === type)
        && (!yearFilter || (yearFilter==='2010' ? v.year<=2010 : v.year>=parseInt(yearFilter)))
        && (v.price >= priceMin && v.price <= priceMax);
  });

  if      (orderBy==='precio_asc')  filtered.sort((a,b)=>a.price-b.price);
  else if (orderBy==='precio_desc') filtered.sort((a,b)=>b.price-a.price);
  else if (orderBy==='km')          filtered.sort((a,b)=>a.km-b.km);
  else filtered.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));

  renderGrid();
  updateBrandFilter();
  document.getElementById('resultsCount').innerHTML =
    `<strong>${filtered.length}</strong> vehículo${filtered.length!==1?'s':''}`;
}

function setOrder(val,el) {
  orderBy=val;
  document.querySelectorAll('.filter-chip').forEach(c=>c.classList.remove('active'));
  el.classList.add('active'); applyFilters();
}
function setYear(val)  { yearFilter=val; applyFilters(); }
function setPrice(val) {
  if(!val){priceMin=0;priceMax=9999999999;}
  else{const[a,b]=val.split('-');priceMin=+a;priceMax=+b;}
  applyFilters();
}
function setView(val,el) {
  viewMode=val;
  document.querySelectorAll('.view-btn').forEach(b=>b.classList.remove('active'));
  el.classList.add('active'); renderGrid();
}
function clearAllFilters() {
  document.getElementById('searchInput').value='';
  document.getElementById('brandFilter').value='';
  document.getElementById('typeFilter').value='';
  yearFilter=''; priceMin=0; priceMax=9999999999;
  document.querySelectorAll('.filter-chip')[0].click();
}
function toggleFavFilter() {
  showFavs=!showFavs;
  const btn=document.getElementById('favBtn');
  btn.textContent = showFavs ? '♥ Mis favoritos' : '♡ Favoritos';
  btn.className   = showFavs ? 'btn btn-white btn-sm' : 'btn btn-ghost btn-sm';
  document.getElementById('sectionTitle').textContent = showFavs ? 'Mis favoritos' : 'Todos los vehículos';
  applyFilters();
}
function updateBrandFilter() {
  const sel=document.getElementById('brandFilter'), cur=sel.value;
  sel.innerHTML='<option value="">Todas las marcas</option>';
  uniqueSorted(vehicles.map(v=>v.brand)).forEach(b=>{
    const o=document.createElement('option'); o.value=b; o.textContent=b; sel.appendChild(o);
  });
  sel.value=cur;
}

// ─── Render ────────────────────────────────────
function renderGrid() {
  const c=document.getElementById('vehicleContainer');
  const e=document.getElementById('emptyState');
  if(!filtered.length){c.innerHTML='';e.style.display='block';return;}
  e.style.display='none';
  c.className = viewMode==='list' ? 'vehicle-list' : 'vehicle-grid';
  c.innerHTML = filtered.map(buildCard).join('');
}

function buildCard(v) {
  const isFav    = favorites.has(v.id);
  const imgs     = v.images || [];
  const hasVideo = !!v.video_url;
  const imgHtml  = imgs.length
    ? `<div class="v-card-img">
        <img src="${imgs[0]}" alt="${v.brand} ${v.model}" loading="lazy"/>
        <div style="position:absolute;bottom:10px;right:10px;display:flex;gap:4px">
          ${imgs.length>1?`<span class="v-photo-count">📷 ${imgs.length}</span>`:''}
          ${hasVideo?`<span class="v-photo-count" style="background:rgba(220,38,38,.75)">🎬 Video</span>`:''}
        </div>
       </div>`
    : `<div class="v-card-img"><div class="v-card-no-img">${getEmoji(v.type)}<span>${hasVideo?'🎬 Con video':'Sin fotos'}</span></div></div>`;

  return `
  <div class="v-card" onclick="openDetail('${v.id}')">
    <div style="position:relative">
      ${imgHtml}
      <span class="v-badge ${v.condition==='Nuevo'?'badge-new':'badge-used'}">${v.condition}</span>
      <button class="v-fav-btn ${isFav?'on':''}"
        onclick="event.stopPropagation();toggleFav('${v.id}',this)"
        title="${isFav?'Quitar favorito':'Guardar'}">
        ${isFav?'♥':'♡'}
      </button>
    </div>
    <div class="v-body">
      <div class="v-header">
        <div class="v-title">${v.brand} ${v.model}</div>
        <span class="v-year">${v.year}</span>
      </div>
      <div class="v-location">📍 ${v.city||'Colombia'}</div>
      <div class="v-price">${formatPrice(v.price)}</div>
      <div class="v-specs">
        ${v.km!=null?`<span class="spec-tag">🛣 ${formatKm(v.km)}</span>`:''}
        ${v.fuel ?`<span class="spec-tag">⛽ ${v.fuel}</span>`:''}
        ${v.trans?`<span class="spec-tag">⚙️ ${v.trans}</span>`:''}
        ${v.type ?`<span class="spec-tag">${getEmoji(v.type)} ${v.type}</span>`:''}
      </div>
      <div class="v-footer">
        ${v.whatsapp?`<a href="https://wa.me/57${v.whatsapp}?text=Hola,%20me%20interesa%20el%20${encodeURIComponent(v.brand+' '+v.model+' '+v.year)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">
          <button class="btn btn-whatsapp btn-sm">💬 WhatsApp</button></a>`:''}
        ${v.email?`<button class="btn btn-email btn-sm" onclick="event.stopPropagation();openEmailModal('${v.id}')">✉️ Correo</button>`:''}
        <button class="btn btn-outline btn-sm" style="flex:1" onclick="event.stopPropagation();openDetail('${v.id}')">Ver más →</button>
      </div>
    </div>
  </div>`;
}

// ─── Favoritos (localStorage) ──────────────────
function toggleFav(id, btn) {
  if(favorites.has(id)){favorites.delete(id);if(btn){btn.textContent='♡';btn.classList.remove('on');}}
  else                 {favorites.add(id);   if(btn){btn.textContent='♥';btn.classList.add('on');}}
  localStorage.setItem('am_favs', JSON.stringify([...favorites]));
  if(showFavs) applyFilters();
}

// ─── Modal Detalle ─────────────────────────────
function openDetail(id) {
  const v = vehicles.find(x=>x.id===id); if(!v)return;
  openGallery(v.images||[], document.getElementById('detailGallery'));
  const isFav = favorites.has(v.id);

  document.getElementById('detailContent').innerHTML = `
    <div class="detail-top">
      <div>
        <div class="detail-title">${v.brand} ${v.model} ${v.year}</div>
        <div class="detail-sub">📍 ${v.city||'Colombia'} &nbsp;·&nbsp; 🕐 ${timeAgo(v.created_at)}${v.seller_name?` &nbsp;·&nbsp; 👤 ${v.seller_name}`:''}</div>
      </div>
      <span class="v-badge ${v.condition==='Nuevo'?'badge-new':'badge-used'}" style="position:static;white-space:nowrap;margin-top:4px">${v.condition}</span>
    </div>
    <div class="detail-price">${formatPrice(v.price)}</div>
    <div class="detail-specs">
      ${v.km!=null?`<div class="d-spec"><div class="sl">Kilometraje</div><div class="sv">${formatKm(v.km)}</div></div>`:''}
      ${v.fuel  ?`<div class="d-spec"><div class="sl">Combustible</div><div class="sv">${v.fuel}</div></div>`:''}
      ${v.trans ?`<div class="d-spec"><div class="sl">Transmisión</div><div class="sv">${v.trans}</div></div>`:''}
      ${v.engine?`<div class="d-spec"><div class="sl">Motor</div><div class="sv">${v.engine}</div></div>`:''}
      ${v.color ?`<div class="d-spec"><div class="sl">Color</div><div class="sv">${v.color}</div></div>`:''}
      ${v.type  ?`<div class="d-spec"><div class="sl">Tipo</div><div class="sv">${v.type}</div></div>`:''}
    </div>
    ${v.description?`<div class="detail-desc">${v.description.replace(/\n/g,'<br>')}</div>`:''}

    ${v.video_url?`
    <div style="margin-bottom:18px">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--blue);margin-bottom:8px">🎬 Video del vehículo</div>
      <video src="${v.video_url}" controls playsinline
        style="width:100%;border-radius:var(--r);max-height:280px;background:#000;display:block">
        Tu navegador no soporta reproducción de video.
      </video>
    </div>`:''}

    <div class="seller-card">
      <div class="seller-avatar">${(v.seller_name||'V').charAt(0).toUpperCase()}</div>
      <div class="seller-info">
        <div class="seller-name">${v.seller_name||'Vendedor'}</div>
        ${v.city?`<div class="seller-loc">📍 ${v.city}</div>`:''}
      </div>
    </div>

    <div class="contact-card">
      <div class="contact-methods">
        ${v.whatsapp?`
          <a href="https://wa.me/57${v.whatsapp}?text=Hola,%20me%20interesa%20el%20${encodeURIComponent(v.brand+' '+v.model+' '+v.year)}" target="_blank" rel="noopener">
            <button class="btn btn-whatsapp">💬 WhatsApp &nbsp;<span style="opacity:.8;font-weight:400">${v.whatsapp}</span></button>
          </a>`:''}
        ${v.phone && v.phone!==v.whatsapp?`
          <a href="tel:${v.phone}">
            <button class="btn btn-outline">📞 Llamar &nbsp;<span style="opacity:.7;font-weight:400">${v.phone}</span></button>
          </a>`:''}
        ${v.email?`
          <button class="btn btn-email" onclick="openEmailModal('${v.id}')">
            ✉️ Correo &nbsp;<span style="opacity:.7;font-weight:400">${v.email}</span>
          </button>`:''}
      </div>
    </div>

    <div class="detail-actions">
      <button class="btn ${isFav?'btn-primary':'btn-outline'}" style="flex:1" id="detailFavBtn"
        onclick="toggleDetailFav('${v.id}')">
        ${isFav?'♥ Guardado':'♡ Guardar'}
      </button>
    </div>`;

  document.getElementById('detailModal').classList.add('open');
}

function toggleDetailFav(id) {
  toggleFav(id,null);
  const btn=document.getElementById('detailFavBtn');
  const on=favorites.has(id);
  btn.className=`btn ${on?'btn-primary':'btn-outline'}`;
  btn.style.flex='1';
  btn.textContent=on?'♥ Guardado':'♡ Guardar';
}
function closeDetail() { document.getElementById('detailModal').classList.remove('open'); }

// ─── Modal Correo ──────────────────────────────
function openEmailModal(id) {
  emailTargetId=id;
  const v=vehicles.find(x=>x.id===id); if(!v)return;
  document.getElementById('emailVehicleName').textContent=`${v.brand} ${v.model} ${v.year}`;
  document.getElementById('emailName').value='';
  document.getElementById('emailFrom').value='';
  document.getElementById('emailMsg').value=`Hola ${v.seller_name||''}, estoy interesado en el ${v.brand} ${v.model} ${v.year}. ¿Sigue disponible?`;
  document.getElementById('emailModal').classList.add('open');
}
function closeEmailModal() { document.getElementById('emailModal').classList.remove('open'); }
function sendEmail() {
  const v=vehicles.find(x=>x.id===emailTargetId);
  const name=document.getElementById('emailName').value.trim();
  const from=document.getElementById('emailFrom').value.trim();
  const msg=document.getElementById('emailMsg').value.trim();
  if(!name||!from||!msg){showToast('Completa todos los campos','error');return;}
  if(!from.includes('@')){showToast('Correo inválido','error');return;}
  if(v&&v.email){
    const sub=encodeURIComponent(`Consulta: ${v.brand} ${v.model} ${v.year} — AutoMarket`);
    const body=encodeURIComponent(`Nombre: ${name}\nCorreo: ${from}\n\n${msg}`);
    window.open(`mailto:${v.email}?subject=${sub}&body=${body}`,'_blank');
  }
  closeEmailModal();
  showToast('✓ Abriendo cliente de correo...');
}

// ─── Init ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initSupabase();
  await loadVehicles();
  document.getElementById('detailModal').addEventListener('click', function(e){if(e.target===this)closeDetail();});
  document.getElementById('emailModal').addEventListener('click',  function(e){if(e.target===this)closeEmailModal();});
});
document.addEventListener('keydown', e=>{
  if(e.key==='Escape'){closeDetail();closeEmailModal();}
});
