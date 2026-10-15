// Máscaras de input que preservam a posição do cursor.
import { somenteDigitos } from "./formatadores.js";

export function aplicarMascaraTelefone(digitos) {
  const d = somenteDigitos(digitos).slice(0, 11);

  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;

  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function aplicarMascaraCep(digitos) {
  const d = somenteDigitos(digitos).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

// Posição logo após o N-ésimo dígito do texto formatado.
function posicaoAposDigitos(formatado, quantidade) {
  if (quantidade <= 0) return Math.max(0, formatado.search(/\d/));

  let contados = 0;
  for (let i = 0; i < formatado.length; i += 1) {
    if (/\d/.test(formatado[i])) {
      contados += 1;
      if (contados === quantidade) return i + 1;
    }
  }
  return formatado.length;
}

/**
 * Aplica `formatar` ao valor do input mantendo o cursor no lugar certo.
 * Retorna apenas os dígitos resultantes.
 */
export function aplicarMascaraComCursor(input, formatar, maxDigitos, evento) {
  const cursor = input.selectionStart ?? input.value.length;
  let digitos = somenteDigitos(input.value);
  let antesDoCursor = somenteDigitos(input.value.slice(0, cursor)).length;
  const anteriores = input.dataset.digitos || "";

  // Backspace sobre um caractere da máscara "(", ")", " " ou "-":
  // apaga o dígito anterior em vez de ficar travado.
  if (
    evento?.inputType === "deleteContentBackward" &&
    digitos.length === anteriores.length &&
    antesDoCursor > 0
  ) {
    digitos = digitos.slice(0, antesDoCursor - 1) + digitos.slice(antesDoCursor);
    antesDoCursor -= 1;
  }

  digitos = digitos.slice(0, maxDigitos);
  antesDoCursor = Math.min(antesDoCursor, digitos.length);

  const formatado = formatar(digitos);
  input.value = formatado;
  input.dataset.digitos = digitos;

  if (document.activeElement === input) {
    const posicao = posicaoAposDigitos(formatado, antesDoCursor);
    try {
      input.setSelectionRange(posicao, posicao);
    } catch {
      /* alguns navegadores não permitem selection em certos tipos de input */
    }
  }

  return digitos;
}
