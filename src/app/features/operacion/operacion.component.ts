import { MenuOperacion } from './menu-operacion.component';
import { NgOptimizedImage } from '@angular/common';
import {
  Component,
  ElementRef,
  Injector,
  OnInit,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonBadge } from '@ionic/angular/ion-badge';
import { IonButton } from '@ionic/angular/ion-button';
import { IonCard } from '@ionic/angular/ion-card';
import { IonCardContent } from '@ionic/angular/ion-card-content';
import { IonCardHeader } from '@ionic/angular/ion-card-header';
import { IonCardSubtitle } from '@ionic/angular/ion-card-subtitle';
import { IonCardTitle } from '@ionic/angular/ion-card-title';
import { IonChip } from '@ionic/angular/ion-chip';
import { IonHeader } from '@ionic/angular/ion-header';
import { IonContent } from '@ionic/angular/ion-content';
import { IonIcon } from '@ionic/angular/ion-icon';
import { IonInput } from '@ionic/angular/ion-input';
import { IonItem } from '@ionic/angular/ion-item';
import { IonLabel } from '@ionic/angular/ion-label';
import { IonRange } from '@ionic/angular/ion-range';
import { IonSelect } from '@ionic/angular/ion-select';
import { IonSelectOption } from '@ionic/angular/ion-select-option';
import { IonTextarea } from '@ionic/angular/ion-textarea';
import { IonToast } from '@ionic/angular/ion-toast';
import { IonToggle } from '@ionic/angular/ion-toggle';
import { addIcons } from 'ionicons';
import { Paginador } from '../../shared/components/paginador/paginador.component';
import { Espera } from '../../shared/components/espera/espera.component';
import { BotonConfirmacion } from '../../shared/components/boton-confirmacion/boton-confirmacion.component';
import {
  pencilOutline,
  wineOutline,
  receiptOutline,
  gameControllerOutline,
  chatbubblesOutline,
  addCircleOutline,
  alertCircleOutline,
  arrowBackOutline,
  arrowForwardOutline,
  barChartOutline,
  cameraOutline,
  checkmarkCircleOutline,
  checkmarkDoneOutline,
  closeCircleOutline,
  cubeOutline,
  documentTextOutline,
  happyOutline,
  logOutOutline,
  peopleOutline,
  qrCodeOutline,
  restaurantOutline,
  sendOutline,
  sparklesOutline,
  timeOutline,
  trashOutline,
  walletOutline,
} from 'ionicons/icons';
import {
  AltaClienteDemo,
  AltaEmpleadoDemo,
  AltaMesaDemo,
  AltaProductoDemo,
  EstadoPedido,
  ProductoDemo,
  SectorProducto,
  TipoMesa,
  TipoProducto,
} from '../../core/models/demo-restaurante';
import { OperacionService } from '../../core/services/operacion.service';
import { ErroresService } from '../../core/services/errores.service';
import { Camara, FotoTomada } from '../../core/dispositivo/camara.service';
import { LectorDeDni, ResultadoDeLectura } from '../../core/dispositivo/lector-de-dni.service';
import { DatosDeDni } from '../../core/dni/codigo-de-dni';
import { LIMITES } from '../../core/validacion/limites';
import { mensajeDeError } from '../../core/validacion/mensajes';
import {
  clavesCoinciden,
  conLimite,
  correoValido,
  cuilCoincideConDni,
  cuilConDigitoValido,
  cuilValido,
  dniValido,
  enteroValido,
  fotoRequerida,
  precioValido,
  tresFotosRequeridas,
  sinEspaciosSolos,
  validadoresDeNombre,
} from '../../core/validacion/validadores';
import { AUTENTICACION } from '../../core/services/autenticacion.port';
import { SesionService } from '../../core/services/sesion.service';

import {
  accesosDelPerfil,
  esGerencia,
  tipoProductoDelPerfil,
  Seccion,
  puedeAcceder,
} from '../../core/navegacion/secciones';
type GraficoDemo = 'torta' | 'barras' | 'linea';

@Component({
  imports: [
    MenuOperacion,
    IonBadge,
    IonButton,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    IonChip,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonRange,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    IonToast,
    IonToggle,
    Espera,
    Paginador,
    BotonConfirmacion,
    NgOptimizedImage,
    ReactiveFormsModule,
  ],
  selector: 'tumbo-operacion',
  // Dos hojas y no una: `operacion.component.scss` ya está a 24,4 kB del
  // presupuesto de 30, y el de Angular se mide por hoja.
  styleUrls: ['./operacion.component.scss', './operacion-fotos.component.scss'],
  templateUrl: './operacion.component.html',
})
export class Operacion implements OnInit {
  private readonly injector = inject(Injector);
  private readonly encabezado = viewChild<ElementRef<HTMLElement>>('encabezado');
  private readonly formularioBuilder = inject(FormBuilder);
  private readonly errores = inject(ErroresService);
  private readonly router = inject(Router);
  private readonly sesion = inject(SesionService);
  private readonly autenticacion = inject(AUTENTICACION);
  protected readonly demo = inject(OperacionService);
  private readonly lector = inject(LectorDeDni);
  private readonly camara = inject(Camara);

