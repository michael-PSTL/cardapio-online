// Renderiza os cards do cardápio e liga o botão "Adicionar".

import { escaparHtml, formatarMoeda } from "../core/formatadores.js";

function criarCardHTML(item) {
  const id = escaparHtml(item.id);
  const nome = escaparHtml(item.nome);

  return `
    <div class="marmita" data-id="${id}">
      <div class="img-wrapper">
        <img src="${escaparHtml(item.img)}" alt="${nome}" class="IMG-marmita" draggable="false" />
        <div class="img-overlay"></div>
      </div>

      <div class="marmita-content">
        <h4 class="cardapio-nome">${nome}</h4>

        <div class="opcoes-compra">
          <span class="Preco">${formatarMoeda(item.preco)}</span>
          <button class="Comprar" data-id="${id}" type="button" aria-label="Adicionar ${nome} ao carrinho">Adicionar</button>
        </div>
      </div>
    </div>
  `;
}

/**
 * @param {string} containerId
 * @param {Array} dados
 * @param {(id: string) => boolean} aoAdicionar  retorna true se adicionou
 */
export function renderCarrossel(containerId, dados, aoAdicionar) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // .cardapio-track é o elemento que realmente se move (transform).
  // .cardapio-ITENS vira só a "janela" que corta o que passa da borda.
  container.innerHTML = `<div class="cardapio-track">${dados.map(criarCardHTML).join("")}</div>`;

  const timers = new WeakMap();

  container.addEventListener("click", (evento) => {
    const botao = evento.target instanceof Element ? evento.target.closest(".Comprar") : null;
    if (!botao || !container.contains(botao)) return;

    if (!aoAdicionar(botao.dataset.id)) return;

    botao.textContent = "Adicionado";
    botao.classList.add("added");

    clearTimeout(timers.get(botao));
    timers.set(
      botao,
      setTimeout(() => {
        botao.textContent = "Adicionar";
        botao.classList.remove("added");
      }, 1200),
    );
  });
}
