/* =============================================
   AUTOMARKET — Vista ADMIN (Supabase)
   ============================================= */
'use strict';

let vehicles      = [];
let filtered      = [];
let orderBy       = 'reciente';
let yearFilter    = '';
let priceMin      = 0;
let priceMax      = 9999999999;
let viewMode      = 'grid';
let editId        = null;
let pendingFiles  = [];    // Fotos nuevas pendientes de subir
let currentUrls   = [];    // URLs de fotos ya guardadas (editar)
let pendingVideo  = null;  // File objeto del video nuevo
let currentVideoUrl = '';  // URL del video ya guardado (editar)
let currentUser   = null;

// ─── AUTH ──────────────────────────────────────
async function checkSession() {
  const { data: { session } } = await sb.auth.getSession();
  if (session) { currentUser = session.user; showAdminPanel(); }
  else showLoginScreen();
}

async function doLogin() {
  const email = document.getElementById('loginUser').value.trim();
  const pass  = document.getElementById('loginPass').value;
  const err   = document.getElementById('loginError');
  err.style.display = 'none';
  if (!email || !pass) { err.textContent='Completa usuario y contraseña'; err.style.display='block'; return; }
  showSpinner('Iniciando sesión...');
  const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
  hideSpinner();
  if (error) { err.textContent='Usuario o contraseña incorrectos'; err.style.display='block'; document.getElementById('loginPass').value=''; }
  else { currentUser=data.user; showAdminPanel(); }
}

async function doLogout() {
  await sb.auth.signOut();
  currentUser = null;
  showLoginScreen();
}

function showLoginScreen() {
  document.getElementById('loginScreen').style.display = 'block';
  document.getElementById('adminPanel').style.display  = 'none';
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
  setTimeout(()=>document.getElementById('loginUser').focus(), 100);
}

function showAdminPanel() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminPanel').style.display  = 'block';
  if (currentUser) {
    const label = ADMINS.find(a=>a.user===currentUser.email)?.label || currentUser.email;
    document.getElementById('adminUserLabel').textContent = '⚙️ ' + label;
  }
  loadVehicles();
}

// ─── Cargar vehículos ──────────────────────────
async function loadVehicles() {
  showSpinner('Cargando anuncios...');
  try {
    const { data, error } = await sb.from('vehicles').select('*').order('created_at',{ascending:false});
    if (error) throw error;
    vehicles = data || [];
    applyFilters();
    updateStats();
  } catch(e) {
    showToast('Error al cargar: ' + e.message, 'error');
  } finally {
    hideSpinner();
  }
}

// ─── Stats ─────────────────────────────────────
function updateStats() {
  const total  = vehicles.length;
  const newV   = vehicles.filter(v=>v.condition==='Nuevo').length;
  const used   = vehicles.filter(v=>v.condition==='Usado').length;
  const avg    = total ? Math.round(vehicles.reduce((s,v)=>s+v.price,0)/total) : 0;
  const photos = vehicles.filter(v=>v.images&&v.images.length>0).length;
  const today  = vehicles.filter(v=>(Date.now()-new Date(v.created_at).getTime())<86400000).length;
  document.getElementById('statTotal').textContent  = total;
  document.getElementById('statNew').textContent    = newV;
  document.getElementById('statUsed').textContent   = used;
  document.getElementById('statAvg').textContent    = avg ? '$'+Math.round(avg/1000000)+'M' : '—';
  document.getElementById('statPhotos').textContent = photos;
  document.getElementById('statToday').textContent  = today;
}

// ─── Filtros ───────────────────────────────────
function applyFilters() {
  const q     = (document.getElementById('searchInput').value||'').toLowerCase().trim();
  const brand = document.getElementById('brandFilter').value;
  const type  = document.getElementById('typeFilter').value;
  filtered = vehicles.filter(v=>{
    const hay=`${v.brand} ${v.model} ${v.year} ${v.city||''} ${v.type||''} ${v.color||''}`.toLowerCase();
    return (!q||hay.includes(q))&&(!brand||v.brand===brand)&&(!type||v.type===type)
      &&(!yearFilter||(yearFilter==='2010'?v.year<=2010:v.year>=parseInt(yearFilter)))
      &&(v.price>=priceMin&&v.price<=priceMax);
  });
  if      (orderBy==='precio_asc')  filtered.sort((a,b)=>a.price-b.price);
  else if (orderBy==='precio_desc') filtered.sort((a,b)=>b.price-a.price);
  else if (orderBy==='km')          filtered.sort((a,b)=>a.km-b.km);
  else filtered.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  renderGrid();
  updateBrandFilter();
  document.getElementById('resultsCount').innerHTML=`<strong>${filtered.length}</strong> vehículo${filtered.length!==1?'s':''}`;
}

