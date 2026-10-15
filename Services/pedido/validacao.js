// Regras de validação do formulário. Funções puras: recebem o valor e
// devolvem a mensagem de erro ("" quando válido). Sem acesso ao DOM.

import { normalizarEspacos, somenteDigitos } from "../core/formatadores.js";

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const DDDS_VALIDOS = new Set([
  "11", "12", "13", "14", "15", "16", "17", "18", "19",
  "21", "22", "24", "27", "28",
  "31", "32", "33", "34", "35", "37", "38",
  "41", "42", "43", "44", "45", "46", "47", "48", "49",
  "51", "53", "54", "55",
  "61", "62", "63", "64", "65", "66", "67", "68", "69",
  "71", "73", "74", "75", "77", "79",
  "81", "82", "83", "84", "85", "86", "87", "88", "89",
  "91", "92", "93", "94", "95", "96", "97", "98", "99",
]);

export function validarNome(valor) {
  const nome = normalizarEspacos(valor);
  if (!nome) return "Informe seu nome.";
  if (!/\p{L}{2,}/u.test(nome)) return "Digite um nome válido.";
  return "";
}

export function validarEmail(valor) {
  const email = String(valor ?? "").trim();
  if (!email) return "Informe seu e-mail.";
  if (email.length > 120 || !REGEX_EMAIL.test(email)) {
    return "Informe um e-mail válido, como nome@exemplo.com.";
  }
  return "";
}

export function validarTelefone(valor) {
  const d = somenteDigitos(valor);

  if (!d) return "Informe seu telefone com DDD.";
  if (d.length < 11) return "Telefone incompleto. Use o formato (00) 00000-0000.";
  if (!DDDS_VALIDOS.has(d.slice(0, 2))) return "DDD inválido.";
  if (d[2] !== "9") return "Informe um celular válido (começa com 9 depois do DDD).";

  return "";
}

// O CEP é obrigatório na entrega (a API exige 8 dígitos).
export function validarCep(valor) {
  const d = somenteDigitos(valor);
  if (!d) return "Informe o CEP.";
  if (d.length !== 8) return "CEP incompleto. Use o formato 00000-000.";
  return "";
}

export function validarTextoObrigatorio(mensagem) {
  return (valor) => (normalizarEspacos(valor).length < 2 ? mensagem : "");
}

export function validarNumeroEndereco(valor) {
  return normalizarEspacos(valor) ? "" : "Informe o número (ou S/N).";
}
