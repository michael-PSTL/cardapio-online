// ═══════════════════════════════════════════════════════════
// API.js — única porta de saída do pedido para o back-end.
//
// Responsabilidades (e só estas):
//   1. Guardar as configurações da integração (blocos abaixo).
//   2. Montar o JSON no formato que a API espera (montarPayload).
//   3. Enviar com POST, com timeout e erros tratados (enviarPedido).
//
// Nada aqui lê o DOM nem conhece o carrinho: quem chama entrega um
// objeto simples (ver "FORMATO DE ENTRADA" mais abaixo).
// ═══════════════════════════════════════════════════════════

import { normalizarEspacos, somenteDigitos } from "./core/formatadores.js";

// ┌─────────────────────────────────────────────────────────┐
// │ 🔧 CONFIGURAÇÃO — LANCHONETE E ENDPOINT                   │
// └─────────────────────────────────────────────────────────┘
export const API_CONFIG = {
  lanchoneteId: "lanchonete-01",
  // URL que recebe o POST do pedido. Pode ser relativa ("/api/pedidos")
  // ou absoluta ("https://api.seudominio.com/pedidos").
  endpoint: "/api/pedidos",
  timeoutMs: 15000,
};

// ┌─────────────────────────────────────────────────────────┐
// │ 🔧 CONFIGURAÇÃO — FORMA DE PAGAMENTO                      │
// │                                                           │
// │ `padrao`  → chave usada no campo "formaPagamento" do JSON.│
// │ `opcoes`  → todas as formas conhecidas. Só as com         │
// │             `ativo: true` podem ser enviadas. Para trocar,│
// │             mude `padrao` para outra chave ativa.         │
// │ As chaves são exatamente o texto enviado ao back-end.     │
// └─────────────────────────────────────────────────────────┘
export const FORMAS_PAGAMENTO = {
  padrao: "CREDITO_MAQUININHA",
  opcoes: {
    CREDITO_MAQUININHA: { rotulo: "Cartão de crédito (maquininha)", ativo: true },
    DEBITO_MAQUININHA: { rotulo: "Cartão de débito (maquininha)", ativo: false },
    PIX: { rotulo: "Pix", ativo: false },
    DINHEIRO: { rotulo: "Dinheiro", ativo: false },
  },
};

// ┌─────────────────────────────────────────────────────────┐
// │ 🔧 CONFIGURAÇÃO — TIPO DE RECEBIMENTO                     │
// │ Chave = valor do <input name="recebimento"> do formulário.│
// │ Valor = texto enviado em "tipoRecebimento".               │
// └─────────────────────────────────────────────────────────┘
export const TIPOS_RECEBIMENTO = {
  entrega: "ENTREGA",
  buscar: "RETIRADA",
};

// ═══════════════════════════════════════════════════════════
// ERROS
// ═══════════════════════════════════════════════════════════

/** Dados do pedido inválidos ANTES de qualquer chamada de rede. */
export class ErroPedido extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.name = "ErroPedido";
  }
}

/** Falha ao falar com o servidor (rede, timeout ou resposta não-2xx). */
export class ErroApi extends Error {
  constructor(mensagem, { status = 0, detalhes = null, causa } = {}) {
    super(mensagem, causa ? { cause: causa } : undefined);
    this.name = "ErroApi";
    this.status = status;
    this.detalhes = detalhes;
  }
}

// ═══════════════════════════════════════════════════════════
// FORMATO DE ENTRADA (o que o front entrega para este módulo)
//
// {
//   nome, email, telefone,            // telefone: com ou sem máscara
//   tipoRecebimento,                  // "entrega" | "buscar"
//   observacao,                       // opcional
//   formaPagamento,                   // opcional; padrão = FORMAS_PAGAMENTO.padrao
//   endereco: { rua, numero, bairro, cidade, complemento, cep },  // só entrega
//   itens: [{ id, quantidade }]       // id = id do produto no cardápio
// }
// ═══════════════════════════════════════════════════════════

function texto(valor) {
  return normalizarEspacos(valor);
}

function exigir(condicao, mensagem) {
  if (!condicao) throw new ErroPedido(mensagem);
}

function resolverFormaPagamento(escolhida) {
  const chave = escolhida ?? FORMAS_PAGAMENTO.padrao;
  const opcao = FORMAS_PAGAMENTO.opcoes[chave];

  exigir(
    opcao?.ativo === true,
    `Forma de pagamento "${chave}" não está ativa. Ajuste FORMAS_PAGAMENTO em API.js.`,
  );

  return chave;
}

function resolverTipoRecebimento(tipo) {
  const tipoApi = TIPOS_RECEBIMENTO[tipo];
  exigir(Boolean(tipoApi), "Escolha entre entrega ou retirada.");
  return tipoApi;
}