function setOrder(v,el){orderBy=v;document.querySelectorAll('.filter-chip').forEach(c=>c.classList.remove('active'));el.classList.add('active');applyFilters();}
function setYear(v){yearFilter=v;applyFilters();}
function setPrice(v){if(!v){priceMin=0;priceMax=9999999999;}else{const[a,b]=v.split('-');priceMin=+a;priceMax=+b;}applyFilters();}
function setView(v,el){viewMode=v;document.querySelectorAll('.view-btn').forEach(b=>b.classList.remove('active'));el.classList.add('active');renderGrid();}
function updateBrandFilter(){
  const sel=document.getElementById('brandFilter'),cur=sel.value;
  sel.innerHTML='<option value="">Todas las marcas</option>';
  uniqueSorted(vehicles.map(v=>v.brand)).forEach(b=>{const o=document.createElement('option');o.value=b;o.textContent=b;sel.appendChild(o);});
  sel.value=cur;
}

// ─── Render cards admin ────────────────────────
function renderGrid() {
  const c=document.getElementById('vehicleContainer');
  const e=document.getElementById('emptyState');
  if(!filtered.length){c.innerHTML='';e.style.display='block';return;}
  e.style.display='none';
  c.className=viewMode==='list'?'vehicle-list':'vehicle-grid';
  c.innerHTML=filtered.map(buildAdminCard).join('');
}

function buildAdminCard(v) {
  const imgs=v.images||[];
  const hasVideo = !!v.video_url;
  const imgHtml=imgs.length
    ?`<div class="v-card-img">
        <img src="${imgs[0]}" alt="${v.brand} ${v.model}" loading="lazy"/>
        <div style="position:absolute;bottom:10px;right:10px;display:flex;gap:4px">
          ${imgs.length>1?`<span class="v-photo-count">📷 ${imgs.length}</span>`:''}
          ${hasVideo?`<span class="v-photo-count" style="background:rgba(220,38,38,.75)">🎬 Video</span>`:''}
        </div>
       </div>`
    :`<div class="v-card-img"><div class="v-card-no-img">${getEmoji(v.type)}<span>${hasVideo?'📷 Sin fotos · 🎬 Con video':'Sin fotos'}</span></div></div>`;

  return `
  <div class="v-card ${v.sold ? 'sold-card' : ''}" onclick="openDetail('${v.id}')">
    <div style="position:relative">
      ${imgHtml}
      <span class="v-badge ${v.condition==='Nuevo'?'badge-new':'badge-used'}">${v.condition}</span>
      ${v.sold ? '<span style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(220,38,38,.85);color:#fff;font-family:var(--font-h);font-size:14px;font-weight:900;letter-spacing:2px;padding:6px 14px;border-radius:6px;text-transform:uppercase;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,.3);">🔴 VENDIDO</span>' : ''}
      <span style="position:absolute;bottom:10px;left:10px;background:rgba(26,47,110,.7);color:#fff;font-size:10px;padding:3px 8px;border-radius:6px">${timeAgo(v.created_at)}</span>
    </div>
    <div class="v-body">
      <div class="v-header"><div class="v-title">${v.brand} ${v.model}</div><span class="v-year">${v.year}</span></div>
      <div class="v-location">📍 ${v.city||'Colombia'}</div>
      <div class="v-price">${formatPrice(v.price)}</div>
      <div class="v-specs">
        ${v.km!=null?`<span class="spec-tag">🛣 ${formatKm(v.km)}</span>`:''}
        ${v.fuel ?`<span class="spec-tag">⛽ ${v.fuel}</span>`:''}
        ${v.trans?`<span class="spec-tag">⚙️ ${v.trans}</span>`:''}
        ${v.type ?`<span class="spec-tag">${getEmoji(v.type)} ${v.type}</span>`:''}
      </div>
      <div class="v-footer">
        <button class="btn btn-primary btn-sm" style="flex:2" onclick="event.stopPropagation();editVehicle('${v.id}')">✏️ Editar</button>
        <button class="btn btn-sm ${v.sold ? 'btn-sold-on' : 'btn-sold-off'}" onclick="event.stopPropagation();toggleSold('${v.id}',${!!v.sold})" title="${v.sold ? 'Marcar disponible' : 'Marcar vendido'}">${v.sold ? '🔴 Vendido' : '✅ Disp.'}</button>
        <button class="btn btn-danger-sm" onclick="event.stopPropagation();deleteVehicle('${v.id}')">🗑</button>
      </div>
    </div>
  </div>`;
}

