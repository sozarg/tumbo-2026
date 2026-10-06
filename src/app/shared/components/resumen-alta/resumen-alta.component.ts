import { Component, computed, input } from '@angular/core';

/**
 * Quién se está dando de alta, en el segundo paso del formulario.
 *
 * ───────────────────────────────────────────────────────────────────
 * PARA QUÉ
 *
 * El primer paso de las tres altas es la foto y el nombre; el segundo,
 * los datos y el acceso. En el segundo la persona ya no ve a quién está
 * cargando, y con los dos campos de contraseña de por medio es fácil
 * terminar dando de alta a otro —el caso típico es el metre cargando
 * una fila de clientes, uno atrás del otro—. Mostrar la foto y el
 * nombre en el tramo final es la confirmación antes de confirmar.
 *
 * ───────────────────────────────────────────────────────────────────
 * Y ADEMÁS LLENA EL PASO
 *
 * El segundo tramo son campos cortos y no alcanzan para la pantalla de
 * un teléfono: estirarlos deja bandas vacías y dejar la tarjeta corta
 * deja un bloque muerto abajo. Este bloque se queda con el alto que
 * sobra, así que el paso se llena con algo que sirve en vez de con
 * aire. Es lo que pide la figura «Buena Distribución» del enunciado.
 *
 * Cuando al paso le sobra poco, el bloque se achica con él: la foto
 * cede alto hasta donde haga falta y el nombre nunca se sale de la
 * caja. Ver la grilla en los estilos.
 */
@Component({
  selector: 'tumbo-resumen-alta',
  template: `
    <figure class="resumen">
      @if (foto(); as imagen) {
        <img class="resumen__foto" [src]="imagen" [alt]="descripcionDeLaFoto()" />
      }
      <figcaption class="resumen__pie">
        <strong class="resumen__nombre">{{ nombre() || 'Sin nombre todavía' }}</strong>
        @if (nota()) {
          <span class="resumen__nota">{{ nota() }}</span>
        }
      </figcaption>
    </figure>
  `,
  styles: `
    /*
     * El bloque se queda con el alto que le sobre al paso, y lo que
     * manda adentro es la grilla: la foto ocupa la primera fila —que es
     * la que se estira— y el pie, la segunda, con su alto natural.
     *
     * Con una grilla y no con una columna flexible porque una imagen no
     * se achica por debajo de su tamaño propio salvo que se le diga, y
     * esa es exactamente la forma de que el pie se termine saliendo de
     * la caja cuando el sobrante es poco. Acá la fila de la foto puede
     * valer cero: lo que el pie necesita nunca se lo come la imagen.
     */
    :host {
      display: flex;
      flex: 1;
      /* El piso: el nombre, la nota y un resto de foto siempre entran. */
      min-height: 108px;
    }

    .resumen {
      display: grid;
      flex: 1;
      grid-template-rows: minmax(0, 1fr) auto;
      gap: 8px;
      min-height: 0;
      margin: 0;
      padding: 10px;
      border: 1px solid rgb(0 53 146 / 14%);
      border-radius: 14px;
      background: var(--tumbo-azul-brillante, #f8fbfd);
    }

    /*
     * La foto llena su fila y recorta desde el centro: la cámara del
     * teléfono saca vertical y el hueco acá cambia de forma según
     * cuánto le haya sobrado al paso.
     */
    .resumen__foto {
      width: 100%;
      height: 100%;
      min-height: 0;
      border-radius: 10px;
      object-fit: cover;
      object-position: center;
    }

    .resumen__pie {
      display: flex;
      flex-direction: column;
      gap: 2px;
      text-align: center;
    }

    .resumen__nombre {
      color: var(--tumbo-azul-sombra, #003592);
      font-size: 15px;
      font-weight: 800;
      line-height: 1.25;
      overflow-wrap: anywhere;
    }

    .resumen__nota {
      color: #526582;
      font-size: 12px;
      line-height: 1.35;
    }

    /*
     * En teléfonos bajos el bloque no va.
     *
     * Está acá para llenar el alto que a los campos les sobra; en una
     * pantalla baja no sobra nada y ponerlo igual obligaría a
     * hacer scroll, que es el error que estamos arreglando. Entre
     * recordar la cara y no tener que deslizar para llegar al botón,
     * gana lo segundo.
     */
    @media (max-height: 860px) {
      :host {
        display: none;
      }
    }
  `,
})
export class ResumenAlta {
  /** La URL de vista previa de la foto sacada en el primer paso. */
  readonly foto = input<string | null>(null);
  readonly nombre = input('');
  readonly nota = input('');

  protected readonly descripcionDeLaFoto = computed(() =>
    this.nombre() ? `Foto de ${this.nombre()}` : 'Foto de la persona que se está dando de alta',
  );
}
