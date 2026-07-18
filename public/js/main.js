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

// Quantas cópias ainda restam de uma peça, e um texto pronto para exibir
// (ex.: "1/1" para peça exclusiva, ou "3/5" para uma edição limitada).
function editionRemaining(p) {
  const size = p.edition_size || 1;
  const sold = p.sold_count || 0;
  return Math.max(size - sold, 0);
}
function editionBadge(p) {
  const size = p.edition_size || 1;
  return `${editionRemaining(p)}/${size}`;
}
function editionLabel(p) {
  const t = I18N[getLang()];
  const size = p.edition_size || 1;
  if (size <= 1) return t["product.edition.unique"];
  return t["product.edition.limited"]
    .replace("{remaining}", editionRemaining(p))
    .replace("{total}", size);
}

const EXPAND_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>`;

function renderCard(p) {
  return `
  <a class="card" href="product.html?id=${p.id}">
    <span class="card-badge">${editionBadge(p)}</span>
    <div class="thumb protected">
      <img src="${p.img}" alt="" loading="lazy">
      <button type="button" class="expand-btn" data-expand-src="${p.img}" aria-label="View full image">${EXPAND_ICON}</button>
    </div>
    <div class="card-info">
      <h3 class="js-title" data-pid="${p.id}">${productTitle(p)}</h3>
      <span class="price">${money(p.price)}</span>
    </div>
  </a>`;
}

// Visualizador de imagem em tela cheia — usado na galeria e na página do produto,
// para o cliente ver a foto sem o recorte do enquadramento do card.
function openLightbox(src) {
  closeLightbox();
  const overlay = document.createElement("div");
  overlay.className = "lightbox-overlay";
  overlay.id = "lightbox-overlay";
  overlay.innerHTML = `
    <button type="button" class="lightbox-close" aria-label="Close">&times;</button>
    <img src="${src}" alt="">
  `;
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeLightbox(); });
  overlay.querySelector(".lightbox-close").addEventListener("click", closeLightbox);
  document.body.appendChild(overlay);
  document.body.style.overflow = "hidden";
}
function closeLightbox() {
  const existing = document.getElementById("lightbox-overlay");
  if (existing) existing.remove();
  document.body.style.overflow = "";
}
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-expand-src]");
  if (btn) { e.preventDefault(); e.stopPropagation(); openLightbox(btn.dataset.expandSrc); }
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeLightbox(); });

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
