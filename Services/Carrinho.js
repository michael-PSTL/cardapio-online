const Carrinho = (() => {
  const STORAGE_KEY = "restaurante_carrinho";
  let itens = [];

  let cartBtn, cartBadge, overlay, fechar, lista, vazio, subtotalEl, btnFinalizar;

  // ─── PERSISTÊNCIA ────────────────────────────────────────────
  function carregar() {
    try {
      const salvo = localStorage.getItem(STORAGE_KEY);
      itens = salvo ? JSON.parse(salvo) : [];
    } catch {
      itens = [];
    }
  }

  function salvar() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(itens));
    } catch {
      // localStorage indisponível: carrinho segue funcionando só na sessão atual
    }
  }

  // ─── LEITURA ─────────────────────────────────────────────────
  function getItens() { return itens; }

  function getSubtotal() {
    return itens.reduce((acc, item) => acc + item.preco * item.quantidade, 0);
  }

  function getTotalItens() {
    return itens.reduce((acc, item) => acc + item.quantidade, 0);
  }

  // ─── AÇÕES ───────────────────────────────────────────────────
  function adicionarItem(produto) {
    const existente = itens.find((i) => i.id === produto.id);
    if (existente) {
      existente.quantidade += 1;
    } else {
      itens.push({ ...produto, quantidade: 1 });
    }
    salvar();
    render();
    animarBadge();
  }

  function alterarQuantidade(id, delta) {
    const item = itens.find((i) => i.id === id);
    if (!item) return;
    item.quantidade += delta;
    if (item.quantidade <= 0) itens = itens.filter((i) => i.id !== id);
    salvar();
    render();
  }

  function removerItem(id) {
    itens = itens.filter((i) => i.id !== id);
    salvar();
    render();
  }

  function limparCarrinho() {
    itens = [];
    salvar();
    render();
  }

  // ─── UI ──────────────────────────────────────────────────────
  function animarBadge() {
    cartBadge.classList.remove("visible");
    void cartBadge.offsetWidth; // reinicia a animação
    cartBadge.classList.add("visible");
  }

  function abrirCarrinho() { overlay.classList.add("active"); }
  function fecharCarrinho() { overlay.classList.remove("active"); }

  function render() {
    const total = getTotalItens();
    cartBadge.textContent = total;
    cartBadge.classList.toggle("visible", total > 0);

    const temItens = itens.length > 0;
    vazio.classList.toggle("visible", !temItens);
    lista.style.display = temItens ? "flex" : "none";

    lista.innerHTML = itens.map((item) => `
      <div class="carrinho-item" data-id="${item.id}">
        <img src="${item.img}" alt="${item.nome}" class="carrinho-item-img" />
        <div class="carrinho-item-info">
          <div class="carrinho-item-nome">${item.nome}</div>
          <div class="carrinho-item-preco">R$ ${(item.preco * item.quantidade).toFixed(2).replace(".", ",")}</div>
          <div class="carrinho-item-qtd">
            <button class="qtd-btn" data-action="menos" data-id="${item.id}">-</button>
            <span>${item.quantidade}</span>
            <button class="qtd-btn" data-action="mais" data-id="${item.id}">+</button>
          </div>
        </div>
        <button class="carrinho-item-remover" data-id="${item.id}" aria-label="Remover item">&times;</button>
      </div>
    `).join("");

    subtotalEl.textContent = `R$ ${getSubtotal().toFixed(2).replace(".", ",")}`;

    lista.querySelectorAll(".qtd-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const delta = btn.dataset.action === "mais" ? 1 : -1;
        alterarQuantidade(btn.dataset.id, delta);
      });
    });

    lista.querySelectorAll(".carrinho-item-remover").forEach((btn) => {
      btn.addEventListener("click", () => removerItem(btn.dataset.id));
    });
  }

  // ─── INICIALIZAÇÃO ───────────────────────────────────────────
  function init() {
    carregar();

    cartBtn      = document.getElementById("cart-btn");
    cartBadge    = document.getElementById("cart-badge");
    overlay      = document.getElementById("carrinho-overlay");
    fechar       = document.getElementById("carrinho-fechar");
    lista        = document.getElementById("carrinho-lista");
    vazio        = document.getElementById("carrinho-vazio");
    subtotalEl   = document.getElementById("carrinho-subtotal");
    btnFinalizar = document.getElementById("carrinho-finalizar");

    cartBtn.addEventListener("click", abrirCarrinho);
    fechar.addEventListener("click", fecharCarrinho);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) fecharCarrinho(); });

    btnFinalizar.addEventListener("click", () => {
      if (itens.length === 0) return;
      fecharCarrinho();
      if (typeof window.abrirFormularioPedido === "function") {
        window.abrirFormularioPedido();
      }
    });

    render();
  }

  document.addEventListener("DOMContentLoaded", init);

  return {
    adicionarItem,
    removerItem,
    alterarQuantidade,
    limparCarrinho,
    getItens,
    getSubtotal,
    getTotalItens,
  };
})();

window.Carrinho = Carrinho;