const WA = "595991729311";

// ── Editá estos valores según los datos reales de LomiMarc ──
const HOURS = { open: 11, close: 23 };           // horario de atención (formato 24hs)
const DELIVERY_FEE = 5000;                        // costo fijo de envío en Gs.
// ──────────────────────────────────────────────────────────

const MENU = [
 {id:"gourmet", title:"Hamburguesas gourmet", sub:"100% de vacío", icon:"🍔", items:[
   {n:"Hamburguesa Jr.", d:"Pan, carne 100% de vacío, queso cheddar, ketchup", p:{Normal:17000,Combo:22000}},
   {n:"Hamburguesa Normal", d:"Carne 100% de vacío, tomate, lechuga repollada, cebolla morada, salsa de ajo", p:{Normal:22000,Combo:28000}},
   {n:"Hamburguesa Completa", d:"Carne 100% de vacío, tomate, lechuga, cebolla morada, salsa de ajo, huevo, bacon", p:{Normal:26000,Combo:30000}},
   {n:"Hamburguesa Doble", d:"2 carnes 100% de vacío, doble cheddar, bacon", p:{Normal:31000,Combo:35000}},
   {n:"Hamburguesa Triple Carne", d:"3 carnes 100% de vacío, triple cheddar, bacon, bañada en salsa cheddar por dentro", p:{Normal:36000,Combo:41000}},
 ]},
 {id:"caseras", title:"Hamburguesas caseras", sub:"", icon:"🍔", items:[
   {n:"Hamburguesa Normal", d:"Pan, carne, tomate, lechuga repollada, cebolla", p:{Normal:13000,Combo:17000}},
   {n:"Hamburguesa Completa", d:"Pan, carne, tomate, lechuga repollada, cebolla morada, huevo, bacon", p:{Normal:16000,Combo:20000}},
 ]},
 {id:"lomito", title:"Sandwich de lomito", sub:"", icon:"🥖", items:[
   {n:"Sandwich Gourmet", d:"Pan, carne, queso cheddar, lechuga repollada, tomate, cebolla morada, huevo", p:{Normal:28000,Combo:33000}},
   {n:"Sandwich Normal", d:"Pan, carne, tomate, lechuga repollada, cebolla morada, queso mozzarella, huevo", p:{Normal:26000,Combo:30000}},
 ]},
 {id:"pancho", title:"Super pancho gourmet", sub:"", icon:"🌭", items:[
   {n:"Super Pancho Normal", d:"Salsa criolla, papas pay, ketchup y mostaza", p:{Normal:12000,Combo:15000}},
   {n:"Super Pancho Completo", d:"Salsa cheddar, criolla, papas pay, queso mozzarella derretido", p:{Normal:18000,Combo:21000}},
 ]},
 {id:"papas", title:"Papas fritas", sub:"", icon:"🍟", compact:true, items:[
   {n:"Papas medianas", d:"", p:{Único:13000}},
   {n:"Papas cheddar y bacon", d:"", p:{Único:23000}},
 ]},
 {id:"agregados", title:"Agregados", sub:"", icon:"➕", compact:true, items:[
   {n:"Huevo", d:"", p:{Único:4000}},
   {n:"Bacon", d:"", p:{Único:4000}},
   {n:"Salsa cheddar", d:"", p:{Único:4000}},
   {n:"Aros de cebolla", d:"", p:{Único:4000}},
   {n:"Mozzarella", d:"", p:{Único:4000}},
   {n:"Pepinillos", d:"", p:{Único:4000}},
 ]},
];

function gs(n){return "Gs. " + n.toLocaleString('es-PY');}

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
              ${Object.entries(it.p).map(([label,price]) => `
                <button class="pbtn ${Object.keys(it.p).length===1?'single':''}" onclick='addItem(${JSON.stringify(it.n+" ("+label+")")}, ${price})'>
                  ${label}<small>${gs(price)}</small>
                </button>`).join('')}
            </div>
          </div>`).join('')}
      </div>
    </section>`).join('');
}
renderMenu();

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
renderHoursBadge();

let mode = 'delivery';   // 'delivery' | 'pickup'
let pay = 'efectivo';    // 'efectivo' | 'transferencia'
let sendLoc = false;     // true si va a mandar la ubicación por WhatsApp en vez de escribirla

function setMode(m){
  mode = m;
  document.querySelectorAll('#modeSeg .segbtn').forEach(b=>b.classList.toggle('active', b.dataset.mode===m));
  document.getElementById('addressGroup').classList.toggle('hidden', m==='pickup');
  document.getElementById('deliveryRow').classList.toggle('hidden', m==='pickup');
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

function addItem(name, price){
  const existing = cart.find(c=>c.name===name);
  if(existing) existing.qty++;
  else cart.push({name, price, qty:1});
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
  const needsAddress = mode==='delivery' && cart.length>0 && address==='' && !sendLoc;
  const needsName = cart.length>0 && name==='';

  if(cart.length===0){
    btn.classList.add('disabled'); btn.removeAttribute('href');
    document.getElementById('addressWarning').classList.remove('show');
    document.getElementById('nameWarning').classList.remove('show');
  } else if(needsName){
    btn.classList.remove('disabled');
    btn.removeAttribute('href');
    btn.onclick = function(e){ e.preventDefault(); document.getElementById('nameInput').focus(); document.getElementById('nameWarning').classList.add('show'); };
  } else if(needsAddress){
    btn.classList.remove('disabled');
    btn.removeAttribute('href');
    btn.onclick = function(e){ e.preventDefault(); document.getElementById('addressInput').focus(); document.getElementById('addressWarning').classList.add('show'); };
  } else {
    btn.classList.remove('disabled');
    document.getElementById('addressWarning').classList.remove('show');
    document.getElementById('nameWarning').classList.remove('show');
    let msg = "Hola LomiMarc! 👋 Quiero hacer este pedido:%0A%0A";
    cart.forEach(c=> msg += `• ${c.qty}x ${c.name} — ${gs(c.price*c.qty)}%0A`);
    msg += `%0ASubtotal: ${gs(total)}%0A`;
    if(mode==='delivery') msg += `Envío: ${gs(deliveryFee)}%0A`;
    msg += `Total: ${gs(grandTotal)}%0A%0A`;
    msg += `Nombre: ${encodeURIComponent(name)}%0A`;
    msg += `Forma de entrega: ${mode==='delivery' ? 'Delivery' : 'Retiro en local'}%0A`;
    if(mode==='delivery'){
      msg += sendLoc
        ? `Dirección: (te mando la ubicación por acá 📍)%0A`
        : `Dirección: ${encodeURIComponent(address)}%0A`;
    }
    msg += `Método de pago: ${pay==='efectivo' ? 'Efectivo' : 'Transferencia'}`;
    btn.href = `https://wa.me/${WA}?text=${msg}`;
    btn.target = "_blank";
    btn.onclick = null;
  }
}
function openCart(){ document.getElementById('drawer').classList.add('show'); document.getElementById('overlay').classList.add('show'); }
function closeCart(){ document.getElementById('drawer').classList.remove('show'); document.getElementById('overlay').classList.remove('show'); }

renderCart();