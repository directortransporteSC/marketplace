/* =============================================
   SPECIAL CAR USADOS — Cliente Catálogo
   Versión limpia sin DOMContentLoaded
   ============================================= */

var vehicles      = [];
var filtered      = [];
var favorites     = new Set();
var orderBy       = 'reciente';
var yearFilter    = '';
var priceMin      = 0;
var priceMax      = 9999999999;
var viewMode      = 'grid';
var showFavs      = false;
var emailTargetId = null;

/* ── Cargar vehículos ─────────────────────────── */
async function loadVehicles() {
  showSpinner('Cargando vehículos...');
  try {
    var res = await sb.from('vehicles')
      .select('*')
      .order('created_at', { ascending: false });
    if (res.error) throw res.error;
    vehicles = res.data || [];
    try { favorites = new Set(JSON.parse(localStorage.getItem('sc_favs') || '[]')); } catch(e) {}
    applyFilters();
    var st = document.getElementById('statTotal');
    if (st) st.textContent = vehicles.length;
    // Actualizar contador de vendidos (base 100 + reales)
    var svEl = document.getElementById('heroStatVendidos');
    if (svEl) { var sc = 100 + vehicles.filter(function(v){ return v.sold; }).length; svEl.textContent = sc + '+'; }
    if (typeof updateDynamicStats === 'function') updateDynamicStats();
  } catch(e) {
    showToast('Error al cargar: ' + e.message, 'error');
  } finally {
    hideSpinner();
  }
}

async function loadVehiclesWithSold() {
  showSpinner('Cargando vehículos...');
  try {
    var res = await sb.from('vehicles')
      .select('*')
      .order('created_at', { ascending: false });
    if (res.error) throw res.error;
    vehicles = res.data || [];
    try { favorites = new Set(JSON.parse(localStorage.getItem('sc_favs') || '[]')); } catch(e) {}
    applyFiltersWithSold();
    var st = document.getElementById('statTotal');
    if (st) st.textContent = vehicles.filter(function(v){ return !v.sold; }).length;
  } catch(e) {
    showToast('Error al cargar: ' + e.message, 'error');
  } finally {
    hideSpinner();
  }
}

/* ── Filtros ──────────────────────────────────── */
function _getFilterVals() {
  return {
    q:     (document.getElementById('searchInput')  ? document.getElementById('searchInput').value  : '').toLowerCase().trim(),
    brand: (document.getElementById('brandFilter')  ? document.getElementById('brandFilter').value  : ''),
    type:  (document.getElementById('typeFilter')   ? document.getElementById('typeFilter').value   : '')
  };
}

function applyFilters() {
  var f = _getFilterVals();
  var list = showFavs ? vehicles.filter(function(v){ return favorites.has(v.id); }) : vehicles;
  filtered = list.filter(function(v) {
    var hay = ((v.brand||'') + ' ' + (v.model||'') + ' ' + (v.year||'') + ' ' + (v.city||'') + ' ' + (v.type||'') + ' ' + (v.color||'')).toLowerCase();
    return (!f.q     || hay.includes(f.q))
        && (!f.brand || v.brand === f.brand)
        && (!f.type  || v.type  === f.type)
        && (!yearFilter || (yearFilter==='2010' ? v.year<=2010 : v.year>=parseInt(yearFilter)))
        && (v.price >= priceMin && v.price <= priceMax);
  });
  _sortFiltered();
  renderGrid();
  _updateBrandFilter();
  var rc = document.getElementById('resultsCount');
  if (rc) rc.innerHTML = '<strong>' + filtered.length + '</strong> vehículo' + (filtered.length!==1?'s':'');
}

function applyFiltersWithSold() {
  var f        = _getFilterVals();
  var available = vehicles.filter(function(v){ return !v.sold; });
  var sold      = vehicles.filter(function(v){ return !!v.sold; });
  var listAvail = showFavs ? available.filter(function(v){ return favorites.has(v.id); }) : available;
  filtered = listAvail.filter(function(v) {
    var hay = ((v.brand||'') + ' ' + (v.model||'') + ' ' + (v.year||'') + ' ' + (v.city||'') + ' ' + (v.type||'') + ' ' + (v.color||'')).toLowerCase();
    return (!f.q     || hay.includes(f.q))
        && (!f.brand || v.brand === f.brand)
        && (!f.type  || v.type  === f.type)
        && (!yearFilter || (yearFilter==='2010' ? v.year<=2010 : v.year>=parseInt(yearFilter)))
        && (v.price >= priceMin && v.price <= priceMax);
  });
  _sortFiltered();
  renderGridWithSold(filtered, sold);
  _updateBrandFilter();
  var rc = document.getElementById('resultsCount');
  if (rc) rc.innerHTML = '<strong>' + filtered.length + '</strong> disponible' + (filtered.length!==1?'s':'');
}

