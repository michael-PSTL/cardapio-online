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
});