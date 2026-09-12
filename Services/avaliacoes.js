document.addEventListener("DOMContentLoaded", () => {
  // ─── DADOS DAS AVALIAÇÕES ────────────────────────────────────

  const avaliacoesData = [
    {
      nome: "Marcos Almeida",
      estrelas: 5,
      data: "Há 2 dias",
      comentario:
        "Comida excelente, chega bem quentinha e no horário. O cozidão é maravilhoso!",
    },
    {
      nome: "Juliana Ferreira",
      estrelas: 5,
      data: "Há 1 semana",
      comentario:
        "Melhor marmita da região, sabor caseiro de verdade. Já virou rotina aqui em casa.",
    },
    {
      nome: "Pedro Costa",
      estrelas: 4,
      data: "Há 2 semanas",
      comentario:
        "Muito bom, só acho que a porção de arroz podia ser um pouco maior. De resto, nota 10.",
    },
    {
      nome: "Ana Beatriz",
      estrelas: 5,
      data: "Há 3 semanas",
      comentario:
        "Atendimento rápido pelo WhatsApp e entrega no prazo certinho. Recomendo demais!",
    },
    {
      nome: "Rafael Souza",
      estrelas: 5,
      data: "Há 1 mês",
      comentario:
        "O frango assado é surreal, tempero na medida certa. Virei cliente fiel.",
    },
    {
      nome: "Camila Rocha",
      estrelas: 4,
      data: "Há 1 mês",
      comentario:
        "Peixe frito muito saboroso e crocante. Só peço para chegar um pouco mais rápido.",
    },
  ];

  // ─── RENDERIZAÇÃO ────────────────────────────────────────────

  function svgEstrela(preenchida) {
    return `
      <svg
        viewBox="0 0 20 20"
        fill="${preenchida ? "currentColor" : "none"}"
        stroke="currentColor"
        stroke-width="1.5"
        class="${preenchida ? "" : "vazia"}"
      >
        <path d="M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.2-5.4 3.2 1.3-6L1.3 7.7l6.1-.6L10 1.5z" />
      </svg>
    `;
  }

  function renderAvaliacoes() {
    const container = document.getElementById("avaliacoes-itens");
    const resumo = document.getElementById("avaliacoes-resumo");

    if (!container || !resumo) return;

    const total = avaliacoesData.length;
    const media =
      avaliacoesData.reduce((acc, avaliacao) => acc + avaliacao.estrelas, 0) / total;

    resumo.innerHTML = `
      <span class="avaliacoes-media">${media.toFixed(1)}</span>

      <div class="avaliacoes-estrelas-media">
        ${[1, 2, 3, 4, 5].map((n) => svgEstrela(n <= Math.round(media))).join("")}
      </div>

      <span class="avaliacoes-contagem">baseado em ${total} avaliações</span>
    `;

    container.innerHTML = avaliacoesData
      .map(
        (avaliacao) => `
          <div class="depoimento">
            <div class="depoimento-estrelas">
              ${[1, 2, 3, 4, 5].map((n) => svgEstrela(n <= avaliacao.estrelas)).join("")}
            </div>

            <p class="depoimento-texto">"${avaliacao.comentario}"</p>

            <div class="depoimento-rodape">
              <div class="depoimento-autor">
                <div class="depoimento-avatar">${avaliacao.nome.charAt(0)}</div>
                <span class="depoimento-nome">${avaliacao.nome}</span>
              </div>

              <span class="depoimento-data">${avaliacao.data}</span>
            </div>
          </div>
        `,
      )
      .join("");
  }

  renderAvaliacoes();
});