function _sortFiltered() {
  if      (orderBy==='precio_asc')  filtered.sort(function(a,b){ return a.price-b.price; });
  else if (orderBy==='precio_desc') filtered.sort(function(a,b){ return b.price-a.price; });
  else if (orderBy==='km')          filtered.sort(function(a,b){ return (a.km||0)-(b.km||0); });
  else filtered.sort(function(a,b){ return new Date(b.created_at||0)-new Date(a.created_at||0); });
}

function setOrder(val, el) {
  orderBy = val;
  document.querySelectorAll('.filter-chip').forEach(function(c){ c.classList.remove('active'); });
  if (el) el.classList.add('active');
  applyFiltersWithSold();
}
function setYear(val)  { yearFilter = val; applyFiltersWithSold(); }
function setPrice(val) {
  if (!val) { priceMin=0; priceMax=9999999999; }
  else { var p=val.split('-'); priceMin=+p[0]; priceMax=+p[1]; }
  applyFiltersWithSold();
}
function setView(val, el) {
  viewMode = val;
  document.querySelectorAll('.view-btn').forEach(function(b){ b.classList.remove('active'); });
  if (el) el.classList.add('active');
  renderGridWithSold(filtered, vehicles.filter(function(v){ return !!v.sold; }));
}
function clearAllFilters() {
  var si = document.getElementById('searchInput');  if(si) si.value='';
  var bf = document.getElementById('brandFilter');  if(bf) bf.value='';
  var tf = document.getElementById('typeFilter');   if(tf) tf.value='';
  yearFilter=''; priceMin=0; priceMax=9999999999;
  var chips = document.querySelectorAll('.filter-chip');
  if (chips.length) { chips.forEach(function(c){ c.classList.remove('active'); }); chips[0].classList.add('active'); }
  orderBy = 'reciente';
  applyFiltersWithSold();
}
function toggleFavFilter() {
  showFavs = !showFavs;
  var btn = document.getElementById('favBtn');
  if (btn) {
    btn.textContent = showFavs ? '♥ Mis favoritos' : '♡ Favoritos';
    btn.className   = showFavs ? 'btn btn-white btn-sm' : 'btn btn-outline btn-sm';
  }
  var st = document.getElementById('sectionTitle');
  if (st) st.textContent = showFavs ? 'Mis favoritos' : 'Todos los vehículos';
  applyFiltersWithSold();
}
function _updateBrandFilter() {
  var sel = document.getElementById('brandFilter'); if (!sel) return;
  var cur = sel.value;
  var brands = [];
  vehicles.forEach(function(v){ if(v.brand && brands.indexOf(v.brand)<0) brands.push(v.brand); });
  brands.sort();
  sel.innerHTML = '<option value="">Todas las marcas</option>';
  brands.forEach(function(b){ var o=document.createElement('option'); o.value=b; o.textContent=b; sel.appendChild(o); });
  sel.value = cur;
}

/* ── Render Grid ──────────────────────────────── */
function renderGrid() {
  var c = document.getElementById('vehicleContainer'); if (!c) return;
  var e = document.getElementById('emptyState');
  if (!filtered.length) { c.innerHTML=''; if(e) e.style.display='block'; return; }
  if (e) e.style.display = 'none';
  c.className = viewMode==='list' ? 'vehicle-list' : 'vehicle-grid';
  c.innerHTML = filtered.map(buildCard).join('');
}

function renderGridWithSold(avail, sold) {
  var c = document.getElementById('vehicleContainer'); if (!c) return;
  var e = document.getElementById('emptyState');
  if (e) e.style.display = 'none';
  if (!avail.length && !sold.length) { c.innerHTML=''; if(e) e.style.display='block'; return; }
  c.className = viewMode==='list' ? 'vehicle-list' : 'vehicle-grid';
  var html = avail.map(buildCard).join('');
  if (sold.length) {
    html += '<div class="sold-section-title" style="grid-column:1/-1;">'
          + '<img src="assets/USADOS__5_.png" class="sold-section-logo" alt="SC Usados" onerror="this.style.display=\'none\'"/>'
          + ' Vehículos vendidos</div>';
    html += sold.map(buildSoldCard).join('');
  }
  c.innerHTML = html;
  if (!avail.length && e) e.style.display = 'block';
}