// ─── Modal Agregar / Editar ────────────────────
function openAddModal() {
  editId=null; pendingFiles=[]; currentUrls=[]; pendingVideo=null; currentVideoUrl='';
  clearForm();
  document.getElementById('modalTitle').textContent='🚗 Publicar vehículo';
  document.getElementById('addModal').classList.add('open');
}
function closeAddModal() { document.getElementById('addModal').classList.remove('open'); }

function editVehicle(id) {
  const v=vehicles.find(x=>x.id===id); if(!v)return;
  editId=id; pendingFiles=[]; currentUrls=v.images?[...v.images]:[];
  pendingVideo=null; currentVideoUrl=v.video_url||'';
  document.getElementById('modalTitle').textContent='✏️ Editar vehículo';
  const map={
    'f-brand':v.brand,'f-model':v.model,'f-year':v.year,'f-price':v.price,
    'f-type':v.type,'f-condition':v.condition,'f-km':v.km,'f-fuel':v.fuel,
    'f-trans':v.trans,'f-color':v.color,'f-engine':v.engine,'f-city':v.city,
    'f-desc':v.description
  };
  Object.entries(map).forEach(([k,val])=>{const el=document.getElementById(k);if(el)el.value=val||'';});
  // Cargar testimonio
  var t = v.testimony || {};
  var tn = document.getElementById('f-test-name');  if(tn) tn.value = t.name||'';
  var ts = document.getElementById('f-test-stars'); if(ts) ts.value = t.stars||5;
  var tt = document.getElementById('f-test-text');  if(tt) tt.value = t.text||'';
  // Cargar vendedores
  const sellers = v.sellers || (v.seller_name ? [{name:v.seller_name,whatsapp:v.whatsapp||'',phone:v.phone||'',email:v.email||''}] : []);
  initSellersUI(sellers);
  renderImgPreview();
  renderVideoPreview();
  document.getElementById('addModal').classList.add('open');
}

function clearForm() {
  ['f-brand','f-model','f-year','f-price','f-km','f-color','f-engine','f-city','f-desc'].forEach(id=>{
    const el=document.getElementById(id); if(el)el.value='';
  });
  document.getElementById('f-type').value='';
  document.getElementById('f-condition').value='Usado';
  document.getElementById('f-fuel').value='Gasolina';
  document.getElementById('f-trans').value='Automática';
  document.getElementById('imgPreview').innerHTML='';
  initSellersUI([]);
  renderVideoPreview();
}

/* ── MULTI-VENDEDORES ── */
function initSellersUI(sellers) {
  const container = document.getElementById('sellersContainer');
  if (!container) return;
  container.innerHTML = '';
  const list = sellers.length ? sellers : [{}];
  list.forEach((s,i) => addSellerRow(s, i));
  updateAddSellerBtn();
}

