function loadCart() {
  try {
    return JSON.parse(localStorage.getItem('pedrinho_cart') || '[]');
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem('pedrinho_cart', JSON.stringify(cart));
  renderCartCount();
}

function renderCartCount() {
  const cart = loadCart();
  const count = cart.reduce((sum, i) => sum + i.quantity, 0);
  document.getElementById('cart-count').textContent = count;
}

function addToCart(productId, name, price, btnEl) {
  const card = btnEl.closest('.product-card');
  const sizeSelect = card ? card.querySelector('.size-select') : null;
  const size = sizeSelect ? sizeSelect.value : null;

  const cart = loadCart();
  const key = productId + (size || '');
  const existing = cart.find((i) => i.key === key);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ key, productId, name: size ? `${name} (${size})` : name, price, quantity: 1 });
  }
  saveCart(cart);

  const original = btnEl.textContent;
  btnEl.textContent = 'Adicionado ✓';
  setTimeout(() => { btnEl.textContent = original; }, 900);
}

function removeFromCart(key) {
  const cart = loadCart().filter((i) => i.key !== key);
  saveCart(cart);
  renderCartItems();
}

function renderCartItems() {
  const cart = loadCart();
  const container = document.getElementById('cart-items');
  container.innerHTML = '';
  let total = 0;

  if (!cart.length) {
    container.innerHTML = '<p style="color:#737373;">Seu carrinho está vazio.</p>';
  }

  cart.forEach((item) => {
    total += item.price * item.quantity;
    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML = `
      <span>${item.quantity}x ${item.name} — R$ ${(item.price * item.quantity).toFixed(2)}</span>
      <button onclick="removeFromCart('${item.key}')">remover</button>
    `;
    container.appendChild(row);
  });

  document.getElementById('cart-total').textContent = 'R$ ' + total.toFixed(2);
  document.getElementById('go-checkout').disabled = cart.length === 0;
}

function openCart() {
  renderCartItems();
  document.getElementById('cart-overlay').classList.add('open');
}
function closeCart() {
  document.getElementById('cart-overlay').classList.remove('open');
}
function showCheckout() {
  if (!loadCart().length) return;
  closeCart();
  document.getElementById('checkout-overlay').classList.add('open');
}
function closeCheckout() {
  document.getElementById('checkout-overlay').classList.remove('open');
}

document.getElementById('checkout-form').addEventListener('submit', async function (e) {
  e.preventDefault();
  const cart = loadCart();
  const msgEl = document.getElementById('checkout-msg');
  msgEl.innerHTML = '';

  const payload = {
    customerName: document.getElementById('customerName').value,
    customerContact: document.getElementById('customerContact').value,
    address: document.getElementById('address').value,
    paymentMethod: document.getElementById('paymentMethod').value,
    items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity })),
  };

  try {
    const res = await fetch('/api/registrar-venda', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Não foi possível concluir o pedido.');

    localStorage.removeItem('pedrinho_cart');
    renderCartCount();
    msgEl.innerHTML = `<div class="msg success">Pedido confirmado! Em breve entraremos em contato pelo ${payload.customerContact ? 'WhatsApp' : 'contato informado'}.</div>`;
    document.getElementById('checkout-form').reset();
    setTimeout(() => {
      closeCheckout();
      window.location.reload();
    }, 2200);
  } catch (err) {
    msgEl.innerHTML = `<div class="msg error">${err.message}</div>`;
  }
});

renderCartCount();

// Filtro de categorias — puramente no navegador, os produtos já vêm
// todos renderizados na página; só mostra/esconde os cards.
(function () {
  const nav = document.getElementById('category-nav');
  if (!nav) return;

  const chips = Array.from(nav.querySelectorAll('.cat-chip'));
  const cards = Array.from(document.querySelectorAll('#product-grid .product-card'));
  const emptyMsg = document.getElementById('empty-filtered');

  function applyFilter(category) {
    let visibleCount = 0;
    cards.forEach(function (card) {
      const matches = !category || card.dataset.category === category;
      card.hidden = !matches;
      if (matches) visibleCount += 1;
    });
    if (emptyMsg) emptyMsg.hidden = visibleCount !== 0;
  }

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      chips.forEach(function (c) { c.classList.remove('active'); });
      chip.classList.add('active');
      applyFilter(chip.dataset.cat);
    });
  });
})();
