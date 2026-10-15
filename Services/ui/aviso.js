// Aviso temporário (toast) acessível, criado por JS. Estilo em style.css (.aviso).

const DURACAO_MS = 4000;

let regiao = null;

function obterRegiao() {
  if (regiao?.isConnected) return regiao;

  regiao = document.createElement("div");
  regiao.className = "aviso-regiao";
  regiao.setAttribute("role", "status");
  regiao.setAttribute("aria-live", "polite");
  document.body.appendChild(regiao);
  return regiao;
}

/** @param {"sucesso" | "erro"} tipo */
export function mostrarAviso(mensagem, tipo = "sucesso") {
  const aviso = document.createElement("div");
  aviso.className = `aviso aviso--${tipo}`;
  aviso.textContent = mensagem;
  obterRegiao().appendChild(aviso);

  setTimeout(() => aviso.remove(), DURACAO_MS);
}
