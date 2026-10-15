// Trava/destrava o scroll da página. Usa um conjunto de "donos" para que o
// scroll só volte quando TODOS os overlays (carrinho, formulário...) fecharem —
// sem que um módulo precise consultar o DOM do outro.

const travas = new Set();

export function travarScroll(dono) {
  travas.add(dono);
  document.body.classList.add("scroll-travado");
}

export function destravarScroll(dono) {
  travas.delete(dono);
  if (travas.size === 0) document.body.classList.remove("scroll-travado");
}
