/* =============================================
   AUTOMARKET — Vista CLIENTE (Supabase) v2
   Nuevas: vendido, lightbox, seguros, múlt. vendedores
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

// ─── TABS ──────────────────────────────────────
function switchTab(tabName, btn) {
  document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.main-tab').forEach(b => b.classList.remove('active'));
  const section = document.getElementById('tab-' + tabName);
  if (section) section.classList.add('active');
  if (btn) btn.classList.add('active');
}

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
    try { favorites = new Set(JSON.parse(localStorage.getItem('am_favs') || '[]')); } catch(e) {}
    applyFilters();
    document.getElementById('statTotal').textContent = vehicles.filter(v=>!v.sold).length;
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
  const isSold   = !!v.sold;

  // Obtener contacto principal
  const sellers = (v.sellers && Array.isArray(v.sellers) && v.sellers.length) ? v.sellers : [];
  const primary = sellers[0] || { whatsapp: v.whatsapp, email: v.email };

  const imgHtml  = imgs.length
    ? `<div class="v-card-img" style="overflow:hidden">
        <img src="${imgs[0]}" alt="${v.brand} ${v.model}" loading="lazy"/>
        ${isSold ? '<div class="sold-ribbon">VENDIDO</div>' : ''}
        <div style="position:absolute;bottom:10px;right:10px;display:flex;gap:4px">
          ${imgs.length>1?`<span class="v-photo-count">📷 ${imgs.length}</span>`:''}
          ${hasVideo?`<span class="v-photo-count" style="background:rgba(220,38,38,.75)">🎬 Video</span>`:''}
        </div>
       </div>`
    : `<div class="v-card-img">
        ${isSold ? '<div class="sold-ribbon">VENDIDO</div>' : ''}
        <div class="v-card-no-img">${getEmoji(v.type)}<span>${hasVideo?'🎬 Con video':'Sin fotos'}</span></div>
       </div>`;

  return `
  <div class="v-card ${isSold?'is-sold':''}" onclick="openDetail('${v.id}')">
    <div style="position:relative">
      ${imgHtml}
      <span class="v-badge ${v.condition==='Nuevo'?'badge-new':'badge-used'}">${v.condition}</span>
      ${!isSold ? `<button class="v-fav-btn ${isFav?'on':''}"
        onclick="event.stopPropagation();toggleFav('${v.id}',this)"
        title="${isFav?'Quitar favorito':'Guardar'}">
        ${isFav?'♥':'♡'}
      </button>` : ''}
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
        ${isSold
          ? `<button class="btn btn-outline btn-sm" style="flex:1;opacity:.6;cursor:default" disabled>🔴 Vendido</button>`
          : `${primary.whatsapp?`<a href="https://wa.me/57${primary.whatsapp}?text=Hola,%20me%20interesa%20el%20${encodeURIComponent(v.brand+' '+v.model+' '+v.year)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">
            <button class="btn btn-whatsapp btn-sm">💬 WhatsApp</button></a>`:''}
           ${primary.email?`<button class="btn btn-email btn-sm" onclick="event.stopPropagation();openEmailModal('${v.id}')">✉️ Correo</button>`:''}
           <button class="btn btn-outline btn-sm" style="flex:1" onclick="event.stopPropagation();openDetail('${v.id}')">Ver más →</button>`
        }
      </div>
    </div>
  </div>`;
}

// ─── Favoritos ─────────────────────────────────
function toggleFav(id, btn) {
  if(favorites.has(id)){favorites.delete(id);if(btn){btn.textContent='♡';btn.classList.remove('on');}}
  else                 {favorites.add(id);   if(btn){btn.textContent='♥';btn.classList.add('on');}}
  localStorage.setItem('am_favs', JSON.stringify([...favorites]));
  if(showFavs) applyFilters();
}

// ─── Modal Detalle ─────────────────────────────
function openDetail(id) {
  const v = vehicles.find(x=>x.id===id); if(!v)return;
  openGallery(v.images||[], document.getElementById('detailGallery'), true);
  const isFav  = favorites.has(v.id);
  const isSold = !!v.sold;

  // Múltiples vendedores
  const sellers = (v.sellers && Array.isArray(v.sellers) && v.sellers.length)
    ? v.sellers
    : (v.seller_name ? [{ name:v.seller_name, whatsapp:v.whatsapp, phone:v.phone, email:v.email }] : []);

  const sellersHtml = sellers.length
    ? `<div class="multi-sellers-section">
        <div class="multi-sellers-title">👥 Vendedor${sellers.length>1?'es':''}</div>
        ${sellers.map(s=>`
          <div class="multi-seller-card">
            <div class="multi-seller-avatar">${(s.name||'V').charAt(0).toUpperCase()}</div>
            <div class="multi-seller-info">
              <div class="multi-seller-name">${s.name||'Vendedor'}</div>
              <div class="multi-seller-contacts">
                ${s.whatsapp&&!isSold?`<a href="https://wa.me/57${s.whatsapp}?text=Hola,%20me%20interesa%20el%20${encodeURIComponent(v.brand+' '+v.model+' '+v.year)}" target="_blank" style="background:var(--green);color:#fff;border-radius:20px;padding:4px 10px;font-size:11.5px;font-weight:600">💬 ${s.whatsapp}</a>`:''}
                ${s.phone&&s.phone!==s.whatsapp&&!isSold?`<a href="tel:${s.phone}" style="background:var(--blue-soft);color:var(--blue);border-radius:20px;padding:4px 10px;font-size:11.5px;font-weight:600">📞 ${s.phone}</a>`:''}
                ${s.email&&!isSold?`<button onclick="openEmailModal('${v.id}')" style="background:var(--blue-pale);color:var(--blue);border-radius:20px;padding:4px 10px;font-size:11.5px;font-weight:600;border:none;cursor:pointer">✉️ ${s.email}</button>`:''}
              </div>
            </div>
          </div>`).join('')}
       </div>`
    : `<div class="seller-card"><div class="seller-avatar">?</div><div class="seller-info"><div class="seller-name">Sin datos de contacto</div></div></div>`;

  document.getElementById('detailContent').innerHTML = `
    ${isSold ? `<div style="background:#dc2626;color:#fff;text-align:center;font-weight:800;font-size:13px;padding:10px;letter-spacing:2px;margin-bottom:16px;border-radius:var(--r-sm)">🔴 ESTE VEHÍCULO YA FUE VENDIDO</div>` : ''}
    <div class="detail-top">
      <div>
        <div class="detail-title">${v.brand} ${v.model} ${v.year}</div>
        <div class="detail-sub">📍 ${v.city||'Colombia'} &nbsp;·&nbsp; 🕐 ${timeAgo(v.created_at)}</div>
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

    ${v.video_url&&!isSold?`
    <div style="margin-bottom:18px">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--blue);margin-bottom:8px">🎬 Video del vehículo</div>
      <video src="${v.video_url}" controls playsinline
        style="width:100%;border-radius:var(--r);max-height:280px;background:#000;display:block">
        Tu navegador no soporta reproducción de video.
      </video>
    </div>`:''}

    ${sellersHtml}

    ${!isSold ? `<div class="detail-actions">
      <button class="btn ${isFav?'btn-primary':'btn-outline'}" style="flex:1" id="detailFavBtn"
        onclick="toggleDetailFav('${v.id}')">
        ${isFav?'♥ Guardado':'♡ Guardar'}
      </button>
    </div>` : ''}`;

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
  // Obtener vendedor destino
  const sellers = (v.sellers&&Array.isArray(v.sellers)&&v.sellers.length)?v.sellers:[];
  const primary = sellers[0]||{};
  const sellerName = primary.name||v.seller_name||'';
  document.getElementById('emailMsg').value=`Hola ${sellerName}, estoy interesado en el ${v.brand} ${v.model} ${v.year}. ¿Sigue disponible?`;
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

  // Obtener todos los correos de vendedores
  const sellers = (v&&v.sellers&&Array.isArray(v.sellers)&&v.sellers.length)?v.sellers:[];
  const emails = sellers.map(s=>s.email).filter(Boolean);
  if (!emails.length && v?.email) emails.push(v.email);

  if(emails.length){
    const sub=encodeURIComponent(`Consulta: ${v.brand} ${v.model} ${v.year} — AutoMarket`);
    const body=encodeURIComponent(`Nombre: ${name}\nCorreo: ${from}\n\n${msg}`);
    window.open(`mailto:${emails.join(',')}?subject=${sub}&body=${body}`,'_blank');
  }
  closeEmailModal();
  showToast('✓ Abriendo cliente de correo...');
}

// ─── MODAL SEGUROS ─────────────────────────────
let currentInsuranceType = '';
let currentInsurancePlan = '';

function openInsuranceModal(planName, type) {
  currentInsurancePlan = planName;
  currentInsuranceType = type;
  const typeLabels = {
    todo_riesgo: 'Todo Riesgo',
    poliza_extra: 'Póliza Extra',
    contractual:  'Contractual'
  };
  document.getElementById('insModalTitle').textContent = `🛡️ ${planName}`;
  document.getElementById('insModalSubtitle').textContent = `Tipo: ${typeLabels[type]||type} · Un asesor te contactará pronto`;
  document.getElementById('ins-name').value = '';
  document.getElementById('ins-phone').value = '';
  document.getElementById('ins-email').value = '';
  document.getElementById('ins-vehicle').value = '';
  document.getElementById('ins-message').value = '';
  document.getElementById('insuranceModal').classList.add('open');
}
function closeInsuranceModal() { document.getElementById('insuranceModal').classList.remove('open'); }

async function submitInsuranceLead() {
  const name    = document.getElementById('ins-name').value.trim();
  const phone   = document.getElementById('ins-phone').value.trim();
  const email   = document.getElementById('ins-email').value.trim();
  const vehicle = document.getElementById('ins-vehicle').value.trim();
  const message = document.getElementById('ins-message').value.trim();

  if (!name)  { showToast('Ingresa tu nombre','error'); return; }
  if (!phone) { showToast('Ingresa tu teléfono','error'); return; }
  if (!email || !email.includes('@')) { showToast('Ingresa un correo válido','error'); return; }

  showSpinner('Enviando solicitud...');
  try {
    // Guardar en Supabase
    const { error } = await sb.from('insurance_leads').insert([{
      insurance_type: currentInsuranceType,
      plan_name:      currentInsurancePlan,
      client_name:    name,
      client_phone:   phone,
      client_email:   email,
      vehicle_info:   vehicle || null,
      message:        message || null,
    }]);
    if (error) throw error;

    // También abrir mailto para el asesor
    const ASESOR_EMAIL = 'adminusados@specialcar.com.co';
    const subject = encodeURIComponent(`[Seguro] Solicitud: ${currentInsurancePlan} — ${name}`);
    const body = encodeURIComponent(
      `SOLICITUD DE SEGURO\n` +
      `═══════════════════\n` +
      `Plan: ${currentInsurancePlan}\n` +
      `Tipo: ${currentInsuranceType}\n\n` +
      `DATOS DEL CLIENTE\n` +
      `──────────────────\n` +
      `Nombre:   ${name}\n` +
      `Teléfono: ${phone}\n` +
      `Correo:   ${email}\n` +
      `Vehículo: ${vehicle||'No especificado'}\n\n` +
      `MENSAJE\n` +
      `──────────────────\n` +
      `${message||'Sin mensaje adicional'}\n\n` +
      `Fecha: ${new Date().toLocaleString('es-CO')}`
    );
    window.open(`mailto:${ASESOR_EMAIL}?subject=${subject}&body=${body}`, '_blank');

    closeInsuranceModal();
    showToast('✅ Solicitud enviada. Un asesor te contactará pronto.');
  } catch(e) {
    showToast('Error al enviar: ' + e.message, 'error');
    console.error(e);
  } finally {
    hideSpinner();
  }
}

// ─── LIGHTBOX ──────────────────────────────────
let _lbImgs = [];
let _lbIdx  = 0;

function openLightbox(imgs, startIndex) {
  if (!imgs || !imgs.length) return;
  _lbImgs = imgs;
  _lbIdx  = startIndex || 0;
  renderLightbox();
  document.getElementById('lightbox').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  document.getElementById('lightbox').classList.add('hidden');
  document.body.style.overflow = '';
}

function lightboxMove(dir) {
  if (!_lbImgs.length) return;
  _lbIdx = (_lbIdx + dir + _lbImgs.length) % _lbImgs.length;
  renderLightbox();
}

function lightboxBgClick(e) {
  if (e.target === document.getElementById('lightbox')) closeLightbox();
}

function renderLightbox() {
  document.getElementById('lightboxImg').src = _lbImgs[_lbIdx];
  document.getElementById('lightboxCounter').textContent =
    _lbImgs.length > 1 ? `${_lbIdx+1} / ${_lbImgs.length}` : '';

  // Thumbnails
  const wrap = document.getElementById('lightboxThumbs');
  if (_lbImgs.length > 1) {
    wrap.innerHTML = _lbImgs.map((src,i) =>
      `<img class="lightbox-thumb ${i===_lbIdx?'active':''}"
        src="${src}" alt="Foto ${i+1}"
        onclick="event.stopPropagation();_lbIdx=${i};renderLightbox()"/>`
    ).join('');
    // Scroll thumbnail activo a la vista
    setTimeout(() => {
      const active = wrap.querySelector('.lightbox-thumb.active');
      if (active) active.scrollIntoView({ behavior:'smooth', block:'nearest', inline:'center' });
    }, 50);
  } else {
    wrap.innerHTML = '';
  }

  // Ocultar flechas si hay solo 1 imagen
  document.querySelectorAll('.lightbox-arrow').forEach(a =>
    a.style.display = _lbImgs.length > 1 ? '' : 'none'
  );
}

// ─── openGallery MEJORADA con click → lightbox ──
// Sobreescribe la de supabase.js para añadir lightbox
function openGallery(urls, el, enableLightbox = false) {
  _slideUrls = urls || []; _slideIdx = 0;
  if (!_slideUrls.length) {
    el.innerHTML = `<div class="gallery-no-img">🚗</div>`; return;
  }
  el.innerHTML =
    _slideUrls.map((src,i) => {
      const click = enableLightbox
        ? `onclick="event.stopPropagation();openLightbox(_slideUrls,${i})" style="cursor:zoom-in"`
        : '';
      return `<div class="gallery-slide ${i===0?'active':''}">
        <img src="${src}" alt="Foto ${i+1}" loading="lazy" ${click}/>
       </div>`;
    }).join('') +
    (_slideUrls.length > 1
      ? `<button class="g-arrow prev" onclick="changeSlide(-1)">‹</button>
         <button class="g-arrow next" onclick="changeSlide(1)">›</button>
         <div class="g-dots">${_slideUrls.map((_,i)=>
           `<button class="g-dot ${i===0?'active':''}" onclick="goSlide(${i})"></button>`
         ).join('')}</div>
         <div style="position:absolute;bottom:38px;right:10px;background:rgba(0,0,0,.5);color:#fff;font-size:10px;padding:3px 8px;border-radius:12px;pointer-events:none">🔍 Clic para ampliar</div>`
      : (enableLightbox ? `<div style="position:absolute;bottom:10px;right:10px;background:rgba(0,0,0,.5);color:#fff;font-size:10px;padding:3px 8px;border-radius:12px;pointer-events:none">🔍 Clic para ampliar</div>` : '')
    );
}

// ─── Init ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initSupabase();
  await loadVehicles();
  document.getElementById('detailModal').addEventListener('click', function(e){if(e.target===this)closeDetail();});
  document.getElementById('emailModal').addEventListener('click',  function(e){if(e.target===this)closeEmailModal();});
  document.getElementById('insuranceModal').addEventListener('click', function(e){if(e.target===this)closeInsuranceModal();});
});
document.addEventListener('keydown', e=>{
  if(e.key==='Escape'){closeDetail();closeEmailModal();closeInsuranceModal();closeLightbox();}
  if(e.key==='ArrowLeft')  lightboxMove(-1);
  if(e.key==='ArrowRight') lightboxMove(1);
});
