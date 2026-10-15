// Mensagem e link de WhatsApp do pedido. Funções puras (sem DOM, sem rede).

import { formatarMoeda } from "../core/formatadores.js";
import { aplicarMascaraCep, aplicarMascaraTelefone } from "../core/mascaras.js";

// ┌─────────────────────────────────────────────────────────┐
// │ 🔧 CONFIGURAÇÃO — WHATSAPP                                │
// │ numero: código do país + DDD + número, sem espaços,       │
// │         traços ou "+".                                    │
// │ abrirAposEnvio: true → depois que a API aceitar o pedido, │
// │         abre o WhatsApp com o resumo. false → só a API.   │
// └─────────────────────────────────────────────────────────┘
export const WHATSAPP_CONFIG = {
  numero: "5598984975025",
  abrirAposEnvio: true,
};

const CODIGO_PAIS = "+55";
const ROTULO_RECEBIMENTO = { entrega: "Entrega", buscar: "Retirada no local" };

/**
 * @param {object} pedido  { nome, email, telefone (dígitos), recebimento, endereco, observacao, itens, total }
 */
export function montarMensagemWhatsapp(pedido) {
  const itensTexto = pedido.itens
    .map((item) => `   ${item.quantidade}x ${item.nome} — ${formatarMoeda(item.preco * item.quantidade)}`)
    .join("\n");

  let enderecoTexto = "";
  if (pedido.recebimento === "entrega") {
    const { cep, cidade, bairro, rua, numero, complemento } = pedido.endereco;
    enderecoTexto =
      `\n📍 Endereço:\n` +
      `   CEP: ${aplicarMascaraCep(cep) || "Não informado"}\n` +
      `   Cidade: ${cidade}\n` +
      `   Bairro: ${bairro}\n` +
      `   Rua: ${rua}\n` +
      `   Número: ${numero}\n` +
      `   Complemento: ${complemento || "Não informado"}`;
  }

  return (
    `Olá, gostaria de fazer um pedido!\n\n` +
    `👤 Nome: ${pedido.nome}\n` +
    `✉️ E-mail: ${pedido.email}\n` +
    `📞 Telefone: ${CODIGO_PAIS} ${aplicarMascaraTelefone(pedido.telefone)}\n\n` +
    `🍱 Itens:\n${itensTexto}\n\n` +
    `📦 Recebimento: ${ROTULO_RECEBIMENTO[pedido.recebimento] ?? "Não informado"}` +
    `${enderecoTexto}\n\n` +
    `📝 Observações: ${pedido.observacao || "Nenhuma"}\n` +
    `💰 Total: ${formatarMoeda(pedido.total)}`
  );
}

export function montarUrlWhatsapp(mensagem) {
  return `https://api.whatsapp.com/send?phone=${WHATSAPP_CONFIG.numero}&text=${encodeURIComponent(mensagem)}`;
}
