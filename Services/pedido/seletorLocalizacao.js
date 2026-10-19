// Botão "usar minha localização atual" do endereço (interface).
// Guarda latitude/longitude em memória (não em <input>) e mostra o estado.
// A leitura da posição vive em localizacao/geolocalizacao.js.

import { formatarCoordenada } from "../core/coordenadas.js";
import { obterPosicaoAtual } from "../localizacao/geolocalizacao.js";

const PRECISAO_BAIXA_M = 200;

const TEXTO_CAPTURAR = "Usar minha localização atual";
const TEXTO_ATUALIZAR = "Atualizar localização";
const TEXTO_CARREGANDO = "Obtendo localização…";

const DICA_OPCIONAL = "Opcional: ajuda o entregador a achar você. Use só se estiver no local da entrega.";
const DICA_OBRIGATORIA = "Necessária para a entrega. Use só se estiver no local da entrega.";

const NOOP = {
  obter: () => null,
  limpar() {},
  cancelar() {},
  validar: () => "",
};

/**
 * @param {object} opcoes
 * @param {HTMLButtonElement | null} opcoes.botao
 * @param {HTMLButtonElement | null} [opcoes.botaoLimpar]
 * @param {HTMLElement | null} [opcoes.status]   <p> com aria-live
 * @param {HTMLElement | null} [opcoes.erro]     <p> de erro de validação
 * @param {boolean} [opcoes.obrigatoria]
 * @returns {{ obter: () => ({latitude:number, longitude:number, precisao:number|null} | null),
 *             limpar: () => void, cancelar: () => void, validar: (exibir?: boolean) => string }}
 */
export function iniciarSeletorLocalizacao({ botao, botaoLimpar = null, status = null, erro = null, obrigatoria = false } = {}) {
  if (!botao) return NOOP;

  const textoBotao = botao.querySelector(".btn-localizacao-texto") ?? botao;
  const dicaPadrao = obrigatoria ? DICA_OBRIGATORIA : DICA_OPCIONAL;

  let coordenadas = null;
  let carregando = false;
  let requisicaoId = 0;

  function definirStatus(mensagem, estado = "") {
    if (!status) return;

    status.textContent = mensagem;
    if (estado) status.dataset.estado = estado;
    else delete status.dataset.estado;
  }

  function mostrarErro(mensagem) {
    if (erro) erro.textContent = mensagem;
    if (mensagem) botao.setAttribute("aria-invalid", "true");
    else botao.removeAttribute("aria-invalid");
  }

  function atualizarBotoes() {
    botao.disabled = carregando;
    botao.setAttribute("aria-busy", String(carregando));
    botao.classList.toggle("capturada", Boolean(coordenadas) && !carregando);

    if (carregando) textoBotao.textContent = TEXTO_CARREGANDO;
    else textoBotao.textContent = coordenadas ? TEXTO_ATUALIZAR : TEXTO_CAPTURAR;

    if (botaoLimpar) botaoLimpar.hidden = !coordenadas || carregando;
  }

  async function capturar() {
    if (carregando) return;

    const id = ++requisicaoId;
    carregando = true;
    mostrarErro("");
    definirStatus("Aguarde, confirmando sua posição…", "carregando");
    atualizarBotoes();

    try {
      const posicao = await obterPosicaoAtual();
      if (id !== requisicaoId) return; // cancelado (ex.: trocou para retirada)

      coordenadas = posicao;

      const base = `Localização salva: ${formatarCoordenada(posicao.latitude)}, ${formatarCoordenada(posicao.longitude)}`;
      if (posicao.precisao === null) {
        definirStatus(`${base}.`, "ok");
      } else if (posicao.precisao > PRECISAO_BAIXA_M) {
        definirStatus(`${base} (precisão baixa: ~${posicao.precisao} m). Confira o endereço.`, "aviso");
      } else {
        definirStatus(`${base} (precisão ~${posicao.precisao} m).`, "ok");
      }
    } catch (falha) {
      if (id !== requisicaoId) return;

      console.warn("[seletorLocalizacao] Falha ao obter a posição:", falha);
      // Mantém a posição anterior (se houver) quando a nova tentativa falha.
      definirStatus(
        falha?.name === "ErroLocalizacao" ? falha.message : "Não foi possível obter sua localização agora.",
        "erro",
      );
    } finally {
      if (id === requisicaoId) {
        carregando = false;
        atualizarBotoes();
      }
    }
  }

  function cancelar() {
    requisicaoId += 1;
    carregando = false;
    atualizarBotoes();
  }

  function limpar() {
    cancelar();
    coordenadas = null;
    mostrarErro("");
    definirStatus(dicaPadrao);
    atualizarBotoes();
  }

  function validar(exibir = true) {
    const mensagem =
      obrigatoria && !coordenadas ? "Toque em “Usar minha localização atual” para continuar." : "";
    if (exibir) mostrarErro(mensagem);
    return mensagem;
  }

  botao.addEventListener("click", capturar);
  botaoLimpar?.addEventListener("click", () => {
    limpar();
    botao.focus();
  });

  limpar();

  return { obter: () => coordenadas, limpar, cancelar, validar };
}