  protected readonly usuario = this.sesion.usuario;
  protected readonly modo = this.autenticacion.modo;
  protected readonly seccion = signal<Seccion | null>(null);
  protected readonly pagina = signal(0);
  protected readonly anteriorPaso = (paso: number): number => Math.max(0, paso - 1);
  protected readonly paso = signal(0);
  protected readonly paginaItems = signal(0);
  protected readonly mesasDisponibles = computed(() =>
    this.demo.mesas().filter((mesa) => mesa.disponible),
  );
  protected readonly itemsPedido = computed(() => {
    const sector =
      this.seccion() === 'cocina' ? 'cocina' : this.seccion() === 'barra' ? 'bar' : null;
    return this.demo
      .pedidoActivo()
      .items.filter((item) => sector === null || item.sector === sector);
  });
  protected readonly itemVisible = computed(() =>
    this.itemsPedido().slice(this.paginaItems(), this.paginaItems() + 1),
  );
  protected readonly mesaVisible = computed(() =>
    this.mesasDisponibles().slice(this.paginaItems(), this.paginaItems() + 1),
  );
  protected readonly creando = signal(false);
  protected readonly productoEditado = signal<string | null>(null);
  protected readonly accesos = computed(() => accesosDelPerfil(this.usuario()?.perfil));
  protected readonly gestiona = computed(() => esGerencia(this.usuario()?.perfil));
  protected readonly tipoDeSector = computed(() => tipoProductoDelPerfil(this.usuario()?.perfil));
  protected readonly productosDelSector = computed(() =>
    this.demo
      .productos()
      .filter((producto) => !this.tipoDeSector() || producto.tipo === this.tipoDeSector()),
  );
  protected readonly actividad = computed(() => {
    const perfil = this.usuario()?.perfil;
    return this.demo
      .notificaciones()
      .filter(
        (notificacion) =>
          perfil !== undefined &&
          (perfil === 'dueno' ||
            (this.modo !== 'demo' && notificacion.destinatarios.length === 0) ||
            notificacion.destinatarios.includes(perfil)),
      )
      .slice(0, 4);
  });
  protected readonly titulo = computed(
    () => this.accesos().find((acceso) => acceso.id === this.seccion())?.titulo ?? 'Tu restaurante',
  );
  protected readonly grafico = signal<GraficoDemo>('torta');
  protected readonly mensaje = signal('');
  protected readonly error = signal('');

  protected readonly enviando = signal(false);

  /**
   * El id del empleado que se está dando de baja, o `null`.
   *
   * Es el id y no un booleano porque la espera se muestra EN SU FILA:
   * con un booleano habría que apagar las once filas de la lista o
   * poner un indicador suelto que no dice a quién corresponde.
   *
   * La baja pasa por una Edge Function, que verifica quién llama, borra
   * la foto del bucket y después la cuenta. Eso tarda lo suficiente como
   * para que, sin indicador, la pantalla parezca colgada (requisito
   * excluyente R6: indicadores en TODAS las esperas).
   */
  protected readonly dandoDeBaja = signal<string | null>(null);
  protected readonly imagenes = signal<Record<string, number>>({});
  protected readonly nombreAnonimo = signal('');
  protected readonly qrSeleccionado = signal<number | null>(null);

  /** `false` en el navegador: ahí la cámara y el lector se simulan. */
  protected readonly camaraReal = this.camara.esReal;
  protected readonly lectorReal = this.lector.esReal;
  protected readonly perfilEsCliente = computed(() => {
    const perfil = this.usuario()?.perfil;
    return perfil === 'cliente_registrado' || perfil === 'cliente_anonimo';
  });
  protected readonly propinas = [20, 15, 10, 5, 0] as const;

  /**
   * Alta de empleado (punto 1), validada igual que la base.
   *
   * ANTES ERA DE MENTIRA
   * Decía `Validators.minLength(7)` para el DNI. `minLength` mide el
   * largo y nada más, así que `abcdefg` pasaba el formulario, viajaba
   * al servidor y recién ahí lo rechazaba PostgreSQL. La persona se
   * enteraba después de apretar el botón, con un error genérico, en
   * lugar de verlo en rojo abajo del campo.
   *
   * Ahora cada validador espeja un CHECK de `public.usuarios`:
   *
   *   nombres/apellidos → largo_nombres + formato_nombres (2-50, letras)
   *   dni               → formato_dni    (7 u 8 dígitos)
   *   cuil              → formato_cuil   (11 dígitos, guiones opcionales)
   *   correo            → formato_correo + largo_correo (5-80)
   *   clave             → lo que exige Supabase Auth (6 mínimo)
   *
   * La base sigue siendo la última línea de defensa. Esto es la
   * primera: la que le habla a la persona.
   */
  protected readonly empleadoForm = this.formularioBuilder.nonNullable.group(
    {
      nombres: ['', validadoresDeNombre('nombres')],
      apellidos: ['', validadoresDeNombre('apellidos')],
      dni: ['', [Validators.required, dniValido]],
      cuil: ['', [Validators.required, cuilValido, cuilConDigitoValido]],
      correo: ['', [Validators.required, sinEspaciosSolos, correoValido, ...conLimite('correo')]],
      clave: ['', [Validators.required, ...conLimite('clave')]],
      repetirClave: ['', Validators.required],
      perfil: ['cocinero' as Extract<AltaEmpleadoDemo['perfil'], string>, Validators.required],
      /**
       * La foto no se tipea: es el archivo que devuelve la cámara. Vive
       * igual en el formulario para que entre en la misma validación que
       * el resto y el cartel de confirmación no se abra sin ella.
       *
       * En modo demostración no hay Storage donde subirla, así que ahí
       * no se exige: si no, la aplicación no se podría probar sin
       * Supabase configurado.
       */
      foto: [null as FotoTomada | null, this.modo === 'demo' ? [] : [fotoRequerida]],
    },
    {
      // Cruza DNI y CUIL: los ocho dígitos del medio del CUIL son el DNI.
      validators: [cuilCoincideConDni(), clavesCoinciden],
    },
  );