function montarEndereco(endereco) {
  const origem = endereco ?? {};
  const resultado = {
    rua: texto(origem.rua),
    numero: texto(origem.numero),
    bairro: texto(origem.bairro),
    cidade: texto(origem.cidade),
    complemento: texto(origem.complemento),
    cep: somenteDigitos(origem.cep),
  };

  exigir(resultado.rua, "Informe a rua.");
  exigir(resultado.numero, "Informe o número do endereço.");
  exigir(resultado.bairro, "Informe o bairro.");
  exigir(resultado.cidade, "Informe a cidade.");
  exigir(resultado.cep.length === 8, "Informe um CEP válido com 8 dígitos.");

  return resultado;
}

function montarItens(itens) {
  exigir(Array.isArray(itens) && itens.length > 0, "O pedido precisa ter ao menos um item.");

  return itens.map((item) => {
    const produtoId = texto(item?.id);
    const quantidade = Number(item?.quantidade);

    exigir(produtoId, "Item do pedido sem identificador de produto.");
    exigir(
      Number.isInteger(quantidade) && quantidade > 0,
      `Quantidade inválida para o produto "${produtoId}".`,
    );

    return { produtoId, quantidade };
  });
}

/**
 * Converte o pedido do front no JSON da API.
 * Lança ErroPedido se algo obrigatório estiver faltando.
 */
export function montarPayload(pedido) {
  exigir(pedido && typeof pedido === "object", "Pedido inválido.");
  exigir(texto(API_CONFIG.lanchoneteId), "lanchoneteId não configurado em API_CONFIG.");

  const nomeCliente = texto(pedido.nome);
  const emailCliente = String(pedido.email ?? "").trim().toLowerCase();
  const telefoneCliente = somenteDigitos(pedido.telefone);
  const entrega = pedido.tipoRecebimento === "entrega";

  exigir(nomeCliente, "Informe o nome do cliente.");
  exigir(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailCliente), "Informe um e-mail válido.");
  exigir(
    telefoneCliente.length === 10 || telefoneCliente.length === 11,
    "Informe um telefone válido com DDD.",
  );

  return {
    lanchoneteId: texto(API_CONFIG.lanchoneteId),
    nomeCliente,
    telefoneCliente,
    emailCliente,
    formaPagamento: resolverFormaPagamento(pedido.formaPagamento),
    tipoRecebimento: resolverTipoRecebimento(pedido.tipoRecebimento),
    observacao: String(pedido.observacao ?? "").trim(),
    endereco: entrega ? montarEndereco(pedido.endereco) : null,
    itens: montarItens(pedido.itens),
  };
}

// ═══════════════════════════════════════════════════════════
// ENVIO
// ═══════════════════════════════════════════════════════════

function lerCorpoSeguro(resposta) {
  return resposta.text().then(
    (corpo) => {
      if (!corpo) return null;
      try {
        return JSON.parse(corpo);
      } catch {
        return corpo;
      }
    },
    () => null,
  );
}

function mensagemDoServidor(corpo) {
  if (!corpo) return "";
  if (typeof corpo === "string") return corpo.slice(0, 200);
  const candidata = corpo.mensagem ?? corpo.message ?? corpo.erro ?? corpo.error;
  return typeof candidata === "string" ? candidata.slice(0, 200) : "";
}

/**
 * Envia o pedido (POST JSON).
 * Retorna { status, dados } em sucesso; lança ErroPedido ou ErroApi.
 * `signal` (opcional) permite cancelar de fora.
 */
export async function enviarPedido(pedido, { signal } = {}) {
  const payload = montarPayload(pedido);

  const endpoint = texto(API_CONFIG.endpoint);
  if (!endpoint) {
    throw new ErroApi("Endpoint da API não configurado em API_CONFIG.endpoint.");
  }

  const controller = new AbortController();
  let expirou = false;

  const aoCancelarDeFora = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener("abort", aoCancelarDeFora, { once: true });

  const timer = setTimeout(() => {
    expirou = true;
    controller.abort();
  }, API_CONFIG.timeoutMs);

  try {
    const resposta = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const corpo = await lerCorpoSeguro(resposta);

    if (!resposta.ok) {
      const detalhe = mensagemDoServidor(corpo);
      throw new ErroApi(
        detalhe || `O servidor recusou o pedido (erro ${resposta.status}). Tente novamente.`,
        { status: resposta.status, detalhes: corpo },
      );
    }

    return { status: resposta.status, dados: corpo };
  } catch (erro) {
    if (erro instanceof ErroApi) throw erro;

    if (erro?.name === "AbortError") {
      throw new ErroApi(
        expirou
          ? "O servidor demorou demais para responder. Tente novamente."
          : "Envio do pedido cancelado.",
        { causa: erro },
      );
    }

    throw new ErroApi("Não foi possível conectar ao servidor. Verifique sua internet e tente de novo.", {
      causa: erro,
    });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", aoCancelarDeFora);
  }
}
