/**
 * Los colores de los gráficos, sacados de la paleta TUMBO. Van en un
 * orden que alterna claros y oscuros para que dos porciones vecinas
 * nunca se confundan.
 */
export const COLORES_DE_GRAFICO = [
  '#006ae7',
  '#fbb103',
  '#dc5b02',
  '#003592',
  '#4d9cff',
  '#a84402',
] as const;

export const colorDe = (indice: number): string =>
  COLORES_DE_GRAFICO[indice % COLORES_DE_GRAFICO.length];
