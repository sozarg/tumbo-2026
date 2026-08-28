import { InjectionToken, Signal } from '@angular/core';
import { AccesoRapido, Usuario } from '../models/usuario';

export type ModoAutenticacion = 'demo' | 'supabase';

export interface ResultadoAutenticacion {
  readonly usuario: Usuario;
}

/**
 * Contrato de autenticación. Los componentes dependen de esta interfaz
 * y nunca de una implementación concreta, así el mock se reemplaza por
 * Supabase sin tocar ninguna pantalla.
 */
export interface AutenticacionPort {
  /** Qué implementación está activa. Sirve para avisarlo en pantalla. */
  readonly modo: ModoAutenticacion;

  /**
   * Se resuelve cuando terminó el arranque: la sesión guardada ya fue
   * restaurada y los accesos rápidos ya se pidieron.
   *
   * Las guardias de ruta tienen que esperarla. Sin esto, al recargar la
   * aplicación la guardia corre antes de que Supabase devuelva la
   * sesión, ve un usuario nulo y patea a la pantalla de ingreso a
   * alguien que en realidad tenía la sesión abierta.
   */
  readonly listo: Promise<void>;

  /**
   * Usuarios que la pantalla de ingreso ofrece como acceso rápido.
   *
   * Es una señal y no un arreglo fijo porque la cátedra lo exige como
   * requisito excluyente: los botones de ingreso rápido tienen que
   * salir de la base de datos, no estar escritos en el código. Cuando
   * se da de alta un empleado nuevo, su botón aparece solo.
   */
  readonly accesosRapidos: Signal<readonly AccesoRapido[]>;

  /** Clave común de las cuentas de demostración. Vacía si no aplica. */
  readonly claveDemostracion: string;

  ingresar(correo: string, clave: string): Promise<ResultadoAutenticacion>;
  ingresarRapido(id: string): Promise<ResultadoAutenticacion>;

  /**
   * Cierra la sesión y borra las credenciales.
   *
   * Es asíncrono a propósito: hay que poder esperarlo antes de navegar.
   * La cátedra pide verificar que las credenciales se borren, y si se
   * navega sin esperar, el borrado puede quedar a mitad de camino.
   */
  cerrarSesion(): Promise<void>;
}

export const AUTENTICACION = new InjectionToken<AutenticacionPort>('AUTENTICACION');
