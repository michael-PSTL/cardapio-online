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

  // Horários em minutos a partir da meia-noite.
  // Índice: 0 = domingo ... 6 = sábado. null = fechado no dia.
  const HORARIOS = {
    0: null,
    1: { abre: 11 * 60, fecha: 15 * 60 },
    2: { abre: 11 * 60, fecha: 15 * 60 },
    3: { abre: 11 * 60, fecha: 15 * 60 },
    4: { abre: 11 * 60, fecha: 15 * 60 },
    5: { abre: 11 * 60, fecha: 15 * 60 },
    6: { abre: 11 * 60, fecha: 16 * 60 },
  };

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

  // 660 → "11h" | 930 → "15h30"
  function formatarHora(minutos) {
    const hora = Math.floor(minutos / 60);
    const min = minutos % 60;
    return min === 0 ? `${hora}h` : `${hora}h${String(min).padStart(2, "0")}`;
  }

  function proximaAbertura(diaAtual) {
    for (let i = 1; i <= 7; i++) {
      const dia = (diaAtual + i) % 7;
      const faixa = HORARIOS[dia];
      if (!faixa) continue;

      const rotulo = i === 1 ? "amanhã" : DIAS[dia];
      return `abre ${rotulo} às ${formatarHora(faixa.abre)}`;
    }
    return "consulte os horários";
  }

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
    const faixa = HORARIOS[dia];

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

  if (selo) {
    atualizarStatusLocal();
    setInterval(atualizarStatusLocal, 60000); // revalida a cada minuto
  }

  // ─── COPIAR ENDEREÇO ─────────────────────────────────────────

  const btnCopiar = document.getElementById("btn-copiar-endereco");
  const btnCopiarTexto = document.getElementById("btn-copiar-texto");

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