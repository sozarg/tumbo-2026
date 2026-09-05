import { NgOptimizedImage } from '@angular/common';
import { Component, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
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
import { IonContent } from '@ionic/angular/ion-content';
import { IonIcon } from '@ionic/angular/ion-icon';
import { IonInput } from '@ionic/angular/ion-input';
import { IonItem } from '@ionic/angular/ion-item';
import { IonLabel } from '@ionic/angular/ion-label';
import { IonNote } from '@ionic/angular/ion-note';
import { IonRange } from '@ionic/angular/ion-range';
import { IonSelect } from '@ionic/angular/ion-select';
import { IonSelectOption } from '@ionic/angular/ion-select-option';
import { IonTextarea } from '@ionic/angular/ion-textarea';
import { IonToast } from '@ionic/angular/ion-toast';
import { IonToggle } from '@ionic/angular/ion-toggle';
import { addIcons } from 'ionicons';
import { Espera } from '../../shared/components/espera/espera.component';
import {
  addCircleOutline,
  alertCircleOutline,
  arrowBackOutline,
  arrowForwardOutline,
  barChartOutline,
  checkmarkCircleOutline,
  checkmarkDoneOutline,
  closeCircleOutline,
  cubeOutline,
  documentTextOutline,
  happyOutline,
  imageOutline,
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
import { inventarPersona } from '../../core/demo/generador-de-personas';
import { LIMITES } from '../../core/validacion/limites';
import { mensajeDeError } from '../../core/validacion/mensajes';
import {
  conLimite,
  correoValido,
  cuilCoincideConDni,
  cuilConDigitoValido,
  cuilValido,
  dniValido,
  sinEspaciosSolos,
  validadoresDeNombre,
} from '../../core/validacion/validadores';
import { AUTENTICACION } from '../../core/services/autenticacion.port';
import { SesionService } from '../../core/services/sesion.service';

type SegmentoDemo = 'resumen' | 'gestion' | 'pedido' | 'experiencia' | 'cuenta';
type GraficoDemo = 'torta' | 'barras' | 'linea';

@Component({
  imports: [
    IonBadge,
    IonButton,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    IonChip,
    IonContent,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonNote,
    IonRange,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    IonToast,
    IonToggle,
    Espera,
    NgOptimizedImage,
    ReactiveFormsModule,
  ],
  selector: 'tumbo-operacion',
  styleUrl: './operacion.component.scss',
  templateUrl: './operacion.component.html',
})
export class Operacion implements OnInit {
  private readonly formularioBuilder = inject(FormBuilder);
  private readonly errores = inject(ErroresService);
  private readonly router = inject(Router);
  private readonly sesion = inject(SesionService);
  private readonly autenticacion = inject(AUTENTICACION);
  protected readonly demo = inject(OperacionService);

  protected readonly usuario = this.sesion.usuario;
  protected readonly segmento = signal<SegmentoDemo>('resumen');
  protected readonly grafico = signal<GraficoDemo>('torta');
  /**
   * Avisos que salieron BIEN. Se muestran como `ion-toast`: aparecen,
   * se leen y se van solos.
   */
  protected readonly mensaje = signal('');

  /**
   * Avisos que salieron MAL. Van aparte, y a propósito.
   *
   * Antes había una sola señal para las dos cosas, y el cartel siempre
   * se dibujaba igual: fondo crema, tilde verde, `role="status"`. O sea
   * que un error se mostraba con cara de éxito. Nos pasó de verdad: el
   * alta falló, el mensaje correcto apareció en pantalla, y era
   * indistinguible de un "listo".
   *
   * Además el enunciado lo pide explícitamente: «Todo error o
   * información debe ser mostrada con distintos tipos de controles».
   * Un error es un cartel rojo fijo con `role="alert"` (el lector de
   * pantalla lo interrumpe y lo lee); un éxito es un toast que se va.
   */
  protected readonly error = signal('');

  /**
   * El cartel de error en el DOM, para poder traerlo a la vista.
   *
   * Vive dentro de un `@if`, así que puede no existir: por eso el tipo
   * admite `undefined` y todo lo que lo usa lo comprueba antes.
   */
  private readonly carteldeError = viewChild<ElementRef<HTMLElement>>('carteldeError');
  protected readonly enviando = signal(false);
  protected readonly imagenes = signal<Record<string, number>>({});
  protected readonly nombreAnonimo = signal('');
  protected readonly qrSeleccionado = signal<number | null>(null);
  protected readonly perfilEsCliente = computed(() => {
    const perfil = this.usuario()?.perfil;
    return perfil === 'cliente_registrado' || perfil === 'cliente_anonimo';
  });
  protected readonly perfilEsGestion = computed(() => {
    const perfil = this.usuario()?.perfil;
    return perfil === 'dueno' || perfil === 'supervisor';
  });
  protected readonly integrantes = [
    'Mateo Terrile',
    'Ramiro Bianucci',
    'Ignacio Agustín Cruz',
    'Matías Gabriel Ferrari',
  ] as const;
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
  protected readonly empleadoForm = this.formularioBuilder.nonNullable.group({
    nombres: ['', validadoresDeNombre('nombres')],
    apellidos: ['', validadoresDeNombre('apellidos')],
    dni: ['', [Validators.required, dniValido]],
    cuil: ['', [Validators.required, cuilValido, cuilConDigitoValido]],
    correo: ['', [Validators.required, sinEspaciosSolos, correoValido, ...conLimite('correo')]],
    clave: ['', [Validators.required, ...conLimite('clave')]],
    perfil: ['cocinero' as Extract<AltaEmpleadoDemo['perfil'], string>, Validators.required],
  }, {
    // Cruza DNI y CUIL: los ocho dígitos del medio del CUIL son el DNI.
    validators: cuilCoincideConDni(),
  });

  /** Los topes de la base, para el atributo `maxlength` de los inputs. */
  protected readonly limites = LIMITES;
  protected readonly productoForm = this.formularioBuilder.nonNullable.group({
    nombre: ['', Validators.required],
    descripcion: ['', Validators.required],
    minutos: [10, [Validators.required, Validators.min(1)]],
    precio: [1000, [Validators.required, Validators.min(1)]],
    tipo: ['plato' as TipoProducto, Validators.required],
  });
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
      addCircleOutline,
      alertCircleOutline,
      arrowBackOutline,
      arrowForwardOutline,
      barChartOutline,
      checkmarkCircleOutline,
      checkmarkDoneOutline,
      closeCircleOutline,
      cubeOutline,
      documentTextOutline,
      happyOutline,
      imageOutline,
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

  protected cambiarSegmento(segmento: SegmentoDemo): void {
    this.segmento.set(segmento);
    this.mensaje.set('');
  }

  protected volver(): void {
    void this.router.navigate(['/inicio']);
  }

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
    this.traerElCartelALaVista();
  }

  /**
   * Lleva la pantalla hasta el cartel de error y le pone el foco.
   *
   * POR QUÉ HACE FALTA
   * Los formularios de alta son largos. Si alguien aprieta "Registrar"
   * con la pantalla abajo, el cartel aparece arriba de todo, fuera de
   * vista, y parece que el botón no hizo nada.
   *
   * POR QUÉ EL setTimeout
   * El cartel está dentro de un `@if (error())`. En el momento de
   * escribir la señal el elemento TODAVÍA NO EXISTE: lo crea Angular en
   * la pasada de detección de cambios siguiente. Sin esperar ese turno,
   * `carteldeError()` devuelve undefined y no pasa nada.
   *
   * POR QUÉ TAMBIÉN EL FOCO
   * Mover la pantalla sirve para quien ve. El foco sirve para quien
   * navega con teclado o con lector de pantalla: sin esto tendrían que
   * salir a buscar el mensaje a mano. El cartel lleva `tabindex="-1"`
   * para poder recibir el foco sin meterse en el orden de tabulación.
   *
   * El desplazamiento suave se apaga para quien pidió menos movimiento
   * en su sistema operativo, igual que el fondo decorativo.
   */
  private traerElCartelALaVista(): void {
    setTimeout(() => {
      const cartel = this.carteldeError()?.nativeElement;
      if (!cartel) {
        return;
      }

      const menosMovimiento = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      cartel.scrollIntoView({
        behavior: menosMovimiento ? 'auto' : 'smooth',
        block: 'center',
      });
      cartel.focus({ preventScroll: true });
    });
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

  protected async registrarEmpleado(): Promise<void> {
    if (!this.validar(this.empleadoForm)) {
      return;
    }

    const resultado = await this.demo.registrarEmpleado(
      this.empleadoForm.getRawValue() as AltaEmpleadoDemo,
    );

    if (!resultado.ok) {
      await this.avisarError(resultado.error ?? 'No se pudo registrar el empleado.');
      return;
    }

    // La contraseña se limpia sí o sí: no puede quedar en pantalla para
    // la siguiente alta (es el mismo criterio del requisito R13).
    this.empleadoForm.reset({ perfil: 'cocinero' });
    this.avisarExito('Empleado registrado. Ya puede ingresar con su correo y contraseña.');
  }

  protected async registrarProducto(): Promise<void> {
    if (!this.validar(this.productoForm)) {
      return;
    }
    const resultado = await this.demo.registrarProducto(
      this.productoForm.getRawValue() as AltaProductoDemo,
    );

    if (!resultado.ok) {
      await this.avisarError(resultado.error ?? 'No se pudo agregar el producto.');
      return;
    }

    this.productoForm.reset({ minutos: 10, precio: 1000, tipo: 'plato' });
    this.avisarExito('Producto agregado con tres imágenes de demostración.');
  }

  protected async registrarMesa(): Promise<void> {
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
    await this.demo.resolverCliente(id, estado);
    this.mensaje.set(estado === 'aprobado' ? 'Cliente aprobado.' : 'Cliente rechazado.');
  }

  protected async asignarMesa(idEspera: string, numero: number): Promise<void> {
    const asignada = await this.demo.asignarMesa(idEspera, numero);
    this.mensaje.set(asignada ? 'Mesa ' + numero + ' asignada y notificada.' : 'Esa mesa no está disponible.');
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
   * Simula leer el código de barras del DNI (punto 1).
   *
   * QUÉ CAMBIÓ
   * Antes era siempre la misma persona escrita a mano —Valentina
   * Molina, DNI 43.210.987— con dos problemas: el DNI tenía puntos, que
   * la base rechaza, y el CUIL `27-43210987-6` era falso (el dígito que
   * le correspondía era el 4). Nadie lo notaba porque nada lo comprobaba.
   *
   * Además, al ser siempre el mismo, el segundo alta chocaba contra el
   * DNI único y había que inventar números a mano para seguir probando.
   *
   * Ahora cada lectura devuelve una persona distinta, con el CUIL
   * derivado del DNI y del sexo con el algoritmo real.
   *
   * SOBRE EL CORREO
   * Un DNI no trae correo: eso es comodidad para probar, no fidelidad.
   * El resto —nombres, apellidos, número— sí es lo que trae el PDF417,
   * y el CUIL se DERIVA de ahí, no se lee.
   */
  protected simularDniEmpleado(): void {
    const persona = inventarPersona();
    this.empleadoForm.patchValue({
      nombres: persona.nombres,
      apellidos: persona.apellidos,
      dni: persona.dni,
      cuil: persona.cuil,
      correo: persona.correo,
    });
    this.avisarExito('Lectura simulada: los datos del DNI se autocompletaron.');
  }

  /** Igual que el del empleado, para el alta de cliente (punto 5). */
  protected simularDniCliente(): void {
    const persona = inventarPersona();
    this.clienteForm.patchValue({
      nombres: persona.nombres,
      apellidos: persona.apellidos,
      dni: persona.dni,
      correo: persona.correo,
    });
    this.avisarExito('Lectura simulada: los datos del DNI se autocompletaron.');
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
    this.mensaje.set(enviado ? 'Pedido enviado al mozo.' : 'Agregá productos antes de enviar el pedido.');
  }

  protected async rechazarPedido(): Promise<void> {
    this.demo.rechazarPedido('Falta disponibilidad de un producto. Podés modificarlo y reenviarlo.');
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
      this.mensaje.set('Revisá los campos marcados antes de guardar.');
      return false;
    }
    return true;
  }

}
