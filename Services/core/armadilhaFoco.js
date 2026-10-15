// Acessibilidade de diálogos modais: Esc fecha e Tab/Shift+Tab ficam presos
// dentro do container enquanto `estaAtivo()` for verdadeiro.

const SELETOR_FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function ativarArmadilhaFoco({ container, estaAtivo, aoEscape }) {
  function elementosFocaveis() {
    return Array.from(container.querySelectorAll(SELETOR_FOCAVEIS)).filter(
      (elemento) => elemento.getClientRects().length > 0,
    );
  }

  function aoPressionarTecla(evento) {
    if (!estaAtivo()) return;

    if (evento.key === "Escape") {
      evento.preventDefault();
      aoEscape();
      return;
    }

    if (evento.key !== "Tab") return;

    const focaveis = elementosFocaveis();
    if (focaveis.length === 0) {
      evento.preventDefault();
      container.focus();
      return;
    }

    const primeiro = focaveis[0];
    const ultimo = focaveis[focaveis.length - 1];
    const ativo = document.activeElement;

    if (!container.contains(ativo)) {
      evento.preventDefault();
      primeiro.focus();
    } else if (evento.shiftKey && (ativo === primeiro || ativo === container)) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && ativo === ultimo) {
      evento.preventDefault();
      primeiro.focus();
    }
  }

  document.addEventListener("keydown", aoPressionarTecla);
  return () => document.removeEventListener("keydown", aoPressionarTecla);
}
