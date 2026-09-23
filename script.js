// ── Configuración de conexión con APEX ──
const API_BASE = "https://g77c4bcbbfcc811-lomiapp.adb.sa-santiago-1.oraclecloudapps.com/ords/lomiapp/lomiterias";
const LOCAL_SLUG = "lomimarc";
// ─────────────────────────────────────────

const WA = "595973799518";

// HOURS y DELIVERY_FEE ahora se cargan desde la API (ver cargarMenu),
// pero dejamos estos valores por si la API falla, como respaldo.
let HOURS = { open: 11, close: 23 };
let DELIVERY_FEE = 10000;

let MENU = [];

function gs(n){return "Gs. " + n.toLocaleString('es-PY');}

// ── Carga el menú desde APEX (reemplaza el MENU fijo de antes) ──
async function cargarMenu(){
  try{
    const res = await fetch(`${API_BASE}/menu/${LOCAL_SLUG}`);
    if(!res.ok) throw new Error('Respuesta no OK: ' + res.status);
    const data = await res.json();

    MENU = data.categorias.map(cat => ({
      id: cat.titulo.toLowerCase().replace(/[^a-z0-9]+/g,'-'), // id generado del título
      title: cat.titulo,
      sub: cat.subtitulo || "",
      icon: cat.icono || "",
      compact: !!cat.compacta,
      items: cat.productos.map(p => ({
        id: p.id,           // producto_id real de la base, lo necesitamos para el pedido
        n: p.nombre,
        d: p.descripcion || "",
        p: Object.fromEntries(p.precios.map(pr => [pr.variante, pr.precio]))
      }))
    }));

    renderMenu();
  }catch(err){
    console.error('No se pudo cargar el menú desde APEX:', err);
    document.getElementById('menu').innerHTML =
      '<div class="empty">No pudimos cargar el menú. Recargá la página o intentá más tarde.</div>';
  }
}

function renderMenu(){
  const main = document.getElementById('menu');
  main.innerHTML = MENU.map(cat => `
    <section class="cat" id="${cat.id}">
      <h2>${cat.icon} ${cat.title}</h2>
      ${cat.sub ? `<div class="sub">${cat.sub}</div>` : ''}
      <div class="grid ${cat.compact ? 'grid-compact' : ''}">
        ${cat.items.map(it => `
          <div class="card">
            <h3>${it.n}</h3>
            ${it.d ? `<p>${it.d}</p>` : ''}
            <div class="priceRow">
              ${Object.entries(it.p).map(([label,price]) => {
                const tag = (cat.id.includes('gourmet') || cat.id.includes('caseras')) ? ` - ${cat.id.includes('gourmet')?'Gourmet':'Casera'}` : '';
                return `
                <button class="pbtn ${Object.keys(it.p).length===1?'single':''}" onclick='addItem(${it.id}, ${JSON.stringify(label)}, ${JSON.stringify(cat.id+"|"+it.n+"|"+label)}, ${JSON.stringify(it.n+" ("+label+")"+tag)}, ${price})'>
                  ${label}<small>${gs(price)}</small>
                </button>`;
              }).join('')}
            </div>
          </div>`).join('')}
      </div>
    </section>`).join('');
}

function renderHoursBadge(){
  const badge = document.getElementById('hoursBadge');
  const h = new Date().getHours();
  const isOpen = h >= HOURS.open && h < HOURS.close;
  badge.classList.toggle('open', isOpen);
  badge.classList.toggle('closed', !isOpen);
  badge.innerHTML = isOpen
    ? `<span class="dot"></span> Abierto ahora · Cierra ${HOURS.close}:00hs`
    : `<span class="dot"></span> Cerrado ahora · Abrimos ${HOURS.open}:00hs`;
}

let mode = 'delivery';   // 'delivery' | 'pickup' | 'local'
let pay = 'efectivo';    // 'efectivo' | 'transferencia'
let sendLoc = false;     // true si va a mandar la ubicación por WhatsApp en vez de escribirla

function setMode(m){
  mode = m;
  document.querySelectorAll('#modeSeg .segbtn').forEach(b=>b.classList.toggle('active', b.dataset.mode===m));
  document.getElementById('addressGroup').classList.toggle('hidden', m!=='delivery');
  document.getElementById('deliveryRow').classList.toggle('hidden', m!=='delivery');
  document.getElementById('tableGroup').classList.toggle('hidden', m!=='local');
  renderCart();
}
function onTableInput(){
  document.getElementById('tableWarning').classList.remove('show');
  renderCart();
}
function setPay(p){
  pay = p;
  document.querySelectorAll('#paySeg .segbtn').forEach(b=>b.classList.toggle('active', b.dataset.pay===p));
}
function onAddressInput(){
  document.getElementById('addressWarning').classList.remove('show');
  renderCart();
}
function onNameInput(){
  document.getElementById('nameWarning').classList.remove('show');
  renderCart();
}
function onPhoneInput(){
  document.getElementById('phoneWarning').classList.remove('show');
  renderCart();
}
function toggleLocMode(){
  sendLoc = !sendLoc;
  const input = document.getElementById('addressInput');
  const btn = document.getElementById('locBtn');
  btn.classList.toggle('active', sendLoc);
  btn.textContent = sendLoc ? '📍 Vas a mandar tu ubicación por WhatsApp' : '📍 Voy a enviar mi ubicación por WhatsApp';
  input.classList.toggle('hidden', sendLoc);
  if(sendLoc) input.value = '';
  document.getElementById('addressWarning').classList.remove('show');
  renderCart();
}

