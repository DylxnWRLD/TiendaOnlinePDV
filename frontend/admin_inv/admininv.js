/********** Config **********/
/********** Config **********/
const USE_HTTP = true; 

// ⭐️ CORRECCIÓN: Apuntar al servidor de Render
const RENDER_SERVER_URL = 'https://tiendaonlinepdv-hm20.onrender.com';

/********** Utils UI **********/
const $  = (s, c=document)=>c.querySelector(s);
const $$ = (s, c=document)=>Array.from(c.querySelectorAll(s));
const fmtMoney = n => "$" + (Number(n||0)).toFixed(2);

function toast(msg, kind="ok"){
  const box = $("#toasts");
  const div = document.createElement("div");
  div.className = `toast toast--${kind}`;
  div.innerHTML = `<i class="fa-solid ${kind==='ok'?'fa-circle-check':kind==='warn'?'fa-triangle-exclamation':'fa-circle-xmark'}"></i> ${msg}`;
  box.appendChild(div);
  setTimeout(()=>div.remove(), 2500);
}

function timeAgo(ts){
  if(!ts) return "Sin cambios recientes";
  const diff = Math.max(0, Date.now() - ts);
  const m = Math.floor(diff/60000);
  if (m<1) return "Actualizado hace segundos";
  if (m===1) return "Actualizado hace 1 minuto";
  if (m<60) return `Actualizado hace ${m} minutos`;
  const h=Math.floor(m/60);
  return `Actualizado hace ${h}h`;
}

/********** Data Adapters **********/
class HttpAdapter {
  constructor(base){ this.base = base; }
  async list({search="", page=1, limit=10}={}){
    const url = new URL(`${RENDER_SERVER_URL}/api/products`);
    url.searchParams.set("search", search);
    url.searchParams.set("page", page);
    url.searchParams.set("limit", limit);
    const r = await fetch(url);
    if(!r.ok) throw new Error("Error listando productos");
    return r.json();
  }
// Esta es la función que tienes que arreglar
  async get(id){
    // ⬇️ CORRECCIÓN: Usar backticks (`) en lugar de $[ ⬇️
    const r = await fetch(`${RENDER_SERVER_URL}/api/products/${id}`);
    
    if(!r.ok) throw new Error("No encontrado");
    return r.json();
  }
  async create(input){ // 'input' ahora es el FormData
    // ⭐️ CAMBIO: quitamos headers['Content-Type'] y JSON.stringify ⭐️
    const r = await fetch(`${RENDER_SERVER_URL}/api/products`, {
      method:"POST",
      body: input // Enviamos el FormData directamente
    });
    // El navegador pondrá el 'Content-Type: multipart/form-data' automáticamente

    if(!r.ok) throw new Error((await r.json()).message||"Error creando");
    return r.json();
  }
  async update(id, patch){
    // ⬇️ CORRECCIÓN: Añadir /${id} al final de la URL ⬇️
    const r = await fetch(`${RENDER_SERVER_URL}/api/products/${id}`, {
      method:"PUT", headers:{"Content-Type":"application/json"},
      body: JSON.stringify(patch)
    });
    if(!r.ok) throw new Error((await r.json()).message||"Error actualizando");
    return r.json();
  }
  async remove(id){
    // ⬇️ CORRECCIÓN: Añadir /${id} al final de la URL ⬇️
    const r = await fetch(`${RENDER_SERVER_URL}/api/products/${id}`, {method:"DELETE"});
    if(!r.ok) throw new Error("Error eliminando");
    return {ok:true};
  }
  async adjust({productId, type, quantity, reason}){
    // ⬇️ CORRECCIÓN: Usa backticks (`) y quita credentials ⬇️
    const r = await fetch(`${RENDER_SERVER_URL}/api/stock/adjust`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({productId, type, quantity, reason})
    });
      if(!r.ok) throw new Error((await r.json()).message||"Error de ajuste");
      return r.json();
  }
}

