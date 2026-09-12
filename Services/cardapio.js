document.addEventListener("DOMContentLoaded", () => {
  // ─── DADOS DO CARDÁPIO ───────────────────────────────────────

  const marmitasData = [
    { id: "assado-panela", nome: "Assado de panela", preco: 99.99, img: "/assets/img/imagem-restaurante.jfif" },
    { id: "peixe-frito", nome: "Peixe Frito", preco: 99.99, img: "/assets/img/imagem-restaurante.jfif" },
    { id: "carne-porco", nome: "Carne de porco", preco: 99.99, img: "/assets/img/imagem-restaurante.jfif" },
    { id: "cozidao", nome: "Cozidão", preco: 99.99, img: "/assets/img/imagem-restaurante.jfif" },
    { id: "frango-assado", nome: "Frango assado", preco: 99.99, img: "/assets/img/imagem-restaurante.jfif" },
    { id: "strogonoff", nome: "Strogonoff", preco: 99.99, img: "/assets/img/imagem-restaurante.jfif" },
    { id: "empanado-frango", nome: "Empanado de frango", preco: 99.99, img: "/assets/img/imagem-restaurante.jfif" },
  ];

  const bebidasData = [
    { id: "coca-lata", nome: "Coca-Cola Lata 350ml", preco: 6.0, img: "/assets/img/bebida-coca-lata.jpg" },
    { id: "coca-2l", nome: "Coca-Cola 2L", preco: 12.0, img: "/assets/img/bebida-coca-2l.jpg" },
    { id: "guarana-lata", nome: "Guaraná Lata 350ml", preco: 5.0, img: "/assets/img/bebida-guarana-lata.jpg" },
    { id: "guarana-2l", nome: "Guaraná 2L", preco: 10.0, img: "/assets/img/bebida-guarana-2l.jpg" },
    { id: "suco-natural", nome: "Suco Natural 500ml", preco: 8.0, img: "/assets/img/bebida-suco.jpg" },
  ];

  const porcoesData = [
    { id: "arroz", nome: "Porção de Arroz", preco: 8.0, img: "/assets/img/porcao-arroz.jpg" },
    { id: "feijao", nome: "Porção de Feijão", preco: 8.0, img: "/assets/img/porcao-feijao.jpg" },
    { id: "farofa", nome: "Porção de Farofa", preco: 7.0, img: "/assets/img/porcao-farofa.jpg" },
    { id: "salada", nome: "Porção de Salada", preco: 7.0, img: "/assets/img/porcao-salada.jpg" },
  ];

  // ─── RENDERIZAÇÃO DOS CARDS ──────────────────────────────────

  function criarCardHTML(item) {
    return `
      <div class="marmita" data-id="${item.id}">
        <div class="img-wrapper">
          <img src="${item.img}" alt="${item.nome}" class="IMG-marmita" draggable="false" />
          <div class="img-overlay"></div>
        </div>

        <div class="marmita-content">
          <h4 class="cardapio-nome">${item.nome}</h4>

          <div class="opcoes-compra">
            <span class="Preço">R$ ${item.preco.toFixed(2).replace(".", ",")}</span>
            <button class="Comprar" data-id="${item.id}" type="button">Adicionar</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderCarrossel(containerId, dados) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // .cardapio-track é o elemento que realmente se move (transform).
    // .cardapio-ITENS vira só a "janela" que corta o que passa da borda.
    container.innerHTML = `<div class="cardapio-track">${dados.map(criarCardHTML).join("")}</div>`;

    container.querySelectorAll(".Comprar").forEach((botao) => {
      botao.addEventListener("click", () => {
        const item = dados.find((produto) => produto.id === botao.dataset.id);
        if (!item || !window.Carrinho) return;

        window.Carrinho.adicionarItem(item);

        botao.textContent = "Adicionado";
        botao.classList.add("added");

        setTimeout(() => {
          botao.textContent = "Adicionar";
          botao.classList.remove("added");
        }, 1200);
      });
    });
  }

  // ─── DESLIZE SUAVE (arraste + inércia) ───────────────────────

  const FRICCAO = 0.94; // quanto mais perto de 1, mais tempo o deslize "desliza" sozinho
  const VELOCIDADE_MINIMA = 0.02;
  const LIMIAR_ARRASTE = 5; // px de tolerância antes de considerar que é um arraste (não um clique)
  const RIGIDEZ_BORDA = 0.35; // resistência elástica ao passar dos limites

  const reduzMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function criarCarrossel(prefixo) {
    const container = document.getElementById(`${prefixo}-itens`);
    const track = container?.querySelector(".cardapio-track");
    const prevBtn = document.querySelector(`.carrossel-prev[data-target="${prefixo}"]`);
    const nextBtn = document.querySelector(`.carrossel-next[data-target="${prefixo}"]`);

    if (!container || !track) return;

    let posX = 0;
    let limiteMin = 0;
    const limiteMax = 0;

    let arrastando = false;
    let moveuDeVerdade = false;
    let pontoInicialX = 0;
    let posInicial = 0;
    let ultimoPontoX = 0;
    let ultimoTempo = 0;
    let velocidade = 0;
    let frame = null;

    function calcularLimites() {
      limiteMin = Math.min(0, container.clientWidth - track.scrollWidth);
    }

    function aplicar() {
      track.style.transform = `translate3d(${posX}px, 0, 0)`;
    }

    function comResistencia(valor) {
      if (valor > limiteMax) return limiteMax + (valor - limiteMax) * RIGIDEZ_BORDA;
      if (valor < limiteMin) return limiteMin + (valor - limiteMin) * RIGIDEZ_BORDA;
      return valor;
    }

    function pararAnimacao() {
      if (frame !== null) {
        cancelAnimationFrame(frame);
        frame = null;
      }
    }

    function animarPara(destino, duracao = 350) {
      pararAnimacao();

      if (reduzMovimento || duracao === 0) {
        posX = destino;
        aplicar();
        return;
      }

      const origem = posX;
      const inicio = performance.now();

      function passo(agora) {
        const t = Math.min((agora - inicio) / duracao, 1);
        const suavizado = 1 - Math.pow(1 - t, 3); // ease-out cubic

        posX = origem + (destino - origem) * suavizado;
        aplicar();

        frame = t < 1 ? requestAnimationFrame(passo) : null;
      }

      frame = requestAnimationFrame(passo);
    }

    function iniciarInercia() {
      if (reduzMovimento || Math.abs(velocidade) < VELOCIDADE_MINIMA) return;

      function passo() {
        velocidade *= FRICCAO;
        posX += velocidade * 16;

        if (posX > limiteMax) return animarPara(limiteMax, 250);
        if (posX < limiteMin) return animarPara(limiteMin, 250);

        aplicar();

        if (Math.abs(velocidade) > VELOCIDADE_MINIMA) {
          frame = requestAnimationFrame(passo);
        }
      }

      frame = requestAnimationFrame(passo);
    }

    function calcularPasso() {
      const card = track.querySelector(".marmita");
      if (!card) return 280;

      const estilo = getComputedStyle(track);
      const gap = parseFloat(estilo.columnGap) || parseFloat(estilo.gap) || 20;

      return card.offsetWidth + gap;
    }

    function aoPressionar(evento) {
      if (evento.pointerType === "mouse" && evento.button !== 0) return;

      pararAnimacao();
      calcularLimites();

      arrastando = true;
      moveuDeVerdade = false;

      pontoInicialX = evento.clientX;
      posInicial = posX;

      ultimoPontoX = evento.clientX;
      ultimoTempo = performance.now();
      velocidade = 0;

      container.setPointerCapture?.(evento.pointerId);
      container.classList.add("arrastando");
    }

    function aoMover(evento) {
      if (!arrastando) return;

      const deslocamento = evento.clientX - pontoInicialX;

      if (!moveuDeVerdade && Math.abs(deslocamento) > LIMIAR_ARRASTE) {
        moveuDeVerdade = true;
      }

      if (moveuDeVerdade && evento.cancelable) {
        evento.preventDefault();
      }

      const agora = performance.now();
      const deltaTempo = Math.max(1, agora - ultimoTempo);
      const deltaX = evento.clientX - ultimoPontoX;

      velocidade = velocidade * 0.7 + (deltaX / deltaTempo) * 0.3;

      ultimoPontoX = evento.clientX;
      ultimoTempo = agora;

      posX = comResistencia(posInicial + deslocamento);
      aplicar();
    }

    function aoSoltar(evento) {
      if (!arrastando) return;

      arrastando = false;
      container.classList.remove("arrastando");
      container.releasePointerCapture?.(evento.pointerId);

      if (posX > limiteMax) {
        animarPara(limiteMax, 250);
      } else if (posX < limiteMin) {
        animarPara(limiteMin, 250);
      } else {
        iniciarInercia();
      }
    }

    // Evita que o clique "vaze" pro botão logo depois de um arraste.
    track.addEventListener(
      "click",
      (evento) => {
        if (!moveuDeVerdade) return;
        evento.preventDefault();
        evento.stopPropagation();
        moveuDeVerdade = false;
      },
      true,
    );

    container.addEventListener("pointerdown", aoPressionar);
    container.addEventListener("pointermove", aoMover);
    container.addEventListener("pointerup", aoSoltar);
    container.addEventListener("pointercancel", aoSoltar);

    prevBtn?.addEventListener("click", () => {
      calcularLimites();
      animarPara(Math.min(limiteMax, posX + calcularPasso()));
    });

    nextBtn?.addEventListener("click", () => {
      calcularLimites();
      animarPara(Math.max(limiteMin, posX - calcularPasso()));
    });

    window.addEventListener("resize", () => {
      calcularLimites();
      posX = comResistencia(posX);
      aplicar();
    });

    calcularLimites();
  }

  // ─── INICIALIZAÇÃO ───────────────────────────────────────────

  renderCarrossel("marmitas-itens", marmitasData);
  renderCarrossel("bebidas-itens", bebidasData);
  renderCarrossel("porcoes-itens", porcoesData);

  criarCarrossel("marmitas");
  criarCarrossel("bebidas");
  criarCarrossel("porcoes");
});