  /** Los topes de la base, para el atributo `maxlength` de los inputs. */
  protected readonly limites = LIMITES;
  /**
   * Alta y edición de un producto (punto 2), validada igual que la base.
   *
   * Cada validador se corresponde con algo de `public.productos`:
   *
   *   nombre       largo_nombre: entre 2 y 60 caracteres
   *   descripcion  largo_descripcion: entre 10 y 300
   *   minutos      tiempo_elaboracion_min integer > 0
   *   precio       numeric(10,2) > 0
   *
   * Antes eran `Validators.required` sueltos: un nombre de 5.000
   * caracteres pasaba el formulario y lo rechazaba la base con un error
   * que no decía qué campo era. El tope de 600 minutos es lo único que
   * no sale de la base —ahí no hay máximo— pero un plato que tarda diez
   * horas es un error de tipeo.
   */
  protected readonly productoForm = this.formularioBuilder.nonNullable.group({
    nombre: ['', [Validators.required, sinEspaciosSolos, ...conLimite('nombreProducto')]],
    descripcion: [
      '',
      [Validators.required, sinEspaciosSolos, ...conLimite('descripcionProducto')],
    ],
    minutos: [10, [Validators.required, enteroValido, Validators.min(1), Validators.max(600)]],
    precio: [1000, [Validators.required, precioValido, Validators.min(1)]],
    tipo: ['plato' as TipoProducto, Validators.required],
    /**
     * Los tres lugares de foto. La posición ES el orden en la base.
     *
     * Se guardan los tres desde el principio, en vez de ir agregando a
     * una lista: así el lugar 2 sigue siendo el lugar 2 aunque el 1 esté
     * vacío, y al editar una sola foto se reemplaza esa y no se corre
     * todo.
     */
    fotos: [[null, null, null] as (FotoTomada | null)[], tresFotosRequeridas],
  });
  protected readonly errorImagen = signal('');

  /** Los tres lugares de foto, para recorrerlos en la plantilla. */
  protected readonly lugaresDeFoto = [0, 1, 2] as const;

  /**
   * LAS FOTOS QUE DIBUJA LA PLANTILLA. NO LEER EL FORMULARIO PARA ESTO.
   *
   * ─────────────────────────────────────────────────────────────────
   * EL BUG QUE ESTO ARREGLA
   *
   * La plantilla decía `@if (productoForm.controls.fotos.value[lugar])`.
   * Medido en un navegador de verdad, con las tres fotos cargadas una
   * atrás de la otra, el valor del control y la pantalla no coincidían:
   *
   *     elegir foto 1 → valor [F,_,_]   pantalla [llena, vacía, vacía] ✓
   *     elegir foto 2 → valor [F,F,_]   pantalla [llena, VACÍA, vacía] ✗
   *     elegir foto 3 → valor [F,F,F]   pantalla [llena, llena, VACÍA] ✗
   *
   * La pantalla iba UNA FOTO ATRASADA. Para quien carga el producto eso
   * se ve como que el segundo intento no anduvo: elige la imagen, no
   * aparece nada, la vuelve a elegir. Y el cartel «Falta 1 foto» seguía
   * ahí con las tres puestas.
   *
   * ─────────────────────────────────────────────────────────────────
   * POR QUÉ PASABA
   *
   * El valor del control SIEMPRE estuvo bien: lo que no se ejecutaba era
   * la detección de cambios. Angular marca para revisar la vista que
   * ATIENDE un evento; el clic en el botón marca esa vista, pero la foto
   * no llega en el clic —llega mucho después, cuando la promesa del
   * selector de archivo se resuelve—, y ahí ya no hay evento que marque
   * nada. Recién el clic SIGUIENTE volvía a marcar la vista y se dibujaba
   * lo que se había elegido la vez anterior.
   *
   * La foto del empleado tenía exactamente el mismo problema, y no se
   * notaba solo porque es una sola: el primer cambio siempre se ve.
   *
   * ─────────────────────────────────────────────────────────────────
   * POR QUÉ UNA SEÑAL Y NO UN `markForCheck()`
   *
   * Escribir una señal que la plantilla lee avisa sola. Un
   * `markForCheck()` arregla estas dos llamadas y deja la trampa armada
   * para la próxima. El control sigue existiendo y sigue siendo el que
   * valida —`tresFotosRequeridas` vive ahí—; lo único que cambia es
   * quién le cuenta a la pantalla. `ponerFotosDeProducto` escribe los
   * dos, así que no hay dos verdades: hay una, con dos lectores.
   */
  protected readonly fotosDelProducto = signal<readonly (FotoTomada | null)[]>([null, null, null]);

  /** Ídem, para la única foto del empleado (punto 1). */
  protected readonly fotoDelEmpleado = signal<FotoTomada | null>(null);

  /** Lo consulta el botón de confirmar antes de abrir el cartel. */
  protected readonly productoEsValido = (): boolean => this.validar(this.productoForm);
  protected readonly mesaForm = this.formularioBuilder.nonNullable.group({
    numero: [6, [Validators.required, Validators.min(1)]],
    comensales: [4, [Validators.required, Validators.min(1)]],
    tipo: ['estándar' as TipoMesa, Validators.required],
  });
  protected readonly clienteForm = this.formularioBuilder.nonNullable.group({
    nombres: ['', Validators.required],
    apellidos: ['', Validators.required],
    dni: ['', [Validators.required, Validators.minLength(7)]],
    correo: ['', [Validators.required, Validators.email]],
  });
  protected readonly mensajeForm = this.formularioBuilder.nonNullable.group({
    texto: ['', [Validators.required, Validators.maxLength(180)]],
  });
  protected readonly encuestaForm = this.formularioBuilder.nonNullable.group({
    satisfaccion: [5, [Validators.required, Validators.min(1)]],
    comentario: ['', Validators.required],
    recomendaria: [true, Validators.required],
  });

  constructor() {
    addIcons({
      pencilOutline,
      wineOutline,
      receiptOutline,
      gameControllerOutline,
      chatbubblesOutline,
      addCircleOutline,
      alertCircleOutline,
      arrowBackOutline,
      arrowForwardOutline,
      barChartOutline,
      cameraOutline,
      checkmarkCircleOutline,
      checkmarkDoneOutline,
      closeCircleOutline,
      cubeOutline,
      documentTextOutline,
      happyOutline,
      logOutOutline,
      peopleOutline,
      qrCodeOutline,
      restaurantOutline,
      sendOutline,
      sparklesOutline,
      timeOutline,
      trashOutline,
      walletOutline,
    });
  }

