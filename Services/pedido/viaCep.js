// Consulta de CEP (ViaCEP). Só rede: não toca no DOM.

// 🔧 CONFIGURAÇÃO
const URL_BASE = "https://viacep.com.br/ws";
const TIMEOUT_PADRAO_MS = 6000;

/**
 * @param {string} cep  8 dígitos
 * @returns {Promise<{cidade: string, bairro: string, rua: string} | null>}
 *          null quando o CEP não existe. Lança erro em falha de rede/timeout/abort.
 */
export async function consultarCep(cep, { signal, timeoutMs = TIMEOUT_PADRAO_MS } = {}) {
  if (!/^\d{8}$/.test(cep)) throw new Error("CEP deve ter 8 dígitos.");

  const controller = new AbortController();
  const aoCancelarDeFora = () => controller.abort();

  if (signal?.aborted) controller.abort();
  else signal?.addEventListener("abort", aoCancelarDeFora, { once: true });

  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resposta = await fetch(`${URL_BASE}/${cep}/json/`, { signal: controller.signal });
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);

    const dados = await resposta.json();
    if (!dados || dados.erro) return null;

    return {
      cidade: dados.localidade ?? "",
      bairro: dados.bairro ?? "",
      rua: dados.logradouro ?? "",
    };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", aoCancelarDeFora);
  }
}