function addSellerRow(data, idx) {
  const container = document.getElementById('sellersContainer');
  if (!container) return;
  const count = container.querySelectorAll('.seller-row').length;
  if (count >= 5) return;
  const i = idx !== undefined ? idx : count;
  const d = data && typeof data === 'object' && !data.target ? data : {};
  const row = document.createElement('div');
  row.className = 'seller-row';
  row.style.cssText = 'background:var(--gray-50);border:1.5px solid var(--gray-200);border-radius:var(--r);padding:14px;margin-bottom:10px;position:relative;';
  row.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
      <span style="font-family:var(--font-h);font-size:12px;font-weight:800;color:var(--blue);text-transform:uppercase;letter-spacing:.5px;">
        ${i===0?'👤 Vendedor principal':'👤 Vendedor '+(i+1)}
      </span>
      ${i>0?`<button type="button" onclick="removeSellerRow(this)" style="background:var(--danger-bg);border:none;color:var(--danger);border-radius:var(--r-sm);padding:3px 8px;font-size:11px;font-weight:700;cursor:pointer;">✕ Quitar</button>`:''}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
      <div><label style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--gray-600);display:block;margin-bottom:4px;">Nombre</label>
        <input class="fc seller-name" value="${d.name||''}" placeholder="Nombre o empresa" style="margin-bottom:0;"/></div>
      <div><label style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--gray-600);display:block;margin-bottom:4px;">WhatsApp (sin +57)</label>
        <input class="fc seller-whatsapp" value="${d.whatsapp||''}" placeholder="3155004485" style="margin-bottom:0;"/></div>
      <div><label style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--gray-600);display:block;margin-bottom:4px;">Teléfono adicional</label>
        <input class="fc seller-phone" value="${d.phone||''}" placeholder="3001234567" style="margin-bottom:0;"/></div>
      <div><label style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--gray-600);display:block;margin-bottom:4px;">Correo electrónico</label>
        <input class="fc seller-email" type="email" value="${d.email||''}" placeholder="vendedor@correo.com" style="margin-bottom:0;"/></div>
    </div>`;
  container.appendChild(row);
  updateAddSellerBtn();
}

function removeSellerRow(btn) {
  btn.closest('.seller-row').remove();
  updateAddSellerBtn();
}

function updateAddSellerBtn() {
  const container = document.getElementById('sellersContainer');
  const btn = document.getElementById('btnAddSeller');
  if (!container||!btn) return;
  const count = container.querySelectorAll('.seller-row').length;
  btn.style.display = count >= 5 ? 'none' : '';
  btn.textContent = `+ Agregar vendedor (${count}/5)`;
}

function getSellersData() {
  const rows = document.querySelectorAll('.seller-row');
  return Array.from(rows).map(row => ({
    name:     row.querySelector('.seller-name')?.value.trim()    || '',
    whatsapp: row.querySelector('.seller-whatsapp')?.value.trim()|| '',
    phone:    row.querySelector('.seller-phone')?.value.trim()   || '',
    email:    row.querySelector('.seller-email')?.value.trim()   || ''
  })).filter(s => s.name || s.whatsapp || s.email);
}

// ─── Manejo de fotos ───────────────────────────
function handleImages(e) {
  const files=[...e.target.files];
  const total=currentUrls.length+pendingFiles.length+files.length;
  if(total>25){showToast('Máximo 25 fotos','error');return;}
  pendingFiles=[...pendingFiles,...files];
  renderImgPreview();
}

function renderImgPreview() {
  const wrap=document.getElementById('imgPreview');
  const savedHtml=currentUrls.map((url,i)=>`
    <div class="img-preview-item ${i===0&&pendingFiles.length===0?'main-img':''}">
      <img src="${url}" alt="Foto guardada"/>
      <button class="rm-img" onclick="removeSavedImg(${i})">✕</button>
      <span style="position:absolute;bottom:0;left:0;right:0;background:rgba(26,47,110,.6);color:#fff;font-size:9px;text-align:center;padding:2px">Guardada</span>
    </div>`).join('');
  const pendHtml=pendingFiles.map((f,i)=>`
    <div class="img-preview-item ${currentUrls.length===0&&i===0?'main-img':''}">
      <img src="${URL.createObjectURL(f)}" alt="Nueva foto"/>
      <button class="rm-img" onclick="removePendingImg(${i})">✕</button>
      <span style="position:absolute;bottom:0;left:0;right:0;background:rgba(22,163,74,.7);color:#fff;font-size:9px;text-align:center;padding:2px">Nueva</span>
    </div>`).join('');
  wrap.innerHTML=savedHtml+pendHtml;
}

function removeSavedImg(i)   { currentUrls.splice(i,1);  renderImgPreview(); }
function removePendingImg(i) { pendingFiles.splice(i,1); renderImgPreview(); }

// ─── Manejo de VIDEO ───────────────────────────
function handleVideo(e) {
  const file = e.target.files[0];
  if (!file) return;

  // Validar tamaño máximo 100 MB
  const maxMB = 100;
  if (file.size > maxMB * 1024 * 1024) {
    showToast(`El video supera los ${maxMB} MB`, 'error');
    e.target.value = '';
    return;
  }
  // Validar formato
  const validTypes = ['video/mp4','video/webm','video/quicktime','video/x-msvideo'];
  if (!validTypes.includes(file.type)) {
    showToast('Formato no válido. Usa MP4, WebM, MOV o AVI', 'error');
    e.target.value = '';
    return;
  }

  pendingVideo = file;
  renderVideoPreview();
}

function renderVideoPreview() {
  const wrap = document.getElementById('videoPreview');
  if (!wrap) return;

  // Video ya guardado en Supabase
  if (currentVideoUrl && !pendingVideo) {
    wrap.innerHTML = `
      <div class="video-preview-box">
        <video src="${currentVideoUrl}" controls style="width:100%;border-radius:8px;max-height:200px"></video>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px">
          <span style="font-size:12px;color:var(--blue);font-weight:600">🎬 Video guardado</span>
          <button class="btn btn-danger-sm btn-sm" onclick="removeVideo()">🗑 Quitar video</button>
        </div>
      </div>`;
    return;
  }

  // Video nuevo pendiente de subir
  if (pendingVideo) {
    const url = URL.createObjectURL(pendingVideo);
    const sizeMB = (pendingVideo.size / 1024 / 1024).toFixed(1);
    wrap.innerHTML = `
      <div class="video-preview-box">
        <video src="${url}" controls style="width:100%;border-radius:8px;max-height:200px"></video>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px">
          <span style="font-size:12px;color:var(--success);font-weight:600">🎬 ${pendingVideo.name} (${sizeMB} MB)</span>
          <button class="btn btn-danger-sm btn-sm" onclick="removeVideo()">🗑 Quitar</button>
        </div>
      </div>`;
    return;
  }

  // Sin video
  wrap.innerHTML = '';
}

function removeVideo() {
  pendingVideo = null;
  currentVideoUrl = '';
  // Limpiar el input file
  const inp = document.getElementById('f-video');
  if (inp) inp.value = '';
  renderVideoPreview();
}

// ─── Subir fotos a Supabase Storage ───────────
async function uploadImages() {
  if (!pendingFiles.length) return currentUrls;
  const uploaded = [...currentUrls];
  for (const file of pendingFiles) {
    const ext  = file.name.split('.').pop();
    const path = `vehicles/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await sb.storage.from('vehicle-images').upload(path, file, { cacheControl:'3600', upsert:false });
    if (error) { showToast('Error subiendo foto: '+error.message, 'error'); continue; }
    const { data } = sb.storage.from('vehicle-images').getPublicUrl(path);
    uploaded.push(data.publicUrl);
  }
  return uploaded;
}