  ngOnInit(): void {
    if (!this.sesion.estaAutenticado()) {
      void this.router.navigate(['/ingreso'], { replaceUrl: true });
    }
  }

  protected abrir(seccion: Seccion): void {
    if (!puedeAcceder(this.usuario()?.perfil, seccion)) return;
    this.seccion.set(seccion);
    this.enfocarEncabezado();
    this.pagina.set(0);
    this.paginaItems.set(0);
    this.paso.set(0);
    this.creando.set(false);
    if (seccion === 'productos')
      this.productoForm.controls.tipo.setValue(this.tipoDeSector() ?? 'plato');
    this.error.set('');
  }

  protected volver(): void {
    this.seccion.set(null);
    this.enfocarEncabezado();
    this.error.set('');
  }

  /** Tras cambiar de vista, el lector de pantalla recibe el nuevo título sin desplazarla. */
  private enfocarEncabezado(): void {
    afterNextRender(() => this.encabezado()?.nativeElement.focus({ preventScroll: true }), {
      injector: this.injector,
    });
  }

  ionViewWillEnter(): void {
    this.volver();
    // `quitarFotoEmpleado` y no solo el `reset`: el reset limpia el
    // control, y la foto que DIBUJA la pantalla vive en la señal.
    this.quitarFotoEmpleado();
    this.empleadoForm.reset({ perfil: 'cocinero' });
    void this.demo.cargar();
  }

  protected paginar<T>(elementos: readonly T[], cantidad = 1): readonly T[] {
    const inicio =
      Math.min(this.pagina(), Math.max(0, Math.ceil(elementos.length / cantidad) - 1)) * cantidad;
    return elementos.slice(inicio, inicio + cantidad);
  }

  protected readonly totalPaginas = computed(() => {
    switch (this.seccion()) {
      case 'personal':
        return 1;
      case 'productos':
        return 1;
      case 'menu':
        return this.demo.productos().length;
      case 'mesas':
        return Math.ceil(this.demo.mesas().length / 4);
      case 'clientes':
        return 1;
      case 'espera':
        return this.demo.espera().length;
      case 'consulta':
        return this.demo.mensajes().length;
      case 'juegos':
        return 3;
      default:
        return 1;
    }
  });

  /**
   * Se espera el cierre antes de navegar. Antes no se esperaba, así que
   * la navegación arrancaba con el token todavía en el almacenamiento:
   * justo lo que R13 pide poder verificar que no pasa.
   */
  protected async cerrarSesion(): Promise<void> {
    await this.autenticacion.cerrarSesion();
    await this.router.navigate(['/ingreso'], { replaceUrl: true });
  }

  protected campoInvalido(control: AbstractControl): boolean {
    return control.invalid && control.touched;
  }

  /** El texto que va abajo del campo cuando está mal. */
  protected mensajeCampo(control: AbstractControl, etiqueta: string): string {
    return mensajeDeError(control, etiqueta);
  }

  /**
   * Impide escribir lo que la base nunca va a aceptar.
   *
   * POR QUÉ NO ALCANZA CON EL VALIDADOR
   * Un validador avisa DESPUÉS de escribir. Para el DNI eso es peor que
   * inútil: la persona tipea ocho letras, se le pone todo en rojo, y
   * tiene que borrar de a una. Acá directamente no entran.
   *
   * `permitidos` es lo que SÍ puede quedar. Para el DNI son dígitos,
   * puntos y espacios —los separadores se sacan al guardar—; para el
   * CUIL, dígitos y guiones.
   *
   * OJO: esto es comodidad, no seguridad. Se puede saltear pegando con
   * el mouse o desde la consola. Quien decide de verdad es el CHECK de
   * la base, que no se puede saltear de ninguna manera.
   */
  protected filtrarTipeo(control: AbstractControl, evento: Event, permitidos: RegExp): void {
    const campo = evento.target as HTMLInputElement | null;
    const escrito = String(campo?.value ?? '');
    const limpio = escrito.replace(permitidos, '');

    if (limpio === escrito) {
      return;
    }

    if (campo) {
      campo.value = limpio;
    }
    control.setValue(limpio);
  }

  /** Lo que se descarta en el DNI: todo lo que no sea dígito, punto o espacio. */
  protected readonly sobraEnDni = /[^0-9.\s]/g;

  /** Lo que se descarta en el CUIL: todo lo que no sea dígito o guion. */
  protected readonly sobraEnCuil = /[^0-9-]/g;

  /**
   * Antes esto avisaba «Empleado registrado» pasara lo que pasara: no
   * miraba el resultado. Con el alta en mock daba igual, porque nunca
   * fallaba; ahora que va contra la base de verdad, un correo repetido
   * o un DNI mal formado tienen que verse.
   */
  /**
   * Muestra un error: lo separa del éxito, y vibra.
   *
   * La vibración la pone `ErroresService` (requisito excluyente R9:
   * «Vibraciones al detectarse un error. TODOS LOS ERRORES»).
   */
  private async avisarError(texto: string): Promise<void> {
    this.mensaje.set('');
    this.error.set(await this.errores.mostrar(texto));
  }

  /** Muestra un éxito y baja cualquier error que hubiera quedado. */
  private avisarExito(texto: string): void {
    this.error.set('');
    this.mensaje.set(texto);
  }

  /** La cierra el propio toast cuando se termina su tiempo. */
  protected cerrarAviso(): void {
    this.mensaje.set('');
  }

  /**
   * Lo consulta el botón de confirmar ANTES de abrir el cartel.
   *
   * Es una propiedad y no un método porque se pasa como valor al
   * componente: si fuera `validarEmpleado()` en la plantilla se
   * ejecutaría en cada ciclo de detección de cambios en vez de cuando
   * hace falta. `validar` además marca los campos y muestra los errores,
   * que es lo que tiene que ver la persona.
   */
  protected readonly empleadoEsValido = (): boolean => this.validar(this.empleadoForm);

