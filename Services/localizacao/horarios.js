// Horário de funcionamento: lista (painel + rodapé) e selo aberto/fechado.

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
// └─────────────────────────────────────────────────────────┘
const GRUPOS_EXIBICAO_HORARIO = [
  { rotulo: "Seg – Sex", dias: [1, 2, 3, 4, 5] },
  { rotulo: "Sábado", dias: [6] },
  { rotulo: "Domingo", dias: [0] },
];

const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

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
  for (let i = 1; i <= 7; i += 1) {
    const dia = (diaAtual + i) % 7;
    const faixa = HORARIOS_SEMANA[dia];
    if (!faixa) continue;

    const rotulo = i === 1 ? "amanhã" : DIAS[dia];
    return `abre ${rotulo} às ${formatarHora(faixa.abre)}`;
  }
  return "consulte os horários";
}

// ─── REGRA DE NEGÓCIO: ESTÁ ABERTO AGORA? ────────────────────

function calcularStatus(agora) {
  const dia = agora.getDay();
  const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
  const faixa = HORARIOS_SEMANA[dia];

  if (faixa && minutosAgora >= faixa.abre && minutosAgora < faixa.fecha) {
    return { dia, aberto: true, texto: `Aberto agora · fecha às ${formatarHora(faixa.fecha)}` };
  }

  if (faixa && minutosAgora < faixa.abre) {
    return { dia, aberto: false, texto: `Fechado · abre hoje às ${formatarHora(faixa.abre)}` };
  }

  return { dia, aberto: false, texto: `Fechado · ${proximaAbertura(dia)}` };
}

// ─── RENDERIZAÇÃO ────────────────────────────────────────────

function renderListas(listas) {
  const linhasHtml = GRUPOS_EXIBICAO_HORARIO.map((grupo) => {
    const texto = textoHorarioDoDia(grupo.dias[0]);
    return `<li data-dias="${grupo.dias.join(",")}"><span>${grupo.rotulo}</span><span>${texto}</span></li>`;
  }).join("");

  listas.forEach((lista) => {
    lista.innerHTML = linhasHtml;
  });
}

function destacarDiaAtual(lista, dia) {
  lista.querySelectorAll("li").forEach((linha) => {
    const dias = (linha.dataset.dias || "").split(",").map((valor) => Number(valor.trim()));
    linha.classList.toggle("hoje", dias.includes(dia));
  });
}

export function iniciarHorarios() {
  const selo = document.getElementById("local-status");
  const seloTexto = document.getElementById("local-status-texto");
  const listaPainel = document.getElementById("local-horarios-lista");
  const listaRodape = document.getElementById("footer-horarios-lista");

  const listas = [listaPainel, listaRodape].filter(Boolean);
  if (listas.length > 0) renderListas(listas);

  if (!selo || !seloTexto) return;

  function atualizar() {
    const status = calcularStatus(new Date());

    if (listaPainel) destacarDiaAtual(listaPainel, status.dia);

    selo.classList.remove("aberto", "fechado");
    selo.classList.add(status.aberto ? "aberto" : "fechado");
    seloTexto.textContent = status.texto;
  }

  atualizar();
  setInterval(atualizar, 60000); // revalida a cada minuto
}
