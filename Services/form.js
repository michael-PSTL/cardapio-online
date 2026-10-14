document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const form = $("pedido-form");
  const overlay = $("formulario-overlay");

  if (!form || !overlay) {
    console.warn("[form.js] Formulário de pedido não encontrado no HTML.");
    return;
  }

  const enderecoContainer = $("endereco-container");
  const totalValor = $("total-valor");
  const totalBreakdown = $("total-breakdown");
  const btnCancelar = $("btn-cancelar");
  const resumoCarrinhoForm = $("resumo-carrinho-form");
  const inputTelefone = $("input-telefone");
  const inputCep = $("input-cep");
  const inputNumero = $("input-numero");
  const cepStatus = $("status-cep");
  const observacoes = $("observacoes");
  const contadorObservacoes = $("contador-observacoes");
  const grupoRecebimento = form.querySelector('[role="radiogroup"]');
  const erroRecebimento = $("erro-recebimento");

  // 🔧 CONFIGURAÇÃO — número de WhatsApp que recebe os pedidos.
  // Formato: código do país + DDD + número, sem espaços, traços ou "+".
  const NUMERO_WHATSAPP = "5598984975025";

  const CODIGO_PAIS = "+55";
  const LIMITE_OBSERVACOES = 300;
  const TIMEOUT_CEP_MS = 6000;
  const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const ROTULO_RECEBIMENTO = { entrega: "Entrega", buscar: "Retirada no local" };

  const DDDS_VALIDOS = new Set([
    "11", "12", "13", "14", "15", "16", "17", "18", "19",
    "21", "22", "24", "27", "28",
    "31", "32", "33", "34", "35", "37", "38",
    "41", "42", "43", "44", "45", "46", "47", "48", "49",
    "51", "53", "54", "55",
    "61", "62", "63", "64", "65", "66", "67", "68", "69",
    "71", "73", "74", "75", "77", "79",
    "81", "82", "83", "84", "85", "86", "87", "88", "89",
    "91", "92", "93", "94", "95", "96", "97", "98", "99",
  ]);

  let precos = { frete: 0 };
  let ultimoFoco = null;
  let cepRequisicaoId = 0;
  let cepAbortController = null;

  // ═══════════════════════════════════════════════════════════
  // UTILITÁRIOS
  // ═══════════════════════════════════════════════════════════

  function formatarMoeda(valor) {
    const numero = Number(valor);
    return `R$ ${(Number.isFinite(numero) ? numero : 0).toFixed(2).replace(".", ",")}`;
  }

  function escaparHtml(texto) {
    const div = document.createElement("div");
    div.textContent = String(texto ?? "");
    return div.innerHTML;
  }

  function somenteDigitos(valor) {
    return String(valor ?? "").replace(/\D/g, "");
  }

  function normalizarEspacos(valor) {
    return String(valor ?? "").replace(/\s+/g, " ").trim();
  }

  const estaAberto = () => overlay.style.display === "block";

  const entregaSelecionada = () => form.elements.recebimento?.value === "entrega";

  // ═══════════════════════════════════════════════════════════
  // MÁSCARAS (preservam a posição do cursor)
  // ═══════════════════════════════════════════════════════════

  function aplicarMascaraTelefone(digitos) {
    const d = somenteDigitos(digitos).slice(0, 11);

    if (d.length === 0) return "";
    if (d.length <= 2) return `(${d}`;
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;

    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }

  function aplicarMascaraCep(digitos) {
    const d = somenteDigitos(digitos).slice(0, 8);
    return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
  }

  // Posição logo após o N-ésimo dígito do texto formatado.
  function posicaoAposDigitos(formatado, quantidade) {
    if (quantidade <= 0) return Math.max(0, formatado.search(/\d/));

    let contados = 0;
    for (let i = 0; i < formatado.length; i += 1) {
      if (/\d/.test(formatado[i])) {
        contados += 1;
        if (contados === quantidade) return i + 1;
      }
    }
    return formatado.length;
  }

  function aplicarMascaraComCursor(input, formatar, maxDigitos, evento) {
    const cursor = input.selectionStart ?? input.value.length;
    let digitos = somenteDigitos(input.value);
    let antesDoCursor = somenteDigitos(input.value.slice(0, cursor)).length;
    const anteriores = input.dataset.digitos || "";

    // Backspace sobre um caractere da máscara "(", ")", " " ou "-":
    // apaga o dígito anterior em vez de ficar travado.
    if (
      evento?.inputType === "deleteContentBackward" &&
      digitos.length === anteriores.length &&
      antesDoCursor > 0
    ) {
      digitos = digitos.slice(0, antesDoCursor - 1) + digitos.slice(antesDoCursor);
      antesDoCursor -= 1;
    }

    digitos = digitos.slice(0, maxDigitos);
    antesDoCursor = Math.min(antesDoCursor, digitos.length);

    const formatado = formatar(digitos);
    input.value = formatado;
    input.dataset.digitos = digitos;

    if (document.activeElement === input) {
      const posicao = posicaoAposDigitos(formatado, antesDoCursor);
      try {
        input.setSelectionRange(posicao, posicao);
      } catch {
        /* alguns navegadores não permitem selection em certos tipos de input */
      }
    }

    return digitos;
  }

  // ═══════════════════════════════════════════════════════════
  // VALIDAÇÃO
  // ═══════════════════════════════════════════════════════════

  function validarTelefone(valor) {
    const d = somenteDigitos(valor);

    if (!d) return "Informe seu telefone com DDD.";
    if (d.length < 11) return "Telefone incompleto. Use o formato (00) 00000-0000.";
    if (!DDDS_VALIDOS.has(d.slice(0, 2))) return "DDD inválido.";
    if (d[2] !== "9") return "Informe um celular válido (começa com 9 depois do DDD).";

    return "";
  }

  const definicoes = [
    {
      id: "input-nome",
      erroId: "erro-nome",
      validar: (valor) => {
        const nome = normalizarEspacos(valor);
        if (!nome) return "Informe seu nome.";
        if (!/\p{L}{2,}/u.test(nome)) return "Digite um nome válido.";
        return "";
      },
    },
    {
      id: "input-email",
      erroId: "erro-email",
      validar: (valor) => {
        const email = valor.trim();
        if (!email) return "Informe seu e-mail.";
        if (email.length > 120 || !REGEX_EMAIL.test(email)) {
          return "Informe um e-mail válido, como nome@exemplo.com.";
        }
        return "";
      },
    },
    { id: "input-telefone", erroId: "erro-telefone", validar: validarTelefone },
    {
      id: "input-cep",
      erroId: "erro-cep",
      endereco: true,
      validar: (valor) => {
        const d = somenteDigitos(valor);
        if (!d) return "";
        if (d.length !== 8) return "CEP incompleto. Use o formato 00000-000.";
        return "";
      },
    },
    {
      id: "input-cidade",
      erroId: "erro-cidade",
      endereco: true,
      validar: (valor) => (normalizarEspacos(valor).length < 2 ? "Informe a cidade." : ""),
    },
    {
      id: "input-bairro",
      erroId: "erro-bairro",
      endereco: true,
      validar: (valor) => (normalizarEspacos(valor).length < 2 ? "Informe o bairro." : ""),
    },
    {
      id: "input-rua",
      erroId: "erro-rua",
      endereco: true,
      validar: (valor) => (normalizarEspacos(valor).length < 2 ? "Informe a rua." : ""),
    },
    {
      id: "input-numero",
      erroId: "erro-numero",
      endereco: true,
      validar: (valor) => (normalizarEspacos(valor) ? "" : "Informe o número (ou S/N)."),
    },
  ];

  const campos = definicoes
    .map((definicao) => {
      const input = $(definicao.id);
      if (!input) return null;
      return {
        ...definicao,
        input,
        field: input.closest(".field"),
        erroEl: $(definicao.erroId),
      };
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

    campo.field?.classList.toggle(
      "is-valid",
      !mensagem && campo.input.value.trim() !== "",
    );

    return mensagem;
  }

  function validarRecebimento(exibirErro = true) {
    const mensagem = form.elements.recebimento?.value
      ? ""
      : "Escolha entre entrega ou retirada.";

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
    invalidos.sort((a, b) =>
      a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
    );

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
  // CEP (máscara + preenchimento automático via ViaCEP)
  // ═══════════════════════════════════════════════════════════

  function definirStatusCep(mensagem, estado = "") {
    if (!cepStatus) return;

    cepStatus.textContent = mensagem;
    if (estado) cepStatus.dataset.estado = estado;
    else delete cepStatus.dataset.estado;
  }

  function cancelarBuscaCep() {
    cepRequisicaoId += 1;
    cepAbortController?.abort();
    cepAbortController = null;
  }

  function preencherCampoEndereco(id, valor) {
    const input = $(id);
    const campo = campos.find((item) => item.id === id);
    if (!input || !valor) return;

    input.value = valor;
    if (campo) validarCampo(campo, false);
    if (campo?.field?.classList.contains("has-error")) validarCampo(campo);
  }

  async function buscarCep(cep) {
    cancelarBuscaCep();

    const controller = new AbortController();
    cepAbortController = controller;
    const requisicaoId = cepRequisicaoId;
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_CEP_MS);

    definirStatusCep("Buscando endereço…", "carregando");

    try {
      const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
        signal: controller.signal,
      });

      if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);

      const dados = await resposta.json();
      if (requisicaoId !== cepRequisicaoId) return;

      if (!dados || dados.erro) {
        definirStatusCep("CEP não encontrado. Preencha o endereço manualmente.", "aviso");
        return;
      }

      preencherCampoEndereco("input-cidade", dados.localidade);
      preencherCampoEndereco("input-bairro", dados.bairro);
      preencherCampoEndereco("input-rua", dados.logradouro);

      definirStatusCep("Endereço encontrado. Confira e informe o número.", "ok");

      if (document.activeElement === inputCep) inputNumero?.focus();
    } catch (erro) {
      if (requisicaoId !== cepRequisicaoId) return;
      console.warn("[form.js] Falha ao buscar CEP:", erro);
      definirStatusCep("Não foi possível buscar o CEP agora. Preencha manualmente.", "aviso");
    } finally {
      clearTimeout(timeout);
    }
  }

  inputCep?.addEventListener("input", (evento) => {
    const digitos = aplicarMascaraComCursor(inputCep, aplicarMascaraCep, 8, evento);

    if (digitos.length === 8) {
      buscarCep(digitos);
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

  function renderResumoCarrinhoForm() {
    if (!resumoCarrinhoForm || !window.Carrinho) return;

    resumoCarrinhoForm.innerHTML = window.Carrinho.getItens()
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
    if (!window.Carrinho || !totalValor) return;

    const subtotal = window.Carrinho.getSubtotal();
    const total = subtotal + precos.frete;

    totalValor.textContent = formatarMoeda(total);

    const partes = [];
    if (subtotal > 0) partes.push(`Itens: ${formatarMoeda(subtotal)}`);
    if (precos.frete > 0) partes.push(`Frete: ${formatarMoeda(precos.frete)}`);

    if (totalBreakdown) totalBreakdown.textContent = partes.join(" · ");
  }

  // ═══════════════════════════════════════════════════════════
  // RECEBIMENTO (entrega x retirada)
  // ═══════════════════════════════════════════════════════════
  // O valor do frete de cada opção vem do atributo data-frete de
  // cada <input type="radio"> no index.html (ex.: data-frete="8").

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
      precos.frete = Number.parseFloat(radio.dataset.frete) || 0;
      definirModoEntrega(radio.value === "entrega");
      validarRecebimento();
      calcularTotal();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // ABRIR / FECHAR O FORMULÁRIO
  // ═══════════════════════════════════════════════════════════

  function limparEstadoFormulario() {
    form.reset();

    campos.forEach((campo) => {
      mostrarErro(campo, "");
      campo.field?.classList.remove("is-valid");
      delete campo.input.dataset.digitos;
    });

    if (erroRecebimento) erroRecebimento.textContent = "";
    grupoRecebimento?.removeAttribute("aria-invalid");

    precos = { frete: 0 };
    definirModoEntrega(false);
    atualizarContadorObservacoes();
  }

  function abrirFormulario() {
    if (!window.Carrinho || window.Carrinho.getItens().length === 0) return;

    ultimoFoco = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    renderResumoCarrinhoForm();
    calcularTotal();

    overlay.style.display = "block";
    form.scrollTop = 0;
    window.travarScrollPagina?.();

    // Foca o diálogo (e não o primeiro campo) para não abrir o teclado no celular.
    requestAnimationFrame(() => form.focus({ preventScroll: true }));
  }

  function fecharFormulario() {
    overlay.style.display = "none";
    limparEstadoFormulario();

    const carrinhoAberto = document
      .getElementById("carrinho-overlay")
      ?.classList.contains("active");

    if (!carrinhoAberto) window.destravarScrollPagina?.();

    if (ultimoFoco && document.contains(ultimoFoco)) ultimoFoco.focus?.();
    ultimoFoco = null;
  }

  // Exposto para o botão "Finalizar Pedido" do carrinho (Carrinho.js).
  window.abrirFormularioPedido = abrirFormulario;

  btnCancelar?.addEventListener("click", fecharFormulario);

  // Só fecha se o clique começou E terminou no fundo (evita fechar ao
  // arrastar uma seleção de texto para fora do formulário).
  let cliqueComecouNoFundo = false;

  overlay.addEventListener("pointerdown", (evento) => {
    cliqueComecouNoFundo = evento.target === overlay;
  });

  overlay.addEventListener("click", (evento) => {
    if (cliqueComecouNoFundo && evento.target === overlay) fecharFormulario();
    cliqueComecouNoFundo = false;
  });

  // Esc fecha; Tab fica preso dentro do diálogo.
  function elementosFocaveis() {
    return Array.from(
      form.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((elemento) => elemento.getClientRects().length > 0);
  }

  document.addEventListener("keydown", (evento) => {
    if (!estaAberto()) return;

    if (evento.key === "Escape") {
      evento.preventDefault();
      fecharFormulario();
      return;
    }

    if (evento.key !== "Tab") return;

    const focaveis = elementosFocaveis();
    if (focaveis.length === 0) {
      evento.preventDefault();
      form.focus();
      return;
    }

    const primeiro = focaveis[0];
    const ultimo = focaveis[focaveis.length - 1];
    const ativo = document.activeElement;

    if (!form.contains(ativo)) {
      evento.preventDefault();
      primeiro.focus();
    } else if (evento.shiftKey && (ativo === primeiro || ativo === form)) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && ativo === ultimo) {
      evento.preventDefault();
      primeiro.focus();
    }
  });

  // ═══════════════════════════════════════════════════════════
  // ENVIO DO PEDIDO (WhatsApp)
  // ═══════════════════════════════════════════════════════════

  function coletarDados() {
    const entrega = entregaSelecionada();
    const valor = (id) => normalizarEspacos($(id)?.value);

    return {
      nome: valor("input-nome"),
      email: ($("input-email")?.value ?? "").trim().toLowerCase(),
      telefone: aplicarMascaraTelefone(inputTelefone?.value),
      recebimento: form.elements.recebimento?.value ?? "",
      cep: entrega ? aplicarMascaraCep(inputCep?.value) : "",
      cidade: entrega ? valor("input-cidade") : "",
      bairro: entrega ? valor("input-bairro") : "",
      rua: entrega ? valor("input-rua") : "",
      numero: entrega ? valor("input-numero") : "",
      complemento: entrega ? valor("input-complemento") : "",
      observacoes: (observacoes?.value ?? "").trim(),
    };
  }

  form.addEventListener("submit", (evento) => {
    evento.preventDefault();
    if (!window.Carrinho) return;

    const itens = window.Carrinho.getItens();
    if (itens.length === 0) {
      fecharFormulario();
      return;
    }

    if (!validarTudo()) return;

    const dados = coletarDados();
    const subtotal = window.Carrinho.getSubtotal();
    const total = subtotal + precos.frete;

    const itensTexto = itens
      .map(
        (item) =>
          `   ${item.quantidade}x ${item.nome} — ${formatarMoeda(item.preco * item.quantidade)}`,
      )
      .join("\n");

    let enderecoTexto = "";
    if (dados.recebimento === "entrega") {
      enderecoTexto =
        `\n📍 Endereço:\n` +
        `   CEP: ${dados.cep || "Não informado"}\n` +
        `   Cidade: ${dados.cidade}\n` +
        `   Bairro: ${dados.bairro}\n` +
        `   Rua: ${dados.rua}\n` +
        `   Número: ${dados.numero}\n` +
        `   Complemento: ${dados.complemento || "Não informado"}`;
    }

    const mensagem =
      `Olá, gostaria de fazer um pedido!\n\n` +
      `👤 Nome: ${dados.nome}\n` +
      `✉️ E-mail: ${dados.email}\n` +
      `📞 Telefone: ${CODIGO_PAIS} ${dados.telefone}\n\n` +
      `🍱 Itens:\n${itensTexto}\n\n` +
      `📦 Recebimento: ${ROTULO_RECEBIMENTO[dados.recebimento] ?? "Não informado"}` +
      `${enderecoTexto}\n\n` +
      `📝 Observações: ${dados.observacoes || "Nenhuma"}\n` +
      `💰 Total: ${formatarMoeda(total)}`;

    const url = `https://api.whatsapp.com/send?phone=${NUMERO_WHATSAPP}&text=${encodeURIComponent(mensagem)}`;

    const janela = window.open(url, "_blank");
    if (janela) janela.opener = null;

    window.Carrinho.limparCarrinho();
    fecharFormulario();

    // Pop-up bloqueado pelo navegador: abre na mesma aba.
    if (!janela) window.location.assign(url);
  });

  // ═══════════════════════════════════════════════════════════
  // ESTADO INICIAL
  // ═══════════════════════════════════════════════════════════

  definirModoEntrega(false);
  atualizarContadorObservacoes();
});