  protected async registrarEmpleado(): Promise<void> {
    // El alta tarda: crea la cuenta, sube la foto y recarga el listado.
    // Sin este guarda, dos envíos superpuestos crean la misma persona dos
    // veces; el segundo choca contra el DNI único y muestra un error que
    // hace creer que no se guardó nada.
    if (this.enviando()) return;

    if (!this.validar(this.empleadoForm)) {
      return;
    }

    if (!puedeAcceder(this.usuario()?.perfil, 'personal')) return;

    const { repetirClave, foto, ...empleado } = this.empleadoForm.getRawValue();

    this.enviando.set(true);
    let resultado;
    try {
      resultado = await this.demo.registrarEmpleado({
        ...empleado,
        foto: foto ?? undefined,
      } as AltaEmpleadoDemo);
    } finally {
      // En el `finally` y no después del `await`: si la llamada tira, el
      // botón tiene que volver a habilitarse igual. Si no, la pantalla
      // queda trabada y hay que salir y entrar de nuevo a la sección.
      this.enviando.set(false);
    }

    if (!resultado.ok) {
      await this.avisarError(resultado.error ?? 'No se pudo registrar el empleado.');
      return;
    }

    // La cuenta quedó creada aunque algo secundario haya fallado, así que
    // el formulario se limpia igual. El aviso se muestra como error —con
    // su vibración— porque hay algo que alguien tiene que ir a arreglar.
    if (resultado.aviso) {
      await this.avisarError(resultado.aviso);
    }

    // La contraseña se limpia sí o sí: no puede quedar en pantalla para
    // la siguiente alta (es el mismo criterio del requisito R13).
    this.empleadoForm.reset({ perfil: 'cocinero' });
    this.quitarFotoEmpleado();
    this.paso.set(0);
    this.avisarExito(
      this.modo === 'demo'
        ? 'Empleado registrado en demostración.'
        : 'Empleado registrado. Ya puede ingresar con su correo y contraseña.',
    );
  }

  protected async eliminarEmpleado(id: string): Promise<void> {
    if (!this.gestiona() || this.dandoDeBaja()) return;

    this.dandoDeBaja.set(id);
    let resultado;
    try {
      resultado = await this.demo.eliminarEmpleado(id);
    } finally {
      // En el `finally`: si la llamada tira, la fila tiene que volver a
      // su estado normal igual, o queda girando para siempre.
      this.dandoDeBaja.set(null);
    }

    if (!resultado.ok) {
      await this.avisarError(resultado.error ?? 'No se pudo eliminar el empleado.');
      return;
    }
    // La foto puede no haberse podido borrar aunque la baja sí: se avisa
    // como error, con su vibración, porque queda un archivo con dueño.
    if (resultado.aviso) {
      await this.avisarError(resultado.aviso);
      return;
    }

    this.avisarExito('Empleado dado de baja.');
  }

  protected editarProducto(producto: ProductoDemo): void {
    if (
      !puedeAcceder(this.usuario()?.perfil, 'productos') ||
      !this.productosDelSector().some((item) => item.id === producto.id)
    )
      return;
    this.productoEditado.set(producto.id);
    this.limpiarFotosDeProducto();
    this.productoForm.reset({ ...producto, fotos: [null, null, null] });
    this.exigirLasTresFotos(false);
    this.errorImagen.set('');
    this.creando.set(true);
  }

  /**
   * Las tres fotos son obligatorias EN EL ALTA, no en la edición.
   *
   * El enunciado pide las tres «al agregar un nuevo plato». Al editar,
   * las fotos que ya tiene el producto siguen en la base y los tres
   * lugares arrancan vacíos porque significan «esta no la cambié»
   * —`guardarFotosDelProducto` saltea los `null`—.
   *
   * Sin esto, cambiarle el precio a un plato obligaría a volver a sacar
   * las tres fotos. Es la clase de regla que se agrega pensando en el
   * alta y se descubre desde el otro lado una semana después.
   */
  private exigirLasTresFotos(exigir: boolean): void {
    const control = this.productoForm.controls.fotos;
    control.setValidators(exigir ? tresFotosRequeridas : []);
    control.updateValueAndValidity();
  }
  protected alternarFormulario(): void {
    this.creando.update((valor) => !valor);
    this.paso.set(0);
    if (this.seccion() === 'productos') {
      this.productoEditado.set(null);
      this.limpiarFotosDeProducto();
      this.productoForm.reset({
        minutos: 10,
        precio: 1000,
        tipo: this.tipoDeSector() ?? 'plato',
        fotos: [null, null, null],
      });
      this.exigirLasTresFotos(true);
      this.errorImagen.set('');
    }
  }
  protected async registrarProducto(): Promise<void> {
    if (!puedeAcceder(this.usuario()?.perfil, 'productos')) return;
    if (this.tipoDeSector()) this.productoForm.controls.tipo.setValue(this.tipoDeSector()!);
    if (!this.validar(this.productoForm)) {
      return;
    }
    const datos = {
      ...this.productoForm.getRawValue(),
      fotos: this.productoForm.controls.fotos.value,
    } as AltaProductoDemo;
    const id = this.productoEditado();
    const resultado = id
      ? await this.demo.actualizarProducto(id, datos)
      : await this.demo.registrarProducto(datos);

    if (!resultado.ok) {
      await this.avisarError(resultado.error ?? 'No se pudo agregar el producto.');
      return;
    }

    this.limpiarFotosDeProducto();
    this.productoForm.reset({
      minutos: 10,
      precio: 1000,
      tipo: this.tipoDeSector() ?? 'plato',
      fotos: [null, null, null],
    });
    // Se vuelve a exigir: el formulario queda listo para la próxima
    // alta, y la edición es la excepción y no al revés.
    this.exigirLasTresFotos(true);
    this.errorImagen.set('');
    this.productoEditado.set(null);
    this.creando.set(false);

    // El aviso del alta es «estaba dado de baja y volvió a la carta».
    // Se muestra como éxito y no como error: el producto quedó cargado,
    // solo cambia cómo llegó ahí.
    this.avisarExito(resultado.aviso ?? (id ? 'Producto actualizado.' : 'Producto agregado.'));
  }

