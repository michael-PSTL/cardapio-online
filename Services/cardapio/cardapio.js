// Monta o cardápio: renderiza as três seções e ativa os carrosséis.

import { marmitasData, bebidasData, porcoesData } from "./dadosCardapio.js";
import { renderCarrossel } from "./cardapioView.js";
import { criarCarrossel } from "./carrossel.js";

const SECOES = [
  { prefixo: "marmitas", dados: marmitasData },
  { prefixo: "bebidas", dados: bebidasData },
  { prefixo: "porcoes", dados: porcoesData },
];

/** @param {{ aoAdicionar: (id: string) => boolean }} opcoes */
export function iniciarCardapio({ aoAdicionar }) {
  SECOES.forEach(({ prefixo, dados }) => renderCarrossel(`${prefixo}-itens`, dados, aoAdicionar));
  SECOES.forEach(({ prefixo }) => criarCarrossel(prefixo));
}
