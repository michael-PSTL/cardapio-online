// Funções puras de formatação/normalização. Sem acesso ao DOM.

const ENTIDADES_HTML = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escapa texto para uso seguro em innerHTML (inclusive dentro de atributos). */
export function escaparHtml(texto) {
  return String(texto ?? "").replace(/[&<>"']/g, (caractere) => ENTIDADES_HTML[caractere]);
}

export function somenteDigitos(valor) {
  return String(valor ?? "").replace(/\D/g, "");
}

export function normalizarEspacos(valor) {
  return String(valor ?? "").replace(/\s+/g, " ").trim();
}

/** 12 → "R$ 12,00". Valores inválidos viram "R$ 0,00". */
export function formatarMoeda(valor) {
  const numero = Number(valor);
  return `R$ ${(Number.isFinite(numero) ? numero : 0).toFixed(2).replace(".", ",")}`;
}

/** Converte reais em centavos inteiros (evita erro de ponto flutuante em somas). */
export function paraCentavos(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? Math.round(numero * 100) : 0;
}