  protected async eliminarProducto(id: string): Promise<void> {
    if (!puedeAcceder(this.usuario()?.perfil, 'productos')) return;
    const resultado = await this.demo.eliminarProducto(id);
    if (!resultado.ok) {
      await this.avisarError(resultado.error ?? 'No se pudo eliminar el producto.');
      return;
    }
    this.avisarExito('Producto eliminado del catálogo.');
  }

  /**
   * Pone o reemplaza la foto de UN lugar (punto 2).
   *
   * El enunciado pide que cada foto se vea en su contenedor y que se
   * pueda «seleccionar otra imagen». Por eso se pasa el lugar: se toca
   * el contenedor que se quiere cambiar y se reemplaza solo ese.
   */
  protected async elegirFotoDeProducto(lugar: number): Promise<void> {
    const resultado = await this.camara.elegirImagen();

    if (resultado.estado === 'cancelado') return;

    if (resultado.estado === 'error') {
      await this.avisarError(resultado.mensaje);
      return;
    }

    this.cambiarFotoDeProducto(lugar, resultado.foto);
    this.errorImagen.set('');
  }

  protected quitarFotoDeProducto(lugar: number): void {
    this.cambiarFotoDeProducto(lugar, null);
  }

  /**
   * El único lugar que toca las fotos del producto.
   *
   * Escribe la señal —que es lo que dibuja la pantalla— y el control
   * —que es lo que valida y lo que se manda—, en ese orden y siempre
   * juntos. Ver el comentario largo de `fotosDelProducto`.
   */
  private cambiarFotoDeProducto(lugar: number, foto: FotoTomada | null): void {
    const fotos = [...this.fotosDelProducto()];
    this.olvidarFoto(fotos[lugar]);
    fotos[lugar] = foto;

    this.fotosDelProducto.set(fotos);
    this.productoForm.controls.fotos.setValue([...fotos]);
    this.productoForm.controls.fotos.markAsTouched();
  }

  /** Libera la URL de vista previa, que el navegador retiene hasta recargar. */
  private olvidarFoto(foto: FotoTomada | null): void {
    if (foto?.previewUrl.startsWith('blob:')) URL.revokeObjectURL(foto.previewUrl);
  }

  /**
   * Deja los tres lugares vacíos, liberando las vistas previas.
   *
   * No pasa por `cambiarFotoDeProducto` a propósito: eso escribiría el
   * control tres veces, y quien llama acá lo resetea entero enseguida.
   */
  private limpiarFotosDeProducto(): void {
    for (const foto of this.fotosDelProducto()) this.olvidarFoto(foto);
    this.fotosDelProducto.set([null, null, null]);
  }

  protected async registrarMesa(): Promise<void> {
    if (!this.gestiona()) return;
    if (!this.validar(this.mesaForm)) {
      return;
    }
    const creada = (await this.demo.registrarMesa(this.mesaForm.getRawValue() as AltaMesaDemo)).ok;
    this.mensaje.set(
      creada
        ? 'Mesa creada: el QR se generó automáticamente.'
        : 'No se puede repetir el número de mesa.',
    );
  }

  protected async registrarCliente(): Promise<void> {
    if (!this.validar(this.clienteForm)) {
      return;
    }
    await this.demo.registrarCliente(this.clienteForm.getRawValue() as AltaClienteDemo);
    this.clienteForm.reset();
    this.mensaje.set('Cliente creado en estado pendiente de aprobación.');
  }

  protected async resolverCliente(id: string, estado: 'aprobado' | 'rechazado'): Promise<void> {
    if (!this.gestiona()) return;
    await this.demo.resolverCliente(id, estado);
    this.mensaje.set(estado === 'aprobado' ? 'Cliente aprobado.' : 'Cliente rechazado.');
  }

  protected async asignarMesa(idEspera: string, numero: number): Promise<void> {
    const asignada = await this.demo.asignarMesa(idEspera, numero);
    this.mensaje.set(
      asignada ? 'Mesa ' + numero + ' asignada y notificada.' : 'Esa mesa no está disponible.',
    );
  }

  protected async anotarCliente(): Promise<void> {
    const nombre = this.nombreAnonimo().trim();
    if (!nombre) {
      this.mensaje.set('Ingresá tu nombre para entrar a la lista de espera.');
      return;
    }
    await this.demo.anotarEnEspera(nombre);
    this.nombreAnonimo.set('');
    this.mensaje.set('Te anotamos en la lista de espera.');
  }

  protected actualizarNombreAnonimo(evento: CustomEvent<{ value?: string | null }>): void {
    this.nombreAnonimo.set(evento.detail.value ?? '');
  }

  /**
   * Lee el documento y completa el formulario (punto 1).
   *
   * EN EL APK Y EN EL NAVEGADOR
   * Es el mismo botón. En el teléfono abre la cámara y lee el PDF417 del
   * DNI de verdad; en el navegador inventa una persona. El servicio
   * decide cuál de las dos, y el mensaje que ve el usuario dice cuál
   * fue: una lectura simulada nunca se anuncia como real.
   *
   * EL CORREO
   * Un DNI no trae correo, así que en una lectura real ese campo queda
   * vacío para que lo complete quien carga. En la simulada se rellena,
   * que es comodidad para probar y no fidelidad al documento.
   */
  protected async leerDniEmpleado(): Promise<void> {
    const lectura = await this.lector.leer();
    if (!(await this.aplicarLectura(lectura))) return;
    if (lectura.estado !== 'leido') return;

    this.empleadoForm.patchValue({
      nombres: lectura.datos.nombres,
      apellidos: lectura.datos.apellidos,
      dni: lectura.datos.dni,
      cuil: lectura.datos.cuil ?? '',
      correo: this.correoPropuesto(lectura.datos),
    });
  }

