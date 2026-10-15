// Elementos globais da página: ano do rodapé e menu hambúrguer (mobile).

export function iniciarNavegacao() {
  const anoAtual = document.getElementById("ano-atual");
  if (anoAtual) anoAtual.textContent = String(new Date().getFullYear());

  const hamburger = document.getElementById("hamburger");
  const nav2 = document.getElementById("nav2");
  if (!hamburger || !nav2) return;

  function definirAberto(aberto) {
    nav2.classList.toggle("active", aberto);
    hamburger.setAttribute("aria-expanded", String(aberto));
  }

  definirAberto(false);

  hamburger.addEventListener("click", () => definirAberto(!nav2.classList.contains("active")));

  nav2.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => definirAberto(false));
  });
}
