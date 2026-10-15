// Formulário de pedido (interface): abrir/fechar, campos, validação visual,
// CEP, frete/total e envio. As regras vivem em módulos próprios:
//   validacao.js (regras) · viaCep.js (rede) · API.js (envio do pedido)
//   mensagemWhatsapp.js (texto do WhatsApp) · carrinhoStore.js (itens)

import { enviarPedido, ErroApi, ErroPedido } from "../API.js";
import { ativarArmadilhaFoco } from "../core/armadilhaFoco.js";
import { formatarMoeda, escaparHtml, normalizarEspacos, somenteDigitos } from "../core/formatadores.js";
import {
  aplicarMascaraCep,
  aplicarMascaraComCursor,
  aplicarMascaraTelefone,
} from "../core/mascaras.js";
import { travarScroll, destravarScroll } from "../core/scroll.js";
import * as carrinho from "../carrinho/carrinhoStore.js";
import { mostrarAviso } from "../ui/aviso.js";
import { consultarCep } from "./viaCep.js";
import { WHATSAPP_CONFIG, montarMensagemWhatsapp, montarUrlWhatsapp } from "./mensagemWhatsapp.js";
import {
  validarCep,
  validarEmail,
  validarNome,
  validarNumeroEndereco,
  validarTelefone,
  validarTextoObrigatorio,
} from "./validacao.js";

const DONO_SCROLL = "formulario";
const LIMITE_OBSERVACOES = 300;
const TEXTO_BOTAO_ENVIANDO = "Enviando…";

