// Botão "Copiar endereço" (Clipboard API com fallback para navegadores antigos).

// 🔧 CONFIGURAÇÃO — endereço copiado para a área de transferência.
const ENDERECO = "Rua 20, nº 1 — Quadra 4, Parque Vitória, São José de Ribamar — MA";
const TEXTO_PADRAO = "Copiar endereço";
const DURACAO_FEEDBACK_MS = 1800;

function copiarFallback(texto) {
  const campo = document.createElement("textarea");
  campo.value = texto;
  campo.setAttribute("readonly", "");
  campo.style.position = "fixed";
  campo.style.top = "-9999px";
  campo.style.opacity = "0";

  document.body.appendChild(campo);
  campo.select();

  let sucesso = false;
  try {
    sucesso = document.execCommand("copy");
  } catch {
    sucesso = false;
  }

  document.body.removeChild(campo);
  return sucesso;
}

async function copiar(texto) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(texto);
      return true;
    } catch {
      // permissão negada ou documento sem foco: tenta o método antigo
    }
  }
  return copiarFallback(texto);
}

export function iniciarCopiarEndereco() {
  const botao = document.getElementById("btn-copiar-endereco");
  const botaoTexto = document.getElementById("btn-copiar-texto");
  if (!botao) return;

  let timer = null;

  function feedback(mensagem, ok) {
    botao.classList.toggle("copiado", ok);
    if (botaoTexto) botaoTexto.textContent = mensagem;

    clearTimeout(timer);
    timer = setTimeout(() => {
      botao.classList.remove("copiado");
      if (botaoTexto) botaoTexto.textContent = TEXTO_PADRAO;
    }, DURACAO_FEEDBACK_MS);
  }

  botao.addEventListener("click", async () => {
    const ok = await copiar(ENDERECO);
    feedback(ok ? "Endereço copiado!" : "Não foi possível copiar", ok);
  });
}
