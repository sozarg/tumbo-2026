/**
 * La encuesta del punto 20, tal como está en la base
 * (`preguntas_encuesta`): siete preguntas, cada una con un control
 * distinto. La variedad de controles es un requisito del enunciado.
 */
export type TipoDeControl =
  'estrellas' | 'radio' | 'checkbox' | 'select' | 'rango' | 'interruptor' | 'texto_largo';

export interface PreguntaDeEncuesta {
  readonly id: string;
  readonly texto: string;
  readonly tipo: TipoDeControl;
  readonly opciones: readonly string[];
  readonly minimo: number | null;
  readonly maximo: number | null;
  readonly requerida: boolean;
}

/** Lo que se puede responder: estrellas y rango son números, checkbox una lista, etc. */
export type ValorDeRespuesta = number | string | boolean | readonly string[] | null;

export type RespuestasDeEncuesta = Readonly<Record<string, ValorDeRespuesta>>;

/** Una porción o barra: cuántas respuestas eligieron esa opción. */
export interface DatoDeConteo {
  readonly etiqueta: string;
  readonly cantidad: number;
}

/** Un punto de la línea: el promedio de una semana, o `null` si no hubo respuestas. */
export interface DatoDePromedio {
  readonly etiqueta: string;
  readonly promedio: number | null;
}

/** Lo que devuelve `resultados_encuesta()`: un gráfico de cada tipo. */
export interface ResultadosDeEncuesta {
  readonly total: number;
  readonly torta: { readonly pregunta: string; readonly datos: readonly DatoDeConteo[] } | null;
  readonly barras: { readonly pregunta: string; readonly datos: readonly DatoDeConteo[] } | null;
  readonly linea: { readonly pregunta: string; readonly datos: readonly DatoDePromedio[] } | null;
}
