// Ponto de entrada: liga os módulos entre si. Nenhuma regra de negócio aqui.
// (Scripts type="module" já executam depois do HTML carregado.)

import { iniciarNavegacao } from "./ui/navegacao.js";
import { iniciarHorarios } from "./localizacao/horarios.js";
import { iniciarCopiarEndereco } from "./localizacao/copiarEndereco.js";
import { iniciarAvaliacoes } from "./avaliacoes/avaliacoesView.js";
import { iniciarCardapio } from "./cardapio/cardapio.js";
import { iniciarCarrinhoView } from "./carrinho/carrinhoView.js";
import { iniciarFormularioPedido } from "./pedido/formularioPedido.js";
import * as carrinho from "./carrinho/carrinhoStore.js";

iniciarNavegacao();
iniciarHorarios();
iniciarCopiarEndereco();
iniciarAvaliacoes();

iniciarCardapio({ aoAdicionar: (id) => carrinho.adicionarItem(id) });

const formulario = iniciarFormularioPedido();
iniciarCarrinhoView({ aoFinalizar: () => formulario?.abrir() });
