import { NgOptimizedImage } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
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
import { IonToggle } from '@ionic/angular/ion-toggle';
import { addIcons } from 'ionicons';
import {
  addCircleOutline,
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
import { DemoRestauranteService } from '../../core/services/demo-restaurante.service';
import { Espera } from '../../shared/components/espera/espera.component';
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
  private readonly router = inject(Router);
  private readonly sesion = inject(SesionService);
  private readonly autenticacion = inject(AUTENTICACION);
  protected readonly demo = inject(DemoRestauranteService);

  protected readonly usuario = this.sesion.usuario;
  protected readonly segmento = signal<SegmentoDemo>('resumen');
  protected readonly grafico = signal<GraficoDemo>('torta');
  protected readonly mensaje = signal('');
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

  protected readonly empleadoForm = this.formularioBuilder.nonNullable.group({
    nombres: ['', Validators.required],
    apellidos: ['', Validators.required],
    dni: ['', [Validators.required, Validators.minLength(7)]],
    cuil: ['', [Validators.required, Validators.minLength(11)]],
    correo: ['', [Validators.required, Validators.email]],
    perfil: ['cocinero' as Extract<AltaEmpleadoDemo['perfil'], string>, Validators.required],
  });
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

  protected registrarEmpleado(): void {
    if (!this.validar(this.empleadoForm)) {
      return;
    }
    this.demo.registrarEmpleado(this.empleadoForm.getRawValue() as AltaEmpleadoDemo);
    this.empleadoForm.reset({ perfil: 'cocinero' });
    this.mensaje.set('Empleado registrado con validación de datos completa.');
  }

  protected registrarProducto(): void {
    if (!this.validar(this.productoForm)) {
      return;
    }
    this.demo.registrarProducto(this.productoForm.getRawValue() as AltaProductoDemo);
    this.productoForm.reset({ minutos: 10, precio: 1000, tipo: 'plato' });
    this.mensaje.set('Producto agregado con tres imágenes de demostración.');
  }

  protected registrarMesa(): void {
    if (!this.validar(this.mesaForm)) {
      return;
    }
    const creada = this.demo.registrarMesa(this.mesaForm.getRawValue() as AltaMesaDemo);
    this.mensaje.set(
      creada
        ? 'Mesa creada: el QR se generó automáticamente.'
        : 'No se puede repetir el número de mesa.',
    );
  }

  protected registrarCliente(): void {
    if (!this.validar(this.clienteForm)) {
      return;
    }
    this.demo.registrarCliente(this.clienteForm.getRawValue() as AltaClienteDemo);
    this.clienteForm.reset();
    this.mensaje.set('Cliente creado en estado pendiente de aprobación.');
  }

  protected resolverCliente(id: string, estado: 'aprobado' | 'rechazado'): void {
    this.demo.resolverCliente(id, estado);
    this.mensaje.set(estado === 'aprobado' ? 'Cliente aprobado.' : 'Cliente rechazado.');
  }

  protected asignarMesa(idEspera: string, numero: number): void {
    const asignada = this.demo.asignarMesa(idEspera, numero);
    this.mensaje.set(asignada ? 'Mesa ' + numero + ' asignada y notificada.' : 'Esa mesa no está disponible.');
  }

  protected anotarCliente(): void {
    const nombre = this.nombreAnonimo().trim();
    if (!nombre) {
      this.mensaje.set('Ingresá tu nombre para entrar a la lista de espera.');
      return;
    }
    this.demo.anotarEnEspera(nombre);
    this.nombreAnonimo.set('');
    this.mensaje.set('Te anotamos en la lista de espera.');
  }

  protected actualizarNombreAnonimo(evento: CustomEvent<{ value?: string | null }>): void {
    this.nombreAnonimo.set(evento.detail.value ?? '');
  }

  protected simularDniEmpleado(): void {
    this.empleadoForm.patchValue({
      nombres: 'Valentina',
      apellidos: 'Molina',
      dni: '43.210.987',
      cuil: '27-43210987-6',
    });
    this.mensaje.set('Lectura PDF417 simulada: datos del DNI autocompletados.');
  }

  protected simularDniCliente(): void {
    this.clienteForm.patchValue({
      nombres: 'Sofía',
      apellidos: 'Ramírez',
      dni: '44.987.321',
    });
    this.mensaje.set('Lectura PDF417 simulada: datos del DNI autocompletados.');
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

  protected cantidad(productoId: string): number {
    return this.demo.carrito().find((item) => item.productoId === productoId)?.cantidad ?? 0;
  }

  protected enviarPedido(): void {
    const usuario = this.usuario();
    const nombre = usuario ? usuario.nombres + ' ' + usuario.apellidos : 'Cliente';
    const mesa = this.demo.mesaVinculada() ?? 2;
    const enviado = this.demo.enviarPedido(nombre, mesa);
    this.mensaje.set(enviado ? 'Pedido enviado al mozo.' : 'Agregá productos antes de enviar el pedido.');
  }

  protected rechazarPedido(): void {
    this.demo.rechazarPedido('Falta disponibilidad de un producto. Podés modificarlo y reenviarlo.');
    this.mensaje.set('Pedido rechazado y devuelto al cliente con el motivo.');
  }

  protected confirmarPedido(): void {
    this.demo.confirmarPedido();
    this.mensaje.set('Pedido confirmado: cocina y bar recibieron sus ítems.');
  }

  protected marcarSectorListo(sector: SectorProducto): void {
    this.demo.marcarSectorListo(sector);
    this.mensaje.set('Sector ' + sector + ' actualizado.');
  }

  protected entregarPedido(): void {
    this.demo.marcarEntregado();
    this.mensaje.set('Pedido marcado como entregado; el cliente debe confirmar la recepción.');
  }

  protected recibirPedido(): void {
    this.demo.confirmarRecepcion();
    this.mensaje.set('Recepción confirmada. Ya se puede responder la encuesta y pedir la cuenta.');
  }

  protected enviarMensaje(): void {
    if (!this.validar(this.mensajeForm)) {
      return;
    }
    const usuario = this.usuario();
    this.demo.agregarMensaje(
      usuario ? usuario.nombres + ' ' + usuario.apellidos : 'Cliente',
      this.mensajeForm.controls.texto.value,
      true,
    );
    this.mensajeForm.reset();
    this.mensaje.set('Consulta enviada a todos los mozos.');
  }

  protected jugar(idJuego: string, gano: boolean): void {
    const intento = this.demo.jugar(idJuego, gano);
    this.mensaje.set(
      gano && intento === 1
        ? '¡Ganaste! Obtuviste ' + this.demo.descuento() + '% de descuento.'
        : 'Partida registrada. Solo el primer intento ganador otorga beneficio.',
    );
  }

  protected registrarEncuesta(): void {
    if (!this.validar(this.encuestaForm)) {
      return;
    }
    const registrada = this.demo.registrarEncuesta();
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

  protected generarCuenta(): void {
    const generada = this.demo.generarCuenta();
    this.mensaje.set(
      generada
        ? 'Cuenta generada con el detalle completo.'
        : 'Primero seleccioná uno de los cinco QR de propina.',
    );
  }

  protected pagarCuenta(): void {
    this.demo.pagarCuenta();
    this.mensaje.set('Pago simulado realizado. El mozo debe confirmarlo.');
  }

  protected confirmarPago(): void {
    this.demo.confirmarPago();
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