function buildCard(v) {
  var isFav    = favorites.has(v.id);
  var imgs     = v.images || [];
  var hasVideo = !!v.video_url;
  var imgHtml  = imgs.length
    ? '<div class="v-card-img">'
        + '<img src="' + imgs[0] + '" alt="' + (v.brand||'') + ' ' + (v.model||'') + '" loading="lazy"/>'
        + (imgs.length>1 ? '<span class="v-photo-count">📷 ' + imgs.length + '</span>' : '')
        + (hasVideo ? '<span class="v-photo-count" style="background:rgba(220,38,38,.75);right:auto;left:10px">🎬</span>' : '')
        + '</div>'
    : '<div class="v-card-img"><div class="v-card-no-img">' + getEmoji(v.type) + '</div></div>';

  return '<div class="v-card" onclick="openDetail(\'' + v.id + '\')">'
    + '<div style="position:relative">'
    + imgHtml
    + '<span class="v-badge ' + (v.condition==='Nuevo'?'badge-new':'badge-used') + '">' + (v.condition||'Usado') + '</span>'
    + '<button class="v-fav-btn ' + (isFav?'on':'') + '" onclick="event.stopPropagation();toggleFav(\'' + v.id + '\',this)" title="' + (isFav?'Quitar':'Guardar') + '">' + (isFav?'♥':'♡') + '</button>'
    + '</div>'
    + '<div class="v-body">'
    + '<div class="v-header"><div class="v-title">' + (v.brand||'') + ' ' + (v.model||'') + '</div><span class="v-year">' + (v.year||'') + '</span></div>'
    + '<div class="v-location">📍 ' + (v.city||'Colombia') + '</div>'
    + '<div class="v-price">' + formatPrice(v.price) + '</div>'
    + '<div class="v-specs">'
    + (v.km!=null ? '<span class="spec-tag">🛣 ' + formatKm(v.km) + '</span>' : '')
    + (v.fuel  ? '<span class="spec-tag">⛽ ' + v.fuel  + '</span>' : '')
    + (v.trans ? '<span class="spec-tag">⚙️ ' + v.trans + '</span>' : '')
    + (v.type  ? '<span class="spec-tag">' + getEmoji(v.type) + ' ' + v.type + '</span>' : '')
    + '</div>'
    + '<div class="v-footer">'
    + (v.whatsapp ? '<a href="https://wa.me/57' + v.whatsapp + '?text=Hola,%20me%20interesa%20el%20' + encodeURIComponent((v.brand||'') + ' ' + (v.model||'') + ' ' + (v.year||'')) + '" target="_blank" onclick="event.stopPropagation()"><button class="btn btn-whatsapp btn-sm">💬 WhatsApp</button></a>' : '')
    + (v.email  ? '<button class="btn btn-email btn-sm" onclick="event.stopPropagation();openEmailModal(\'' + v.id + '\')">✉️ Correo</button>' : '')
    + '<button class="btn btn-outline btn-sm" style="flex:1" onclick="event.stopPropagation();openDetail(\'' + v.id + '\')">Ver más →</button>'
    + '</div></div></div>';
}

function buildSoldCard(v) {
  var imgs = v.images || [];
  var imgHtml = imgs.length
    ? '<div class="v-card-img"><img src="' + imgs[0] + '" alt="' + (v.brand||'') + ' ' + (v.model||'') + '" loading="lazy"/><div class="sold-badge">VENDIDO</div></div>'
    : '<div class="v-card-img"><div class="v-card-no-img">' + getEmoji(v.type) + '</div><div class="sold-badge">VENDIDO</div></div>';
  return '<div class="v-card sold" onclick="if(typeof openSoldModal===\'function\') openSoldModal(\'' + v.id + '\')" title="Ver detalles y testimonio" style="cursor:pointer;">'
    + '<div style="position:relative">' + imgHtml + '</div>'
    + '<div class="v-body">'
    + '<div class="v-header"><div class="v-title">' + (v.brand||'') + ' ' + (v.model||'') + '</div><span class="v-year">' + (v.year||'') + '</span></div>'
    + '<div class="v-location">📍 ' + (v.city||'Colombia') + '</div>'
    + '<div class="v-price" style="color:var(--mid);text-decoration:line-through;">' + formatPrice(v.price) + '</div>'
    + '<div class="v-specs">'
    + (v.km!=null ? '<span class="spec-tag">🛣 ' + formatKm(v.km) + '</span>' : '')
    + (v.fuel  ? '<span class="spec-tag">⛽ ' + v.fuel  + '</span>' : '')
    + (v.trans ? '<span class="spec-tag">⚙️ ' + v.trans + '</span>' : '')
    + '</div>'
    + '<div style="text-align:center;padding:8px 0 4px;font-size:12px;color:var(--mid);">👆 Clic para ver detalles y testimonio</div>'
    + '</div></div>';
}

