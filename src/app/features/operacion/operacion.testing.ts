import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { vi } from 'vitest';
import { PerfilUsuario } from '../../core/models/usuario';
import { provideCargadorDeIlustraciones } from '../../core/imagenes/cargador-de-ilustraciones';
import { AUTENTICACION } from '../../core/services/autenticacion.port';
import { AutenticacionMockService } from '../../core/services/autenticacion-mock.service';
import { ErroresService } from '../../core/services/errores.service';
import { SesionService } from '../../core/services/sesion.service';
import { Seccion } from '../../core/navegacion/secciones';
import { Operacion } from './operacion.component';

/**
 * Ayudas compartidas por las pruebas de pantalla de Operaciones
 * (puntos 16 a 19), en modo demostración.
 */

/** Abre Operaciones con una sesión del perfil pedido, ya en la sección indicada. */
export async function abrirComo(perfil: PerfilUsuario, seccion: Seccion) {
  await TestBed.configureTestingModule({
    imports: [Operacion],
    providers: [
      provideIonicAngular(),
      provideCargadorDeIlustraciones(),
      provideRouter([]),
      { provide: AUTENTICACION, useClass: AutenticacionMockService },
    ],
  }).compileComponents();
  TestBed.inject(SesionService).iniciar({
    id: `${perfil}-prueba`,
    nombres: 'Persona',
    apellidos: 'Prueba',
    correo: `${perfil}@tumbo.demo`,
    perfil,
    etiquetaPerfil: perfil,
    estado: 'aprobado',
    fotoUrl: null,
  });
  vi.spyOn(TestBed.inject(ErroresService), 'mostrar').mockImplementation(async (texto) => texto);
  const fixture = TestBed.createComponent(Operacion);
  fixture.componentInstance['abrir'](seccion);
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

/** El texto visible de cada elemento, con un espacio entre sus partes (`<span>` y `<strong>`). */
export const texto = (fixture: ComponentFixture<Operacion>, selector: string): string[] =>
  fixture.debugElement.queryAll(By.css(selector)).map((e) => {
    const partes: string[] = [];
    const recorrido = document.createTreeWalker(e.nativeElement as Node, NodeFilter.SHOW_TEXT);
    while (recorrido.nextNode()) partes.push(recorrido.currentNode.textContent ?? '');
    return partes.join(' ').replace(/\s+/g, ' ').trim();
  });
