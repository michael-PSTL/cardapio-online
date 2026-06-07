document.addEventListener("DOMContentLoaded", () => {

  // ─── ELEMENTOS ───────────────────────────────────────────────
  const hamburger        = document.getElementById("hamburger");
  const nav2             = document.getElementById("nav2");
  const form             = document.getElementById("pedido-form");
  const overlay          = document.getElementById("formulario-overlay");
  const dropdown         = document.getElementById("dropdown-bebida");
  const dropdownToggle   = document.getElementById("dropdown-toggle");
  const bebidaSelected   = document.getElementById("bebida-selected");
  const enderecoContainer = document.getElementById("endereco-container");
  const totalValor       = document.getElementById("total-valor");
  const totalBreakdown   = document.getElementById("total-breakdown");
  const btnCancelar      = document.getElementById("btn-cancelar");

  // ─── ESTADO ──────────────────────────────────────────────────
  let precos = { marmita: 0, bebida: 0, frete: 0 };

  // ─── MENU HAMBURGUER ─────────────────────────────────────────
  hamburger.addEventListener("click", () => {
    nav2.classList.toggle("active");
  });

  document.querySelectorAll("#nav2 a").forEach((link) => {
    link.addEventListener("click", () => nav2.classList.remove("active"));
  });

  // ─── ABRIR FORMULÁRIO ────────────────────────────────────────
  document.querySelectorAll(".Comprar").forEach((button) => {
    button.addEventListener("click", () => {
      const nome = button.closest(".marmita").querySelector(".cardapio-nome").innerText;
      document.querySelector(".marmita-tittle").innerText = nome;
      overlay.style.display = "block";
    });
  });

  // ─── FECHAR FORMULÁRIO ───────────────────────────────────────
  function fecharFormulario() {
    overlay.style.display = "none";
    form.reset();
    precos = { marmita: 0, bebida: 0, frete: 0 };
    bebidaSelected.textContent = "Selecione uma bebida";
    bebidaSelected.classList.remove("selected-text");
    enderecoContainer.classList.remove("visible");
    dropdown.classList.remove("open");
    calcularTotal();
  }

  btnCancelar.addEventListener("click", fecharFormulario);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) fecharFormulario();
  });

  // ─── DROPDOWN BEBIDA ─────────────────────────────────────────
  dropdownToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("open");
  });

  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target)) dropdown.classList.remove("open");
  });

  // ─── CÁLCULO DO TOTAL ────────────────────────────────────────
  function calcularTotal() {
    const total = precos.marmita + precos.bebida + precos.frete;
    totalValor.textContent = `R$ ${total.toFixed(2).replace(".", ",")}`;

    const items = [];
    if (precos.marmita > 0) items.push(`Marmita: R$ ${precos.marmita.toFixed(2).replace(".", ",")}`);
    if (precos.bebida  > 0) items.push(`Bebida: R$ ${precos.bebida.toFixed(2).replace(".", ",")}`);
    if (precos.frete   > 0) items.push(`Frete: R$ ${precos.frete.toFixed(2).replace(".", ",")}`);

    totalBreakdown.textContent = items.join(" · ");
  }

  // ─── LISTENERS DE PREÇO ──────────────────────────────────────
  document.querySelectorAll('input[name="marmita"]').forEach((radio) => {
    radio.addEventListener("change", function () {
      precos.marmita = parseFloat(this.dataset.price) || 0;
      calcularTotal();
    });
  });

  document.querySelectorAll('input[name="bebida"]').forEach((radio) => {
    radio.addEventListener("change", function () {
      precos.bebida = parseFloat(this.dataset.price) || 0;
      bebidaSelected.textContent = this.dataset.name;
      bebidaSelected.classList.add("selected-text");
      dropdown.classList.remove("open");
      calcularTotal();
    });
  });

  document.querySelectorAll('input[name="recebimento"]').forEach((radio) => {
    radio.addEventListener("change", function () {
      precos.frete = parseFloat(this.dataset.frete) || 0;
      enderecoContainer.classList.toggle("visible", this.value === "entrega");
      calcularTotal();
    });
  });

  // ─── ENVIO DO PEDIDO ─────────────────────────────────────────
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const dados = Object.fromEntries(new FormData(form).entries());
    dados.total = precos.marmita + precos.bebida + precos.frete;

    let enderecoTexto = "";
    if (dados.recebimento === "entrega") {
      enderecoTexto =
        `\n📍 Endereço:\n` +
        `   Bairro: ${dados.bairro  || "Não informado"}\n` +
        `   Quadra: ${dados.quadra  || "Não informado"}\n` +
        `   Rua: ${dados.rua        || "Não informado"}\n` +
        `   Número: ${dados.numero  || "Não informado"}`;
    }

    const mensagem =
      `Olá, gostaria de fazer um pedido!\n\n` +
      `👤 Nome: ${dados.nome || "Não informado"}\n` +
      `🍱 Marmita: ${dados.marmita}\n` +
      `🥤 Bebida: ${dados.bebida}\n` +
      `📦 Recebimento: ${dados.recebimento}` +
      `${enderecoTexto}\n\n` +
      `📝 Observações: ${dados.observacoes || "Nenhuma"}\n` +
      `💰 Total: R$ ${dados.total.toFixed(2).replace(".", ",")}`;

    const number = "5598984975025";
    const url = `https://api.whatsapp.com/send?phone=${number}&text=${encodeURIComponent(mensagem)}`;
    window.open(url, "_blank");
  });

});