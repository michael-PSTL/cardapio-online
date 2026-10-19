// Posição atual do aparelho (Geolocation API do navegador).
//
// Única responsabilidade: pedir a posição e devolver
// { latitude, longitude, precisao } já validada, ou lançar ErroLocalizacao
// com uma mensagem pronta para o cliente. Não conhece DOM nem formulário.

import { arredondarCoordenada, latitudeValida, longitudeValida } from "../core/coordenadas.js";

const TIMEOUT_PADRAO_MS = 12000;

export class ErroLocalizacao extends Error {
  constructor(mensagem, { codigo = "DESCONHECIDO", causa } = {}) {
    super(mensagem, causa ? { cause: causa } : undefined);
    this.name = "ErroLocalizacao";
    this.codigo = codigo;
  }
}

// GeolocationPositionError.code → erro amigável.
const ERROS_DO_NAVEGADOR = {
  1: {
    codigo: "PERMISSAO_NEGADA",
    mensagem: "Permissão negada. Libere a localização nas configurações do navegador e tente de novo.",
  },
  2: {
    codigo: "INDISPONIVEL",
    mensagem: "Não foi possível descobrir sua posição agora. Verifique o GPS ou a conexão e tente de novo.",
  },
  3: {
    codigo: "TEMPO_ESGOTADO",
    mensagem: "A localização demorou demais para responder. Tente novamente.",
  },
};

function traduzirErro(erro) {
  const conhecido = ERROS_DO_NAVEGADOR[erro?.code];
  if (conhecido) return new ErroLocalizacao(conhecido.mensagem, { codigo: conhecido.codigo, causa: erro });

  return new ErroLocalizacao("Não foi possível obter sua localização. Preencha o endereço manualmente.", {
    causa: erro,
  });
}

/**
 * @param {{ timeoutMs?: number }} [opcoes]
 * @returns {Promise<{ latitude: number, longitude: number, precisao: number | null }>}
 *   `precisao` em metros (null quando o aparelho não informa).
 */
export function obterPosicaoAtual({ timeoutMs = TIMEOUT_PADRAO_MS } = {}) {
  return new Promise((resolver, rejeitar) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      rejeitar(
        new ErroLocalizacao("Este navegador não permite obter a localização.", { codigo: "NAO_SUPORTADO" }),
      );
      return;
    }

    // Navegadores só liberam a localização em https (ou localhost).
    if (globalThis.isSecureContext === false) {
      rejeitar(
        new ErroLocalizacao("A localização só funciona em conexão segura (https).", {
          codigo: "CONTEXTO_INSEGURO",
        }),
      );
      return;
    }

    try {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          const { latitude, longitude, accuracy } = coords ?? {};

          if (!latitudeValida(latitude) || !longitudeValida(longitude)) {
            rejeitar(
              new ErroLocalizacao("O aparelho devolveu uma posição inválida. Tente novamente.", {
                codigo: "POSICAO_INVALIDA",
              }),
            );
            return;
          }

          resolver({
            latitude: arredondarCoordenada(latitude),
            longitude: arredondarCoordenada(longitude),
            precisao: Number.isFinite(accuracy) ? Math.round(accuracy) : null,
          });
        },
        (erro) => rejeitar(traduzirErro(erro)),
        // maximumAge: 0 → nunca usa posição antiga em cache.
        { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 },
      );
    } catch (erro) {
      rejeitar(traduzirErro(erro));
    }
  });
}