  /** Igual que el del empleado, para el alta de cliente (punto 5). */
  protected async leerDniCliente(): Promise<void> {
    const lectura = await this.lector.leer();
    if (!(await this.aplicarLectura(lectura))) return;
    if (lectura.estado !== 'leido') return;

    this.clienteForm.patchValue({
      nombres: lectura.datos.nombres,
      apellidos: lectura.datos.apellidos,
      dni: lectura.datos.dni,
      correo: this.correoPropuesto(lectura.datos),
    });
  }

  /**
   * Traduce el resultado del lector a lo que ve la persona.
   *
   * Devuelve `true` solo cuando hay datos para cargar. Los cuatro
   * desenlaces se muestran distinto a propósito: cancelar no es un
   * error y no tiene que vibrar, y "esto no es un DNI" no es lo mismo
   * que "no pude leer" —uno se arregla apuntando a otra cosa y el otro
   * mejorando la luz—.
   */
  private async aplicarLectura(lectura: ResultadoDeLectura): Promise<boolean> {
    switch (lectura.estado) {
      case 'leido':
        this.avisarExito(
          lectura.datos.correo
            ? 'Datos leídos del código. Revisalos antes de registrar.'
            : 'DNI leído. El documento no trae correo: revisá el propuesto.',
        );
        return true;

      case 'cancelado':
        return false;

      case 'otro-codigo':
        await this.avisarError(
          'Ese código no es de un DNI. Apuntá al código del dorso del documento.',
        );
        return false;

      case 'error':
        await this.avisarError(lectura.mensaje);
        return false;
    }
  }

