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

import { latitudeValida, longitudeValida } from "./core/coordenadas.js";
import { normalizarEspacos, somenteDigitos } from "./core/formatadores.js";

// ┌─────────────────────────────────────────────────────────┐
// │ 🔧 CONFIGURAÇÃO — LANCHONETE E ENDPOINT                   │
// └─────────────────────────────────────────────────────────┘
export const API_CONFIG = {
  lanchoneteId: "tempero-caseiro-9nHk-0nud-01kn",
  // URL que recebe o POST do pedido. Pode ser relativa ("/pedido")
  // ou absoluta ("https://api.seudominio.com/pedido").
  endpoint: "/pedido",
  timeoutMs: 15000,
  // DDI enviado antes do telefone (o formulário já guarda só DDD + número).
  codigoPais: "55",
  // false → latitude/longitude são opcionais (vão como null se o cliente não
  //         usar a localização atual).
  // true  → entrega exige a localização (o formulário bloqueia sem ela).
  coordenadasObrigatorias: false,
};

// ┌─────────────────────────────────────────────────────────┐
// │ 🔧 CONFIGURAÇÃO — FORMA DE PAGAMENTO                      │
// │                                                           │
// │ As chaves são EXATAMENTE os valores do enum FormaPagamento│
// │ do back-end (com.api.clientPayment.enums). O texto da     │
// │ chave é o que vai no campo "formaPagamento" do JSON.      │
// │                                                           │
// │ `rotulo` → texto mostrado ao cliente.                     │
// │ `ativo`  → false esconde a opção do formulário e impede   │
// │            o envio (útil para desligar um meio de pagar). │
// └─────────────────────────────────────────────────────────┘
export const FORMAS_PAGAMENTO = {
  opcoes: {
    DINHEIRO: { rotulo: "Dinheiro", ativo: true },
    PIX_ONLINE: { rotulo: "Pix online", ativo: true },
    PIX_PRESENCIAL: { rotulo: "Pix presencial", ativo: true },
    CREDITO_ONLINE: { rotulo: "Crédito online", ativo: true },
    CREDITO_PRESENCIAL: { rotulo: "Crédito presencial", ativo: true },
    DEBITO_ONLINE: { rotulo: "Débito online", ativo: true },
    DEBITO_PRESENCIAL: { rotulo: "Débito presencial", ativo: true },
  },
};

/** true se a chave existe no enum e está ativa. */
export function formaPagamentoAtiva(chave) {
  return (
    Object.hasOwn(FORMAS_PAGAMENTO.opcoes, chave) &&
    FORMAS_PAGAMENTO.opcoes[chave].ativo === true
  );
}

/** Texto para o cliente ("Pix online"); devolve a própria chave se desconhecida. */
export function rotuloFormaPagamento(chave) {
  return Object.hasOwn(FORMAS_PAGAMENTO.opcoes, chave)
    ? FORMAS_PAGAMENTO.opcoes[chave].rotulo
    : String(chave ?? "");
}

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
//   formaPagamento,                   // obrigatório; chave de FORMAS_PAGAMENTO
//   endereco: { rua, numero, bairro, cidade, complemento, cep,
//               latitude, longitude },  // só entrega; lat/lng opcionais (ver API_CONFIG)
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
  const chave = texto(escolhida);

  exigir(chave, "Escolha a forma de pagamento.");
  exigir(
    formaPagamentoAtiva(chave),
    `Forma de pagamento "${chave}" não está disponível. Escolha outra.`,
  );

  return chave;
}

function resolverTipoRecebimento(tipo) {
  const tipoApi = TIPOS_RECEBIMENTO[tipo];
  exigir(Boolean(tipoApi), "Escolha entre entrega ou retirada.");
  return tipoApi;
}

function semValor(valor) {
  return valor === null || valor === undefined || valor === "";
}

/** Latitude e longitude andam juntas: ou as duas válidas, ou as duas null. */
function resolverCoordenadas(origem) {
  const semLatitude = semValor(origem.latitude);
  const semLongitude = semValor(origem.longitude);

  if (semLatitude && semLongitude) {
    exigir(
      !API_CONFIG.coordenadasObrigatorias,
      "Use sua localização atual para informar latitude e longitude.",
    );
    return { latitude: null, longitude: null };
  }

  exigir(
    !semLatitude && !semLongitude,
    "Localização incompleta: informe latitude e longitude.",
  );

  const latitude = Number(origem.latitude);
  const longitude = Number(origem.longitude);

  exigir(latitudeValida(latitude), "Latitude inválida.");
  exigir(longitudeValida(longitude), "Longitude inválida.");

  return { latitude, longitude };
}

function montarEndereco(endereco) {
  const origem = endereco ?? {};
  const resultado = {
    cidade: texto(origem.cidade),
    bairro: texto(origem.bairro),
    rua: texto(origem.rua),
    numero: texto(origem.numero),
    complemento: texto(origem.complemento),
    cep: somenteDigitos(origem.cep),
    ...resolverCoordenadas(origem),
  };

  exigir(resultado.rua, "Informe a rua.");
  exigir(resultado.numero, "Informe o número do endereço.");
  exigir(resultado.bairro, "Informe o bairro.");
  exigir(resultado.cidade, "Informe a cidade.");
  exigir(resultado.cep.length === 8, "Informe um CEP válido com 8 dígitos.");

  return resultado;
}

function montarItens(itens) {
  exigir(
    Array.isArray(itens) && itens.length > 0,
    "O pedido precisa ter ao menos um item.",
  );

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
  exigir(
    texto(API_CONFIG.lanchoneteId),
    "lanchoneteId não configurado em API_CONFIG.",
  );

  const nomeCliente = texto(pedido.nome);
  const emailCliente = String(pedido.email ?? "")
    .trim()
    .toLowerCase();
  const telefoneCliente = somenteDigitos(pedido.telefone);
  const entrega = pedido.tipoRecebimento === "entrega";

  exigir(nomeCliente, "Informe o nome do cliente.");
  exigir(
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailCliente),
    "Informe um e-mail válido.",
  );
  exigir(
    telefoneCliente.length === 10 || telefoneCliente.length === 11,
    "Informe um telefone válido com DDD.",
  );

  return {
    lanchoneteId: texto(API_CONFIG.lanchoneteId),
    nomeCliente,
    telefoneCliente: `${somenteDigitos(API_CONFIG.codigoPais)}${telefoneCliente}`,
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
  const candidata =
    corpo.mensagem ?? corpo.message ?? corpo.erro ?? corpo.error;
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
    throw new ErroApi(
      "Endpoint da API não configurado em API_CONFIG.endpoint.",
    );
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
    const resposta = await fetch(`http://localhost:8080${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const corpo = await lerCorpoSeguro(resposta);

    if (!resposta.ok) {
      const detalhe = mensagemDoServidor(corpo);
      throw new ErroApi(
        detalhe ||
          `O servidor recusou o pedido (erro ${resposta.status}). Tente novamente.`,
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

    throw new ErroApi(
      "Não foi possível conectar ao servidor. Verifique sua internet e tente de novo.",
      {
        causa: erro,
      },
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", aoCancelarDeFora);
  }
}
