// Renderiza o resumo (média) e os cards de depoimentos.

import { escaparHtml } from "../core/formatadores.js";
import { avaliacoesData } from "./dadosAvaliacoes.js";

function svgEstrela(preenchida) {
  return `
    <svg
      viewBox="0 0 20 20"
      fill="${preenchida ? "currentColor" : "none"}"
      stroke="currentColor"
      stroke-width="1.5"
      class="${preenchida ? "" : "vazia"}"
      aria-hidden="true"
    >
      <path d="M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.2-5.4 3.2 1.3-6L1.3 7.7l6.1-.6L10 1.5z" />
    </svg>
  `;
}

function estrelas(quantidade) {
  return [1, 2, 3, 4, 5].map((n) => svgEstrela(n <= quantidade)).join("");
}

export function iniciarAvaliacoes() {
  const container = document.getElementById("avaliacoes-itens");
  const resumo = document.getElementById("avaliacoes-resumo");

  if (!container || !resumo) return;

  const total = avaliacoesData.length;
  if (total === 0) {
    resumo.innerHTML = "";
    container.innerHTML = "";
    return;
  }

  const media = avaliacoesData.reduce((soma, avaliacao) => soma + avaliacao.estrelas, 0) / total;

  resumo.innerHTML = `
    <span class="avaliacoes-media">${media.toFixed(1)}</span>
    <div class="avaliacoes-estrelas-media" role="img" aria-label="Nota média ${media.toFixed(1)} de 5">
      ${estrelas(Math.round(media))}
    </div>
    <span class="avaliacoes-contagem">baseado em ${total} ${total === 1 ? "avaliação" : "avaliações"}</span>
  `;

  container.innerHTML = avaliacoesData
    .map((avaliacao) => {
      const nome = escaparHtml(avaliacao.nome);

      return `
        <div class="depoimento">
          <div class="depoimento-estrelas" role="img" aria-label="${avaliacao.estrelas} de 5 estrelas">
            ${estrelas(avaliacao.estrelas)}
          </div>

          <p class="depoimento-texto">"${escaparHtml(avaliacao.comentario)}"</p>

          <div class="depoimento-rodape">
            <div class="depoimento-autor">
              <div class="depoimento-avatar">${escaparHtml(avaliacao.nome.charAt(0))}</div>
              <span class="depoimento-nome">${nome}</span>
            </div>

            <span class="depoimento-data">${escaparHtml(avaliacao.data)}</span>
          </div>
        </div>
      `;
    })
    .join("");
}