// ─── Subir VIDEO a Supabase Storage ───────────
async function uploadVideo() {
  // Sin video nuevo → devolver URL existente (o null si se quitó)
  if (!pendingVideo) return currentVideoUrl || null;

  const ext  = pendingVideo.name.split('.').pop();
  const path = `videos/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  showSpinner('Subiendo video... (puede tardar unos segundos)');

  const { error } = await sb.storage.from('vehicle-images').upload(path, pendingVideo, {
    cacheControl: '3600',
    upsert: false,
    contentType: pendingVideo.type
  });

  if (error) {
    showToast('Error subiendo video: ' + error.message, 'error');
    return currentVideoUrl || null;
  }

  const { data } = sb.storage.from('vehicle-images').getPublicUrl(path);
  return data.publicUrl;
}

// ─── Eliminar video antiguo del Storage ───────
async function deleteOldVideo(videoUrl) {
  if (!videoUrl) return;
  try {
    const parts = videoUrl.split('/vehicle-images/');
    if (parts[1]) await sb.storage.from('vehicle-images').remove([parts[1]]);
  } catch(e) { console.warn('No se pudo eliminar video antiguo:', e); }
}

// ─── Guardar vehículo ──────────────────────────
async function saveVehicle() {
  const brand = document.getElementById('f-brand').value.trim();
  const model = document.getElementById('f-model').value.trim();
  const year  = parseInt(document.getElementById('f-year').value);
  const price = parseInt(document.getElementById('f-price').value);

  if (!brand||!model||!year||!price) { showToast('Completa los campos obligatorios (*)','error'); return; }
  if (year<1980||year>new Date().getFullYear()+1) { showToast('Año inválido','error'); return; }
  if (price<100000) { showToast('Precio inválido en COP','error'); return; }

  showSpinner(editId ? 'Actualizando anuncio...' : 'Publicando anuncio...');

  try {
    // 1. Subir fotos
    const imageUrls = await uploadImages();

    // 2. Subir video (si hay uno nuevo, eliminar el antiguo primero)
    let videoUrl = currentVideoUrl || null;
    if (pendingVideo) {
      // Eliminar video anterior si existía
      const oldV = editId ? vehicles.find(x=>x.id===editId) : null;
      if (oldV?.video_url) await deleteOldVideo(oldV.video_url);
      videoUrl = await uploadVideo();
    } else if (!currentVideoUrl && editId) {
      // Se quitó el video → eliminar del storage
      const oldV = vehicles.find(x=>x.id===editId);
      if (oldV?.video_url) await deleteOldVideo(oldV.video_url);
      videoUrl = null;
    }

    // 3. Armar objeto — sellers/docs/testimony vienen de window._adminExtra (inyectado por admin.html)
    const extra = window._adminExtra || {};
    const sellersList = extra.sellers && extra.sellers.length ? extra.sellers
      : (typeof getSellersData === 'function' ? getSellersData() : []);

    // Objeto base siempre funciona (columnas que siempre existen)
    const v = {
      brand, model, year, price,
      type:        document.getElementById('f-type').value||null,
      condition:   document.getElementById('f-condition').value,
      km:          parseInt(document.getElementById('f-km').value)||0,
      fuel:        document.getElementById('f-fuel').value||null,
      trans:       document.getElementById('f-trans').value||null,
      color:       document.getElementById('f-color').value.trim()||null,
      engine:      document.getElementById('f-engine').value.trim()||null,
      city:        document.getElementById('f-city').value.trim()||null,
      description: document.getElementById('f-desc').value.trim()||null,
      images:      imageUrls,
      video_url:   videoUrl,
      seller_name: sellersList[0]?.name    || null,
      whatsapp:    sellersList[0]?.whatsapp || null,
      phone:       sellersList[0]?.phone    || null,
      email:       sellersList[0]?.email    || null,
    };

    // Intentar agregar columnas nuevas (solo si ya fueron creadas en Supabase)
    // Si no existen, el error 400 se captura y se reintenta sin ellas
    const vFull = {
      ...v,
      sellers:   sellersList,
      docs:      extra.docs     || null,
      testimony: extra.testimony|| null,
      sold:      false,
    };
    window._adminExtra = null;

    let error, result;
    // Intento 1: con todas las columnas nuevas
    if (editId) { result = await sb.from('vehicles').update(vFull).eq('id', editId); }
    else        { result = await sb.from('vehicles').insert([vFull]); }
    error = result.error;

    // Si falla por columnas inexistentes, reintenta solo con columnas base
    if (error && (error.code === 'PGRST204' || error.message?.includes('column'))) {
      console.warn('Columnas nuevas no existen aún. Guardando solo campos base. Ejecuta el SQL de supabase_setup.sql');
      if (editId) { result = await sb.from('vehicles').update(v).eq('id', editId); }
      else        { result = await sb.from('vehicles').insert([v]); }
      error = result.error;
      if (!error) showToast('⚠️ Guardado sin docs/sellers. Ejecuta el SQL en Supabase.', 'error');
    }

    if (error) throw error;

    await loadVehicles();
    closeAddModal();
    showToast(editId ? '✓ Vehículo actualizado' : '✓ ¡Anuncio publicado!');
  } catch(e) {
    showToast('Error al guardar: ' + e.message, 'error');
    console.error(e);
  } finally {
    hideSpinner();
  }
}

// ─── Eliminar vehículo ─────────────────────────
async function deleteVehicle(id) {
  const v=vehicles.find(x=>x.id===id); if(!v)return;
  if(!confirm(`¿Eliminar el anuncio de ${v.brand} ${v.model} ${v.year}?`))return;
  showSpinner('Eliminando...');
  try {
    // Eliminar fotos del Storage
    if(v.images&&v.images.length){
      const paths=v.images.map(url=>{const p=url.split('/vehicle-images/');return p[1]||null;}).filter(Boolean);
      if(paths.length) await sb.storage.from('vehicle-images').remove(paths);
    }
    // Eliminar video del Storage
    if (v.video_url) await deleteOldVideo(v.video_url);

    const { error }=await sb.from('vehicles').delete().eq('id',id);
    if(error) throw error;
    await loadVehicles();
    closeDetail();
    showToast('Anuncio eliminado');
  } catch(e) {
    showToast('Error al eliminar: '+e.message,'error');
  } finally {
    hideSpinner();
  }
}

// ─── Modal Detalle admin ───────────────────────
function openDetail(id) {
  const v=vehicles.find(x=>x.id===id); if(!v)return;
  openGallery(v.images||[], document.getElementById('detailGallery'));

  // Mostrar video debajo de la galería si existe
  const videoSection = v.video_url
    ? `<div style="margin-bottom:18px">
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--blue);margin-bottom:8px">🎬 Video del vehículo</div>
        <video src="${v.video_url}" controls style="width:100%;border-radius:var(--r);max-height:280px;background:#000"></video>
       </div>`
    : '';

  document.getElementById('detailContent').innerHTML=`
    <div class="detail-top">
      <div>
        <div class="detail-title">${v.brand} ${v.model} ${v.year}</div>
        <div class="detail-sub">📍 ${v.city||'Colombia'} &nbsp;·&nbsp; 🕐 ${timeAgo(v.created_at)}</div>
      </div>
      <span class="v-badge ${v.condition==='Nuevo'?'badge-new':'badge-used'}" style="position:static;white-space:nowrap;margin-top:4px">${v.condition}</span>
    </div>
    <div class="detail-price">${formatPrice(v.price)}</div>
    <div class="detail-specs">
      ${v.km!=null?`<div class="d-spec"><div class="sl">Km</div><div class="sv">${formatKm(v.km)}</div></div>`:''}
      ${v.fuel  ?`<div class="d-spec"><div class="sl">Combustible</div><div class="sv">${v.fuel}</div></div>`:''}
      ${v.trans ?`<div class="d-spec"><div class="sl">Transmisión</div><div class="sv">${v.trans}</div></div>`:''}
      ${v.engine?`<div class="d-spec"><div class="sl">Motor</div><div class="sv">${v.engine}</div></div>`:''}
      ${v.color ?`<div class="d-spec"><div class="sl">Color</div><div class="sv">${v.color}</div></div>`:''}
      ${v.type  ?`<div class="d-spec"><div class="sl">Tipo</div><div class="sv">${v.type}</div></div>`:''}
    </div>
    ${v.description?`<div class="detail-desc">${v.description.replace(/\n/g,'<br>')}</div>`:''}
    ${videoSection}
    <div class="seller-card">
      <div class="seller-avatar">${(v.seller_name||'V').charAt(0).toUpperCase()}</div>
      <div class="seller-info">
        <div class="seller-name">${v.seller_name||'Sin vendedor'}</div>
        <div class="seller-loc">${[v.whatsapp,v.phone,v.email].filter(Boolean).join(' · ')||'Sin contacto'}</div>
      </div>
    </div>
    <div class="detail-actions">
      <button class="btn btn-primary" style="flex:2" onclick="closeDetail();editVehicle('${v.id}')">✏️ Editar</button>
      <button class="btn ${v.sold ? 'btn-sold-on' : 'btn-sold-off'}" style="flex:2" id="soldToggleBtn" onclick="toggleSold('${v.id}',${!!v.sold})">${v.sold ? '🔴 Marcar disponible' : '✅ Marcar como vendido'}</button>
      <button class="btn btn-danger-sm" style="flex:1;padding:12px" onclick="deleteVehicle('${v.id}')">🗑 Eliminar</button>
    </div>`;
  document.getElementById('detailModal').classList.add('open');
}
function closeDetail() { document.getElementById('detailModal').classList.remove('open'); }

// ─── Marcar como Vendido / Disponible ──────────
async function toggleSold(id, currentSold) {
  const newSold = !currentSold;
  const label   = newSold ? 'vendido' : 'disponible';
  if (!confirm('¿Marcar este vehículo como ' + label + '?')) return;

  showSpinner(newSold ? 'Marcando como vendido...' : 'Marcando como disponible...');
  try {
    const { error } = await sb.from('vehicles').update({ sold: newSold }).eq('id', id);
    if (error) throw error;

    // Actualizar en memoria
    const v = vehicles.find(x => x.id === id);
    if (v) v.sold = newSold;

    showToast(newSold ? '🔴 Marcado como vendido' : '✅ Marcado como disponible');
    closeDetail();
    applyFilters();
  } catch(e) {
    showToast('Error: ' + e.message, 'error');
  } finally {
    hideSpinner();
  }
}

// ─── Init ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initSupabase();
  await checkSession();
  ['addModal','detailModal'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.addEventListener('click',function(e){if(e.target===this)this.classList.remove('open');});
  });
});
document.addEventListener('keydown', e=>{
  if(e.key==='Escape'){closeAddModal();closeDetail();}
  if(e.key==='n'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)&&currentUser) openAddModal();
});