/** @returns {{ abrir: () => void } | null} */
export function iniciarFormularioPedido() {
  const $ = (id) => document.getElementById(id);

  const form = $("pedido-form");
  const overlay = $("formulario-overlay");

  if (!form || !overlay) {
    console.warn("[formularioPedido] Formulário de pedido não encontrado no HTML.");
    return null;
  }

  const enderecoContainer = $("endereco-container");
  const totalValor = $("total-valor");
  const totalBreakdown = $("total-breakdown");
  const btnCancelar = $("btn-cancelar");
  const btnEnviar = form.querySelector('button[type="submit"]');
  const resumoCarrinhoForm = $("resumo-carrinho-form");
  const inputTelefone = $("input-telefone");
  const inputCep = $("input-cep");
  const inputNumero = $("input-numero");
  const cepStatus = $("status-cep");
  const observacoes = $("observacoes");
  const contadorObservacoes = $("contador-observacoes");
  const grupoRecebimento = form.querySelector('[role="radiogroup"]');
  const erroRecebimento = $("erro-recebimento");
  const textoBotaoOriginal = btnEnviar?.textContent.trim() ?? "";

  // Mensagem de erro do envio (criada por JS: o HTML não precisa mudar).
  const erroEnvio = document.createElement("p");
  erroEnvio.className = "field-error";
  erroEnvio.id = "erro-envio";
  erroEnvio.setAttribute("role", "alert");
  form.querySelector(".form-footer")?.before(erroEnvio);

  let frete = 0;
  let ultimoFoco = null;
  let enviando = false;
  let envioController = null;
  let cepController = null;
  let cepRequisicaoId = 0;

  const estaAberto = () => overlay.style.display === "block";
  const entregaSelecionada = () => form.elements.recebimento?.value === "entrega";

  // ═══════════════════════════════════════════════════════════
  // CAMPOS E VALIDAÇÃO VISUAL
  // ═══════════════════════════════════════════════════════════

  const definicoes = [
    { id: "input-nome", erroId: "erro-nome", validar: validarNome },
    { id: "input-email", erroId: "erro-email", validar: validarEmail },
    { id: "input-telefone", erroId: "erro-telefone", validar: validarTelefone },
    { id: "input-cep", erroId: "erro-cep", endereco: true, validar: validarCep },
    { id: "input-cidade", erroId: "erro-cidade", endereco: true, validar: validarTextoObrigatorio("Informe a cidade.") },
    { id: "input-bairro", erroId: "erro-bairro", endereco: true, validar: validarTextoObrigatorio("Informe o bairro.") },
    { id: "input-rua", erroId: "erro-rua", endereco: true, validar: validarTextoObrigatorio("Informe a rua.") },
    { id: "input-numero", erroId: "erro-numero", endereco: true, validar: validarNumeroEndereco },
  ];

  const campos = definicoes
    .map((definicao) => {
      const input = $(definicao.id);
      if (!input) return null;
      return { ...definicao, input, field: input.closest(".field"), erroEl: $(definicao.erroId) };
    })
    .filter(Boolean);

  function mostrarErro(campo, mensagem) {
    if (campo.erroEl) campo.erroEl.textContent = mensagem;
    campo.field?.classList.toggle("has-error", Boolean(mensagem));

    if (mensagem) campo.input.setAttribute("aria-invalid", "true");
    else campo.input.removeAttribute("aria-invalid");
  }

  function validarCampo(campo, exibirErro = true) {
    if (campo.input.disabled) {
      mostrarErro(campo, "");
      campo.field?.classList.remove("is-valid");
      return "";
    }

    const mensagem = campo.validar(campo.input.value);
    if (exibirErro) mostrarErro(campo, mensagem);

    campo.field?.classList.toggle("is-valid", !mensagem && campo.input.value.trim() !== "");
    return mensagem;
  }

  function validarRecebimento(exibirErro = true) {
    const mensagem = form.elements.recebimento?.value ? "" : "Escolha entre entrega ou retirada.";

    if (exibirErro) {
      if (erroRecebimento) erroRecebimento.textContent = mensagem;
      if (mensagem) grupoRecebimento?.setAttribute("aria-invalid", "true");
      else grupoRecebimento?.removeAttribute("aria-invalid");
    }

    return mensagem;
  }

  function validarTudo() {
    const invalidos = [];

    campos.forEach((campo) => {
      if (validarCampo(campo)) invalidos.push(campo.input);
    });

    if (validarRecebimento()) invalidos.push($("recebimento-entrega"));

    // Foca o primeiro campo inválido na ordem em que aparece na tela.
    invalidos.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));

    if (invalidos.length > 0) {
      invalidos[0].focus();
      return false;
    }

    return true;
  }

  campos.forEach((campo) => {
    campo.input.addEventListener("blur", () => validarCampo(campo));

    campo.input.addEventListener("input", () => {
      // Se já está mostrando erro, revalida na hora; senão só atualiza o "ok".
      validarCampo(campo, campo.field?.classList.contains("has-error") ?? false);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // TELEFONE
  // ═══════════════════════════════════════════════════════════

  inputTelefone?.addEventListener("input", (evento) => {
    // Colar ou autopreencher com "+55 ..." / "55..." / "0..." na frente.
    if (evento.inputType !== "insertText" && evento.inputType !== "deleteContentBackward") {
      const bruto = somenteDigitos(inputTelefone.value);

      if (bruto.length > 11 && bruto.startsWith("55")) {
        inputTelefone.value = bruto.slice(2);
      } else if (bruto.length === 12 && bruto.startsWith("0")) {
        inputTelefone.value = bruto.slice(1);
      }
    }

    aplicarMascaraComCursor(inputTelefone, aplicarMascaraTelefone, 11, evento);
  });

  // Clicar na área do prefixo também foca o campo.
  inputTelefone?.closest(".telefone-wrap")?.addEventListener("click", (evento) => {
    if (evento.target !== inputTelefone) inputTelefone.focus();
  });

  // ═══════════════════════════════════════════════════════════
  // CEP (máscara + preenchimento automático)
  // ═══════════════════════════════════════════════════════════

  function definirStatusCep(mensagem, estado = "") {
    if (!cepStatus) return;

    cepStatus.textContent = mensagem;
    if (estado) cepStatus.dataset.estado = estado;
    else delete cepStatus.dataset.estado;
  }

  function cancelarBuscaCep() {
    cepRequisicaoId += 1;
    cepController?.abort();
    cepController = null;
  }

  function preencherCampoEndereco(id, valor) {
    const input = $(id);
    const campo = campos.find((item) => item.id === id);
    if (!input || !valor) return;

    input.value = valor;
    if (campo) validarCampo(campo, false);
    if (campo?.field?.classList.contains("has-error")) validarCampo(campo);
  }

  async function buscarEndereco(cep) {
    cancelarBuscaCep();

    const controller = new AbortController();
    cepController = controller;
    const requisicaoId = cepRequisicaoId;

    definirStatusCep("Buscando endereço…", "carregando");

    try {
      const endereco = await consultarCep(cep, { signal: controller.signal });
      if (requisicaoId !== cepRequisicaoId) return;

      if (!endereco) {
        definirStatusCep("CEP não encontrado. Preencha o endereço manualmente.", "aviso");
        return;
      }

      preencherCampoEndereco("input-cidade", endereco.cidade);
      preencherCampoEndereco("input-bairro", endereco.bairro);
      preencherCampoEndereco("input-rua", endereco.rua);

      definirStatusCep("Endereço encontrado. Confira e informe o número.", "ok");

      if (document.activeElement === inputCep) inputNumero?.focus();
    } catch (erro) {
      if (requisicaoId !== cepRequisicaoId) return;
      console.warn("[formularioPedido] Falha ao buscar CEP:", erro);
      definirStatusCep("Não foi possível buscar o CEP agora. Preencha manualmente.", "aviso");
    }
  }

  inputCep?.addEventListener("input", (evento) => {
    const digitos = aplicarMascaraComCursor(inputCep, aplicarMascaraCep, 8, evento);

    if (digitos.length === 8) {
      buscarEndereco(digitos);
    } else {
      cancelarBuscaCep();
      definirStatusCep("");
    }
  });

  // ═══════════════════════════════════════════════════════════
  // OBSERVAÇÕES
  // ═══════════════════════════════════════════════════════════

  function atualizarContadorObservacoes() {
    if (!observacoes || !contadorObservacoes) return;
    contadorObservacoes.textContent = `${observacoes.value.length}/${LIMITE_OBSERVACOES}`;
  }

  observacoes?.addEventListener("input", atualizarContadorObservacoes);

  // ═══════════════════════════════════════════════════════════
  // RESUMO E TOTAL
  // ═══════════════════════════════════════════════════════════

  function renderResumoCarrinho() {
    if (!resumoCarrinhoForm) return;

    resumoCarrinhoForm.innerHTML = carrinho
      .getItens()
      .map(
        (item) => `
          <div class="resumo-item">
            <span>
              <span class="resumo-qtd">${Number(item.quantidade) || 0}x</span>
              ${escaparHtml(item.nome)}
            </span>
            <span>${formatarMoeda(item.preco * item.quantidade)}</span>
          </div>
        `,
      )
      .join("");
  }

  function calcularTotal() {
    if (!totalValor) return 0;

    const subtotal = carrinho.getSubtotal();
    const total = subtotal + frete;

    totalValor.textContent = formatarMoeda(total);

    const partes = [];
    if (subtotal > 0) partes.push(`Itens: ${formatarMoeda(subtotal)}`);
    if (frete > 0) partes.push(`Frete: ${formatarMoeda(frete)}`);

    if (totalBreakdown) totalBreakdown.textContent = partes.join(" · ");
    return total;
  }

  // ═══════════════════════════════════════════════════════════
  // RECEBIMENTO (entrega x retirada)
  // O frete de cada opção vem do atributo data-frete de cada
  // <input type="radio"> no index.html (ex.: data-frete="8").
  // ═══════════════════════════════════════════════════════════

  // Campos do endereço só participam (foco, validação, envio) na entrega.
  function definirModoEntrega(ativo) {
    if (!enderecoContainer) return;

    enderecoContainer.classList.toggle("visible", ativo);
    enderecoContainer.inert = !ativo;

    enderecoContainer.querySelectorAll("input").forEach((input) => {
      input.disabled = !ativo;
      input.required = ativo && input.hasAttribute("data-obrigatorio");
    });

    if (!ativo) {
      campos
        .filter((campo) => campo.endereco)
        .forEach((campo) => {
          mostrarErro(campo, "");
          campo.field?.classList.remove("is-valid");
        });
      cancelarBuscaCep();
      definirStatusCep("");
    }
  }

  form.querySelectorAll('input[name="recebimento"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      frete = Number.parseFloat(radio.dataset.frete) || 0;
      definirModoEntrega(radio.value === "entrega");
      validarRecebimento();
      calcularTotal();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // ABRIR / FECHAR
  // ═══════════════════════════════════════════════════════════

  function mostrarErroEnvio(mensagem) {
    erroEnvio.textContent = mensagem;
    if (mensagem) erroEnvio.style.marginBottom = "12px";
    else erroEnvio.style.removeProperty("margin-bottom");
  }

  function definirEnviando(ativo) {
    enviando = ativo;
    form.setAttribute("aria-busy", String(ativo));

    if (btnEnviar) {
      btnEnviar.disabled = ativo;
      btnEnviar.textContent = ativo ? TEXTO_BOTAO_ENVIANDO : textoBotaoOriginal;
    }
  }

  function limparEstadoFormulario() {
    form.reset();

    campos.forEach((campo) => {
      mostrarErro(campo, "");
      campo.field?.classList.remove("is-valid");
      delete campo.input.dataset.digitos;
    });

    if (erroRecebimento) erroRecebimento.textContent = "";
    grupoRecebimento?.removeAttribute("aria-invalid");

    mostrarErroEnvio("");
    frete = 0;
    definirModoEntrega(false);
    atualizarContadorObservacoes();
  }

  function abrir() {
    if (carrinho.getTotalItens() === 0) return;

    ultimoFoco = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    renderResumoCarrinho();
    calcularTotal();

    overlay.style.display = "block";
    form.scrollTop = 0;
    travarScroll(DONO_SCROLL);

    // Foca o diálogo (e não o primeiro campo) para não abrir o teclado no celular.
    requestAnimationFrame(() => form.focus({ preventScroll: true }));
  }

  function fechar() {
    envioController?.abort();
    envioController = null;
    definirEnviando(false);

    overlay.style.display = "none";
    limparEstadoFormulario();
    destravarScroll(DONO_SCROLL);

    if (ultimoFoco && document.contains(ultimoFoco)) ultimoFoco.focus?.();
    ultimoFoco = null;
  }

  btnCancelar?.addEventListener("click", fechar);

  // Só fecha se o clique começou E terminou no fundo (evita fechar ao
  // arrastar uma seleção de texto para fora do formulário).
  let cliqueComecouNoFundo = false;

  overlay.addEventListener("pointerdown", (evento) => {
    cliqueComecouNoFundo = evento.target === overlay;
  });

  overlay.addEventListener("click", (evento) => {
    if (cliqueComecouNoFundo && evento.target === overlay) fechar();
    cliqueComecouNoFundo = false;
  });

  ativarArmadilhaFoco({ container: form, estaAtivo: estaAberto, aoEscape: fechar });

  // ═══════════════════════════════════════════════════════════
  // ENVIO DO PEDIDO
  // ═══════════════════════════════════════════════════════════

  function coletarDados() {
    const entrega = entregaSelecionada();
    const valor = (id) => normalizarEspacos($(id)?.value);

    return {
      nome: valor("input-nome"),
      email: ($("input-email")?.value ?? "").trim().toLowerCase(),
      telefone: somenteDigitos(inputTelefone?.value),
      recebimento: form.elements.recebimento?.value ?? "",
      endereco: entrega
        ? {
            cep: somenteDigitos(inputCep?.value),
            cidade: valor("input-cidade"),
            bairro: valor("input-bairro"),
            rua: valor("input-rua"),
            numero: valor("input-numero"),
            complemento: valor("input-complemento"),
          }
        : null,
      observacao: (observacoes?.value ?? "").trim(),
    };
  }

  function abrirWhatsapp(dados, itens, total) {
    const mensagem = montarMensagemWhatsapp({ ...dados, itens, total });
    const url = montarUrlWhatsapp(mensagem);

    const janela = window.open(url, "_blank");
    if (janela) janela.opener = null;
    // Pop-up bloqueado pelo navegador: abre na mesma aba.
    else window.location.assign(url);
  }

  function mensagemDeErro(erro) {
    if (erro instanceof ErroPedido || erro instanceof ErroApi) return erro.message;
    console.error("[formularioPedido] Erro inesperado ao enviar:", erro);
    return "Ocorreu um erro inesperado ao enviar o pedido. Tente novamente.";
  }

  async function aoEnviar(evento) {
    evento.preventDefault();
    if (enviando) return;

    const itens = carrinho.getItens();
    if (itens.length === 0) {
      fechar();
      return;
    }

    if (!validarTudo()) return;

    const dados = coletarDados();
    const total = calcularTotal();

    const controller = new AbortController();
    envioController = controller;

    mostrarErroEnvio("");
    definirEnviando(true);

    try {
      await enviarPedido(
        {
          nome: dados.nome,
          email: dados.email,
          telefone: dados.telefone,
          tipoRecebimento: dados.recebimento,
          observacao: dados.observacao,
          endereco: dados.endereco,
          itens: itens.map(({ id, quantidade }) => ({ id, quantidade })),
        },
        { signal: controller.signal },
      );
    } catch (erro) {
      // Formulário fechado/cancelado durante o envio: nada a mostrar.
      if (controller.signal.aborted && !estaAberto()) return;

      definirEnviando(false);
      mostrarErroEnvio(mensagemDeErro(erro));
      return;
    }

    // Pedido aceito pela API: daqui em diante nada pode "desfazer" o sucesso.
    envioController = null;
    carrinho.limparCarrinho();
    fechar();
    mostrarAviso("Pedido enviado com sucesso!", "sucesso");

    if (WHATSAPP_CONFIG.abrirAposEnvio) abrirWhatsapp(dados, itens, total);
  }

  form.addEventListener("submit", aoEnviar);

  // ═══════════════════════════════════════════════════════════
  // ESTADO INICIAL
  // ═══════════════════════════════════════════════════════════

  definirModoEntrega(false);
  atualizarContadorObservacoes();

  return { abrir };
}