let cart = [];
try{ const saved = localStorage.getItem('lomimarc_cart'); if(saved) cart = JSON.parse(saved); }catch(e){}

function save(){ try{ localStorage.setItem('lomimarc_cart', JSON.stringify(cart)); }catch(e){} }

// addItem ahora también guarda producto_id y variante, que necesitamos para el pedido en APEX
function addItem(productoId, variante, key, name, price){
  const existing = cart.find(c=>c.key===key);
  if(existing) existing.qty++;
  else cart.push({productoId, variante, key, name, price, qty:1});
  save(); renderCart(); openCart();
}
function changeQty(i, delta){
  cart[i].qty += delta;
  if(cart[i].qty<=0) cart.splice(i,1);
  save(); renderCart();
}
function removeItem(i){
  cart.splice(i,1);
  save(); renderCart();
}
function clearCart(){
  if(cart.length===0) return;
  if(!confirm('¿Vaciar todo el pedido?')) return;
  cart = [];
  save(); renderCart();
}
const TRASH_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>';
function renderCart(){
  const box = document.getElementById('items');
  const count = cart.reduce((a,c)=>a+c.qty,0);
  document.getElementById('cartCount').textContent = count;
  document.getElementById('clearBtn').disabled = cart.length===0;
  if(cart.length===0){
    box.innerHTML = '<div class="empty">Todavía no agregaste nada.<br>Elegí algo rico del menú 👀</div>';
  } else {
    box.innerHTML = cart.map((c,i)=>`
      <div class="line">
        <div class="info"><b>${c.name}</b><span>${gs(c.price)} c/u</span><span class="sub">${gs(c.price*c.qty)}</span></div>
        <div class="qty">
          <button onclick="changeQty(${i},-1)" aria-label="Restar">−</button><b>${c.qty}</b><button onclick="changeQty(${i},1)" aria-label="Sumar">+</button>
        </div>
        <button class="trash" onclick="removeItem(${i})" aria-label="Eliminar ${c.name}">${TRASH_ICON}</button>
      </div>`).join('');
  }
  const total = cart.reduce((a,c)=>a+c.price*c.qty,0);
  const deliveryFee = (mode==='delivery' && cart.length>0) ? DELIVERY_FEE : 0;
  const grandTotal = total + deliveryFee;
  document.getElementById('subtotalVal').textContent = gs(total);
  document.getElementById('deliveryVal').textContent = gs(deliveryFee);
  document.getElementById('totalVal').textContent = gs(grandTotal);

  const btn = document.getElementById('checkout');
  const address = document.getElementById('addressInput').value.trim();
  const name = document.getElementById('nameInput').value.trim();
  const phone = document.getElementById('phoneInput').value.trim();
  const table = document.getElementById('tableInput').value.trim();
  const needsAddress = mode==='delivery' && cart.length>0 && address==='' && !sendLoc;
  const needsTable = mode==='local' && cart.length>0 && table==='';
  const needsName = cart.length>0 && name==='';
  const needsPhone = cart.length>0 && phone==='';

  // El botón ya no arma un link href directo: ahora siempre corre confirmarPedido(),
  // que primero guarda el pedido en APEX y recién después abre WhatsApp.
  btn.removeAttribute('href');

  if(cart.length===0){
    btn.classList.add('disabled');
    btn.onclick = function(e){ e.preventDefault(); };
    document.getElementById('addressWarning').classList.remove('show');
    document.getElementById('tableWarning').classList.remove('show');
    document.getElementById('nameWarning').classList.remove('show');
    document.getElementById('phoneWarning').classList.remove('show');
  } else if(needsName){
    btn.classList.remove('disabled');
    btn.onclick = function(e){ e.preventDefault(); document.getElementById('nameInput').focus(); document.getElementById('nameWarning').classList.add('show'); };
  } else if(needsPhone){
    btn.classList.remove('disabled');
    btn.onclick = function(e){ e.preventDefault(); document.getElementById('phoneInput').focus(); document.getElementById('phoneWarning').classList.add('show'); };
  } else if(needsAddress){
    btn.classList.remove('disabled');
    btn.onclick = function(e){ e.preventDefault(); document.getElementById('addressInput').focus(); document.getElementById('addressWarning').classList.add('show'); };
  } else if(needsTable){
    btn.classList.remove('disabled');
    btn.onclick = function(e){ e.preventDefault(); document.getElementById('tableInput').focus(); document.getElementById('tableWarning').classList.add('show'); };
  } else {
    btn.classList.remove('disabled');
    document.getElementById('addressWarning').classList.remove('show');
    document.getElementById('tableWarning').classList.remove('show');
    document.getElementById('nameWarning').classList.remove('show');
    document.getElementById('phoneWarning').classList.remove('show');
    btn.onclick = function(e){ e.preventDefault(); confirmarPedido(name, phone, address, table, total, deliveryFee, grandTotal); };
  }
}