const LSK_PRODUCTS = "inv_products_v2";
const LSK_LAST = "inv_last_change_v2";
class MemoryAdapter {
  constructor(){
    this.products = JSON.parse(localStorage.getItem(LSK_PRODUCTS) || "[]");
    if(this.products.length===0) this.seed();
    this.persist();
  }
  seed(){
    this.products = [
      { _id: uid(), sku:"001", name:"PlayStation 5", brand:"Sony", price:499.99, stockQty:150, minStock:10, active:true, description:"", images:[] },
      { _id: uid(), sku:"002", name:"Xbox Series X", brand:"Microsoft", price:499.99, stockQty:120, minStock:10, active:true, description:"", images:[] },
      { _id: uid(), sku:"003", name:"Nintendo Switch", brand:"Nintendo", price:349.99, stockQty:200, minStock:20, active:true, description:"", images:[] },
    ];
    setLastChange();
  }
  persist(){
    localStorage.setItem(LSK_PRODUCTS, JSON.stringify(this.products));
  }
  list({search="", page=1, limit=10}={}){
    const q = search.trim().toLowerCase();
    let data = [...this.products];
    if(q) data = data.filter(p =>
      p.sku.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      (p.brand||"").toLowerCase().includes(q)
    );
    const total = data.length;
    const start = (page-1)*limit;
    const items = data.slice(start, start+limit);
    return {items, total};
  }
  get(id){ return this.products.find(p=>p._id===id); }
  create(input){
    if(this.products.some(p=>p.sku.toLowerCase()===String(input.sku||"").toLowerCase()))
      throw new Error("SKU ya existe");
    const doc = {...sanitize(input), _id: uid()};
    this.products.unshift(doc);
    this.persist(); setLastChange();
    return doc;
  }
  update(id, patch){
    const i = this.products.findIndex(p=>p._id===id);
    if(i===-1) throw new Error("Producto no encontrado");
    if(patch.sku && this.products.some(p=>p._id!==id && p.sku.toLowerCase()===patch.sku.toLowerCase()))
      throw new Error("SKU ya existe");
    this.products[i] = {...this.products[i], ...sanitize(patch)};
    this.persist(); setLastChange();
    return this.products[i];
  }
  remove(id){
    const i = this.products.findIndex(p=>p._id===id);
    if(i===-1) throw new Error("Producto no encontrado");
    this.products.splice(i,1);
    this.persist(); setLastChange();
    return {ok:true};
  }
  adjust({productId, type, quantity}){
    const p = this.get(productId);
    if(!p) throw new Error("Producto no encontrado");
    let q = Number(quantity||0);
    if(!Number.isFinite(q) || q<=0) throw new Error("Cantidad inválida");
    if(type==="OUT") q = -q;
    // type==="ADJUST" aplica delta como venga
    p.stockQty = Math.max(0, (Number(p.stockQty)||0) + q);
    this.persist(); setLastChange();
    return {ok:true, stockQty:p.stockQty};
  }
}
function sanitize(o){
  const n = {...o};
  n.price = Number(n.price||0);
  n.stockQty = Number(n.stockQty||0);
  n.minStock = Number(n.minStock||0);
  n.active = !!n.active;
  if(typeof n.images==="string" && n.images.trim()) n.images=[n.images.trim()];
  return n;
}
function uid(){ return (self.crypto?.randomUUID?.() || String(Date.now()+Math.random())).replace(/-/g,""); }
function setLastChange(){ localStorage.setItem(LSK_LAST, String(Date.now())); }

/********** UI Controller **********/
const api = USE_HTTP ? new HttpAdapter(RENDER_SERVER_URL) : new MemoryAdapter();

