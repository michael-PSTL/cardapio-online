document.addEventListener("DOMContentLoaded", () => {

  // ─── DADOS DO CARDÁPIO ───────────────────────────────────────
  const marmitasData = [
    { id: "assado-panela",   nome: "Assado de panela",   preco: 99.99, img: "/assets/img/imagem-restaurante.jfif" },
    { id: "peixe-frito",     nome: "Peixe Frito",        preco: 99.99, img: "/assets/img/imagem-restaurante.jfif" },
    { id: "carne-porco",     nome: "Carne de porco",     preco: 99.99, img: "/assets/img/imagem-restaurante.jfif" },
    { id: "cozidao",         nome: "Cozidão",            preco: 99.99, img: "/assets/img/imagem-restaurante.jfif" },
    { id: "frango-assado",   nome: "Frango assado",      preco: 99.99, img: "/assets/img/imagem-restaurante.jfif" },
    { id: "strogonoff",      nome: "Strogonoff",         preco: 99.99, img: "/assets/img/imagem-restaurante.jfif" },
    { id: "empanado-frango", nome: "Empanado de frango", preco: 99.99, img: "/assets/img/imagem-restaurante.jfif" },
  ];

  const bebidasData = [
    { id: "coca-lata",    nome: "Coca-Cola Lata 350ml", preco: 6.00,  img: "/assets/img/bebida-coca-lata.jpg" },
    { id: "coca-2l",      nome: "Coca-Cola 2L",         preco: 12.00, img: "/assets/img/bebida-coca-2l.jpg" },
    { id: "guarana-lata", nome: "Guaraná Lata 350ml",   preco: 5.00,  img: "/assets/img/bebida-guarana-lata.jpg" },
    { id: "guarana-2l",   nome: "Guaraná 2L",           preco: 10.00, img: "/assets/img/bebida-guarana-2l.jpg" },
    { id: "suco-natural", nome: "Suco Natural 500ml",   preco: 8.00,  img: "/assets/img/bebida-suco.jpg" },
  ];

  const porcoesData = [
    { id: "arroz",  nome: "Porção de Arroz",  preco: 8.00, img: "/assets/img/porcao-arroz.jpg" },
    { id: "feijao", nome: "Porção de Feijão", preco: 8.00, img: "/assets/img/porcao-feijao.jpg" },
    { id: "farofa", nome: "Porção de Farofa", preco: 7.00, img: "/assets/img/porcao-farofa.jpg" },
    { id: "salada", nome: "Porção de Salada", preco: 7.00, img: "/assets/img/porcao-salada.jpg" },
  ];

  // ─── DADOS DE AVALIAÇÕES ─────────────────────────────────────
  const avaliacoesData = [
    { nome: "Marcos Almeida",   estrelas: 5, data: "Há 2 dias",    comentario: "Comida excelente, chega bem quentinha e no horário. O cozidão é maravilhoso!" },
    { nome: "Juliana Ferreira", estrelas: 5, data: "Há 1 semana",  comentario: "Melhor marmita da região, sabor caseiro de verdade. Já virou rotina aqui em casa." },
    { nome: "Pedro Costa",      estrelas: 4, data: "Há 2 semanas", comentario: "Muito bom, só acho que a porção de arroz podia ser um pouco maior. De resto, nota 10." },
    { nome: "Ana Beatriz",      estrelas: 5, data: "Há 3 semanas", comentario: "Atendimento rápido pelo WhatsApp e entrega no prazo certinho. Recomendo demais!" },
    { nome: "Rafael Souza",     estrelas: 5, data: "Há 1 mês",     comentario: "O frango assado é surreal, tempero na medida certa. Virei cliente fiel." },
    { nome: "Camila Rocha",     estrelas: 4, data: "Há 1 mês",     comentario: "Peixe frito muito saboroso e crocante. Só peço para chegar um pouco mais rápido." },
  ];

  // ─── ÍCONE DE ESTRELA ────────────────────────────────────────
  function svgEstrela(preenchida) {
    return `
      <svg viewBox="0 0 20 20" fill="${preenchida ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.5" class="${preenchida ? "" : "vazia"}">
        <path d="M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.2-5.4 3.2 1.3-6L1.3 7.7l6.1-.6L10 1.5z" />
      </svg>`;
  }

  // ─── RENDER: CARDÁPIO (genérico para qualquer categoria) ─────
  function renderCarrossel(containerId, dados) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = dados.map((item) => `
      <div class="marmita" data-id="${item.id}">
        <div class="img-wrapper">
          <img src="${item.img}" alt="${item.nome}" class="IMG-marmita" draggable="false" />
          <div class="img-overlay"></div>
        </div>
        <div class="marmita-content">
          <h4 class="cardapio-nome">${item.nome}</h4>
          <div class="opcoes-compra">
            <span class="Preço">R$ ${item.preco.toFixed(2).replace(".", ",")}</span>
            <button class="Comprar" data-id="${item.id}">Adicionar</button>
          </div>
        </div>
      </div>
    `).join("");

    container.querySelectorAll(".Comprar").forEach((button) => {
      button.addEventListener("click", () => {
        const item = dados.find((p) => p.id === button.dataset.id);
        if (!item) return;

        window.Carrinho.adicionarItem(item);

        button.textContent = "Adicionado";
        button.classList.add("added");
        setTimeout(() => {
          button.textContent = "Adicionar";
          button.classList.remove("added");
        }, 1200);
      });
    });
  }

     // ─── CARROSSEL: ARRASTAR (mouse + toque) COM SUAVIZAÇÃO ──────
  function habilitarArraste(el) {
    let isDown = false;
    let moveu = false;
    let startX = 0;
    let scrollStart = 0;
    let alvoScroll = el.scrollLeft;
    let ultimaX = 0;
    let ultimoTempo = 0;
    let velocidade = 0;
    let rafId = null;

    function pararAnimacao() {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    function animar() {
      const atual = el.scrollLeft;
      const max = el.scrollWidth - el.clientWidth;
      alvoScroll = Math.max(0, Math.min(alvoScroll, max));
      const diff = alvoScroll - atual;

      if (Math.abs(diff) > 0.5) {
        el.scrollLeft = atual + diff * 0.22; // suavização (lerp)
        rafId = requestAnimationFrame(animar);
      } else {
        el.scrollLeft = alvoScroll;
        rafId = null;
      }
    }

    function pedirFrame() {
      if (!rafId) rafId = requestAnimationFrame(animar);
    }

    function inicio(pageX) {
      isDown = true;
      moveu = false;
      velocidade = 0;
      el.classList.add("arrastando");
      pararAnimacao();
      startX = pageX - el.offsetLeft;
      scrollStart = el.scrollLeft;
      alvoScroll = el.scrollLeft;
      ultimaX = pageX;
      ultimoTempo = performance.now();
    }

    function mover(pageX, evt) {
      if (!isDown) return;
      const x = pageX - el.offsetLeft;
      const walk = (x - startX) * 1.2;

      if (Math.abs(walk) > 5) {
        moveu = true;
        if (evt && evt.cancelable) evt.preventDefault();
      }

      const agora = performance.now();
      const dt = agora - ultimoTempo || 16;
      velocidade = (pageX - ultimaX) / dt;
      ultimaX = pageX;
      ultimoTempo = agora;

      alvoScroll = scrollStart - walk;
      pedirFrame();
    }

    function fim() {
      if (!isDown) return;
      isDown = false;
      el.classList.remove("arrastando");

      // ─── Inércia: continua deslizando com desaceleração ───
      let vel = velocidade * -16;
      if (Math.abs(vel) > 1) {
        alvoScroll = el.scrollLeft;
        const desacelerar = () => {
          if (Math.abs(vel) < 0.5) {
            rafId = null;
            return;
          }
          alvoScroll += vel;
          vel *= 0.94;
          el.scrollLeft = alvoScroll;
          rafId = requestAnimationFrame(desacelerar);
        };
        pararAnimacao();
        rafId = requestAnimationFrame(desacelerar);
      }
    }

    // Mouse (desktop)
    el.addEventListener("mousedown", (e) => inicio(e.pageX));
    el.addEventListener("mousemove", (e) => mover(e.pageX, e));
    ["mouseleave", "mouseup"].forEach((evt) => el.addEventListener(evt, fim));

    // Toque (celular/tablet)
    el.addEventListener("touchstart", (e) => inicio(e.touches[0].pageX), { passive: true });
    el.addEventListener("touchmove", (e) => mover(e.touches[0].pageX, e), { passive: false });
    ["touchend", "touchcancel"].forEach((evt) => el.addEventListener(evt, fim));

    // Evita que o clique "arrastado" acione o botão Adicionar sem querer
    el.addEventListener("click", (e) => {
      if (moveu) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);

       // ─── Controlador usado pelos botões de navegação ─────────
    return {
      scrollPara(delta) {
        pararAnimacao();
        el.classList.add("animando");
        alvoScroll = el.scrollLeft + delta;

        function passo() {
          const atual = el.scrollLeft;
          const max = el.scrollWidth - el.clientWidth;
          const alvoClampado = Math.max(0, Math.min(alvoScroll, max));
          const diff = alvoClampado - atual;

          if (Math.abs(diff) > 0.5) {
            el.scrollLeft = atual + diff * 0.22;
            rafId = requestAnimationFrame(passo);
          } else {
            el.scrollLeft = alvoClampado;
            el.classList.remove("animando");
            rafId = null;
          }
        }
        rafId = requestAnimationFrame(passo);
      },
    };
  }

  // ─── CARROSSEL: BOTÕES DE NAVEGAÇÃO ──────────────────────────
  function habilitarBotoesCarrossel(prefixo) {
    const track = document.getElementById(`${prefixo}-itens`);
    const prevBtn = document.querySelector(`.carrossel-prev[data-target="${prefixo}"]`);
    const nextBtn = document.querySelector(`.carrossel-next[data-target="${prefixo}"]`);
    if (!track) return;

    const controlador = habilitarArraste(track);
    const passo = () => (track.querySelector(".marmita")?.offsetWidth || 260) + 20;

    prevBtn?.addEventListener("click", () => {
      controlador.scrollPara(-passo());
    });

    nextBtn?.addEventListener("click", () => {
      controlador.scrollPara(passo());
    });
  }


  // ─── RENDER: AVALIAÇÕES ──────────────────────────────────────
  function renderAvaliacoes() {
    const container = document.getElementById("avaliacoes-itens");
    const resumo = document.getElementById("avaliacoes-resumo");
    if (!container || !resumo) return;

    const total = avaliacoesData.length;
    const media = avaliacoesData.reduce((acc, a) => acc + a.estrelas, 0) / total;

    resumo.innerHTML = `
      <span class="avaliacoes-media">${media.toFixed(1)}</span>
      <div class="avaliacoes-estrelas-media">
        ${[1, 2, 3, 4, 5].map((n) => svgEstrela(n <= Math.round(media))).join("")}
      </div>
      <span class="avaliacoes-contagem">baseado em ${total} avaliações</span>
    `;

    container.innerHTML = avaliacoesData.map((dep) => `
      <div class="depoimento">
        <div class="depoimento-estrelas">
          ${[1, 2, 3, 4, 5].map((n) => svgEstrela(n <= dep.estrelas)).join("")}
        </div>
        <p class="depoimento-texto">"${dep.comentario}"</p>
        <div class="depoimento-rodape">
          <div class="depoimento-autor">
            <div class="depoimento-avatar">${dep.nome.charAt(0)}</div>
            <span class="depoimento-nome">${dep.nome}</span>
          </div>
          <span class="depoimento-data">${dep.data}</span>
        </div>
      </div>
    `).join("");
  }

  renderCarrossel("marmitas-itens", marmitasData);
  renderCarrossel("bebidas-itens", bebidasData);
  renderCarrossel("porcoes-itens", porcoesData);
  habilitarBotoesCarrossel("marmitas");
  habilitarBotoesCarrossel("bebidas");
  habilitarBotoesCarrossel("porcoes");

  renderAvaliacoes();

  const anoAtual = document.getElementById("ano-atual");
  if (anoAtual) anoAtual.textContent = new Date().getFullYear();

  // ─── TRAVAR / DESTRAVAR SCROLL DA PÁGINA (overlays) ──────────
  function travarScroll() { document.body.classList.add("scroll-travado"); }
  function destravarScroll() { document.body.classList.remove("scroll-travado"); }
  window.travarScrollPagina = travarScroll;
  window.destravarScrollPagina = destravarScroll;

  // ─── ELEMENTOS GERAIS ────────────────────────────────────────
  const hamburger          = document.getElementById("hamburger");
  const nav2               = document.getElementById("nav2");
  const form               = document.getElementById("pedido-form");
  const overlay            = document.getElementById("formulario-overlay");
  const enderecoContainer  = document.getElementById("endereco-container");
  const totalValor         = document.getElementById("total-valor");
  const totalBreakdown     = document.getElementById("total-breakdown");
  const btnCancelar        = document.getElementById("btn-cancelar");
  const resumoCarrinhoForm = document.getElementById("resumo-carrinho-form");

  // ─── ESTADO (frete é o único "extra" fora do carrinho) ───────
  let precos = { frete: 0 };

  // ─── MENU HAMBURGUER ─────────────────────────────────────────
  hamburger.addEventListener("click", () => nav2.classList.toggle("active"));
  document.querySelectorAll("#nav2 a").forEach((link) => {
    link.addEventListener("click", () => nav2.classList.remove("active"));
  });

  // ─── ABRIR FORMULÁRIO (chamado pelo Carrinho.js ao finalizar) ─
  function abrirFormulario() {
    if (window.Carrinho.getItens().length === 0) return;
    renderResumoCarrinhoForm();
    calcularTotal();
    overlay.style.display = "block";
    travarScroll();
  }
  window.abrirFormularioPedido = abrirFormulario;

  function renderResumoCarrinhoForm() {
    if (!resumoCarrinhoForm) return;
    const itens = window.Carrinho.getItens();
    resumoCarrinhoForm.innerHTML = itens.map((item) => `
      <div class="resumo-item">
        <span><span class="resumo-qtd">${item.quantidade}x</span>${item.nome}</span>
        <span>R$ ${(item.preco * item.quantidade).toFixed(2).replace(".", ",")}</span>
      </div>
    `).join("");
  }

  // ─── FECHAR FORMULÁRIO ───────────────────────────────────────
  function fecharFormulario() {
    overlay.style.display = "none";
    form.reset();
    precos = { frete: 0 };
    enderecoContainer.classList.remove("visible");

    // só destrava se o carrinho também não estiver aberto
    const carrinhoAberto = document.getElementById("carrinho-overlay")?.classList.contains("active");
    if (!carrinhoAberto) destravarScroll();
  }

  btnCancelar.addEventListener("click", fecharFormulario);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) fecharFormulario(); });

  // ─── CÁLCULO DO TOTAL (carrinho + frete) ─────────────────────
  function calcularTotal() {
    const subtotalCarrinho = window.Carrinho.getSubtotal();
    const total = subtotalCarrinho + precos.frete;
    totalValor.textContent = `R$ ${total.toFixed(2).replace(".", ",")}`;

    const items = [];
    if (subtotalCarrinho > 0) items.push(`Itens: R$ ${subtotalCarrinho.toFixed(2).replace(".", ",")}`);
    if (precos.frete > 0)     items.push(`Frete: R$ ${precos.frete.toFixed(2).replace(".", ",")}`);
    totalBreakdown.textContent = items.join(" · ");
  }

  // ─── LISTENERS DE PREÇO ──────────────────────────────────────
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
    const itensCarrinho = window.Carrinho.getItens();
    const subtotalCarrinho = window.Carrinho.getSubtotal();
    const total = subtotalCarrinho + precos.frete;

    const itensTexto = itensCarrinho
      .map((item) => `   ${item.quantidade}x ${item.nome} — R$ ${(item.preco * item.quantidade).toFixed(2).replace(".", ",")}`)
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
      `📦 Recebimento: ${dados.recebimento}` +
      `${enderecoTexto}\n\n` +
      `📝 Observações: ${dados.observacoes || "Nenhuma"}\n` +
      `💰 Total: R$ ${total.toFixed(2).replace(".", ",")}`;

    const number = "5598984975025";
    const url = `https://api.whatsapp.com/send?phone=${number}&text=${encodeURIComponent(mensagem)}`;
    window.open(url, "_blank");

    window.Carrinho.limparCarrinho();
    fecharFormulario();
  });

});