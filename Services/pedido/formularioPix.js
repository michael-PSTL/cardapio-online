// Etapa 3 do pedido (interface): pagamento via Pix.
//
// Mostra o QR Code e o "Pix copia e cola" devolvidos pelo back-end e, se
// API_CONFIG.statusEndpoint estiver configurado, acompanha o pagamento até
// ele ser confirmado, recusado ou o tempo máximo acabar.
//
// A tela é criada por JS (nada novo no index.html) e reaproveita as classes
// do modal (form.pedido-form, .btn, .total-display...). Não envia pedido:
// só exibe a resposta recebida. Rede aqui = só o acompanhamento do status.

import { API_CONFIG, acompanhamentoPixAtivo, classificarStatusPagamento, consultarStatusPagamento } from "../API.js";
import { formatarMoeda } from "../core/formatadores.js";
import { ativarArmadilhaFoco } from "../core/armadilhaFoco.js";

const TEXTO_COPIAR = "Copiar código Pix";
const TEXTO_COPIADO = "Código copiado!";
const DURACAO_FEEDBACK_MS = 2500;

const MENSAGENS = {
  aguardando: "Aguardando o pagamento…",
  acompanhando: "Aguardando o pagamento… confirmamos aqui automaticamente.",
  confirmado: "Pagamento confirmado! Seu pedido já está com a gente.",
  encerrado: "Este Pix não foi concluído (recusado, cancelado ou expirado). Faça um novo pedido para tentar de novo.",
  tempoEsgotado: "Ainda não identificamos o pagamento. Se você já pagou, fique tranquilo: ele será confirmado em instantes.",
  copiarFalhou: "Não foi possível copiar. Selecione o código e copie manualmente.",
};

/**
 * @param {object} opcoes
 * @param {HTMLElement} opcoes.container            onde a tela é inserida (o overlay do modal)
 * @param {() => boolean} opcoes.estaAtivo          true enquanto a tela do Pix está à vista
 * @param {() => void} opcoes.aoFechar              "Fechar" ou Esc
 * @param {() => void} opcoes.aoConcluir            "Já paguei" / "Concluir"
 * @param {(mensagem: string) => void} [opcoes.aoConfirmarPagamento]  status confirmado pelo back-end
 */
