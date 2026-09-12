document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("pedido-form");
  const overlay = document.getElementById("formulario-overlay");
  const enderecoContainer = document.getElementById("endereco-container");
  const totalValor = document.getElementById("total-valor");
  const totalBreakdown = document.getElementById("total-breakdown");
  const btnCancelar = document.getElementById("btn-cancelar");
  const resumoCarrinhoForm = document.getElementById("resumo-carrinho-form");

  const NUMERO_WHATSAPP = "5598984975025";

  let precos = { frete: 0 };

  // ─── RESUMO E TOTAL ──────────────────────────────────────────

  function renderResumoCarrinhoForm() {
    if (!resumoCarrinhoForm || !window.Carrinho) return;

    resumoCarrinhoForm.innerHTML = window.Carrinho.getItens()
      .map(
        (item) => `
          <div class="resumo-item">
            <span>
              <span class="resumo-qtd">${item.quantidade}x</span>
              ${item.nome}
            </span>
            <span>R$ ${(item.preco * item.quantidade).toFixed(2).replace(".", ",")}</span>
          </div>
        `,
      )
      .join("");
  }

  function calcularTotal() {
    if (!window.Carrinho || !totalValor) return;

    const subtotal = window.Carrinho.getSubtotal();
    const total = subtotal + precos.frete;

    totalValor.textContent = `R$ ${total.toFixed(2).replace(".", ",")}`;

    const partes = [];
    if (subtotal > 0) partes.push(`Itens: R$ ${subtotal.toFixed(2).replace(".", ",")}`);
    if (precos.frete > 0) partes.push(`Frete: R$ ${precos.frete.toFixed(2).replace(".", ",")}`);

    if (totalBreakdown) totalBreakdown.textContent = partes.join(" · ");
  }

  // ─── ABRIR / FECHAR ──────────────────────────────────────────

  function abrirFormulario() {
    if (!window.Carrinho || window.Carrinho.getItens().length === 0) return;

    renderResumoCarrinhoForm();
    calcularTotal();

    if (overlay) overlay.style.display = "block";
    window.travarScrollPagina?.();
  }

  function fecharFormulario() {
    if (overlay) overlay.style.display = "none";

    form?.reset();
    precos = { frete: 0 };
    enderecoContainer?.classList.remove("visible");

    const carrinhoAberto = document
      .getElementById("carrinho-overlay")
      ?.classList.contains("active");

    if (!carrinhoAberto) window.destravarScrollPagina?.();
  }

  // Exposto para o botão "Finalizar Pedido" do carrinho (Carrinho.js).
  window.abrirFormularioPedido = abrirFormulario;

  btnCancelar?.addEventListener("click", fecharFormulario);

  overlay?.addEventListener("click", (evento) => {
    if (evento.target === overlay) fecharFormulario();
  });

  // ─── RECEBIMENTO (entrega x retirada) ────────────────────────

  document.querySelectorAll('input[name="recebimento"]').forEach((radio) => {
    radio.addEventListener("change", function () {
      precos.frete = parseFloat(this.dataset.frete) || 0;
      enderecoContainer?.classList.toggle("visible", this.value === "entrega");
      calcularTotal();
    });
  });

  // ─── ENVIO DO PEDIDO (WhatsApp) ──────────────────────────────

  form?.addEventListener("submit", (evento) => {
    evento.preventDefault();
    if (!window.Carrinho) return;

    const dados = Object.fromEntries(new FormData(form).entries());
    const itens = window.Carrinho.getItens();
    const subtotal = window.Carrinho.getSubtotal();
    const total = subtotal + precos.frete;

    const itensTexto = itens
      .map(
        (item) =>
          `   ${item.quantidade}x ${item.nome} — R$ ${(item.preco * item.quantidade)
            .toFixed(2)
            .replace(".", ",")}`,
      )
      .join("\n");

    let enderecoTexto = "";
    if (dados.recebimento === "entrega") {
      enderecoTexto =
        `\n📍 Endereço:\n` +
        `   Bairro: ${dados.bairro || "Não informado"}\n` +
        `   Quadra: ${dados.quadra || "Não informado"}\n` +
        `   Rua: ${dados.rua || "Não informado"}\n` +
        `   Número: ${dados.numero || "Não informado"}`;
    }

    const mensagem =
      `Olá, gostaria de fazer um pedido!\n\n` +
      `👤 Nome: ${dados.nome || "Não informado"}\n\n` +
      `🍱 Itens:\n${itensTexto}\n\n` +
      `📦 Recebimento: ${dados.recebimento || "Não informado"}` +
      `${enderecoTexto}\n\n` +
      `📝 Observações: ${dados.observacoes || "Nenhuma"}\n` +
      `💰 Total: R$ ${total.toFixed(2).replace(".", ",")}`;

    const url = `https://api.whatsapp.com/send?phone=${NUMERO_WHATSAPP}&text=${encodeURIComponent(mensagem)}`;

    window.open(url, "_blank");
    window.Carrinho.limparCarrinho();
    fecharFormulario();
  });
});