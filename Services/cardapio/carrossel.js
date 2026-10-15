// ═══════════════════════════════════════════════════════════
// DESLIZE SUAVE DO CARROSSEL (arraste + inércia)
//
// ⚠️ Lógica interna do carrossel — normalmente não precisa
// editar nada aqui além dos valores de ajuste fino abaixo.
// ═══════════════════════════════════════════════════════════

const FRICCAO = 0.94; // quanto mais perto de 1, mais tempo o deslize "desliza" sozinho
const VELOCIDADE_MINIMA = 0.02;
const LIMIAR_ARRASTE = 5; // px de tolerância antes de considerar que é um arraste (não um clique)
const RIGIDEZ_BORDA = 0.35; // resistência elástica ao passar dos limites

const reduzMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function criarCarrossel(prefixo) {
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

  // Guarda o pointerId do toque/clique atual. É usado para só capturar
  // o pointer (ver aoMover) depois que um arraste de verdade é confirmado.
  let pointerIdAtual = null;

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
    pointerIdAtual = evento.pointerId;

    pontoInicialX = evento.clientX;
    posInicial = posX;

    ultimoPontoX = evento.clientX;
    ultimoTempo = performance.now();
    velocidade = 0;

    container.classList.add("arrastando");

    // IMPORTANTE: NÃO chamamos container.setPointerCapture aqui.
    // Capturar em todo pointerdown (mesmo num clique simples) faz o
    // navegador redirecionar o "click" para o container em vez do botão
    // pressionado — o botão "Adicionar" deixaria de responder ao mouse.
    // A captura só acontece em aoMover, quando um arraste real é confirmado.
  }

  function aoMover(evento) {
    if (!arrastando) return;

    const deslocamento = evento.clientX - pontoInicialX;

    if (!moveuDeVerdade && Math.abs(deslocamento) > LIMIAR_ARRASTE) {
      moveuDeVerdade = true;
      container.setPointerCapture?.(pointerIdAtual);
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