/* ── Favoritos ────────────────────────────────── */
function toggleFav(id, btn) {
  if (favorites.has(id)) {
    favorites.delete(id);
    if (btn) { btn.textContent='♡'; btn.classList.remove('on'); }
  } else {
    favorites.add(id);
    if (btn) { btn.textContent='♥'; btn.classList.add('on'); }
  }
  try { localStorage.setItem('sc_favs', JSON.stringify(Array.from(favorites))); } catch(e) {}
  if (showFavs) applyFiltersWithSold();
}

/* ── Modal Detalle ────────────────────────────── */
function openDetail(id) {
  var v = null;
  for (var i=0; i<vehicles.length; i++) { if (vehicles[i].id===id) { v=vehicles[i]; break; } }
  if (!v) return;

  var gallery = document.getElementById('detailGallery');
  var content = document.getElementById('detailContent');
  var modal   = document.getElementById('detailModal');
  if (!gallery || !content || !modal) return;

  openGallery(v.images||[], gallery);
  var isFav = favorites.has(v.id);

  var videoHtml = v.video_url
    ? '<div style="margin-bottom:18px"><div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--blue);margin-bottom:8px">🎬 Video del vehículo</div>'
      + '<video src="' + v.video_url + '" controls playsinline style="width:100%;border-radius:var(--r);max-height:260px;background:#000;display:block">Tu navegador no soporta video.</video></div>'
    : '';

  var waHtml = v.whatsapp
    ? '<a href="https://wa.me/57' + v.whatsapp + '?text=Hola,%20me%20interesa%20el%20' + encodeURIComponent((v.brand||'') + ' ' + (v.model||'') + ' ' + (v.year||'')) + '" target="_blank" rel="noopener"><button class="btn btn-whatsapp">💬 WhatsApp &nbsp;<span style="opacity:.75;font-weight:400">' + v.whatsapp + '</span></button></a>'
    : '';
  var emailHtml = v.email
    ? '<button class="btn btn-email" onclick="openEmailModal(\'' + v.id + '\')">✉️ Correo &nbsp;<span style="opacity:.75;font-weight:400">' + v.email + '</span></button>'
    : '';

  content.innerHTML =
    '<div class="detail-top">'
    + '<div><div class="detail-title">' + (v.brand||'') + ' ' + (v.model||'') + ' ' + (v.year||'') + '</div>'
    + '<div class="detail-sub">📍 ' + (v.city||'Colombia') + '&nbsp;·&nbsp;🕐 ' + timeAgo(v.created_at) + (v.seller_name ? '&nbsp;·&nbsp;👤 ' + v.seller_name : '') + '</div></div>'
    + '<span class="v-badge ' + (v.condition==='Nuevo'?'badge-new':'badge-used') + '" style="position:static;white-space:nowrap;margin-top:4px">' + (v.condition||'Usado') + '</span>'
    + '</div>'
    + '<div class="detail-price">' + formatPrice(v.price) + '</div>'
    + '<div class="detail-specs">'
    + (v.km!=null ? '<div class="d-spec"><div class="sl">Kilometraje</div><div class="sv">' + formatKm(v.km) + '</div></div>' : '')
    + (v.fuel   ? '<div class="d-spec"><div class="sl">Combustible</div><div class="sv">' + v.fuel   + '</div></div>' : '')
    + (v.trans  ? '<div class="d-spec"><div class="sl">Transmisión</div><div class="sv">' + v.trans  + '</div></div>' : '')
    + (v.engine ? '<div class="d-spec"><div class="sl">Motor</div><div class="sv">' + v.engine + '</div></div>' : '')
    + (v.color  ? '<div class="d-spec"><div class="sl">Color</div><div class="sv">' + v.color  + '</div></div>' : '')
    + (v.type   ? '<div class="d-spec"><div class="sl">Tipo</div><div class="sv">' + v.type   + '</div></div>' : '')
    + (v.docs && v.docs.tipo_servicio === 'publico' && v.docs.ingresos ? '<div class="d-spec" style="background:#dcfce7;border-color:#bbf7d0;"><div class="sl" style="color:#16a34a;">Ingresos/mes</div><div class="sv" style="color:#16a34a;">$' + parseInt(v.docs.ingresos).toLocaleString('es-CO') + '</div></div>' : '')
    + (v.docs && v.docs.tipo_servicio === 'publico' && v.docs.empresa ? '<div class="d-spec"><div class="sl">Empresa</div><div class="sv">' + v.docs.empresa + '</div></div>' : '')
    + (v.docs && v.docs.tipo_servicio === 'publico' && v.docs.contrato ? '<div class="d-spec"><div class="sl">Contrato</div><div class="sv">' + v.docs.contrato + '</div></div>' : '')
    + '</div>'
    + (v.description ? '<div class="detail-desc">' + v.description.replace(/\n/g,'<br>') + '</div>' : '')
    + videoHtml
    + (typeof buildDocsHTML === 'function' ? buildDocsHTML(v) : '')
    + (typeof buildSellersHTML === 'function' ? buildSellersHTML(v) : '')
    + '<div class="detail-actions">'
    + '<button class="btn ' + (isFav?'btn-primary':'btn-outline') + '" style="flex:1" id="detailFavBtn" onclick="toggleDetailFav(\'' + v.id + '\')">' + (isFav?'♥ Guardado':'♡ Guardar') + '</button>'
    + '</div>';

  modal.classList.add('open');
}

