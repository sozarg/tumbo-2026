import { Component, inject, OnInit } from '@angular/core';
import { IonApp } from '@ionic/angular/ion-app';
import { IonRouterOutlet } from '@ionic/angular/ion-router-outlet';
import { NotificacionesPush } from './core/dispositivo/notificaciones-push.service';
import { AppAudio } from './services/app-audio.service';

@Component({
  imports: [IonApp, IonRouterOutlet],
  selector: 'tumbo-root',
  styleUrl: './app.component.scss',
  templateUrl: './app.component.html',
})
export class App implements OnInit {
  private appAudio = inject(AppAudio);

  /*
   * Se inyecta y no se usa, a propósito: el servicio se queda mirando
   * la sesión y registra el teléfono para las notificaciones en cuanto
   * alguien ingresa. Sin esta línea nadie lo crea y nunca corre.
   *
   * Va acá, en el componente raíz, porque tiene que estar vivo durante
   * toda la aplicación: la sesión se puede abrir desde el ingreso o
   * restaurarse sola al arrancar, y las dos tienen que registrar.
   */
  private readonly push = inject(NotificacionesPush);

  async ngOnInit() {
    // Inicializa la precarga y dispara el sonido de apertura por única vez
    await this.appAudio.init();
  }
}
