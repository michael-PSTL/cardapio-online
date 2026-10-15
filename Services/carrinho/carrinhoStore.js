// Estado do carrinho: itens, persistência (localStorage) e notificação.
// Não toca no DOM. A interface se inscreve com `inscrever`.

import { paraCentavos } from "../core/formatadores.js";
import { obterProdutoPorId } from "../cardapio/dadosCardapio.js";

// 🔧 CONFIGURAÇÃO — chave do localStorage e limite por item.
const STORAGE_KEY = "restaurante_carrinho";
const QUANTIDADE_MAXIMA = 99;

let itens = carregar();
const ouvintes = new Set();

// ─── PERSISTÊNCIA ────────────────────────────────────────────

// Só `id` e `quantidade` são confiáveis: nome/preço/imagem são sempre
// reidratados a partir do cardápio atual (preço antigo salvo não vale).
function carregar() {
  try {
    const salvo = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(salvo)) return [];

    const porId = new Map();
    salvo.forEach((registro) => {
      const produto = obterProdutoPorId(registro?.id);
      const quantidade = Math.min(Math.trunc(Number(registro?.quantidade)), QUANTIDADE_MAXIMA);
      if (!produto || !Number.isFinite(quantidade) || quantidade <= 0) return;

      const atual = porId.get(produto.id)?.quantidade ?? 0;
      porId.set(produto.id, {
        ...produto,
        quantidade: Math.min(atual + quantidade, QUANTIDADE_MAXIMA),
      });
    });

    return [...porId.values()];
  } catch {
    return [];
  }
}

function salvar() {
  try {
    const enxuto = itens.map(({ id, quantidade }) => ({ id, quantidade }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(enxuto));
  } catch {
    // localStorage indisponível: o carrinho segue funcionando só na sessão atual.
  }
}

function notificar() {
  salvar();
  ouvintes.forEach((ouvinte) => {
    try {
      ouvinte();
    } catch (erro) {
      console.error("[carrinho] erro em ouvinte:", erro);
    }
  });
}

// ─── LEITURA ─────────────────────────────────────────────────

export function getItens() {
  return itens.map((item) => ({ ...item }));
}

export function getTotalItens() {
  return itens.reduce((total, item) => total + item.quantidade, 0);
}

export function getSubtotal() {
  const centavos = itens.reduce((total, item) => total + paraCentavos(item.preco) * item.quantidade, 0);
  return centavos / 100;
}

// ─── AÇÕES ───────────────────────────────────────────────────

/** Adiciona 1 unidade do produto. Retorna false se o id não existe no cardápio. */
export function adicionarItem(id) {
  const produto = obterProdutoPorId(id);
  if (!produto) return false;

  const existente = itens.find((item) => item.id === produto.id);
  if (existente) {
    if (existente.quantidade >= QUANTIDADE_MAXIMA) return false;
    existente.quantidade += 1;
  } else {
    itens.push({ ...produto, quantidade: 1 });
  }

  notificar();
  return true;
}

export function alterarQuantidade(id, delta) {
  const item = itens.find((registro) => registro.id === String(id));
  if (!item || !Number.isFinite(delta)) return;

  item.quantidade = Math.min(item.quantidade + delta, QUANTIDADE_MAXIMA);
  if (item.quantidade <= 0) itens = itens.filter((registro) => registro !== item);

  notificar();
}

export function removerItem(id) {
  const antes = itens.length;
  itens = itens.filter((item) => item.id !== String(id));
  if (itens.length !== antes) notificar();
}

export function limparCarrinho() {
  if (itens.length === 0) return;
  itens = [];
  notificar();
}

/** Registra um ouvinte chamado a cada mudança. Retorna a função de cancelar. */
export function inscrever(ouvinte) {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
}
