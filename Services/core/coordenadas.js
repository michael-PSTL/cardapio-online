// Funções puras para latitude/longitude. Sem acesso ao DOM nem à rede.

export function latitudeValida(valor) {
  return typeof valor === "number" && Number.isFinite(valor) && valor >= -90 && valor <= 90;
}

export function longitudeValida(valor) {
  return typeof valor === "number" && Number.isFinite(valor) && valor >= -180 && valor <= 180;
}

/** Limita as casas decimais (6 casas ≈ 0,1 m, mais que suficiente para entrega). */
export function arredondarCoordenada(valor, casas = 6) {
  return Number(Number(valor).toFixed(casas));
}

/** -2.5307 → "-2,53070" (para exibir ao cliente). */
export function formatarCoordenada(valor, casas = 5) {
  return Number(valor).toFixed(casas).replace(".", ",");
}
