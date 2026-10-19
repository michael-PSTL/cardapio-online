// Etapa 2 do pedido (interface): escolha da forma de pagamento.
//
// O cliente escolhe o MEIO (Dinheiro, Pix, Crédito, Débito) e, quando o meio
// permite os dois, QUANDO paga (online ou presencial). A combinação vira a
// chave do enum FormaPagamento do back-end (ex.: PIX + online = PIX_ONLINE).
//
// Este módulo só cuida da tela. Quem envia o pedido é formularioPedido.js
// (via API.js): aqui não há rede.

import { formaPagamentoAtiva, rotuloFormaPagamento } from "../API.js";
import { escaparHtml, formatarMoeda } from "../core/formatadores.js";

// ┌─────────────────────────────────────────────────────────┐
// │ 🔧 CONFIGURAÇÃO — MEIOS DE PAGAMENTO NA TELA              │
// │ `formas` liga cada momento à chave do enum. Formas        │
// │ desativadas em API.js (FORMAS_PAGAMENTO) somem sozinhas;  │
// │ se sobrar só um momento, a pergunta "quando" não aparece. │
// └─────────────────────────────────────────────────────────┘
const ICONES = {
  dinheiro:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 12h.01M18 12h.01"/></svg>',
  pix: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v.01M14 21v-.01M17.5 21H21v-3.5"/></svg>',
  credito:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/></svg>',
  debito:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M15 15h3"/></svg>',
};

const METODOS = [
  {
    id: "dinheiro",
    rotulo: "Dinheiro",
    dica: "Pague em espécie",
    nota: "Precisa de troco? Avise nas observações do pedido.",
    formas: { presencial: "DINHEIRO" },
  },
  {
    id: "pix",
    rotulo: "Pix",
    dica: "Pagamento instantâneo",
    formas: { online: "PIX_ONLINE", presencial: "PIX_PRESENCIAL" },
  },
  {
    id: "credito",
    rotulo: "Crédito",
    dica: "Cartão de crédito",
    formas: { online: "CREDITO_ONLINE", presencial: "CREDITO_PRESENCIAL" },
  },
  {
    id: "debito",
    rotulo: "Débito",
    dica: "Cartão de débito",
    formas: { online: "DEBITO_ONLINE", presencial: "DEBITO_PRESENCIAL" },
  },
];

const MOMENTOS = {
  online: {
    rotulo: "Online",
    dica: () => "Pague agora, pelo site",
    nota: () => "Você paga agora, pelo site.",
  },
  presencial: {
    rotulo: "Presencial",
    dica: (entrega) => (entrega ? "Na entrega, ao receber" : "Na retirada, no balcão"),
    nota: (entrega) => (entrega ? "Você paga ao receber o pedido." : "Você paga ao retirar o pedido."),
  },
};

const TEXTO_BOTAO_ENVIANDO = "Enviando…";

/**
 * @param {object} opcoes
 * @param {() => void} opcoes.aoVoltar                          clique em "Voltar"
 * @param {(formaPagamento: string) => void} opcoes.aoConfirmar  forma válida escolhida
 */