function toggleDetailFav(id) {
  toggleFav(id, null);
  var btn = document.getElementById('detailFavBtn'); if (!btn) return;
  var on  = favorites.has(id);
  btn.className   = 'btn ' + (on?'btn-primary':'btn-outline');
  btn.style.flex  = '1';
  btn.textContent = on ? '♥ Guardado' : '♡ Guardar';
}
function closeDetail() {
  var m = document.getElementById('detailModal'); if (m) m.classList.remove('open');
}

/* ── Modal Correo ─────────────────────────────── */
function openEmailModal(id) {
  emailTargetId = id;
  var v = null;
  for (var i=0; i<vehicles.length; i++) { if(vehicles[i].id===id) { v=vehicles[i]; break; } }
  if (!v) return;
  var en = document.getElementById('emailVehicleName'); if(en) en.textContent = (v.brand||'') + ' ' + (v.model||'') + ' ' + (v.year||'');
  var nm = document.getElementById('emailName');    if(nm) nm.value = '';
  var fr = document.getElementById('emailFrom');    if(fr) fr.value = '';
  var ms = document.getElementById('emailMsg');     if(ms) ms.value = 'Hola ' + (v.seller_name||'') + ', estoy interesado en el ' + (v.brand||'') + ' ' + (v.model||'') + ' ' + (v.year||'') + '. ¿Sigue disponible?';
  var em = document.getElementById('emailModal');   if(em) em.classList.add('open');
}
function closeEmailModal() {
  var m = document.getElementById('emailModal'); if (m) m.classList.remove('open');
}
function sendEmail() {
  var v = null;
  for (var i=0; i<vehicles.length; i++) { if(vehicles[i].id===emailTargetId) { v=vehicles[i]; break; } }
  var name = (document.getElementById('emailName') ? document.getElementById('emailName').value.trim() : '');
  var from = (document.getElementById('emailFrom') ? document.getElementById('emailFrom').value.trim() : '');
  var msg  = (document.getElementById('emailMsg')  ? document.getElementById('emailMsg').value.trim()  : '');
  if (!name||!from||!msg) { showToast('Completa todos los campos','error'); return; }
  if (!from.includes('@')) { showToast('Correo inválido','error'); return; }
  if (v && v.email) {
    var sub  = encodeURIComponent('Consulta: ' + (v.brand||'') + ' ' + (v.model||'') + ' ' + (v.year||'') + ' — Special CAR Usados');
    var body = encodeURIComponent('Nombre: ' + name + '\nCorreo: ' + from + '\n\n' + msg);
    window.open('mailto:' + v.email + '?subject=' + sub + '&body=' + body, '_blank');
  }
  closeEmailModal();
  showToast('✓ Abriendo cliente de correo...');
}
