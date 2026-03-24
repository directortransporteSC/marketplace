/* =============================================
   AUTOMARKET — Vista ADMIN (Supabase) v2
   Nuevas funciones: vendido, múlt. vendedores,
   eliminación automática, lightbox, seguros
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
let pendingFiles  = [];
let currentUrls   = [];
let pendingVideo  = null;
let currentVideoUrl = '';
let currentUser   = null;
let showOnlySold  = false;

// ─── TABS ADMIN ────────────────────────────────
function switchAdminTab(tabName, btn) {
  document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.main-tab').forEach(b => b.classList.remove('active'));
  const section = document.getElementById('admin-tab-' + tabName);
  if (section) section.classList.add('active');
  if (btn) btn.classList.add('active');
  if (tabName === 'insurance_leads') loadInsuranceLeads();
}

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
  // Auto-check y eliminar vehículos con delete_after vencido
  setTimeout(checkAndDeleteExpiredVehicles, 2000);
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
  const sold   = vehicles.filter(v=>v.sold).length;
  const photos = vehicles.filter(v=>v.images&&v.images.length>0).length;
  const today  = vehicles.filter(v=>(Date.now()-new Date(v.created_at).getTime())<86400000).length;
  document.getElementById('statTotal').textContent  = total;
  document.getElementById('statNew').textContent    = newV;
  document.getElementById('statUsed').textContent   = used;
  document.getElementById('statSold').textContent   = sold;
  document.getElementById('statPhotos').textContent = photos;
  document.getElementById('statToday').textContent  = today;
}

// ─── Filtros ───────────────────────────────────
function applyFilters() {
  const q     = (document.getElementById('searchInput').value||'').toLowerCase().trim();
  const brand = document.getElementById('brandFilter').value;
  const type  = document.getElementById('typeFilter').value;
  let list = showOnlySold ? vehicles.filter(v=>v.sold) : vehicles;
  filtered = list.filter(v=>{
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
function toggleSoldFilter(el) {
  showOnlySold = !showOnlySold;
  el.classList.toggle('active', showOnlySold);
  applyFilters();
}
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
  const imgs = v.images||[];
  const hasVideo = !!v.video_url;
  const isSold = !!v.sold;

  // Calcular días restantes para eliminar
  let deleteNotice = '';
  if (isSold && v.delete_after) {
    const daysLeft = Math.ceil((new Date(v.delete_after) - Date.now()) / 86400000);
    if (daysLeft > 0) deleteNotice = `<div class="sold-delete-notice">⏳ Se elimina en ${daysLeft} día${daysLeft!==1?'s':''}</div>`;
    else deleteNotice = `<div class="sold-delete-notice">⚠️ Pendiente de eliminación</div>`;
  }

  const imgHtml = imgs.length
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
        <div class="v-card-no-img">${getEmoji(v.type)}<span>${hasVideo?'📷 Sin fotos · 🎬 Con video':'Sin fotos'}</span></div>
       </div>`;

  return `
  <div class="v-card ${isSold?'is-sold':''}" onclick="openDetail('${v.id}')">
    <div style="position:relative">
      ${imgHtml}
      <span class="v-badge ${v.condition==='Nuevo'?'badge-new':'badge-used'}">${v.condition}</span>
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
      ${deleteNotice}
      <div class="v-footer">
        <button class="btn btn-primary btn-sm" style="flex:2" onclick="event.stopPropagation();editVehicle('${v.id}')">✏️ Editar</button>
        <button class="${isSold?'btn-unsold':'btn-sold'}" onclick="event.stopPropagation();toggleSold('${v.id}',${isSold})">${isSold?'✅ Reactivar':'🔴 Vendido'}</button>
        <button class="btn btn-danger-sm" onclick="event.stopPropagation();deleteVehicle('${v.id}')">🗑</button>
      </div>
    </div>
  </div>`;
}

// ─── MARCAR COMO VENDIDO / REACTIVAR ──────────
async function toggleSold(id, currentlySold) {
  const v = vehicles.find(x=>x.id===id); if(!v) return;
  if (!currentlySold) {
    if (!confirm(`¿Marcar el ${v.brand} ${v.model} ${v.year} como VENDIDO?\n\nLa publicación se eliminará automáticamente en 5 días.`)) return;
  }
  showSpinner(currentlySold ? 'Reactivando anuncio...' : 'Marcando como vendido...');
  try {
    const now = new Date();
    const deleteAfter = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
    const update = currentlySold
      ? { sold: false, sold_at: null, delete_after: null }
      : { sold: true, sold_at: now.toISOString(), delete_after: deleteAfter.toISOString() };
    const { error } = await sb.from('vehicles').update(update).eq('id', id);
    if (error) throw error;
    await loadVehicles();
    showToast(currentlySold ? '✓ Anuncio reactivado' : '🔴 Marcado como vendido — se eliminará en 5 días');
  } catch(e) {
    showToast('Error: ' + e.message, 'error');
  } finally {
    hideSpinner();
  }
}

// ─── Auto-eliminar vehículos vencidos ──────────
async function checkAndDeleteExpiredVehicles() {
  const expired = vehicles.filter(v => v.sold && v.delete_after && new Date(v.delete_after) <= new Date());
  if (!expired.length) return;
  console.log(`Auto-eliminando ${expired.length} vehículo(s) vendidos y vencidos...`);
  for (const v of expired) {
    try {
      // Eliminar fotos
      if (v.images && v.images.length) {
        const paths = v.images.map(url=>{const p=url.split('/vehicle-images/');return p[1]||null;}).filter(Boolean);
        if (paths.length) await sb.storage.from('vehicle-images').remove(paths);
      }
      // Eliminar video
      if (v.video_url) await deleteOldVideo(v.video_url);
      // Eliminar registro
      await sb.from('vehicles').delete().eq('id', v.id);
      console.log(`Eliminado: ${v.brand} ${v.model} ${v.year}`);
    } catch(e) {
      console.warn('Error al auto-eliminar:', e);
    }
  }
  if (expired.length > 0) {
    await loadVehicles();
    showToast(`🗑 ${expired.length} anuncio(s) vendido(s) eliminado(s) automáticamente`);
  }
}

// ─── MÚLTIPLES VENDEDORES ──────────────────────
let sellersData = []; // [{name, whatsapp, phone, email}]

function addSellerRow(seller = {}) {
  sellersData.push(seller);
  renderSellers();
}

function removeSeller(idx) {
  sellersData.splice(idx, 1);
  renderSellers();
}

function readSellers() {
  const rows = document.querySelectorAll('.seller-row');
  sellersData = [];
  rows.forEach(row => {
    const inputs = row.querySelectorAll('input');
    sellersData.push({
      name:     inputs[0]?.value?.trim() || '',
      whatsapp: inputs[1]?.value?.trim() || '',
      phone:    inputs[2]?.value?.trim() || '',
      email:    inputs[3]?.value?.trim() || '',
    });
  });
  return sellersData.filter(s => s.name || s.whatsapp || s.email);
}

function renderSellers() {
  const container = document.getElementById('sellersContainer');
  if (!container) return;
  if (!sellersData.length) {
    container.innerHTML = '<p style="color:var(--gray-400);font-size:13px;padding:8px 0">Sin vendedores registrados. Haz clic en "+ Agregar vendedor".</p>';
    return;
  }
  container.innerHTML = sellersData.map((s, i) => `
    <div class="seller-row">
      <button type="button" class="rm-seller" onclick="removeSeller(${i})" title="Quitar">✕</button>
      <div class="form-group" style="margin:0">
        <label style="font-size:11px;color:var(--gray-600);display:block;margin-bottom:3px">Nombre${i===0?' (principal)':''}</label>
        <input value="${s.name||''}" placeholder="Nombre o empresa" onchange="sellersData[${i}].name=this.value"/>
      </div>
      <div class="form-group" style="margin:0">
        <label style="font-size:11px;color:var(--gray-600);display:block;margin-bottom:3px">WhatsApp</label>
        <input value="${s.whatsapp||''}" placeholder="3001234567" onchange="sellersData[${i}].whatsapp=this.value"/>
      </div>
      <div class="form-group" style="margin:0">
        <label style="font-size:11px;color:var(--gray-600);display:block;margin-bottom:3px">Teléfono</label>
        <input value="${s.phone||''}" placeholder="Opcional" onchange="sellersData[${i}].phone=this.value"/>
      </div>
      <div class="form-group" style="margin:0">
        <label style="font-size:11px;color:var(--gray-600);display:block;margin-bottom:3px">Correo</label>
        <input value="${s.email||''}" placeholder="vendedor@correo.com" onchange="sellersData[${i}].email=this.value"/>
      </div>
    </div>`).join('');
}

// ─── Modal Agregar / Editar ────────────────────
function openAddModal() {
  editId=null; pendingFiles=[]; currentUrls=[]; pendingVideo=null; currentVideoUrl='';
  sellersData = [];
  clearForm();
  document.getElementById('modalTitle').textContent='🚗 Publicar vehículo';
  document.getElementById('addModal').classList.add('open');
  renderSellers();
}
function closeAddModal() { document.getElementById('addModal').classList.remove('open'); }

function editVehicle(id) {
  const v=vehicles.find(x=>x.id===id); if(!v)return;
  editId=id; pendingFiles=[]; currentUrls=v.images?[...v.images]:[];
  pendingVideo=null; currentVideoUrl=v.video_url||'';
  // Cargar sellers
  sellersData = [];
  if (v.sellers && Array.isArray(v.sellers) && v.sellers.length) {
    sellersData = [...v.sellers];
  } else if (v.seller_name || v.whatsapp || v.email) {
    sellersData = [{ name: v.seller_name||'', whatsapp: v.whatsapp||'', phone: v.phone||'', email: v.email||'' }];
  }
  document.getElementById('modalTitle').textContent='✏️ Editar vehículo';
  const map={
    'f-brand':v.brand,'f-model':v.model,'f-year':v.year,'f-price':v.price,
    'f-type':v.type,'f-condition':v.condition,'f-km':v.km,'f-fuel':v.fuel,
    'f-trans':v.trans,'f-color':v.color,'f-engine':v.engine,'f-city':v.city,'f-desc':v.description
  };
  Object.entries(map).forEach(([k,val])=>{const el=document.getElementById(k);if(el)el.value=val||'';});
  renderImgPreview();
  renderVideoPreview();
  renderSellers();
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
  renderVideoPreview();
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
  const file = e.target.files[0]; if (!file) return;
  if (file.size > 100*1024*1024) { showToast('El video supera los 100 MB','error'); e.target.value=''; return; }
  const validTypes = ['video/mp4','video/webm','video/quicktime','video/x-msvideo'];
  if (!validTypes.includes(file.type)) { showToast('Formato no válido. Usa MP4, WebM, MOV o AVI','error'); e.target.value=''; return; }
  pendingVideo = file;
  renderVideoPreview();
}

function renderVideoPreview() {
  const wrap = document.getElementById('videoPreview'); if (!wrap) return;
  if (currentVideoUrl && !pendingVideo) {
    wrap.innerHTML = `<div class="video-preview-box">
      <video src="${currentVideoUrl}" controls style="width:100%;border-radius:8px;max-height:200px"></video>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px">
        <span style="font-size:12px;color:var(--blue);font-weight:600">🎬 Video guardado</span>
        <button class="btn btn-danger-sm btn-sm" onclick="removeVideo()">🗑 Quitar video</button>
      </div></div>`;
    return;
  }
  if (pendingVideo) {
    const url = URL.createObjectURL(pendingVideo);
    const sizeMB = (pendingVideo.size/1024/1024).toFixed(1);
    wrap.innerHTML = `<div class="video-preview-box">
      <video src="${url}" controls style="width:100%;border-radius:8px;max-height:200px"></video>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px">
        <span style="font-size:12px;color:var(--success);font-weight:600">🎬 ${pendingVideo.name} (${sizeMB} MB)</span>
        <button class="btn btn-danger-sm btn-sm" onclick="removeVideo()">🗑 Quitar</button>
      </div></div>`;
    return;
  }
  wrap.innerHTML = '';
}

function removeVideo() {
  pendingVideo = null; currentVideoUrl = '';
  const inp = document.getElementById('f-video'); if (inp) inp.value = '';
  renderVideoPreview();
}

// ─── Subir fotos / video ───────────────────────
async function uploadImages() {
  if (!pendingFiles.length) return currentUrls;
  const uploaded = [...currentUrls];
  for (const file of pendingFiles) {
    const ext  = file.name.split('.').pop();
    const path = `vehicles/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await sb.storage.from('vehicle-images').upload(path, file, { cacheControl:'3600', upsert:false });
    if (error) { showToast('Error subiendo foto: '+error.message,'error'); continue; }
    const { data } = sb.storage.from('vehicle-images').getPublicUrl(path);
    uploaded.push(data.publicUrl);
  }
  return uploaded;
}

async function uploadVideo() {
  if (!pendingVideo) return currentVideoUrl || null;
  const ext  = pendingVideo.name.split('.').pop();
  const path = `videos/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  showSpinner('Subiendo video...');
  const { error } = await sb.storage.from('vehicle-images').upload(path, pendingVideo, { cacheControl:'3600', upsert:false, contentType:pendingVideo.type });
  if (error) { showToast('Error subiendo video: '+error.message,'error'); return currentVideoUrl||null; }
  const { data } = sb.storage.from('vehicle-images').getPublicUrl(path);
  return data.publicUrl;
}

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

  // Leer vendedores
  const sellers = readSellers();
  const primary = sellers[0] || {};

  showSpinner(editId ? 'Actualizando anuncio...' : 'Publicando anuncio...');
  try {
    const imageUrls = await uploadImages();
    let videoUrl = currentVideoUrl || null;
    if (pendingVideo) {
      const oldV = editId ? vehicles.find(x=>x.id===editId) : null;
      if (oldV?.video_url) await deleteOldVideo(oldV.video_url);
      videoUrl = await uploadVideo();
    } else if (!currentVideoUrl && editId) {
      const oldV = vehicles.find(x=>x.id===editId);
      if (oldV?.video_url) await deleteOldVideo(oldV.video_url);
      videoUrl = null;
    }

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
      // Vendedor principal (retrocompatibilidad)
      seller_name: primary.name||null,
      whatsapp:    primary.whatsapp||null,
      phone:       primary.phone||null,
      email:       primary.email||null,
      // Array de todos los vendedores
      sellers:     sellers,
      description: document.getElementById('f-desc').value.trim()||null,
      images:      imageUrls,
      video_url:   videoUrl,
    };

    let error;
    if (editId) { ({ error } = await sb.from('vehicles').update(v).eq('id', editId)); }
    else        { ({ error } = await sb.from('vehicles').insert([v])); }
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
    if(v.images&&v.images.length){
      const paths=v.images.map(url=>{const p=url.split('/vehicle-images/');return p[1]||null;}).filter(Boolean);
      if(paths.length) await sb.storage.from('vehicle-images').remove(paths);
    }
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
  openGallery(v.images||[], document.getElementById('detailGallery'), true);

  const isSold = !!v.sold;
  let deleteInfo = '';
  if (isSold && v.delete_after) {
    const daysLeft = Math.ceil((new Date(v.delete_after)-Date.now())/86400000);
    deleteInfo = `<div class="sold-delete-notice" style="margin-bottom:14px">⏳ Se eliminará en ${daysLeft} día${daysLeft!==1?'s':''}</div>`;
  }

  const videoSection = v.video_url
    ? `<div style="margin-bottom:18px">
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--blue);margin-bottom:8px">🎬 Video del vehículo</div>
        <video src="${v.video_url}" controls style="width:100%;border-radius:var(--r);max-height:280px;background:#000"></video>
       </div>` : '';

  // Construir sección de vendedores
  const sellers = (v.sellers && Array.isArray(v.sellers) && v.sellers.length)
    ? v.sellers
    : (v.seller_name ? [{ name: v.seller_name, whatsapp: v.whatsapp, phone: v.phone, email: v.email }] : []);

  const sellersHtml = sellers.length
    ? `<div class="multi-sellers-section">
        <div class="multi-sellers-title">👥 Vendedor${sellers.length>1?'es':''}</div>
        ${sellers.map(s => `
          <div class="multi-seller-card">
            <div class="multi-seller-avatar">${(s.name||'V').charAt(0).toUpperCase()}</div>
            <div class="multi-seller-info">
              <div class="multi-seller-name">${s.name||'Sin nombre'}</div>
              <div class="multi-seller-contacts">
                ${s.whatsapp?`<a href="https://wa.me/57${s.whatsapp}?text=Hola,%20me%20interesa%20el%20${encodeURIComponent(v.brand+' '+v.model+' '+v.year)}" target="_blank" style="background:var(--green);color:#fff">💬 ${s.whatsapp}</a>`:''}
                ${s.phone&&s.phone!==s.whatsapp?`<a href="tel:${s.phone}" style="background:var(--blue-soft);color:var(--blue)">📞 ${s.phone}</a>`:''}
                ${s.email?`<span style="background:var(--blue-pale);color:var(--blue);padding:4px 10px;border-radius:20px;font-size:11.5px">✉️ ${s.email}</span>`:''}
              </div>
            </div>
          </div>`).join('')}
       </div>`
    : `<div class="seller-card"><div class="seller-avatar">?</div><div class="seller-info"><div class="seller-name">Sin vendedor</div></div></div>`;

  document.getElementById('detailContent').innerHTML=`
    ${isSold ? `<div style="background:#dc2626;color:#fff;text-align:center;font-weight:800;font-size:13px;padding:8px;letter-spacing:2px;margin-bottom:14px;border-radius:var(--r-sm)">🔴 VENDIDO</div>` : ''}
    ${deleteInfo}
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
    ${sellersHtml}
    <div class="detail-actions">
      <button class="btn btn-primary" style="flex:2" onclick="closeDetail();editVehicle('${v.id}')">✏️ Editar</button>
      <button class="${isSold?'btn-unsold':'btn-sold'}" style="flex:1;padding:12px" onclick="toggleSold('${v.id}',${isSold})">${isSold?'✅ Reactivar':'🔴 Vendido'}</button>
      <button class="btn btn-danger-sm" style="flex:1;padding:12px" onclick="deleteVehicle('${v.id}')">🗑 Eliminar</button>
    </div>`;
  document.getElementById('detailModal').classList.add('open');
}
function closeDetail() { document.getElementById('detailModal').classList.remove('open'); }

// ─── LEADS SEGUROS ─────────────────────────────
async function loadInsuranceLeads() {
  const container = document.getElementById('insuranceLeadsContainer');
  if (!container) return;
  container.innerHTML = '<p style="color:var(--gray-400);padding:20px">Cargando solicitudes...</p>';
  try {
    const { data, error } = await sb.from('insurance_leads').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    if (!data || !data.length) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">🛡️</div><h3>Sin solicitudes de seguros</h3><p>Cuando un cliente cotice un seguro, aparecerá aquí.</p></div>';
      return;
    }
    const typeLabel = { todo_riesgo: '🚗 Todo Riesgo', poliza_extra: '📋 Póliza Extra', contractual: '📄 Contractual' };
    container.innerHTML = `
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;background:var(--white);border-radius:var(--r);overflow:hidden;box-shadow:var(--sh-sm)">
          <thead>
            <tr style="background:var(--blue);color:#fff">
              <th style="padding:12px 16px;text-align:left;font-size:12px">Tipo</th>
              <th style="padding:12px 16px;text-align:left;font-size:12px">Plan</th>
              <th style="padding:12px 16px;text-align:left;font-size:12px">Cliente</th>
              <th style="padding:12px 16px;text-align:left;font-size:12px">Teléfono</th>
              <th style="padding:12px 16px;text-align:left;font-size:12px">Correo</th>
              <th style="padding:12px 16px;text-align:left;font-size:12px">Vehículo</th>
              <th style="padding:12px 16px;text-align:left;font-size:12px">Fecha</th>
            </tr>
          </thead>
          <tbody>
            ${data.map((lead,i) => `
              <tr style="border-bottom:1px solid var(--gray-100);background:${i%2===0?'var(--white)':'var(--off-white)'}">
                <td style="padding:10px 16px;font-size:12px;font-weight:700;color:var(--blue)">${typeLabel[lead.insurance_type]||lead.insurance_type}</td>
                <td style="padding:10px 16px;font-size:12px">${lead.plan_name||'—'}</td>
                <td style="padding:10px 16px;font-size:13px;font-weight:600">${lead.client_name}</td>
                <td style="padding:10px 16px;font-size:12px"><a href="https://wa.me/57${lead.client_phone}" target="_blank" style="color:var(--green);font-weight:600">${lead.client_phone}</a></td>
                <td style="padding:10px 16px;font-size:12px">${lead.client_email}</td>
                <td style="padding:10px 16px;font-size:12px">${lead.vehicle_info||'—'}</td>
                <td style="padding:10px 16px;font-size:11px;color:var(--gray-400)">${new Date(lead.created_at).toLocaleDateString('es-CO')}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  } catch(e) {
    container.innerHTML = `<p style="color:var(--danger);padding:20px">Error al cargar leads: ${e.message}</p>`;
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
  if(e.key==='Escape'){closeAddModal();closeDetail();closeLightbox();}
  if(e.key==='n'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)&&currentUser) openAddModal();
  if(e.key==='ArrowLeft') lightboxMove(-1);
  if(e.key==='ArrowRight') lightboxMove(1);
});

// ─── LIGHTBOX (admin) ──────────────────────────
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
  const wrap = document.getElementById('lightboxThumbs');
  if (_lbImgs.length > 1) {
    wrap.innerHTML = _lbImgs.map((src,i) =>
      `<img class="lightbox-thumb ${i===_lbIdx?'active':''}"
        src="${src}" alt="Foto ${i+1}"
        onclick="event.stopPropagation();_lbIdx=${i};renderLightbox()"/>`
    ).join('');
    setTimeout(() => {
      const active = wrap.querySelector('.lightbox-thumb.active');
      if (active) active.scrollIntoView({ behavior:'smooth', block:'nearest', inline:'center' });
    }, 50);
  } else {
    wrap.innerHTML = '';
  }
  document.querySelectorAll('.lightbox-arrow').forEach(a =>
    a.style.display = _lbImgs.length > 1 ? '' : 'none'
  );
}

// Sobreescribir openGallery para admin con soporte lightbox
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
