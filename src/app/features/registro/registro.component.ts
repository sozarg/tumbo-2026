import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectorRef, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonButton } from '@ionic/angular/ion-button';
import { IonContent } from '@ionic/angular/ion-content';
import { IonIcon } from '@ionic/angular/ion-icon';
import { IonInput } from '@ionic/angular/ion-input';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  cameraOutline,
  personAddOutline,
  qrCodeOutline,
  trashOutline,
} from 'ionicons/icons';
import { Camara, FotoTomada } from '../../core/dispositivo/camara.service';
import { LectorDeDni, ResultadoDeLectura } from '../../core/dispositivo/lector-de-dni.service';
import { AltaClienteDemo } from '../../core/models/demo-restaurante';
import { ErroresService } from '../../core/services/errores.service';
import { RegistroClienteService } from '../../core/services/registro-cliente.service';
import { LIMITES } from '../../core/validacion/limites';
import { mensajeDeError } from '../../core/validacion/mensajes';
import {
  clavesCoinciden,
  conLimite,
  correoValido,
  claveEnBytes,
  dniValido,
  fotoRequerida,
  sinEspaciosSolos,
  validadoresDeNombre,
} from '../../core/validacion/validadores';
import { Espera } from '../../shared/components/espera/espera.component';
import { FondoDecorativo } from '../../shared/components/fondo-decorativo/fondo-decorativo.component';

/**
 * Registro de un cliente por su cuenta (punto 5).
 *
 * ───────────────────────────────────────────────────────────────────
 * POR QUÉ ES UNA PANTALLA APARTE Y NO EL FORMULARIO DE ADENTRO
 *
 * El enunciado dice «Crear un cliente registrado (DISPOSITIVO 2)», y el
 * dispositivo 2 es el teléfono del cliente. Cuando le toca actuar a un
 * empleado en su propio equipo el enunciado lo dice —«El metre
 * (dispositivo 4) asigna una mesa»—; acá no.
 *
 * Que esté afuera de la sesión no es un detalle de diseño: es lo que
 * hace posible usar `signUp`, que deja logueado al usuario recién
 * creado. Desde adentro de la aplicación eso le robaría la sesión a
 * quien estuviera operando. Ver `RegistroClienteService`.
 *
 * «Perfiles: cliente o metre» queda cubierto igual: la pantalla la
 * puede operar el cliente solo o el metre con el teléfono en la mano.
 *
 * ───────────────────────────────────────────────────────────────────
 * POR QUÉ COMPARTE LA HOJA DE ESTILOS DEL INGRESO
 *
 * Es la misma composición —fondo, panel, tarjeta, campos— y son las dos
 * únicas pantallas de afuera de la sesión. Copiar 343 líneas de SCSS
 * para cambiarle los campos sería garantizar que dentro de un mes se
 * vean distinto.
 */
@Component({
  imports: [
    IonButton,
    IonContent,
    IonIcon,
    IonInput,
    Espera,
    FondoDecorativo,
    NgOptimizedImage,
    ReactiveFormsModule,
  ],
  selector: 'tumbo-registro',
  styleUrls: ['../ingreso/ingreso.component.scss', './registro.component.scss'],
  templateUrl: './registro.component.html',
})
export class Registro {
  private readonly formularioBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly errores = inject(ErroresService);
  private readonly registro = inject(RegistroClienteService);
  private readonly camara = inject(Camara);
  private readonly lector = inject(LectorDeDni);
  private readonly detector = inject(ChangeDetectorRef);

  /**
   * Los mismos validadores que el alta de empleado y que el formulario
   * de adentro. El punto 5 pide «Validar todos los campos. TODOS».
   */
  protected readonly formulario = this.formularioBuilder.nonNullable.group(
    {
      nombres: ['', validadoresDeNombre('nombres')],
      apellidos: ['', validadoresDeNombre('apellidos')],
      dni: ['', [Validators.required, dniValido]],
      correo: ['', [Validators.required, sinEspaciosSolos, correoValido, ...conLimite('correo')]],
      clave: ['', [Validators.required, sinEspaciosSolos, claveEnBytes, ...conLimite('clave')]],
      repetirClave: ['', Validators.required],
      foto: [null as FotoTomada | null, [fotoRequerida]],
    },
    { validators: [clavesCoinciden] },
  );

  protected readonly limites = LIMITES;
  protected readonly enviando = signal(false);
  protected readonly enviado = signal(false);
  protected readonly errorMensaje = signal('');
  /** Cuando termina bien, la pantalla deja de ser un formulario. */
  protected readonly registrado = signal(false);
  protected readonly avisoFinal = signal('');
  /** La foto que se dibuja. Ver `cambiarFoto`. */
  protected readonly foto = signal<FotoTomada | null>(null);
  protected readonly camaraReal = this.camara.esReal;
  protected readonly lectorReal = this.lector.esReal;