export function iniciarFormularioPagamento({ aoVoltar, aoConfirmar }) {
  const $ = (id) => document.getElementById(id);

  const form = $("pagamento-form");
  const gradeMetodos = $("pagamento-metodos");
  const secaoMomentos = $("pagamento-momentos-secao");
  const gradeMomentos = $("pagamento-momentos");

  if (!form || !gradeMetodos || !secaoMomentos || !gradeMomentos) {
    console.warn("[formularioPagamento] Formulário de pagamento não encontrado no HTML.");
    return null;
  }

  const notaEl = $("pagamento-nota");
  const escolhaEl = $("pagamento-escolha");
  const erroMetodoEl = $("erro-pagamento");
  const erroMomentoEl = $("erro-momento");
  const erroEnvioEl = $("erro-envio");
  const totalValorEl = $("pagamento-total-valor");
  const totalBreakdownEl = $("pagamento-total-breakdown");
  const btnVoltar = $("btn-voltar-dados");
  const btnConfirmar = $("btn-confirmar-pedido");
  const textoBotaoOriginal = btnConfirmar?.textContent.trim() || "Confirmar pedido";

  // Só entram na tela as formas ativas em API.js.
  const metodos = METODOS.map((metodo) => ({
    ...metodo,
    formas: Object.fromEntries(Object.entries(metodo.formas).filter(([, chave]) => formaPagamentoAtiva(chave))),
  })).filter((metodo) => Object.keys(metodo.formas).length > 0);

  const estado = { metodo: "", momento: "", entrega: false };

  const metodoAtual = () => metodos.find((metodo) => metodo.id === estado.metodo) ?? null;
  const momentosDoMetodo = () => Object.keys(metodoAtual()?.formas ?? {});

  function formaSelecionada() {
    const metodo = metodoAtual();
    if (!metodo) return "";

    const momentos = Object.keys(metodo.formas);
    if (momentos.length === 1) return metodo.formas[momentos[0]];

    return metodo.formas[estado.momento] ?? "";
  }

  // ═══════════════════════════════════════════════════════════
  // RENDERIZAÇÃO
  // ═══════════════════════════════════════════════════════════

  function renderizarMetodos() {
    gradeMetodos.innerHTML = metodos
      .map(
        (metodo) => `
          <div class="radio-option">
            <input type="radio" name="metodo" id="metodo-${metodo.id}" value="${metodo.id}"
              ${estado.metodo === metodo.id ? "checked" : ""} />
            <label for="metodo-${metodo.id}" class="radio-label pagamento-label">
              <span class="pagamento-icone" aria-hidden="true">${ICONES[metodo.id] ?? ""}</span>
              <span class="name">${escaparHtml(metodo.rotulo)}</span>
              <span class="hint">${escaparHtml(metodo.dica)}</span>
            </label>
          </div>
        `,
      )
      .join("");
  }

  function renderizarMomentos() {
    const momentos = momentosDoMetodo();
    const perguntar = momentos.length > 1;

    secaoMomentos.hidden = !perguntar;

    gradeMomentos.innerHTML = perguntar
      ? momentos
          .map((momento) => {
            const config = MOMENTOS[momento];
            return `
              <div class="radio-option">
                <input type="radio" name="momento" id="momento-${momento}" value="${momento}"
                  ${estado.momento === momento ? "checked" : ""} />
                <label for="momento-${momento}" class="radio-label">
                  <span class="name">${escaparHtml(config.rotulo)}</span>
                  <span class="hint">${escaparHtml(config.dica(estado.entrega))}</span>
                </label>
              </div>
            `;
          })
          .join("")
      : "";

    atualizarNota();
  }

  // Quando só existe um momento possível (ex.: Dinheiro) em vez de perguntar, explica.
  function atualizarNota() {
    if (!notaEl) return;

    const metodo = metodoAtual();
    const momentos = momentosDoMetodo();

    if (!metodo || momentos.length !== 1) {
      notaEl.hidden = true;
      notaEl.textContent = "";
      return;
    }

    const partes = [MOMENTOS[momentos[0]].nota(estado.entrega)];
    if (metodo.nota) partes.push(metodo.nota);

    notaEl.textContent = partes.join(" ");
    notaEl.hidden = false;
  }

  function atualizarEscolha() {
    if (!escolhaEl) return;

    const forma = formaSelecionada();
    escolhaEl.textContent = forma ? `Forma escolhida: ${rotuloFormaPagamento(forma)}` : "";
  }

  // ═══════════════════════════════════════════════════════════
  // VALIDAÇÃO
  // ═══════════════════════════════════════════════════════════

  function mostrarErros({ metodo = "", momento = "" }) {
    if (erroMetodoEl) erroMetodoEl.textContent = metodo;
    if (erroMomentoEl) erroMomentoEl.textContent = momento;

    if (metodo) gradeMetodos.setAttribute("aria-invalid", "true");
    else gradeMetodos.removeAttribute("aria-invalid");

    if (momento) gradeMomentos.setAttribute("aria-invalid", "true");
    else gradeMomentos.removeAttribute("aria-invalid");
  }

  /** Devolve a mensagem de erro ("" quando válido). */
  function validar(exibir = true) {
    let metodo = "";
    let momento = "";

    if (!metodoAtual()) metodo = "Escolha a forma de pagamento.";
    else if (!formaSelecionada()) momento = "Escolha se prefere pagar online ou presencialmente.";

    if (exibir) mostrarErros({ metodo, momento });
    return metodo || momento;
  }

  function focarPrimeiroInvalido() {
    const alvo = !metodoAtual()
      ? gradeMetodos.querySelector('input[name="metodo"]')
      : gradeMomentos.querySelector('input[name="momento"]');

    alvo?.focus();
  }

  // ═══════════════════════════════════════════════════════════
  // EVENTOS
  // ═══════════════════════════════════════════════════════════

  gradeMetodos.addEventListener("change", (evento) => {
    const input = evento.target;
    if (!(input instanceof HTMLInputElement) || input.name !== "metodo") return;

    estado.metodo = input.value;

    // Mantém o momento já escolhido se o novo meio também o aceita
    // (ex.: "Presencial" continua marcado ao trocar Pix por Crédito).
    const momentos = momentosDoMetodo();
    if (momentos.length === 1) estado.momento = momentos[0];
    else if (!momentos.includes(estado.momento)) estado.momento = "";

    renderizarMomentos();
    atualizarEscolha();
    mostrarErros({});
  });

  gradeMomentos.addEventListener("change", (evento) => {
    const input = evento.target;
    if (!(input instanceof HTMLInputElement) || input.name !== "momento") return;

    estado.momento = input.value;
    atualizarEscolha();
    mostrarErros({});
  });

  btnVoltar?.addEventListener("click", () => aoVoltar());

  form.addEventListener("submit", (evento) => {
    evento.preventDefault();

    if (validar()) {
      focarPrimeiroInvalido();
      return;
    }

    aoConfirmar(formaSelecionada());
  });

  // ═══════════════════════════════════════════════════════════
  // API DO MÓDULO
  // ═══════════════════════════════════════════════════════════

  /** Chamado ao entrar na etapa: atualiza total e textos que dependem da entrega. */
  function preparar({ entrega, subtotal, frete, total }) {
    estado.entrega = Boolean(entrega);

    if (totalValorEl) totalValorEl.textContent = formatarMoeda(total);

    if (totalBreakdownEl) {
      const partes = [];
      if (subtotal > 0) partes.push(`Itens: ${formatarMoeda(subtotal)}`);
      if (frete > 0) partes.push(`Frete: ${formatarMoeda(frete)}`);
      totalBreakdownEl.textContent = partes.join(" · ");
    }

    renderizarMomentos();
    atualizarEscolha();
  }

  function definirEnviando(ativo) {
    form.setAttribute("aria-busy", String(ativo));

    if (btnConfirmar) {
      btnConfirmar.disabled = ativo;
      btnConfirmar.textContent = ativo ? TEXTO_BOTAO_ENVIANDO : textoBotaoOriginal;
    }

    if (btnVoltar) btnVoltar.disabled = ativo;
  }

  function mostrarErroEnvio(mensagem) {
    if (erroEnvioEl) erroEnvioEl.textContent = mensagem;
  }

  function resetar() {
    estado.metodo = "";
    estado.momento = "";
    estado.entrega = false;

    renderizarMetodos();
    renderizarMomentos();
    atualizarEscolha();
    mostrarErros({});
    mostrarErroEnvio("");
    definirEnviando(false);
  }

  renderizarMetodos();
  renderizarMomentos();

  return {
    elemento: form,
    preparar,
    definirEnviando,
    mostrarErroEnvio,
    resetar,
  };
}