const state = {page:1, limit:10, search:""};
const el = {
  tbody: $("#tbody"),
  meta: $("#meta"),
  page: $("#page"),
  prev: $("#prev"),
  next: $("#next"),
  search: $("#search"),
  btnSearch: $("#btnSearch"),
  btnNew: $("#btnNew"),
  lastUpdated: $("#lastUpdated"),
  modalForm: $("#modalForm"),
  form: $("#form"),
  formTitle: $("#formTitle"),
  save: $("#save"),
  modalStock: $("#modalStock"),
  formAdjust: $("#formAdjust"),
  applyAdjust: $("#applyAdjust"),
};

function updateLast(){
  const ts = Number(localStorage.getItem(LSK_LAST)||0);
  el.lastUpdated.textContent = timeAgo(ts);
}

function badgeFor(p){
  if(p.stockQty<=0) return `<span class="badge badge--off">Sin stock</span>`;
  if(p.stockQty<= (p.minStock||0)) return `<span class="badge badge--low">Bajo (${p.stockQty})</span>`;
  return `<span class="badge badge--ok">${p.stockQty}</span>`;
}

function renderRows(list){
  el.tbody.innerHTML = list.map(p=>`
    <tr>
      <td>${escape(p.sku)}</td>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div class="thumb">${p.images?.[0] ? `<img src="${escapeAttr(p.images[0])}" alt="">` : '<i class="fa-solid fa-box"></i>'}</div>
          <div>
            <div style="font-weight:700">${escape(p.name)}</div>
            <div class="muted" style="font-size:12px">${escape(p.description||"")}</div>
          </div>
        </div>
      </td>
      <td>${escape(p.brand||"—")}</td>
      <td>${fmtMoney(p.price)}</td>
      <td>${badgeFor(p)}</td>
      <td>${p.active ? '<span class="badge badge--ok">Activo</span>' : '<span class="badge badge--off">Inactivo</span>'}</td>
      <td>
        <div class="row-actions">
          <button class="btn" data-edit="${p._id}" title="Editar"><i class="fa-solid fa-pen"></i></button>
          <button class="btn" data-adj="${p._id}" title="Ajustar stock"><i class="fa-solid fa-arrow-up-right-dots"></i></button>
          <button class="btn btn--danger" data-del="${p._id}" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join("");
  $$("button[data-edit]").forEach(b=>b.addEventListener("click", ()=>openEdit(b.dataset.edit)));
  $$("button[data-del]").forEach(b=>b.addEventListener("click", ()=>removeProduct(b.dataset.del)));
  $$("button[data-adj]").forEach(b=>b.addEventListener("click", ()=>openAdjust(b.dataset.adj)));
}

function paginate(total){
  const pages = Math.max(1, Math.ceil(total/state.limit));
  el.page.textContent = `${state.page} / ${pages}`;
  el.prev.disabled = state.page<=1;
  el.next.disabled = state.page>=pages;
  el.meta.textContent = `${total} producto${total===1?'':'s'}`;
}

async function refresh(){
  const {items, total} = await api.list(state);
  renderRows(items); paginate(total); updateLast();
}

/********** Handlers **********/
el.btnNew.addEventListener("click", openCreate);
el.btnSearch.addEventListener("click", ()=>{ state.search = el.search.value.trim(); state.page=1; refresh(); });
el.search.addEventListener("keydown", e=>{ if(e.key==="Enter"){ state.search = el.search.value.trim(); state.page=1; refresh(); }});
el.prev.addEventListener("click", ()=>{ if(state.page>1){ state.page--; refresh(); }});
el.next.addEventListener("click", ()=>{ state.page++; refresh(); });

$$("[data-close]").forEach(b=>b.addEventListener("click", closeModals));
[el.modalForm, el.modalStock].forEach(m=>m.addEventListener("click", e=>{ if(e.target===m) closeModals(); }));

el.save.addEventListener("click", async ()=>{
  const payload = collectForm();
  try{
    if(payload._id){ await api.update(payload._id, payload); toast("Producto actualizado","ok"); }
    else{ await api.create(payload); toast("Producto creado","ok"); }
    closeModals(); refresh();
  }catch(err){ toast(err.message||"Error", "err"); }
});

el.applyAdjust.addEventListener("click", async ()=>{
  const productId = $("#adjId").value;
  const type = $("#adjType").value;
  const quantity = Number($("#adjQty").value);
  const reason = $("#adjReason").value.trim();
  try{
    await api.adjust({productId, type, quantity, reason});
    closeModals(); toast("Stock actualizado","ok"); refresh();
  }catch(err){ toast(err.message||"Error", "err"); }
});

/********** CRUD UI **********/
function openCreate(){
  $("#form").reset();
  $("#id").value = "";
  $("#active").checked = true;
  $("#formTitle").textContent = "Nuevo producto";
  el.modalForm.classList.remove("hidden");
}

async function openEdit(id){
  try {
    // 1. Llama a la API y espera (await) a que lleguen los datos del producto
    const p = await api.get(id); 

    // 2. Llena el formulario con los datos recibidos
    fillForm(p); 

    // 3. Muestra el modal
    $("#formTitle").textContent = "Editar producto";
    el.modalForm.classList.remove("hidden");

  } catch (err) {
    // 4. Muestra un error si no se pudo cargar el producto
    toast(err.message || "Error al cargar el producto", "err");
  }
}

function removeProduct(id){
  if(!confirm("¿Eliminar producto?")) return;
  api.remove(id).then(()=>{ toast("Producto eliminado","ok"); refresh(); })
    .catch(e=>toast(e.message||"Error","err"));
}

function openAdjust(id){
  $("#formAdjust").reset();
  $("#adjId").value = id;
  $("#adjType").value = "IN";
  $("#adjQty").value = 1;
  $("#adjReason").value = "";
  el.modalStock.classList.remove("hidden");
}

function closeModals(){ el.modalForm.classList.add("hidden"); el.modalStock.classList.add("hidden"); }

function fillForm(p){
  $("#id").value = p?._id || "";
  $("#sku").value = p?.sku || "";
  $("#name").value = p?.name || "";
  $("#brand").value = p?.brand || "";
  $("#price").value = p?.price ?? "";
  $("#stock").value = p?.stockQty ?? 0;
  $("#minStock").value = p?.minStock ?? 0;
  $("#desc").value = p?.description || "";
  $("#active").checked = !!(p?.active ?? true);
}

function collectForm(){
  // 1. Primero validamos los datos de texto (como antes)
  const sku = $("#sku").value.trim();
  const name = $("#name").value.trim();
  const price = Number($("#price").value);

  if(!sku || !name || !Number.isFinite(price)) {
    throw new Error("Completa SKU, Nombre y Precio");
  }

  // 2. ⭐️ CAMBIO: Creamos un objeto FormData ⭐️
  const formData = new FormData();

  // 3. Agregamos todos los campos de texto al FormData
  formData.append('_id', $("#id").value || undefined);
  formData.append('sku', sku);
  formData.append('name', name);
  formData.append('brand', $("#brand").value.trim());
  formData.append('price', price);
  formData.append('stockQty', Number($("#stock").value));
  formData.append('minStock', Number($("#minStock").value||0));
  formData.append('description', $("#desc").value.trim());
  formData.append('active', $("#active").checked);

  // 4. ⭐️ CAMBIO: Buscamos el archivo de imagen ⭐️
  const imageFile = $("#imageUpload").files[0];

  if (imageFile) {
    // Y lo agregamos al FormData. El nombre 'imageUpload'
    // debe coincidir con el de multer: upload.single('imageUpload')
    formData.append('imageUpload', imageFile);
  }

  // 5. Devolvemos el FormData
  return formData;
}

/********** Helpers **********/
function escape(s=""){return s.replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function escapeAttr(s=""){return s.replace(/"/g,"&quot;");}

/********** Init **********/
refresh();
