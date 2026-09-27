document.addEventListener("DOMContentLoaded", () => {
  // ─── ANO NO RODAPÉ ───────────────────────────────────────────

  const anoAtual = document.getElementById("ano-atual");
  if (anoAtual) anoAtual.textContent = new Date().getFullYear();

  // ─── MENU HAMBÚRGUER (mobile) ────────────────────────────────

  const hamburger = document.getElementById("hamburger");
  const nav2 = document.getElementById("nav2");

  hamburger?.addEventListener("click", () => nav2?.classList.toggle("active"));

  document.querySelectorAll("#nav2 a").forEach((link) => {
    link.addEventListener("click", () => nav2?.classList.remove("active"));
  });

  // ─── TRAVAR / DESTRAVAR SCROLL DA PÁGINA ─────────────────────
  // Usado pelo carrinho (Carrinho.js) e pelo formulário (form.js)
  // ao abrir/fechar seus overlays.

  window.travarScrollPagina = () => document.body.classList.add("scroll-travado");
  window.destravarScrollPagina = () => document.body.classList.remove("scroll-travado");

  // ═══════════════════════════════════════════════════════════
  //  SEÇÃO LOCALIZAÇÃO
  // ═══════════════════════════════════════════════════════════

  // ┌─────────────────────────────────────────────────────────┐
  // │ 🔧 CONFIGURAÇÃO — EDITE AQUI O HORÁRIO DE FUNCIONAMENTO   │
  // │                                                           │
  // │ Esta é a ÚNICA fonte do horário do site: o mesmo dado é   │
  // │ usado tanto no painel de "Localização" quanto no rodapé   │
  // │ (seção "Contato"). Não é preciso editar o HTML.           │
  // │                                                           │
  // │ Índice do dia da semana: 0 = domingo ... 6 = sábado.      │
  // │ Use `null` para marcar o dia como fechado.                │
  // │ Horários em minutos: 11 * 60 = 11h00, 15 * 60 = 15h00.    │
  // └─────────────────────────────────────────────────────────┘
  const HORARIOS_SEMANA = {
    0: null,
    1: { abre: 11 * 60, fecha: 15 * 60 },
    2: { abre: 11 * 60, fecha: 15 * 60 },
    3: { abre: 11 * 60, fecha: 15 * 60 },
    4: { abre: 11 * 60, fecha: 15 * 60 },
    5: { abre: 11 * 60, fecha: 15 * 60 },
    6: { abre: 11 * 60, fecha: 16 * 60 },
  };

  // ┌─────────────────────────────────────────────────────────┐
  // │ 🔧 CONFIGURAÇÃO — COMO OS DIAS SÃO AGRUPADOS NA LISTA     │
  // │                                                           │
  // │ Controla só a EXIBIÇÃO (rótulo + quais dias entram em     │
  // │ cada linha da lista). O horário em si vem de              │
  // │ HORARIOS_SEMANA acima — aqui é só o "rótulo".              │
  // │ Ex.: se abrir também no domingo, adicione um grupo novo.  │
  // └─────────────────────────────────────────────────────────┘
  const GRUPOS_EXIBICAO_HORARIO = [
    { rotulo: "Seg – Sex", dias: [1, 2, 3, 4, 5] },
    { rotulo: "Sábado", dias: [6] },
    { rotulo: "Domingo", dias: [0] },
  ];

  const DIAS = [
    "domingo",
    "segunda",
    "terça",
    "quarta",
    "quinta",
    "sexta",
    "sábado",
  ];

  const selo = document.getElementById("local-status");
  const seloTexto = document.getElementById("local-status-texto");
  const horariosLista = document.getElementById("local-horarios-lista");
  const horariosListaFooter = document.getElementById("footer-horarios-lista");

  // ─── FORMATAÇÃO ──────────────────────────────────────────────

  // 660 → "11h" | 930 → "15h30"
  function formatarHora(minutos) {
    const hora = Math.floor(minutos / 60);
    const min = minutos % 60;
    return min === 0 ? `${hora}h` : `${hora}h${String(min).padStart(2, "0")}`;
  }

  // Texto de exibição de um dia específico ("11h – 15h" ou "Fechado").
  function textoHorarioDoDia(dia) {
    const faixa = HORARIOS_SEMANA[dia];
    return faixa ? `${formatarHora(faixa.abre)} – ${formatarHora(faixa.fecha)}` : "Fechado";
  }

  function proximaAbertura(diaAtual) {
    for (let i = 1; i <= 7; i++) {
      const dia = (diaAtual + i) % 7;
      const faixa = HORARIOS_SEMANA[dia];
      if (!faixa) continue;

      const rotulo = i === 1 ? "amanhã" : DIAS[dia];
      return `abre ${rotulo} às ${formatarHora(faixa.abre)}`;
    }
    return "consulte os horários";
  }

  // ─── RENDERIZAÇÃO DA LISTA DE HORÁRIOS (painel + rodapé) ─────
  // Gera o mesmo HTML para as duas listas a partir da configuração
  // acima, garantindo que painel e rodapé nunca fiquem dessincronizados.

  function renderListasHorario() {
    const linhasHtml = GRUPOS_EXIBICAO_HORARIO.map((grupo) => {
      const texto = textoHorarioDoDia(grupo.dias[0]);
      return `<li data-dias="${grupo.dias.join(",")}"><span>${grupo.rotulo}</span><span>${texto}</span></li>`;
    }).join("");

    if (horariosLista) horariosLista.innerHTML = linhasHtml;
    if (horariosListaFooter) horariosListaFooter.innerHTML = linhasHtml;
  }

  // ─── SELO "ABERTO / FECHADO" EM TEMPO REAL ───────────────────

  function destacarDiaAtual(dia) {
    if (!horariosLista) return;

    horariosLista.querySelectorAll("li").forEach((linha) => {
      const dias = (linha.dataset.dias || "")
        .split(",")
        .map((valor) => Number(valor.trim()));

      linha.classList.toggle("hoje", dias.includes(dia));
    });
  }

  function atualizarStatusLocal() {
    if (!selo || !seloTexto) return;

    const agora = new Date();
    const dia = agora.getDay();
    const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
    const faixa = HORARIOS_SEMANA[dia];

    destacarDiaAtual(dia);
    selo.classList.remove("aberto", "fechado");

    if (faixa && minutosAgora >= faixa.abre && minutosAgora < faixa.fecha) {
      selo.classList.add("aberto");
      seloTexto.textContent = `Aberto agora · fecha às ${formatarHora(faixa.fecha)}`;
      return;
    }

    selo.classList.add("fechado");

    if (faixa && minutosAgora < faixa.abre) {
      seloTexto.textContent = `Fechado · abre hoje às ${formatarHora(faixa.abre)}`;
      return;
    }

    seloTexto.textContent = `Fechado · ${proximaAbertura(dia)}`;
  }

  // ─── INICIALIZAÇÃO DA SEÇÃO LOCALIZAÇÃO ──────────────────────

  if (horariosLista || horariosListaFooter) {
    renderListasHorario();
  }

  if (selo) {
    atualizarStatusLocal();
    setInterval(atualizarStatusLocal, 60000); // revalida a cada minuto
  }

  // ─── COPIAR ENDEREÇO ─────────────────────────────────────────

  const btnCopiar = document.getElementById("btn-copiar-endereco");
  const btnCopiarTexto = document.getElementById("btn-copiar-texto");

  // 🔧 CONFIGURAÇÃO — endereço copiado para a área de transferência.
  const ENDERECO =
    "Rua 20, nº 1 — Quadra 4, Parque Vitória, São José de Ribamar — MA";

  function copiarFallback(texto) {
    const campo = document.createElement("textarea");
    campo.value = texto;
    campo.setAttribute("readonly", "");
    campo.style.position = "fixed";
    campo.style.top = "-9999px";
    campo.style.opacity = "0";

    document.body.appendChild(campo);
    campo.select();

    let sucesso = false;
    try {
      sucesso = document.execCommand("copy");
    } catch {
      sucesso = false;
    }

    document.body.removeChild(campo);
    return sucesso;
  }

  let timerCopia = null;

  function feedbackCopia(mensagem, ok) {
    if (!btnCopiar) return;

    btnCopiar.classList.toggle("copiado", ok);
    if (btnCopiarTexto) btnCopiarTexto.textContent = mensagem;

    clearTimeout(timerCopia);
    timerCopia = setTimeout(() => {
      btnCopiar.classList.remove("copiado");
      if (btnCopiarTexto) btnCopiarTexto.textContent = "Copiar endereço";
    }, 1800);
  }

  btnCopiar?.addEventListener("click", async () => {
    try {
      if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(ENDERECO);
        feedbackCopia("Endereço copiado!", true);
        return;
      }

      const ok = copiarFallback(ENDERECO);
      feedbackCopia(ok ? "Endereço copiado!" : "Não foi possível copiar", ok);
    } catch {
      const ok = copiarFallback(ENDERECO);
      feedbackCopia(ok ? "Endereço copiado!" : "Não foi possível copiar", ok);
    }
  });
});