// ── Guarda el pedido en APEX y recién después abre WhatsApp ──
async function confirmarPedido(name, phone, address, table, total, deliveryFee, grandTotal){
  const btn = document.getElementById('checkout');
  const textoOriginal = btn.textContent;
  btn.classList.add('disabled');
  btn.textContent = 'Enviando pedido...';

  const tipoEntrega = mode === 'delivery' ? 'DELIVERY' : (mode === 'local' ? 'LOCAL' : 'RETIRO');

  const payload = {
    nombre_cliente: name,
    telefono: phone,
    tipo_entrega: tipoEntrega,
    direccion: mode === 'delivery' && !sendLoc ? address : null,
    envia_ubicacion: mode === 'delivery' && sendLoc ? 1 : 0,
    metodo_pago: pay === 'efectivo' ? 'EFECTIVO' : 'TRANSFERENCIA',
    numero_mesa: mode === 'local' ? table : null,
    items: cart.map(c => ({
      producto_id: c.productoId,
      variante: c.variante,
      cantidad: c.qty
    }))
  };

  let pedidoId = null;
  try{
    const res = await fetch(`${API_BASE}/pedidos/${LOCAL_SLUG}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if(data.ok) pedidoId = data.pedido_id;
  }catch(err){
    console.error('No se pudo guardar el pedido en APEX:', err);
  }

  // Arma el mensaje de WhatsApp igual que antes, agregando el número de pedido si se guardó
  let msg = pedidoId
    ? `Hola LomiMarc! 👋 Quiero hacer el pedido #${pedidoId}:%0A%0A`
    : "Hola LomiMarc! 👋 Quiero hacer este pedido:%0A%0A";
  cart.forEach(c=> msg += `• ${c.qty}x ${c.name} — ${gs(c.price*c.qty)}%0A`);
  msg += `%0ASubtotal: ${gs(total)}%0A`;
  if(mode==='delivery') msg += `Envío: ${gs(deliveryFee)}%0A`;
  msg += `Total: ${gs(grandTotal)}%0A%0A`;
  msg += `Nombre: ${encodeURIComponent(name)}%0A`;
  msg += `Teléfono: ${encodeURIComponent(phone)}%0A`;
  const modoTexto = mode==='delivery' ? 'Delivery' : (mode==='local' ? 'Consumo en el local' : 'Retiro en local');
  msg += `Forma de entrega: ${modoTexto}%0A`;
  if(mode==='delivery'){
    msg += sendLoc
      ? `Dirección: (te mando la ubicación por acá 📍)%0A`
      : `Dirección: ${encodeURIComponent(address)}%0A`;
  }
  if(mode==='local'){
    msg += `Mesa: ${encodeURIComponent(table)}%0A`;
  }
  msg += `Método de pago: ${pay==='efectivo' ? 'Efectivo' : 'Transferencia'}`;

  window.open(`https://wa.me/${WA}?text=${msg}`, '_blank');

  btn.textContent = textoOriginal;

  if(!pedidoId){
    alert('El pedido se envió por WhatsApp, pero no pudimos guardarlo en el sistema. Avisá al local si no llega tu mensaje.');
  }

  resetPedido();
}

// ── Limpia el carrito y todos los campos del formulario después de enviar el pedido ──
function resetPedido(){
  cart = [];
  save();

  document.getElementById('nameInput').value = '';
  document.getElementById('phoneInput').value = '';
  document.getElementById('addressInput').value = '';
  document.getElementById('tableInput').value = '';

  mode = 'delivery';
  pay = 'efectivo';
  sendLoc = false;

  document.querySelectorAll('#modeSeg .segbtn').forEach(b=>b.classList.toggle('active', b.dataset.mode==='delivery'));
  document.querySelectorAll('#paySeg .segbtn').forEach(b=>b.classList.toggle('active', b.dataset.pay==='efectivo'));
  document.getElementById('addressGroup').classList.remove('hidden');
  document.getElementById('deliveryRow').classList.remove('hidden');
  document.getElementById('tableGroup').classList.add('hidden');

  const locBtn = document.getElementById('locBtn');
  locBtn.classList.remove('active');
  locBtn.textContent = '📍 Voy a enviar mi ubicación por WhatsApp';
  document.getElementById('addressInput').classList.remove('hidden');

  document.getElementById('addressWarning').classList.remove('show');
  document.getElementById('tableWarning').classList.remove('show');
  document.getElementById('nameWarning').classList.remove('show');
  document.getElementById('phoneWarning').classList.remove('show');

  renderCart();
  closeCart();
}

function openCart(){ document.getElementById('drawer').classList.add('show'); document.getElementById('overlay').classList.add('show'); }
function closeCart(){ document.getElementById('drawer').classList.remove('show'); document.getElementById('overlay').classList.remove('show'); }

// ── Arranque ──
cargarMenu();      // reemplaza al renderMenu() directo de antes
renderHoursBadge();
renderCart();
