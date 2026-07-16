// Anima Imago — versão real: peças vêm da API (banco de dados), carrinho fica no navegador.
const CART_KEY = "ai_cart";
let _productsCache = null;

async function fetchProducts(force) {
  if (_productsCache && !force) return _productsCache;
  try {
    const r = await fetch("/api/products");
    const data = await r.json();
    _productsCache = Array.isArray(data) ? data : [];
  } catch (e) {
    console.error("Erro ao carregar peças:", e);
    _productsCache = [];
  }
  return _productsCache;
}

async function findProduct(id) {
  const all = await fetchProducts();
  return all.find((p) => p.id === Number(id));
}

function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch (e) { return []; }
}
function saveCart(cart) { localStorage.setItem(CART_KEY, JSON.stringify(cart)); updateCartCount(); }
function addToCart(id) {
  const cart = getCart();
  if (!cart.includes(Number(id))) cart.push(Number(id));
  saveCart(cart);
}
function removeFromCart(id) {
  saveCart(getCart().filter((pid) => pid !== Number(id)));
}
function updateCartCount() {
  const el = document.querySelector(".cart-count");
  const n = getCart().length;
  if (el) { el.textContent = n; el.style.display = n > 0 ? "flex" : "none"; }
}

function money(n) { return "$" + Number(n).toFixed(0); }
function productTitle(p) { return p.title[getLang()] || p.title.en; }
function productDesc(p) { return p.desc[getLang()] || p.desc.en; }

function renderCard(p) {
  return `
  <a class="card" href="product.html?id=${p.id}">
    <span class="card-badge">1/1</span>
    <div class="thumb protected"><img src="${p.img}" alt="" loading="lazy"></div>
    <div class="card-info">
      <h3 class="js-title" data-pid="${p.id}">${productTitle(p)}</h3>
      <span class="price">${money(p.price)}</span>
    </div>
  </a>`;
}

async function renderGrid(container, products) {
  container.innerHTML = products.map(renderCard).join("");
}

async function refreshDynamicTitles() {
  const all = await fetchProducts();
  document.querySelectorAll(".js-title").forEach((el) => {
    const p = all.find((x) => x.id === Number(el.dataset.pid));
    if (p) el.textContent = productTitle(p);
  });
  document.querySelectorAll(".js-desc").forEach((el) => {
    const p = all.find((x) => x.id === Number(el.dataset.pid));
    if (p) el.textContent = productDesc(p);
  });
}

async function onLangChange() {
  await refreshDynamicTitles();
  if (typeof onLangChangePage === "function") onLangChangePage();
}

document.addEventListener("DOMContentLoaded", updateCartCount);