  /**
   * Un correo PROPUESTO a partir del documento.
   *
   * EL DNI NO TRAE CORREO
   * Ni el PDF417 del documento argentino ni ningún otro campo del código
   * lo tienen: adentro hay trámite, apellidos, nombres, sexo, número,
   * ejemplar, fechas y CUIL. Nada más. Así que después de escanear, ese
   * campo quedaba obligatoriamente vacío.
   *
   * POR QUÉ SE PROPONE UNO IGUAL
   * Porque el campo es obligatorio y tipear una dirección entera con el
   * teléfono en la mano, delante de la persona que se está dando de
   * alta, es la parte más lenta del alta. Se arma con el nombre, el
   * apellido y los últimos cuatro dígitos del DNI, así que no choca con
   * el de otra persona.
   *
   * ES UNA PROPUESTA, NO UN DATO DEL DOCUMENTO. El campo queda editable
   * y el aviso de la lectura pide expresamente que se revise: si la
   * persona tiene un correo de verdad, se escribe encima.
   *
   * Si el código SÍ trae un correo —los de prueba lo traen— se usa ese y
   * no se inventa nada.
   */
  private correoPropuesto(datos: DatosDeDni): string {
    if (datos.correo) return datos.correo;

    const parte = (texto: string) =>
      texto
        .toLocaleLowerCase('es-AR')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z]/g, '');

    return `${parte(datos.nombres)}.${parte(datos.apellidos)}.${datos.dni.slice(-4)}@tumbo.demo`;
  }

  /**
   * Saca la foto del empleado (punto 1).
   *
   * La anterior se descarta con `revokeObjectURL`: son URLs que el
   * navegador retiene hasta que se recarga la página, y sacarse cinco
   * fotos seguidas dejaría cinco imágenes enteras en memoria.
   */
  protected async sacarFotoEmpleado(): Promise<void> {
    const resultado = await this.camara.sacarFoto();

    if (resultado.estado === 'cancelado') return;

    if (resultado.estado === 'error') {
      await this.avisarError(resultado.mensaje);
      return;
    }

    this.cambiarFotoDeEmpleado(resultado.foto);
  }

  protected quitarFotoEmpleado(): void {
    this.cambiarFotoDeEmpleado(null);
  }

  /**
   * El único lugar que toca la foto del empleado.
   *
   * Mismo criterio que `cambiarFotoDeProducto`: la señal dibuja, el
   * control valida, se escriben juntos. Acá el atraso de una foto no se
   * llegaba a ver —hay una sola, y el primer cambio siempre se dibuja—,
   * pero el mecanismo roto era el mismo y la trampa quedaba armada para
   * cuando alguien tocara «Repetir».
   */
  private cambiarFotoDeEmpleado(foto: FotoTomada | null): void {
    this.olvidarFotoEmpleado();
    this.fotoDelEmpleado.set(foto);
    this.empleadoForm.controls.foto.setValue(foto);
    this.empleadoForm.controls.foto.markAsTouched();
  }

  private olvidarFotoEmpleado(): void {
    const anterior = this.fotoDelEmpleado();
    if (anterior?.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(anterior.previewUrl);
    }
  }

  protected alternarImagen(producto: ProductoDemo): void {
    this.imagenes.update((imagenes) => ({
      ...imagenes,
      [producto.id]: ((imagenes[producto.id] ?? 0) + 1) % producto.fotos.length,
    }));
  }

  protected imagenActual(producto: ProductoDemo): string {
    return producto.fotos[this.imagenes()[producto.id] ?? 0] ?? producto.fotos[0];
  }

  protected agregar(producto: ProductoDemo): void {
    this.demo.agregarAlCarrito(producto);
  }

  protected quitar(producto: ProductoDemo): void {
    this.demo.quitarDelCarrito(producto.id);
  }

  protected async cambiarDisponibilidadMesa(numero: number): Promise<void> {
    if (!this.gestiona()) return;
    const resultado = await this.demo.cambiarDisponibilidadMesa(numero);
    if (resultado.error) this.mensaje.set(resultado.error);
  }

  protected async eliminarDeEspera(id: string): Promise<void> {
    const resultado = await this.demo.eliminarDeEspera(id);
    if (resultado.error) this.mensaje.set(resultado.error);
  }

  protected cantidad(productoId: string): number {
    return this.demo.carrito().find((item) => item.productoId === productoId)?.cantidad ?? 0;
  }

  protected async enviarPedido(): Promise<void> {
    const usuario = this.usuario();
    const nombre = usuario ? usuario.nombres + ' ' + usuario.apellidos : 'Cliente';
    const mesa = this.demo.mesaVinculada() ?? 2;
    const enviado = (await this.demo.enviarPedido()).ok;
    this.mensaje.set(
      enviado ? 'Pedido enviado al mozo.' : 'Agregá productos antes de enviar el pedido.',
    );
  }

  protected async rechazarPedido(): Promise<void> {
    this.demo.rechazarPedido(
      'Falta disponibilidad de un producto. Podés modificarlo y reenviarlo.',
    );
    this.mensaje.set('Pedido rechazado y devuelto al cliente con el motivo.');
  }

  protected async confirmarPedido(): Promise<void> {
    await this.demo.confirmarPedido();
    this.mensaje.set('Pedido confirmado: cocina y bar recibieron sus ítems.');
  }

  protected async marcarSectorListo(sector: SectorProducto): Promise<void> {
    await this.demo.marcarSectorListo(sector);
    this.mensaje.set('Sector ' + sector + ' actualizado.');
  }

  protected async entregarPedido(): Promise<void> {
    await this.demo.marcarEntregado();
    this.mensaje.set('Pedido marcado como entregado; el cliente debe confirmar la recepción.');
  }

  protected async recibirPedido(): Promise<void> {
    await this.demo.confirmarRecepcion();
    this.mensaje.set('Recepción confirmada. Ya se puede responder la encuesta y pedir la cuenta.');
  }

  protected async enviarMensaje(): Promise<void> {
    if (!this.validar(this.mensajeForm)) {
      return;
    }
    const usuario = this.usuario();
    await this.demo.agregarMensaje(
      usuario ? usuario.nombres + ' ' + usuario.apellidos : 'Cliente',
      this.mensajeForm.controls.texto.value,
      true,
    );
    this.mensajeForm.reset();
    this.mensaje.set('Consulta enviada a todos los mozos.');
  }

  protected async jugar(idJuego: string, gano: boolean): Promise<void> {
    const intento = (await this.demo.jugar(idJuego, gano)).intento;
    this.mensaje.set(
      gano && intento === 1
        ? '¡Ganaste! Obtuviste ' + this.demo.descuento() + '% de descuento.'
        : 'Partida registrada. Solo el primer intento ganador otorga beneficio.',
    );
  }

  protected async registrarEncuesta(): Promise<void> {
    if (!this.validar(this.encuestaForm)) {
      return;
    }
    const registrada = (await this.demo.registrarEncuesta()).ok;
    this.mensaje.set(
      registrada
        ? 'Encuesta guardada: los gráficos ya tienen un nuevo dato.'
        : 'Ya respondiste la encuesta de esta estadía.',
    );
  }

  protected seleccionarPropina(porcentaje: number): void {
    this.demo.seleccionarPropina(porcentaje);
    this.mensaje.set('Seleccionaste una propina del ' + porcentaje + '%.');
  }

  protected async generarCuenta(): Promise<void> {
    const generada = (await this.demo.generarCuenta()).ok;
    this.mensaje.set(
      generada
        ? 'Cuenta generada con el detalle completo.'
        : 'Primero seleccioná uno de los cinco QR de propina.',
    );
  }

  protected async pagarCuenta(): Promise<void> {
    await this.demo.pagarCuenta();
    this.mensaje.set('Pago simulado realizado. El mozo debe confirmarlo.');
  }

  protected async confirmarPago(): Promise<void> {
    await this.demo.confirmarPago();
    this.mensaje.set('Pago confirmado y mesa liberada.');
  }

  protected seleccionarQr(porcentaje: number): void {
    this.qrSeleccionado.set(porcentaje);
    this.seleccionarPropina(porcentaje);
  }

  protected qrImagen(clave: string): string {
    const imagenes: Record<string, string> = {
      entrada: 'imagenes/qr-entrada.png',
      'propina-20': 'imagenes/qr-propina-20.png',
      'propina-15': 'imagenes/qr-propina-15.png',
      'propina-10': 'imagenes/qr-propina-10.png',
      'propina-5': 'imagenes/qr-propina-5.png',
      'propina-0': 'imagenes/qr-propina-0.png',
    };
    if (clave.startsWith('mesa-')) {
      return 'imagenes/qr-' + clave + '.png';
    }
    return imagenes[clave] ?? '';
  }

  protected formatearPrecio(precio: number): string {
    return new Intl.NumberFormat('es-AR', {
      currency: 'ARS',
      maximumFractionDigits: 0,
      style: 'currency',
    }).format(precio);
  }

  protected estadoPedido(estado: EstadoPedido): string {
    const etiquetas: Record<EstadoPedido, string> = {
      pendiente_confirmacion: 'Pendiente de confirmación',
      rechazado: 'Rechazado: modificar y reenviar',
      confirmado: 'Confirmado',
      en_preparacion: 'En preparación',
      listo: 'Listo',
      entregado: 'Entregado: falta recepción',
      recibido: 'Recibido',
    };
    return etiquetas[estado];
  }

  protected validar(formulario: { invalid: boolean; markAllAsTouched: () => void }): boolean {
    if (formulario.invalid) {
      formulario.markAllAsTouched();
      this.error.set('Revisá los campos marcados antes de guardar.');
      return false;
    }
    return true;
  }
}