export function iniciarTelaPix({ container, estaAtivo, aoFechar, aoConcluir, aoConfirmarPagamento }) {
  // ═══════════════════════════════════════════════════════════
  // DOM (criado uma vez, reutilizado a cada Pix)
  // ═══════════════════════════════════════════════════════════

  const criar = (tag, { classe = "", texto = "", atributos = {} } = {}) => {
    const elemento = document.createElement(tag);
    if (classe) elemento.className = classe;
    if (texto) elemento.textContent = texto;
    Object.entries(atributos).forEach(([nome, valor]) => elemento.setAttribute(nome, valor));
    return elemento;
  };

  const form = criar("form", {
    classe: "pedido-form pix-form",
    atributos: {
      id: "pix-form",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "pix-titulo",
      "aria-describedby": "pix-descricao",
      tabindex: "-1",
      novalidate: "",
    },
  });
  form.hidden = true;

  const cabecalho = criar("div", { classe: "form-header" });
  cabecalho.append(
    criar("span", { classe: "form-etapa", texto: "Pagamento via Pix" }),
    criar("div", { classe: "marmita-title", texto: "Pague com Pix", atributos: { id: "pix-titulo" } }),
    criar("p", {
      texto: "Escaneie o QR Code ou copie o código no app do seu banco",
      atributos: { id: "pix-descricao" },
    }),
  );

  const qrBloco = criar("div", { classe: "pix-qr" });
  const qrImagem = criar("img", {
    classe: "pix-qr-imagem",
    atributos: { width: "220", height: "220", decoding: "async" },
  });
  qrBloco.append(qrImagem);

  const total = criar("div", { classe: "total-display" });
  const totalValor = criar("span", { classe: "total-value", texto: formatarMoeda(0) });
  total.append(criar("span", { classe: "total-label", texto: "Valor do Pix" }), totalValor);

  const secaoCodigo = criar("div", { classe: "section" });
  const rotuloCodigo = criar("label", {
    classe: "section-title",
    texto: "Pix copia e cola",
    atributos: { for: "pix-codigo" },
  });
  const campoCodigo = criar("textarea", {
    classe: "input-field pix-codigo",
    atributos: { id: "pix-codigo", rows: "4", readonly: "", spellcheck: "false", autocomplete: "off" },
  });
  const btnCopiar = criar("button", { classe: "btn btn-submit pix-copiar", texto: TEXTO_COPIAR, atributos: { type: "button" } });
  secaoCodigo.append(rotuloCodigo, campoCodigo, btnCopiar);

  const status = criar("p", { classe: "pix-status", atributos: { role: "status", "aria-live": "polite" } });

  const link = criar("a", {
    classe: "btn-link pix-link",
    texto: "Abrir página do pagamento",
    atributos: { target: "_blank", rel: "noopener noreferrer" },
  });
  link.hidden = true;

  const passos = criar("p", {
    classe: "pagamento-nota",
    texto: "No app do banco, escolha Pix → Pix Copia e Cola (ou Ler QR Code) e confirme o pagamento.",
  });

  const rodape = criar("div", { classe: "form-footer" });
  const btnFechar = criar("button", { classe: "btn btn-cancel", texto: "Fechar", atributos: { type: "button" } });
  const btnConcluir = criar("button", { classe: "btn btn-submit", texto: "Já paguei", atributos: { type: "submit" } });
  rodape.append(btnFechar, btnConcluir);

  form.append(cabecalho, qrBloco, total, secaoCodigo, status, link, passos, rodape);
  container.append(form);

  // ═══════════════════════════════════════════════════════════
  // ESTADO
  // ═══════════════════════════════════════════════════════════

  let timerFeedback = null;
  let timerConsulta = null;
  let acompanhamentoId = 0;
  let acompanhamentoController = null;

  function definirStatus(mensagem, estado = "") {
    status.textContent = mensagem;
    if (estado) status.dataset.estado = estado;
    else delete status.dataset.estado;
  }

  // ═══════════════════════════════════════════════════════════
  // COPIAR CÓDIGO
  // ═══════════════════════════════════════════════════════════

  function copiarPeloCampo() {
    try {
      campoCodigo.focus();
      campoCodigo.select();
      campoCodigo.setSelectionRange(0, campoCodigo.value.length);
      return document.execCommand("copy");
    } catch {
      return false;
    }
  }

  async function copiarCodigo() {
    const codigo = campoCodigo.value;
    if (!codigo) return;

    let copiou = false;

    if (navigator.clipboard?.writeText && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(codigo);
        copiou = true;
      } catch {
        copiou = false;
      }
    }

    // Contexto sem permissão (http, navegador antigo, iframe): tenta pelo campo.
    if (!copiou) copiou = copiarPeloCampo();

    clearTimeout(timerFeedback);

    if (copiou) {
      btnCopiar.textContent = TEXTO_COPIADO;
      timerFeedback = setTimeout(() => {
        btnCopiar.textContent = TEXTO_COPIAR;
      }, DURACAO_FEEDBACK_MS);
    } else {
      campoCodigo.select();
      definirStatus(MENSAGENS.copiarFalhou, "aviso");
    }
  }

  btnCopiar.addEventListener("click", copiarCodigo);

  // Um toque no campo seleciona tudo (ajuda quem precisa copiar manualmente).
  campoCodigo.addEventListener("focus", () => campoCodigo.select());

  // ═══════════════════════════════════════════════════════════
  // ACOMPANHAMENTO DO PAGAMENTO (opcional: API_CONFIG.statusEndpoint)
  // ═══════════════════════════════════════════════════════════

  function pararAcompanhamento() {
    acompanhamentoId += 1;
    clearTimeout(timerConsulta);
    timerConsulta = null;
    acompanhamentoController?.abort();
    acompanhamentoController = null;
  }

  function iniciarAcompanhamento(pagamentoId) {
    pararAcompanhamento();

    const minhaId = acompanhamentoId;
    const controller = new AbortController();
    acompanhamentoController = controller;
    const limite = Date.now() + API_CONFIG.pixTempoMaximoMs;

    definirStatus(MENSAGENS.acompanhando, "carregando");

    async function consultar() {
      if (minhaId !== acompanhamentoId) return;

      if (Date.now() >= limite) {
        definirStatus(MENSAGENS.tempoEsgotado, "aviso");
        return;
      }

      try {
        const situacao = classificarStatusPagamento(
          await consultarStatusPagamento(pagamentoId, { signal: controller.signal }),
        );
        if (minhaId !== acompanhamentoId) return;

        if (situacao === "confirmado") {
          definirStatus(MENSAGENS.confirmado, "ok");
          btnConcluir.textContent = "Concluir";
          btnCopiar.disabled = true;
          aoConfirmarPagamento?.(MENSAGENS.confirmado);
          return;
        }

        if (situacao === "encerrado") {
          definirStatus(MENSAGENS.encerrado, "erro");
          btnConcluir.hidden = true;
          btnCopiar.disabled = true;
          return;
        }
      } catch (erro) {
        if (minhaId !== acompanhamentoId) return;
        // Falha momentânea de rede/servidor: segue tentando até o limite.
        console.warn("[formularioPix] Falha ao consultar o pagamento:", erro);
      }

      timerConsulta = setTimeout(consultar, API_CONFIG.pixIntervaloMs);
    }

    timerConsulta = setTimeout(consultar, API_CONFIG.pixIntervaloMs);
  }

  // ═══════════════════════════════════════════════════════════
  // EVENTOS
  // ═══════════════════════════════════════════════════════════

  btnFechar.addEventListener("click", () => aoFechar());

  form.addEventListener("submit", (evento) => {
    evento.preventDefault();
    aoConcluir();
  });

  ativarArmadilhaFoco({ container: form, estaAtivo, aoEscape: aoFechar });

  // ═══════════════════════════════════════════════════════════
  // API DO MÓDULO
  // ═══════════════════════════════════════════════════════════

  /**
   * @param {object} pix  resposta já validada por lerRespostaPix (API.js)
   * @param {number} totalPedido  usado se o back-end não devolver "valor"
   */
  function exibir(pix, totalPedido = 0) {
    resetar();

    const valor = pix.valor ?? totalPedido;
    totalValor.textContent = formatarMoeda(valor);

    qrBloco.hidden = !pix.qrCodeSrc;
    if (pix.qrCodeSrc) {
      qrImagem.src = pix.qrCodeSrc;
      qrImagem.alt = `QR Code do Pix no valor de ${formatarMoeda(valor)}`;
    }

    secaoCodigo.hidden = !pix.qrCode;
    campoCodigo.value = pix.qrCode;

    if (pix.ticketUrl) {
      link.href = pix.ticketUrl;
      link.hidden = false;
    }

    // Com acompanhamento automático não precisa do "Já paguei".
    const acompanhar = acompanhamentoPixAtivo() && Boolean(pix.pagamentoId);
    btnConcluir.hidden = acompanhar;

    if (acompanhar) iniciarAcompanhamento(pix.pagamentoId);
    else definirStatus(MENSAGENS.aguardando, "carregando");
  }

  /** Limpa a tela e para qualquer consulta em andamento. */
  function resetar() {
    pararAcompanhamento();
    clearTimeout(timerFeedback);

    qrImagem.removeAttribute("src");
    qrImagem.alt = "";
    campoCodigo.value = "";
    totalValor.textContent = formatarMoeda(0);

    link.hidden = true;
    link.removeAttribute("href");

    btnCopiar.disabled = false;
    btnCopiar.textContent = TEXTO_COPIAR;
    btnConcluir.hidden = false;
    btnConcluir.textContent = "Já paguei";

    qrBloco.hidden = false;
    secaoCodigo.hidden = false;
    definirStatus("");
  }

  return { elemento: form, exibir, resetar };
}
