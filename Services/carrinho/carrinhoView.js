// Interface do carrinho: badge, drawer e botão flutuante (FAB).
// Só lê do store e dispara ações nele; não guarda estado de negócio.

import { escaparHtml, formatarMoeda } from "../core/formatadores.js";
import { travarScroll, destravarScroll } from "../core/scroll.js";
import * as store from "./carrinhoStore.js";

const DONO_SCROLL = "carrinho";

function reiniciarAnimacao(elemento, classe) {
  elemento.classList.remove(classe);
  void elemento.offsetWidth; // força reflow para reiniciar a animação CSS
  elemento.classList.add(classe);
}

/**
 * @param {{ aoFinalizar: () => void }} opcoes
 * `aoFinalizar` é chamado quando o cliente quer ir para o formulário.
 */
export function iniciarCarrinhoView({ aoFinalizar }) {
  const $ = (id) => document.getElementById(id);

  const cartBtn = $("cart-btn");
  const cartBadge = $("cart-badge");
  const overlay = $("carrinho-overlay");
  const botaoFechar = $("carrinho-fechar");
  const lista = $("carrinho-lista");
  const vazio = $("carrinho-vazio");
  const subtotalEl = $("carrinho-subtotal");
  const btnFinalizar = $("carrinho-finalizar");
  const fab = $("fab-finalizar");
  const fabResumo = $("fab-resumo");

  if (![cartBtn, cartBadge, overlay, botaoFechar, lista, vazio, subtotalEl, btnFinalizar].every(Boolean)) {
    console.warn("[carrinhoView] Elementos do carrinho não encontrados no HTML.");
    return;
  }

  let totalAnterior = store.getTotalItens();

  const estaAberto = () => overlay.classList.contains("active");

  function abrir() {
    overlay.classList.add("active");
    travarScroll(DONO_SCROLL);
    botaoFechar.focus({ preventScroll: true });
  }

  function fechar({ devolverFoco = true } = {}) {
    overlay.classList.remove("active");
    destravarScroll(DONO_SCROLL);
    if (devolverFoco) cartBtn.focus({ preventScroll: true });
  }

  function finalizar() {
    if (store.getTotalItens() === 0) return;
    if (estaAberto()) fechar({ devolverFoco: false });
    aoFinalizar();
  }

  function renderItem(item) {
    const id = escaparHtml(item.id);
    const nome = escaparHtml(item.nome);

    return `
      <div class="carrinho-item" data-id="${id}">
        <img src="${escaparHtml(item.img)}" alt="${nome}" class="carrinho-item-img" />
        <div class="carrinho-item-info">
          <div class="carrinho-item-nome">${nome}</div>
          <div class="carrinho-item-preco">${formatarMoeda(item.preco * item.quantidade)}</div>
          <div class="carrinho-item-qtd">
            <button type="button" class="qtd-btn" data-action="menos" data-id="${id}" aria-label="Diminuir quantidade de ${nome}">-</button>
            <span aria-live="polite">${item.quantidade}</span>
            <button type="button" class="qtd-btn" data-action="mais" data-id="${id}" aria-label="Aumentar quantidade de ${nome}">+</button>
          </div>
        </div>
        <button type="button" class="carrinho-item-remover" data-id="${id}" aria-label="Remover ${nome}">&times;</button>
      </div>
    `;
  }

  function renderFab(totalItens, subtotal) {
    if (!fab) return;

    fab.classList.toggle("visible", totalItens > 0);
    document.body.classList.toggle("com-fab", totalItens > 0);

    if (fabResumo) {
      const rotulo = totalItens === 1 ? "item" : "itens";
      fabResumo.textContent = `${totalItens} ${rotulo} · ${formatarMoeda(subtotal)}`;
    }
  }

  function render() {
    const itens = store.getItens();
    const totalItens = store.getTotalItens();
    const subtotal = store.getSubtotal();
    const temItens = itens.length > 0;

    cartBadge.textContent = String(totalItens);
    cartBadge.classList.toggle("visible", totalItens > 0);
    if (totalItens > totalAnterior) {
      reiniciarAnimacao(cartBadge, "visible");
      if (fab) reiniciarAnimacao(fab, "pulsar");
    }
    totalAnterior = totalItens;

    vazio.classList.toggle("visible", !temItens);
    lista.style.display = temItens ? "flex" : "none";
    lista.innerHTML = itens.map(renderItem).join("");

    subtotalEl.textContent = formatarMoeda(subtotal);
    renderFab(totalItens, subtotal);

    // Carrinho esvaziado com o drawer aberto: nada a finalizar.
    btnFinalizar.disabled = !temItens;
  }

  // Delegação: um único listener cobre todos os botões (re)renderizados.
  lista.addEventListener("click", (evento) => {
    const botao = evento.target instanceof Element ? evento.target.closest("button[data-id]") : null;
    if (!botao || !lista.contains(botao)) return;

    const { id, action } = botao.dataset;

    if (botao.classList.contains("carrinho-item-remover")) store.removerItem(id);
    else if (action === "mais") store.alterarQuantidade(id, 1);
    else if (action === "menos") store.alterarQuantidade(id, -1);
  });

  cartBtn.addEventListener("click", abrir);
  botaoFechar.addEventListener("click", () => fechar());
  overlay.addEventListener("click", (evento) => {
    if (evento.target === overlay) fechar();
  });
  btnFinalizar.addEventListener("click", finalizar);
  fab?.addEventListener("click", finalizar);

  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && estaAberto()) fechar();
  });

  store.inscrever(render);
  render();
}
