// ═══════════════════════════════════════════════════════════
// 🔧 CONFIGURAÇÃO — ITENS DO CARDÁPIO
//
// Edite itens, nomes, preços e imagens aqui. O `id` de cada produto é
// o mesmo `produtoId` enviado para a API, então precisa ser ÚNICO em
// TODAS as listas (marmitas, bebidas e porções).
// ═══════════════════════════════════════════════════════════

export const marmitasData = [
  { id: "assado-panela", nome: "Assado de panela", preco: 99.99, img: "/assets/img/imagem-marmita.avif" },
  { id: "peixe-frito", nome: "Peixe Frito", preco: 99.99, img: "/assets/img/imagem-marmita.avif" },
  { id: "carne-porco", nome: "Carne de porco", preco: 99.99, img: "/assets/img/imagem-marmita.avif" },
  { id: "cozidao", nome: "Cozidão", preco: 99.99, img: "/assets/img/imagem-marmita.avif" },
  { id: "frango-assado", nome: "Frango assado", preco: 99.99, img: "/assets/img/imagem-marmita.avif" },
  { id: "strogonoff", nome: "Strogonoff", preco: 99.99, img: "/assets/img/imagem-marmita.avif" },
  { id: "empanado-frango", nome: "Empanado de frango", preco: 99.99, img: "/assets/img/imagem-marmita.avif" },
];

export const bebidasData = [
  { id: "coca-lata", nome: "Coca-Cola Lata 350ml", preco: 6.0, img: "/assets/img/imagem-cocacola.webp" },
  { id: "coca-2l", nome: "Coca-Cola 2L", preco: 12.0, img: "/assets/img/imagem-cocacola.webp" },
  { id: "guarana-lata", nome: "Guaraná Lata 350ml", preco: 5.0, img: "/assets/img/imagem-cocacola.webp" },
  { id: "guarana-2l", nome: "Guaraná 2L", preco: 10.0, img: "/assets/img/imagem-cocacola.webp" },
  { id: "suco-natural", nome: "Suco Natural 500ml", preco: 8.0, img: "/assets/img/imagem-cocacola.webp" },
];

export const porcoesData = [
  { id: "arroz", nome: "Porção de Arroz", preco: 8.0, img: "/assets/img/imagem-porcao.webp" },
  { id: "feijao", nome: "Porção de Feijão", preco: 8.0, img: "/assets/img/imagem-porcao.webp" },
  { id: "farofa", nome: "Porção de Farofa", preco: 7.0, img: "/assets/img/imagem-porcao.webp" },
  { id: "salada", nome: "Porção de Salada", preco: 7.0, img: "/assets/img/imagem-porcao.webp" },
];

// Índice id → produto (fonte única para carrinho e pedido).
const indicePorId = new Map();

[...marmitasData, ...bebidasData, ...porcoesData].forEach((produto) => {
  if (indicePorId.has(produto.id)) {
    console.error(`[cardapio] id de produto duplicado: "${produto.id}". Cada id deve ser único.`);
    return;
  }
  indicePorId.set(produto.id, produto);
});

export function obterProdutoPorId(id) {
  return indicePorId.get(String(id)) ?? null;
}