  constructor() {
    addIcons({ arrowBackOutline, cameraOutline, personAddOutline, qrCodeOutline, trashOutline });
  }

  /** Mismo criterio que en `Ingreso`: la pantalla no se destruye al navegar. */
  ionViewWillEnter(): void {
    this.formulario.reset();
    this.cambiarFoto(null);
    this.enviado.set(false);
    this.enviando.set(false);
    this.registrado.set(false);
    this.avisoFinal.set('');
    this.errorMensaje.set('');
    this.errores.limpiar();
  }

  protected campoInvalido(nombre: keyof typeof this.formulario.controls): boolean {
    const control = this.formulario.controls[nombre];
    return control.invalid && (control.touched || this.enviado());
  }

  protected mensajeCampo(nombre: keyof typeof this.formulario.controls, etiqueta: string): string {
    return mensajeDeError(this.formulario.controls[nombre], etiqueta);
  }

  protected get clavesDistintas(): boolean {
    return (
      this.formulario.hasError('clavesDistintas') &&
      (this.formulario.controls.repetirClave.touched || this.enviado())
    );
  }

  /**
   * La foto, tomada con la cámara.
   *
   * `sacarFoto()` y no el selector de archivo: el punto 5 dice que «se
   * tomará desde el dispositivo (no se tiene que elegir desde la
   * galería de fotos)».
   */
  protected async sacarFoto(): Promise<void> {
    const resultado = await this.camara.sacarFoto();
    if (resultado.estado === 'cancelado') return;

    if (resultado.estado === 'error') {
      this.errorMensaje.set(await this.errores.mostrar(resultado.mensaje));
      return;
    }

    /*
     * `detectChanges` y no solo escribir la señal: la aplicación es
     * zoneless y esto vuelve de un callback del sistema, fuera de
     * cualquier evento de la página. Sin esto, la foto aparece recién
     * cuando la persona toca otra cosa.
     */
    this.cambiarFoto(resultado.foto);
    this.detector.detectChanges();
  }

  protected quitarFoto(): void {
    this.cambiarFoto(null);
  }

  /** El único lugar que toca la foto: la señal dibuja, el control valida. */
  private cambiarFoto(foto: FotoTomada | null): void {
    const anterior = this.foto();
    if (anterior?.previewUrl.startsWith('blob:')) URL.revokeObjectURL(anterior.previewUrl);

    this.foto.set(foto);
    this.formulario.controls.foto.setValue(foto);
    this.formulario.controls.foto.markAsTouched();
  }

  /** El lector de QR del DNI, que el punto 5 pide explícitamente. */
  protected async leerDni(): Promise<void> {
    const lectura = await this.lector.leer();
    const datos = this.datosDeLaLectura(lectura);
    if (!datos) return;

    this.formulario.patchValue({
      nombres: datos.nombres,
      apellidos: datos.apellidos,
      dni: datos.dni,
      correo: datos.correo ?? this.formulario.controls.correo.value,
    });
    this.detector.detectChanges();
  }

  /**
   * Los cinco desenlaces del lector, cada uno con su mensaje.
   *
   * Cancelar no es un error y no tiene que vibrar; «esto no es un DNI»
   * se arregla apuntando a otra cosa y «no pude leer», con mejor luz.
   * Es el mismo criterio que usa `aplicarLectura` en operación.
   */
  private datosDeLaLectura(lectura: ResultadoDeLectura) {
    switch (lectura.estado) {
      case 'leido':
        return lectura.datos;
      case 'cancelado':
        return null;
      case 'malformado':
        void this.errores.mostrar(
          'El código del documento está incompleto o malformado. Volvé a leerlo o completá los datos a mano.',
        );
        return null;
      case 'otro-codigo':
        void this.errores.mostrar(
          'Ese código no es de un DNI. Apuntá al código del dorso del documento.',
        );
        return null;
      case 'error':
        void this.errores.mostrar(lectura.mensaje);
        return null;
    }
  }

  protected async registrarse(): Promise<void> {
    this.enviado.set(true);
    this.errorMensaje.set('');

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.enviando.set(true);

    try {
      const { foto, repetirClave: _repetir, ...datos } = this.formulario.getRawValue();
      const resultado = await this.registro.registrar({
        ...datos,
        foto: foto ?? undefined,
      } as AltaClienteDemo);

      if (!resultado.ok) {
        this.errorMensaje.set(
          await this.errores.mostrar(resultado.error ?? 'No se pudo completar el registro.'),
        );
        return;
      }

      this.avisoFinal.set(resultado.aviso ?? '');
      this.registrado.set(true);
    } catch (error: unknown) {
      this.errorMensaje.set(
        await this.errores.desdeExcepcion(error, 'No se pudo completar el registro.'),
      );
    } finally {
      this.enviando.set(false);
      this.detector.detectChanges();
    }
  }

  protected volverAlIngreso(): void {
    void this.router.navigate(['/ingreso']);
  }
}
